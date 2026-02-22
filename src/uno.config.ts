import { defineConfig } from 'unocss';

import { presetDevToolsUI } from './_devtools-ui/unocss';

export default defineConfig({
  presets: [presetDevToolsUI()],
});
