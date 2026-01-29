<script setup lang="ts">
/**
 * 分润详情页面
 * 【2026-01-29】新增，展示单条分润的完整信息
 * 包括：利润金额、预约信息、利润分配、商品明细（含价格快照）
 */
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { get } from '../api'

const router = useRouter()
const route = useRoute()

// 详情数据类型
interface PriceSnapshot {
  costPrice: number
  supplyPrice: number
  level1Price: number | null
  retailPrice: number
}

interface ProductItem {
  productId: number
  productName: string
  productImage: string
  quantity: number
  price: number
  subtotal: number
  priceSnapshot: PriceSnapshot
}

interface ProfitDistribution {
  masterProfit: number
  level1Profit: number
  level2Profit: number
  totalProfit: number
}

interface ReservationDetail {
  id: number
  reservationNo: string
  customerName: string
  customerPhone: string
  pickupDate: string
  totalAmount: number
  status: number
  completedAt: string
  storeName: string
  profitDistribution: ProfitDistribution
  items: ProductItem[]
}

interface CommissionDetail {
  id: number
  type: string
  amount: number
  rate: number
  status: string
  createdAt: string
  remark: string
  reservation: ReservationDetail | null
}

const loading = ref(true)
const detail = ref<CommissionDetail | null>(null)

// 计算商品总数
const totalItemCount = computed(() => {
  if (!detail.value?.reservation?.items) return 0
  return detail.value.reservation.items.reduce((sum, item) => sum + item.quantity, 0)
})

// 加载详情数据
const loadDetail = async () => {
  const id = route.params.id
  if (!id) {
    Toast({ message: '参数错误', theme: 'error' })
    router.back()
    return
  }

  loading.value = true
  try {
    const res = await get<CommissionDetail>(`/commission/records/${id}`)
    detail.value = res.data
  } catch (err: any) {
    Toast({ message: err.message || '加载失败', theme: 'error' })
    router.back()
  } finally {
    loading.value = false
  }
}

