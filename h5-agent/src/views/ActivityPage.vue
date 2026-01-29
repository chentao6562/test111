<script setup lang="ts">
/**
 * 活动专题页渲染器
 * 【2026-01-19 活动系统增强】
 * 根据slug动态加载专题页内容，支持多种区块类型
 */
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { get, getOptimizedImageUrl } from '../api'
import { useCartStore } from '../stores/cart'
import { useUserStore } from '../stores/user'
// 【2026-01-29修复】统一价格工具函数
import { getDisplayPrice } from '../utils/priceUtils'

const router = useRouter()
const route = useRoute()
const cartStore = useCartStore()
const userStore = useUserStore()

// 访客模式
const isGuestMode = computed(() => userStore.isGuestMode)

// 专题页数据
interface Product {
  id: number
  name: string
  images: string
  retailPrice: number
  // 【2026-01-29修复】添加显示价格相关字段
  displayPrice?: number
  agentPrice?: number
  unit: string
  stock: number
  lockStock: number
}

interface PageSection {
  id: number
  title?: string
  type: string
  content?: string
  sort: number
  products?: Product[]
}

interface ActivityPage {
  id: number
  name: string
  slug: string
  bannerImage?: string
  description?: string
  startTime?: string
  endTime?: string
  status: string
  layout: string
  sections: PageSection[]
}

const pageData = ref<ActivityPage | null>(null)
const loading = ref(true)
const error = ref('')

// 获取页面slug
const pageSlug = computed(() => route.params.slug as string)

// 活动是否有效
const isActivityValid = computed(() => {
  if (!pageData.value) return false
  if (pageData.value.status !== 'ACTIVE') return false

  const now = new Date().getTime()

  if (pageData.value.startTime) {
    const start = new Date(pageData.value.startTime).getTime()
    if (now < start) return false
  }

  if (pageData.value.endTime) {
    const end = new Date(pageData.value.endTime).getTime()
    if (now > end) return false
  }

  return true
})

// 活动状态文案
const activityStatusText = computed(() => {
  if (!pageData.value) return ''
  if (pageData.value.status !== 'ACTIVE') return '活动已下线'

  const now = new Date().getTime()

  if (pageData.value.startTime) {
    const start = new Date(pageData.value.startTime).getTime()
    if (now < start) return '活动即将开始'
  }

  if (pageData.value.endTime) {
    const end = new Date(pageData.value.endTime).getTime()
    if (now > end) return '活动已结束'
  }

  return ''
})

// 加载专题页数据
const loadPage = async () => {
  loading.value = true
  error.value = ''

  try {
    const res = await get<any>(`/h5/activity-pages/${pageSlug.value}`)
    if (res.code === 0 && res.data) {
      pageData.value = res.data
      // 更新页面标题
      document.title = res.data.name || '活动专题'
    } else {
      error.value = res.message || '专题页不存在'
    }
  } catch (e: any) {
    console.error('加载专题页失败', e)
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

// 获取商品图片
const getProductImage = (images: string) => {
  if (!images) return '/placeholder.png'
  return getOptimizedImageUrl(images, 'small')
}

// 计算可用库存
const getAvailableStock = (product: Product) => {
  return Math.max(0, product.stock - product.lockStock)
}

// 添加到购物车
const addToCart = async (product: Product) => {
  if (!isActivityValid.value) {
    Toast({ message: activityStatusText.value || '活动暂不可用', theme: 'warning' })
    return
  }

  const availableStock = getAvailableStock(product)
  if (availableStock <= 0) {
    Toast({ message: '该商品已售罄', theme: 'warning' })
    return
  }

  try {
    if (isGuestMode.value) {
      cartStore.addToGuestCart({
        productId: product.id,
        productName: product.name,
        productImage: product.images,
        // 【2026-01-29修复】使用统一价格工具函数
        price: getDisplayPrice(product),
        quantity: 1,
        stock: availableStock,
        canSell: true
      })
      Toast({ message: '已加入采购单', theme: 'success' })
    } else {
      // 调用API添加
      await get<any>('/cart', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          quantity: 1
        })
      })
      cartStore.fetchCount()
      Toast({ message: '已加入采购单', theme: 'success' })
    }
  } catch (e: any) {
    Toast({ message: e.message || '添加失败', theme: 'error' })
  }
}

