<template>
  <div class="dashboard">
    <!-- 欢迎区域 -->
    <PageHeader :title="welcomeText" :subtitle="welcomeSubtitle">
      <template #actions>
        <t-button v-if="!isServiceRole" variant="outline" @click="$router.push('/reports')">
          <template #icon><t-icon name="chart-bar" /></template>
          报表中心
        </t-button>
        <t-button theme="primary" @click="$router.push('/reservations')">
          <template #icon><t-icon name="calendar" /></template>
          查看预约
        </t-button>
      </template>
    </PageHeader>

    <!-- 统计卡片 - 第一行：销售与利润（客服角色只显示预约相关） -->
    <div class="stats-grid" :class="{ 'stats-grid-service': isServiceRole }">
      <StatCard
        v-if="!isServiceRole"
        label="今日销售额"
        :value="stats.todaySales"
        icon="money-circle"
        theme="primary"
        prefix="¥"
        :trend="stats.salesGrowth"
        trend-label="同比"
        :loading="statsLoading"
      />
      <StatCard
        v-if="!isServiceRole"
        label="今日总代利润"
        :value="stats.todayMasterProfit"
        icon="wallet"
        theme="success"
        prefix="¥"
        :trend="stats.profitDayGrowth"
        trend-label="环比"
        :loading="statsLoading"
      />
      <StatCard
        label="本月预约量"
        :value="stats.monthReservations"
        icon="calendar"
        theme="primary"
        :trend="stats.reservationsGrowth"
        trend-label="环比"
        :loading="statsLoading"
      />
      <StatCard
        v-if="!isServiceRole"
        label="本月总代利润"
        :value="stats.monthMasterProfit"
        icon="chart-pie"
        theme="success"
        prefix="¥"
        :trend="stats.profitMonthGrowth"
        trend-label="同比"
        :loading="statsLoading"
      />
      <!-- 客服角色专属：待确认预约数 -->
      <StatCard
        v-if="isServiceRole"
        label="待确认预约"
        :value="stats.pendingConfirm || 0"
        icon="time"
        theme="warning"
        :loading="statsLoading"
      />
      <!-- 客服角色专属：今日已确认数 -->
      <StatCard
        v-if="isServiceRole"
        label="今日已确认"
        :value="stats.todayConfirmed || 0"
        icon="check-circle"
        theme="success"
        :loading="statsLoading"
      />
    </div>

    <!-- 统计卡片 - 第二行：库存与推销员（客服角色不显示） -->
    <div v-if="!isServiceRole" class="stats-grid stats-grid-secondary">
      <StatCard
        label="预警 / 缺货"
        :value="`${stats.warningCount} / ${stats.outOfStockCount}`"
        icon="error-circle"
        theme="warning"
        badge="库存预警"
        badge-theme="warning"
        :clickable="true"
        :loading="statsLoading"
        @click="$router.push('/stock?status=warning')"
      />
      <StatCard
        label="新增推销员"
        :value="stats.newAgents"
        icon="user-add"
        theme="primary"
        :trend="stats.agentsGrowth"
        trend-label="新增"
        :loading="statsLoading"
      />
    </div>

    <!-- 图表区域（客服角色不显示） -->
    <div v-if="!isServiceRole" class="charts-section">
      <!-- 销售趋势 -->
      <div class="chart-card main-chart">
        <div class="chart-header">
          <div>
            <h3>近{{ trendDays }}日销售趋势</h3>
            <p class="chart-subtitle">累计销售额 {{ formatMoney(totalSales) }}</p>
          </div>
          <t-select v-model="trendDays" size="small" style="width: 120px;">
            <t-option :value="7" label="最近7天" />
            <t-option :value="30" label="最近30天" />
          </t-select>
        </div>
        <div ref="trendChartRef" class="trend-chart"></div>
      </div>

      <!-- 热销商品排行 -->
      <div class="chart-card side-chart">
        <div class="chart-header">
          <h3>热销商品排行</h3>
        </div>
        <div class="hot-products">
          <div v-for="(item, index) in hotProducts" :key="item.id" class="hot-product-item">
            <div class="hot-product-info">
              <span class="hot-product-rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</span>
              <span class="hot-product-name">{{ item.name }}</span>
              <span class="hot-product-amount">{{ formatMoney(item.salesAmount) }}</span>
            </div>
            <div class="hot-product-bar">
              <div
                class="hot-product-progress"
                :style="{ width: getProgressWidth(item.salesAmount, index) }"
              ></div>
            </div>
          </div>
          <EmptyState v-if="hotProducts.length === 0 && !hotProductsLoading" type="data" size="small" />
        </div>
      </div>
    </div>

    <!-- 最新预约 -->
    <div class="orders-section">
      <div class="orders-header">
        <h3>最新预约</h3>
        <t-link theme="primary" @click="$router.push('/reservations')">
          查看全部
          <t-icon name="chevron-right" size="16px" />
        </t-link>
      </div>
      <div class="order-list">
        <div v-for="order in recentOrders" :key="order.id" class="order-item" @click="handleViewOrder(order)">
          <div class="order-left">
            <div class="order-agent">
              <div class="agent-avatar">{{ (order.agent?.name || '未')[0] }}</div>
              <div class="agent-info">
                <span class="agent-name">{{ order.agent?.name || '未知推销员' }}</span>
                <span class="order-no">{{ order.orderNo }}</span>
              </div>
            </div>
          </div>
          <div class="order-center">
            <div class="order-products">
              <span class="product-name">{{ order.items?.[0]?.productName || '-' }}</span>
              <span v-if="order.items?.length > 1" class="product-count">等{{ order.items.length }}件商品</span>
            </div>
            <!-- 预约状态标签 -->
            <t-tag :theme="getStatusTheme(order.status)" variant="light" size="small">
              {{ RESERVATION_STATUSES[order.status] || '未知' }}
            </t-tag>
          </div>
          <div class="order-right">
            <div class="order-amount">{{ formatMoney(order.totalAmount) }}</div>
            <div class="order-meta">
              <span class="order-time">{{ formatRelativeTime(order.createdAt) }}</span>
            </div>
          </div>
          <div class="order-actions">
            <t-tooltip content="查看详情">
              <t-button variant="text" size="small" @click.stop="handleViewOrder(order)">
                <template #icon><t-icon name="browse" size="16px" /></template>
              </t-button>
            </t-tooltip>
          </div>
        </div>
        <EmptyState v-if="recentOrders.length === 0 && !ordersLoading" type="data" size="small" />
      </div>
    </div>

    <!-- 页脚 -->
    <div class="dashboard-footer">
      <p>© 2026 蒙庆烟花有限公司. All rights reserved. 系统版本 v1.0.0</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, nextTick, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getDashboardData, getHotProducts, getRecentOrders, getSalesTrend } from '@/api/report'
