<script setup lang="ts">
import type { AnalyzeData } from '@rolldown-analyzer/core/utils/convert-analyze-data';
import { isDark, toggleDark } from '@rolldown-analyzer/core/ui/composables/dark';
import rolldownDark from '../public/rolldown-dark.svg';
import rolldownLight from '../public/rolldown-light.svg';

const { session } = useData();

const loading = ref(false);
const error = ref<string | null>(null);

function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  error.value = null;
  loading.value = true;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string) as AnalyzeData;
      if (!data.chunks || !data.modules || !data.meta) {
        throw new Error('Invalid analyze data format');
      }
      loadAnalyzeData(data);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to parse file';
    } finally {
      loading.value = false;
    }
  };
  reader.onerror = () => {
    error.value = 'Failed to read file';
    loading.value = false;
  };
  reader.readAsText(file);
}

async function loadDemo() {
  error.value = null;
  loading.value = true;
  try {
    const mod = await import('../../.data/analyze/analyze-data.json');
    loadAnalyzeData(mod.default as AnalyzeData);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load demo data';
  } finally {
    loading.value = false;
  }
}

function handleBack() {
  clearData();
}
</script>

<template>
  <div flex items-center gap-2 px-4 py-2 fixed top-4 right-4 z-10>
    <button
      v-if="session"
      flex
      items-center
      justify-center
      w-8
      h-8
      rounded
      cursor-pointer
      bg="hover:gray-200 dark:hover:gray-700"
      transition-colors
      @click="handleBack"
    >
      <div i-carbon-close text-sm />
    </button>
    <a
      href="https://github.com/leegeunhyeok/rolldown-analyzer"
      target="_blank"
      rel="noopener noreferrer"
      flex
      items-center
      justify-center
      w-8
      h-8
      rounded
      cursor-pointer
      bg="hover:gray-200 dark:hover:gray-700"
      transition-colors
      title="GitHub"
    >
      <div i-simple-icons-github text-sm />
    </a>
    <button
      flex
      items-center
      justify-center
      w-8
      h-8
      rounded
      cursor-pointer
      bg="hover:gray-200 dark:hover:gray-700"
      transition-colors
      title="Toggle dark mode"
      @click="toggleDark()"
    >
      <div v-if="isDark" i-carbon-sun text-sm />
      <div v-else i-carbon-moon text-sm />
    </button>
  </div>

  <!-- Analyze view -->
  <div v-if="session" h-full flex flex-col>
    <div flex-1 of-hidden>
      <AnalyzePage :session="session" standalone />
    </div>
  </div>

  <!-- Landing view -->
  <div v-else h-full relative flex flex-col items-center justify-center gap-8 px-4>
    <div flex flex-col items-center gap-4>
      <a href="https://rolldown.rs" target="_blank" rel="noopener noreferrer">
        <img v-if="isDark" :src="rolldownLight" alt="Rolldown" h-12 />
        <img v-else :src="rolldownDark" alt="Rolldown" h-12 />
      </a>
      <div text="gray-500 dark:gray-400 sm">Upload your analyze.json to visualize your bundle</div>
    </div>

    <div flex flex-col items-center gap-4 w-full max-w-sm>
      <!-- File upload -->
      <label
        flex
        flex-col
        items-center
        justify-center
        w-full
        h-40
        border="2 dashed gray-300 dark:gray-600"
        rounded-lg
        cursor-pointer
        bg="gray-50 dark:gray-800/50 hover:gray-100 dark:hover:gray-800"
        transition-colors
      >
        <div flex flex-col items-center gap-2 text="gray-500 dark:gray-400">
          <div i-carbon-upload text-2xl />
          <div text-sm font-medium>Click to upload analyze.json</div>
          <div text-xs op-60>JSON file from bundle analyzer plugin</div>
        </div>
        <input type="file" accept=".json" hidden @change="handleFileUpload" />
      </label>

      <!-- Demo button -->
      <button
        text="xs gray-400 hover:gray-600 dark:hover:gray-300"
        cursor-pointer
        transition-colors
        :disabled="loading"
        @click="loadDemo"
      >
        <span v-if="loading" flex items-center justify-center gap-1>
          <div i-svg-spinners-ring-resize text-xs />
          Loading...
        </span>
        <span v-else>or load demo data</span>
      </button>

      <!-- Error -->
      <div v-if="error" text="sm red-500" text-center>
        {{ error }}
      </div>
    </div>
  </div>
</template>
