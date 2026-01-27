<script setup lang="ts">
/**
 * 限时秒杀页面
 * 展示当前进行中的秒杀活动和商品
 */
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import { get, getOptimizedImageUrl } from '../api'

const router = useRouter()

// 活动数据
interface FlashSaleItem {
  id: number
  productId: number
  flashPrice: number
  originalPrice: number
  flashStock: number
  soldCount: number
  limitPerUser: number
  remainStock: number
  product: {
    id: number
    name: string
    images: string
    retailPrice: number
    unit: string
    status: string
  }
}

interface FlashSaleActivity {
  id: number
  name: string
  startTime: string
  endTime: string
  status: string
  bannerImage?: string
  description?: string
  minOrderAmount: number  // 【2026-01-26】加购门槛金额
  items: FlashSaleItem[]
}

const activity = ref<FlashSaleActivity | null>(null)
const loading = ref(true)

// 秒杀倒计时
const countdown = ref({ hours: 0, minutes: 0, seconds: 0 })
let countdownTimer: number | null = null

// 计算倒计时
const calculateCountdown = () => {
  if (!activity.value) {
    countdown.value = { hours: 0, minutes: 0, seconds: 0 }
    return
  }

  const now = new Date().getTime()
  const startTime = new Date(activity.value.startTime).getTime()
  const endTime = new Date(activity.value.endTime).getTime()

  // 还未开始
  if (now < startTime) {
    const diff = startTime - now
    countdown.value = {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000)
    }
    return
  }

  // 进行中
  if (now < endTime) {
    const diff = endTime - now
    countdown.value = {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000)
    }
    return
  }

  // 已结束
  countdown.value = { hours: 0, minutes: 0, seconds: 0 }
}

// 活动状态
const activityStatus = computed(() => {
  if (!activity.value) return 'none'

  const now = new Date().getTime()
  const startTime = new Date(activity.value.startTime).getTime()
  const endTime = new Date(activity.value.endTime).getTime()

  if (now < startTime) return 'upcoming' // 即将开始
  if (now < endTime) return 'ongoing' // 进行中
  return 'ended' // 已结束
})

// 状态文案
const statusText = computed(() => {
  if (activityStatus.value === 'upcoming') return '距开始'
  if (activityStatus.value === 'ongoing') return '距结束'
  return '已结束'
})

// 加载秒杀活动
const loadActivity = async () => {
  loading.value = true
  try {
    const res = await get<any>('/h5/flash-sale/current')
    // API返回 { hasActivity, activity, items }，需要合并到activity对象
    if (res.data && res.data.hasActivity && res.data.activity) {
      activity.value = {
        ...res.data.activity,
        items: (res.data.items || []).map((item: any) => ({
          id: item.flashSaleItemId || item.id,
          productId: item.productId,
          flashPrice: item.flashPrice,
          originalPrice: item.originalPrice,
          flashStock: item.flashStock,
          soldCount: item.soldCount || 0,
          limitPerUser: item.limitPerUser,
          remainStock: item.remainingStock || item.flashStock - (item.soldCount || 0),
          product: {
            id: item.productId,
            name: item.productName,
            images: item.productImage,
            retailPrice: item.originalPrice,
            unit: item.unit || '个',
            status: 'ON_SALE'
          }
        }))
      }
      calculateCountdown()
    } else {
      activity.value = null
    }
  } catch (e: any) {
    console.error('加载秒杀活动失败', e)
    activity.value = null
  } finally {
    loading.value = false
  }
}

// 获取商品图片
const getProductImage = (item: FlashSaleItem) => {
  if (!item.product || !item.product.images) return '/placeholder.png'
  return getOptimizedImageUrl(item.product.images, 'small')
}

// 计算进度百分比
const getProgressPercent = (item: FlashSaleItem) => {
  if (item.flashStock <= 0) return 100
  return Math.min(100, Math.round((item.soldCount / item.flashStock) * 100))
}

// 【2026-01-26】秒杀商品不能直接加购，需要在结算页配合正价订单一起购买
const addToCart = async (item: FlashSaleItem) => {
  if (item.remainStock <= 0) {
    Toast({ message: '该商品已售罄', theme: 'warning' })
    return
  }

  if (activityStatus.value !== 'ongoing') {
    Toast({ message: '活动暂未开始或已结束', theme: 'warning' })
    return
  }

  // 获取门槛金额
  const minAmount = activity.value?.minOrderAmount || 200

  // 弹出提示对话框
  const dialogInstance = Dialog.confirm({
    title: '秒杀商品购买说明',
    content: `秒杀商品需配合正价商品一起购买，正价商品满¥${minAmount}即可在结算页加购秒杀商品。请先选购正价商品，再到结算页添加秒杀商品。`,
    confirmBtn: '去选购',
    cancelBtn: '知道了',
    onConfirm: () => {
      router.push('/')
      dialogInstance.destroy()
    },
    onCancel: () => {
      dialogInstance.destroy()
    }
  })
}

