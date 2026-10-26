import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://arkwerx.com',
  build: { inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 } },
});
