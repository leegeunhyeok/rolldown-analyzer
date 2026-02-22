import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  ssr: false,
  modules: ['@vueuse/nuxt', '@unocss/nuxt'],
  srcDir: 'app',
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
      dir: '../dist',
    },
    sourceMap: false,
  },
  app: {
    baseURL: '/',
    head: {
      title: 'Rolldown DevTools',
      charset: 'utf-8',
      viewport: 'width=device-width,initial-scale=1',
      meta: [{ name: 'description', content: 'Standalone DevTools for Rolldown' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: `/favicon.svg` }],
      htmlAttrs: {
        lang: 'en',
        class: 'bg-dots',
      },
      script: [
        {
          type: 'text/javascript',
          src: 'rolldown-data.js',
          defer: true,
        },
      ],
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
