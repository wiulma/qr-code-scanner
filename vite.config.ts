import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    // Listen on the LAN too, so a phone (or a tunnel) can reach the dev server.
    host: true,
    // Vite rejects unknown Host headers: allow the HTTPS tunnels we use to test on phones.
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok-free.dev'],
  },
  plugins: [
    react(),
    VitePWA({
      // New service worker versions activate on their own: fine for a demo.
      registerType: 'autoUpdate',
      // The plugin adds the <script> that registers the service worker to index.html.
      injectRegister: 'auto',
      // Builds the icons from pwa-assets.config.ts, adds them to the manifest
      // and injects the <link> tags (favicon, apple-touch-icon) into index.html.
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        id: '/',
        name: 'QR Scanner Demo',
        short_name: 'QR Scanner',
        description: 'Camera + QR code scanning PWA demo',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#111827',
        theme_color: '#111827',
      },
      workbox: {
        // Precache the whole app shell so it opens offline.
        // `wasm` is already here for the QR decoder we'll add later.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,wasm}'],
      },
      devOptions: {
        // Set to true to test the service worker with `pnpm dev`.
        // Off by default: a service worker in dev mode makes hot reload confusing.
        enabled: false,
      },
    }),
  ],
})
