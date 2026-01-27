<template>
  <div class="order-detail-page">
    <div v-if="loading" class="loading-container">
      <t-loading text="加载中..." />
    </div>

    <div v-else-if="!order" class="empty-container">
      <t-empty description="订单不存在" />
      <t-button theme="primary" size="medium" @click="handleBack">返回</t-button>
    </div>

    <template v-else>
      <!-- 订单状态 -->
      <div class="status-section">
        <t-tag :theme="statusTheme" size="large">
          {{ formatOrderStatus(order.status) }}
        </t-tag>
        <div class="status-time">{{ formatSmartTime(order.createdAt) }}</div>
      </div>

      <!-- 客户信息 -->
      <div class="section">
        <div class="section-title">客户信息</div>
        <div class="info-row">
          <span class="label">姓名:</span>
          <!-- 【2026-01-16修复】兼容 agentName 和 agent.name 两种格式 -->
          <span class="value">{{ order.agentName || order.agent?.name || '未知' }}</span>
        </div>
        <div class="info-row">
          <span class="label">电话:</span>
          <div class="value phone-row">
            <!-- 【2026-01-16修复】兼容 agentPhone 和 agent.phone 两种格式 -->
            <span>{{ order.agentPhone || order.agent?.phone || '未知' }}</span>
            <a :href="'tel:' + (order.agentPhone || order.agent?.phone)" class="call-btn" @click.stop>
              <t-icon name="call" size="18px" />
            </a>
          </div>
        </div>
      </div>

      <!-- 订单信息 -->
      <div class="section">
        <div class="section-title">订单信息</div>
        <div class="info-row">
          <span class="label">订单号:</span>
          <span class="value">{{ order.orderNo }}</span>
        </div>
        <div class="info-row">
          <span class="label">支付状态:</span>
          <t-tag :theme="order.fullPaid ? 'success' : 'default'" size="small">
            {{ order.fullPaid ? '已付款' : '未付款' }}
          </t-tag>
        </div>
        <div v-if="order.pickupCode" class="info-row">
          <span class="label">提货码:</span>
          <span class="value pickup-code">{{ order.pickupCode }}</span>
        </div>
        <div v-if="order.transferCode" class="info-row">
          <span class="label">移库码:</span>
          <span class="value pickup-code">{{ order.transferCode }}</span>
        </div>
      </div>

      <!-- 仓库信息【2026-01-13 多仓库支持】 -->
      <div v-if="order.warehouse" class="section">
        <div class="section-title">仓库信息</div>
        <div class="info-row">
          <span class="label">仓库名称:</span>
          <span class="value">{{ order.warehouse.name }}</span>
        </div>
        <div class="info-row">
          <span class="label">仓库地址:</span>
          <span class="value address-value">{{ order.warehouse.address }}</span>
        </div>
        <div class="info-row">
          <span class="label">联系电话:</span>
          <div class="value phone-row">
            <span>{{ order.warehouse.contactPhone }}</span>
            <a :href="'tel:' + order.warehouse.contactPhone" class="call-btn" @click.stop>
              <t-icon name="call" size="18px" />
            </a>
          </div>
        </div>
      </div>

      <!-- 备货进度（仅备货中状态显示） -->
      <div v-if="order.status === 'preparing'" class="section progress-section">
        <div class="section-header">
          <div class="section-title">备货进度</div>
          <div class="progress-text">{{ checkedCount }}/{{ totalCount }}</div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar" :style="{ width: progressPercent + '%' }" :class="progressLevel"></div>
        </div>
        <div class="progress-hint">点击商品可勾选已备货</div>
      </div>

      <!-- 商品清单 -->
      <div class="section">
        <div class="section-title">商品清单</div>
        <div
          v-for="(item, index) in checkedItems"
          :key="item.id"
          class="product-item"
          :class="{ checked: item.checked }"
          @click="toggleItemCheck(index)"
        >
          <!-- 备货中状态显示勾选框 -->
          <div v-if="order.status === 'preparing'" class="check-box">
            <t-icon v-if="item.checked" name="check-circle-filled" size="24px" color="var(--primary)" />
            <t-icon v-else name="circle" size="24px" color="#ddd" />
          </div>
          <div class="product-image">
            <img
              :src="getFirstImage(item.productImage || item.product?.images || item.image)"
              alt=""
              @error="handleImageError"
            />
          </div>
          <div class="product-info">
            <div class="product-name">{{ item.productName }}</div>
            <div class="product-price">{{ formatPrice(item.price) }} × {{ item.quantity }}</div>
          </div>
          <div class="product-subtotal">
            {{ formatPrice(getItemSubtotal(item)) }}
          </div>
        </div>
      </div>

      <!-- 金额信息 -->
      <div class="section">
        <div class="section-title">金额信息</div>
        <div class="info-row">
          <span class="label">商品金额:</span>
          <span class="value">{{ formatPrice(getProductAmount()) }}</span>
        </div>
        <div v-if="order.needTransfer" class="info-row">
          <span class="label">移库费:</span>
          <span class="value">{{ formatPrice(order.transferFee) }}</span>
        </div>
        <div class="info-row total">
          <span class="label">订单总额:</span>
          <span class="value amount">{{ formatPrice(order.totalAmount) }}</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="showActions" class="action-section">
        <!-- 待接单状态：显示接单按钮 -->
        <t-button
          v-if="order.status === 'pending_accept'"
          theme="primary"
          size="large"
          block
          :loading="processing"
          @click="handleAccept"
        >
          接单
        </t-button>

        <!-- 备货中状态：显示完成备货和问题上报按钮 -->
        <div v-if="order.status === 'preparing'" class="action-buttons">
          <t-button
            theme="primary"
            size="large"
            :loading="processing"
            @click="handleMarkPrepared"
          >
            完成备货
          </t-button>
          <t-button
            theme="default"
            size="large"
            variant="outline"
            @click="showReportDialog = true"
          >
            <t-icon name="error-circle" size="18px" />
            上报问题
          </t-button>
        </div>
      </div>

      <!-- 待提货/待移库状态：显示核销引导 -->
      <div v-if="showVerifyGuide" class="verify-guide-section">
        <!-- 自提模式：等待客户来取货 -->
        <div v-if="!order.needTransfer && order.status === 'pending_pickup'" class="guide-card self-pickup">
          <div class="guide-header">
            <div class="guide-icon">📦</div>
            <div class="guide-title">等待客户提货</div>
          </div>
          <div class="guide-content">
            <div class="guide-desc">商品已备好，请等待客户凭提货码来取货</div>
            <div class="code-display">
              <span class="code-label">提货码</span>
              <span class="code-value">{{ order.pickupCode }}</span>
            </div>
          </div>
          <div class="guide-action">
            <t-button theme="primary" size="large" block @click="goToPickupVerify">
              <t-icon name="scan" size="18px" />
              扫码核销
            </t-button>
          </div>
        </div>

        <!-- 锁货模式：等待货管来取货交接 -->
        <div v-if="order.needTransfer && order.status === 'pending_transfer'" class="guide-card transfer-handover">
          <div class="guide-header">
            <div class="guide-icon">🚚</div>
            <div class="guide-title">等待货管交接</div>
          </div>
          <div class="guide-content">
            <div class="guide-desc">商品已备好，请等待货管凭移库码来取货</div>
            <div class="code-display">
              <span class="code-label">移库码</span>
              <span class="code-value">{{ order.transferCode }}</span>
            </div>
          </div>
          <div class="guide-action">
            <t-button theme="primary" size="large" block @click="goToTransferVerify">
              <t-icon name="scan" size="18px" />
              扫码交接
            </t-button>
          </div>
        </div>
      </div>

      <!-- 问题上报弹窗 -->
      <t-dialog
        v-model:visible="showReportDialog"
        title="上报问题"
        confirm-btn="提交"
        @confirm="handleReportIssue"
      >
        <div class="report-form">
          <div class="form-item">
            <span class="form-label">问题类型:</span>
            <t-radio-group v-model="reportForm.issueType" class="issue-type-group">
              <t-radio value="out_of_stock">库存不足</t-radio>
              <t-radio value="damaged">商品损坏</t-radio>
              <t-radio value="not_found">找不到商品</t-radio>
              <t-radio value="other">其他问题</t-radio>
            </t-radio-group>
          </div>
          <div class="form-item">
            <span class="form-label">问题描述:</span>
            <t-textarea
              v-model="reportForm.description"
              placeholder="请详细描述问题（选填）"
              :maxlength="200"
            />
          </div>
        </div>
      </t-dialog>

      <!-- 庆祝动画遮罩 -->
      <div v-if="showCelebration" class="celebration-overlay" @click="showCelebration = false">
        <div class="celebration-content">
          <div class="celebration-icon">🎉</div>
          <div class="celebration-text">备货完成！</div>
          <div class="celebration-sub">所有商品已备齐</div>
        </div>
      </div>

      <!-- 打印小票按钮（固定在底部） -->
      <div v-if="canPrint" class="print-button-wrap no-print">
        <t-button
          theme="default"
          size="large"
          block
          @click="handlePrint"
        >
          <t-icon name="print" size="18px" />
          打印小票
        </t-button>
      </div>

      <!-- 打印预览弹窗 -->
      <div v-if="showPrintPreview" class="print-preview-overlay no-print" @click.self="showPrintPreview = false">
        <div class="print-preview-modal">
          <div class="preview-header">
            <span>打印预览</span>
            <t-icon name="close" size="20px" @click="showPrintPreview = false" />
          </div>
          <div class="preview-body">
            <OrderReceipt v-if="order" :order="order" />
          </div>
          <div class="preview-footer">
            <t-button theme="default" size="medium" @click="showPrintPreview = false">取消</t-button>
            <t-button theme="primary" size="medium" @click="confirmPrint">确认打印</t-button>
          </div>
        </div>
      </div>

      <!-- 用于实际打印的隐藏小票 -->
      <div class="print-area">
        <OrderReceipt v-if="order" :order="order" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import { getOrderDetail, acceptOrder, markPrepared, reportIssue } from '@/api/order'
