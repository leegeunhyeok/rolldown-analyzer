<script setup lang="ts">
import { useHead } from '#app/composables/head';

import { useData } from './composables/data';

import 'floating-vue/dist/style.css';

import '../app/styles/global.css';
import '@rolldown-analyzer/core/ui/composables/dark';

useHead({
  title: 'Rolldown Analyzer',
});

const { session } = useData();
</script>

<template>
  <div h-screen w-screen max-w-screen max-h-screen of-hidden>
    <AnalyzePage :session="session" standalone />
  </div>
</template>
