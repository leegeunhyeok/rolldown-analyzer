<script setup lang="ts">
import type { RolldownChunkInfo, SessionContext } from '../../shared/types/data';
import type { ClientSettings } from '../state/settings';
import type { AnalyzeChartInfo, AnalyzeChartNode } from '../types/chart';
import { useRoute, useRouter } from '#app/composables/router';
import { computedWithControl, useMouse } from '@vueuse/core';
import Fuse from 'fuse.js';
import type { ModuleImport } from '../../shared/types/data';
import { Flamegraph, Sunburst, Treemap } from 'nanovis';
import { computed, reactive, ref, watch } from 'vue';
import { guessChunkName } from '../../shared/utils/guess-chunk-name';
import ChartTreemap from '../components/chart/Treemap.vue';
import { isDark } from '../../_devtools-ui/composables/dark';
import { useChartGraph } from '../composables/chart';
import { parseReadablePath } from '../utils/filepath';
import { useData } from '../composables/data';
import { settings } from '../state/settings';

const props = defineProps<{
  session: SessionContext;
}>();

const { chunks: chunksData } = useData();
const router = useRouter();
const route = useRoute();
const mouse = reactive(useMouse());

const analyzeViewTypes = [
  {
    label: 'Treemap',
    value: 'treemap',
    icon: 'i-ph-checkerboard-duotone',
  },
  {
    label: 'Sunburst',
    value: 'sunburst',
    icon: 'i-ph-chart-donut-duotone',
  },
  {
    label: 'Flamegraph',
    value: 'flamegraph',
    icon: 'i-ph-chart-bar-horizontal-duotone',
  },
] as const;

const searchValue = ref<{ search: string }>({
  search: '',
});

const colorMode = ref<'size' | 'format'>('size');

// Module format detection: how each module is imported (ESM / CJS / mixed)
type ModuleFormat = 'esm' | 'cjs' | 'mixed' | 'unknown';
const moduleFormatMap = computed(() => {
  // Step 1: Collect direct import kinds per module
  const kindsByModule = new Map<string, Set<ModuleImport['kind']>>();
  // Also build imports graph: moduleId → list of module_ids it imports
  const importsGraph = new Map<string, string[]>();

  for (const mod of props.session.modulesList) {
    const importIds: string[] = [];
    for (const imp of mod.imports) {
      importIds.push(imp.module_id);
      let kinds = kindsByModule.get(imp.module_id);
      if (!kinds) {
        kinds = new Set();
        kindsByModule.set(imp.module_id, kinds);
      }
      kinds.add(imp.kind);
    }
    importsGraph.set(mod.id, importIds);
  }

  // Step 2: Initial format assignment
  const formatMap = new Map<string, ModuleFormat>();
  for (const [id, kinds] of kindsByModule) {
    const hasEsm = kinds.has('import-statement') || kinds.has('dynamic-import');
    const hasCjs = kinds.has('require-call');
    if (hasCjs) formatMap.set(id, 'cjs');
    else if (hasEsm) formatMap.set(id, 'esm');
    else formatMap.set(id, 'unknown');
  }

  // Step 3: Propagate CJS downward — if a module is CJS, all its imports become CJS
  const visited = new Set<string>();
  function propagateCjs(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    for (const childId of importsGraph.get(id) ?? []) {
      const childFmt = formatMap.get(childId);
      if (childFmt && childFmt !== 'cjs') {
        formatMap.set(childId, 'cjs');
      }
      propagateCjs(childId);
    }
  }

  for (const [id, fmt] of formatMap) {
    if (fmt === 'cjs') propagateCjs(id);
  }

  return formatMap;
});

function getModuleFormat(moduleId: string): ModuleFormat {
  return moduleFormatMap.value.get(moduleId) ?? 'unknown';
}

// Recursively collect leaf module formats under a folder node
function getDominantFormat(node: any): ModuleFormat {
  if (node.meta?.type === 'module') {
    return getModuleFormat(node.meta.id);
  }
  const formats = new Set<ModuleFormat>();
  for (const child of node.children ?? []) {
    formats.add(getDominantFormat(child));
  }
  formats.delete('unknown');
  if (formats.size === 0) return 'unknown';
  if (formats.size === 1) return formats.values().next().value!;
  return 'mixed';
}

