<script setup lang="ts">
import type { SessionContext } from '../shared/types';
import { useHead } from '#app/composables/head';
import { useRoute, useRouter } from '#app/composables/router';
import { onKeyDown } from '@vueuse/core';
import { computed } from 'vue';
import { useData } from './/composables/data';
import { useSideNav } from './/state/nav';

import 'floating-vue/dist/style.css';
import './styles/cm.css';
import './styles/splitpanes.css';
import './styles/global.css';
import '../_devtools-ui/composables/dark';

useHead({
  title: 'Rolldown DevTools',
});

const { session, loading } = useData();

const router = useRouter();
const route = useRoute();

const currentPanelType = computed(() =>
  ['module', 'asset', 'plugin', 'chunk', 'package'].find(
    (key) => typeof route.query[key] !== 'undefined',
  ),
);
function closeCurrentPanel() {
  if (currentPanelType.value) {
    router.replace({ query: { ...route.query, [currentPanelType.value]: undefined } });
  }
}

onKeyDown('Escape', (e) => {
  e.preventDefault();

  if (!e.isTrusted || e.repeat) return;

  closeCurrentPanel();
});

useSideNav(() => {
  if (!session.value) return [];
  return [
    {
      title: 'Home',
      to: `/`,
      icon: 'i-ph-house-duotone',
    },
    {
      title: 'Modules Graph',
      to: `/graph`,
      icon: 'i-ph-graph-duotone',
      category: 'session',
    },
    {
      title: 'Plugins',
      to: `/plugins`,
      icon: 'i-ph-plugs-duotone',
      category: 'session',
    },
    {
      title: 'Chunks',
      to: `/chunks`,
      icon: 'i-ph-shapes-duotone ',
      category: 'session',
    },
    {
      title: 'Assets',
      to: `/assets`,
      icon: 'i-ph-files-duotone',
      category: 'session',
    },
    {
      title: 'Packages',
      to: `/packages`,
      icon: 'i-ph-package-duotone',
      category: 'session',
    },
  ];
});
</script>

<template>
  <VisualLoading v-if="loading" />
  <div v-else-if="!session" flex="~ items-center justify-center" h-screen>
    <span italic op50>No data available</span>
  </div>
  <div v-else grid="~ cols-[max-content_1fr]" h-screen w-screen max-w-screen max-h-screen of-hidden>
    <PanelSideNav />
    <div of-auto h-screen max-h-screen relative>
      <NuxtPage :session="session as SessionContext" />
    </div>

    <div
      v-if="currentPanelType"
      fixed
      inset-0
      backdrop-blur-8
      backdrop-brightness-95
      z-panel-content
      @click.self="closeCurrentPanel"
    >
      <div
        v-if="currentPanelType === 'module'"
        :key="route.query.module as string"
        fixed
        right-0
        bottom-0
        top-20
        left-20
        z-panel-content
        bg-glass
        border="l t base rounded-tl-xl"
      >
        <DataModuleDetailsLoader
          :module="route.query.module as string"
          :session="session as SessionContext"
          @close="closeCurrentPanel"
        />
      </div>
      <div
        v-if="currentPanelType === 'asset'"
        :key="route.query.asset as string"
        fixed
        right-0
        bottom-0
        top-30
        z-panel-content
        of-hidden
        bg-glass
        border="l t base rounded-tl-xl"
        class="left-20 xl:left-100 2xl:left-150"
      >
        <DataAssetDetailsLoader
          :asset="route.query.asset as string"
          :session="session as SessionContext"
          @close="closeCurrentPanel"
        />
      </div>
      <div
        v-if="currentPanelType === 'plugin'"
        :key="route.query.plugin as string"
        fixed
        right-0
        bottom-0
        top-20
        left-20
        z-panel-content
        bg-glass
        border="l t base rounded-tl-xl"
      >
        <DataPluginDetailsLoader
          :plugin="route.query.plugin as string"
          :session="session as SessionContext"
          @close="closeCurrentPanel"
        />
      </div>
      <div
        v-if="currentPanelType === 'chunk'"
        :key="route.query.chunk as string"
        fixed
        right-0
        bottom-0
        top-20
        z-panel-content
        bg-glass
        border="l t base rounded-tl-xl"
        class="left-20 xl:left-100 2xl:left-150"
      >
        <DataChunkDetailsLoader
          :chunk="Number(route.query.chunk)"
          :session="session as SessionContext"
          @close="closeCurrentPanel"
        />
      </div>
      <div
        v-if="currentPanelType === 'package'"
        :key="route.query.package as string"
        fixed
        right-0
        bottom-0
        top-20
        z-panel-content
        bg-glass
        border="l t base rounded-tl-xl"
        class="left-20 xl:left-100 2xl:left-150"
      >
        <DataPackageDetailsLoader
          :package="route.query.package as string"
          :session="session as SessionContext"
          @close="closeCurrentPanel"
        />
      </div>
    </div>
  </div>
</template>
