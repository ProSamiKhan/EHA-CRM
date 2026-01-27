
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Fix: Manually define __dirname because it is not available in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'build',
    emptyOutDir: true,
    sourcemap: false, // Save RAM
    minify: 'esbuild',
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      input: {
        // Fix: Use the defined __dirname to resolve entry point paths
        main: resolve(__dirname, 'index.html'),
        installer: resolve(__dirname, 'installer.html'),
      },
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'recharts'],
        }
      }
    },
  }
});
