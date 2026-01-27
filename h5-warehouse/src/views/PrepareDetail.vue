<template>
  <div class="prepare-page">
    <!-- 【2026-01-20】顶部导航栏，支持返回 -->
    <div class="nav-bar">
      <div class="nav-left" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">备货详情</div>
      <div class="nav-right"></div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <t-loading size="40px" />
      <span>加载中...</span>
    </div>

    <!-- 详情内容 -->
    <template v-else-if="reservation">
      <!-- 状态卡片【2026-01-19】支持已确认状态也显示待备货 -->
      <div class="status-card" :class="{ 'preparing': isPreparing }">
        <div class="status-icon">
          <t-icon :name="isPreparing ? 'hourglass' : 'assignment'" size="32px" />
        </div>
        <div class="status-info">
          <div class="status-text">{{ isPreparing ? '备货中' : '待备货' }}</div>
          <div class="status-desc">
            {{ isPreparing ? `已备货 ${preparedCount}/${totalCount} 件商品` : '请开始备货准备' }}
          </div>
        </div>
        <div v-if="isPreparing" class="progress-ring">
          <svg viewBox="0 0 36 36">
            <path
              class="bg"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              class="progress"
              :stroke-dasharray="`${progressPercent}, 100`"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span class="progress-text">{{ progressPercent }}%</span>
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
            <span class="value highlight">{{ formatDate(reservation.pickupDate) }}</span>
          </div>
          <div class="info-row">
            <span class="label">预约金额</span>
            <span class="value amount">{{ formatPrice(reservation.totalAmount) }}</span>
          </div>
        </div>
      </div>

      <!-- 商品备货清单 -->
      <div class="info-section">
        <div class="section-title">
          <span>备货清单</span>
          <span class="item-count">
            <t-checkbox
              v-if="!allPrepared && isPreparing"
              :checked="allChecked"
              :indeterminate="someChecked && !allChecked"
              @change="toggleSelectAll"
            >
              全选
            </t-checkbox>
            <span v-else>共{{ totalCount }}件</span>
          </span>
        </div>
        <div class="items-card">
          <div
            v-for="item in reservation.items"
            :key="item.productId"
            class="item-row"
            :class="{ 'prepared': item.prepared }"
          >
            <div class="item-checkbox" v-if="isPreparing && !item.prepared">
              <t-checkbox
                :checked="selectedItems.includes(item.productId)"
                @change="() => toggleItem(item.productId)"
              />
            </div>
            <div class="item-status" v-else-if="item.prepared">
              <t-icon name="check-circle-filled" size="24px" class="checked-icon" />
            </div>
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
              <div class="item-qty">数量：{{ item.quantity }}{{ item.unit || '件' }}</div>
            </div>
            <div class="item-action">
              <t-button
                v-if="isPreparing && !item.prepared && !selectedItems.includes(item.productId)"
                size="small"
                theme="primary"
                variant="outline"
                @click="confirmSingleItem(item)"
              >
                已备好
              </t-button>
              <t-tag v-else-if="item.prepared" theme="success" size="small">已备货</t-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 赠品信息 -->
      <div v-if="reservation.giftName" class="info-section">
        <div class="section-title">预约赠品（需一并备货）</div>
        <div class="gift-card">
          <div class="gift-icon">🎁</div>
          <div class="gift-info">
            <div class="gift-name">{{ reservation.giftName }}</div>
            <div class="gift-hint">请一并准备赠品</div>
          </div>
        </div>
      </div>

      <!-- 问题上报 -->
      <div class="info-section" v-if="isPreparing">
        <div class="section-title">遇到问题？</div>
        <div class="issue-card" @click="showIssueDialog = true">
          <t-icon name="error-circle" size="20px" />
          <span>上报备货问题</span>
          <t-icon name="chevron-right" size="20px" />
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="bottom-actions">
        <!-- 【2026-01-19】待备货状态（已确认2或待备货7） - 开始备货 -->
        <template v-if="isPendingPrepare">
          <t-button theme="primary" size="large" block :loading="actionLoading" @click="handleStartPrepare">
            开始备货
          </t-button>
        </template>

        <!-- 备货中 - 批量确认/完成备货 -->
        <template v-else-if="!allPrepared">
          <div class="action-row">
            <t-button
              theme="default"
              size="large"
              :disabled="selectedItems.length === 0"
              @click="handleBatchConfirm"
              :loading="actionLoading"
            >
              确认已选({{ selectedItems.length }})
            </t-button>
            <t-button
              theme="primary"
              size="large"
              @click="handleCompleteAll"
              :loading="actionLoading"
            >
              全部备好
            </t-button>
          </div>
        </template>

        <!-- 全部备货完成 - 完成备货 -->
        <template v-else>
          <t-button
            theme="primary"
            size="large"
            block
            :loading="actionLoading"
            @click="handleCompletePrepare"
          >
            完成备货，生成提货码
          </t-button>
        </template>
      </div>

      <!-- 提货码弹窗 -->
      <t-dialog
        v-model:visible="showPickupCodeDialog"
        title="备货完成"
        :confirm-btn="{ content: '复制提货码', theme: 'primary' }"
        :cancel-btn="{ content: '返回列表' }"
        @confirm="copyPickupCode"
        @cancel="goBackToList"
      >
        <div class="pickup-code-dialog">
          <div class="success-icon">✅</div>
          <div class="pickup-code-title">提货码已生成</div>
          <div class="pickup-code">{{ pickupCode }}</div>
          <div class="pickup-code-hint">请通知客户凭此提货码到店提货</div>
        </div>
      </t-dialog>

      <!-- 问题上报弹窗 -->
      <t-dialog
        v-model:visible="showIssueDialog"
        title="上报备货问题"
        :confirm-btn="{ content: '提交', theme: 'primary' }"
        :cancel-btn="{ content: '取消' }"
        @confirm="submitIssue"
      >
        <div class="issue-dialog">
          <t-radio-group v-model="issueType" class="issue-types">
            <t-radio value="SHORTAGE" label="库存不足" />
            <t-radio value="DAMAGE" label="商品损坏" />
            <t-radio value="NOT_FOUND" label="找不到商品" />
            <t-radio value="OTHER" label="其他问题" />
          </t-radio-group>
          <t-textarea
            v-model="issueRemark"
            placeholder="请描述具体问题（选填）"
            :maxlength="200"
            :autosize="{ minRows: 3 }"
          />
        </div>
      </t-dialog>
    </template>

    <!-- 空状态 -->
    <div v-else class="empty-container">
      <t-empty description="预约不存在" />
      <t-button theme="primary" @click="router.back()">返回</t-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import {
  getReservationDetail,
  startPrepare,
  updatePrepareItem,
  batchUpdatePrepareItems,
  completePrepare,
  reportPrepareIssue,
  ReservationStatus,
  type Reservation
} from '@/api/reservation'
import { formatPrice, formatDate, getImageUrl } from '@/utils/format'
import { vibrate } from '@/utils/bridge'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const actionLoading = ref(false)
const reservation = ref<Reservation | null>(null)
const selectedItems = ref<number[]>([])
const pickupCode = ref('')
const showPickupCodeDialog = ref(false)
const showIssueDialog = ref(false)
const issueType = ref<'SHORTAGE' | 'DAMAGE' | 'NOT_FOUND' | 'OTHER'>('SHORTAGE')
const issueRemark = ref('')

