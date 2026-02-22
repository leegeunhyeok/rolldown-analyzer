<script setup lang="ts">
import type { RolldownAssetInfo, RolldownChunkInfo, SessionContext } from '../../../shared/types';
import { useRoute } from '#app/composables/router';
import DisplayBadge from '../../../_devtools-ui/components/DisplayBadge.vue';
import DisplayCloseButton from '../../../_devtools-ui/components/DisplayCloseButton.vue';
import DisplayIconButton from '../../../_devtools-ui/components/DisplayIconButton.vue';
import { computed, ref } from 'vue';
import { settings } from '../../../app/state/settings';

const props = withDefaults(
  defineProps<{
    session: SessionContext;
    asset: RolldownAssetInfo;
    chunks?: RolldownChunkInfo[];
    importers?: RolldownAssetInfo[];
    imports?: RolldownAssetInfo[];
    lazy?: boolean;
  }>(),
  {
    lazy: false,
  },
);

const route = useRoute();
const showSource = ref(false);

// In standalone mode, lazy loading via RPC is not available
// Only use data passed via props
const assetChunks = computed(() =>
  props.chunks?.filter((c) => c.chunk_id === props.asset.chunk_id),
);
const _importers = computed(() => props.importers);
const _imports = computed(() => props.imports);
</script>

<template>
  <div flex="~ col gap-3">
    <div flex="~ gap-4 items-center wrap">
      <AssetsBaseInfo :asset="asset" />
      <div flex-auto />
      <div flex="~ gap-2">
        <button btn-action @click="showSource = true">
          <div i-ph-file-text />
          View source
        </button>
        <slot />
      </div>
    </div>

    <template v-if="showSource">
      <div flex="~ gap-2 items-center">
        <div op50>Source</div>
        <span flex-auto />
        <DisplayIconButton
          title="Line Wrapping"
          class-icon="i-ph-arrow-u-down-left-duotone"
          :active="settings.codeviewerLineWrap"
          @click="settings.codeviewerLineWrap = !settings.codeviewerLineWrap"
        />
        <DisplayCloseButton @click="showSource = false" />
      </div>
      <div class="w-full of-auto px2 py1" border="~ base rounded-lg">
        <CodeViewer :code="asset.content!" />
      </div>
    </template>

    <div v-if="assetChunks && assetChunks.length > 0" flex="~ col gap-4">
      <div flex="~ col gap-2">
        <div op50>Chunks</div>
        <NuxtLink
          v-for="chunk of assetChunks"
          :key="chunk.chunk_id"
          border="~ base rounded-lg"
          px2
          py1
          min-w-fit
          :to="{ path: route.path, query: { chunk: chunk.chunk_id } }"
        >
          <DataChunkDetails :chunk="chunk" :session="session" :show-details="false" />
        </NuxtLink>
      </div>
      <template v-if="_importers?.length || _imports?.length">
        <div flex="~ col gap-2">
          <div op50>Asset Relationships</div>
          <DataAssetRelationships :importers="_importers" :imports="_imports" />
        </div>
      </template>
    </div>
    <div v-else flex="~ col gap-1">
      <!-- For other situation -->
      <div op50>[Non-Module Asset]</div>
      <div v-if="asset.filename.endsWith('.map')" flex="~ items-center gap-2">
        <span op50>Source Map for</span> <DisplayBadge :text="JSON.parse(asset.content!).file" />
      </div>
    </div>
  </div>
</template>
