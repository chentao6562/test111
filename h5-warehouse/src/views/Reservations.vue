<template>
  <t-pull-down-refresh v-model="refreshing" @refresh="onRefresh">
  <div class="reservations-page">
    <!-- 顶部统计区 - 【2026-01-20】增加待确认统计 -->
    <div class="header-section">
      <div class="header-content">
        <div class="header-title">预约管理</div>
        <div class="stats-row">
          <div class="stat-item" @click="handleStatClick(0)">
            <span class="stat-value">{{ stats.pendingConfirm || 0 }}</span>
            <span class="stat-label">待确认</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item" @click="handleStatClick(7)">
            <span class="stat-value">{{ stats.pendingPrepare || 0 }}</span>
            <span class="stat-label">待备货</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item" @click="handleStatClick(9)">
            <span class="stat-value">{{ stats.pendingPickup || 0 }}</span>
            <span class="stat-label">待核销</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item" @click="handleStatClick(3)">
            <span class="stat-value">{{ stats.todayComplete }}</span>
            <span class="stat-label">今日完成</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索区 -->
    <div class="search-section">
      <t-input
        v-model="searchKeyword"
        placeholder="搜索手机号"
        clearable
        @change="onSearchChange"
        @clear="onSearchClear"
      >
        <template #prefix-icon>
          <t-icon name="search" />
        </template>
      </t-input>
    </div>

    <!-- Tab导航 -->
    <div class="tabs-section">
      <div class="custom-tabs">
        <div
          v-for="tab in tabs"
          :key="tab.value"
          :class="['tab-item', { active: currentTab === tab.value }]"
          @click="onTabChange(tab.value)"
        >
          {{ tab.label }}
        </div>
      </div>
    </div>

    <!-- 预约列表 -->
    <div class="reservation-list">
      <!-- 骨架屏 -->
      <div v-if="loading && reservations.length === 0" class="skeleton-container">
        <div v-for="i in 3" :key="i" class="skeleton-card">
          <div class="skeleton-header">
            <t-skeleton :loading="true" animation="gradient" :row-col="[[{width: '120px', height: '16px'}], [{width: '80px', height: '14px'}]]" />
          </div>
          <div class="skeleton-body">
            <t-skeleton :loading="true" animation="gradient" :row-col="[[{width: '60%', height: '14px'}], [{width: '40%', height: '14px'}]]" />
          </div>
        </div>
      </div>

      <div v-else-if="reservations.length === 0" class="empty-container">
        <div class="empty-icon">📋</div>
        <div class="empty-text">暂无预约</div>
      </div>

      <div v-else>
        <div
          v-for="reservation in reservations"
          :key="reservation.id"
          class="reservation-card"
          @click="goToDetail(reservation)"
        >
          <!-- 卡片头部 -->
          <div class="card-header">
            <span class="reservation-no">{{ reservation.reservationNo }}</span>
            <t-tag :theme="getStatusTheme(reservation.status)" size="small">
              {{ StatusLabels[reservation.status] }}
            </t-tag>
          </div>

          <!-- 客户信息 -->
          <div class="card-body">
            <div class="info-row">
              <span class="label">客户:</span>
              <span class="value">{{ reservation.customerName }}</span>
            </div>
            <div class="info-row">
              <span class="label">电话:</span>
              <span class="value phone" @click.stop="callCustomer(reservation.customerPhone)">
                {{ reservation.customerPhone }}
                <t-icon name="call" size="14px" />
              </span>
            </div>
            <div class="info-row">
              <span class="label">提货日期:</span>
              <span class="value">{{ formatDate(reservation.pickupDate) }}</span>
            </div>
            <div class="info-row">
              <span class="label">预约金额:</span>
              <span class="value amount">{{ formatPrice(reservation.totalAmount) }}</span>
            </div>
            <div v-if="reservation.giftName" class="info-row">
              <span class="label">赠品:</span>
              <span class="value gift">{{ reservation.giftName }}</span>
            </div>
            <!-- 【2026-01-20】已完成预约显示支付方式，便于对账 -->
            <div v-if="reservation.status === 3 && reservation.paymentMethod" class="info-row">
              <span class="label">支付方式:</span>
              <span class="value payment">{{ getPaymentLabel(reservation.paymentMethod) }}</span>
            </div>
          </div>

          <!-- 备货进度条（备货中状态显示） -->
          <div v-if="reservation.status === 8 && reservation.progress" class="progress-section">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: reservation.progress.percent + '%' }"></div>
            </div>
            <span class="progress-text">{{ reservation.progress.prepared }}/{{ reservation.progress.total }}</span>
          </div>

          <!-- 提货码（待提货状态显示） -->
          <div v-if="reservation.status === 9 && reservation.pickupCode" class="pickup-code-section">
            <span class="pickup-code-label">提货码:</span>
            <span class="pickup-code-value">{{ reservation.pickupCode }}</span>
          </div>

          <!-- 卡片底部 -->
          <div class="card-footer">
            <span class="time">{{ formatRelativeTime(reservation.createdAt) }}</span>
            <div class="actions">
              <!-- 待确认/确认中状态显示确认按钮 -->
              <t-button
                v-if="reservation.status === 0 || reservation.status === 1"
                theme="primary"
                size="small"
                @click.stop="goToConfirm(reservation)"
              >
                去确认
              </t-button>
              <!-- 已确认状态显示核销按钮（旧流程兼容） -->
              <t-button
                v-else-if="reservation.status === 2"
                theme="primary"
                size="small"
                @click.stop="goToPickup(reservation)"
              >
                去核销
              </t-button>
              <!-- 待备货状态显示开始备货按钮 -->
              <t-button
                v-else-if="reservation.status === 7"
                theme="primary"
                size="small"
                @click.stop="goToPrepare(reservation)"
              >
                开始备货
              </t-button>
              <!-- 备货中状态显示继续备货按钮 -->
              <t-button
                v-else-if="reservation.status === 8"
                theme="primary"
                size="small"
                @click.stop="goToPrepare(reservation)"
              >
                继续备货
              </t-button>
              <!-- 待提货状态显示核销按钮 -->
              <t-button
                v-else-if="reservation.status === 9"
                theme="primary"
                size="small"
                @click.stop="goToPickupWithCode(reservation)"
              >
                去核销
              </t-button>
            </div>
          </div>

          <!-- 紧急标记 -->
          <div v-if="reservation.isUrgent" class="urgent-badge">
            紧急
          </div>
        </div>

        <!-- 加载更多 -->
        <div v-if="hasMore" class="load-more">
          <t-button theme="default" size="small" :loading="loadingMore" @click="loadMore">
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </t-button>
        </div>

        <div v-else-if="reservations.length > 0" class="no-more">
          已加载全部预约
        </div>
      </div>
    </div>
  </div>
  </t-pull-down-refresh>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import {
  getReservationStats,
  getReservationList,
  StatusLabels,
  type Reservation,
  type ReservationStats
} from '@/api/reservation'
import { formatPrice, formatDate, formatRelativeTime } from '@/utils/format'
import { debounce, memoryCache } from '@/utils/performance'
import { vibrate } from '@/utils/bridge'
import { SEARCH_DEBOUNCE_DELAY, PAGE_SIZE, STATS_CACHE_TIME } from '@/utils/constants'

