<template>
  <div class="detail-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <t-loading size="40px" />
      <span>加载中...</span>
    </div>

    <!-- 详情内容 -->
    <template v-else-if="reservation">
      <!-- 状态卡片 -->
      <div class="status-card" :style="{ backgroundColor: StatusColors[reservation.status] }">
        <div class="status-icon">
          <t-icon :name="getStatusIcon(reservation.status)" size="32px" />
        </div>
        <div class="status-info">
          <div class="status-text">{{ StatusLabels[reservation.status] }}</div>
          <div class="status-desc">{{ getStatusDesc(reservation) }}</div>
        </div>
      </div>

      <!-- 客户信息 -->
      <div class="info-section">
        <div class="section-title">客户信息</div>
        <div class="info-card">
          <div class="info-row">
            <span class="label">客户姓名</span>
            <span class="value">{{ reservation.customerName }}</span>
          </div>
          <div class="info-row">
            <span class="label">联系电话</span>
            <span class="value phone" @click="callCustomer">
              {{ reservation.customerPhone }}
              <t-icon name="call" size="16px" />
            </span>
          </div>
          <div class="info-row">
            <span class="label">提货日期</span>
            <span class="value">{{ formatDate(reservation.pickupDate) }}</span>
          </div>
          <div class="info-row">
            <span class="label">预约时间</span>
            <span class="value">{{ formatDateTime(reservation.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- 确认信息 -->
      <div v-if="reservation.status >= 2" class="info-section">
        <div class="section-title">确认信息</div>
        <div class="info-card">
          <div class="info-row">
            <span class="label">拨打次数</span>
            <span class="value">{{ reservation.callCount }}次</span>
          </div>
          <div v-if="reservation.confirmedAt" class="info-row">
            <span class="label">确认时间</span>
            <span class="value">{{ formatDateTime(reservation.confirmedAt) }}</span>
          </div>
          <div v-if="reservation.status === 2 && reservation.expireAt" class="info-row">
            <span class="label">有效期至</span>
            <span class="value warning">{{ formatDateTime(reservation.expireAt) }}</span>
          </div>
        </div>
      </div>

      <!-- 核销信息 -->
      <div v-if="reservation.status === 3" class="info-section">
        <div class="section-title">核销信息</div>
        <div class="info-card">
          <div v-if="reservation.completedAt" class="info-row">
            <span class="label">核销时间</span>
            <span class="value">{{ formatDateTime(reservation.completedAt) }}</span>
          </div>
          <div v-if="reservation.paymentMethod" class="info-row">
            <span class="label">支付方式</span>
            <span class="value">{{ getPaymentLabel(reservation.paymentMethod) }}</span>
          </div>
          <div class="info-row">
            <span class="label">赠品发放</span>
            <span :class="['value', reservation.giftDelivered ? 'success' : 'warning']">
              {{ reservation.giftDelivered ? '已发放' : '未发放' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 商品列表 -->
      <div class="info-section">
        <div class="section-title">
          预约商品
          <span class="item-count">共{{ reservation.items?.length || 0 }}件</span>
        </div>
        <div class="items-card">
          <div
            v-for="item in reservation.items"
            :key="item.productId"
            class="item-row"
          >
            <img
              v-if="item.productImage"
              :src="getImageUrl(item.productImage)"
              class="item-image"
              alt=""
              @error="handleImageError"
            />
            <div v-else class="item-image placeholder">
              <t-icon name="image" size="20px" />
            </div>
            <div class="item-info">
              <div class="item-name">{{ item.productName }}</div>
              <div class="item-price">{{ formatPrice(item.price) }} x {{ item.quantity }}</div>
            </div>
            <div class="item-subtotal">{{ formatPrice(item.subtotal || item.price * item.quantity) }}</div>
          </div>
        </div>
      </div>

      <!-- 赠品信息 -->
      <div v-if="reservation.giftName" class="info-section">
        <div class="section-title">预约赠品</div>
        <div class="gift-card">
          <div class="gift-icon">🎁</div>
          <div class="gift-info">
            <div class="gift-name">{{ reservation.giftName }}</div>
            <div class="gift-status">
              <t-tag
                :theme="reservation.giftDelivered ? 'success' : 'warning'"
                size="small"
              >
                {{ reservation.giftDelivered ? '已发放' : '待发放' }}
              </t-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 金额汇总 -->
      <div class="info-section">
        <div class="section-title">金额信息</div>
        <div class="info-card">
          <div class="info-row total">
            <span class="label">预约金额</span>
            <span class="value amount">{{ formatPrice(reservation.totalAmount) }}</span>
          </div>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="bottom-actions">
        <!-- 【2026-01-28】打印按钮 - 所有非取消状态显示 -->
        <div v-if="![4, 5, 6].includes(reservation.status)" class="print-actions">
          <t-button theme="default" size="small" variant="outline" @click="showPrinterSetup = true">
            <t-icon name="setting" size="16px" />
          </t-button>
          <t-button theme="default" size="medium" :loading="isPrinting" @click="handlePrint">
            <t-icon name="print" size="16px" />
            打印小票
          </t-button>
        </div>

        <!-- 待确认/确认中状态 -->
        <template v-if="reservation.status === 0 || reservation.status === 1">
          <t-button theme="primary" size="large" block @click="goToConfirm">
            去电话确认
          </t-button>
        </template>

        <!-- 已确认状态 - 等待备货 -->
        <template v-else-if="reservation.status === 2">
          <div class="status-tip">
            <t-icon name="time" size="16px" />
            <span>已确认，等待备货（提货前一天系统自动提醒）</span>
          </div>
          <t-button theme="primary" size="large" block @click="goToPickup">
            直接核销
          </t-button>
        </template>

        <!-- 已完成状态 -->
        <template v-else-if="reservation.status === 3">
          <div class="status-tip success">
            <t-icon name="check-circle" size="16px" />
            <span>订单已完成</span>
          </div>
        </template>

        <!-- 待备货状态 -->
        <template v-else-if="reservation.status === 7">
          <t-button theme="primary" size="large" block @click="goToPrepare">
            开始备货
          </t-button>
        </template>

        <!-- 备货中状态 -->
        <template v-else-if="reservation.status === 8">
          <t-button theme="primary" size="large" block @click="goToPrepare">
            继续备货
          </t-button>
        </template>

        <!-- 待提货状态 -->
        <template v-else-if="reservation.status === 9">
          <t-button theme="primary" size="large" block @click="goToPickup">
            去核销
          </t-button>
        </template>
      </div>

      <!-- 【2026-01-28】打印机设置弹窗 -->
      <PrinterSetup v-model="showPrinterSetup" />
    </template>

    <!-- 空状态 -->
    <div v-else class="empty-container">
      <t-empty description="预约不存在" />
      <t-button theme="primary" @click="router.back()">返回</t-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import {
  getReservationDetail,
  StatusLabels,
  StatusColors,
  type Reservation
} from '@/api/reservation'
import { formatPrice, formatDate, formatDateTime, getImageUrl } from '@/utils/format'
import { vibrate } from '@/utils/bridge'
import PrinterSetup from '@/components/PrinterSetup.vue'
import { BluetoothPrinterService, printerService, ReceiptBuilder } from '@/services/bluetoothPrinter'
import type { ReceiptData, PrintConfig } from '@/services/bluetoothPrinter'
import { getPrintConfig } from '@/api/settings'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const reservation = ref<Reservation | null>(null)

// 【2026-01-28】打印相关状态
const showPrinterSetup = ref(false)
const isPrinting = ref(false)
const printConfig = ref<PrintConfig | null>(null)

onMounted(async () => {
  loadDetail()

  // 【2026-01-28】获取打印配置
  try {
    printConfig.value = await getPrintConfig()
  } catch (error) {
    console.warn('获取打印配置失败，使用默认配置:', error)
  }
})

// 【2026-01-20修复】增加数据容错和错误提示
async function loadDetail() {
  const id = Number(route.params.id)
  if (!id) {
    loading.value = false
    return
  }

  try {
    const data = await getReservationDetail(id)
    if (data) {
      // 数据规范化，确保必要字段存在
      reservation.value = {
        ...data,
        callCount: data.callCount ?? 0,
        items: data.items ?? [],
        totalAmount: data.totalAmount ?? 0,
      }
    }
  } catch (error) {
    console.error('加载详情失败:', error)
    Toast({ message: '加载预约详情失败', theme: 'error' })
  } finally {
    loading.value = false
  }
}

// 获取状态图标
function getStatusIcon(status: number): string {
  const iconMap: Record<number, string> = {
    0: 'time',
    1: 'call',
    2: 'check-circle',
    3: 'check-circle-filled',
    4: 'close-circle',
    5: 'error-circle',
    6: 'close-circle',
    7: 'time',              // 待备货
    8: 'tips',              // 备货中
    9: 'check-circle'       // 待提货
  }
  return iconMap[status] || 'info-circle'
}

// 获取状态描述
function getStatusDesc(r: Reservation): string {
  switch (r.status) {
    case 0:
      return '请尽快电话确认客户预约'
    case 1:
      return `已拨打${r.callCount}次，请继续联系`
    case 2:
      return '等待客户到店提货'
    case 3:
      return '客户已完成提货'
    case 4:
      return '预约已取消'
    case 5:
      return '预约已过期'
    case 6:
      return '电话无法接通'
    case 7:
      return '请尽快完成备货'
    case 8:
      return '备货进行中，请继续'
    case 9:
      return '已备货，等待客户提货'
    default:
      return ''
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

// 拨打电话
function callCustomer() {
  if (!reservation.value) return
  vibrate(150)
  window.location.href = `tel:${reservation.value.customerPhone}`
}

// 图片加载失败处理
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect fill="#f5f5f5" width="60" height="60"/><text x="50%" y="50%" fill="#999" font-size="10" text-anchor="middle" dy=".3em">无图</text></svg>')
  img.onerror = null
}

// 跳转确认页
function goToConfirm() {
  if (!reservation.value) return
  router.push(`/reservations/${reservation.value.id}/confirm`)
}

// 跳转核销页
function goToPickup() {
  if (!reservation.value) return
  router.push(`/pickup-reservation?phone=${reservation.value.customerPhone}`)
}

// 跳转备货页
function goToPrepare() {
  if (!reservation.value) return
  router.push(`/prepare/${reservation.value.id}`)
}

// 【2026-01-28】打印小票功能
async function handlePrint() {
  if (!reservation.value) return

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
    // 构造小票数据
    const receiptData: ReceiptData = {
      reservationNo: reservation.value.reservationNo || `MQ${reservation.value.id}`,
      customerName: reservation.value.customerName,
      customerPhone: reservation.value.customerPhone,
      items: (reservation.value.items || []).map(item => ({
        name: item.productName,
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: Number(item.subtotal || item.price * item.quantity)
      })),
      totalAmount: reservation.value.totalAmount,
      actualPayment: reservation.value.totalAmount,
      paymentMethod: reservation.value.paymentMethod || 'cash',
      gift: reservation.value.giftName ? {
        name: reservation.value.giftName,
        delivered: reservation.value.giftDelivered || false
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

// HTML打印（fallback方案）- 清晰版本适配58mm热敏打印机
function printHTML(data: ReceiptData, config: PrintConfig) {
  // 58mm纸实际打印宽度约48mm，80mm纸约72mm
  const printWidth = config.paperWidth === 80 ? '72mm' : '48mm'

  // 生成商品明细HTML
  const itemsHtml = data.items.map(item => {
    return `<div class="item">${item.name} x${item.quantity} ¥${item.subtotal.toFixed(2)}</div>`
  }).join('')

  // 赠品HTML
  const giftHtml = data.gift ? `<div class="row">赠品: ${data.gift.name} ${data.gift.delivered ? '[已发]' : '[待发]'}</div>` : ''

  const printContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>小票</title>
<style>
@page{size:${printWidth} auto;margin:0}
*{margin:0;padding:0;box-sizing:border-box;color:#000!important}
html,body{width:${printWidth};margin:0;padding:0}
body{font-family:'SimHei','Microsoft YaHei',sans-serif;padding:2mm;font-size:12pt;line-height:1.5;color:#000;font-weight:bold}
.title{text-align:center;font-size:14pt;font-weight:bold;margin-bottom:2mm}
.sub{text-align:center;font-size:11pt;margin-bottom:2mm}
.line{border-bottom:1px dashed #000;margin:2mm 0}
.row{font-size:10pt;margin:1mm 0}
.item{font-size:10pt;margin:1mm 0}
.total{font-size:12pt;font-weight:bold;text-align:right;margin:1mm 0}
.ft{text-align:center;font-size:9pt;margin-top:1mm}
@media print{html,body{width:${printWidth}!important}*{color:#000!important;-webkit-print-color-adjust:exact}}
</style>
</head>
<body>
<div class="title">${config.storeName}</div>
<div class="sub">预约凭证</div>
<div class="line"></div>
<div class="row">单号: ${data.reservationNo}</div>
<div class="row">客户: ${data.customerName}</div>
<div class="row">电话: ${maskPhone(data.customerPhone)}</div>
<div class="line"></div>
${itemsHtml}
${giftHtml}
<div class="line"></div>
<div class="total">合计: ¥${data.totalAmount.toFixed(2)}</div>
<div class="line"></div>
<div class="ft">${formatPrintDateTime(data.printTime)}</div>
<div class="ft">${config.footerText}</div>
<div class="ft">${config.storePhone}</div>
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

// 格式化打印日期时间
function formatPrintDateTime(date: Date): string {
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
.detail-page {
  min-height: 100vh;
  background-color: var(--bg-page);
  padding-bottom: 160px; /* 增加以适应打印按钮 */
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  gap: 16px;
  color: var(--text-tertiary);
}

.status-card {
  display: flex;
  align-items: center;
  padding: 20px 16px;
  color: white;
}

.status-icon {
  width: 48px;
  height: 48px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.status-info {
  flex: 1;
}

.status-text {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 4px;
}

.status-desc {
  font-size: 13px;
  opacity: 0.9;
}

.info-section {
  margin: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-count {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: normal;
}

.info-card {
  background-color: var(--bg-white);
  border-radius: 8px;
  padding: 12px 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color);
}

.info-row:last-child {
  border-bottom: none;
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
  color: var(--primary);
  font-size: 16px;
  font-weight: bold;
}

.info-row .value.success {
  color: #4CAF50;
}

.info-row .value.warning {
  color: #FF9800;
}

.info-row.total {
  padding: 12px 0;
}

.items-card {
  background-color: var(--bg-white);
  border-radius: 8px;
  padding: 8px 16px;
}

.item-row {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.item-row:last-child {
  border-bottom: none;
}

.item-image {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  object-fit: cover;
  margin-right: 12px;
  flex-shrink: 0;
}

.item-image.placeholder {
  background-color: var(--bg-page);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-price {
  font-size: 12px;
  color: var(--text-tertiary);
}

.item-subtotal {
  font-size: 14px;
  color: var(--primary);
  font-weight: 500;
  margin-left: 12px;
  flex-shrink: 0;
}

.gift-card {
  background-color: var(--bg-white);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
}

.gift-icon {
  font-size: 32px;
  margin-right: 12px;
}

.gift-info {
  flex: 1;
}

.gift-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background-color: var(--bg-white);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.status-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 10px;
  padding: 8px;
  background-color: #fff8e6;
  border-radius: 4px;
}

.status-tip.success {
  background-color: #e8f5e9;
  color: #4CAF50;
}

/* 【2026-01-28】打印按钮区域 */
.print-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}

.print-actions .t-button:first-child {
  flex: 0 0 auto;
  width: 36px;
  padding: 0;
}

.print-actions .t-button:last-child {
  flex: 1;
}

.empty-container {
  padding: 100px 20px;
  text-align: center;
}

.empty-container .t-button {
  margin-top: 20px;
}
</style>
