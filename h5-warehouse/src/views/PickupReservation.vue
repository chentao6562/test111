<template>
  <div class="pickup-reservation-page">
    <!-- 【2026-01-20】扫码核销区域 - 置顶显示 -->
    <div class="scan-section">
      <t-button theme="primary" size="large" block :loading="scanning" @click="handleScanQRCode">
        <t-icon name="scan" size="24px" />
        扫码核销
      </t-button>
      <div class="scan-tip">让客户出示预约详情页的二维码</div>
    </div>

    <!-- 其他查询方式 -->
    <div class="search-section">
      <div class="section-title">其他查询方式</div>

      <!-- 【2026-01-20】简化Tab - 移除扫码Tab -->
      <div class="method-tabs">
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
          :class="{ active: activeMethod === 'phone' }"
          @click="activeMethod = 'phone'"
        >
          <t-icon name="call" size="18px" />
          <span>手机号</span>
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

      <div class="search-methods">
        <!-- 提货码搜索（仅限状态9-待提货的预约） -->
        <div v-if="activeMethod === 'code'" class="search-method">
          <div class="method-label">
            <t-icon name="qrcode" size="16px" />
            请输入8位提货码
          </div>
          <div class="input-group">
            <t-input
              v-model="pickupCodeInput"
              placeholder="请输入8位数字提货码"
              maxlength="8"
              type="tel"
              clearable
              @keyup.enter="handleSearchByCode"
            />
            <t-button theme="primary" :loading="searchingCode" @click="handleSearchByCode">
              核销
            </t-button>
          </div>
          <div class="method-tip warning">
            <t-icon name="info-circle" size="14px" />
            提货码仅在备货完成后生成，大部分预约请使用扫码或预约号查询
          </div>
        </div>

        <!-- 手机号搜索 -->
        <div v-if="activeMethod === 'phone'" class="search-method">
          <div class="method-label">
            <t-icon name="call" size="16px" />
            请输入客户手机号
          </div>
          <div class="input-group">
            <t-input
              v-model="phoneInput"
              placeholder="请输入客户手机号"
              type="tel"
              maxlength="11"
              clearable
              @keyup.enter="handleSearchByPhone"
            />
            <t-button theme="primary" :loading="searchingPhone" @click="handleSearchByPhone">
              查询
            </t-button>
          </div>
          <div class="method-tip">查询该手机号下的待核销预约</div>
        </div>

        <!-- 预约号搜索（推荐方式） -->
        <div v-if="activeMethod === 'no'" class="search-method">
          <div class="method-label">
            <t-icon name="file" size="16px" />
            请输入预约号
          </div>
          <div class="input-group">
            <t-input
              v-model="reservationNoInput"
              placeholder="MQ开头，如MQ2026011800001"
              clearable
              @keyup.enter="handleSearchByNo"
            />
            <t-button theme="primary" :loading="searchingNo" @click="handleSearchByNo">
              查询
            </t-button>
          </div>
          <div class="method-tip">
            <t-icon name="lightbulb" size="14px" />
            预约号在客户二维码下方显示，支持所有已确认预约
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="foundReservation" class="result-section">
      <!-- 预约信息卡片 -->
      <div class="reservation-card">
        <div class="card-header">
          <span class="reservation-no">{{ foundReservation.reservationNo }}</span>
          <t-tag theme="success" size="small">待核销</t-tag>
        </div>

        <div class="card-body">
          <div class="info-row">
            <span class="label">客户姓名</span>
            <span class="value">{{ foundReservation.customerName }}</span>
          </div>
          <div class="info-row">
            <span class="label">联系电话</span>
            <span class="value phone" @click="callCustomer">
              {{ foundReservation.customerPhone }}
              <t-icon name="call" size="14px" />
            </span>
          </div>
          <div class="info-row">
            <span class="label">提货日期</span>
            <span class="value">{{ formatDate(foundReservation.pickupDate) }}</span>
          </div>
          <div class="info-row total">
            <span class="label">应收金额</span>
            <span class="value amount">{{ formatPrice(foundReservation.totalAmount) }}</span>
          </div>
        </div>

        <!-- 商品列表 -->
        <div class="items-section">
          <div class="items-title">预约商品（{{ foundReservation.items?.length || 0 }}件）</div>
          <div
            v-for="item in foundReservation.items"
            :key="item.productId"
            class="item-row"
          >
            <div class="item-info">
              <span class="item-name">{{ item.productName }}</span>
              <span class="item-spec">{{ formatPrice(item.price) }} x {{ item.quantity }}</span>
            </div>
            <span class="item-subtotal">{{ formatPrice(item.subtotal || item.price * item.quantity) }}</span>
          </div>
        </div>

        <!-- 赠品信息 -->
        <div v-if="foundReservation.giftName" class="gift-section">
          <div class="gift-title">
            <t-icon name="gift" size="16px" />
            预约赠品
          </div>
          <div class="gift-content">
            <span class="gift-name">{{ foundReservation.giftName }}</span>
            <t-checkbox v-model="deliverGift">发放赠品</t-checkbox>
          </div>
        </div>

        <!-- 支付方式 -->
        <div class="payment-section">
          <div class="payment-title">支付方式</div>
          <t-radio-group v-model="paymentMethod" class="payment-options">
            <t-radio value="cash">
              <div class="payment-option">
                <span class="option-icon">💵</span>
                <span>现金</span>
              </div>
            </t-radio>
            <t-radio value="wechat">
              <div class="payment-option">
                <span class="option-icon">💚</span>
                <span>微信</span>
              </div>
            </t-radio>
            <t-radio value="alipay">
              <div class="payment-option">
                <span class="option-icon">💙</span>
                <span>支付宝</span>
              </div>
            </t-radio>
          </t-radio-group>
        </div>

        <!-- 【2026-01-21】代金券抵扣 -->
        <div v-if="availableCoupons.length > 0" class="coupon-section">
          <div class="coupon-title">
            <t-icon name="discount" size="16px" />
            推销员代金券
            <span class="coupon-count">（可用{{ availableCoupons.length }}张）</span>
          </div>
          <div class="coupon-list">
            <label
              v-for="coupon in availableCoupons"
              :key="coupon.id"
              class="coupon-item"
              :class="{ selected: selectedCouponIds.includes(coupon.id) }"
            >
              <t-checkbox
                :checked="selectedCouponIds.includes(coupon.id)"
                @change="(val: boolean) => toggleCoupon(coupon.id, val)"
              />
              <div class="coupon-info">
                <span class="coupon-amount">¥{{ coupon.amount }}</span>
                <span class="coupon-desc">{{ coupon.sourceDesc }}</span>
              </div>
            </label>
          </div>
          <div v-if="couponDeduction > 0" class="coupon-summary">
            已选抵扣: <span class="deduction-amount">-¥{{ couponDeduction.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- 核销按钮 -->
      <div class="action-section">
        <t-button
          theme="primary"
          size="large"
          block
          :loading="completing"
          @click="handleComplete"
        >
          确认收款并核销
        </t-button>
        <div class="action-tip">
          请确认已收到客户付款 {{ formatPrice(actualPayment) }}
          <span v-if="couponDeduction > 0" class="deduction-tip">
            （原价{{ formatPrice(foundReservation.totalAmount) }}，券抵¥{{ couponDeduction.toFixed(2) }}）
          </span>
        </div>
      </div>
    </div>

    <!-- 多预约提示 -->
    <div v-if="pendingCount && pendingCount > 1" class="pending-tip">
      <t-icon name="info-circle" size="14px" />
      该客户还有{{ pendingCount - 1 }}个待核销预约
    </div>

    <!-- 今日核销统计 -->
    <div class="stats-section">
      <div class="stats-header">
        <span class="stats-title">今日核销统计</span>
        <span class="stats-refresh" @click="loadTodayStats">
          <t-icon name="refresh" size="14px" />
        </span>
      </div>
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">{{ todayStats.completedCount }}</span>
          <span class="stat-label">核销单数</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ formatAmount(todayStats.completedAmount) }}</span>
          <span class="stat-label">核销金额</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ todayStats.pendingCount }}</span>
          <span class="stat-label">待核销</span>
        </div>
      </div>
    </div>

    <!-- H5扫码组件 -->
    <QRScanner v-model="showScanner" @success="handleScanSuccess" />

    <!-- 核销成功弹窗 - 【2026-01-19】添加打印小票功能 -->
    <t-dialog
      v-model:visible="showSuccessDialog"
      title="核销成功"
      :confirm-btn="null"
      :cancel-btn="null"
    >
      <div class="success-dialog">
        <div class="success-icon">✅</div>
        <div class="success-info">
          <div class="info-item">
            <span class="label">预约号：</span>
            <span class="value">{{ completeResult?.reservationNo }}</span>
          </div>
          <div class="info-item">
            <span class="label">订单金额：</span>
            <span class="value">{{ formatPrice(completeResult?.totalAmount || 0) }}</span>
          </div>
          <div v-if="completeResult?.couponDeduction" class="info-item">
            <span class="label">代金券抵扣：</span>
            <span class="value coupon">-{{ formatPrice(completeResult.couponDeduction) }}</span>
          </div>
          <div class="info-item">
            <span class="label">实付金额：</span>
            <span class="value amount">{{ formatPrice(completeResult?.actualPayment ?? completeResult?.totalAmount ?? 0) }}</span>
          </div>
          <div class="info-item">
            <span class="label">支付方式：</span>
            <span class="value">{{ getPaymentLabel(completeResult?.paymentMethod || '') }}</span>
          </div>
          <div v-if="completeResult?.giftDelivered" class="info-item">
            <span class="label">赠品：</span>
            <span class="value">{{ completeResult?.giftName }} ✓</span>
          </div>
        </div>
        <div v-if="completeResult?.profitSettled" class="profit-info">
          <t-icon name="check-circle" size="14px" />
          利润已即时结算
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <t-button theme="default" size="small" variant="outline" @click="showPrinterSetup = true">
            <t-icon name="setting" size="16px" />
          </t-button>
          <t-button theme="default" size="medium" :loading="isPrinting" @click="handlePrint">
            打印小票
          </t-button>
          <t-button theme="primary" size="medium" @click="onSuccessConfirm">完成</t-button>
        </div>
      </template>
    </t-dialog>

    <!-- 【2026-01-28】打印机设置弹窗 -->
    <PrinterSetup v-model="showPrinterSetup" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import {
  searchByPhone,
  searchByReservationNo,
  verifyByPickupCode,
  completePickup,
  getTodayPickupStats,
  getReservationCoupons,
  type Reservation,
  type CompletePickupResult,
  type CouponInfo
} from '@/api/reservation'
import { formatPrice, formatDate, formatAmount } from '@/utils/format'
import { vibrate } from '@/utils/bridge'
import { memoryCache } from '@/utils/performance'
import QRScanner from '@/components/QRScanner.vue'
import PrinterSetup from '@/components/PrinterSetup.vue'
import { BluetoothPrinterService, printerService, ReceiptBuilder } from '@/services/bluetoothPrinter'
import type { ReceiptData, PrintConfig } from '@/services/bluetoothPrinter'
import { getPrintConfig } from '@/api/settings'

