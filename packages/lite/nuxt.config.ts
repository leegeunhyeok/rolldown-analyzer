import fs from 'node:fs';
import path from 'node:path';

import { defineNuxtConfig } from 'nuxt/config';

const outputDir = '../rolldown-analyzer/dist/lite';

export default defineNuxtConfig({
  ssr: false,
  modules: ['@vueuse/nuxt', '@unocss/nuxt'],
  experimental: {
    clientNodeCompat: true,
    appManifest: false,
  },
  features: {
    inlineStyles: false,
  },
  nitro: {
    preset: 'static',
    output: {
      dir: outputDir,
    },
    sourceMap: false,
  },
  hooks: {
    'nitro:build:public-assets'() {
      const publicDir = path.resolve(import.meta.dirname, outputDir, 'public');
      const htmlPath = path.join(publicDir, 'index.html');
      if (!fs.existsSync(htmlPath)) return;

      let html = fs.readFileSync(htmlPath, 'utf-8');

      // Inline CSS: <link rel="stylesheet" href="...">
      html = html.replace(
        /<link\s+rel="stylesheet"\s+href="([^"]+)"[^>]*>/g,
        (_match, href: string) => {
          const filePath = path.join(publicDir, href);
          if (!fs.existsSync(filePath)) return _match;
          const css = fs.readFileSync(filePath, 'utf-8');
          return `<style>${css}</style>`;
        },
      );

      // Inline JS: <script src="...">
      html = html.replace(
        /<script\s+([^>]*?)src="([^"]+)"([^>]*)><\/script>/g,
        (_match, before: string, src: string, after: string) => {
          const filePath = path.join(publicDir, src);
          if (!fs.existsSync(filePath)) return _match;
          const js = fs.readFileSync(filePath, 'utf-8');
          // Preserve attributes like type="module" but drop src
          const attrs = `${before}${after}`.trim();
          return `<script ${attrs}>${js}</script>`;
        },
      );

      // Remove modulepreload links (already inlined via script tags above)
      html = html.replace(
        /<link\s+rel="modulepreload"\s+as="script"\s+crossorigin\s+href="[^"]*"[^>]*>/g,
        '',
      );

      fs.writeFileSync(htmlPath, html);
    },
  },
  app: {
    baseURL: '/',
    head: {
      title: 'Rolldown Analyzer',
      charset: 'utf-8',
      viewport: 'width=device-width,initial-scale=1',
      meta: [{ name: 'description', content: 'Rolldown Bundle Analyzer' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: `/favicon.svg` }],
      script: [
        {
          key: 'analyze-data',
          innerHTML: (() => {
            const isDev = process.env.NODE_ENV !== 'production';
            if (isDev) {
              const dataPath = path.resolve(
                import.meta.dirname,
                '..',
                '..',
                '.data',
                'analyze',
                'analyze-data.json',
              );
              const json = fs.existsSync(dataPath) ? fs.readFileSync(dataPath, 'utf-8') : '{}';
              return `window.__ANALYZE_DATA__ = ${json};`;
            }
            return `window.__ANALYZE_DATA__ = window.__ANALYZE_DATA__ || {};`;
          })(),
          tagPosition: 'head',
        },
      ],
      htmlAttrs: {
        lang: 'en',
        class: 'bg-dots',
      },
    },
  },
  debug: false,
  components: [{ path: '../app/components' }, { path: '../core/ui/components', pathPrefix: false }],
  imports: {
    dirs: ['../app/utils', '../app/state', '../core/ui/composables', '../core/ui/utils'],
    imports: [{ from: '../app/composables/chart', name: 'useChartGraph' }],
  },
  vite: {
    build: {
      cssMinify: false,
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
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
