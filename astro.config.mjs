import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://arkwerx.com',
  build: { inlineStylesheets: 'never', format: 'file' },
  vite: { build: { assetsInlineLimit: 0 } },
});