// 格式化日期
const formatDate = (dateStr: string, showTime = false) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  if (showTime) {
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${month}/${day} ${hour}:${minute}`
  }
  return `${month}/${day}`
}

// 格式化价格
const formatPrice = (price: number | null | undefined) => {
  if (price === null || price === undefined) return '-'
  return `¥${price.toFixed(2)}`
}

// 返回
const goBack = () => {
  router.back()
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div class="detail-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">分润详情</div>
      <div class="nav-placeholder"></div>
    </div>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="40px" />
    </div>

    <!-- 详情内容 -->
    <div class="detail-content" v-else-if="detail">
      <!-- 利润卡片 -->
      <div class="profit-card">
        <div class="profit-amount">+{{ formatPrice(detail.amount) }}</div>
        <div class="profit-label">我的利润</div>
        <div class="profit-rate" v-if="detail.rate > 0">利润率: {{ detail.rate }}%</div>
      </div>

      <!-- 预约信息 -->
      <div class="section-card" v-if="detail.reservation">
        <div class="section-title">预约信息</div>
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">预约号</span>
            <span class="info-value">{{ detail.reservation.reservationNo }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">客户</span>
            <span class="info-value">{{ detail.reservation.customerName }} {{ detail.reservation.customerPhone }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">订单金额</span>
            <span class="info-value highlight">{{ formatPrice(detail.reservation.totalAmount) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">提货日期</span>
            <span class="info-value">{{ formatDate(detail.reservation.pickupDate) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">完成时间</span>
            <span class="info-value">{{ formatDate(detail.reservation.completedAt, true) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">门店</span>
            <span class="info-value">{{ detail.reservation.storeName }}</span>
          </div>
        </div>
      </div>

      <!-- 利润分配 -->
      <div class="section-card" v-if="detail.reservation?.profitDistribution">
        <div class="section-title">利润分配</div>
        <div class="profit-grid">
          <div class="profit-item">
            <div class="profit-item-value">{{ formatPrice(detail.reservation.profitDistribution.masterProfit) }}</div>
            <div class="profit-item-label">总代利润</div>
          </div>
          <div class="profit-item">
            <div class="profit-item-value">{{ formatPrice(detail.reservation.profitDistribution.level1Profit) }}</div>
            <div class="profit-item-label">一级利润</div>
          </div>
          <div class="profit-item">
            <div class="profit-item-value">{{ formatPrice(detail.reservation.profitDistribution.level2Profit) }}</div>
            <div class="profit-item-label">二级利润</div>
          </div>
        </div>
        <div class="profit-total">
          总利润：{{ formatPrice(detail.reservation.profitDistribution.totalProfit) }}
        </div>
      </div>

      <!-- 商品明细 -->
      <div class="section-card" v-if="detail.reservation?.items && detail.reservation.items.length > 0">
        <div class="section-title">商品明细 (共{{ totalItemCount }}件)</div>
        <div class="product-list">
          <div class="product-item" v-for="item in detail.reservation.items" :key="item.productId">
            <div class="product-main">
              <img
                :src="item.productImage || '/placeholder.png'"
                class="product-image"
                alt=""
              />
              <div class="product-info">
                <div class="product-name">{{ item.productName }}</div>
                <div class="product-meta">
                  <span>×{{ item.quantity }}</span>
                  <span>{{ formatPrice(item.price) }}/件</span>
                  <span class="subtotal">小计 {{ formatPrice(item.subtotal) }}</span>
                </div>
              </div>
            </div>
            <!-- 价格快照 -->
            <div class="price-snapshot">
              <span class="snapshot-item">成本 {{ formatPrice(item.priceSnapshot.costPrice) }}</span>
              <span class="snapshot-divider">|</span>
              <span class="snapshot-item">供货 {{ formatPrice(item.priceSnapshot.supplyPrice) }}</span>
              <span class="snapshot-divider" v-if="item.priceSnapshot.level1Price">|</span>
              <span class="snapshot-item" v-if="item.priceSnapshot.level1Price">给二级 {{ formatPrice(item.priceSnapshot.level1Price) }}</span>
              <span class="snapshot-divider">|</span>
              <span class="snapshot-item">零售 {{ formatPrice(item.priceSnapshot.retailPrice) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 无预约信息时显示 -->
      <div class="empty-reservation" v-if="!detail.reservation">
        <t-icon name="info-circle" size="48px" class="empty-icon" />
        <p>暂无关联预约信息</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 20px;
}

.nav-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 44px;
  background: linear-gradient(135deg, #E53935 0%, #ff6f61 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  color: #fff;
}

.nav-back, .nav-placeholder {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  font-size: 16px;
  font-weight: 500;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

.detail-content {
  padding: 12px;
}

/* 利润卡片 */
.profit-card {
  background: linear-gradient(135deg, #E53935 0%, #ff6f61 100%);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  color: #fff;
  margin-bottom: 12px;
}

.profit-amount {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.profit-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.profit-rate {
  font-size: 13px;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.2);
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
}

/* 区块卡片 */
.section-card {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
}

.section-title {
  padding: 16px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #f5f5f5;
}

/* 信息列表 */
.info-list {
  padding: 0 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: #999;
}

.info-value {
  font-size: 14px;
  color: #333;
}

.info-value.highlight {
  color: #E53935;
  font-weight: 600;
}

/* 利润分配 */
.profit-grid {
  display: flex;
  padding: 16px;
  gap: 8px;
}

.profit-item {
  flex: 1;
  text-align: center;
  background: #f9f9f9;
  border-radius: 8px;
  padding: 12px 8px;
}

.profit-item-value {
  font-size: 16px;
  font-weight: 600;
  color: #E53935;
  margin-bottom: 4px;
}

.profit-item-label {
  font-size: 12px;
  color: #999;
}

.profit-total {
  text-align: center;
  padding: 12px 16px;
  border-top: 1px solid #f5f5f5;
  font-size: 14px;
  color: #666;
}

/* 商品列表 */
.product-list {
  padding: 0 16px 16px;
}

.product-item {
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.product-item:last-child {
  border-bottom: none;
}

.product-main {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.product-image {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  background: #f5f5f5;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-meta {
  font-size: 12px;
  color: #999;
  display: flex;
  gap: 12px;
}

.product-meta .subtotal {
  color: #E53935;
  font-weight: 500;
}

/* 价格快照 */
.price-snapshot {
  background: #f9f9f9;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 11px;
  color: #666;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.snapshot-divider {
  color: #ddd;
}

/* 空状态 */
.empty-reservation {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  color: #ddd;
  margin-bottom: 12px;
}
</style>