import { formatPrice, formatSmartTime, formatOrderStatus, getFirstImage } from '@/utils/format'
import { vibrate } from '@/utils/bridge'
import type { Order } from '@/types'
import OrderReceipt from '@/components/OrderReceipt.vue'
import '@/styles/print.css'

interface CheckableItem {
  id: string
  productName: string
  productImage?: string  // 订单项的商品图片
  image?: string
  product?: {
    id: number
    name: string
    images: string
    unit: string
  }
  price: number
  quantity: number
  checked: boolean
  subtotal?: number
  subTotal?: number
}

const route = useRoute()
const router = useRouter()
const orderId = route.params.id as string

const loading = ref(true)
const processing = ref(false)
const order = ref<Order | null>(null)
const checkedItems = ref<CheckableItem[]>([])
const showCelebration = ref(false)

// 问题上报
const showReportDialog = ref(false)
const reportForm = ref({
  issueType: 'out_of_stock',
  description: ''
})

// 打印相关
const showPrintPreview = ref(false)

const statusTheme = computed(() => {
  if (!order.value) return 'default'

  const themeMap: Record<string, string> = {
    pending_accept: 'primary',
    preparing: 'warning',
    pending_transfer: 'success',
    pending_pickup: 'success',
    completed: 'success',
    cancelled: 'danger'
  }

  return themeMap[order.value.status] || 'default'
})

