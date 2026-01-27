<template>
  <div class="my-page">
    <!-- 用户信息卡片 -->
    <div class="user-card">
      <div class="header-bg">
        <div class="header-circle-1"></div>
        <div class="header-circle-2"></div>
      </div>
      <div class="user-content">
        <div class="user-avatar">
          <t-icon name="user" size="32px" color="#fff" />
        </div>
        <div class="user-info">
          <div class="user-name">{{ staffInfo?.name || '库管员' }}</div>
          <t-tag theme="warning" variant="light" size="small">库管员</t-tag>
        </div>
        <div class="user-id">工号: {{ staffInfo?.staffNo || staffInfo?.employeeNo || staffInfo?.username || '-' }}</div>
      </div>
    </div>

    <!-- 工作统计 -->
    <div class="stats-section">
      <!-- 统计周期切换 -->
      <div class="stats-tabs">
        <div
          v-for="period in periodOptions"
          :key="period.value"
          :class="['stats-tab', { active: statsPeriod === period.value }]"
          @click="switchStatsPeriod(period.value)"
        >
          {{ period.label }}
        </div>
      </div>

      <!-- 【2026-01-19】移除展开/收起功能 -->
      <div class="stats-header">
        <div class="stats-title-wrap">
          <span class="stats-title">{{ periodLabels[statsPeriod] }}工作统计</span>
        </div>
        <span class="stats-date">{{ periodDate }}</span>
      </div>

      <!-- 【2026-01-19】修改统计单元：待备货、待核销、已核销 -->
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value">{{ currentStats.pendingPrepare }}</span>
          <span class="stat-label">待备货</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ currentStats.pendingPickup }}</span>
          <span class="stat-label">待核销</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ currentStats.pickup }}</span>
          <span class="stat-label">已核销</span>
        </div>
      </div>

      <!-- 【2026-01-19】移除详情展开区域，精简统计 -->
    </div>

    <!-- 快捷功能 -->
    <div class="menu-section">
      <div class="section-title">快捷功能</div>
      <div class="menu-grid">
        <div class="menu-item" @click="goToReservations">
          <div class="menu-icon-wrap success">
            <t-icon name="calendar" size="24px" color="#fff" />
          </div>
          <span class="menu-label">预约管理</span>
        </div>
        <div class="menu-item" @click="goToPickupReservation">
          <div class="menu-icon-wrap warning">
            <t-icon name="check-circle" size="24px" color="#fff" />
          </div>
          <span class="menu-label">预约核销</span>
        </div>
        <div class="menu-item" @click="goToPickupHistory">
          <div class="menu-icon-wrap primary">
            <t-icon name="history" size="24px" color="#fff" />
          </div>
          <span class="menu-label">核销历史</span>
        </div>
        <div class="menu-item" @click="callService">
          <div class="menu-icon-wrap info">
            <t-icon name="service" size="24px" color="#fff" />
          </div>
          <span class="menu-label">联系客服</span>
        </div>
        <div class="menu-item" @click="goToCouponRedeem">
          <div class="menu-icon-wrap danger">
            <t-icon name="gift" size="24px" color="#fff" />
          </div>
          <span class="menu-label">代金券核销</span>
        </div>
      </div>
    </div>

    <!-- 功能列表 -->
    <div class="list-section">
      <t-cell-group>
        <t-cell
          title="关于系统"
          arrow
          hover
          clickable
          @click="handleAbout"
        >
          <template #left-icon>
            <t-icon name="info-circle-filled" size="22px" />
          </template>
        </t-cell>
        <t-cell
          title="退出登录"
          arrow
          hover
          clickable
          @click="handleLogout"
        >
          <template #left-icon>
            <t-icon name="poweroff" size="22px" />
          </template>
        </t-cell>
      </t-cell-group>
    </div>

    <!-- 版本信息 -->
    <div class="version-info">
      <p>蒙庆烟花库管端 v1.0.0</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, Toast, ActionSheet } from 'tdesign-mobile-vue'
import { useUserStore } from '@/stores/user'
import { getReservationStats, getTodayPickupStats, getPickupStatsByPeriod } from '@/api/reservation'

const router = useRouter()
const userStore = useUserStore()

const staffInfo = computed(() => userStore.staffInfo)

// 统计周期选项
const periodOptions = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '近7日' },
  { value: 'month', label: '本月' },
  { value: 'total', label: '累计' }
]

const periodLabels: Record<string, string> = {
  today: '今日',
  week: '近7日',
  month: '本月',
  total: '累计'
}

const statsPeriod = ref('today')
const periodDate = ref('')

// 【2026-01-19】当前统计数据：待备货、待核销、已核销
const currentStats = ref({
  pendingPrepare: 0,  // 待备货（状态2,7,8）
  pendingPickup: 0,   // 待核销（状态9）
  pickup: 0,          // 已核销（今日/本周/本月/累计完成数）
})

// 各周期统计缓存
const allStats = ref<Record<string, typeof currentStats.value | null>>({
  today: null,
  week: null,
  month: null,
  total: null
})

onMounted(() => {
  updatePeriodDate()
  loadStats('today')
})

onActivated(() => {
  loadStats(statsPeriod.value)
})

// 更新周期日期显示
function updatePeriodDate() {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const year = now.getFullYear()

  switch (statsPeriod.value) {
    case 'today':
      periodDate.value = `${month}月${day}日`
      break
    case 'week':
      const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
      periodDate.value = `${weekAgo.getMonth() + 1}/${weekAgo.getDate()} - ${month}/${day}`
      break
    case 'month':
      periodDate.value = `${year}年${month}月`
      break
    case 'total':
      periodDate.value = '全部时间'
      break
  }
}

