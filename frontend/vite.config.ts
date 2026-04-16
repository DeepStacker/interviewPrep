import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('react-router-dom') || id.includes('/react/') || id.includes('/react-dom/')) {
            return 'vendor-react';
          }

          if (id.includes('/recharts/')) {
            return 'vendor-charts';
          }

          if (id.includes('/axios/')) {
            return 'vendor-network';
          }

          if (id.includes('/zustand/')) {
            return 'vendor-state';
          }

          if (id.includes('/lucide-react/')) {
            return 'vendor-ui';
          }

          return 'vendor-misc';
        },
      },
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
    },
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
