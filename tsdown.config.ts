import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    node: 'src/node/index.ts',
    cli: 'src/node/cli.ts',
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
