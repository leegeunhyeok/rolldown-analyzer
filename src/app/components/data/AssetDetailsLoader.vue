<script setup lang="ts">
import type { SessionContext } from '../../../shared/types';
import DisplayCloseButton from '../../../_devtools-ui/components/DisplayCloseButton.vue';
import { computed } from 'vue';
import { useData } from '../../composables/data';

const props = defineProps<{
  asset: string;
  session: SessionContext;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { getAssetDetails } = useData();
const state = computed(() => getAssetDetails(props.asset));
</script>

<template>
  <div v-if="state?.asset" p4 relative h-full w-full of-auto bg-glass z-panel-content>
    <DataAssetDetails
      :asset="state.asset"
      :session="session"
      :chunks="state?.chunks"
      :importers="state?.importers"
      :imports="state?.imports"
    >
      <DisplayCloseButton @click="emit('close')" />
    </DataAssetDetails>
  </div>
</template>
