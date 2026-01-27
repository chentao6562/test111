<template>
  <div class="confirm-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <t-loading size="40px" />
      <span>加载中...</span>
    </div>

    <!-- 确认内容 -->
    <template v-else-if="reservation">
      <!-- 客户信息卡片 -->
      <div class="customer-card">
        <div class="customer-avatar">
          <t-icon name="user" size="32px" />
        </div>
        <div class="customer-info">
          <div class="customer-name">{{ reservation.customerName }}</div>
          <div class="customer-phone">{{ reservation.customerPhone }}</div>
        </div>
        <div class="call-status">
          <t-tag :theme="getCallStatusTheme()" size="small">
            已拨打{{ reservation.callCount }}次
          </t-tag>
        </div>
      </div>

      <!-- 确认话术 -->
      <div class="script-section">
        <div class="section-title">
          <t-icon name="chat" size="16px" />
          确认话术
        </div>
        <div class="script-card">
          <div class="script-text">
            您好，这里是蒙庆烟花，请问是<span class="highlight">{{ reservation.customerName }}</span>吗？
            您在我们这预约了<span class="highlight">{{ formatDate(reservation.pickupDate) }}</span>的烟花提货，
            预约金额<span class="highlight">{{ formatPrice(reservation.totalAmount) }}</span>，
            请问方便确认吗？
          </div>
          <div v-if="reservation.giftName" class="gift-remind">
            <t-icon name="gift" size="14px" />
            提醒客户：到店可领取赠品「{{ reservation.giftName }}」
          </div>
        </div>
      </div>

      <!-- 预约信息 -->
      <div class="info-section">
        <div class="section-title">
          <t-icon name="info-circle" size="16px" />
          预约信息
        </div>
        <div class="info-card">
          <div class="info-row">
            <span class="label">预约号</span>
            <span class="value">{{ reservation.reservationNo }}</span>
          </div>
          <div class="info-row">
            <span class="label">提货日期</span>
            <span class="value">{{ formatDate(reservation.pickupDate) }}</span>
          </div>
          <div class="info-row">
            <span class="label">预约金额</span>
            <span class="value amount">{{ formatPrice(reservation.totalAmount) }}</span>
          </div>
          <div class="info-row">
            <span class="label">商品数量</span>
            <span class="value">{{ reservation.items?.length || 0 }}件</span>
          </div>
        </div>
      </div>

      <!-- 操作区域 -->
      <div class="action-section">
        <!-- 复制电话按钮 -->
        <div class="call-action">
          <t-button
            theme="primary"
            size="large"
            block
            :loading="calling"
            @click="handleCopyPhone"
          >
            <t-icon name="file-copy" /> 复制电话并记录拨打
          </t-button>
          <div class="call-tip">
            复制后请手动拨打，最多记录3次
          </div>
        </div>

        <!-- 确认结果按钮 -->
        <div class="result-actions">
          <t-button
            theme="success"
            size="large"
            :disabled="reservation.callCount === 0"
            :loading="confirming"
            @click="handleConfirmSuccess"
          >
            <t-icon name="check" /> 确认成功
          </t-button>
          <t-button
            theme="danger"
            size="large"
            :disabled="reservation.callCount < 3"
            :loading="marking"
            @click="handleMarkFailed"
          >
            <t-icon name="close" /> 确认失败
          </t-button>
        </div>

        <div v-if="reservation.callCount < 3 && reservation.callCount > 0" class="result-tip">
          需拨打满3次后才能标记确认失败
        </div>
      </div>

      <!-- 通话记录 -->
      <div v-if="reservation.lastCallAt" class="history-section">
        <div class="section-title">
          <t-icon name="time" size="16px" />
          通话记录
        </div>
        <div class="history-card">
          <div class="history-item">
            <span class="history-label">最后拨打</span>
            <span class="history-value">{{ formatDateTime(reservation.lastCallAt) }}</span>
          </div>
          <div class="history-item">
            <span class="history-label">累计拨打</span>
            <span class="history-value">{{ reservation.callCount }}次</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 空状态 -->
    <div v-else class="empty-container">
      <t-empty description="预约不存在" />
      <t-button theme="primary" @click="router.back()">返回</t-button>
    </div>

    <!-- 确认成功弹窗 -->
    <t-dialog
      v-model:visible="showSuccessDialog"
      title="确认成功"
      confirm-btn="确定"
      cancel-btn=""
      @confirm="onSuccessConfirm"
    >
      <div class="success-dialog">
        <div class="success-icon">✅</div>
        <div class="success-text">预约已确认成功</div>
        <div class="success-info">
          <div>提货日期：{{ formatDate(reservation?.pickupDate || '') }}</div>
          <div>有效期至：{{ expireAt }}</div>
        </div>
        <div class="success-tip">
          请提醒客户在有效期内到店提货
        </div>
      </div>
    </t-dialog>

    <!-- 确认失败弹窗 -->
    <t-dialog
      v-model:visible="showFailDialog"
      title="标记确认失败"
      confirm-btn="确认标记"
      cancel-btn="取消"
      :confirm-on-overlay-click="false"
      @confirm="onFailConfirm"
    >
      <div class="fail-dialog">
        <div class="warning-icon">⚠️</div>
        <div class="warning-text">
          确定将此预约标记为确认失败吗？
        </div>
        <div class="warning-info">
          <div>• 锁定的库存将被释放</div>
          <div>• 将记录为客户爽约</div>
          <div>• 该操作不可撤销</div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import {
  getReservationDetail,
  recordCall,
  confirmReservation,
  markCallFailed,
  type Reservation
} from '@/api/reservation'
import { formatPrice, formatDate, formatDateTime } from '@/utils/format'
import { vibrate } from '@/utils/bridge'
import { memoryCache } from '@/utils/performance'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const reservation = ref<Reservation | null>(null)
const calling = ref(false)
const confirming = ref(false)
const marking = ref(false)
const showSuccessDialog = ref(false)
const showFailDialog = ref(false)
const expireAt = ref('')