const FORMAT_COLORS = {
  esm: { light: '#eab308', dark: '#ca8a04' },
  cjs: { light: '#38bdf8', dark: '#0ea5e9' },
  mixed: { light: '#a78bfa', dark: '#8b5cf6' },
  unknown: { light: '#a1a1aa', dark: '#71717a' },
} as const;

// Build modules map for size lookup
const modulesMap = computed(() => {
  const map = new Map<string, number>();
  for (const module of props.session.modulesList) {
    if (!module.buildMetrics?.transforms?.length) continue;
    const transforms = module.buildMetrics.transforms;
    map.set(module.id, transforms[transforms.length - 1]!.transformed_code_size);
  }
  return map;
});

// Chunk selection
const chunkOptions = computed(() => {
  return (chunksData.value ?? []).map((chunk) => ({
    label: guessChunkName(chunk),
    value: chunk.chunk_id,
    modules: chunk.modules.length,
  }));
});

// Auto-select first chunk if none selected
const selectedChunk = computed<RolldownChunkInfo>(() => {
  const chunks = chunksData.value ?? [];
  const found = chunks.find((c) => c.chunk_id === settings.value.analyzeSelectedChunk);
  return found ?? chunks[0]!;
});

// Convert absolute module path to relative path from cwd
function toRelativePath(moduleId: string): string {
  return parseReadablePath(moduleId, props.session.meta.cwd).path;
}

// Display path: strip cwd or show relative path
function toDisplayPath(moduleId: string): string {
  return parseReadablePath(moduleId, props.session.meta.cwd).path;
}

// Compute module data for the selected chunk
const moduleData = computed(() => {
  const chunk = selectedChunk.value;
  if (!chunk) return [];
  const seen = new Set<string>();
  const result: Array<{ id: string; filename: string; size: number }> = [];

  for (const moduleId of chunk.modules) {
    if (seen.has(moduleId)) continue;
    seen.add(moduleId);

    const size = modulesMap.value.get(moduleId) ?? 0;
    if (size === 0) continue;

    result.push({
      id: moduleId,
      filename: toRelativePath(moduleId),
      size,
    });
  }

  return result;
});

const fuse = computedWithControl(
  () => moduleData.value,
  () =>
    new Fuse(moduleData.value, {
      includeScore: true,
      keys: ['filename'],
      ignoreLocation: true,
      threshold: 0.4,
    }),
);

const searched = computed(() => {
  if (!searchValue.value.search) {
    return moduleData.value;
  }
  return fuse.value.search(searchValue.value.search).map((r) => r.item);
});

function toggleDisplay(type: ClientSettings['analyzeViewType']) {
  settings.value.analyzeViewType = type;
}

function selectChunk(chunkId: number) {
  settings.value.analyzeSelectedChunk = chunkId;
}

// Importers lookup
const importersMap = computed(() => {
  const map = new Map<string, string[]>();
  for (const mod of props.session.modulesList) {
    map.set(mod.id, mod.importers);
  }
  return map;
});

// Selected module for importer panel
const selectedModuleId = ref<string | null>(null);
const selectedModuleImporters = computed(() => {
  if (!selectedModuleId.value) return [];
  const importers = importersMap.value.get(selectedModuleId.value) ?? [];
  return importers.map((id) => ({
    id,
    displayPath: toDisplayPath(id),
    size: modulesMap.value.get(id) ?? 0,
  }));
});

