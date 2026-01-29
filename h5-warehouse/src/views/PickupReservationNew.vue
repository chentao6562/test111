<template>
  <div class="pickup-page">
    <!-- 扫码核销区域 -->
    <div class="scan-section">
      <t-button theme="primary" size="large" block @click="handleScan">
        <t-icon name="scan" size="24px" />
        扫码核销
      </t-button>
      <div class="scan-tip">让客户出示预约详情页的二维码</div>
    </div>

    <!-- 今日统计 -->
    <div class="stats-section">
      <div class="stat-item">
        <div class="stat-value">{{ stats.completedCount }}</div>
        <div class="stat-label">今日核销</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">¥{{ stats.completedAmount.toFixed(0) }}</div>
        <div class="stat-label">核销金额</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ stats.pendingCount }}</div>
        <div class="stat-label">待核销</div>
      </div>
    </div>

    <!-- 查询方式切换 -->
    <div class="search-section">
      <div class="section-title">其他查询方式</div>
      <div class="method-tabs">
        <div
          class="method-tab"
          :class="{ active: activeMethod === 'phone' }"
          @click="activeMethod = 'phone'"
        >
          <t-icon name="call" size="18px" />
          <span>手机号</span>
        </div>
        <div
          class="method-tab"
          :class="{ active: activeMethod === 'no' }"
          @click="activeMethod = 'no'"
        >
          <t-icon name="file" size="18px" />
          <span>预约号</span>
        </div>
        <div
          class="method-tab"
          :class="{ active: activeMethod === 'code' }"
          @click="activeMethod = 'code'"
        >
          <t-icon name="qrcode" size="18px" />
          <span>提货码</span>
        </div>
      </div>

      <!-- 手机号查询 -->
      <div v-if="activeMethod === 'phone'" class="search-input">
        <t-input
          v-model="phoneInput"
          placeholder="请输入客户手机号"
          type="tel"
          maxlength="11"
          clearable
          @keyup.enter="handleSearchByPhone"
        />
        <t-button theme="primary" :loading="searching" @click="handleSearchByPhone">
          查询
        </t-button>
      </div>

      <!-- 预约号查询 -->
      <div v-if="activeMethod === 'no'" class="search-input">
        <t-input
          v-model="reservationNoInput"
          placeholder="请输入预约号"
          clearable
          @keyup.enter="handleSearchByNo"
        />
        <t-button theme="primary" :loading="searching" @click="handleSearchByNo">
          查询
        </t-button>
      </div>

      <!-- 提货码查询 -->
      <div v-if="activeMethod === 'code'" class="search-input">
        <t-input
          v-model="pickupCodeInput"
          placeholder="请输入8位提货码"
          type="tel"
          maxlength="8"
          clearable
          @keyup.enter="handleSearchByCode"
        />
        <t-button theme="primary" :loading="searching" @click="handleSearchByCode">
          核销
        </t-button>
      </div>
    </div>

    <!-- 查询结果 -->
    <div v-if="reservation" class="result-section">
      <div class="result-header">
        <span class="reservation-no">{{ reservation.reservationNo }}</span>
        <t-tag :theme="getStatusTheme(reservation.status)" size="small">
          {{ getStatusLabel(reservation.status) }}
        </t-tag>
      </div>

      <div class="info-row">
        <span class="label">客户姓名</span>
        <span class="value">{{ reservation.customerName }}</span>
      </div>
      <div class="info-row">
        <span class="label">联系电话</span>
        <span class="value">{{ reservation.customerPhone }}</span>
      </div>
      <div class="info-row">
        <span class="label">提货日期</span>
        <span class="value">{{ reservation.pickupDate }}</span>
      </div>
      <div class="info-row">
        <span class="label">商品数量</span>
        <span class="value">{{ reservation.itemCount || reservation.items?.length || 0 }} 件</span>
      </div>
      <div class="info-row total">
        <span class="label">预约金额</span>
        <span class="value amount">¥{{ reservation.totalAmount.toFixed(2) }}</span>
      </div>

      <!-- 商品列表 -->
      <div v-if="reservation.items && reservation.items.length > 0" class="items-section">
        <div class="items-title">商品明细</div>
        <div v-for="item in reservation.items" :key="item.productId" class="item-row">
          <span class="item-name">{{ item.productName }}</span>
          <span class="item-info">x{{ item.quantity }} ¥{{ (item.price * item.quantity).toFixed(2) }}</span>
        </div>
      </div>

      <!-- 支付方式选择 -->
      <div class="payment-section">
        <div class="section-label">收款方式</div>
        <div class="payment-options">
          <div
            class="payment-option"
            :class="{ active: paymentMethod === 'cash' }"
            @click="paymentMethod = 'cash'"
          >
            现金
          </div>
          <div
            class="payment-option"
            :class="{ active: paymentMethod === 'wechat' }"
            @click="paymentMethod = 'wechat'"
          >
            微信
          </div>
          <div
            class="payment-option"
            :class="{ active: paymentMethod === 'alipay' }"
            @click="paymentMethod = 'alipay'"
          >
            支付宝
          </div>
        </div>
      </div>

      <!-- 赠品发放 -->
      <div v-if="reservation.giftName" class="gift-section">
        <div class="section-label">赠品发放</div>
        <div class="gift-info">
          <span>{{ reservation.giftName }}</span>
          <t-switch v-model="deliverGift" />
        </div>
      </div>

      <!-- 核销按钮 -->
      <t-button
        theme="danger"
        size="large"
        block
        :loading="completing"
        @click="handleComplete"
      >
        确认核销 (收款 ¥{{ reservation.totalAmount.toFixed(2) }})
      </t-button>
    </div>

    <!-- 扫码组件 -->
    <QRScanner v-model="showScanner" @success="onScanSuccess" />

    <!-- 核销成功弹窗 -->
    <t-dialog
      v-model="showSuccessDialog"
      title="核销成功"
      :confirm-btn="{ content: '确定', theme: 'primary' }"
      :cancel-btn="null"
      @confirm="onSuccessConfirm"
    >
      <div class="success-content">
        <t-icon name="check-circle" size="64px" color="#4CAF50" />
        <div class="success-amount">¥{{ completeResult?.totalAmount?.toFixed(2) || '0.00' }}</div>
        <div class="success-info">预约号：{{ completeResult?.reservationNo }}</div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import {
  searchByPhone,
  searchByReservationNo,
  verifyByPickupCode,
  completePickup,
  getTodayPickupStats,
  StatusLabels,
  type Reservation,
  type CompletePickupResult
} from '@/api/reservation'
import QRScanner from '@/components/QRScanner.vue'

