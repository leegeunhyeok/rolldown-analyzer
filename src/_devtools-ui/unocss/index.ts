import type { Theme } from '@unocss/preset-wind4';
import {
  definePreset,
  mergeDeep,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss';

import { shortcuts } from './shortcuts';
import { theme } from './theme';

export const presetDevToolsUI = definePreset<undefined, Theme>(() => {
  return {
    name: 'devtools-ui-preset',
    shortcuts,
    extendTheme(defaultTheme) {
      return mergeDeep(defaultTheme, theme);
    },
    presets: [presetWind4(), presetAttributify(), presetIcons({ scale: 1.2 }), presetTypography()],
    transformers: [transformerDirectives(), transformerVariantGroup()],
  };
});
