<script setup lang="ts">
/**
 * 套餐详情页面
 * 【2026-01-25】新增套餐功能
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { getOptimizedImageUrl, getOriginalImageUrl } from '../../api'
import {
  getPackageDetail,
  getPositioningLabel,
  getPositioningColor,
  type Package,
  type PackageItem
} from '../../api/package'
import { useUserStore } from '../../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const pkg = ref<Package | null>(null)
const currentImageIndex = ref(0)

// 获取套餐ID
const packageId = computed(() => Number(route.params.id))

// 是否是推销员
const isAgent = computed(() => {
  return userStore.userInfo?.type === 'LEVEL1' || userStore.userInfo?.type === 'LEVEL2'
})

// 显示价格
const displayPrice = computed(() => {
  if (!pkg.value) return 0
  return pkg.value.displayPrice || pkg.value.myRetailPrice || pkg.value.masterRetailPrice
})

// 原价（单买总价）
const originalPrice = computed(() => {
  if (!pkg.value || !pkg.value.items) return 0
  return pkg.value.items.reduce((sum, item) => {
    // 优先使用product.retailPrice，然后是item.retailPrice
    const price = item.product?.retailPrice ? Number(item.product.retailPrice) : (item.retailPrice || 0)
    return sum + price * item.quantity
  }, 0)
})

// 节省金额
const savedAmount = computed(() => {
  if (!pkg.value) return 0
  return pkg.value.savedAmount || (originalPrice.value - displayPrice.value)
})

// 毛利率显示 - grossMargin已经是百分比数值（如50表示50%）
const grossMarginDisplay = computed(() => {
  if (!pkg.value || pkg.value.grossMargin === null || pkg.value.grossMargin === undefined) return '-'
  const margin = Number(pkg.value.grossMargin)
  if (isNaN(margin)) return '-'
  return `${margin.toFixed(0)}%`
})

// 我的拿货价（推销员的成本）
const myCostPrice = computed(() => {
  if (!pkg.value) return 0
  // displayPrice就是推销员的拿货价
  // LEVEL1: supplyPrice, LEVEL2: 上级的subPrice或supplyPrice
  return pkg.value.displayPrice || Number(pkg.value.supplyPrice) || 0
})

// 加载套餐详情
const loadDetail = async () => {
  loading.value = true
  try {
    const res = await getPackageDetail(packageId.value)
    pkg.value = res.data
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
    router.back()
  } finally {
    loading.value = false
  }
}

// 【2026-01-27】获取套餐展示图片（主图或从商品提取）
const displayImages = computed(() => {
  if (!pkg.value) return []

  // 1. 如果有主图，直接使用
  if (pkg.value.images && pkg.value.images.length > 0 && pkg.value.images[0]) {
    return pkg.value.images
  }

  // 2. 从商品列表提取图片
  const productImages: string[] = []
  if (pkg.value.items) {
    for (const item of pkg.value.items) {
      const img = item.product?.images?.[0]
      if (img && !productImages.includes(img)) {
        productImages.push(img)
      }
      if (productImages.length >= 4) break
    }
  }
  return productImages
})

// 获取图片URL
const getImageUrl = (url: string): string => {
  return getOriginalImageUrl(url)
}

// 获取商品图片
const getProductImage = (item: PackageItem): string => {
  // 优先从product.images数组获取
  if (item.product?.images && item.product.images.length > 0) {
    return getOptimizedImageUrl(item.product.images[0], 'small')
  }
  // 兼容旧的productImage字段
  if (item.productImage) {
    return getOptimizedImageUrl(item.productImage, 'small')
  }
  return '/placeholder.png'
}

// 获取商品名称
const getProductName = (item: PackageItem): string => {
  return item.product?.name || item.productName || '未知商品'
}

// 获取商品零售价
const getProductRetailPrice = (item: PackageItem): number => {
  if (item.product?.retailPrice) {
    return Number(item.product.retailPrice)
  }
  return item.retailPrice || 0
}

// 格式化价格（兼容字符串和数字类型）
const formatPrice = (price: number | string | undefined | null): string => {
  if (price === undefined || price === null) return '-'
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(numPrice)) return '-'
  return `¥${numPrice.toFixed(2)}`
}

// 图片轮播切换
const onSwiperChange = (current: number) => {
  currentImageIndex.value = current
}

// 立即预约
const handleReserve = () => {
  if (!pkg.value) return

  // 检查库存
  if (pkg.value.availableStock !== undefined && pkg.value.availableStock <= 0) {
    Toast({ message: '套餐库存不足', theme: 'warning' })
    return
  }

  // 【2026-01-26】跳转到套餐预约结算页面
  router.push(`/packages/${pkg.value.id}/checkout`)
}

// 设置定价（推销员专用）
const goToPrice = () => {
  if (!pkg.value) return
  router.push(`/packages/${pkg.value.id}/price`)
}

// 返回列表
const goBack = () => {
  router.back()
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div class="package-detail-page">
    <t-loading v-if="loading" size="40px" text="加载中..." class="page-loading" />

    <template v-else-if="pkg">
      <!-- 图片轮播 -->
      <div class="image-swiper">
        <t-swiper
          v-if="displayImages.length > 0"
          :autoplay="false"
          :navigation="{ type: 'dots' }"
          @change="onSwiperChange"
        >
          <t-swiper-item v-for="(img, idx) in displayImages" :key="idx">
            <img :src="getImageUrl(img)" class="swiper-image" :alt="`${pkg.name} 图片${idx + 1}`" />
          </t-swiper-item>
        </t-swiper>
        <div class="image-placeholder" v-else>
          <div class="placeholder-text">暂无图片</div>
        </div>

        <!-- 定位标签 -->
        <div
          class="positioning-badge"
          :style="{ backgroundColor: getPositioningColor(pkg.positioning) }"
        >
          {{ getPositioningLabel(pkg.positioning) }}
        </div>

        <!-- 返回按钮 -->
        <div class="back-btn" @click="goBack">
          <t-icon name="chevron-left" size="24px" />
        </div>
      </div>

      <!-- 价格区域 -->
      <div class="price-section">
        <div class="price-main">
          <span class="price-symbol">¥</span>
          <span class="price-value">{{ displayPrice.toFixed(2) }}</span>
          <span class="original-price" v-if="originalPrice > displayPrice">
            原价 ¥{{ originalPrice.toFixed(2) }}
          </span>
        </div>
        <div class="price-saved" v-if="savedAmount > 0">
          比单买省 <strong>¥{{ savedAmount.toFixed(0) }}</strong>
        </div>

        <!-- 推销员利润信息 -->
        <div class="agent-profit-info" v-if="isAgent">
          <div class="profit-item">
            <span class="label">拿货价</span>
            <span class="value">{{ formatPrice(myCostPrice) }}</span>
          </div>
          <div class="profit-item">
            <span class="label">建议零售价</span>
            <span class="value">{{ formatPrice(pkg.suggestedPrice || pkg.masterRetailPrice) }}</span>
          </div>
          <div class="profit-item highlight">
            <span class="label">毛利率</span>
            <span class="value">{{ grossMarginDisplay }}</span>
          </div>
        </div>
      </div>

      <!-- 套餐名称和描述 -->
      <div class="info-section">
        <div class="pkg-name">{{ pkg.name }}</div>
        <div class="pkg-tags" v-if="pkg.sceneTags && pkg.sceneTags.length">
          <span
            v-for="(tag, idx) in pkg.sceneTags"
            :key="idx"
            class="scene-tag"
          >
            {{ tag }}
          </span>
        </div>
        <div class="pkg-audience" v-if="pkg.targetAudience">
          适用人群：{{ pkg.targetAudience }}
        </div>
        <div class="pkg-desc" v-if="pkg.description">{{ pkg.description }}</div>
      </div>

      <!-- 套餐商品列表 -->
      <div class="items-section">
        <div class="section-title">
          <span>套餐内容</span>
          <span class="item-count">共{{ pkg.items?.length || 0 }}件商品</span>
        </div>

        <div class="item-list">
          <div
            v-for="item in pkg.items"
            :key="item.id"
            class="item-card"
          >
            <img :src="getProductImage(item)" class="item-image" :alt="getProductName(item)" />
            <div class="item-info">
              <div class="item-name">{{ getProductName(item) }}</div>
              <div class="item-price-row">
                <span class="item-price" v-if="getProductRetailPrice(item)">
                  单买 ¥{{ getProductRetailPrice(item).toFixed(2) }}
                </span>
                <span class="item-quantity">x{{ item.quantity }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 库存信息 -->
      <div class="stock-section" v-if="pkg.availableStock !== undefined">
        <span class="stock-label">可售数量：</span>
        <span class="stock-value" :class="{ low: pkg.availableStock < 10 }">
          {{ pkg.availableStock }}套
        </span>
      </div>

      <!-- 底部操作栏 -->
      <div class="bottom-bar">
        <t-button
          v-if="isAgent"
          class="price-btn"
          variant="outline"
          @click="goToPrice"
        >
          设置定价
        </t-button>
        <t-button
          class="reserve-btn"
          theme="primary"
          :disabled="pkg.availableStock !== undefined && pkg.availableStock <= 0"
          @click="handleReserve"
        >
          {{ pkg.availableStock !== undefined && pkg.availableStock <= 0 ? '已售罄' : '立即预约' }}
        </t-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.package-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

.page-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

/* 图片轮播 */
.image-swiper {
  position: relative;
  width: 100%;
  background: #fff;
}

