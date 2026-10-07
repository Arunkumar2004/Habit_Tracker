import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Two builds:
//  - `npm run build`           → dist/: the installable web app (PWA) hosted on Vercel.
//  - `npm run build:artifact`  → dist-artifact/: one self-contained HTML file for the private claude.ai page.
// Tests: vitest.config.mjs.
export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact';
  return {
    plugins: [react(), ...(artifact ? [viteSingleFile()] : [])],
    server: { port: 5199, strictPort: true },
    // The artifact page has no service worker or manifest, so it skips public/.
    publicDir: artifact ? false : 'public',
    build: {
      target: 'es2020',
      outDir: artifact ? 'dist-artifact' : 'dist',
      ...(artifact ? { assetsInlineLimit: 100_000_000 } : {}),
    },
  };
});