const route = useRoute()

// 状态
const activeMethod = ref<'phone' | 'no' | 'code'>('phone')
const phoneInput = ref('')
const reservationNoInput = ref('')
const pickupCodeInput = ref('')
const searching = ref(false)
const completing = ref(false)
const reservation = ref<Reservation | null>(null)
const paymentMethod = ref<'cash' | 'wechat' | 'alipay'>('cash')
const deliverGift = ref(true)
const showScanner = ref(false)
const showSuccessDialog = ref(false)
const completeResult = ref<CompletePickupResult | null>(null)

// 今日统计
const stats = ref({
  completedCount: 0,
  completedAmount: 0,
  pendingCount: 0
})

// 状态标签
function getStatusLabel(status: number): string {
  return StatusLabels[status] || '未知'
}

// 状态主题色
function getStatusTheme(status: number): string {
  if (status === 9) return 'success'  // 待提货
  if (status === 2 || status === 7 || status === 8) return 'primary'  // 已确认/待备货/备货中
  if (status === 3) return 'default'  // 已完成
  return 'warning'
}

// 加载今日统计
async function loadStats() {
  try {
    stats.value = await getTodayPickupStats()
  } catch (e) {
    console.warn('统计加载失败:', e)
  }
}

// 手机号查询
async function handleSearchByPhone() {
  if (!phoneInput.value || phoneInput.value.length < 11) {
    Toast({ message: '请输入正确的手机号', theme: 'warning' })
    return
  }
  searching.value = true
  try {
    const result = await searchByPhone(phoneInput.value)
    reservation.value = result
    // 如果有赠品，默认勾选发放
    deliverGift.value = !!result.giftName
  } catch (e: any) {
    Toast({ message: e.message || '未找到待核销预约', theme: 'error' })
    reservation.value = null
  } finally {
    searching.value = false
  }
}

// 预约号查询
async function handleSearchByNo() {
  if (!reservationNoInput.value) {
    Toast({ message: '请输入预约号', theme: 'warning' })
    return
  }
  searching.value = true
  try {
    const result = await searchByReservationNo(reservationNoInput.value)
    reservation.value = result
    deliverGift.value = !!result.giftName
  } catch (e: any) {
    Toast({ message: e.message || '未找到预约', theme: 'error' })
    reservation.value = null
  } finally {
    searching.value = false
  }
}

// 提货码查询
async function handleSearchByCode() {
  if (!pickupCodeInput.value || pickupCodeInput.value.length < 8) {
    Toast({ message: '请输入8位提货码', theme: 'warning' })
    return
  }
  searching.value = true
  try {
    const result = await verifyByPickupCode(pickupCodeInput.value)
    reservation.value = result
    deliverGift.value = !!result.giftName
  } catch (e: any) {
    Toast({ message: e.message || '提货码无效', theme: 'error' })
    reservation.value = null
  } finally {
    searching.value = false
  }
}

// 扫码
function handleScan() {
  showScanner.value = true
}

