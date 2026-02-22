import type { SessionMeta } from '@rolldown/debug';
import { computed, shallowRef } from 'vue';

import type {
  ModuleBuildMetrics,
  ModuleInfo,
  ModuleListItem,
  PackageInfo,
  PluginBuildMetrics,
  RolldownAssetInfo,
  RolldownChunkInfo,
  RolldownModuleTransformInfo,
  RolldownPluginBuildMetrics,
  SessionContext,
} from '../../shared/types';
import { getFileTypeFromName } from '../utils/icon';

export interface RolldownData {
  meta: SessionMeta;
  modules: Array<{
    id: string;
    imports?: ModuleImport[];
    importers?: string[];
    build_metrics?: ModuleBuildMetrics;
  }>;
  build_duration: number;
  assets: RolldownAssetInfo[];
  chunks: RolldownChunkInfo[];
  packages: PackageInfo[];
  plugin_build_metrics?: Record<string, PluginBuildMetrics>;
}

declare global {
  interface Window {
    __data?: RolldownData;
  }
}

const _data = shallowRef<RolldownData | null>(
  typeof window !== 'undefined' ? ((window as any).__data ?? null) : null,
);
const _loading = shallowRef(false);

export function useData() {
  const data = _data;

  if (data == null) {
    throw new Error('No data available');
  }

  const session = computed<SessionContext | null>(() => {
    if (!data.value) return null;
    return {
      meta: data.value.meta,
      modulesList: data.value.modules.map((mod) => ({
        id: mod.id,
        fileType: getFileTypeFromName(mod.id).name,
        imports: mod.imports ?? [],
        importers: mod.importers ?? [],
        buildMetrics: mod.build_metrics,
      })) as ModuleListItem[],
      buildDuration: data.value.build_duration,
    };
  });

  const assets = computed<RolldownAssetInfo[]>(() => data.value?.assets ?? []);
  const chunks = computed<RolldownChunkInfo[]>(() => data.value?.chunks ?? []);
  const packages = computed<PackageInfo[]>(() => data.value?.packages ?? []);
  const loading = computed(() => _loading.value);

  function getModuleInfo(moduleId: string): Omit<ModuleInfo, 'transforms'> | null {
    if (!data.value) {
      return null;
    }
    const mod = data.value.modules.find((m) => m.id === moduleId);

    if (!mod) {
      return null;
    }

    const moduleChunks = data.value.chunks
      .filter((chunk) => chunk.modules.includes(moduleId))
      .map((chunk) => ({ type: 'chunk' as const, ...chunk }));

    const moduleAssets = data.value.assets
      .filter((asset) => moduleChunks.some((chunk) => chunk.chunk_id === asset.chunk_id))
      .map((asset) => ({ type: 'asset' as const, ...asset }));

    const buildMetrics = mod.build_metrics ?? { resolve_ids: [], loads: [], transforms: [] };

    return {
      id: moduleId,
      imports: mod.imports ?? [],
      importers: mod.importers ?? [],
      chunks: moduleChunks as any,
      assets: moduleAssets as any,
      build_metrics: buildMetrics,
      loads: [...(buildMetrics.loads ?? [])].sort((a: any, b: any) => a.plugin_id - b.plugin_id),
      resolve_ids: [...(buildMetrics.resolve_ids ?? [])].sort(
        (a: any, b: any) => a.plugin_id - b.plugin_id,
      ),
    };
  }

  function getModuleTransforms(moduleId: string): RolldownModuleTransformInfo[] {
    if (!data.value) return [];
    const mod = data.value.modules.find((m) => m.id === moduleId);
    if (!mod?.build_metrics?.transforms) return [];

    return [...mod.build_metrics.transforms]
      .map((t: any) => ({
        ...t,
        diff_added: t.diff_added ?? 0,
        diff_removed: t.diff_removed ?? 0,
      }))
      .sort((a: any, b: any) => a.plugin_id - b.plugin_id);
  }

  function getAssetDetails(assetId: string) {
    if (!data.value) return null;
    const asset = data.value.assets.find((a) => a.filename === assetId);
    if (!asset) return null;

    if (asset.chunk_id == null) {
      return {
        asset: { ...asset, type: 'asset' as const },
        chunks: [] as RolldownChunkInfo[],
        importers: [] as RolldownAssetInfo[],
        imports: [] as RolldownAssetInfo[],
      };
    }

    const chunk = data.value.chunks.find((c) => c.chunk_id === asset.chunk_id);
    const importerChunks = data.value.chunks.filter((c) =>
      c.imports.some((i: any) => i.chunk_id === asset.chunk_id),
    );
    const importerAssets = importerChunks
      .map((c) => data.value!.assets.find((a) => a.chunk_id === c.chunk_id))
      .filter(Boolean) as RolldownAssetInfo[];
    const importAssets = (chunk?.imports ?? [])
      .map((i: any) => data.value!.assets.find((a) => a.chunk_id === i.chunk_id))
      .filter(Boolean) as RolldownAssetInfo[];

    return {
      asset: { ...asset, type: 'asset' as const },
      chunks: chunk ? ([{ ...chunk, type: 'chunk' as const }] as RolldownChunkInfo[]) : [],
      importers: importerAssets,
      imports: importAssets,
    };
  }

  function getChunkInfo(chunkId: number): RolldownChunkInfo | null {
    if (!data.value) {
      return null;
    }
    const chunk = data.value.chunks.find((c) => c.chunk_id === chunkId);
    if (!chunk) {
      return null;
    }
    const asset = data.value.assets.find((a) => a.chunk_id === chunkId);
    return { ...chunk, asset } as RolldownChunkInfo;
  }

  function getPackageDetails(packageId: string): PackageInfo | null {
    if (!data.value) {
      return null;
    }
    return data.value.packages.find((p) => `${p.name}@${p.version}` === packageId) ?? null;
  }

  function getPluginDetails(pluginId: number): RolldownPluginBuildMetrics | null {
    if (!data.value?.plugin_build_metrics) {
      return null;
    }
    const metrics = data.value.plugin_build_metrics[pluginId];
    if (!metrics) {
      const plugin = data.value.meta.plugins?.find((p: any) => p.plugin_id === pluginId);
      return {
        plugin_name: plugin?.name ?? '',
        plugin_id: pluginId,
        calls: [],
        resolveIdMetrics: [],
        loadMetrics: [],
        transformMetrics: [],
      };
    }
    return {
      ...metrics,
      resolveIdMetrics: metrics.calls.filter((c) => c.type === 'resolve'),
      loadMetrics: metrics.calls.filter((c) => c.type === 'load'),
      transformMetrics: metrics.calls.filter((c) => c.type === 'transform'),
    };
  }

  return {
    data,
    loading,
    session,
    assets,
    chunks,
    packages,
    getModuleInfo,
    getModuleTransforms,
    getAssetDetails,
    getChunkInfo,
    getPackageDetails,
    getPluginDetails,
  };
}