.swiper-image {
  width: 100%;
  height: 375px;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 375px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  color: #ccc;
  font-size: 16px;
}

.positioning-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 12px;
  font-size: 13px;
  color: #fff;
  border-radius: 4px;
  z-index: 10;
}

.back-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  z-index: 10;
}

/* 价格区域 */
.price-section {
  background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%);
  padding: 16px;
  color: #fff;
}

.price-main {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 6px;
}

.price-symbol {
  font-size: 18px;
  font-weight: 500;
}

.price-value {
  font-size: 32px;
  font-weight: 700;
}

.original-price {
  font-size: 14px;
  text-decoration: line-through;
  opacity: 0.8;
  margin-left: 12px;
}

.price-saved {
  font-size: 14px;
  opacity: 0.9;
}

.price-saved strong {
  font-weight: 600;
}

/* 推销员利润信息 */
.agent-profit-info {
  display: flex;
  gap: 24px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.profit-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.profit-item .label {
  font-size: 12px;
  opacity: 0.8;
}

.profit-item .value {
  font-size: 15px;
  font-weight: 500;
}

.profit-item.highlight .value {
  font-size: 18px;
  font-weight: 600;
}

/* 信息区域 */
.info-section {
  background: #fff;
  padding: 16px;
  margin-top: 10px;
}

.pkg-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.pkg-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.scene-tag {
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  padding: 4px 10px;
  border-radius: 4px;
}

.pkg-audience {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.pkg-desc {
  font-size: 14px;
  color: #999;
  line-height: 1.6;
}

/* 商品列表 */
.items-section {
  background: #fff;
  padding: 16px;
  margin-top: 10px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.item-count {
  font-size: 13px;
  color: #999;
  font-weight: normal;
}

/* 商品列表 - 网格布局优化 */
.item-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.item-card {
  display: flex;
  flex-direction: column;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 8px;
}

.item-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 8px;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.item-name {
  font-size: 13px;
  color: #333;
  margin-bottom: 6px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 34px;
}

.item-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.item-price {
  font-size: 12px;
  color: #999;
}

.item-quantity {
  font-size: 13px;
  color: #ff5500;
  font-weight: 600;
  background: #fff5f0;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 库存信息 */
.stock-section {
  background: #fff;
  padding: 12px 16px;
  margin-top: 10px;
  display: flex;
  align-items: center;
}

.stock-label {
  font-size: 14px;
  color: #666;
}

.stock-value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.stock-value.low {
  color: #ff5500;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.price-btn {
  flex: 1;
  height: 44px;
  border-color: #ff6b00;
  color: #ff6b00;
}

.reserve-btn {
  flex: 2;
  height: 44px;
  background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%);
  border: none;
}
</style>
