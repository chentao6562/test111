<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { get, getImageUrl } from '../api'

const router = useRouter()
const route = useRoute()

interface OrderItem {
  id: number
  quantity: number
  price: number
  product: {
    name: string
    images: string[]
  }
}

interface Order {
  id: number
  orderNo: string
  status: string
  totalAmount: number
  paidAmount: number
  depositPaid: boolean
  fullPaid: boolean
  needTransfer: boolean
  createdAt: string
  items: OrderItem[]
}

const orders = ref<Order[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const finished = ref(false)
const page = ref(1)
const pageSize = 10
const searchKeyword = ref('')

// 订单状态Tab
const statusTabs = [
  { label: '全部', value: '' },
  { label: '待确认', value: 'pending_confirm' },
  { label: '待付款', value: 'pending_payment' },
  { label: '待提货', value: 'pending_pickup' },
  { label: '已完成', value: 'completed' }
]
const currentStatus = ref('')
let pollTimer: number | null = null

// 订单状态映射
const statusMap: Record<string, { text: string; color: string; dotColor: string }> = {
  pending_confirm: { text: '待确认', color: '#faad14', dotColor: '#faad14' },
  pending_payment: { text: '待付款', color: '#EF062D', dotColor: '#EF062D' },
  pending_accept: { text: '待接单', color: '#1890ff', dotColor: '#1890ff' },
  preparing: { text: '备货中', color: '#722ed1', dotColor: '#722ed1' },
  pending_lock_fee: { text: '待付锁货费', color: '#fa8c16', dotColor: '#fa8c16' },
  pending_transfer: { text: '待移库', color: '#13c2c2', dotColor: '#13c2c2' },
  transferring: { text: '移库中', color: '#2f54eb', dotColor: '#2f54eb' },
  pending_pickup: { text: '待提货', color: '#E1B12C', dotColor: '#E1B12C' },
  completed: { text: '已完成', color: '#8c8c8c', dotColor: '#8c8c8c' },
  cancelled: { text: '已取消', color: '#bfbfbf', dotColor: '#bfbfbf' }
}

// 获取状态显示
const getStatusInfo = (status: string) => {
  return statusMap[status] || { text: status, color: '#666', dotColor: '#666' }
}

// 支付状态（用于显示支付标签）
const getPaymentStatus = (order: Order) => {
  if (order.fullPaid) return { text: '全款', color: '#52c41a', bg: 'rgba(82, 196, 26, 0.1)' }
  if (order.depositPaid) return { text: '定金', color: '#faad14', bg: 'rgba(250, 173, 20, 0.1)' }
  if (order.paidAmount > 0) return { text: '部分', color: '#fa8c16', bg: 'rgba(250, 140, 22, 0.1)' }
  return { text: '未付', color: '#8c8c8c', bg: 'rgba(140, 140, 140, 0.1)' }
}

// 订单类型标签
const getOrderType = (order: Order) => {
  if (order.needTransfer) return { text: '移库', color: '#722ed1', bg: 'rgba(114, 46, 209, 0.1)' }
  return { text: '到店', color: '#1890ff', bg: 'rgba(24, 144, 255, 0.1)' }
}

// 搜索处理
const onSearch = () => {
  loadOrders(true)
}

// 搜索输入防抖处理
let searchTimer: number | null = null
const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    loadOrders(true)
  }, 500)
}

