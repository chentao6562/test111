<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { get, post, getImageUrl, getOptimizedImageUrl } from '../api'
import { useCartStore } from '../stores/cart'
import { useUserStore } from '../stores/user'
// 【2026-01-26】统一价格工具函数，禁止直接使用 retailPrice || agentPrice
import { getDisplayPrice, getOriginalPrice, getDiscount as calcDiscount } from '../utils/priceUtils'
// 【2026-01-27】套餐API和工具
import {
  getPackageList,
  getPositioningLabel,
  getPositioningColor,
  type Package
} from '../api/package'
import {
  generatePackageThumbnail,
  shouldGenerateThumbnail,
  extractProductImages
} from '../utils/packageThumbnailGenerator'

// 定义组件名称，用于keep-alive缓存
defineOptions({
  name: 'Category'
})

const router = useRouter()
const route = useRoute()
const cartStore = useCartStore()
const userStore = useUserStore()

// 【2026-01-19修复】获取推销员ID用于获取推销员定价
const salespersonId = computed(() => userStore.currentSalespersonId)

interface Category {
  id: number
  name: string
  icon?: string
}

interface Product {
  id: number
  name: string
  images: string[]
  agentPrice: number
  retailPrice: number
  stock: number
  lockStock: number
  sales: number
  salesCount?: number
  unit?: string  // 销售单位
  videoUrl?: string | null  // 【2026-01-23】视频字段
}

// 【2026-01-27】套餐相关状态
const packages = ref<Package[]>([])
const loadingPackages = ref(false)
const isPackageCategory = ref(false)
const thumbnailCache = ref<Record<number, string>>({})

const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const currentCategoryId = ref<number | null>(null)
const loading = ref(true)
const loadingProducts = ref(false)
const page = ref(1)
const pageSize = 20
const finished = ref(false)

// 可用库存
const getAvailableStock = (product: Product) => {
  return product.stock - (product.lockStock || 0)
}

// 【2026-01-26】使用统一价格工具函数计算折扣
const getDiscount = calcDiscount

// 判断是否热销
const isHot = (product: Product) => {
  const sales = product.salesCount || product.sales || 0
  return sales >= 50
}

// 判断库存紧张
const isLowStock = (product: Product) => {
  const available = getAvailableStock(product)
  return available > 0 && available <= 10
}

// 加载分类
const loadCategories = async () => {
  try {
    const res = await get<Category[]>('/categories')
    categories.value = res.data || []
    if (!Array.isArray(categories.value)) categories.value = []
    if (categories.value.length > 0 && categories.value[0]) {
      // 优先使用URL参数中的categoryId
      const urlCategoryId = route.query.categoryId
      let targetCategory: Category | undefined
      if (urlCategoryId) {
        const targetId = parseInt(urlCategoryId as string)
        targetCategory = categories.value.find(c => c.id === targetId)
        if (!targetCategory) {
          targetCategory = categories.value[0]
        }
      } else {
        targetCategory = categories.value[0]
      }

      // 【2026-01-27】套餐分类特殊处理：在当前页面显示套餐
      if (targetCategory?.name === '套餐') {
        currentCategoryId.value = targetCategory.id
        isPackageCategory.value = true
        loadPackages()
      } else if (targetCategory) {
        currentCategoryId.value = targetCategory.id
        isPackageCategory.value = false
        loadProducts(true)
      }
    }
  } catch {
    Toast({ message: '加载分类失败', theme: 'error' })
  } finally {
    loading.value = false
  }
}

// 加载商品
const loadProducts = async (refresh = false) => {
  if (refresh) {
    page.value = 1
    finished.value = false
  }

  if (loadingProducts.value || finished.value) return

  loadingProducts.value = true
  try {
    const params: any = {
      page: page.value,
      pageSize
    }
    if (currentCategoryId.value) {
      params.categoryId = currentCategoryId.value
    }

    let list: Product[] = []

    // 【2026-01-20修复】推销员自己浏览时显示拿货价，客户访问时显示零售价
    if (userStore.isSelfBrowsing) {
      // 推销员自己浏览：调用 /products 获取拿货价
      const res = await get<{ list: Product[]; total: number }>('/products', params)
      list = res.data.list || []
    } else if (salespersonId.value) {
      // 访客模式：调用 /shop/products 获取推销员设置的零售价
      const res = await get<any>('/shop/products', { ...params, s: salespersonId.value })
      list = (res.data.list || []).map((p: any) => ({
        ...p,
        agentPrice: p.price,
        retailPrice: p.originalPrice
      }))
    } else {
      // 未登录且无推销员ID
      const res = await get<{ list: Product[]; total: number }>('/products', params)
      list = res.data.list || []
    }

    if (refresh) {
      products.value = list
    } else {
      products.value.push(...list)
    }

    if (list.length < pageSize) {
      finished.value = true
    }
  } catch {
    Toast({ message: '加载商品失败', theme: 'error' })
  } finally {
    loadingProducts.value = false
  }
}

