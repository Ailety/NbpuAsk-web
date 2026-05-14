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
          // 拦截代理响应，强行禁止 Node.js 的 http-proxy 缓冲
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
      minify: true, // 开启压缩
      rollupOptions: {
        treeshake: true, // 开启 Tree Shaking，消除未使用的代码，减小最终的包大小
        output: {
          chunkFileNames: `assets/js/[name]-[hash].js`, //代码块文件名
          entryFileNames: `assets/js/[name]-[hash].js`, //入口文件名
          assetFileNames: `assets/[ext]/[name]-[hash].[ext]`, // 资源文件名
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // 精细化拆分第三方库[10,11](@ref)
              if (
                id.includes('/vue/') ||
                id.includes('\\vue\\') ||
                id.includes('vue-router') ||
                id.includes('vuex') ||
                id.includes('pinia') ||
                id.includes('@vue/')
              ) {
                return 'vendor-vue'
              }
              if (
                id.includes('axios') ||
                id.includes('markdown-it') ||
                id.includes('@microsoft/fetch-event-source')
              ) {
                return 'vendor-chat'
              }
              if (id.includes('vue-toastification')) return 'vendor-toast'
              if (id.includes('primevue')) return 'vendor-primevue'
              if (id.includes('primeicons')) return 'vendor-primeicons'
              if (id.includes('element-plus')) return 'vendor-element-plus'
              if (id.includes('ant-design-vue')) return 'vendor-ant-design-vue'
              return 'vendor-core' // 其他依赖归为core
            }
          },
        },
      },
    },
  }
})