// 计算属性
// 【2026-01-19】备货中：状态8；待备货：状态2(已确认)或7(待备货)
const isPreparing = computed(() =>
  reservation.value?.status === ReservationStatus.PREPARING
)

// 【2026-01-19】是否为待备货状态（包含已确认2和待备货7）
const isPendingPrepare = computed(() =>
  reservation.value?.status === 2 || reservation.value?.status === ReservationStatus.PENDING_PREPARE
)

const totalCount = computed(() =>
  reservation.value?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
)

const preparedCount = computed(() =>
  reservation.value?.items?.filter(item => item.prepared).reduce((sum, item) => sum + item.quantity, 0) || 0
)

const progressPercent = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((preparedCount.value / totalCount.value) * 100)
})

const allPrepared = computed(() =>
  reservation.value?.items?.every(item => item.prepared) || false
)

const allChecked = computed(() => {
  const unpreparedItems = reservation.value?.items?.filter(item => !item.prepared) || []
  return unpreparedItems.length > 0 && unpreparedItems.every(item => selectedItems.value.includes(item.productId))
})

const someChecked = computed(() => selectedItems.value.length > 0)

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
    Toast.error('加载失败')
  } finally {
    loading.value = false
  }
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

// 全选/取消全选
function toggleSelectAll(checked: boolean) {
  if (checked) {
    const unpreparedIds = reservation.value?.items
      ?.filter(item => !item.prepared)
      .map(item => item.productId) || []
    selectedItems.value = unpreparedIds
  } else {
    selectedItems.value = []
  }
}

// 单个商品选择切换
function toggleItem(productId: number) {
  const index = selectedItems.value.indexOf(productId)
  if (index === -1) {
    selectedItems.value.push(productId)
  } else {
    selectedItems.value.splice(index, 1)
  }
}