onMounted(() => {
  loadDetail()
})

async function loadDetail() {
  const id = Number(route.params.id)
  if (!id) {
    loading.value = false
    return
  }

  try {
    const data = await getReservationDetail(id)
    reservation.value = data
  } catch (error) {
    console.error('加载详情失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取拨打状态主题
function getCallStatusTheme(): string {
  if (!reservation.value) return 'default'
  if (reservation.value.callCount === 0) return 'default'
  if (reservation.value.callCount < 3) return 'primary'
  return 'warning'
}

// 复制电话并记录拨打
async function handleCopyPhone() {
  if (!reservation.value) return

  const phone = reservation.value.customerPhone
  const reservationId = reservation.value.id

  // 1. 复制电话号码到剪贴板
  try {
    await navigator.clipboard.writeText(phone)
  } catch (error) {
    // 降级方案：使用 execCommand
    const input = document.createElement('input')
    input.value = phone
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
  }

  // 2. 震动反馈
  vibrate(200)

  // 3. 记录拨打
  calling.value = true
  try {
    const result = await recordCall(reservationId)
    reservation.value.callCount = result.callCount

    // 检查是否自动标记为失败（第3次未接通）
    if (result.autoFailed) {
      Toast({ message: '电话已复制，3次未接通已自动标记失败', theme: 'warning' })
      setTimeout(() => {
        memoryCache.clear('workbench_stats')
        router.replace('/workbench')
      }, 2000)
    } else {
      Toast({ message: `电话已复制，已记录第${result.callCount}次拨打`, theme: 'success' })
    }
  } catch (error) {
    console.error('记录拨打失败:', error)
    Toast({ message: '电话已复制，但记录失败', theme: 'warning' })
  } finally {
    calling.value = false
  }
}

// 确认成功
async function handleConfirmSuccess() {
  if (!reservation.value) return

  confirming.value = true
  try {
    const result = await confirmReservation(reservation.value.id)
    expireAt.value = formatDateTime(result.expireAt)
    showSuccessDialog.value = true
    vibrate(200)
  } catch (error) {
    console.error('确认失败:', error)
  } finally {
    confirming.value = false
  }
}

// 确认成功弹窗确定
function onSuccessConfirm() {
  showSuccessDialog.value = false
  // 【2026-01-19】清除工作台统计缓存，确保返回时数据刷新
  memoryCache.clear('workbench_stats')
  router.replace('/workbench')
}

// 标记失败
function handleMarkFailed() {
  if (!reservation.value || reservation.value.callCount < 3) return
  showFailDialog.value = true
}

// 标记失败确认
async function onFailConfirm() {
  if (!reservation.value) return

  marking.value = true
  try {
    await markCallFailed(reservation.value.id)
    vibrate(200)
    Toast({ message: '已标记为确认失败', theme: 'success' })
    showFailDialog.value = false
    // 【2026-01-19】清除工作台统计缓存，确保返回时数据刷新
    memoryCache.clear('workbench_stats')
    router.replace('/workbench')
  } catch (error) {
    console.error('标记失败:', error)
  } finally {
    marking.value = false
  }
}
</script>

<style scoped>
.confirm-page {
  min-height: 100vh;
  background-color: var(--bg-page);
  padding-bottom: 40px;
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

.customer-card {
  display: flex;
  align-items: center;
  padding: 20px 16px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
}

.customer-avatar {
  width: 56px;
  height: 56px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.customer-info {
  flex: 1;
}

.customer-name {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 4px;
}

.customer-phone {
  font-size: 14px;
  opacity: 0.9;
}

.script-section,
.info-section,
.action-section,
.history-section {
  margin: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.script-card {
  background-color: var(--bg-white);
  border-radius: 8px;
  padding: 16px;
}

.script-text {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-primary);
}

.script-text .highlight {
  color: var(--primary);
  font-weight: 500;
}

.gift-remind {
  margin-top: 12px;
  padding: 10px 12px;
  background-color: #fff8e1;
  border-radius: 6px;
  font-size: 13px;
  color: #f57c00;
  display: flex;
  align-items: center;
  gap: 6px;
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

.info-row .value.amount {
  color: var(--primary);
  font-weight: bold;
}

.call-action {
  margin-bottom: 16px;
}

.call-tip {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
}

.result-actions {
  display: flex;
  gap: 12px;
}

.result-actions .t-button {
  flex: 1;
}

.result-tip {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
}

.history-card {
  background-color: var(--bg-white);
  border-radius: 8px;
  padding: 12px 16px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.history-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.history-value {
  font-size: 13px;
  color: var(--text-primary);
}

/* 弹窗样式 */
.success-dialog,
.fail-dialog {
  text-align: center;
  padding: 16px 0;
}

.success-icon,
.warning-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.success-text,
.warning-text {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 16px;
}

.success-info {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 12px;
}

.success-tip {
  font-size: 13px;
  color: var(--primary);
}

.warning-info {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: left;
  line-height: 2;
}

.empty-container {
  padding: 100px 20px;
  text-align: center;
}

.empty-container .t-button {
  margin-top: 20px;
}
</style>
