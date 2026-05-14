import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { PrimeVueResolver } from '@primevue/auto-import-resolver'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig(async ({ command }) => {
  const devPlugins = []
  if (command === 'serve') {
    const { default: vueDevTools } = await import('vite-plugin-vue-devtools')
    devPlugins.push(vueDevTools())
  }

  return {
    base: './',
    plugins: [
      vue(),
      ...devPlugins,
      AutoImport({
        resolvers: [ElementPlusResolver()],
      }),
      Components({
        resolvers: [PrimeVueResolver(), ElementPlusResolver()],
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      cors: true,
      host: true,
      allowedHosts: ['115.230.127.146'],
      proxy: {
        '/conversation': {
          target: 'http://localhost:8088',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes, req, res) => {
              res.setHeader('X-Accel-Buffering', 'no')
              res.setHeader('Cache-Control', 'no-cache, no-transform')
            })
          },
        },
      },
    },
    build: {
      minify: true,
      rollupOptions: {
        treeshake: true,
        output: {
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor'
            }
          },
        },
      },
    },
  }
})
