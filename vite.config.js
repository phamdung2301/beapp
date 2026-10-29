import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'BEApp — 30 ngày Backend Senior',
        short_name: 'BEApp',
        description: 'Học Java backend hướng senior theo từng ngày: khái niệm, bài tập, ôn tập và theo dõi tiến độ. Chạy offline.',
        theme_color: '#07090f',
        background_color: '#07090f',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        navigateFallback: 'index.html'
      }
    })
  ]
})