import { StatCard, PageHeader, EmptyState } from '@/components'
import * as echarts from 'echarts'

// 预约状态映射
const RESERVATION_STATUSES: Record<number, string> = {
  0: '待确认', 1: '确认中', 2: '已确认', 3: '已完成',
  4: '已取消', 5: '已过期', 6: '确认失败',
  7: '待备货', 8: '备货中', 9: '待提货'
}

// 获取状态主题色
const getStatusTheme = (status: number): string => {
  const themes: Record<number, string> = {
    0: 'warning', 1: 'primary', 2: 'success', 3: 'default',
    4: 'default', 5: 'danger', 6: 'danger',
    7: 'warning', 8: 'primary', 9: 'success'
  }
  return themes[status] || 'default'
}

const router = useRouter()
const userStore = useUserStore()

// 判断是否是客服角色
const isServiceRole = computed(() => userStore.role === 'SERVICE')

// 欢迎语
const welcomeText = computed(() => {
  const hour = new Date().getHours()
  let greeting = '欢迎回来'
  if (hour >= 5 && hour < 12) greeting = '早上好'
  else if (hour >= 12 && hour < 14) greeting = '中午好'
  else if (hour >= 14 && hour < 18) greeting = '下午好'
  else greeting = '晚上好'
  return `${greeting}，${userStore.username || '管理员'}`
})

