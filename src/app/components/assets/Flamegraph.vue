<script setup lang="ts">
import type { GraphBase, GraphBaseOptions } from 'nanovis';
import type { AssetChartInfo } from '../../types/chart';
import { useTemplateRef, watchEffect } from 'vue';

const props = defineProps<{
  graph: GraphBase<AssetChartInfo | undefined, GraphBaseOptions<AssetChartInfo | undefined>>;
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
  <div ref="el" />
</template>
