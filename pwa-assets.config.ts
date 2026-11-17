import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

// Generates every icon the PWA needs from one SVG:
// favicon.ico, pwa-64/192/512, maskable-512 (Android adaptive icon)
// and apple-touch-icon-180 (iOS home screen).
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // iOS ignores transparency on home-screen icons: give it a solid background.
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#111827' } },
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#111827' } },
  },
  images: ['public/logo.svg'],
})