// 是否显示操作按钮
const showActions = computed(() => {
  if (!order.value) return false
  return ['pending_accept', 'preparing'].includes(order.value.status)
})

// 是否可以打印（已接单及之后的状态都可以打印）
const canPrint = computed(() => {
  if (!order.value) return false
  return ['preparing', 'pending_transfer', 'pending_pickup', 'completed'].includes(order.value.status)
})

// 是否显示核销引导（备货完成后显示）
const showVerifyGuide = computed(() => {
  if (!order.value) return false
  // 自提模式：待提货状态显示
  if (!order.value.needTransfer && order.value.status === 'pending_pickup') return true
  // 锁货模式：待移库状态显示
  if (order.value.needTransfer && order.value.status === 'pending_transfer') return true
  return false
})

// 备货进度计算
const totalCount = computed(() => checkedItems.value.length)
const checkedCount = computed(() => checkedItems.value.filter(item => item.checked).length)
const progressPercent = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((checkedCount.value / totalCount.value) * 100)
})
const progressLevel = computed(() => {
  if (progressPercent.value >= 100) return 'level-high'
  if (progressPercent.value >= 50) return 'level-medium'
  return 'level-low'
})

// 监听进度变化，100%时触发庆祝
watch(progressPercent, (newVal, oldVal) => {
  if (newVal === 100 && oldVal !== 100 && order.value?.status === 'preparing') {
    showCelebration.value = true
    vibrate(300)
    // 3秒后自动隐藏
    setTimeout(() => {
      showCelebration.value = false
    }, 3000)
  }
})

onMounted(() => {
  loadOrderDetail()
})