const route = useRoute()
const router = useRouter()

// 【2026-01-17 优化】检测微信环境
const isWechat = /MicroMessenger/i.test(navigator.userAgent)
// 【2026-01-20 优化】扫码独立置顶，Tab默认预约号
const activeMethod = ref<'code' | 'phone' | 'no'>('no')
// 【2026-01-17】H5扫码组件显示状态
const showScanner = ref(false)

// 搜索状态
const pickupCodeInput = ref('')
const phoneInput = ref('')
const reservationNoInput = ref('')
const searchingCode = ref(false)
const searchingPhone = ref(false)
const searchingNo = ref(false)
const scanning = ref(false)  // 【2026-01-17】扫码状态

// 预约信息
const foundReservation = ref<Reservation | null>(null)
const pendingCount = ref<number | undefined>()

// 核销操作
const paymentMethod = ref<'cash' | 'wechat' | 'alipay'>('cash')
const deliverGift = ref(true)
const completing = ref(false)
const showSuccessDialog = ref(false)
const completeResult = ref<CompletePickupResult | null>(null)

// 今日统计
const todayStats = ref({
  completedCount: 0,
  completedAmount: 0,
  pendingCount: 0
})

// 【2026-01-21】代金券相关
const availableCoupons = ref<CouponInfo[]>([])
const selectedCouponIds = ref<number[]>([])

