import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: null,
      registerType: 'autoUpdate',
      includeAssets: [
        'icon.svg',
        'pwa/icon-180.png',
        'pwa/icon-192.png',
        'pwa/icon-512.png',
        'pwa/icon-192-maskable.png',
        'pwa/icon-512-maskable.png',
        'apple-touch-icon.png',
        'apple-touch-icon-precomposed.png',
      ],
      manifest: {
        name: 'SkillVersi',
        short_name: 'SkillVersi',
        start_url: '/skillversi/',
        scope: '/skillversi/',
        display: 'standalone',
        background_color: '#0f0f13',
        theme_color: '#0f0f13',
        icons: [
          { src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,json}'],
        navigateFallback: '/skillversi/index.html',
      },
    }),
  ],
  base: '/skillversi/',
})