async function loadOrderDetail() {
  loading.value = true

  try {
    const data = await getOrderDetail(orderId)
    order.value = data
    // 初始化可勾选商品列表
    if (data?.items) {
      checkedItems.value = data.items.map((item: any) => ({
        ...item,
        checked: false
      }))
    }
  } catch (error) {
    console.error('加载订单详情失败:', error)
  } finally {
    loading.value = false
  }
}

// 返回上一页
function handleBack() {
  router.back()
}

// 切换商品勾选状态
function toggleItemCheck(index: number) {
  if (order.value?.status !== 'preparing') return
  checkedItems.value[index].checked = !checkedItems.value[index].checked
  vibrate(50)
}

// 获取商品小计（兼容字段名差异）
function getItemSubtotal(item: any): number {
  return item.subtotal || item.subTotal || (item.price * item.quantity) || 0
}

// 获取商品总金额（兼容字段名差异）
function getProductAmount(): number {
  if (!order.value) return 0
  if (order.value.productAmount) return order.value.productAmount
  if (order.value.items && order.value.items.length > 0) {
    return order.value.items.reduce((sum, item) => sum + getItemSubtotal(item), 0)
  }
  return 0
}

// 接单
async function handleAccept() {
  if (!order.value || processing.value) return

  processing.value = true
  try {
    await acceptOrder(order.value.id)
    vibrate(200)
    Toast({ message: '接单成功', theme: 'success' })
    await loadOrderDetail()
  } catch (error) {
    console.error('接单失败:', error)
  } finally {
    processing.value = false
  }
}

// 完成备货
async function handleMarkPrepared() {
  if (!order.value || processing.value) return

  processing.value = true
  try {
    await markPrepared(order.value.id)
    vibrate(200)
    Toast({ message: '备货完成', theme: 'success' })
    await loadOrderDetail()
  } catch (error) {
    console.error('完成备货失败:', error)
  } finally {
    processing.value = false
  }
}

// 上报问题
async function handleReportIssue() {
  if (!order.value) return

  if (!reportForm.value.issueType) {
    Toast({ message: '请选择问题类型', theme: 'warning' })
    return
  }

  try {
    await reportIssue({
      orderId: order.value.id,
      issueType: reportForm.value.issueType,
      description: reportForm.value.description
    })

    vibrate(200)
    Toast({ message: '问题已上报', theme: 'success' })
    showReportDialog.value = false

    // 重置表单
    reportForm.value = {
      issueType: 'out_of_stock',
      description: ''
    }
  } catch (error) {
    console.error('上报问题失败:', error)
  }
}

// 打印小票
function handlePrint() {
  showPrintPreview.value = true
}

// 确认打印
function confirmPrint() {
  showPrintPreview.value = false
  // 等待弹窗关闭后再打印
  setTimeout(() => {
    window.print()
  }, 100)
}

// 跳转到自提核销页面
function goToPickupVerify() {
  router.push({
    path: '/pickup',
    query: {
      tab: 'self',  // 切换到自提核销Tab
      code: order.value?.pickupCode || ''  // 预填提货码
    }
  })
}

// 跳转到锁货交接页面
function goToTransferVerify() {
  router.push({
    path: '/pickup',
    query: {
      tab: 'transfer',  // 切换到锁货交接Tab
      code: order.value?.transferCode || ''  // 预填移库码
    }
  })
}

