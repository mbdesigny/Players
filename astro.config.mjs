import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ounsapp.musbch.workers.dev',
  integrations: [sitemap()],
});
