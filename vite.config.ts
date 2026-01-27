
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    emptyOutDir: true,
    // This ensures that the build is optimized for production
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
  }
});
