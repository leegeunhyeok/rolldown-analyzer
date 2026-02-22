<script setup lang="ts">
import type { GraphBase, GraphBaseOptions } from 'nanovis';
import type { ChunkChartInfo } from '../../types/chart';
import { useTemplateRef, watchEffect } from 'vue';

const props = defineProps<{
  graph: GraphBase<ChunkChartInfo | undefined, GraphBaseOptions<ChunkChartInfo | undefined>>;
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
