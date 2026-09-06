import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    // Installable to the home screen, and the screening itself keeps working
    // with no network. Requires HTTPS to install - a phone pointed at a plain
    // http:// LAN address gets no install prompt and no service worker.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // No includeAssets: the globPatterns below already cover the icons and
      // the favicon, and listing them twice only duplicates them in the
      // precache manifest.

      manifest: {
        id: '/',
        name: 'Saans — Paediatric TB Screening',
        short_name: 'Saans',
        description:
          'Paediatric TB screening for community health workers, following the ' +
          'WHO Operational Handbook on Tuberculosis, Module 5.',
        lang: 'en',
        dir: 'ltr',
        categories: ['medical', 'health'],
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        // Matches --color-canvas, so the system chrome and the splash screen
        // are the same charcoal as the app itself.
        theme_color: '#0B0F0E',
        background_color: '#0B0F0E',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      workbox: {
        // Fonts are precached deliberately: Android ships no Nastaliq face, so
        // without them the Urdu UI degrades badly rather than invisibly.
        // webp covers the question guides: a worker checking what stridor
        // looks like is often the one with no signal.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],

        // The three AI endpoints must always reach the server. They are never
        // precached (they are not build assets) and no runtime rule caches
        // them; this only stops SPA navigation fallback swallowing them.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],

  server: {
    host: true,
    port: 5173,
    proxy: {
      // Vision API — uvicorn server.app:app --port 8000
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
