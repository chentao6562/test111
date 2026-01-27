<template>
  <div class="order-receipt" id="order-receipt">
    <!-- 店名 -->
    <div class="receipt-header">
      <div class="store-name">蒙庆烟花</div>
    </div>

    <div class="divider"></div>

    <!-- 订单基本信息 -->
    <div class="receipt-section">
      <div class="receipt-row">
        <span class="label">订单号:</span>
        <span class="value">{{ order.orderNo }}</span>
      </div>
      <div class="receipt-row">
        <span class="label">下单时间:</span>
        <span class="value">{{ formatTime(order.createdAt) }}</span>
      </div>
    </div>

    <div class="divider"></div>

    <!-- 客户信息 -->
    <div class="receipt-section">
      <div class="receipt-row">
        <span class="label">客户:</span>
        <span class="value">{{ order.agentName }}</span>
      </div>
      <div class="receipt-row">
        <span class="label">电话:</span>
        <span class="value">{{ maskPhone(order.agentPhone) }}</span>
      </div>
    </div>

    <div class="divider"></div>

    <!-- 商品清单 -->
    <div class="receipt-section">
      <div class="section-title">【商品清单】</div>
      <div
        v-for="(item, index) in order.items"
        :key="item.id"
        class="product-item"
      >
        <span class="product-index">{{ index + 1 }}.</span>
        <span class="product-name">{{ truncateName(item.productName) }}</span>
        <span class="product-qty">x{{ item.quantity }}</span>
      </div>
    </div>

    <div class="divider"></div>

    <!-- 金额信息 -->
    <div class="receipt-section">
      <div class="receipt-row">
        <span class="label">商品金额:</span>
        <span class="value">¥{{ formatAmount(productAmount) }}</span>
      </div>
      <div v-if="order.needTransfer && (order.transferFee || 0) > 0" class="receipt-row">
        <span class="label">移库费:</span>
        <span class="value">¥{{ formatAmount(order.transferFee || 0) }}</span>
      </div>
    </div>

    <div class="divider thick"></div>

    <!-- 订单总额和支付状态 -->
    <div class="receipt-section">
      <div class="receipt-row total">
        <span class="label">订单总额:</span>
        <span class="value bold">¥{{ formatAmount(order.totalAmount) }}</span>
      </div>
      <div class="receipt-row">
        <span class="label">支付状态:</span>
        <span class="value" :class="order.fullPaid ? 'paid' : 'unpaid'">
          {{ order.fullPaid ? '已付款' : '未付款' }}
        </span>
      </div>
    </div>

    <div class="divider thick"></div>

    <!-- 提货码/移库码 -->
    <div class="receipt-section code-section">
      <template v-if="order.needTransfer && order.transferCode">
        <div class="code-label">移库码</div>
        <div class="code-value">{{ order.transferCode }}</div>
      </template>
      <template v-else-if="order.pickupCode">
        <div class="code-label">提货码</div>
        <div class="code-value">{{ order.pickupCode }}</div>
      </template>
      <template v-else>
        <div class="code-label">提货码</div>
        <div class="code-value pending">待生成</div>
      </template>
    </div>

    <div class="divider"></div>

    <!-- 底部提示 -->
    <div class="receipt-footer">
      <div class="footer-text">请核对商品后签收</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface OrderItem {
  id: string
  productName: string
  quantity: number
  price: number
}

interface Order {
  orderNo: string
  createdAt: string
  agentName: string
  agentPhone: string
  items: OrderItem[]
  totalAmount: number
  transferFee?: number
  needTransfer?: boolean
  fullPaid: boolean
  pickupCode?: string
  transferCode?: string
}

const props = defineProps<{
  order: Order
}>()

// 计算商品金额
const productAmount = computed(() => {
  if (!props.order?.items) return 0
  return props.order.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity)
  }, 0)
})

// 格式化时间
function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 隐藏电话中间4位
function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

// 金额格式化
function formatAmount(amount: number | string | undefined): string {
  if (amount === undefined || amount === null) return '0.00'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return num.toFixed(2)
}

// 截断商品名称（超过12个字符显示...）
function truncateName(name: string): string {
  if (!name) return ''
  if (name.length > 12) {
    return name.slice(0, 12) + '...'
  }
  return name
}
</script>

<style scoped>
.order-receipt {
  width: 58mm;
  padding: 3mm;
  background: #fff;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: #000;
  box-sizing: border-box;
}

.receipt-header {
  text-align: center;
  padding: 2mm 0;
}

.store-name {
  font-size: 16px;
  font-weight: bold;
}

.divider {
  border-top: 1px dashed #000;
  margin: 2mm 0;
}

.divider.thick {
  border-top: 2px solid #000;
}

.receipt-section {
  padding: 1mm 0;
}

.section-title {
  font-weight: bold;
  margin-bottom: 1mm;
}

.receipt-row {
  display: flex;
  justify-content: space-between;
  margin: 1mm 0;
}

.receipt-row .label {
  color: #333;
}

.receipt-row .value {
  font-weight: 500;
}

.receipt-row .value.bold {
  font-weight: bold;
  font-size: 14px;
}

.receipt-row .value.paid {
  color: #10b981;
}

.receipt-row .value.unpaid {
  color: #ef4444;
}

.receipt-row.total {
  font-size: 14px;
}

.product-item {
  display: flex;
  align-items: baseline;
  margin: 1mm 0;
  font-size: 11px;
}

.product-index {
  width: 15px;
  flex-shrink: 0;
}

.product-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-qty {
  flex-shrink: 0;
  margin-left: 5px;
  font-weight: bold;
}

.code-section {
  text-align: center;
  padding: 3mm 0;
}

.code-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 1mm;
}

.code-value {
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 3px;
}

.code-value.pending {
  font-size: 14px;
  color: #999;
  letter-spacing: 0;
}

.receipt-footer {
  text-align: center;
  padding: 2mm 0;
}

.footer-text {
  font-size: 11px;
  color: #666;
}
</style>
