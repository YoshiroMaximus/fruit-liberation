import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// The public Falling Fruit production API key (documented in falling-fruit-web setup).
// Override locally with FF_API_KEY in a .env file if you have your own.
const DEFAULT_API_KEY = 'AKDJGHSD'
const FF_UPSTREAM = 'https://fallingfruit.org/api/0.3'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.FF_API_KEY || DEFAULT_API_KEY

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeManifestIcons: false,
        manifest: {
          id: '/',
          name: 'Fruit Liberation',
          short_name: 'Fruit Lib',
          description:
            'Find free food growing around you. A fast, modern map of the world’s edible plants.',
          theme_color: '#1f3d2b',
          background_color: '#0f1511',
          display: 'standalone',
          display_override: ['fullscreen', 'standalone'],
          scope: '/',
          start_url: '/',
          categories: ['food', 'navigation', 'lifestyle'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icons/icon-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-font-stylesheets',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-font-files',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Basemap vector tiles, glyphs, sprites (OpenFreeMap or MapTiler)
              urlPattern: ({ url }) =>
                url.hostname.endsWith('openfreemap.org') ||
                url.hostname.endsWith('maptiler.com'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'basemap',
                expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 21 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Falling Fruit type catalog – large + rarely changes
              urlPattern: ({ url }) => url.pathname === '/api/types',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'ff-types',
                expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Map data: clusters + locations in view
              urlPattern: ({ url }) =>
                url.pathname === '/api/clusters' ||
                url.pathname === '/api/locations' ||
                url.pathname.startsWith('/api/locations/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'ff-data',
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Review photos on S3
              urlPattern: ({ url }) => url.hostname.includes('amazonaws.com'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'ff-photos',
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    server: {
      host: true,
      proxy: {
        // Mirror the production Cloudflare Pages Function: same-origin /api/*
        // proxied to the Falling Fruit API with the key injected server-side.
        '/api': {
          target: FF_UPSTREAM,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          headers: { 'x-api-key': apiKey },
        },
      },
    },
    build: {
      target: 'es2021',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/maplibre-gl/')) return 'maplibre'
            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/scheduler/')
            ) {
              return 'react'
            }
            if (id.includes('/node_modules/zustand/')) return 'state'
          },
        },
      },
    },
  }
})