// 加载订单列表
const loadOrders = async (refresh = false) => {
  if (refresh) {
    page.value = 1
    finished.value = false
  }

  if (page.value === 1) {
    loading.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const params: any = {
      page: page.value,
      pageSize
    }
    if (currentStatus.value) {
      params.status = currentStatus.value
    }
    // 添加搜索关键词参数
    if (searchKeyword.value && searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim()
    }

    const res = await get<{ list: Order[]; total: number }>('/orders', params)
    const list = res.data.list || []

    if (refresh) {
      orders.value = list
    } else {
      orders.value.push(...list)
    }

    if (list.length < pageSize) {
      finished.value = true
    }
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 加载更多
const loadMore = () => {
  if (loadingMore.value || finished.value) return
  page.value++
  loadOrders()
}

// 切换状态Tab
const onTabChange = (value: string) => {
  currentStatus.value = value
  loadOrders(true)
}

const startPolling = () => {
  if (pollTimer) return
  pollTimer = window.setInterval(() => {
    if (loading.value || loadingMore.value) return
    loadOrders(true)
  }, 8000)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const syncPolling = () => {
  const keyword = searchKeyword.value?.trim()
  const shouldPoll = !keyword && ['pending_confirm', 'pending_payment'].includes(currentStatus.value)
  if (shouldPoll) startPolling()
  else stopPolling()
}

// 查看订单详情
const goOrderDetail = (order: Order) => {
  router.push(`/orders/${order.id}`)
}

// 格式化时间
const formatTime = (timeStr: string) => {
  const date = new Date(timeStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 返回
const goBack = () => {
  router.back()
}

// 是否已完成订单
const isCompletedOrder = (status: string) => {
  return status === 'completed' || status === 'cancelled'
}

// 获取订单商品图片（处理多种格式）
const getOrderProductImage = (product: any) => {
  if (!product || !product.images) return ''
  try {
    // 已经是数组
    if (Array.isArray(product.images)) {
      return product.images[0] ? getImageUrl(product.images[0]) : ''
    }
    if (typeof product.images === 'string') {
      // 尝试JSON解析
      if (product.images.startsWith('[')) {
        const images = JSON.parse(product.images)
        return images[0] ? getImageUrl(images[0]) : ''
      }
      // 逗号分隔的字符串
      if (product.images.includes(',')) {
        const firstImage = product.images.split(',')[0].trim()
        return firstImage ? getImageUrl(firstImage) : ''
      }
      // 单个图片路径
      return getImageUrl(product.images)
    }
    return ''
  } catch {
    // JSON解析失败，尝试作为逗号分隔字符串处理
    if (typeof product.images === 'string') {
      const firstImage = product.images.split(',')[0].trim()
      return firstImage ? getImageUrl(firstImage) : ''
    }
    return ''
  }
}

// 获取商品总数
const getTotalItems = (order: Order) => {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

// 【BUG修复】移除watch，避免与onMounted重复加载
// 只在onMounted中处理路由参数
onMounted(() => {
  // 兼容 status 和 tab 两种参数名（从个人中心跳转）
  const status = (route.query.status || route.query.tab) as string
  if (status && statusTabs.some(t => t.value === status)) {
    currentStatus.value = status
  }
  loadOrders(true)
  syncPolling()
})

watch(
  () => [currentStatus.value, searchKeyword.value],
  () => {
    syncPolling()
  }
)

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="orders-page">
    <!-- 顶部导航 -->
    <header class="nav-bar">
      <div class="nav-back" @click="goBack">
        <span class="material-symbols-outlined">arrow_back_ios_new</span>
      </div>
      <h1 class="nav-title">预约列表</h1>
      <div class="nav-placeholder"></div>
    </header>

    <!-- 状态Tab -->
    <nav class="status-tabs">
      <div class="tabs-inner">
        <a
          v-for="tab in statusTabs"
          :key="tab.value"
          :class="['tab-item', { active: currentStatus === tab.value }]"
          @click="onTabChange(tab.value)"
        >
          <p class="tab-text">{{ tab.label }}</p>
        </a>
      </div>
    </nav>

    <!-- 搜索框 -->
    <div class="search-section">
      <label class="search-wrapper">
        <span class="material-symbols-outlined search-icon">search</span>
        <input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索预约号或商品名称"
          @input="onSearchInput"
          @keyup.enter="onSearch"
        />
      </label>
    </div>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="40px" />
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else-if="orders.length === 0">
      <span class="material-symbols-outlined empty-icon">receipt_long</span>
      <p class="empty-title">暂无预约</p>
      <p class="empty-subtitle">快去选购心仪的商品吧</p>
    </div>

    <!-- 订单列表 -->
    <div class="order-list" v-else>
      <article
        v-for="order in orders"
        :key="order.id"
        :class="['order-card', { completed: isCompletedOrder(order.status) }]"
        @click="goOrderDetail(order)"
      >
        <!-- 订单头部 -->
        <div class="order-header">
          <div class="order-header-left">
            <span class="order-no">{{ order.orderNo }}</span>
            <div class="order-tags">
              <span
                class="order-tag"
                :style="{ color: getOrderType(order).color, background: getOrderType(order).bg }"
              >
                {{ getOrderType(order).text }}
              </span>
              <span
                class="order-tag"
                :style="{ color: getPaymentStatus(order).color, background: getPaymentStatus(order).bg }"
              >
                {{ getPaymentStatus(order).text }}
              </span>
            </div>
          </div>
          <span class="order-status" :style="{ color: getStatusInfo(order.status).color }">
            <span class="status-dot" :style="{ background: getStatusInfo(order.status).dotColor }"></span>
            {{ getStatusInfo(order.status).text }}
          </span>
        </div>

        <!-- 商品信息 -->
        <div class="order-content">
          <div class="goods-image-wrap">
            <div
              class="goods-image"
              :style="{ backgroundImage: `url(${getOrderProductImage(order.items[0]?.product)})` }"
            ></div>
          </div>
          <div class="goods-info">
            <div class="goods-top">
              <h3 class="goods-name">{{ order.items[0]?.product?.name || '商品信息缺失' }}</h3>
              <p class="goods-specs" v-if="order.items[0]">
                数量: {{ order.items[0].quantity }}{{ order.items.length > 1 ? ' 等' : '' }}
              </p>
            </div>
            <div class="goods-bottom">
              <span class="goods-count">共{{ getTotalItems(order) }}件商品</span>
              <span class="goods-price">¥ {{ Number(order.totalAmount).toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- 订单底部 -->
        <div class="order-footer">
          <div class="order-meta">
            <span class="order-time">{{ formatTime(order.createdAt) }}</span>
          </div>
          <div class="order-actions">
            <button
              v-if="order.status === 'pending_payment'"
              class="action-btn primary"
            >
              立即支付
            </button>
            <button
              v-else-if="order.status === 'pending_pickup'"
              class="action-btn outline"
            >
              查看提货码
            </button>
            <button
              v-else
              class="action-btn outline"
            >
              查看详情
            </button>
          </div>
        </div>
      </article>

      <!-- 加载更多 -->
      <div class="load-more" v-if="!finished">
        <t-loading v-if="loadingMore" theme="circular" size="24px" />
        <span v-else @click="loadMore">加载更多</span>
      </div>
      <div class="load-more finished" v-else>
        <span class="material-symbols-outlined">check_circle</span>
        没有更多了
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Material Symbols */
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

.orders-page {
  min-height: 100vh;
  background: var(--bg-light, #FAF7F9);
  padding-bottom: 80px;
}

/* 顶部导航 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(250, 248, 245, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
}

.nav-back {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
}

.nav-back:active {
  background: rgba(0, 0, 0, 0.05);
}

.nav-back .material-symbols-outlined {
  font-size: 24px;
  color: var(--text-primary, #181111);
}

.nav-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary, #181111);
  letter-spacing: -0.02em;
  flex: 1;
  text-align: center;
  padding-right: 40px;
}

.nav-placeholder {
  width: 40px;
}

/* 状态Tab */
.status-tabs {
  position: sticky;
  top: 72px;
  z-index: 40;
  background: var(--bg-light, #FAF7F9);
  padding-top: 8px;
}

.tabs-inner {
  display: flex;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 0 16px;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-item.active {
  border-bottom-color: var(--primary, #EF062D);
}

.tab-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #666);
  letter-spacing: 0.02em;
}

.tab-item.active .tab-text {
  color: var(--primary, #EF062D);
  font-weight: 700;
}

/* 搜索框 */
.search-section {
  padding: 16px;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 16px;
  color: #999;
  font-size: 20px;
  transition: color 0.2s;
}

.search-wrapper:focus-within .search-icon {
  color: var(--primary, #EF062D);
}

.search-input {
  width: 100%;
  height: 44px;
  padding-left: 48px;
  padding-right: 16px;
  background: #fff;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  outline: none;
  transition: box-shadow 0.2s;
}

.search-input:focus {
  box-shadow: 0 2px 12px rgba(233, 12, 31, 0.1);
}

.search-input::placeholder {
  color: #999;
}

/* 加载中 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 64px;
  color: #ddd;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #181111);
  margin-bottom: 8px;
}

.empty-subtitle {
  font-size: 14px;
  color: var(--text-secondary, #666);
}

/* 订单列表 */
.order-list {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 订单卡片 */
.order-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.2s;
}

.order-card:active {
  transform: scale(0.98);
}

.order-card.completed {
  opacity: 0.85;
}

/* 订单头部 */
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.order-header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-no {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.order-tags {
  display: flex;
  gap: 6px;
}

.order-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
}

.order-status {
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* 商品信息 */
.order-content {
  display: flex;
  gap: 16px;
}

.goods-image-wrap {
  width: 96px;
  height: 96px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f5f5f5;
}

.goods-image {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.order-card.completed .goods-image-wrap {
  filter: grayscale(0.5);
}

.goods-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 2px 0;
  min-width: 0;
}

.goods-top {
  flex: 1;
}

.goods-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #181111);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.order-card.completed .goods-name {
  color: #666;
}

.goods-specs {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.goods-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.goods-count {
  font-size: 12px;
  color: #999;
}

.goods-price {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary, #EF062D);
  letter-spacing: -0.02em;
}

.order-card.completed .goods-price {
  color: #999;
}

/* 订单底部 */
.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

.order-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.order-time {
  font-size: 12px;
  color: #999;
}

.order-actions {
  display: flex;
  gap: 12px;
}

/* 操作按钮 */
.action-btn {
  padding: 8px 20px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: linear-gradient(135deg, #EF062D 0%, #FF4D6D 100%);
  color: #fff;
  border: none;
  box-shadow: 0 4px 12px rgba(233, 12, 31, 0.2);
}

.action-btn.primary:active {
  transform: scale(0.96);
}

.action-btn.outline {
  background: transparent;
  color: var(--text-secondary, #666);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.action-btn.outline:active {
  background: rgba(0, 0, 0, 0.02);
}

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.load-more:not(.finished) {
  cursor: pointer;
}

.load-more.finished .material-symbols-outlined {
  font-size: 16px;
  color: #52c41a;
}
</style>
