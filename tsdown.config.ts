import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    node: 'src/node/index.ts',
  },
  target: 'esnext',
  exports: true,
  dts: true,
  clean: false,
  inputOptions: {
    experimental: {
      resolveNewUrlToAsset: false,
    },
  },
  inlineOnly: false,
});