const router = useRouter()

// Tab配置 - 【2026-01-20】增加待确认Tab，解决预约在其他Tab看不到的问题
const tabs = [
  { value: -1, label: '全部' },
  { value: 0, label: '待确认' },
  { value: 7, label: '待备货' },
  { value: 9, label: '待核销' },
  { value: 3, label: '已完成' }
]

// 状态 - 【2026-01-20】更新统计字段，增加待确认
const stats = ref<ReservationStats & { pendingConfirm?: number; pendingPrepare?: number; pendingPickup?: number }>({
  pending: 0,
  calling: 0,
  confirmed: 0,
  todayComplete: 0,
  pendingConfirm: 0,
  pendingPrepare: 0,
  pendingPickup: 0
})

const currentTab = ref<number>(-1)
const searchKeyword = ref<string>('')
const reservations = ref<Reservation[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(false)
const currentPage = ref(1)
const refreshing = ref(false)

// 获取状态主题色 - 【2026-01-17】新增备货状态
function getStatusTheme(status: number): string {
  const themeMap: Record<number, string> = {
    0: 'warning',  // 待确认 - 橙色
    1: 'primary',  // 确认中 - 蓝色
    2: 'success',  // 已确认 - 绿色
    3: 'default',  // 已完成 - 灰色
    4: 'default',  // 已取消 - 灰色
    5: 'default',  // 已过期 - 灰色
    6: 'danger',   // 确认失败 - 红色
    7: 'warning',  // 待备货 - 橙色
    8: 'primary',  // 备货中 - 蓝色
    9: 'success'   // 待提货 - 绿色
  }
  return themeMap[status] || 'default'
}

// 初始化
onMounted(() => {
  loadStats()
  loadReservations()
})

// 加载统计
async function loadStats() {
  try {
    const cached = memoryCache.get('reservation_stats')
    if (cached) {
      stats.value = cached
      return
    }

    const data = await getReservationStats()
    if (data) {
      stats.value = data
      memoryCache.set('reservation_stats', data, STATS_CACHE_TIME)
    }
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

// 加载预约列表
async function loadReservations(append = false) {
  if (!append) {
    loading.value = true
    currentPage.value = 1
  } else {
    loadingMore.value = true
  }

  try {
    const params: any = {
      page: currentPage.value,
      pageSize: PAGE_SIZE
    }

    // 【2026-01-20】状态筛选：待确认(0)使用多状态查询(0,1)，待备货(7)使用多状态查询(2,7,8)
    if (currentTab.value === 0) {
      // 待确认Tab：查询待确认(0) + 确认中(1)
      params.statuses = '0,1'
    } else if (currentTab.value === 7) {
      // 待备货Tab：查询已确认(2) + 待备货(7) + 备货中(8)
      params.statuses = '2,7,8'
    } else if (currentTab.value >= 0) {
      params.status = currentTab.value
    }

    if (searchKeyword.value) {
      params.customerPhone = searchKeyword.value
    }

    const res = await getReservationList(params)

    if (res) {
      // 计算紧急标记（超过30分钟未处理的待确认预约）
      const list = (res.list || []).map(item => ({
        ...item,
        isUrgent: item.status === 0 && isOverdue(item.createdAt)
      }))

      if (append) {
        reservations.value.push(...list)
      } else {
        reservations.value = list
      }
      hasMore.value = res.total > currentPage.value * PAGE_SIZE
    }
  } catch (error) {
    console.error('加载预约失败:', error)
    if (!append) {
      reservations.value = []
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 判断是否超过30分钟
function isOverdue(createdAt: string): boolean {
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  return now - created > 30 * 60 * 1000
}

// 加载更多
function loadMore() {
  if (hasMore.value && !loadingMore.value) {
    currentPage.value++
    loadReservations(true)
  }
}

// 下拉刷新
async function onRefresh() {
  memoryCache.clear('reservation_stats')
  await Promise.all([loadStats(), loadReservations()])
  refreshing.value = false
}

// Tab切换
function onTabChange(value: number) {
  currentTab.value = value
  loadReservations()
}

// 搜索
const onSearchChange = debounce(() => {
  loadReservations()
}, SEARCH_DEBOUNCE_DELAY)

function onSearchClear() {
  searchKeyword.value = ''
  loadReservations()
}

// 统计卡片点击 - 【2026-01-19】简化点击跳转
function handleStatClick(status: number) {
  vibrate(150)
  currentTab.value = status
  loadReservations()
}

// 跳转详情
function goToDetail(reservation: Reservation) {
  router.push(`/reservations/${reservation.id}`)
}

// 跳转确认页
function goToConfirm(reservation: Reservation) {
  router.push(`/reservations/${reservation.id}/confirm`)
}

// 跳转核销页
function goToPickup(reservation: Reservation) {
  router.push(`/pickup-reservation?phone=${reservation.customerPhone}`)
}

// 【2026-01-17】跳转备货页
function goToPrepare(reservation: Reservation) {
  router.push(`/prepare/${reservation.id}`)
}

// 【2026-01-17】跳转核销页（带提货码）
function goToPickupWithCode(reservation: Reservation) {
  router.push(`/pickup-reservation?code=${reservation.pickupCode}`)
}

// 拨打电话
function callCustomer(phone: string) {
  vibrate(150)
  window.location.href = `tel:${phone}`
}

// 【2026-01-20】获取支付方式标签
function getPaymentLabel(method: string): string {
  const labelMap: Record<string, string> = {
    cash: '现金',
    wechat: '微信',
    alipay: '支付宝'
  }
  return labelMap[method] || method
}
</script>

<style scoped>
.reservations-page {
  min-height: 100vh;
  background-color: var(--bg-page);
  padding-bottom: 70px;
}

.header-section {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  padding: 16px;
  color: white;
}

.header-content {
  text-align: center;
}

.header-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px;
}

.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px 0;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.15s;
}

.stat-item:active {
  transform: scale(0.95);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  opacity: 0.9;
}

.stat-divider {
  width: 1px;
  height: 30px;
  background-color: rgba(255, 255, 255, 0.3);
}

.search-section {
  padding: 12px;
  background-color: var(--bg-white);
}

.tabs-section {
  background-color: var(--bg-white);
  border-bottom: 1px solid var(--border-color);
}

.custom-tabs {
  display: flex;
  padding: 0 8px;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px 8px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  transition: color 0.3s;
}

.tab-item.active {
  color: var(--primary);
  font-weight: 500;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 2px;
  background-color: var(--primary);
  border-radius: 1px;
}

.reservation-list {
  padding: 12px;
}

.reservation-card {
  background-color: var(--bg-white);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.reservation-no {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.card-body {
  padding: 12px 0;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .label {
  color: var(--text-tertiary);
  width: 70px;
  flex-shrink: 0;
}

.info-row .value {
  color: var(--text-primary);
  flex: 1;
}

.info-row .value.phone {
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-row .value.amount {
  color: var(--primary);
  font-weight: bold;
}

.info-row .value.gift {
  color: #ff9800;
}

/* 【2026-01-20】支付方式样式 */
.info-row .value.payment {
  color: #4CAF50;
  font-weight: 500;
}

/* 【2026-01-17】备货进度条样式 */
.progress-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  margin-bottom: 8px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary) 0%, #4CAF50 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* 【2026-01-17】提货码样式 */
.pickup-code-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
  background-color: #e8f5e9;
  border-radius: 4px;
}

.pickup-code-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.pickup-code-value {
  font-size: 18px;
  font-weight: bold;
  color: #4CAF50;
  letter-spacing: 2px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.card-footer .time {
  font-size: 12px;
  color: var(--text-tertiary);
}

.card-footer .actions {
  display: flex;
  gap: 8px;
}

.urgent-badge {
  position: absolute;
  top: 0;
  right: 0;
  background-color: #f44336;
  color: white;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 0 8px 0 8px;
}

.skeleton-container {
  padding: 0;
}

.skeleton-card {
  background-color: var(--bg-white);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.skeleton-header {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.skeleton-body {
  padding: 8px 0;
}

.empty-container {
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  color: var(--text-tertiary);
  font-size: 14px;
}

.load-more,
.no-more {
  text-align: center;
  padding: 16px;
}

.no-more {
  color: var(--text-tertiary);
  font-size: 13px;
}
</style>
