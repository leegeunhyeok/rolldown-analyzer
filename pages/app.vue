<script setup lang="ts">
import { useHead } from '#app/composables/head';
import 'floating-vue/dist/style.css';

import '../packages/app/styles/global.css';
import '@rolldown-analyzer/core/ui/composables/dark';

useHead({
  title: 'Rolldown Analyzer',
});
</script>

<template>
  <div h-screen w-screen max-w-screen max-h-screen of-hidden>
    <NuxtPage />
  </div>
</template>
