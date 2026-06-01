import fs from 'node:fs';
import path from 'node:path';

import { defineNuxtConfig } from 'nuxt/config';

if (!fs.existsSync(path.resolve(import.meta.dirname, '..', '..', 'rolldown-data.json'))) {
  throw new Error(
    '`rolldown-data.json` not found\n' +
      'Please run `yarn dev:prepare` to generate the `rolldown-data.json` file',
  );
}

export default defineNuxtConfig({
  ssr: false,
  srcDir: '.',
  modules: ['@vueuse/nuxt', '@unocss/nuxt'],
  experimental: {
    typedPages: true,
    clientNodeCompat: true,
  },
  features: {
    inlineStyles: false,
  },
  nitro: {
    preset: 'static',
    output: {
      dir: '../rolldown-analyzer/dist/app',
    },
    prerender: {
      routes: ['/rolldown-data.json'],
    },
    sourceMap: false,
  },
  app: {
    baseURL: '/',
    head: {
      title: 'Rolldown Analyzer',
      charset: 'utf-8',
      viewport: 'width=device-width,initial-scale=1',
      meta: [{ name: 'description', content: 'Standalone Analyzer for Rolldown' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: `/favicon.svg` }],
      htmlAttrs: {
        lang: 'en',
        class: 'bg-dots',
      },
    },
  },
  debug: false,
  vite: {
    build: {
      cssMinify: false,
    },
    optimizeDeps: {
      include: [
        '@vueuse/core',
        '@floating-ui/dom',
        'd3-hierarchy',
        'd3-shape',
        'fuse.js',
        'codemirror',
        'codemirror/addon/dialog/dialog',
        'codemirror/addon/display/placeholder',
        'codemirror/addon/search/jump-to-line',
        'codemirror/addon/search/search',
        'codemirror/mode/css/css',
        'codemirror/mode/handlebars/handlebars',
        'codemirror/mode/htmlmixed/htmlmixed',
        'codemirror/mode/javascript/javascript',
        'codemirror/mode/markdown/markdown',
        'codemirror/mode/pug/pug',
        'codemirror/mode/sass/sass',
        'codemirror/mode/vue/vue',
        'codemirror/mode/xml/xml',
        'comlink',
        'floating-vue',
        'splitpanes',
        'vue-virtual-scroller',
        'nanovis',
      ],
      exclude: ['structured-clone-es'],
    },
  },
  devtools: {
    enabled: false,
  },
});
