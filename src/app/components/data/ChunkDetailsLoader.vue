<script setup lang="ts">
import type { SessionContext } from '../../../shared/types/data';
import DisplayCloseButton from '../../../_devtools-ui/components/DisplayCloseButton.vue';
import { computed } from 'vue';
import { useData } from '../../composables/data';

const props = defineProps<{
  chunk: number;
  session: SessionContext;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { getChunkInfo } = useData();
const state = computed(() => getChunkInfo(props.chunk));
</script>

<template>
  <div v-if="state" p4 relative h-full w-full of-auto z-panel-content>
    <DataChunkDetails :session="session" :chunk="state">
      <DisplayCloseButton @click="emit('close')" />
    </DataChunkDetails>
  </div>
</template>