// 切换分类
const selectCategory = (categoryId: number) => {
  const category = categories.value.find(c => c.id === categoryId)

  // 【2026-01-27】套餐分类特殊处理：在当前页面显示套餐列表
  if (category?.name === '套餐') {
    if (currentCategoryId.value === categoryId && isPackageCategory.value) return
    currentCategoryId.value = categoryId
    isPackageCategory.value = true
    products.value = []
    loadPackages()
    return
  }

  // 普通分类
  if (currentCategoryId.value === categoryId && !isPackageCategory.value) return
  currentCategoryId.value = categoryId
  isPackageCategory.value = false
  packages.value = []
  loadProducts(true)
}

// 【2026-01-27】加载套餐列表
const loadPackages = async () => {
  loadingPackages.value = true
  try {
    const res = await getPackageList({ pageSize: 100 })
    packages.value = res.data?.list || []
    // 异步生成拼接图
    generateThumbnails()
  } catch {
    Toast({ message: '加载套餐失败', theme: 'error' })
  } finally {
    loadingPackages.value = false
  }
}

// 【2026-01-27】为没有主图的套餐生成拼接图
const generateThumbnails = async () => {
  for (const pkg of packages.value) {
    if (!shouldGenerateThumbnail(pkg)) continue
    if (thumbnailCache.value[pkg.id]) continue
    const productImages = extractProductImages(pkg.items || [])
    if (productImages.length === 0) continue
    try {
      const price = Number(pkg.masterRetailPrice) || 0
      const dataUrl = await generatePackageThumbnail({
        packageId: pkg.id,
        productImages,
        price
      })
      thumbnailCache.value = { ...thumbnailCache.value, [pkg.id]: dataUrl }
    } catch (err) {
      console.warn(`生成套餐${pkg.id}缩略图失败:`, err)
    }
  }
}

// 【2026-01-27】获取套餐图片
const getPackageImage = (pkg: Package): string => {
  if (pkg.images && pkg.images.length > 0 && pkg.images[0]) {
    return getOptimizedImageUrl(pkg.images[0], 'medium')
  }
  const cached = thumbnailCache.value[pkg.id]
  if (cached) return cached
  return '/placeholder.png'
}

// 【2026-01-27】获取套餐显示价格
const getPackageDisplayPrice = (pkg: Package): number | undefined => {
  return pkg.displayPrice || pkg.masterRetailPrice
}

// 【2026-01-27】格式化价格
const formatPrice = (price: number | undefined | null): string => {
  if (price === undefined || price === null) return '-'
  return `¥${price.toFixed(2)}`
}

// 【2026-01-27】查看套餐详情
const goToPackageDetail = (pkg: Package) => {
  router.push(`/packages/${pkg.id}`)
}

// 【2026-01-27】是否是推销员
const isAgent = computed(() => {
  return userStore.userInfo?.type === 'LEVEL1' || userStore.userInfo?.type === 'LEVEL2'
})

// 【2026-01-27】计算毛利率显示
const getGrossMarginDisplay = (pkg: Package): string => {
  if (pkg.grossMargin !== null && pkg.grossMargin !== undefined) {
    return `${Number(pkg.grossMargin).toFixed(0)}%`
  }
  return '-'
}

// 加载更多
const loadMore = () => {
  if (loadingProducts.value || finished.value) return
  page.value++
  loadProducts()
}

// 添加到购物车
const addToCart = async (product: Product) => {
  const available = getAvailableStock(product)
  if (available < 1) {
    Toast({ message: '该商品已售罄，暂无库存', theme: 'warning' })
    return
  }

  try {
    await post('/cart', { productId: product.id, quantity: 1 })
    cartStore.fetchCount()
    Toast({ message: '已加入心愿单', theme: 'success' })
  } catch {}
}

// 查看商品详情
const goProductDetail = (product: Product) => {
  router.push(`/product/${product.id}`)
}

// 购物车数量
const cartCount = computed(() => cartStore.count)

// 跳转购物车
const goCart = () => {
  router.push('/cart')
}

onMounted(() => {
  loadCategories()
  cartStore.fetchCount()
})