// 扫码成功
function onScanSuccess(result: string) {
  showScanner.value = false
  // 尝试解析二维码内容
  // 格式可能是: phone=xxx 或 no=xxx 或纯数字（提货码）
  if (result.includes('phone=')) {
    const phone = result.split('phone=')[1]?.split('&')[0]
    if (phone) {
      phoneInput.value = phone
      activeMethod.value = 'phone'
      handleSearchByPhone()
    }
  } else if (result.includes('no=')) {
    const no = result.split('no=')[1]?.split('&')[0]
    if (no) {
      reservationNoInput.value = no
      activeMethod.value = 'no'
      handleSearchByNo()
    }
  } else if (/^\d{8}$/.test(result)) {
    // 8位纯数字，可能是提货码
    pickupCodeInput.value = result
    activeMethod.value = 'code'
    handleSearchByCode()
  } else if (/^1\d{10}$/.test(result)) {
    // 11位手机号
    phoneInput.value = result
    activeMethod.value = 'phone'
    handleSearchByPhone()
  } else {
    Toast({ message: '无法识别的二维码内容', theme: 'warning' })
  }
}

// 确认核销
async function handleComplete() {
  if (!reservation.value) return

  // 大额确认
  if (reservation.value.totalAmount >= 500) {
    try {
      await Dialog.confirm({
        title: '收款确认',
        content: `确认已收到客户付款 ¥${reservation.value.totalAmount.toFixed(2)}？`,
        confirmBtn: { content: '确认收款', theme: 'danger' }
      })
    } catch {
      return
    }
  }

  completing.value = true
  try {
    const result = await completePickup({
      reservationId: reservation.value.id,
      paymentMethod: paymentMethod.value,
      deliverGift: deliverGift.value
    })
    completeResult.value = result
    showSuccessDialog.value = true
    // 刷新统计
    loadStats()
  } catch (e: any) {
    Toast({ message: e.message || '核销失败', theme: 'error' })
  } finally {
    completing.value = false
  }
}

// 核销成功确认
function onSuccessConfirm() {
  showSuccessDialog.value = false
  reservation.value = null
  phoneInput.value = ''
  reservationNoInput.value = ''
  pickupCodeInput.value = ''
  completeResult.value = null
}

// 初始化
onMounted(async () => {
  // 加载统计
  await loadStats()

  // 处理路由参数
  const { phone, code, no } = route.query
  if (code && typeof code === 'string') {
    pickupCodeInput.value = code
    activeMethod.value = 'code'
    handleSearchByCode()
  } else if (no && typeof no === 'string') {
    reservationNoInput.value = no
    activeMethod.value = 'no'
    handleSearchByNo()
  } else if (phone && typeof phone === 'string') {
    phoneInput.value = phone
    activeMethod.value = 'phone'
    handleSearchByPhone()
  }
})
</script>

<style scoped>
.pickup-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 40px;
}

/* 扫码区域 */
.scan-section {
  background: linear-gradient(135deg, #1976D2 0%, #0D47A1 100%);
  padding: 20px 16px;
}

.scan-section :deep(.t-button) {
  background-color: white;
  color: #1976D2;
  font-size: 16px;
  font-weight: 600;
  height: 50px;
  border-radius: 10px;
}

.scan-tip {
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 12px;
}

/* 统计区域 */
.stats-section {
  display: flex;
  background: white;
  padding: 16px;
  margin: 12px;
  border-radius: 12px;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #1976D2;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 查询区域 */
.search-section {
  background: white;
  margin: 0 12px 12px;
  padding: 16px;
  border-radius: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
}

.method-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.method-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.method-tab.active {
  background: #E3F2FD;
  color: #1976D2;
}

.search-input {
  display: flex;
  gap: 12px;
}

.search-input :deep(.t-input) {
  flex: 1;
}

/* 结果区域 */
.result-section {
  background: white;
  margin: 0 12px 12px;
  padding: 16px;
  border-radius: 12px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
  margin-bottom: 12px;
}

.reservation-no {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.info-row .label {
  color: #999;
  font-size: 14px;
}

.info-row .value {
  color: #333;
  font-size: 14px;
}

.info-row.total {
  border-top: 1px solid #eee;
  margin-top: 8px;
  padding-top: 12px;
}

.info-row .amount {
  color: #EF062D;
  font-size: 20px;
  font-weight: bold;
}

/* 商品列表 */
.items-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.items-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
}

.item-name {
  color: #666;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-info {
  color: #333;
  margin-left: 12px;
}

/* 支付方式 */
.payment-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.section-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
}

.payment-options {
  display: flex;
  gap: 12px;
}

.payment-option {
  flex: 1;
  text-align: center;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 14px;
  color: #666;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.payment-option.active {
  background: #E8F5E9;
  color: #4CAF50;
  border-color: #4CAF50;
}

/* 赠品 */
.gift-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.gift-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 成功弹窗 */
.success-content {
  text-align: center;
  padding: 20px 0;
}

.success-amount {
  font-size: 32px;
  font-weight: bold;
  color: #4CAF50;
  margin: 16px 0 8px;
}

.success-info {
  font-size: 14px;
  color: #666;
}

/* 核销按钮 */
.result-section :deep(.t-button--danger) {
  margin-top: 20px;
  height: 48px;
  font-size: 16px;
}
</style>
