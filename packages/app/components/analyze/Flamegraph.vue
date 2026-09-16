<script setup lang="ts">
import type { GraphBase, GraphBaseOptions } from 'nanovis';
import { useTemplateRef, watchEffect } from 'vue';

import type { AnalyzeChartInfo } from '../../types/chart';

const props = defineProps<{
  graph: GraphBase<AnalyzeChartInfo | undefined, GraphBaseOptions<AnalyzeChartInfo | undefined>>;
}>();

const el = useTemplateRef<HTMLDivElement>('el');

watchEffect(() => {
  if (el.value) {
    el.value.append(props.graph.el);
    props.graph.resize();
  }
});
</script>

<template>
  <div ref="el" class="px4" />
</template>