// 监听路由参数变化，支持从轮播图跳转并选中分类
watch(() => route.query.categoryId, (newCategoryId) => {
  if (newCategoryId && categories.value.length > 0) {
    const targetId = parseInt(newCategoryId as string)
    if (categories.value.some(c => c.id === targetId)) {
      currentCategoryId.value = targetId
      loadProducts(true)
    }
  }
}, { immediate: true })
</script>

<template>
  <div class="category-page">
    <!-- 顶部栏 -->
    <header class="page-header">
      <h1 class="header-title">商品分类</h1>
      <button class="cart-btn" @click="goCart">
        <t-icon name="cart" size="22px" />
        <span class="cart-badge" v-if="cartCount > 0">{{ cartCount > 99 ? '99+' : cartCount }}</span>
      </button>
    </header>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="40px" />
    </div>

    <div class="main-content" v-else>
      <!-- 左侧分类 -->
      <div class="category-sidebar">
        <div
          class="category-item"
          :class="{ active: currentCategoryId === category.id }"
          v-for="category in categories"
          :key="category.id"
          @click="selectCategory(category.id)"
        >
          <span class="category-name">{{ category.name }}</span>
          <span class="category-indicator" v-if="currentCategoryId === category.id"></span>
        </div>
      </div>

      <!-- 右侧商品 -->
      <div class="product-content">
        <!-- 分类标题 -->
        <div class="category-title-bar">
          <span class="category-title">{{ categories.find(c => c.id === currentCategoryId)?.name || '全部商品' }}</span>
          <span class="product-count" v-if="!isPackageCategory">共{{ products.length }}件</span>
          <span class="product-count" v-else>共{{ packages.length }}个套餐</span>
        </div>

        <!-- 【2026-01-27】套餐列表 -->
        <div class="package-grid" v-if="isPackageCategory && packages.length > 0">
          <div
            v-for="pkg in packages"
            :key="pkg.id"
            class="package-card"
            @click="goToPackageDetail(pkg)"
          >
            <!-- 套餐图片 -->
            <div class="pkg-image">
              <img :src="getPackageImage(pkg)" :alt="pkg.name" />
              <div
                class="positioning-tag"
                :style="{ backgroundColor: getPositioningColor(pkg.positioning) }"
              >
                {{ getPositioningLabel(pkg.positioning) }}
              </div>
            </div>
            <!-- 套餐信息 -->
            <div class="pkg-info">
              <div class="pkg-name">{{ pkg.name }}</div>
              <div class="pkg-tags" v-if="pkg.sceneTags && pkg.sceneTags.length">
                <span v-for="(tag, idx) in pkg.sceneTags.slice(0, 2)" :key="idx" class="scene-tag">
                  {{ tag }}
                </span>
              </div>
              <div class="pkg-price-row">
                <div class="pkg-current-price">{{ formatPrice(getPackageDisplayPrice(pkg)) }}</div>
                <div class="pkg-original-price" v-if="pkg.originalPrice && pkg.originalPrice > (getPackageDisplayPrice(pkg) || 0)">
                  原价 {{ formatPrice(pkg.originalPrice) }}
                </div>
              </div>
              <div class="pkg-stats-row" v-if="isAgent">
                <span class="profit-tag">毛利率 {{ getGrossMarginDisplay(pkg) }}</span>
                <span class="item-count">{{ pkg.items?.length || 0 }}件商品</span>
              </div>
              <div class="pkg-stats-row" v-else>
                <span class="saved-tag" v-if="pkg.savedAmount && pkg.savedAmount > 0">
                  省 ¥{{ pkg.savedAmount.toFixed(0) }}
                </span>
                <span class="item-count">{{ pkg.items?.length || 0 }}件商品</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 套餐加载中 -->
        <div class="loading-packages" v-else-if="isPackageCategory && loadingPackages">
          <t-loading theme="circular" size="40px" text="加载中..." />
        </div>

        <!-- 套餐为空 -->
        <div class="empty-state" v-else-if="isPackageCategory && !loadingPackages && packages.length === 0">
          <div class="empty-icon">📦</div>
          <p>暂无套餐</p>
          <p class="empty-tip">敬请期待~</p>
        </div>

        <!-- 商品列表 -->
        <div class="product-list" v-else-if="!isPackageCategory && products.length > 0">
          <div
            class="product-item"
            v-for="product in products"
            :key="product.id"
            @click="goProductDetail(product)"
          >
            <!-- 商品图片 -->
            <div class="product-image">
              <img :src="getImageUrl(product.images?.[0])" />
              <!-- 角标 -->
              <div class="badge-wrap">
                <span class="badge hot" v-if="isHot(product)">热销</span>
                <span class="badge low-stock" v-else-if="isLowStock(product)">即将售罄</span>
                <span class="badge discount" v-else-if="getDiscount(product) >= 10">省{{ getDiscount(product) }}%</span>
              </div>
              <!-- 【2026-01-23】视频标识 -->
              <div class="video-badge" v-if="product.videoUrl">
                <span class="material-symbols-outlined">play_circle</span>
              </div>
            </div>

            <!-- 商品信息 -->
            <div class="product-info">
              <div class="product-name">{{ product.name }}</div>

              <!-- 营销标签 -->
              <div class="promo-tags">
                <span class="promo-tag agent">代理专享</span>
                <span class="promo-tag reserved">已预约{{ (product.salesCount || product.sales || 0) + 50 }}+件</span>
              </div>

              <!-- 价格区 - 【2026-01-26】使用统一价格函数 -->
              <div class="product-bottom">
                <div class="price-section">
                  <div class="current-price">
                    <span class="symbol">¥</span>
                    <span class="value">{{ getDisplayPrice(product) }}</span>
                    <span class="price-unit">/{{ product.unit || '盒' }}</span>
                  </div>
                  <div class="original-price" v-if="getOriginalPrice(product) > getDisplayPrice(product)">
                    <span>零售价</span>
                    <span class="line-through">¥{{ getOriginalPrice(product) }}</span>
                  </div>
                </div>
                <div
                  class="add-btn"
                  :class="{ disabled: getAvailableStock(product) < 1 }"
                  @click.stop="addToCart(product)"
                >
                  <t-icon name="add" size="22px" />
                </div>
              </div>

              <!-- 库存提示 -->
              <div class="stock-hint" v-if="isLowStock(product)">
                <t-icon name="info-circle" size="12px" />
                <span>仅剩{{ getAvailableStock(product) }}件，抓紧预约</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态（普通商品分类） -->
        <div class="empty-state" v-else-if="!isPackageCategory && !loadingProducts">
          <div class="empty-icon">📦</div>
          <p>该分类暂无商品</p>
          <p class="empty-tip">换个分类看看吧~</p>
        </div>

        <!-- 加载更多（普通商品分类） -->
        <div class="load-more" v-if="!isPackageCategory && products.length > 0">
          <t-loading v-if="loadingProducts" theme="circular" size="24px" />
          <span v-else-if="!finished" @click="loadMore" class="load-more-btn">点击加载更多</span>
          <span v-else class="no-more">- 已经到底了 -</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 页面容器 */
