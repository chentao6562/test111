import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import viteCompression from 'vite-plugin-compression'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),

    // Gzip压缩
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // 10KB以上才压缩
      algorithm: 'gzip',
      ext: '.gz',
    }),

    // Brotli压缩（现代浏览器支持，压缩率更高）
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
      '@': resolve(__dirname, './src')
    }
  },

  build: {
    target: 'es2015', // 兼容到ES2015
    minify: 'esbuild', // 使用esbuild压缩（更快）

    // 代码分割策略
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // TDesign单独打包
          if (id.includes('tdesign-mobile-vue')) {
            return 'tdesign'
          }

          // Vue核心库单独打包
          if (id.includes('node_modules/vue/') || id.includes('node_modules/@vue/')) {
            return 'vue-core'
          }

          // Vue Router和Pinia单独打包
          if (id.includes('vue-router') || id.includes('pinia')) {
            return 'vue-vendor'
          }

          // Axios单独打包
          if (id.includes('axios')) {
            return 'axios'
          }

          // 工具类单独打包
          if (id.includes('/src/utils/')) {
            return 'utils'
          }

          // 组件单独打包
          if (id.includes('/src/components/')) {
            return 'components'
          }

          // 其他node_modules打包到vendor
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },

        // 文件命名规则
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || ''
          // 图片资源
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico|webp)$/i.test(name)) {
            return 'assets/images/[name]-[hash][extname]'
          }
          // 字体资源
          if (/\.(woff2?|ttf|otf|eot)$/i.test(name)) {
            return 'assets/fonts/[name]-[hash][extname]'
          }
          // CSS资源
          if (/\.css$/i.test(name)) {
            return 'assets/css/[name]-[hash][extname]'
          }
          // 其他资源
          return 'assets/[name]-[hash][extname]'
        }
      }
    },

    // 资源内联阈值（4KB以下转base64）
    assetsInlineLimit: 4096,

    // chunk大小警告阈值（调整到800KB）
    chunkSizeWarningLimit: 800,

    // 关闭sourcemap（生产环境）
    sourcemap: false,

    // CSS代码分割
    cssCodeSplit: true,

    // 预加载清单
    manifest: false,

    // 输出目录
    outDir: 'dist',

    // 生成目录清空
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://39.104.58.26',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },

  // 预构建优化
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'axios',
      'tdesign-mobile-vue'
    ],
    exclude: []
  },

  // Esbuild配置（生产环境移除console）
  esbuild: {
    drop: ['console', 'debugger'],
  }
})
