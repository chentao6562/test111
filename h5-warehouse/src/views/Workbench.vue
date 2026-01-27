<template>
  <t-pull-down-refresh v-model="refreshing" @refresh="onRefresh">
  <div class="workbench-page">
    <!-- 顶部统计区 - 【2026-01-19】简化统计：待备货、待核销、今日完成 -->
    <div class="header-section">
      <div class="header-content">
        <div class="header-title">预约工作台</div>
        <div class="stats-row">
          <div class="stat-item" @click="handleStatClick(7)">
            <span class="stat-value">{{ stats.pendingPrepare }}</span>
            <span class="stat-label">待备货</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item" @click="handleStatClick(9)">
            <span class="stat-value">{{ stats.pendingPickup }}</span>
            <span class="stat-label">待核销</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item" @click="handleStatClick(3)">
            <span class="stat-value">{{ stats.todayCompleted }}</span>
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
        <!-- 预约卡片 -->
        <div
          v-for="reservation in reservations"
          :key="reservation.id"
          class="reservation-card"
          @click="handleReservationClick(reservation)"
        >
          <div class="card-header">
            <span class="reservation-no">{{ reservation.reservationNo }}</span>
            <t-tag
              :theme="getStatusTheme(reservation.status)"
              size="small"
              variant="light"
            >
              {{ reservation.statusLabel }}
            </t-tag>
          </div>
          <div class="card-body">
            <div class="info-row">
              <span class="label">客户:</span>
              <span class="value">{{ reservation.customerName }}</span>
              <span class="phone" @click.stop="callCustomer(reservation.customerPhone)">
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
              <span class="value amount">¥{{ reservation.totalAmount }}</span>
            </div>
            <div v-if="reservation.giftName" class="info-row">
              <span class="label">赠品:</span>
              <span class="value gift">{{ reservation.giftName }}</span>
            </div>
          </div>
          <div class="card-footer">
            <span class="time">{{ formatTime(reservation.createdAt) }}</span>
            <div class="actions">
              <!-- 【2026-01-19】库管端移除待确认按钮，待确认订单不显示在库管端 -->
            <!-- 待备货状态（已确认/待备货都可以提前备货） -->
              <t-button
                v-if="reservation.status === 2 || reservation.status === 7"
                theme="primary"
                size="small"
                @click.stop="goToPrepare(reservation)"
              >
                去备货
              </t-button>
              <!-- 备货中状态 -->
              <t-button
                v-if="reservation.status === 8"
                theme="primary"
                size="small"
                @click.stop="goToPrepareDetail(reservation)"
              >
                继续备货
              </t-button>
              <!-- 待提货状态 -->
              <t-button
                v-if="reservation.status === 9"
                theme="primary"
                size="small"
                @click.stop="goToPickup(reservation)"
              >
                去核销
              </t-button>
            </div>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getReservationStats,
  getReservationList,
  type Reservation
} from '@/api/reservation'
import { debounce, memoryCache } from '@/utils/performance'
import { vibrate } from '@/utils/bridge'
import { SEARCH_DEBOUNCE_DELAY, STATS_CACHE_TIME } from '@/utils/constants'

const router = useRouter()
const PAGE_SIZE = 20

// Tab配置 - 【2026-01-19】简化Tab：删除待确认、备货中，直接显示待备货、待核销、已完成
const tabs = [
  { value: -1, label: '全部' },
  { value: 7, label: '待备货' },
  { value: 9, label: '待核销' },
  { value: 3, label: '已完成' }
]

// 状态
interface WorkbenchStats {
  pending: number
  pendingPrepare: number
  pendingPickup: number
  todayCompleted: number
}

const stats = ref<WorkbenchStats>({
  pending: 0,
  pendingPrepare: 0,
  pendingPickup: 0,
  todayCompleted: 0
})

