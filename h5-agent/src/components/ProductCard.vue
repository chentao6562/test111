<script setup lang="ts">
import { computed } from 'vue'
import { getOptimizedImageUrl } from '../api'
import { formatPrice, parseImages } from '../utils/format'
// 【2026-01-27修复】使用统一价格工具函数，禁止直接使用 wholesalePrice 等字段组合
import { getDisplayPrice as getPriceUtil } from '../utils/priceUtils'

// Props定义
interface Props {
  product: {
    id: number
    name: string
    images: string | string[]
    displayPrice?: number // 后端计算好的显示价格
    agentPrice?: number
    retailPrice?: number
    stock?: number
    salesCount?: number
    unit?: string
    badge?: string // 角标文本：'热销'、'新品'、'精选'等
  }
  showPrice?: boolean
  showStock?: boolean
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showPrice: true,
  showStock: false,
  clickable: true
})

// Emits
const emit = defineEmits<{
  click: [product: typeof props.product]
}>()

// 获取商品图片（使用small尺寸优化加载速度）
const productImage = computed(() => {
  const images = parseImages(props.product.images)
  return images.length > 0 ? getOptimizedImageUrl(images[0], 'small') : ''
})

// 【2026-01-27修复】获取显示价格 - 使用统一工具函数
// 禁止使用 wholesalePrice，按优先级：displayPrice > agentPrice > retailPrice
const displayPrice = computed(() => {
  return getPriceUtil(props.product)
})

// 处理点击事件
const handleClick = () => {
  if (props.clickable) {
    emit('click', props.product)
  }
}

// 角标样式类
const badgeClass = computed(() => {
  const badge = props.product.badge
  if (!badge) return ''

  if (badge.includes('热') || badge.includes('爆')) return 'badge-hot'
  if (badge.includes('新')) return 'badge-new'
  if (badge.includes('荐') || badge.includes('精')) return 'badge-featured'
  return 'badge-default'
})
</script>

<template>
  <div
    class="product-card"
    :class="{ 'clickable': clickable }"
    @click="handleClick"
  >
    <!-- 商品图片 -->
    <div class="product-image">
      <img
        v-if="productImage"
        :src="productImage"
        :alt="product.name"
        loading="lazy"
      />
      <div v-else class="image-placeholder">
        <t-icon name="image" size="48px" color="#ccc" />
      </div>

      <!-- 角标 -->
      <span v-if="product.badge" class="badge" :class="badgeClass">
        {{ product.badge }}
      </span>

      <!-- 库存不足提示 -->
      <div v-if="showStock && product.stock !== undefined && product.stock < 10" class="stock-warning">
        仅剩{{ product.stock }}件
      </div>
    </div>

    <!-- 商品信息 -->
    <div class="product-info">
      <!-- 商品名称 -->
      <div class="product-name">{{ product.name }}</div>

      <!-- 销量和单位 -->
      <div class="product-meta">
        <span v-if="product.salesCount" class="sales-count">
          已售{{ product.salesCount }}
        </span>
        <span v-if="product.unit" class="unit">{{ product.unit }}</span>
      </div>

      <!-- 价格 -->
      <div v-if="showPrice" class="product-price">
        <span class="price">{{ formatPrice(displayPrice) }}</span>
        <span v-if="product.retailPrice && displayPrice < product.retailPrice" class="original-price">
          {{ formatPrice(product.retailPrice) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-card {
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.product-card.clickable {
  cursor: pointer;
}

.product-card.clickable:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.product-image {
  position: relative;
  width: 100%;
  padding-bottom: 100%; /* 1:1 正方形 */
  overflow: hidden;
  background-color: #f5f5f5;
}

.product-image img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
}

/* 角标 */
.badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 12px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.badge-hot {
  background: linear-gradient(135deg, #EF062D 0%, #FF4D6D 100%);
}

.badge-new {
  background: linear-gradient(135deg, #D8A62F 0%, #F5D76E 100%);
  color: #1B0E0E;
}

.badge-featured {
  background: linear-gradient(135deg, #52C41A 0%, #73D13D 100%);
}

.badge-default {
  background: linear-gradient(135deg, #722ed1 0%, #9254de 100%);
}

/* 库存警告 */
.stock-warning {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 4px 10px;
  background: rgba(255, 77, 79, 0.9);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 99px;
  backdrop-filter: blur(4px);
}

/* 商品信息 */
.product-info {
  padding: 12px;
}

.product-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 40px; /* 保证两行高度 */
}

.product-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.sales-count {
  color: var(--text-muted);
}

.unit {
  color: var(--text-secondary);
}

.product-price {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.price {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary-color);
}

.original-price {
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: line-through;
}
</style>