const welcomeSubtitle = computed(() => {
  const now = new Date()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${now.getMonth() + 1}月${now.getDate()}日 星期${weekDays[now.getDay()]}，今日销售概览已更新`
})

// 加载状态
const statsLoading = ref(true)
const hotProductsLoading = ref(true)
const ordersLoading = ref(true)

// 统计数据
const stats = reactive({
  todaySales: 0,
  salesGrowth: 0,
  monthReservations: 0,
  reservationsGrowth: 0,
  warningCount: 0,
  outOfStockCount: 0,
  newAgents: 0,
  agentsGrowth: 0,
  // 利润统计
  todayMasterProfit: 0,
  profitDayGrowth: 0,
  monthMasterProfit: 0,
  profitMonthGrowth: 0,
  // 客服角色专属统计
  pendingConfirm: 0,
  todayConfirmed: 0,
})

// 热销商品
const hotProducts = ref<any[]>([])

// 最新订单
const recentOrders = ref<any[]>([])

// 趋势图表
const trendChartRef = ref<HTMLElement | null>(null)
const trendDays = ref(30)
const trendData = ref<any[]>([])
let trendChart: echarts.ECharts | null = null

// 计算累计销售额
const totalSales = computed(() => {
  return trendData.value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
})

// 格式化金额
function formatMoney(value: number | string) {
  const num = Number(value) || 0
  if (num >= 10000) {
    return '¥' + (num / 10000).toFixed(1) + '万'
  }
  return '¥' + num.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// 格式化相对时间
function formatRelativeTime(time: string | Date) {
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

// 获取进度条宽度
function getProgressWidth(amount: number, index: number) {
  if (hotProducts.value.length === 0) return '0%'
  const maxAmount = hotProducts.value[0]?.salesAmount || 1
  const percentage = Math.max(20, (amount / maxAmount) * 100)
  return `${percentage}%`
}

// 查看订单详情
function handleViewOrder(order: any) {
  router.push(`/orders?id=${order.id}`)
}

// 加载控制台数据
async function loadDashboardData() {
  statsLoading.value = true
  try {
    const res = await getDashboardData()
    if (res.code === 0) {
      const data = res.data
      stats.todaySales = data.todaySales || 0
      stats.salesGrowth = data.salesGrowth || 0
      stats.monthReservations = data.monthReservations || 0
      stats.reservationsGrowth = data.reservationsGrowth || 0
      stats.warningCount = data.warningCount || 0
      stats.outOfStockCount = data.outOfStockCount || 0
      stats.newAgents = data.newAgents || 0
      stats.agentsGrowth = data.agentsGrowth || 0
      // 利润统计
      stats.todayMasterProfit = data.todayMasterProfit || 0
      stats.profitDayGrowth = data.profitDayGrowth || 0
      stats.monthMasterProfit = data.monthMasterProfit || 0
      stats.profitMonthGrowth = data.profitMonthGrowth || 0
      // 客服角色专属统计
      stats.pendingConfirm = data.pendingConfirm || 0
      stats.todayConfirmed = data.todayConfirmed || 0
    }
  } catch (error) {
    console.error('加载控制台数据失败:', error)
  } finally {
    statsLoading.value = false
  }
}

// 加载热销商品
async function loadHotProducts() {
  hotProductsLoading.value = true
  try {
    const res = await getHotProducts(5)
    if (res.code === 0) {
      hotProducts.value = res.data || []
    }
  } catch (error) {
    console.error('加载热销商品失败:', error)
  } finally {
    hotProductsLoading.value = false
  }
}

// 加载最新订单
async function loadRecentOrders() {
  ordersLoading.value = true
  try {
    const res = await getRecentOrders(8)
    if (res.code === 0) {
      recentOrders.value = res.data || []
    }
  } catch (error) {
    console.error('加载最新订单失败:', error)
  } finally {
    ordersLoading.value = false
  }
}

// 加载销售趋势
async function loadSalesTrend() {
  try {
    const res = await getSalesTrend(Number(trendDays.value))
    if (res.code === 0) {
      trendData.value = res.data || []
      renderTrendChart(trendData.value)
    }
  } catch (error) {
    console.error('加载销售趋势失败:', error)
  }
}

// 渲染趋势图表
function renderTrendChart(data: any[]) {
  if (!trendChartRef.value) return

  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }

  const dates = data.map(item => item.date.slice(5)) // 只显示 MM-DD
  const sales = data.map(item => Number(item.amount) || 0)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#eee',
      borderWidth: 1,
      textStyle: { color: '#333' },
      formatter: (params: any) => {
        const p = params[0]
        return `<div style="padding: 8px;">
          <div style="color: #999; font-size: 12px; margin-bottom: 4px;">${p.axisValue}</div>
          <div style="color: #e53935; font-weight: 600;">¥${Number(p.value).toLocaleString()}</div>
        </div>`
      }
    },
    grid: {
      left: 50,
      right: 20,
      top: 20,
      bottom: 40,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#999',
        fontSize: 11,
        interval: Math.floor(dates.length / 7),
      },
    },
    yAxis: {
      type: 'value',
      splitLine: {
        lineStyle: { color: '#f0f0f0', type: 'dashed' }
      },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#999',
        fontSize: 11,
        formatter: (value: number) => {
          if (value >= 10000) return (value / 10000).toFixed(0) + 'W'
          if (value >= 1000) return (value / 1000).toFixed(0) + 'K'
          return value.toString()
        },
      },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: sales,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(229, 57, 53, 0.25)' },
            { offset: 1, color: 'rgba(229, 57, 53, 0.02)' },
          ]),
        },
        lineStyle: {
          color: '#e53935',
          width: 3,
        },
      },
    ],
  }

  trendChart.setOption(option)
}

// 监听天数变化
watch(trendDays, () => {
  loadSalesTrend()
})

// 窗口大小变化处理
function handleResize() {
  trendChart?.resize()
}

// 初始化
onMounted(async () => {
  await Promise.all([
    loadDashboardData(),
    loadHotProducts(),
    loadRecentOrders(),
  ])

  await nextTick()
  loadSalesTrend()

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
})
</script>

<style scoped>
.dashboard {
  max-width: var(--content-max-width);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2xl);
}

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
}

.stats-grid-secondary {
  grid-template-columns: repeat(2, 1fr);
  max-width: 50%;
}

.stats-grid-service {
  grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .stats-grid-secondary {
    max-width: 100%;
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .stats-grid-secondary {
    grid-template-columns: 1fr;
    max-width: 100%;
  }
}

/* 图表区域 */
.charts-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--spacing-lg);
}

@media (max-width: 1024px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-2xl);
  border: 1px solid var(--color-border-light);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-xl);
}

.chart-header h3 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.chart-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: var(--spacing-xs) 0 0 0;
}

.trend-chart {
  width: 100%;
  height: 300px;
}

/* 热销商品 */
.hot-products {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.hot-product-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.hot-product-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.hot-product-rank {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  background: var(--color-bg-hover);
  color: var(--color-text-tertiary);
}

.hot-product-rank.rank-1 {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.hot-product-rank.rank-2 {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.hot-product-rank.rank-3 {
  background: var(--color-warning-lighter);
  color: var(--color-warning-hover);
}

.hot-product-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-regular);
  font-weight: var(--font-weight-medium);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-product-amount {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.hot-product-bar {
  height: 6px;
  background: var(--color-bg-hover);
  border-radius: 3px;
  overflow: hidden;
}

.hot-product-progress {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
  border-radius: 3px;
  transition: width var(--transition-slow);
}

/* 订单区域 */
.orders-section {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
}

.orders-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xl) var(--spacing-2xl);
  border-bottom: 1px solid var(--color-border-light);
}

.orders-header h3 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.order-list {
  padding: 0;
}

.order-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-lg) var(--spacing-2xl);
  border-bottom: 1px solid var(--color-border-lighter);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.order-item:last-child {
  border-bottom: none;
}

.order-item:hover {
  background: var(--color-bg-hover);
}

.order-left {
  flex: 0 0 200px;
}

.order-agent {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.agent-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-base);
  color: var(--color-text-inverse);
  font-weight: var(--font-weight-semibold);
}

.agent-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.agent-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.order-no {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.order-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-2xl);
}

.order-products {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.product-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-regular);
}

.product-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.order-right {
  flex: 0 0 100px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-xs);
}

.order-amount {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.order-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.order-actions {
  flex: 0 0 80px;
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-xs);
}

.order-actions :deep(.t-button) {
  color: var(--color-text-tertiary);
}

.order-actions :deep(.t-button:hover) {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

/* 页脚 */
.dashboard-footer {
  text-align: center;
  padding: var(--spacing-lg) 0;
}

.dashboard-footer p {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .order-item {
    flex-wrap: wrap;
    gap: var(--spacing-md);
  }

  .order-left {
    flex: 1 1 100%;
  }

  .order-center {
    flex: 1 1 50%;
    padding: 0;
  }

  .order-right {
    flex: 0 0 auto;
  }

  .order-actions {
    flex: 0 0 auto;
  }
}
</style>
