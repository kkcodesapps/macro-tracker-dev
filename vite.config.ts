import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icon-192x192-light.png',
        'icon-512x512-light.png',
        'icon-192x192-dark.png',
        'icon-512x512-dark.png'
      ],
      manifest: {
        name: 'MacroTracker',
        short_name: 'MacroTracker',
        description: 'Track your daily macros and calories',
        theme_color: '#000000',
        icons: [
          {
            src: 'icon-192x192-light.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
            media: '(prefers-color-scheme: light)'
          },
          {
            src: 'icon-512x512-light.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
            media: '(prefers-color-scheme: light)'
          },
          {
            src: 'icon-192x192-dark.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
            media: '(prefers-color-scheme: dark)'
          },
          {
            src: 'icon-512x512-dark.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
            media: '(prefers-color-scheme: dark)'
          }
        ]
      }
    })
  ],
})