// 【2026-01-28】蓝牙打印相关
const showPrinterSetup = ref(false)
const isPrinting = ref(false)
const printConfig = ref<PrintConfig | null>(null)

// 计算代金券抵扣金额
const couponDeduction = computed(() => {
  return availableCoupons.value
    .filter(c => selectedCouponIds.value.includes(c.id))
    .reduce((sum, c) => sum + c.amount, 0)
})

// 计算实付金额
const actualPayment = computed(() => {
  if (!foundReservation.value) return 0
  return Math.max(0, foundReservation.value.totalAmount - couponDeduction.value)
})

onMounted(async () => {
  loadTodayStats()

  // 【2026-01-28】获取打印配置
  try {
    printConfig.value = await getPrintConfig()
  } catch (error) {
    console.warn('获取打印配置失败，使用默认配置:', error)
  }

  // 处理路由参数
  const { phone, code } = route.query
  if (code && typeof code === 'string') {
    // 优先处理提货码
    pickupCodeInput.value = code
    handleSearchByCode()
  } else if (phone && typeof phone === 'string') {
    phoneInput.value = phone
    handleSearchByPhone()
  }
})

// 加载今日统计
// 【2026-01-20修复】增强错误处理，失败时保持默认值
async function loadTodayStats() {
  try {
    const stats = await getTodayPickupStats()
    if (stats) {
      todayStats.value = {
        completedCount: stats.completedCount || 0,
        completedAmount: stats.completedAmount || 0,
        pendingCount: stats.pendingCount || 0
      }
    }
  } catch (error) {
    console.error('加载统计失败:', error)
    // 失败时保持默认值，不影响页面其他功能
  }
}