// Build importer chain: selected module → ... → entry module
const importerChain = computed(() => {
  if (!selectedModuleId.value) return [];
  const visited = new Set<string>();
  const entry = selectedChunk.value?.entry_module;

  // BFS to find shortest path to entry (or root)
  const queue: Array<{ id: string; path: Array<{ id: string; displayPath: string }> }> = [
    { id: selectedModuleId.value, path: [{ id: selectedModuleId.value, displayPath: toDisplayPath(selectedModuleId.value) }] },
  ];
  visited.add(selectedModuleId.value);

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Reached entry or a module with no importers
    const importers = importersMap.value.get(current.id) ?? [];
    if (importers.length === 0 || current.id === entry) {
      return current.path;
    }

    for (const importerId of importers) {
      if (visited.has(importerId)) continue;
      visited.add(importerId);
      const newPath = [...current.path, { id: importerId, displayPath: toDisplayPath(importerId) }];

      if (importerId === entry) {
        return newPath;
      }
      queue.push({ id: importerId, path: newPath });
    }
  }

  return [{ id: selectedModuleId.value, displayPath: toDisplayPath(selectedModuleId.value) }];
});

function closeImporterPanel() {
  selectedModuleId.value = null;
}

const { tree, chartOptions, graph, nodeHover, nodeSelected, selectedNode, selectNode: _selectNode, buildGraph } =
  useChartGraph<{ id: string; filename: string; size: number }, AnalyzeChartInfo, AnalyzeChartNode>({
    data: searched,
    nameKey: 'filename',
    sizeKey: 'size',
    rootText: selectedChunk.value ? guessChunkName(selectedChunk.value) : 'Modules',
    nodeType: 'module',
    graphOptions: {
      onClick(node) {
        if (node) nodeHover.value = node;
        if (node.meta?.type === 'module') {
          selectedNode.value = node.meta;
          selectedModuleId.value = node.meta.id;
        }
      },
      onHover(node) {
        if (node) nodeHover.value = node;
        if (node === null) nodeHover.value = undefined;
      },
      onLeave() {
        nodeHover.value = undefined;
      },
      onSelect(node) {
        nodeSelected.value = node || tree.value.root;
        selectedNode.value = node?.meta;
      },
    },
    onUpdate() {
      const formatGetColor = colorMode.value === 'format'
        ? (node: any) => {
            const palette = isDark.value ? 'dark' : 'light';
            if (node.meta?.type === 'module') {
              return FORMAT_COLORS[getModuleFormat(node.meta.id)][palette];
            }
            // Folder: derive format from leaf modules
            const fmt = getDominantFormat(node);
            return FORMAT_COLORS[fmt][palette];
          }
        : undefined;
      const formatGetSubtext = colorMode.value === 'format'
        ? (node: any) => {
            if (node.meta?.type === 'module') {
              return getModuleFormat(node.meta.id).toUpperCase();
            }
            return getDominantFormat(node).toUpperCase();
          }
        : undefined;
      const opts = formatGetColor
        ? { ...chartOptions.value, getColor: formatGetColor, getSubtext: formatGetSubtext }
        : chartOptions.value;

      switch (settings.value.analyzeViewType) {
        case 'sunburst':
          graph.value = new Sunburst(tree.value.root, opts);
          break;
        case 'treemap':
          graph.value = new Treemap(tree.value.root, {
            ...opts,
            selectedPaddingRatio: 0,
          });
          break;
        case 'flamegraph':
          graph.value = new Flamegraph(tree.value.root, opts);
          break;
      }
    },
  });

function selectNode(node: AnalyzeChartNode | null, animate?: boolean) {
  if (node?.meta?.type === 'module') {
    // Leaf module: open detail panel without navigating the chart
    selectedModuleId.value = node.meta.id;
    selectedNode.value = node.meta;
    return;
  }
  _selectNode(node, animate);
}

watch(
  () => settings.value.analyzeViewType,
  () => {
    buildGraph();
  },
);

watch(colorMode, () => {
  buildGraph();
});
</script>