// 跳转商品详情
const goProduct = (productId: number) => {
  router.push(`/product/${productId}`)
}

// 返回
const goBack = () => {
  router.back()
}

// 格式化价格
const formatPrice = (price: number) => {
  return price.toFixed(2)
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

onMounted(() => {
  loadPage()
})
</script>

<template>
  <div class="activity-page">
    <!-- 顶部导航 -->
    <nav class="nav-bar">
      <button class="nav-back" @click="goBack">
        <span class="material-symbols-outlined">arrow_back_ios</span>
      </button>
      <h2 class="nav-title">{{ pageData?.name || '活动专题' }}</h2>
      <div class="nav-placeholder"></div>
    </nav>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="40px" />
    </div>

    <!-- 错误状态 -->
    <div class="error-state" v-else-if="error">
      <span class="material-symbols-outlined">error_outline</span>
      <p>{{ error }}</p>
      <button class="back-home-btn" @click="router.push('/')">返回首页</button>
    </div>

    <!-- 专题页内容 -->
    <template v-else-if="pageData">
      <!-- Banner图 -->
      <div class="page-banner" v-if="pageData.bannerImage">
        <img :src="pageData.bannerImage" :alt="pageData.name" />
      </div>

      <!-- 活动信息头部 -->
      <div class="page-header">
        <h1 class="page-title">{{ pageData.name }}</h1>
        <p class="page-desc" v-if="pageData.description">{{ pageData.description }}</p>
        <div class="page-time" v-if="pageData.startTime || pageData.endTime">
          <span class="material-symbols-outlined">schedule</span>
          <span v-if="pageData.startTime && pageData.endTime">
            {{ formatDate(pageData.startTime) }} - {{ formatDate(pageData.endTime) }}
          </span>
          <span v-else-if="pageData.endTime">
            截止 {{ formatDate(pageData.endTime) }}
          </span>
        </div>
      </div>

      <!-- 活动状态提示 -->
      <div class="status-notice" v-if="activityStatusText">
        <span class="material-symbols-outlined">info</span>
        <span>{{ activityStatusText }}</span>
      </div>

      <!-- 区块列表 -->
      <div class="sections-wrap">
        <div
          class="section-item"
          v-for="section in pageData.sections"
          :key="section.id"
        >
          <!-- 区块标题 -->
          <div class="section-header" v-if="section.title">
            <h3 class="section-title">{{ section.title }}</h3>
          </div>

          <!-- 商品区块 -->
          <template v-if="section.type === 'PRODUCTS' && section.products?.length">
            <!-- 网格布局 -->
            <div
              class="products-grid"
              :class="{ 'list-layout': pageData.layout === 'LIST' }"
            >
              <div
                class="product-card"
                v-for="product in section.products"
                :key="product.id"
                @click="goProduct(product.id)"
              >
                <!-- 售罄标签 -->
                <div class="sold-out-tag" v-if="getAvailableStock(product) <= 0">
                  售罄
                </div>

                <div class="product-image" :class="{ 'sold-out': getAvailableStock(product) <= 0 }">
                  <img :src="getProductImage(product.images)" :alt="product.name" />
                </div>

                <div class="product-info">
                  <h4 class="product-name">{{ product.name }}</h4>
                  <div class="product-price">
                    <span class="price-symbol">¥</span>
                    <!-- 【2026-01-29修复】使用统一价格工具函数 -->
                    <span class="price-value">{{ formatPrice(getDisplayPrice(product)) }}</span>
                    <span class="price-unit">/{{ product.unit || '件' }}</span>
                  </div>
                  <button
                    class="add-cart-btn"
                    :class="{ disabled: getAvailableStock(product) <= 0 || !isActivityValid }"
                    @click.stop="addToCart(product)"
                  >
                    {{ getAvailableStock(product) <= 0 ? '已售罄' : '加入采购单' }}
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- Banner区块 -->
          <template v-else-if="section.type === 'BANNER' && section.content">
            <div class="section-banner">
              <img :src="section.content" alt="活动图片" />
            </div>
          </template>

          <!-- 文本区块 -->
          <template v-else-if="section.type === 'TEXT' && section.content">
            <div class="section-text">
              {{ section.content }}
            </div>
          </template>
        </div>
      </div>

      <!-- 无区块 -->
      <div class="empty-section" v-if="!pageData.sections?.length">
        <span class="material-symbols-outlined">inbox</span>
        <p>暂无活动内容</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.activity-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: calc(env(safe-area-inset-bottom) + 16px);
}

