<script setup lang="ts">
import type { SessionContext } from '../../shared/types';

defineProps<{
  session: SessionContext;
}>();

// Raw events require per-module RPC calls which are not available in standalone mode
</script>

<template>
  <div flex="~ items-center justify-center" h-screen>
    <span italic op50> Raw events view is not available in standalone mode. </span>
  </div>
</template>
