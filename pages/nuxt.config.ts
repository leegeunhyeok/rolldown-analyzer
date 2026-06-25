import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  ssr: false,
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
      dir: '../dist',
    },
    sourceMap: false,
  },
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: 'Rolldown Analyzer',
      charset: 'utf-8',
      viewport: 'width=device-width,initial-scale=1',
      meta: [{ name: 'description', content: 'Rolldown Bundle Analyzer' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: `/favicon.svg` }],
      htmlAttrs: {
        lang: 'en',
        class: 'bg-dots',
      },
    },
  },
  debug: false,
  components: [
    { path: '../packages/app/components' },
    { path: '../packages/core/ui/components', pathPrefix: false },
  ],
  imports: {
    dirs: [
      '../packages/app/utils',
      '../packages/app/state',
      '../packages/core/ui/composables',
      '../packages/core/ui/utils',
    ],
    imports: [{ from: '../packages/app/composables/chart', name: 'useChartGraph' }],
  },
  vite: {
    optimizeDeps: {
      include: [
        '@vueuse/core',
        '@floating-ui/dom',
        'd3-hierarchy',
        'd3-shape',
        'fuse.js',
        'floating-vue',
        'nanovis',
      ],
      exclude: ['structured-clone-es'],
    },
  },
  devtools: {
    enabled: false,
  },
});
