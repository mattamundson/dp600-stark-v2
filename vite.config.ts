/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'DP-600 Stark V2',
        short_name: 'DP-600',
        description: 'Offline-capable DP-600 exam prep',
        theme_color: '#0b0f1a',
        background_color: '#0b0f1a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,json}'],
        navigateFallback: '/index.html'
      },
      devOptions: { enabled: false }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/data/questions/')) return 'content-questions';
          if (id.includes('/src/data/flashcards/')) return 'content-flashcards';
          if (id.includes('/src/data/scenarios/') || id.includes('/src/data/studyPlan/') || id.includes('/src/data/lab/')) return 'content-misc';
          if (id.includes('/node_modules/react') || id.includes('/node_modules/scheduler') || id.includes('/node_modules/react-dom') || id.includes('/node_modules/react-router-dom')) return 'vendor-react';
          if (id.includes('/node_modules/idb')) return 'vendor-idb';
          return undefined;
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    css: false
  },
  server: { port: 5173, host: '127.0.0.1' }
});