/* 导航栏 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, #EF062D, #FF4D6D);
}

.nav-back {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

.nav-back .material-symbols-outlined {
  font-size: 20px;
  color: white;
}

.nav-title {
  font-size: 18px;
  font-weight: 700;
  color: white;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-placeholder {
  width: 40px;
}

/* 加载中 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

/* 错误状态 */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #999;
}

.error-state .material-symbols-outlined {
  font-size: 64px;
  margin-bottom: 16px;
  color: #ddd;
}

.error-state p {
  font-size: 15px;
  margin: 0 0 20px 0;
}

.back-home-btn {
  padding: 10px 24px;
  background: #EF062D;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.back-home-btn:active {
  opacity: 0.9;
}

/* Banner图 */
.page-banner {
  width: 100%;
  overflow: hidden;
}

.page-banner img {
  width: 100%;
  display: block;
}

/* 页面头部 */
.page-header {
  background: white;
  padding: 16px;
  margin-bottom: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 0 0 8px 0;
}

.page-desc {
  font-size: 14px;
  color: #666;
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.page-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #EF062D;
}

.page-time .material-symbols-outlined {
  font-size: 14px;
}

/* 状态提示 */
.status-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #FFF7E6;
  color: #FA8C16;
  font-size: 14px;
  margin-bottom: 12px;
}

.status-notice .material-symbols-outlined {
  font-size: 18px;
}

/* 区块列表 */
.sections-wrap {
  padding: 0 12px;
}

.section-item {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}

.section-header {
  padding: 16px 16px 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 16px;
  background: #EF062D;
  border-radius: 2px;
}

/* 商品网格 */
.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 12px;
}

.products-grid.list-layout {
  grid-template-columns: 1fr;
}

.product-card {
  background: #fafafa;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.sold-out-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  z-index: 2;
}

.product-image {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: #f0f0f0;
}

.product-image.sold-out {
  opacity: 0.5;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info {
  padding: 10px;
}

.product-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin: 0 0 6px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 36px;
}

.product-price {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-bottom: 8px;
}

.price-symbol {
  font-size: 12px;
  font-weight: 700;
  color: #EF062D;
}

.price-value {
  font-size: 18px;
  font-weight: 800;
  color: #EF062D;
  line-height: 1;
}

.price-unit {
  font-size: 11px;
  color: #999;
}

.add-cart-btn {
  width: 100%;
  padding: 8px 0;
  background: linear-gradient(135deg, #EF062D, #FF4D6D);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.add-cart-btn:active {
  transform: scale(0.98);
}

.add-cart-btn.disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 列表布局商品卡片 */
.products-grid.list-layout .product-card {
  display: flex;
  flex-direction: row;
}

.products-grid.list-layout .product-image {
  width: 100px;
  height: 100px;
  aspect-ratio: 1;
  flex-shrink: 0;
}

.products-grid.list-layout .product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.products-grid.list-layout .product-name {
  height: auto;
  -webkit-line-clamp: 1;
}

.products-grid.list-layout .add-cart-btn {
  width: auto;
  align-self: flex-start;
  padding: 6px 16px;
}

/* Banner区块 */
.section-banner {
  width: 100%;
}

.section-banner img {
  width: 100%;
  display: block;
}

/* 文本区块 */
.section-text {
  padding: 16px;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* 空状态 */
.empty-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.empty-section .material-symbols-outlined {
  font-size: 48px;
  margin-bottom: 12px;
  color: #ddd;
}

.empty-section p {
  font-size: 14px;
  margin: 0;
}
</style>