// 单个商品确认备货
async function confirmSingleItem(item: { productId: number; productName: string }) {
  if (!reservation.value) return

  try {
    actionLoading.value = true
    await updatePrepareItem(reservation.value.id, item.productId, true)

    // 更新本地状态
    const targetItem = reservation.value.items?.find(i => i.productId === item.productId)
    if (targetItem) {
      targetItem.prepared = true
    }

    vibrate(100)
    Toast.success(`${item.productName} 已备货`)
  } catch (error: any) {
    Toast.error(error.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

// 开始备货
async function handleStartPrepare() {
  if (!reservation.value) return

  try {
    actionLoading.value = true
    await startPrepare(reservation.value.id)

    // 更新本地状态
    reservation.value.status = ReservationStatus.PREPARING

    vibrate(150)
    Toast.success('已开始备货')
  } catch (error: any) {
    Toast.error(error.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

// 批量确认备货
async function handleBatchConfirm() {
  if (!reservation.value || selectedItems.value.length === 0) return

  try {
    actionLoading.value = true
    await batchUpdatePrepareItems(reservation.value.id, selectedItems.value, true)

    // 更新本地状态
    selectedItems.value.forEach(productId => {
      const item = reservation.value?.items?.find(i => i.productId === productId)
      if (item) {
        item.prepared = true
      }
    })
    selectedItems.value = []

    vibrate(150)
    Toast.success('批量确认成功')
  } catch (error: any) {
    Toast.error(error.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

// 全部备好
async function handleCompleteAll() {
  if (!reservation.value) return

  Dialog.confirm({
    title: '确认全部备好？',
    content: '将标记所有商品为已备货状态',
    confirmBtn: '确认',
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        actionLoading.value = true
        const allProductIds = reservation.value?.items?.map(item => item.productId) || []
        await batchUpdatePrepareItems(reservation.value!.id, allProductIds, true)

        // 更新本地状态
        reservation.value?.items?.forEach(item => {
          item.prepared = true
        })
        selectedItems.value = []

        vibrate(150)
        Toast.success('全部商品已备好')
      } catch (error: any) {
        Toast.error(error.message || '操作失败')
      } finally {
        actionLoading.value = false
      }
    }
  })
}

// 完成备货，生成提货码
async function handleCompletePrepare() {
  if (!reservation.value) return

  try {
    actionLoading.value = true
    const result = await completePrepare(reservation.value.id)

    if (result.pickupCode) {
      pickupCode.value = result.pickupCode
      reservation.value.pickupCode = result.pickupCode
      reservation.value.status = ReservationStatus.PENDING_PICKUP
      showPickupCodeDialog.value = true
      vibrate(200)
    } else {
      Toast.success('备货完成')
      router.back()
    }
  } catch (error: any) {
    Toast.error(error.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

// 复制提货码
function copyPickupCode() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(pickupCode.value)
    Toast.success('提货码已复制')
  } else {
    // 兼容旧浏览器
    const input = document.createElement('input')
    input.value = pickupCode.value
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    Toast.success('提货码已复制')
  }
  showPickupCodeDialog.value = false
  goBackToList()
}

// 返回列表
function goBackToList() {
  router.replace('/prepare')
}

// 【2026-01-20】返回上一页
function goBack() {
  router.back()
}

// 提交问题上报
async function submitIssue() {
  if (!reservation.value) return

  try {
    await reportPrepareIssue(reservation.value.id, issueType.value, issueRemark.value)
    Toast.success('问题已上报')
    showIssueDialog.value = false
    issueType.value = 'SHORTAGE'
    issueRemark.value = ''
  } catch (error: any) {
    Toast.error(error.message || '上报失败')
  }
}
</script>

<style scoped>
.prepare-page {
  min-height: 100vh;
  background-color: var(--bg-page);
  padding-bottom: 100px;
}

/* 【2026-01-20】导航栏样式 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  background-color: var(--bg-white);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-left,
.nav-right {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.nav-left:active {
  opacity: 0.7;
}

.nav-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
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
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: white;
}

.status-card.preparing {
  background: linear-gradient(135deg, #2196F3, #1976D2);
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

.progress-ring {
  width: 50px;
  height: 50px;
  position: relative;
}

.progress-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-ring .bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.3);
  stroke-width: 3;
}

.progress-ring .progress {
  fill: none;
  stroke: white;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: bold;
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

.info-row .value.highlight {
  color: #ff5722;
  font-weight: 500;
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
  transition: background-color 0.2s;
}

.item-row:last-child {
  border-bottom: none;
}

.item-row.prepared {
  background-color: rgba(76, 175, 80, 0.05);
}

.item-checkbox,
.item-status {
  width: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checked-icon {
  color: #4CAF50;
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

.item-qty {
  font-size: 12px;
  color: var(--text-tertiary);
}

.item-action {
  margin-left: 12px;
  flex-shrink: 0;
}

.gift-card {
  background-color: var(--bg-white);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  border: 1px dashed #ff9800;
  background-color: #fff8e1;
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

.gift-hint {
  font-size: 12px;
  color: #ff9800;
}

.issue-card {
  background-color: var(--bg-white);
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.issue-card:active {
  background-color: var(--bg-page);
}

.issue-card span {
  flex: 1;
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

.action-row {
  display: flex;
  gap: 12px;
}

.action-row .t-button {
  flex: 1;
}

.empty-container {
  padding: 100px 20px;
  text-align: center;
}

.empty-container .t-button {
  margin-top: 20px;
}

/* 提货码弹窗样式 */
.pickup-code-dialog {
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.pickup-code-title {
  font-size: 16px;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.pickup-code {
  font-size: 32px;
  font-weight: bold;
  color: var(--primary);
  letter-spacing: 4px;
  background-color: var(--bg-page);
  padding: 16px 24px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.pickup-code-hint {
  font-size: 13px;
  color: var(--text-tertiary);
}

/* 问题上报弹窗样式 */
.issue-dialog {
  padding: 8px 0;
}

.issue-types {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}
</style>