// 【2026-01-17 小程序码核销】扫描二维码
async function handleScanQRCode() {
  foundReservation.value = null

  if (isWechat && window.wx) {
    // 微信环境使用JSSDK扫码
    scanning.value = true
    try {
      const scanResult = await scanQRCodeWechat()
      if (scanResult) {
        await processScanResult(scanResult)
      }
    } catch (error: any) {
      if (error.message !== 'cancel') {
        Toast({ message: error.message || '扫码失败', theme: 'error' })
      }
    } finally {
      scanning.value = false
    }
  } else {
    // 非微信环境：使用H5扫码组件
    showScanner.value = true
  }
}

// 微信扫码
async function scanQRCodeWechat(): Promise<string> {
  const wx = window.wx as any
  return new Promise((resolve, reject) => {
    wx?.scanQRCode({
      needResult: 1,
      scanType: ['qrCode', 'barCode'],
      success: (res: any) => {
        resolve(res.resultStr)
      },
      fail: (err: any) => {
        reject(new Error(err.errMsg || '扫码失败'))
      },
      cancel: () => {
        reject(new Error('cancel'))
      }
    })
  })
}

// H5扫码成功回调
async function handleScanSuccess(result: string) {
  showScanner.value = false
  await processScanResult(result)
}

// 处理扫码结果
async function processScanResult(scanResult: string) {
  if (!scanResult) {
    Toast({ message: '未获取到扫码结果', theme: 'warning' })
    return
  }

  // 解析二维码内容，格式为 "MQYH:预约号"
  let reservationNo = ''
  if (scanResult.startsWith('MQYH:')) {
    reservationNo = scanResult.substring(5)
  } else if (scanResult.startsWith('MQ')) {
    // 兼容直接扫预约号的情况
    reservationNo = scanResult
  } else if (/^\d{8}$/.test(scanResult)) {
    // 8位数字可能是提货码
    pickupCodeInput.value = scanResult
    activeMethod.value = 'code'
    await handleSearchByCode()
    vibrate(200)
    return
  } else {
    Toast({ message: '无效的二维码，请扫描客户预约码', theme: 'warning' })
    return
  }

  // 使用预约号查询
  reservationNoInput.value = reservationNo
  await handleSearchByNo()
  vibrate(200)
}

// 提货码核销
async function handleSearchByCode() {
  if (!pickupCodeInput.value || pickupCodeInput.value.length !== 8) {
    Toast({ message: '请输入8位提货码', theme: 'warning' })
    return
  }

  searchingCode.value = true
  foundReservation.value = null
  availableCoupons.value = []  // 【2026-01-21】清空代金券
  selectedCouponIds.value = []

  try {
    // 注意：request拦截器成功时直接返回预约对象
    const result = await verifyByPickupCode(pickupCodeInput.value)
    if (result && result.id) {
      foundReservation.value = result
      pendingCount.value = undefined
      vibrate(200)
      // 【2026-01-21】加载推销员代金券
      loadCoupons(result.id)
    } else {
      Toast({ message: '提货码无效', theme: 'warning' })
    }
  } catch (error: any) {
    console.error('提货码验证失败:', error)
    // 错误已被request拦截器显示Toast
  } finally {
    searchingCode.value = false
  }
}

// 手机号查询
async function handleSearchByPhone() {
  if (!phoneInput.value || phoneInput.value.length !== 11) {
    Toast({ message: '请输入11位手机号', theme: 'warning' })
    return
  }

  searchingPhone.value = true
  foundReservation.value = null
  availableCoupons.value = []  // 【2026-01-21】清空代金券
  selectedCouponIds.value = []

  try {
    // 注意：request拦截器成功时直接返回预约对象
    const result = await searchByPhone(phoneInput.value)
    if (result && result.id) {
      foundReservation.value = result
      pendingCount.value = result.pendingCount
      vibrate(200)
      // 【2026-01-21】加载推销员代金券
      loadCoupons(result.id)
    } else {
      Toast({ message: '未找到预约', theme: 'warning' })
    }
  } catch (error) {
    console.error('查询失败:', error)
    // 错误已被request拦截器显示Toast
  } finally {
    searchingPhone.value = false
  }
}

