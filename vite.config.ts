import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const allowedHosts = env.VITE_ALLOWED_HOSTS
    ? env.VITE_ALLOWED_HOSTS.split(',').map((h: string) => h.trim()).filter(Boolean)
    : []

  return {
    base: '/',
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'logo.png', 'hero.png', 'bg.webp'],
        manifest: {
          name: 'Echo // 回声系统',
          short_name: 'Echo',
          description: 'Next-gen Visual Novel Engine with LLM Integration',
          theme_color: '#000000',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
      }),
    ],
    server: {
      host: '0.0.0.0',
      port: 8888,
      strictPort: true,
      allowedHosts,
      proxy: {
        '/api': 'http://localhost:3456',
      },
      watch: {
        usePolling: true,
      },
      preTransformRequests: true,
    },
    optimizeDeps: {
      include: ['pixi.js', '@pixi/react', 'framer-motion', 'lucide-react', 'zustand'],
    },
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
        mangle: {
          toplevel: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) return 'vendor-react'
              if (id.includes('framer-motion') || id.includes('lucide-react')) return 'vendor-ui'
              if (id.includes('dexie')) return 'vendor-db'
              if (id.includes('marked') || id.includes('dompurify')) return 'vendor-render'
              if (id.includes('zustand')) return 'vendor-store'
              return 'vendor-libs'
            }
          },
        },
      },
    },
  }
})
