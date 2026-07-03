import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: { swSrc: 'src/sw.js', swDest: 'dist/sw.js' },
      includeAssets: ['favicon.png', 'icons/*.png'],
      manifest: {
        name: 'Football AI Predictor',
        short_name: 'FootballAI',
        description: 'AI-powered football match predictions, live scores, and statistics.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  server: { port: 5173, host: true },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['react-query', 'axios'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-motion': ['framer-motion'],
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
  },
});