// 预约号查询
async function handleSearchByNo() {
  if (!reservationNoInput.value) {
    Toast({ message: '请输入预约号', theme: 'warning' })
    return
  }

  searchingNo.value = true
  foundReservation.value = null
  availableCoupons.value = []  // 【2026-01-21】清空代金券
  selectedCouponIds.value = []

  try {
    // 注意：request拦截器成功时直接返回预约对象
    const result = await searchByReservationNo(reservationNoInput.value)
    if (result && result.id) {
      foundReservation.value = result
      pendingCount.value = undefined
      vibrate(200)
      // 【2026-01-21】加载推销员代金券
      loadCoupons(result.id)
    } else {
      Toast({ message: '未找到预约', theme: 'warning' })
    }
  } catch (error) {
    console.error('查询失败:', error)
    // 错误已被request拦截器显示Toast
  } finally {
    searchingNo.value = false
  }
}

// 拨打电话
function callCustomer() {
  if (!foundReservation.value) return
  vibrate(150)
  window.location.href = `tel:${foundReservation.value.customerPhone}`
}

// 【2026-01-21】加载推销员可用代金券
async function loadCoupons(reservationId: number) {
  availableCoupons.value = []
  selectedCouponIds.value = []
  try {
    const coupons = await getReservationCoupons(reservationId)
    availableCoupons.value = coupons || []
  } catch (error) {
    console.error('加载代金券失败:', error)
    // 加载失败不影响核销流程
  }
}

// 【2026-01-21】切换代金券选择
function toggleCoupon(couponId: number, selected: boolean) {
  if (selected) {
    if (!selectedCouponIds.value.includes(couponId)) {
      selectedCouponIds.value.push(couponId)
    }
  } else {
    const index = selectedCouponIds.value.indexOf(couponId)
    if (index > -1) {
      selectedCouponIds.value.splice(index, 1)
    }
  }
}

// 获取支付方式标签
function getPaymentLabel(method: string): string {
  const labelMap: Record<string, string> = {
    cash: '现金',
    wechat: '微信支付',
    alipay: '支付宝'
  }
  return labelMap[method] || method
}

// 完成核销
async function handleComplete() {
  if (!foundReservation.value) return

  // 【2026-01-21】使用实付金额进行确认
  const payAmount = actualPayment.value

  // 大额确认
  if (payAmount >= 500) {
    try {
      const confirmMsg = couponDeduction.value > 0
        ? `原价 ${formatPrice(foundReservation.value.totalAmount)}，券抵 ¥${couponDeduction.value.toFixed(2)}，实付 ${formatPrice(payAmount)}，确认已收款？`
        : `确认已收到客户付款 ${formatPrice(payAmount)}？`
      await Dialog.confirm({
        title: '收款确认',
        content: confirmMsg,
        confirmBtn: { content: '确认收款', theme: 'danger' }
      })
    } catch {
      return
    }
  }

  completing.value = true
  try {
    const result = await completePickup({
      reservationId: foundReservation.value.id,
      paymentMethod: paymentMethod.value,
      deliverGift: deliverGift.value,
      couponIds: selectedCouponIds.value.length > 0 ? selectedCouponIds.value : undefined  // 【2026-01-21】
    })

    completeResult.value = result
    showSuccessDialog.value = true
    vibrate(200)

    // 【2026-01-19】清除工作台统计缓存，确保返回时数据刷新
    memoryCache.clear('workbench_stats')

    // 刷新统计
    loadTodayStats()
  } catch (error) {
    console.error('核销失败:', error)
  } finally {
    completing.value = false
  }
}

// 核销成功确认
function onSuccessConfirm() {
  showSuccessDialog.value = false
  foundReservation.value = null
  pickupCodeInput.value = ''
  phoneInput.value = ''
  reservationNoInput.value = ''
  completeResult.value = null
  // 【2026-01-21】清空代金券状态
  availableCoupons.value = []
  selectedCouponIds.value = []
}

// 【2026-01-28】解析套餐商品详情
interface PackageItem {
  productId: number
  productName: string
  quantity: number
  price?: number
}

function parsePackageItems(packageItemsJson: string | null): PackageItem[] {
  if (!packageItemsJson) return []
  try {
    const items = JSON.parse(packageItemsJson)
    return Array.isArray(items) ? items : []
  } catch (e) {
    console.error('解析套餐商品失败:', e)
    return []
  }
}

