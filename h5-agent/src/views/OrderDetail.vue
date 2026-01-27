<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { get, post, getImageUrl } from '../api'

// 【BUG修复】定义组件名称，用于keep-alive缓存
defineOptions({
  name: 'OrderDetail'
})

const route = useRoute()
const router = useRouter()

interface OrderItem {
  id: number
  quantity: number
  price: number
  product: {
    id: number
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
  transferFee: number
  pickupCode: string | null
  transferCode: string | null
  remark: string | null
  contactName: string | null
  contactPhone: string | null
  createdAt: string
  confirmedAt: string | null
  paidAt: string | null
  preparedAt: string | null
  pickedAt: string | null
  items: OrderItem[]
  agent: {
    name: string
    phone: string
  }
}

interface QRCodeData {
  qrData: string
  pickupCode: string
  expiresAt: number
  paymentStatus: {
    depositPaid: boolean
    fullPaid: boolean
    paidAmount: number
    totalAmount: number
  }
}

const order = ref<Order | null>(null)
const loading = ref(true)
const qrcodeData = ref<QRCodeData | null>(null)
const qrcodeLoading = ref(false)
const showQRCode = ref(false)
const refreshCountdown = ref(60) // 二维码刷新倒计时

let refreshTimer: number | null = null
let countdownTimer: number | null = null
let orderPollTimer: number | null = null

// 订单状态配置
const statusConfig: Record<string, { text: string; icon: string; desc: string }> = {
  pending_confirm: {
    text: '待确认',
    icon: 'schedule',
    desc: '等待上级代理商确认'
  },
  pending_payment: {
    text: '待付款',
    icon: 'account_balance_wallet',
    desc: '请联系客服完成付款'
  },
  pending_accept: {
    text: '待接单',
    icon: 'storefront',
    desc: '等待仓库接单处理'
  },
  preparing: {
    text: '备货中',
    icon: 'inventory_2',
    desc: '正在为您打包商品'
  },
  pending_transfer: {
    text: '待移库',
    icon: 'local_shipping',
    desc: '等待货管移库'
  },
  transferring: {
    text: '移库中',
    icon: 'local_shipping',
    desc: '正在移库到VIP库房'
  },
  pending_pickup: {
    text: '待提货',
    icon: 'pending_actions',
    desc: '商品已备好，请前往提货'
  },
  completed: {
    text: '已完成',
    icon: 'check_circle',
    desc: '订单已完成'
  },
  cancelled: {
    text: '已取消',
    icon: 'cancel',
    desc: '订单已取消'
  }
}

// 默认状态配置
const defaultStatus = { text: '待付款', icon: 'account_balance_wallet', desc: '请联系客服完成付款' }

// 获取状态配置
const statusInfo = computed(() => {
  if (!order.value) return defaultStatus
  return statusConfig[order.value.status] ?? defaultStatus
})

// 支付状态（用于显示支付标签）
const paymentStatus = computed(() => {
  if (!order.value) return { text: '', color: '#666' }
  if (order.value.fullPaid) return { text: '已全款', color: '#52c41a' }
  if (order.value.depositPaid) return { text: '已付定金', color: '#faad14' }
  if (order.value.paidAmount > 0) return { text: '部分支付', color: '#fa8c16' }
  return { text: '未支付', color: '#8c8c8c' }
})

// 是否显示提货码卡片
const showPickupCard = computed(() => {
  if (!order.value) return false
  return order.value.pickupCode && ['pending_pickup', 'completed'].includes(order.value.status)
})

// 安全格式化金额
const formatAmount = (amount: number | string | undefined | null): string => {
  const num = Number(amount) || 0
  return num.toFixed(2)
}

// 商品金额（总额 - 移库费）
const productAmount = computed(() => {
  if (!order.value) return '0.00'
  const total = Number(order.value.totalAmount) || 0
  const transfer = Number(order.value.transferFee) || 0
  return (total - transfer).toFixed(2)
})

// 加载订单详情
const loadOrder = async () => {
  const id = route.params.id
  loading.value = true
  try {
    const res = await get<Order>(`/orders/${id}`)
    order.value = res.data
    if (res.data.pickupCode && res.data.status === 'pending_pickup') {
      loadQRCode()
    }
  } catch {
    Toast({ message: '订单不存在', theme: 'error' })
    router.back()
  } finally {
    loading.value = false
  }
}

const stopOrderPolling = () => {
  if (orderPollTimer) {
    clearInterval(orderPollTimer)
    orderPollTimer = null
  }
}

const startOrderPolling = () => {
  stopOrderPolling()
  const id = route.params.id
  orderPollTimer = window.setInterval(async () => {
    try {
      const prevStatus = order.value?.status
      const res = await get<Order>(`/orders/${id}`)
      order.value = res.data
      if (prevStatus && prevStatus !== res.data.status && prevStatus === 'pending_payment') {
        Toast({ message: '支付已确认，订单已进入下一流程', theme: 'success' })
      }
      if (res.data.pickupCode && res.data.status === 'pending_pickup' && !qrcodeData.value) {
        loadQRCode()
      }
      if (res.data.status !== 'pending_payment') {
        stopOrderPolling()
      }
    } catch {}
  }, 6000)
}

watch(
  () => order.value?.status,
  (status) => {
    if (status === 'pending_payment') {
      startOrderPolling()
    } else {
      stopOrderPolling()
    }
  }
)

// 加载提货二维码
const loadQRCode = async () => {
  if (!order.value) return
  qrcodeLoading.value = true
  try {
    const res = await get<QRCodeData>(`/orders/${order.value.id}/pickup-qrcode`)
    qrcodeData.value = res.data
    startAutoRefresh()
  } catch (err: any) {
    console.error('获取提货码失败', err)
  } finally {
    qrcodeLoading.value = false
  }
}

// 开始倒计时
const startCountdown = () => {
  refreshCountdown.value = 60
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = window.setInterval(() => {
    if (refreshCountdown.value > 0) {
      refreshCountdown.value--
    }
  }, 1000)
}

// 开始自动刷新
const startAutoRefresh = () => {
  if (refreshTimer) clearInterval(refreshTimer)
  startCountdown()
  refreshTimer = window.setInterval(() => {
    if (order.value?.status === 'pending_pickup') {
      refreshQRCode()
      startCountdown()
    }
  }, 60000)
}

// 刷新二维码
const refreshQRCode = async () => {
  if (!order.value) return
  try {
    const res = await post<QRCodeData>(`/orders/${order.value.id}/pickup-qrcode/refresh`)
    qrcodeData.value = res.data
    refreshCountdown.value = 60
    Toast({ message: '已刷新', theme: 'success' })
  } catch {}
}

// 显示二维码弹窗
const openQRPopup = () => {
  showQRCode.value = true
}

// 关闭二维码弹窗
const closeQRCode = () => {
  showQRCode.value = false
}

// 复制提货码（供模板调用）
const copyPickupCode = async () => {
  if (!order.value?.pickupCode) return
  try {
    await navigator.clipboard.writeText(order.value.pickupCode)
    Toast({ message: '提货码已复制', theme: 'success' })
  } catch {
    Toast({ message: '复制失败', theme: 'warning' })
  }
}
void copyPickupCode // 保留复制功能

// 复制订单号（供模板调用）
const copyOrderNo = async () => {
  if (!order.value?.orderNo) return
  try {
    await navigator.clipboard.writeText(order.value.orderNo)
    Toast({ message: '订单号已复制', theme: 'success' })
  } catch {
    Toast({ message: '复制失败', theme: 'warning' })
  }
}
void copyOrderNo // 保留复制功能

// 拨打电话
const callPhone = (phone: string) => {
  window.location.href = `tel:${phone}`
}

// 格式化时间
const formatTime = (timeStr: string | null) => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 获取商品图片
const getProductImage = (product: any) => {
  if (!product || !product.images) return ''
  try {
    // 如果已经是数组
    if (Array.isArray(product.images)) {
      return product.images[0] ? getImageUrl(product.images[0]) : ''
    }
    if (typeof product.images === 'string') {
      // 尝试JSON解析
      if (product.images.startsWith('[')) {
        const images = JSON.parse(product.images)
        return images[0] ? getImageUrl(images[0]) : ''
      }
      // 可能是逗号分隔的字符串
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

// 返回
const goBack = () => {
  router.back()
}

// 联系客服
const contactService = () => {
  callPhone('13190531439')
}

onMounted(() => {
  loadOrder()
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
  stopOrderPolling()
})
</script>

<template>
  <div class="order-detail-page">
    <!-- 顶部导航 -->
    <header class="nav-bar">
      <div class="nav-back" @click="goBack">
        <span class="material-symbols-outlined">arrow_back_ios</span>
      </div>
      <h2 class="nav-title">订单详情</h2>
      <div class="nav-actions">
        <button class="nav-btn">
          <span class="material-symbols-outlined">share</span>
        </button>
      </div>
    </header>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="40px" />
    </div>

    <template v-else-if="order">
      <!-- 状态Banner -->
      <div class="status-banner">
        <div class="status-pattern"></div>
        <div class="status-content">
          <div class="status-info">
            <div class="status-header">
              <span class="material-symbols-outlined status-icon">{{ statusInfo.icon }}</span>
              <span class="status-text">{{ statusInfo.text }}</span>
              <!-- 支付状态标签 -->
              <span
                class="payment-tag"
                :style="{ background: paymentStatus.color }"
              >
                {{ paymentStatus.text }}
              </span>
            </div>
            <p class="status-order-no">订单编号：{{ order.orderNo }}</p>
          </div>
        </div>
      </div>

      <!-- 提货码卡片 -->
      <div class="pickup-card" v-if="showPickupCard">
        <div class="pickup-header-section">
          <div class="pickup-info">
            <p class="pickup-label">提货凭证</p>
            <p class="pickup-code">{{ order.pickupCode }}</p>
          </div>
          <div class="pickup-badge" :class="order.status === 'completed' ? 'used' : ''">
            {{ order.status === 'completed' ? '已使用' : '待提货' }}
          </div>
        </div>

        <!-- 二维码区域 -->
        <div class="qrcode-section" @click="openQRPopup">
          <div class="qrcode-box">
            <img
              v-if="qrcodeData"
              :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrcodeData.qrData)}`"
              class="qrcode-image"
            />
            <div class="qrcode-placeholder" v-else>
              <span class="material-symbols-outlined">qr_code_2</span>
            </div>
          </div>
          <!-- 刷新倒计时 -->
          <div class="qrcode-countdown" v-if="order.status === 'pending_pickup' && qrcodeData">
            <span class="material-symbols-outlined">schedule</span>
            <span>{{ refreshCountdown }}秒后自动刷新</span>
          </div>
        </div>

        <p class="pickup-hint">
          请向店员出示此二维码或券码<br/>核销成功后即可领取您的商品
        </p>

        <button class="pickup-location-btn" @click="contactService">
          <span class="material-symbols-outlined">location_on</span>
          <span>查看提货地址</span>
        </button>
      </div>

      <div class="content-area">
        <!-- 订单轨迹 -->
        <section class="section-card">
          <h3 class="section-title">订单轨迹</h3>
          <div class="timeline">
            <div class="timeline-item" :class="{ active: order.status === 'pending_pickup', completed: order.pickedAt }">
              <div class="timeline-left">
                <div class="timeline-dot">
                  <span class="material-symbols-outlined" v-if="order.pickedAt">check_circle</span>
                  <span class="material-symbols-outlined" v-else-if="order.status === 'pending_pickup'">radio_button_checked</span>
                  <span class="dot-empty" v-else></span>
                </div>
                <div class="timeline-line"></div>
              </div>
              <div class="timeline-content">
                <p class="timeline-title">{{ order.pickedAt ? '已提货' : (order.status === 'pending_pickup' ? '待提货' : '等待备货') }}</p>
                <p class="timeline-desc">{{ order.pickedAt ? formatTime(order.pickedAt) : (order.status === 'pending_pickup' ? '请前往门店提货' : '-') }}</p>
              </div>
            </div>

            <div class="timeline-item" :class="{ completed: order.paidAt || order.depositPaid, active: !order.paidAt && !order.depositPaid && order.status === 'pending_payment' }">
              <div class="timeline-left">
                <div class="timeline-dot">
                  <span class="material-symbols-outlined" v-if="order.fullPaid">check_circle</span>
                  <span class="material-symbols-outlined" v-else-if="order.depositPaid">check_circle</span>
                  <span class="material-symbols-outlined" v-else-if="order.status === 'pending_payment'">radio_button_checked</span>
                  <span class="dot-empty" v-else></span>
                </div>
                <div class="timeline-line"></div>
              </div>
              <div class="timeline-content">
                <p class="timeline-title">
                  <template v-if="order.fullPaid">已付全款</template>
                  <template v-else-if="order.depositPaid">已付定金</template>
                  <template v-else>待支付</template>
                </p>
                <p class="timeline-desc">
                  <template v-if="order.fullPaid || order.depositPaid">
                    已付 ¥{{ formatAmount(order.paidAmount) }}
                    <template v-if="!order.fullPaid">
                      / 待付 ¥{{ formatAmount(Number(order.totalAmount || 0) - Number(order.paidAmount || 0)) }}
                    </template>
                  </template>
                  <template v-else>请联系客服完成付款</template>
                </p>
              </div>
            </div>

            <div class="timeline-item completed last">
              <div class="timeline-left">
                <div class="timeline-dot">
                  <span class="material-symbols-outlined">radio_button_checked</span>
                </div>
              </div>
              <div class="timeline-content">
                <p class="timeline-title">订单已提交</p>
                <p class="timeline-desc">{{ formatTime(order.createdAt) }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 商品清单 -->
        <section class="section-card">
          <h3 class="section-title">商品清单</h3>
          <div class="goods-list">
            <div class="goods-item" v-for="item in order.items" :key="item.id">
              <div class="goods-image-wrap">
                <img :src="getProductImage(item.product)" class="goods-image" />
              </div>
              <div class="goods-info">
                <div class="goods-top">
                  <p class="goods-name">{{ item.product.name }}</p>
                  <p class="goods-spec">数量: {{ item.quantity }}</p>
                </div>
                <div class="goods-bottom">
                  <span class="goods-price">¥ {{ formatAmount(item.price) }}</span>
                  <span class="goods-qty">x {{ item.quantity }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 金额明细 -->
          <div class="amount-section">
            <div class="amount-row">
              <span>商品总额</span>
              <span>¥ {{ productAmount }}</span>
            </div>
            <!-- 移库费显示：待确定/已确定金额 -->
            <div class="amount-row" v-if="order.needTransfer">
              <span>移库费用</span>
              <span class="fee" v-if="order.transferFee">¥ {{ formatAmount(order.transferFee) }}</span>
              <span class="fee-pending" v-else>待客服确定</span>
            </div>
            <div class="amount-row total">
              <span>订单总额</span>
              <span class="total-price">¥ {{ formatAmount(order.totalAmount) }}</span>
            </div>
            <!-- 支付状态显示 -->
            <div class="amount-row paid" v-if="Number(order.paidAmount || 0) > 0">
              <span>已付金额</span>
              <span class="paid-amount">¥ {{ formatAmount(order.paidAmount) }}</span>
            </div>
            <div class="amount-row unpaid" v-if="!order.fullPaid && Number(order.paidAmount || 0) < Number(order.totalAmount || 0)">
              <span>待付金额</span>
              <span class="unpaid-amount">¥ {{ formatAmount(Number(order.totalAmount || 0) - Number(order.paidAmount || 0)) }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- 底部操作栏 -->
      <footer class="bottom-bar">
        <button class="bar-btn outline" @click="contactService">
          <span class="material-symbols-outlined">headset_mic</span>
          联系客服
        </button>
        <button class="bar-btn primary" v-if="order.status === 'pending_pickup'" @click="openQRPopup">
          <span class="material-symbols-outlined">qr_code_2</span>
          查看提货码
        </button>
        <button class="bar-btn primary" v-else-if="order.status === 'completed'" @click="router.push('/')">
          再次购买
        </button>
      </footer>
    </template>

    <!-- 提货码弹窗 -->
    <t-popup v-model="showQRCode" placement="center" @close="closeQRCode">
      <div class="qrcode-modal" v-if="qrcodeData">
        <div class="modal-header">
          <span class="modal-title">提货二维码</span>
          <span class="material-symbols-outlined close-btn" @click="closeQRCode">close</span>
        </div>
        <div class="modal-content">
          <div class="modal-qrcode-wrap">
            <img
              :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrcodeData.qrData)}`"
              class="modal-qrcode"
            />
          </div>
          <div class="modal-code-box">
            <span class="code-label">提货码</span>
            <span class="code-value">{{ qrcodeData.pickupCode }}</span>
          </div>
          <div class="modal-payment-info">
            <div class="payment-row">
              <span>已付金额</span>
              <span class="paid">¥{{ formatAmount(qrcodeData.paymentStatus?.paidAmount) }}</span>
            </div>
            <div class="payment-row">
              <span>订单总额</span>
              <span>¥{{ formatAmount(qrcodeData.paymentStatus?.totalAmount) }}</span>
            </div>
            <div class="payment-row" v-if="!qrcodeData.paymentStatus?.fullPaid">
              <span>待付尾款</span>
              <span class="unpaid">¥{{ formatAmount(Number(qrcodeData.paymentStatus?.totalAmount || 0) - Number(qrcodeData.paymentStatus?.paidAmount || 0)) }}</span>
            </div>
          </div>
          <button class="modal-refresh-btn" @click="refreshQRCode">
            <span class="material-symbols-outlined">refresh</span>
            刷新二维码
          </button>
          <p class="modal-tip">二维码每60秒自动刷新，请勿截图</p>
        </div>
      </div>
    </t-popup>
  </div>
</template>

<style scoped>
/* Material Symbols */
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

.order-detail-page {
  min-height: 100vh;
  background: var(--bg-light, #FAF7F9);
  padding-bottom: 100px;
}

/* 顶部导航 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
}

.nav-back {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
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
}

.nav-actions {
  width: 48px;
  display: flex;
  justify-content: flex-end;
}

.nav-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.nav-btn .material-symbols-outlined {
  font-size: 24px;
  color: var(--text-primary, #181111);
}

/* 加载中 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

/* 状态Banner */
.status-banner {
  position: relative;
  margin: 0 16px;
  padding: 24px;
  background: linear-gradient(135deg, #EF062D 0%, #b80918 100%);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(233, 12, 31, 0.2);
}

.status-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0);
  background-size: 24px 24px;
  opacity: 0.3;
}

.status-content {
  position: relative;
  z-index: 1;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  font-size: 32px;
  color: #fff;
}

.status-text {
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
}

.status-order-no {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

/* 支付状态标签 */
.payment-tag {
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  margin-left: 8px;
}

/* 提货码卡片 */
.pickup-card {
  margin: -32px 16px 16px;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 10;
}

.pickup-header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.pickup-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pickup-label {
  font-size: 12px;
  font-weight: 700;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.pickup-code {
  font-size: 32px;
  font-weight: 900;
  color: var(--primary, #EF062D);
  letter-spacing: 0.05em;
}

.pickup-badge {
  padding: 6px 12px;
  background: rgba(233, 12, 31, 0.1);
  color: var(--primary, #EF062D);
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
}

.pickup-badge.used {
  background: #f5f5f5;
  color: #999;
}

/* 二维码区域 */
.qrcode-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.qrcode-countdown {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #999;
  background: #f5f5f5;
  padding: 6px 12px;
  border-radius: 16px;
}

.qrcode-countdown .material-symbols-outlined {
  font-size: 14px;
  color: var(--primary, #EF062D);
}

.qrcode-box {
  width: 192px;
  height: 192px;
  padding: 8px;
  background: #fff;
  border: 2px solid rgba(233, 12, 31, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.qrcode-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qrcode-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.qrcode-placeholder .material-symbols-outlined {
  font-size: 64px;
  color: var(--primary, #EF062D);
  opacity: 0.8;
}

.pickup-hint {
  font-size: 14px;
  color: #8a6064;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 24px;
}

.pickup-location-btn {
  width: 100%;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--primary, #EF062D);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(233, 12, 31, 0.3);
  transition: all 0.2s;
}

.pickup-location-btn:active {
  transform: scale(0.98);
}

.pickup-location-btn .material-symbols-outlined {
  font-size: 20px;
}

/* 内容区域 */
.content-area {
  padding: 0 16px;
}

/* 区块卡片 */
.section-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.03);
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary, #181111);
  letter-spacing: -0.02em;
  margin-bottom: 16px;
}

/* 时间线 */
.timeline {
  padding: 0;
}

.timeline-item {
  display: flex;
  position: relative;
  min-height: 60px;
}

.timeline-item:not(.last) {
  padding-bottom: 8px;
}

.timeline-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 32px;
  flex-shrink: 0;
}

.timeline-dot {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.timeline-dot .material-symbols-outlined {
  font-size: 20px;
  color: #ddd;
}

.timeline-item.active .timeline-dot .material-symbols-outlined,
.timeline-item.completed .timeline-dot .material-symbols-outlined {
  color: var(--primary, #EF062D);
}

.timeline-dot .dot-empty {
  width: 10px;
  height: 10px;
  background: #e0e0e0;
  border-radius: 50%;
}

.timeline-line {
  width: 2px;
  flex: 1;
  background: #e8e8e8;
  margin-top: 4px;
  min-height: 24px;
}

.timeline-item.completed .timeline-line {
  background: rgba(233, 12, 31, 0.3);
}

.timeline-item.last .timeline-line {
  display: none;
}

.timeline-content {
  flex: 1;
  padding-left: 12px;
  padding-top: 2px;
}

.timeline-title {
  font-size: 15px;
  font-weight: 600;
  color: #666;
  line-height: 1.4;
}

.timeline-item.active .timeline-title {
  color: var(--primary, #EF062D);
  font-weight: 700;
}

.timeline-item.completed .timeline-title {
  color: #333;
}

.timeline-desc {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
  line-height: 1.4;
}

/* 商品列表 */
.goods-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.goods-item {
  display: flex;
  gap: 16px;
}

.goods-image-wrap {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  background: #f5f5f5;
  flex-shrink: 0;
}

.goods-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.goods-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4px 0;
  min-width: 0;
}

.goods-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #181111);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.goods-spec {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.goods-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.goods-price {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary, #EF062D);
}

.goods-qty {
  font-size: 13px;
  color: #999;
}

/* 金额区域 */
.amount-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.amount-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666;
  padding: 8px 0;
}

.amount-row .fee {
  color: var(--gold, #E1B12C);
}

.amount-row .fee-pending {
  color: #999;
  font-size: 13px;
  font-style: italic;
}

.amount-row.total {
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
}

.amount-row.total span:first-child {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #181111);
}

.total-price {
  font-size: 24px;
  font-weight: 900;
  color: var(--primary, #EF062D);
  letter-spacing: -0.02em;
}

/* 已付/待付金额 */
.amount-row.paid,
.amount-row.unpaid {
  padding: 6px 0;
}

.paid-amount {
  font-size: 15px;
  font-weight: 700;
  color: #52c41a;
}

.unpaid-amount {
  font-size: 15px;
  font-weight: 700;
  color: #faad14;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.bar-btn {
  flex: 1;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.bar-btn.outline {
  background: #fff;
  color: var(--text-primary, #181111);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.bar-btn.outline:active {
  background: #f5f5f5;
}

.bar-btn.primary {
  background: var(--primary, #EF062D);
  color: #fff;
  border: none;
  box-shadow: 0 4px 16px rgba(233, 12, 31, 0.2);
  flex: 1.5;
}

.bar-btn.primary:active {
  transform: scale(0.98);
}

.bar-btn .material-symbols-outlined {
  font-size: 18px;
}

/* 二维码弹窗 */
.qrcode-modal {
  width: 320px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.modal-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary, #181111);
}

.close-btn {
  font-size: 24px;
  color: #999;
  cursor: pointer;
}

.modal-content {
  padding: 24px 20px;
  text-align: center;
}

.modal-qrcode-wrap {
  margin-bottom: 20px;
}

.modal-qrcode {
  width: 200px;
  height: 200px;
}

.modal-code-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(233, 12, 31, 0.05) 0%, rgba(233, 12, 31, 0.02) 100%);
  border-radius: 12px;
  margin-bottom: 16px;
}

.modal-code-box .code-label {
  font-size: 12px;
  color: #8a6064;
}

.modal-code-box .code-value {
  font-size: 28px;
  font-weight: 900;
  color: var(--primary, #EF062D);
  letter-spacing: 4px;
}

.modal-payment-info {
  background: #fafafa;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.payment-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666;
  padding: 6px 0;
}

.payment-row .paid {
  color: #52c41a;
}

.payment-row .unpaid {
  color: var(--primary, #EF062D);
  font-weight: 600;
}

.modal-refresh-btn {
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--primary, #EF062D);
  border-radius: 9999px;
  background: #fff;
  color: var(--primary, #EF062D);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.modal-refresh-btn .material-symbols-outlined {
  font-size: 18px;
}

.modal-tip {
  font-size: 12px;
  color: #999;
  margin-top: 12px;
}
</style>