const currentTab = ref<number>(-1)
const searchKeyword = ref<string>('')
const reservations = ref<Reservation[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(false)
const currentPage = ref(1)
const refreshing = ref(false)

// 初始化
onMounted(() => {
  loadStats()
  loadReservations()
})

// 加载统计
async function loadStats() {
  try {
    // 检查缓存
    const cached = memoryCache.get('workbench_stats')
    if (cached) {
      stats.value = cached
      return
    }

    // 【2026-01-19 修复】直接使用后端返回的统计数据
    // 后端 getReservationStats 已返回 pendingPrepare(2,7,8) 和 pendingPickup(9)
    const reservationStats = await getReservationStats()

    const newStats: WorkbenchStats = {
      pending: reservationStats?.pending || 0,
      pendingPrepare: reservationStats?.pendingPrepare || 0,
      pendingPickup: reservationStats?.pendingPickup || 0,
      todayCompleted: reservationStats?.todayComplete || 0
    }

    stats.value = newStats
    memoryCache.set('workbench_stats', newStats, STATS_CACHE_TIME)
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

    // 【2026-01-19】库管端只显示已确认需要备货的订单，不显示待确认订单
    // 状态筛选：全部Tab默认显示(2,7,8,9,3)，排除待确认(0,1)和异常状态(4,5,6)
    if (currentTab.value === -1) {
      // 全部Tab：已确认(2) + 待备货(7) + 备货中(8) + 待提货(9) + 已完成(3)
      params.statuses = '2,3,7,8,9'
    } else if (currentTab.value === 7) {
      // 待备货Tab：查询已确认(2) + 待备货(7) + 备货中(8)
      params.statuses = '2,7,8'
    } else if (currentTab.value >= 0) {
      params.status = currentTab.value
    }

    // 手机号搜索
    if (searchKeyword.value) {
      params.customerPhone = searchKeyword.value
    }

    const res = await getReservationList(params)

    if (res) {
      if (append) {
        reservations.value.push(...(res.list || []))
      } else {
        reservations.value = res.list || []
      }
      hasMore.value = reservations.value.length < res.total
    }
  } catch (error) {
    console.error('加载预约列表失败:', error)
    if (!append) {
      reservations.value = []
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
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
  memoryCache.clear('workbench_stats')
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

// 统计卡片点击
function handleStatClick(status: number) {
  vibrate(150)
  currentTab.value = status
  loadReservations()
  // 【2026-01-19】滚动到列表区域
  setTimeout(() => {
    const listSection = document.querySelector('.reservation-list')
    if (listSection) {
      listSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}

// 预约卡片点击
function handleReservationClick(reservation: Reservation) {
  router.push(`/reservations/${reservation.id}`)
}

// 【2026-01-19】拨打客户电话
function callCustomer(phone: string) {
  vibrate(150)
  window.location.href = `tel:${phone}`
}

// 跳转到备货页
function goToPrepare(reservation: Reservation) {
  router.push(`/prepare/${reservation.id}`)
}

// 跳转到备货详情页
function goToPrepareDetail(reservation: Reservation) {
  router.push(`/prepare/${reservation.id}`)
}

// 跳转到核销页
function goToPickup(reservation: Reservation) {
  router.push(`/pickup?reservationId=${reservation.id}`)
}

// 获取状态主题
function getStatusTheme(status: number): 'warning' | 'primary' | 'success' | 'default' | 'danger' {
  const themes: Record<number, 'warning' | 'primary' | 'success' | 'default' | 'danger'> = {
    0: 'warning',   // 待确认
    1: 'primary',   // 确认中
    2: 'success',   // 已确认
    3: 'default',   // 已完成
    4: 'default',   // 已取消
    5: 'default',   // 已过期
    6: 'danger',    // 确认失败
    7: 'warning',   // 待备货
    8: 'primary',   // 备货中
    9: 'success',   // 待提货
  }
  return themes[status] || 'default'
}

// 格式化日期
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

// 格式化时间
function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}/${day} ${hours}:${minutes}`
}
</script>

<style scoped>
.workbench-page {
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
  overflow-x: auto;
}

.tab-item {
  flex-shrink: 0;
  padding: 12px 12px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  transition: color 0.3s;
  white-space: nowrap;
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
  width: 24px;
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
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.reservation-no {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.card-body {
  padding: 10px 0;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .label {
  color: var(--text-tertiary);
  margin-right: 8px;
  flex-shrink: 0;
}

.info-row .value {
  color: var(--text-primary);
}

.info-row .phone {
  margin-left: auto;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.info-row .amount {
  color: var(--primary);
  font-weight: 500;
}

.info-row .gift {
  color: #ff9800;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
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

/* 骨架屏样式 */
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
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