// 跳转商品详情（传递秒杀信息）
const goProduct = (item: FlashSaleItem) => {
  router.push({
    path: `/product/${item.productId}`,
    query: {
      flashSale: '1',
      flashPrice: String(item.flashPrice),
      flashSaleItemId: String(item.id),
      flashStock: String(item.remainStock),
      limitPerUser: String(item.limitPerUser)
    }
  })
}

// 返回
const goBack = () => {
  router.back()
}

// 补零
const padZero = (num: number) => String(num).padStart(2, '0')

onMounted(() => {
  loadActivity()
  countdownTimer = window.setInterval(calculateCountdown, 1000)
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<template>
  <div class="flash-sale-page">
    <!-- 顶部导航 -->
    <nav class="nav-bar">
      <button class="nav-back" @click="goBack">
        <span class="material-symbols-outlined">arrow_back_ios</span>
      </button>
      <h2 class="nav-title">限时秒杀</h2>
      <div class="nav-placeholder"></div>
    </nav>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="40px" />
    </div>

    <!-- 无活动 -->
    <div class="empty-state" v-else-if="!activity">
      <span class="material-symbols-outlined">event_busy</span>
      <p>暂无秒杀活动</p>
      <p class="empty-tip">敬请期待下次活动</p>
      <button class="back-home-btn" @click="router.push('/')">返回首页</button>
    </div>

    <!-- 活动内容 -->
    <template v-else>
      <!-- 秒杀倒计时头部 -->
      <div class="flash-header">
        <div class="flash-title">
          <span class="flash-icon">⚡</span>
          <span class="flash-text">{{ activity.name }}</span>
          <span class="flash-subtitle" v-if="activity.description">{{ activity.description }}</span>
          <span class="flash-subtitle" v-else>限量抢购 手慢无</span>
        </div>
        <div class="flash-countdown">
          <span class="countdown-label" :class="{ ended: activityStatus === 'ended' }">
            {{ statusText }}
          </span>
          <div class="countdown-time" v-if="activityStatus !== 'ended'">
            <span class="time-block">{{ padZero(countdown.hours) }}</span>
            <span class="time-colon">:</span>
            <span class="time-block">{{ padZero(countdown.minutes) }}</span>
            <span class="time-colon">:</span>
            <span class="time-block">{{ padZero(countdown.seconds) }}</span>
          </div>
        </div>
      </div>

      <!-- 活动状态提示 -->
      <div class="status-bar" v-if="activityStatus === 'upcoming'">
        <span class="material-symbols-outlined">schedule</span>
        <span>活动即将开始，敬请期待！</span>
      </div>
      <div class="status-bar ended" v-if="activityStatus === 'ended'">
        <span class="material-symbols-outlined">event_busy</span>
        <span>活动已结束</span>
      </div>

      <!-- 【2026-01-26】重要提示：必须跟随预订单 -->
      <div class="notice-banner">
        <div class="notice-content">
          <span class="notice-icon">📢</span>
          <div class="notice-text">
            <span class="notice-title">使用须知</span>
            <span class="notice-desc">秒杀商品需与正常预订单一起提交，且采购单总金额需满足门槛要求方可生效</span>
          </div>
        </div>
      </div>

      <!-- 商品列表 -->
      <div class="flash-products" v-if="activity.items.length > 0">
        <div
          class="flash-product-card"
          v-for="(item, index) in activity.items"
          :key="item.id"
          @click="goProduct(item)"
        >
          <!-- 限量标签 -->
          <div class="flash-badge" v-if="index < 3">TOP{{ index + 1 }}</div>
          <div class="sold-out-badge" v-if="item.remainStock <= 0">已售罄</div>

          <div class="product-image" :class="{ 'sold-out': item.remainStock <= 0 }">
            <img :src="getProductImage(item)" :alt="item.product.name" />
          </div>

          <div class="product-info">
            <h3 class="product-name">{{ item.product.name }}</h3>
            <div class="product-price-row">
              <span class="price-symbol">¥</span>
              <span class="price-value">{{ item.flashPrice.toFixed(2) }}</span>
              <span class="price-original">¥{{ item.originalPrice.toFixed(2) }}</span>
              <span class="price-discount" v-if="item.originalPrice > 0">
                {{ Math.round((1 - item.flashPrice / item.originalPrice) * 100) }}%OFF
              </span>
            </div>
            <div class="product-limit" v-if="item.limitPerUser > 0">
              <span class="material-symbols-outlined">person</span>
              限购{{ item.limitPerUser }}{{ item.product.unit || '件' }}
            </div>
            <div class="product-progress">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: `${getProgressPercent(item)}%` }"
                ></div>
              </div>
              <span class="progress-text">
                {{ item.remainStock <= 0 ? '已抢光' : `剩${item.remainStock}${item.product.unit || '件'}` }}
              </span>
            </div>
            <button
              class="flash-buy-btn"
              :class="{
                disabled: item.remainStock <= 0 || activityStatus !== 'ongoing'
              }"
              @click.stop="addToCart(item)"
            >
              {{ item.remainStock <= 0 ? '已售罄' : activityStatus === 'upcoming' ? '即将开始' : activityStatus === 'ended' ? '已结束' : '立即抢购' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 无商品 -->
      <div class="empty-state mini" v-else>
        <span class="material-symbols-outlined">inventory_2</span>
        <p>暂无秒杀商品</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.flash-sale-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: env(safe-area-inset-bottom);
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
}

.nav-placeholder {
  width: 40px;
}

/* 秒杀头部 */
.flash-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(180deg, #FF4D6D 0%, #EF062D 100%);
}

.flash-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.flash-icon {
  font-size: 24px;
}

.flash-text {
  font-size: 18px;
  font-weight: 800;
  color: white;
}

.flash-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flash-countdown {
  text-align: right;
}

.countdown-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  display: block;
  margin-bottom: 4px;
}

