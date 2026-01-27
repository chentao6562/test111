import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import viteCompression from 'vite-plugin-compression'
import { fileURLToPath, URL } from 'node:url'

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
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  server: {
    port: 8082,
    host: true,
    proxy: {
      '/api': {
        target: 'http://39.104.58.26',
        changeOrigin: true
      }
    }
  },

  build: {
    target: 'es2015',
    minify: 'esbuild',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 800,

    // 代码分割策略
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('tdesign-mobile-vue')) return 'tdesign'
          if (id.includes('node_modules/vue/') || id.includes('node_modules/@vue/')) return 'vue-core'
          if (id.includes('vue-router') || id.includes('pinia')) return 'vue-vendor'
          if (id.includes('html5-qrcode')) return 'qrcode'
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
    include: ['vue', 'vue-router', 'pinia', 'axios', 'tdesign-mobile-vue']
  },

  // 生产环境移除console
  esbuild: {
    drop: ['console', 'debugger'],
  }
})
