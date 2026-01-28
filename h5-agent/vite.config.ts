import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import viteCompression from 'vite-plugin-compression'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // APK构建时禁用压缩（避免.gz/.br文件导致Android资源重复）
  const isAppBuild = mode === 'app'

  return {
  plugins: [
    vue(),

    // Gzip压缩（APK模式禁用）
    viteCompression({
      verbose: true,
      disable: isAppBuild,
      threshold: 10240, // 10KB以上才压缩
      algorithm: 'gzip',
      ext: '.gz',
    }),

    // Brotli压缩（APK模式禁用）
    viteCompression({
      verbose: true,
      disable: isAppBuild,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
    }),

    // PWA离线缓存配置
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'placeholder.png'],
      manifest: {
        name: '蒙庆烟花推销员',
        short_name: '蒙庆烟花',
        description: '烟花批发价 免费预约 到店付款',
        theme_color: '#C41230',
        background_color: '#FDF6F7',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'logo.png', sizes: '192x192', type: 'image/png' },
          { src: 'logo.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // 商品/分类/套餐API缓存（网络优先）
            urlPattern: /^http:\/\/39\.104\.113\.121\/api\/(shop\/products|shop\/categories|shop\/packages)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 10
            }
          },
          {
            // 图片缓存（缓存优先）
            urlPattern: /^http:\/\/39\.104\.113\.121\/images\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 604800 }
            }
          }
        ]
      }
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
}})
