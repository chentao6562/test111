<template>
  <t-pull-down-refresh v-model="refreshing" @refresh="onRefresh">
  <div class="pickup-page">
    <!-- 【2026-01-20】扫码核销按钮置顶 -->
    <div class="scan-section">
      <t-button
        theme="primary"
        size="large"
        block
        @click="handleGoPickup"
      >
        <t-icon name="scan" size="22px" />
        扫码核销
      </t-button>
      <div class="scan-tip">点击扫描客户预约二维码</div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <div class="stats-card">
        <div class="stats-item">
          <span class="stats-value">{{ stats.completedCount }}</span>
          <span class="stats-label">今日核销</span>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-item">
          <span class="stats-value amount">¥{{ stats.completedAmount.toFixed(2) }}</span>
          <span class="stats-label">核销金额</span>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-item">
          <span class="stats-value pending">{{ stats.pendingCount }}</span>
          <span class="stats-label">待核销</span>
        </div>
      </div>
    </div>

    <!-- 核销历史列表 -->
    <div class="history-section">
      <div class="section-header">
        <span class="section-title">今日核销记录</span>
        <span class="record-count">共 {{ pickupHistory.length }} 条</span>
      </div>

      <div v-if="loading" class="loading-state">
        <t-loading size="24px" />
        <span>加载中...</span>
      </div>

      <div v-else-if="pickupHistory.length === 0" class="empty-state">
        <t-empty description="今日暂无核销记录" />
      </div>

      <div v-else class="history-list">
        <div
          v-for="record in pickupHistory"
          :key="record.id"
          class="history-item"
          @click="handleViewDetail(record.id)"
        >
          <div class="item-main">
            <div class="item-header">
              <span class="reservation-no">{{ record.reservationNo }}</span>
              <span class="time">{{ formatTime(record.completedAt) }}</span>
            </div>
            <div class="item-info">
              <span class="customer-name">{{ record.customerName }}</span>
              <span class="customer-phone">{{ formatPhone(record.customerPhone) }}</span>
            </div>
            <div class="item-footer">
              <div class="item-details">
                <span class="item-count">{{ record.itemCount }}件商品</span>
                <t-tag v-if="record.giftDelivered" theme="success" size="small">已发赠品</t-tag>
                <t-tag v-if="record.giftName && !record.giftDelivered" theme="warning" size="small">未发赠品</t-tag>
              </div>
              <span class="amount">¥{{ record.totalAmount.toFixed(2) }}</span>
            </div>
          </div>
          <t-icon name="chevron-right" class="item-arrow" />
        </div>
      </div>
    </div>

  </div>
  </t-pull-down-refresh>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { getTodayPickupStats, getTodayCompletedList } from '@/api/reservation'

const router = useRouter()

// 统计数据
const stats = ref({
  completedCount: 0,
  completedAmount: 0,
  pendingCount: 0
})

// 核销历史
const loading = ref(false)
const pickupHistory = ref<any[]>([])

// 【2026-01-19】下拉刷新状态
const refreshing = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  loadStats()
  loadHistory()
  // 【2026-01-19】每30秒自动刷新
  refreshTimer = setInterval(() => {
    loadStats()
    loadHistory()
  }, 30000)
})

// 【2026-01-19】页面从keepAlive恢复时刷新
onActivated(() => {
  loadStats()
  loadHistory()
})

// 【2026-01-19】清理定时器
onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})

// 【2026-01-19】下拉刷新处理
async function onRefresh() {
  await Promise.all([loadStats(), loadHistory()])
  refreshing.value = false
}

// 加载统计数据
async function loadStats() {
  try {
    const res = await getTodayPickupStats()
    if (res) {
      stats.value = {
        completedCount: res.completedCount || 0,
        completedAmount: res.completedAmount || 0,
        pendingCount: res.pendingCount || 0
      }
    }
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

// 加载核销历史
async function loadHistory() {
  loading.value = true
  try {
    const res = await getTodayCompletedList({ page: 1, pageSize: 50 })
    pickupHistory.value = res?.list || []
  } catch (error) {
    console.error('加载核销历史失败:', error)
    pickupHistory.value = []
  } finally {
    loading.value = false
  }
}

// 格式化时间
function formatTime(dateStr: string | Date | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// 格式化手机号
function formatPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 查看详情
// 【2026-01-20修复】增加ID校验
function handleViewDetail(id: number) {
  if (!id || id <= 0) {
    Toast({ message: '预约ID无效', theme: 'warning' })
    return
  }
  router.push(`/reservations/${id}`)
}

// 跳转到核销页面
function handleGoPickup() {
  router.push('/pickup-reservation')
}
</script>

<style scoped>
.pickup-page {
  min-height: 100vh;
  background-color: var(--bg-page);
  padding-bottom: 70px; /* 【2026-01-20】只需TabBar高度 + 安全区 */
}

/* 【2026-01-20】扫码核销区域 - 置顶显示 */
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.scan-section :deep(.t-button:active) {
  transform: scale(0.98);
}

.scan-section :deep(.t-icon) {
  margin-right: 8px;
}

.scan-tip {
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 12px;
}

.stats-section {
  padding: 12px;
}

.stats-card {
  background-color: var(--bg-white);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stats-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.stats-value.amount {
  font-size: 20px;
  color: var(--primary);
}

.stats-value.pending {
  color: #fa8c16;
}

.stats-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.stats-divider {
  width: 1px;
  height: 40px;
  background-color: var(--border-color);
}

.history-section {
  padding: 16px 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.record-count {
  font-size: 13px;
  color: var(--text-tertiary);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: var(--text-tertiary);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  background-color: var(--bg-white);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.history-item:active {
  background-color: #f5f5f5;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.reservation-no {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.time {
  font-size: 12px;
  color: var(--text-tertiary);
}

.item-info {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-details {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-count {
  font-size: 12px;
  color: var(--text-tertiary);
}

.amount {
  font-size: 16px;
  font-weight: 600;
  color: var(--primary);
}

.item-arrow {
  color: var(--text-tertiary);
  margin-left: 8px;
}
</style>