// 图片加载失败处理
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  // 使用内联SVG作为默认占位图
  img.src = 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <rect width="80" height="80" fill="#f5f5f5"/>
      <text x="50%" y="50%" font-family="Arial" font-size="12" fill="#999" text-anchor="middle" dy=".3em">暂无图片</text>
    </svg>
  `)
  // 防止循环触发
  img.onerror = null
}
</script>

<style scoped>
.order-detail-page {
  min-height: 100vh;
  background-color: var(--bg-page);
  padding-bottom: 80px; /* 为底部固定按钮留出空间 */
}

.loading-container,
.empty-container {
  padding: 60px 20px;
  text-align: center;
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.status-section {
  background-color: var(--bg-white);
  padding: 24px;
  text-align: center;
  margin-bottom: 12px;
}

.status-time {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.section {
  background-color: var(--bg-white);
  padding: 16px;
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.section-header .section-title {
  margin-bottom: 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
}

.info-row .label {
  color: var(--text-secondary);
}

.info-row .value {
  color: var(--text-primary);
}

.info-row .address-value {
  max-width: 200px;
  text-align: right;
  word-break: break-all;
}

.phone-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.call-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: var(--primary);
  border-radius: 50%;
  color: white;
  text-decoration: none;
}

.pickup-code {
  font-size: 18px;
  font-weight: bold;
  color: var(--primary);
  letter-spacing: 2px;
}

.info-row.total {
  border-top: 1px dashed var(--border-color);
  margin-top: 8px;
  padding-top: 12px;
  font-weight: 500;
}

.info-row.total .value {
  font-size: 16px;
}

.amount {
  color: var(--primary);
  font-weight: bold;
}

/* 备货进度区域 */
.progress-section {
  padding-bottom: 12px;
}

.progress-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--primary);
}

.progress-bar-wrap {
  height: 8px;
  background-color: #eee;
  border-radius: 4px;
  margin: 12px 0 8px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.progress-bar.level-low {
  background: linear-gradient(90deg, #52c41a, #73d13d);
}

.progress-bar.level-medium {
  background: linear-gradient(90deg, #fa8c16, #ffa940);
}

.progress-bar.level-high {
  background: linear-gradient(90deg, var(--primary), #ff4d4f);
}

.progress-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 商品列表 */
.product-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-page);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.product-item:active {
  transform: scale(0.98);
}

.product-item.checked {
  background-color: rgba(239, 6, 45, 0.05);
  border: 1px solid rgba(239, 6, 45, 0.2);
}

.check-box {
  flex-shrink: 0;
}

.product-image {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-size: 14px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-item.checked .product-name {
  text-decoration: line-through;
  color: var(--text-secondary);
}

.product-price {
  font-size: 13px;
  color: var(--text-secondary);
}

.product-subtotal {
  font-size: 14px;
  font-weight: 500;
  color: var(--primary);
  flex-shrink: 0;
}

.action-section {
  padding: 16px;
  background-color: var(--bg-white);
  margin-top: 12px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.action-buttons .t-button {
  flex: 1;
}

/* 问题上报表单 */
.report-form {
  padding: 16px 0;
}

.report-form .form-item {
  margin-bottom: 16px;
}

.report-form .form-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 14px;
}

.issue-type-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 庆祝动画 */
.celebration-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.celebration-content {
  text-align: center;
  color: white;
  animation: bounceIn 0.5s ease;
}

@keyframes bounceIn {
  0% { transform: scale(0.5); opacity: 0; }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.celebration-icon {
  font-size: 72px;
  margin-bottom: 16px;
  animation: shake 0.5s ease infinite;
}

@keyframes shake {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

.celebration-text {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 8px;
}

.celebration-sub {
  font-size: 16px;
  opacity: 0.8;
}

/* 打印按钮 */
.print-button-wrap {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background-color: var(--bg-white);
  border-top: 1px solid var(--border-color);
  z-index: 100;
}

/* 打印预览弹窗 */
.print-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.print-preview-modal {
  background-color: #fff;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
  font-size: 16px;
  font-weight: 500;
}

.preview-header .t-icon {
  cursor: pointer;
  color: #999;
}

.preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background-color: #f5f5f5;
  display: flex;
  justify-content: center;
}

.preview-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #eee;
}

/* 用于实际打印的区域（屏幕上隐藏） */
.print-area {
  position: absolute;
  left: -9999px;
  top: 0;
}

/* 底部空间已在.order-detail-page中统一设置 */

/* 核销引导区域 */
.verify-guide-section {
  padding: 16px;
  margin-bottom: 12px;
}

.guide-card {
  background-color: var(--bg-white);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.guide-card.self-pickup {
  border: 2px solid #52c41a;
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.05) 0%, rgba(82, 196, 26, 0.02) 100%);
}

.guide-card.transfer-handover {
  border: 2px solid #1890ff;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.05) 0%, rgba(24, 144, 255, 0.02) 100%);
}

.guide-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.guide-icon {
  font-size: 32px;
}

.guide-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.guide-content {
  margin-bottom: 20px;
}

.guide-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  line-height: 1.5;
}

.code-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
}

.code-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.code-value {
  font-size: 28px;
  font-weight: bold;
  color: var(--primary);
  letter-spacing: 4px;
  font-family: 'Courier New', monospace;
}

.guide-action .t-button {
  height: 48px;
  font-size: 16px;
}

.guide-action .t-icon {
  margin-right: 8px;
}
</style>
