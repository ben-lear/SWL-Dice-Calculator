/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { compression } from 'vite-plugin-compression2'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 8080,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['justrollcrits_noburst_compressed.png', 'justrollcrits_compressed.png'],
      manifest: {
        name: 'Just Roll Crits',
        short_name: 'Just Roll Crits',
        description: 'Star Wars: Legion attack sequence simulator',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'justrollcrits_noburst_compressed.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'justrollcrits_noburst_compressed.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'justrollcrits_noburst_compressed.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
    // Step 5 — Pre-compressed assets (gzip + Brotli) for static hosting
    compression({
      algorithms: ['gzip'],
      exclude: [/\.(br|gz)$/],
    }),
    compression({
      algorithms: ['brotliCompress'],
      exclude: [/\.(br|gz)$/],
    }),
    // Step 1 — Bundle analyzer — run with: $env:ANALYZE="true"; npm run build
    process.env.ANALYZE === 'true' && visualizer({
      open: true,
      filename: 'dist/bundle-report.html',
      gzipSize: true,
      template: 'treemap',
    }),
  ].filter(Boolean),
  build: {
    // Step 3 — Manual chunk splitting for stable vendor caching
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React and ReactDOM — stable, rarely changes
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react'
          }
          // Recharts and d3 sub-packages — large, only used in ResultsPanel
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-vendor')) {
            return 'vendor-charts'
          }
          // Processed JSON data and enrichment TS — large data files, rarely change
          if (id.includes('/data/processed/') || id.includes('/data/enrichment/')) {
            return 'data'
          }
        },
      },
    },
    // Warn if any individual chunk exceeds 300 KB minified
    chunkSizeWarningLimit: 300,
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
