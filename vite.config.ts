import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'icons.svg', 'icon-192.png', 'icon-512.png', 'mp3/*.mp3', 'char/*.png'],
    manifest: {
      name: 'Echo VN Engine',
      short_name: 'Echo',
      description: 'Next-gen Visual Novel Engine with LLM Integration',
      theme_color: '#000000',
      background_color: '#000000',
      display: 'standalone',
      start_url: '/',
      orientation: 'portrait-primary',
      icons: [
        {
          src: 'icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    }
  }), cloudflare()],
  server: {
    host: '0.0.0.0',
    port: 8888,
    strictPort: true,
    allowedHosts: ['rka.qzz.io'],
    watch: {
      usePolling: true,
    }
  },
  optimizeDeps: {
    include: ['pixi.js', '@pixi/react']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('framer-motion') || id.includes('lucide-react')) return 'vendor-ui';
            if (id.includes('zustand')) return 'vendor-store';
            return 'vendor-libs'; // other third party libraries
          }
        }
      }
    }
  }
})