<template>
  <div relative max-h-screen of-hidden>
    <div absolute left-4 top-4 z-panel-nav>
      <DataSearchPanel v-model="searchValue" :rules="[]">
        <div flex="~ gap-2 items-center" p2 border="t base">
          <span op50 pl2 text-sm>Chunk</span>
          <select
            :value="selectedChunk?.chunk_id"
            border="~ base rounded"
            bg-base
            px2
            py1
            text-sm
            @change="selectChunk(Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="opt of chunkOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }} ({{ opt.modules }} modules)
            </option>
          </select>
        </div>
        <div flex="~ gap-2 items-center" p2 border="t base">
          <span op50 pl2 text-sm>View as</span>
          <button
            v-for="viewType of analyzeViewTypes"
            :key="viewType.value"
            btn-action
            :class="settings.analyzeViewType === viewType.value ? 'bg-active' : 'grayscale op50'"
            @click="toggleDisplay(viewType.value)"
          >
            <div :class="viewType.icon" />
            {{ viewType.label }}
          </button>
        </div>
        <div flex="~ gap-2 items-center" p2 border="t base">
          <span op50 pl2 text-sm>Mode</span>
          <button
            btn-action
            :class="colorMode === 'size' ? 'bg-active' : 'grayscale op50'"
            @click="colorMode = 'size'"
          >
            <i i-ph-ruler-duotone />
            Size
          </button>
          <button
            btn-action
            :class="colorMode === 'format' ? 'bg-active' : 'grayscale op50'"
            @click="colorMode = 'format'"
          >
            <i i-ph-tag-duotone />
            Format
          </button>
          <div v-if="colorMode === 'format'" flex="~ gap-3 items-center" ml1>
            <span flex="~ gap-1 items-center" text-xs>
              <span w-2.5 h-2.5 rounded-sm inline-block bg-yellow-500 /> ESM
            </span>
            <span flex="~ gap-1 items-center" text-xs>
              <span w-2.5 h-2.5 rounded-sm inline-block bg-sky-400 /> CJS
            </span>
            <span flex="~ gap-1 items-center" text-xs>
              <span w-2.5 h-2.5 rounded-sm inline-block bg-violet-500 /> Mixed
            </span>
          </div>
        </div>
      </DataSearchPanel>
    </div>
    <div of-auto h-screen flex="~ col gap-2" pt56 pb4>
      <template v-if="settings.analyzeViewType === 'treemap'">
        <ChartTreemap
          v-if="graph"
          :graph="graph"
          :selected="nodeSelected"
          @select="selectNode"
        >
          <template #default="{ selected, options, onSelect }">
            <ChartNavBreadcrumb
              border="b base"
              py2
              min-h-10
              :selected="selected"
              :options="options"
              @select="onSelect"
            />
          </template>
        </ChartTreemap>
      </template>
      <template v-else-if="settings.analyzeViewType === 'sunburst'">
        <AnalyzeSunburst
          v-if="graph"
          :graph="graph"
          :selected="nodeSelected"
          @select="selectNode"
        />
      </template>
      <template v-else-if="settings.analyzeViewType === 'flamegraph'">
        <AnalyzeFlamegraph v-if="graph" :graph="graph" />
      </template>
    </div>
    <DisplayGraphHoverView :hover-x="mouse.x" :hover-y="mouse.y">
      <div
        v-if="nodeHover?.meta"
        border="~ base rounded-lg"
        bg-base
        p2
        flex="~ col gap-2"
        min-w-50
        shadow-lg
      >
        <div flex="~ gap-2 items-center">
          <i i-ph-file-duotone flex-none />
          <span truncate>{{ nodeHover.meta?.id ? toDisplayPath(nodeHover.meta.id) : nodeHover.id }}</span>
        </div>
        <template v-if="colorMode === 'size'">
          <div flex="~ gap-2 items-center">
            <span op50 text-xs>Size:</span>
            <DisplayFileSizeBadge :bytes="nodeHover.size" text-xs />
          </div>
          <div v-if="nodeHover.meta.type === 'folder' && nodeHover.children.length > 0" flex="~ gap-2 items-center">
            <span op50 text-xs>Children:</span>
            <span text-xs>{{ nodeHover.children.length }}</span>
          </div>
        </template>
        <template v-else>
          <div flex="~ gap-2 items-center">
            <span op50 text-xs>Format:</span>
            <span
              text-xs px1 rounded
              :class="{
                'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400': getModuleFormat(nodeHover.meta.id) === 'esm',
                'bg-sky-400/20 text-sky-600 dark:text-sky-400': getModuleFormat(nodeHover.meta.id) === 'cjs',
                'bg-violet-500/20 text-violet-600 dark:text-violet-400': getModuleFormat(nodeHover.meta.id) === 'mixed',
                'bg-neutral-400/20 text-neutral-500': getModuleFormat(nodeHover.meta.id) === 'unknown',
              }"
            >
              {{ getModuleFormat(nodeHover.meta.id).toUpperCase() }}
            </span>
          </div>
        </template>
      </div>
    </DisplayGraphHoverView>

    <!-- Module details panel -->
    <Transition name="slide">
      <div
        v-if="selectedModuleId"
        fixed
        right-0
        top-0
        bottom-0
        w-100
        z-panel-content
        bg-base
        border="l base"
        shadow-lg
        flex="~ col"
        of-hidden
      >
        <div flex="~ items-center gap-2" p3 border="b base">
          <i i-ph-file-duotone flex-none op50 />
          <span v-tooltip="selectedModuleId" flex-1 truncate text-sm font-mono>{{ toDisplayPath(selectedModuleId) }}</span>
          <button
            op50
            hover="op100"
            @click="closeImporterPanel"
          >
            <i i-ph-x block />
          </button>
        </div>
        <div flex-1 of-auto>
          <!-- Import chain -->
          <div v-if="importerChain.length > 1" px3 py2 border="b base">
            <div flex="~ items-center gap-1" text-sm op50 mb2>
              <i i-ph-path-duotone flex-none />
              <span>Import chain</span>
            </div>
            <div flex="~ col">
              <template v-for="(node, i) of [...importerChain].reverse()" :key="node.id">
                <div flex="~ items-center" relative min-h-7>
                  <!-- continuous vertical line (behind dot) -->
                  <div w4 flex-none absolute left-0 top-0 bottom-0 flex justify-center>
                    <!-- top half line -->
                    <div
                      v-if="i > 0"
                      absolute top-0 h="1/2" w-0 border="l 1.5 base"
                    />
                    <!-- bottom half line -->
                    <div
                      v-if="i < importerChain.length - 1"
                      absolute bottom-0 h="1/2" w-0 border="l 1.5 base"
                    />
                    <!-- dot -->
                    <div
                      absolute top="1/2" translate-y="-1/2"
                      rounded-full z-1
                      :class="node.id === selectedModuleId
                        ? 'w-2.5 h-2.5 bg-primary'
                        : 'w-2 h-2 bg-neutral-300 dark:bg-neutral-500'"
                    />
                  </div>
                  <!-- label -->
                  <button
                    v-tooltip="node.displayPath"
                    text-xs
                    font-mono
                    ml4
                    px1.5
                    py1
                    rounded
                    truncate
                    text-left
                    hover="bg-active"
                    :class="node.id === selectedModuleId ? 'text-primary font-bold' : 'op70'"
                    @click="selectedModuleId = node.id"
                  >
                    {{ node.displayPath }}
                  </button>
                </div>
              </template>
            </div>
          </div>

          <!-- Importers -->
          <div flex="~ items-center gap-2" px3 py2 border="b base" sticky top-0 bg-base z-1>
            <i i-ph-arrow-bend-left-down-duotone flex-none op50 />
            <span text-sm op50>Imported by ({{ selectedModuleImporters.length }})</span>
          </div>
          <div v-if="selectedModuleImporters.length === 0" p4 text-center op50 text-sm>
            No importers found
          </div>
          <template v-for="imp of selectedModuleImporters" :key="imp.id">
            <button
              w-full
              text-left
              px3
              py2
              hover="bg-active"
              flex="~ col gap-1"
              border="b base"
              @click="selectedModuleId = imp.id"
            >
              <span v-tooltip="imp.displayPath" text-sm font-mono truncate>{{ imp.displayPath }}</span>
              <DisplayFileSizeBadge v-if="imp.size" :bytes="imp.size" text-xs />
            </button>
          </template>
        </div>
        <div border="t base" p2>
          <button
            w-full
            btn-action
            bg-active
            justify-center
            @click="router.replace({ query: { ...route.query, module: selectedModuleId } })"
          >
            <i i-ph-arrow-square-out-duotone />
            Open Module Details
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