// 【2026-01-28】打印小票功能 - 支持蓝牙打印和HTML打印fallback
async function handlePrint() {
  if (!completeResult.value || !foundReservation.value) return

  // 使用后台配置，如果未获取到则使用默认值
  const config: PrintConfig = printConfig.value || {
    enablePrint: true,
    storeName: '蒙庆烟花',
    storePhone: '13190531439',
    storeAddress: '',
    footerText: '感谢光临，欢迎再来！',
    showQRCode: false,
    paperWidth: 58
  }

  // 检查是否启用打印
  if (!config.enablePrint) {
    Toast({ message: '打印功能已关闭', theme: 'warning' })
    return
  }

  isPrinting.value = true

  try {
    // 构造小票数据 - 【2026-01-28】套餐商品展开显示
    const printItems: { name: string; quantity: number; price: number; subtotal: number; isPackageHeader?: boolean }[] = []

    for (const item of (foundReservation.value.items || [])) {
      if (item.isPackage && item.packageItems) {
        // 套餐商品：先显示套餐名称作为标题，再展开内部商品
        printItems.push({
          name: `【${item.productName}】`,
          quantity: item.quantity,
          price: Number(item.price),
          subtotal: Number(item.price) * item.quantity,
          isPackageHeader: true
        })
        // 解析并添加套餐内的商品
        const pkgItems = parsePackageItems(item.packageItems)
        for (const pkg of pkgItems) {
          printItems.push({
            name: `  ${pkg.productName}`,
            quantity: pkg.quantity * item.quantity,  // 数量 = 套餐内数量 × 套餐数量
            price: pkg.price || 0,
            subtotal: 0  // 套餐内商品不显示小计
          })
        }
      } else {
        // 普通商品
        printItems.push({
          name: item.productName,
          quantity: item.quantity,
          price: Number(item.price),
          subtotal: Number(item.price) * item.quantity
        })
      }
    }

    const receiptData: ReceiptData = {
      storeName: config.storeName,
      storePhone: config.storePhone,
      reservationNo: completeResult.value.reservationNo,
      pickupCode: foundReservation.value.pickupCode,  // 【2026-01-28】提货码，用于双码核对
      customerName: foundReservation.value.customerName,
      customerPhone: foundReservation.value.customerPhone,
      items: printItems,
      totalAmount: completeResult.value.totalAmount,
      couponDeduction: completeResult.value.couponDeduction,
      actualPayment: completeResult.value.actualPayment ?? completeResult.value.totalAmount,
      paymentMethod: completeResult.value.paymentMethod,
      gift: completeResult.value.giftName ? {
        name: completeResult.value.giftName,
        delivered: completeResult.value.giftDelivered
      } : undefined,
      printTime: new Date()
    }

    // 检查蓝牙支持和连接状态
    const support = BluetoothPrinterService.checkSupport()
    if (support.supported && printerService.isConnected()) {
      // 使用蓝牙打印 - 传入配置
      const result = await printerService.print(receiptData, config)
      if (result.success) {
        Toast({ message: '打印成功', theme: 'success' })
        vibrate(100)
      } else {
        // 蓝牙打印失败，fallback到HTML打印
        console.warn('蓝牙打印失败，使用HTML打印:', result.error)
        printHTML(receiptData, config)
      }
    } else {
      // 蓝牙不可用或未连接，使用HTML打印
      printHTML(receiptData, config)
    }
  } catch (error) {
    console.error('打印失败:', error)
    Toast({ message: '打印失败', theme: 'error' })
  } finally {
    isPrinting.value = false
  }
}

