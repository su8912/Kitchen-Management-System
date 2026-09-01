import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'Rasoi Vibhag',
        short_name: 'Rasoi',
        description: 'Rasoi Vibhag Management System',
        theme_color: '#ffffff',
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    allowedHosts: [
      'scapegoat-pedometer-stucco.ngrok-free.dev',
      'yummy-experts-roll.loca.lt'
    ],
    proxy: {
      // Proxy all /api/* requests to the backend in development
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
