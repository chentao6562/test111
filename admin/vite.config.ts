import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import viteCompression from 'vite-plugin-compression'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),

    // Gzip压缩
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'gzip',
      ext: '.gz',
    }),

    // Brotli压缩
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 9090,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://39.104.58.26',
        changeOrigin: true,
      },
    },
  },

  build: {
    target: 'es2015',
    minify: 'esbuild',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,

    // 代码分割策略
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('tdesign-vue-next')) return 'tdesign'
          if (id.includes('echarts')) return 'echarts'
          if (id.includes('node_modules/vue/') || id.includes('node_modules/@vue/')) return 'vue-core'
          if (id.includes('vue-router') || id.includes('pinia')) return 'vue-vendor'
          if (id.includes('axios')) return 'axios'
          if (id.includes('node_modules')) return 'vendor'
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || ''
          if (/\.(png|jpe?g|svg|gif|webp)$/i.test(name)) return 'assets/images/[name]-[hash][extname]'
          if (/\.(woff2?|ttf|otf|eot)$/i.test(name)) return 'assets/fonts/[name]-[hash][extname]'
          if (/\.css$/i.test(name)) return 'assets/css/[name]-[hash][extname]'
          return 'assets/[name]-[hash][extname]'
        }
      }
    },

    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    emptyOutDir: true,
  },

  // 预构建优化
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'axios', 'tdesign-vue-next']
  },

  // 生产环境移除console
  esbuild: {
    drop: ['console', 'debugger'],
  }
})