// HTML打印（fallback方案）- 超紧凑版本适配58mm热敏打印机
function printHTML(data: ReceiptData, config: PrintConfig) {
  // 58mm纸实际打印宽度约48mm，80mm纸约72mm
  const printWidth = config.paperWidth === 80 ? '72mm' : '48mm'

  // 生成商品明细HTML - 【2026-01-28】支持套餐展开显示
  const itemsHtml = data.items.map((item: any) => {
    if (item.isPackageHeader) {
      // 套餐标题行：显示套餐名称和总价
      return `<div class="item pkg-header">${item.name} ¥${item.subtotal.toFixed(2)}</div>`
    } else if (item.subtotal === 0) {
      // 套餐内商品：只显示名称和数量，不显示价格
      return `<div class="item pkg-item">${item.name} x${item.quantity}</div>`
    } else {
      // 普通商品：显示名称、数量、价格
      return `<div class="item">${item.name} x${item.quantity} ¥${item.subtotal.toFixed(2)}</div>`
    }
  }).join('')

  // 赠品HTML
  const giftHtml = data.gift ? `<div class="row">赠品: ${data.gift.name} ${data.gift.delivered ? '[已发]' : '[待发]'}</div>` : ''

  // 代金券HTML
  const couponHtml = data.couponDeduction && data.couponDeduction > 0 ? `<div class="row">券抵: -¥${data.couponDeduction.toFixed(2)}</div>` : ''

  const printContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>小票</title>
<style>
@page{size:${printWidth} auto;margin:0;padding:0}
*{margin:0;padding:0;box-sizing:border-box;color:#000!important}
html{width:${printWidth};height:auto;margin:0;padding:0}
body{width:${printWidth};height:auto;margin:0;padding:2mm;font-family:'SimHei','Microsoft YaHei',sans-serif;font-size:12pt;line-height:1.4;color:#000;font-weight:bold}
.title{text-align:center;font-size:14pt;font-weight:bold;margin-bottom:1mm}
.sub{text-align:center;font-size:11pt;margin-bottom:1mm}
.line{border-bottom:1px dashed #000;margin:1.5mm 0}
.row{font-size:10pt;margin:0.5mm 0}
.item{font-size:10pt;margin:0.5mm 0}
.pkg-header{font-weight:bold;margin-top:1mm}
.pkg-item{font-size:9pt;color:#333!important;padding-left:2mm}
.total{font-size:12pt;font-weight:bold;text-align:right;margin:0.5mm 0}
.pickup-code{text-align:center;font-size:16pt;font-weight:bold;margin:2mm 0;letter-spacing:2px}
.ft{text-align:center;font-size:9pt;margin-top:0.5mm}
@media print{@page{margin:0}html,body{width:${printWidth}!important;height:auto!important}*{color:#000!important;-webkit-print-color-adjust:exact}}
</style>
</head>
<body>
<div class="title">${config.storeName}</div>
<div class="sub">提货凭证</div>
<div class="line"></div>
${data.pickupCode ? `<div class="pickup-code">提货码: ${data.pickupCode}</div><div class="line"></div>` : ''}
<div class="row">单号: ${data.reservationNo}</div>
<div class="row">客户: ${data.customerName}</div>
<div class="row">电话: ${maskPhone(data.customerPhone)}</div>
<div class="line"></div>
${itemsHtml}
<div class="line"></div>
${giftHtml}
<div class="row">金额: ¥${data.totalAmount.toFixed(2)}</div>
${couponHtml}
<div class="line"></div>
<div class="total">实付: ¥${data.actualPayment.toFixed(2)}</div>
<div class="line"></div>
<div class="row">支付: ${getPaymentLabel(data.paymentMethod)}</div>
<div class="ft">${formatDateTime(data.printTime)}</div>
<div class="ft">${config.footerText}</div>
</body>
</html>`

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(printContent)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 200)
  } else {
    Toast({ message: '无法打开打印窗口，请检查浏览器设置', theme: 'warning' })
  }
}

// 手机号脱敏
function maskPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 格式化日期时间
function formatDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}
</script>

<style scoped>
.pickup-reservation-page {
  min-height: 100vh;
  background-color: var(--bg-page);
  padding-bottom: 40px;
}

/* 【2026-01-20】扫码核销区域 - 置顶显示 */
.scan-section {
  background: linear-gradient(135deg, #1976D2 0%, #0D47A1 100%);
  padding: 20px 16px;
  margin-bottom: 12px;
}

.scan-section :deep(.t-button) {
  background-color: white;
  color: #1976D2;
  font-size: 16px;
  font-weight: 600;
  height: 50px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.scan-section :deep(.t-button:active) {
  transform: scale(0.98);
}

.scan-section :deep(.t-icon) {
  margin-right: 8px;
}

.scan-section .scan-tip {
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 12px;
}

.search-section {
  background-color: var(--bg-white);
  padding: 16px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 16px;
  color: var(--text-primary);
}

/* 【2026-01-17 优化】核销方式Tab切换 */
.method-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 4px;
  background-color: var(--bg-page);
  border-radius: 8px;
}

.method-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.method-tab.active {
  background-color: var(--bg-white);
  color: var(--primary);
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.search-methods {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-method {
  padding: 12px;
  background-color: var(--bg-page);
  border-radius: 8px;
}

.method-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-method.highlight {
  background-color: #e8f5e9;
  border: 1px solid #4CAF50;
}

.search-method.highlight .method-label {
  color: #2e7d32;
  font-weight: 500;
}

/* 【2026-01-17 小程序码核销】扫码按钮样式 */
.scan-method {
  padding: 16px;
}

.scan-btn-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scan-tip {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
}


/* 方法提示文字 */
.method-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.method-tip.warning {
  color: #FF9800;
  background-color: #FFF3E0;
  padding: 8px;
  border-radius: 4px;
}

.input-group {
  display: flex;
  gap: 8px;
}

.input-group :deep(.t-input) {
  flex: 1;
}

/* 【2026-01-17 优化】分隔线样式保留但不再使用 */
.divider {
  display: none;
}

.result-section {
  margin: 12px;
}

.reservation-card {
  background-color: var(--bg-white);
  border-radius: 8px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
}

.reservation-no {
  font-size: 16px;
  font-weight: bold;
}

.card-body {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.info-row .label {
  font-size: 14px;
  color: var(--text-secondary);
}

.info-row .value {
  font-size: 14px;
  color: var(--text-primary);
}

.info-row .value.phone {
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-row .value.amount {
  font-size: 20px;
  font-weight: bold;
  color: var(--primary);
}

.info-row.total {
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px dashed var(--border-color);
}

.items-section {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.items-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.item-info {
  flex: 1;
}

.item-name {
  font-size: 14px;
  color: var(--text-primary);
  display: block;
  margin-bottom: 2px;
}

.item-spec {
  font-size: 12px;
  color: var(--text-tertiary);
}

.item-subtotal {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.gift-section {
  padding: 16px;
  background-color: #fff8e1;
  border-bottom: 1px solid var(--border-color);
}

.gift-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #f57c00;
}

.gift-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gift-name {
  font-size: 15px;
  color: var(--text-primary);
}

.payment-section {
  padding: 16px;
}

.payment-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
}

.payment-options {
  display: flex;
  gap: 16px;
}

.payment-option {
  display: flex;
  align-items: center;
  gap: 4px;
}

.option-icon {
  font-size: 16px;
}

.action-section {
  margin-top: 16px;
}

.action-tip {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
}

.pending-tip {
  margin: 0 12px 12px;
  padding: 10px 12px;
  background-color: #e3f2fd;
  border-radius: 6px;
  font-size: 13px;
  color: #1976d2;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stats-section {
  margin: 12px;
  background-color: var(--bg-white);
  border-radius: 8px;
  padding: 16px;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.stats-title {
  font-size: 14px;
  font-weight: 500;
}

.stats-refresh {
  color: var(--text-tertiary);
  cursor: pointer;
}

.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: var(--primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.stat-divider {
  width: 1px;
  height: 30px;
  background-color: var(--border-color);
}

/* 成功弹窗 */
.success-dialog {
  text-align: center;
  padding: 16px 0;
}

.success-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.success-info {
  text-align: left;
  background-color: var(--bg-page);
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.success-info .info-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
}

.success-info .label {
  color: var(--text-secondary);
}

.success-info .value {
  color: var(--text-primary);
  font-weight: 500;
}

.success-info .value.amount {
  color: var(--primary);
}

.profit-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 13px;
  color: #4CAF50;
}

/* 【2026-01-19】弹窗底部按钮 */
.dialog-footer {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
}

.dialog-footer .t-button {
  flex: 1;
  max-width: 120px;
}

/* 【2026-01-28】打印机设置按钮 */
.dialog-footer .t-button:first-child {
  flex: 0 0 auto;
  width: 40px;
  max-width: 40px;
  padding: 0;
}

/* 【2026-01-21】代金券抵扣样式 */
.coupon-section {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  background-color: #fdf6ec;
}

.coupon-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #e6a23c;
}

.coupon-count {
  font-weight: normal;
  font-size: 12px;
  color: var(--text-secondary);
}

.coupon-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.coupon-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background-color: white;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.coupon-item.selected {
  background-color: #fff9f0;
  border-color: #e6a23c;
}

.coupon-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.coupon-amount {
  font-size: 16px;
  font-weight: bold;
  color: #e6a23c;
}

.coupon-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

.coupon-summary {
  margin-top: 12px;
  padding: 10px 12px;
  background-color: white;
  border-radius: 6px;
  font-size: 14px;
  text-align: right;
}

.deduction-amount {
  color: #e6a23c;
  font-weight: bold;
  font-size: 16px;
}

/* 核销成功弹窗中的代金券抵扣 */
.success-info .value.coupon {
  color: #e6a23c;
}

/* 实付金额提示中的代金券说明 */
.action-tip .deduction-tip {
  color: #e6a23c;
}
</style>