.category-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #FDF6F7;
}

/* 顶部栏 */
.page-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(253, 246, 247, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(239, 6, 45, 0.08);
}

.header-title {
  font-size: 18px;
  font-weight: 700;
  color: #181111;
}

.cart-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.cart-btn :deep(.t-icon) {
  color: #EF062D;
}

.cart-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #EF062D 0%, #FF4D6D 100%);
  border-radius: 9px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
}

/* 加载状态 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 300px;
}

/* 主体布局 */
.main-content {
  display: flex;
  flex: 1;
}

.category-sidebar {
  width: 88px;
  background: #fff;
  flex-shrink: 0;
  height: calc(100vh - 65px);
  overflow-y: auto;
  position: sticky;
  top: 65px;
}

.category-item {
  padding: 16px 8px;
  font-size: 13px;
  color: #666;
  text-align: center;
  position: relative;
  transition: all 0.2s;
}

.category-item.active {
  color: #EF062D;
  background: #FDF6F7;
  font-weight: 600;
}

.category-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: linear-gradient(180deg, #EF062D 0%, #FF4D6D 100%);
  border-radius: 0 2px 2px 0;
}

.category-name {
  display: block;
  word-break: break-all;
  line-height: 1.3;
}

/* 右侧内容区 */
.product-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  height: calc(100vh - 65px);
  padding-bottom: 80px;
}

/* 分类标题栏 */
.category-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 4px;
}

.category-title {
  font-size: 16px;
  font-weight: 700;
  color: #181111;
}

.product-count {
  font-size: 12px;
  color: #999;
}