.countdown-label.ended {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.countdown-time {
  display: flex;
  align-items: center;
  gap: 4px;
}

.time-block {
  background: white;
  color: #EF062D;
  font-size: 16px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 4px;
  min-width: 32px;
  text-align: center;
}

.time-colon {
  color: white;
  font-weight: 800;
}

/* 状态栏 */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #FFF7E6;
  color: #FA8C16;
  font-size: 14px;
}

.status-bar .material-symbols-outlined {
  font-size: 18px;
}

.status-bar.ended {
  background: #F5F5F5;
  color: #999;
}

/* 【2026-01-26】重要提示横幅 */
.notice-banner {
  background: linear-gradient(135deg, #FFF7E6 0%, #FFE7BA 100%);
  border-bottom: 1px solid #FFD591;
  padding: 12px 16px;
}

.notice-content {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.notice-icon {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 2px;
}

.notice-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notice-title {
  font-size: 14px;
  font-weight: bold;
  color: #AD6800;
}

.notice-desc {
  font-size: 12px;
  color: #AD6800;
  line-height: 1.5;
}

/* 加载中 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

/* 商品列表 */
.flash-products {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flash-product-card {
  display: flex;
  gap: 12px;
  background: white;
  border-radius: 12px;
  padding: 12px;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.flash-badge {
  position: absolute;
  top: 0;
  left: 0;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #5D4200;
  font-size: 10px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 12px 0 8px 0;
  z-index: 2;
}

.sold-out-badge {
  position: absolute;
  top: 50%;
  left: 50px;
  transform: translate(-50%, -50%) rotate(-15deg);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 4px;
  z-index: 3;
}

.product-image {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f5f5f5;
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
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.product-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-price-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.price-symbol {
  font-size: 14px;
  font-weight: 700;
  color: #EF062D;
}

.price-value {
  font-size: 22px;
  font-weight: 800;
  color: #EF062D;
  line-height: 1;
}

.price-original {
  font-size: 12px;
  color: #999;
  text-decoration: line-through;
}

.price-discount {
  font-size: 10px;
  color: white;
  background: #EF062D;
  padding: 2px 4px;
  border-radius: 2px;
  font-weight: 600;
}

.product-limit {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 11px;
  color: #FA8C16;
}

.product-limit .material-symbols-outlined {
  font-size: 12px;
}

.product-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #FFE0E0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #EF062D, #FF6B6B);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 10px;
  color: #EF062D;
  white-space: nowrap;
}

.flash-buy-btn {
  margin-top: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #EF062D, #FF4D6D);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  align-self: flex-start;
}

.flash-buy-btn:active {
  transform: scale(0.98);
}

.flash-buy-btn.disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #999;
}

.empty-state.mini {
  height: 200px;
}

.empty-state .material-symbols-outlined {
  font-size: 64px;
  margin-bottom: 16px;
  color: #ddd;
}

.empty-state p {
  font-size: 15px;
  margin: 0;
}

.empty-state .empty-tip {
  font-size: 13px;
  color: #bbb;
  margin-top: 8px;
}

.back-home-btn {
  margin-top: 20px;
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
</style>
