import { fileURLToPath } from 'node:url';

import { presetDevToolsUI } from '@rolldown-analyzer/core/ui/unocss';
import { createLocalFontProcessor } from '@unocss/preset-web-fonts/local';
import { defineConfig } from 'unocss';

export default defineConfig({
  presets: [
    presetDevToolsUI({
      theme: {
        colors: {
          primary: {
            50: 'hsl(207, 90%, 97%)',
            100: 'hsl(207, 90%, 94%)',
            200: 'hsl(207, 90%, 87%)',
            300: 'hsl(207, 90%, 78%)',
            400: 'hsl(207, 90%, 68%)',
            DEFAULT: 'hsl(207, 90%, 61%)',
            500: 'hsl(207, 90%, 61%)',
            600: 'hsl(207, 90%, 51%)',
            700: 'hsl(207, 90%, 40%)',
            800: 'hsl(207, 90%, 31%)',
            900: 'hsl(207, 90%, 23%)',
            950: 'hsl(207, 90%, 15%)',
          },
        },
      },
      webFonts: {
        processors: createLocalFontProcessor({
          fontAssetsDir: fileURLToPath(new URL('./public/fonts', import.meta.url)),
          fontServeBaseUrl: './fonts',
        }),
      },
    }),
  ],
});