/* 商品列表 */
.product-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 商品卡片 */
.product-item {
  display: flex;
  gap: 12px;
  background: linear-gradient(145deg, #FFFFFF 0%, #FFF8F8 60%, #FFF5F5 100%);
  border-radius: 14px;
  padding: 12px;
  box-shadow:
    0 6px 16px rgba(239, 6, 45, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transition: all 0.2s;
  position: relative;
  border: 1px solid rgba(239, 6, 45, 0.1);
  overflow: hidden;
}

/* 商品卡片顶部装饰条 - 始终显示 */
.product-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #EF062D 0%, #FFD700 50%, #EF062D 100%);
}

.product-item:active {
  transform: scale(0.98);
  box-shadow:
    0 8px 20px rgba(239, 6, 45, 0.16),
    0 3px 6px rgba(0, 0, 0, 0.06);
}

/* 商品图片 */
.product-image {
  width: 100px;
  height: 100px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 【2026-01-23】视频标识 */
.video-badge {
  position: absolute;
  bottom: 6px;
  left: 6px;
  width: 22px;
  height: 22px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.video-badge .material-symbols-outlined {
  font-size: 12px;
  color: white;
}

/* 角标 */
.badge-wrap {
  position: absolute;
  top: 0;
  left: 0;
}

.badge {
  display: inline-block;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 0 0 6px 0;
}

.badge.hot {
  background: linear-gradient(135deg, #EF062D 0%, #FF4D6D 100%);
  color: #fff;
}

.badge.low-stock {
  background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%);
  color: #fff;
}

.badge.discount {
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  color: #fff;
}

/* 商品信息 */
.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.product-name {
  font-size: 14px;
  font-weight: 600;
  color: #181111;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}

/* 营销标签 */
.promo-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.promo-tag {
  padding: 2px 6px;
  font-size: 10px;
  border-radius: 4px;
  font-weight: 500;
}

.promo-tag.agent {
  background: rgba(233, 12, 31, 0.1);
  color: #EF062D;
  border: 1px solid rgba(233, 12, 31, 0.2);
}

.promo-tag.sales {
  background: rgba(225, 177, 44, 0.1);
  color: #d4940f;
  border: 1px solid rgba(225, 177, 44, 0.2);
}

.promo-tag.reserved {
  background: rgba(255, 77, 109, 0.1);
  color: #F40;
  border: 1px solid rgba(255, 77, 109, 0.2);
}

/* 价格区 */
.product-bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: auto;
}

.price-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.current-price {
  display: flex;
  align-items: baseline;
  color: #EF062D;
}

.current-price .symbol {
  font-size: 12px;
  font-weight: 600;
}

.current-price .value {
  font-size: 20px;
  font-weight: 900;
  text-shadow: 0 1px 2px rgba(239, 6, 45, 0.15);
}

.current-price .price-unit {
  font-size: 12px;
  font-weight: 500;
  color: #999;
  margin-left: 2px;
}

.original-price {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #999;
}

.line-through {
  text-decoration: line-through;
}

/* 加入购物车按钮 */
.add-btn {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, #EF062D 0%, #C41230 100%);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(239, 6, 45, 0.4);
  transition: all 0.2s;
  flex-shrink: 0;
}

.add-btn:active {
  transform: scale(0.92);
  box-shadow: 0 2px 8px rgba(239, 6, 45, 0.5);
}

.add-btn.disabled {
  background: #ccc;
  box-shadow: none;
  pointer-events: none;
}

/* 库存提示 */
.stock-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding: 4px 8px;
  background: rgba(255, 107, 0, 0.08);
  border-radius: 4px;
  font-size: 11px;
  color: #ff6b00;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 4px 0;
}

.empty-tip {
  font-size: 13px;
  color: #bbb;
}

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 20px;
}

.load-more-btn {
  display: inline-block;
  padding: 10px 24px;
  background: linear-gradient(135deg, #EF062D 0%, #FF4D6D 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 20px;
  cursor: pointer;
}

.load-more-btn:active {
  opacity: 0.9;
}

.no-more {
  color: #ccc;
  font-size: 13px;
}

/* ========== 【2026-01-27】套餐列表样式 ========== */
.package-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.package-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.pkg-image {
  position: relative;
  width: 100%;
  padding-top: 100%;
  background: #f8f8f8;
}

.pkg-image img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.positioning-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 8px;
  font-size: 11px;
  color: #fff;
  border-radius: 4px;
}

.pkg-info {
  padding: 10px;
}

.pkg-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pkg-tags {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
}

.scene-tag {
  font-size: 10px;
  color: #999;
  background: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
}

.pkg-price-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 4px;
}

.pkg-current-price {
  font-size: 16px;
  font-weight: 600;
  color: #ff5500;
}

.pkg-original-price {
  font-size: 11px;
  color: #999;
  text-decoration: line-through;
}

.pkg-stats-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.profit-tag {
  color: #00b578;
  font-weight: 500;
}

.saved-tag {
  color: #ff5500;
  font-weight: 500;
}

.item-count {
  color: #999;
}

.loading-packages {
  display: flex;
  justify-content: center;
  padding: 60px 20px;
}
</style>