// 切换统计周期
function switchStatsPeriod(period: string) {
  if (period === statsPeriod.value) return

  statsPeriod.value = period
  updatePeriodDate()

  // 检查缓存
  const cached = allStats.value[period]
  if (cached) {
    currentStats.value = cached
  } else {
    loadStats(period)
  }
}

// 【2026-01-19】加载统计数据：待备货、待核销、已核销
// 【2026-01-20修复】分别调用API，避免一个失败导致全部失败
async function loadStats(period: string) {
  try {
    const periodValue = period as 'today' | 'week' | 'month' | 'total'

    // 分别调用，每个API独立catch错误
    let reservationStats: any = null
    let pickupPeriodStats: any = null

    try {
      reservationStats = await getReservationStats()
    } catch (e) {
      console.error('获取预约统计失败:', e)
    }

    try {
      pickupPeriodStats = await getPickupStatsByPeriod(periodValue)
    } catch (e) {
      console.error('获取核销周期统计失败:', e)
    }

    // 统计字段说明：
    // - 待备货：状态2+7+8的预约数（当前实时）
    // - 待核销：状态9的预约数（当前实时）
    // - 已核销：根据周期统计（今日/近7日/本月/累计）
    const stats = {
      pendingPrepare: reservationStats?.pendingPrepare || 0,
      pendingPickup: reservationStats?.pendingPickup || 0,
      pickup: pickupPeriodStats?.completedCount || 0,
    }

    currentStats.value = stats
    allStats.value[period] = stats
  } catch (error) {
    console.error('加载统计失败:', error)
    currentStats.value = {
      pendingPrepare: 0,
      pendingPickup: 0,
      pickup: 0,
    }
  }
}

// 【2026-01-19】已移除toggleStatsDetail函数

// 跳转预约管理
function goToReservations() {
  router.push('/reservations')
}

// 跳转预约核销
function goToPickupReservation() {
  router.push('/pickup-reservation')
}

// 跳转核销历史
function goToPickupHistory() {
  router.push('/pickup')
  // 可以通过query参数让Pickup页面自动滚动到历史区域
}

// 【2026-01-18 春节营销】跳转代金券核销
function goToCouponRedeem() {
  router.push('/coupon-redeem')
}

// 联系客服
function callService() {
  ActionSheet.show({
    items: [
      { label: '13190531439' },
      { label: '15849390600' }
    ],
    onSelected: (selected: { label: string } | null) => {
      if (selected) {
        window.location.href = `tel:${selected.label}`
      }
    }
  })
}

// 关于应用
function handleAbout() {
  Dialog.alert({
    title: '关于蒙庆烟花',
    content: '蒙庆烟花库管系统\n版本: 1.0.0\n\n地址: 呼和浩特市和林格尔县盛乐镇姑子板村华门世家1号门面房\n\n客服电话: 13190531439 / 15849390600',
    confirmBtn: '知道了'
  })
}

// 退出登录
async function handleLogout() {
  const confirmed = await Dialog.confirm({
    title: '确认退出',
    content: '确定要退出登录吗？',
    confirmBtn: { content: '退出', theme: 'danger' },
    cancelBtn: '取消'
  })

  if (!confirmed) return

  userStore.logout()
  Toast({ message: '已退出登录', theme: 'success' })
  router.push('/login')
}
</script>

<style scoped>
.my-page {
  min-height: 100vh;
  background-color: var(--bg-page);
  padding-bottom: 60px;
}

/* 用户信息卡片 */
.user-card {
  position: relative;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  padding: 32px 16px;
  overflow: hidden;
}

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.header-circle-1 {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  top: -100px;
  right: -50px;
}

.header-circle-2 {
  position: absolute;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.08);
  bottom: -80px;
  left: -30px;
}

.user-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
}

.user-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.user-name {
  font-size: 20px;
  font-weight: bold;
}

.user-id {
  font-size: 13px;
  opacity: 0.8;
}

/* 统计区域 */
.stats-section {
  background-color: var(--bg-white);
  margin: 12px;
  border-radius: 8px;
  overflow: hidden;
}

.stats-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
}

.stats-tab {
  flex: 1;
  padding: 12px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.stats-tab.active {
  color: var(--primary);
  font-weight: 500;
  position: relative;
}

.stats-tab.active::after {
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

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
}

.stats-title-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stats-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.stats-date {
  font-size: 12px;
  color: var(--text-tertiary);
}

.stats-grid {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 16px;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: var(--primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-divider {
  width: 1px;
  height: 32px;
  background-color: var(--border-color);
}

.stats-detail {
  padding: 0 16px 16px;
  border-top: 1px dashed var(--border-color);
  margin-top: 8px;
  padding-top: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
}

.detail-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.detail-value {
  font-size: 13px;
  color: var(--text-primary);
}

/* 快捷功能 */
.menu-section {
  margin: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.menu-grid {
  display: flex;
  gap: 16px;
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.menu-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-icon-wrap.primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
}

.menu-icon-wrap.info {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}

.menu-icon-wrap.success {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.menu-icon-wrap.warning {
  background: linear-gradient(135deg, #faad14 0%, #d48806 100%);
}

.menu-icon-wrap.danger {
  background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
}

.menu-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 功能列表 */
.list-section {
  margin: 12px;
}

/* 版本信息 */
.version-info {
  text-align: center;
  padding: 24px;
  color: var(--text-tertiary);
  font-size: 12px;
}
</style>
