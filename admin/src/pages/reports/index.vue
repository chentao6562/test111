<template>
  <div class="reports-page">
    <!-- 页面标题 -->
    <PageHeader title="报表中心" subtitle="预约数据、销售业绩、分润统计，助力科学决策">
      <template #actions>
        <t-date-range-picker
          v-model="dateRange"
          placeholder="选择日期范围"
          style="width: 280px"
          @change="handleDateChange"
        />
        <t-dropdown :options="exportOptions" @click="handleExport">
          <t-button theme="primary">
            <template #icon><t-icon name="download" /></template>
            导出报表
          </t-button>
        </t-dropdown>
      </template>
    </PageHeader>

    <!-- Tab切换 -->
    <t-tabs v-model="activeTab" @change="handleTabChange">
      <t-tab-panel value="reservation">
        <template #label>
          <t-icon name="calendar" style="margin-right: 4px" />
          预约报表
        </template>
      </t-tab-panel>
      <t-tab-panel value="sales">
        <template #label>
          <t-icon name="trending-up" style="margin-right: 4px" />
          销售报表
        </template>
      </t-tab-panel>
      <t-tab-panel value="commission">
        <template #label>
          <t-icon name="chart-pie" style="margin-right: 4px" />
          分润报表
        </template>
      </t-tab-panel>
      <t-tab-panel value="customer">
        <template #label>
          <t-icon name="user" style="margin-right: 4px" />
          客户报表
        </template>
      </t-tab-panel>
    </t-tabs>

    <!-- 预约报表内容 -->
    <div v-if="activeTab === 'reservation'" class="report-content">
      <!-- 统计卡片 -->
      <div class="stats-grid">
        <StatCard
          label="今日预约"
          :value="reservationStats.todayCount"
          icon="calendar"
          theme="primary"
          :trend="reservationStats.todayGrowth"
          trend-label="较昨日"
          :loading="statsLoading"
        />
        <StatCard
          label="本周预约"
          :value="reservationStats.weekCount"
          icon="calendar"
          theme="warning"
          :trend="reservationStats.weekGrowth"
          trend-label="较上周"
          :loading="statsLoading"
        />
        <StatCard
          label="本月预约"
          :value="reservationStats.monthCount"
          icon="calendar"
          theme="success"
          :trend="reservationStats.monthGrowth"
          trend-label="较上月"
          :loading="statsLoading"
        />
        <StatCard
          label="完成率"
          :value="reservationStats.completionRate + '%'"
          icon="check-circle"
          theme="primary"
          :badge="reservationStats.completionRate >= 80 ? '表现优秀' : '待提升'"
          :badge-theme="reservationStats.completionRate >= 80 ? 'success' : 'warning'"
          :loading="statsLoading"
        />
      </div>

      <!-- 图表区域 -->
      <div class="charts-grid">
        <div class="chart-card chart-large">
          <div class="chart-header">
            <h3>预约趋势 (近30天)</h3>
            <t-select v-model="reservationTrendType" style="width: 120px" size="small">
              <t-option value="count" label="预约数量" />
              <t-option value="amount" label="预约金额" />
            </t-select>
          </div>
          <div class="chart-content">
            <div ref="reservationTrendChartRef" style="width: 100%; height: 300px"></div>
          </div>
        </div>

        <div class="chart-card">
          <h3>预约状态分布</h3>
          <div class="chart-content">
            <div ref="reservationStatusChartRef" style="width: 100%; height: 280px"></div>
          </div>
          <div class="category-legend">
            <div v-for="item in reservationStatusData" :key="item.name" class="legend-item">
              <div class="legend-color" :style="{ background: item.color }"></div>
              <span class="legend-name">{{ item.name }}</span>
              <span class="legend-value">{{ item.count }}单</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 预约明细表 -->
      <TableCard title="预约明细">
        <template #toolbar>
          <t-input
            v-model="searchKeyword"
            placeholder="搜索预约号/客户手机"
            clearable
            style="width: 240px"
            @change="loadReservationDetail"
          >
            <template #prefix-icon>
              <t-icon name="search" />
            </template>
          </t-input>
        </template>

        <t-table
          :data="reservationDetailList"
          :columns="reservationColumns"
          :loading="loading"
          :pagination="pagination"
          row-key="id"
          hover
          @page-change="handlePageChange"
        >
          <template #status="{ row }">
            <StatusTag
              :type="getStatusType(row.status)"
              :text="RESERVATION_STATUSES[row.status]?.label || '未知'"
            />
          </template>
          <template #totalAmount="{ row }">
            <AmountText :value="row.totalAmount" bold />
          </template>
          <template #createdAt="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </t-table>
      </TableCard>
    </div>

    <!-- 销售报表内容 -->
    <div v-if="activeTab === 'sales'" class="report-content">
      <div class="stats-grid">
        <StatCard
          label="本月销售额"
          :value="salesStats.monthAmount"
          icon="money-circle"
          theme="primary"
          prefix="¥"
          :trend="salesStats.amountGrowth"
          trend-label="较上月"
          :loading="salesLoading"
        />
        <StatCard
          label="本月完成订单"
          :value="salesStats.monthCompletedCount"
          icon="shop"
          theme="warning"
          :trend="salesStats.countGrowth"
          trend-label="较上月"
          :loading="salesLoading"
        />
        <StatCard
          label="平均客单价"
          :value="salesStats.avgAmount"
          icon="user"
          theme="primary"
          prefix="¥"
          :loading="salesLoading"
        />
        <StatCard
          label="取消率"
          :value="salesStats.cancelRate + '%'"
          icon="close-circle"
          :theme="salesStats.cancelRate <= 10 ? 'success' : 'warning'"
          :badge="salesStats.cancelRate <= 10 ? '表现良好' : '需要关注'"
          :badge-theme="salesStats.cancelRate <= 10 ? 'success' : 'warning'"
          :loading="salesLoading"
        />
      </div>

      <!-- 图表区域 -->
      <div class="charts-grid">
        <div class="chart-card chart-large">
          <div class="chart-header">
            <h3>销售趋势 (近30天)</h3>
          </div>
          <div class="chart-content">
            <div ref="salesTrendChartRef" style="width: 100%; height: 300px"></div>
          </div>
        </div>

        <div class="chart-card">
          <h3>商品销售排行</h3>
          <div class="chart-content product-ranking">
            <div v-for="(item, index) in productRanking" :key="item.productId" class="ranking-item">
              <span class="ranking-num" :class="{ top: index < 3 }">{{ index + 1 }}</span>
              <span class="ranking-name">{{ item.productName }}</span>
              <span class="ranking-value">{{ item.salesQuantity }}件</span>
            </div>
            <EmptyState v-if="productRanking.length === 0 && !salesLoading" type="data" description="暂无数据" size="small" />
          </div>
        </div>
      </div>

      <!-- 推销员业绩排行 -->
      <TableCard title="推销员业绩排行">
        <t-table
          :data="agentRanking"
          :columns="agentRankingColumns"
          :loading="salesLoading"
          row-key="agentId"
          hover
        >
          <template #rank="{ rowIndex }">
            <span class="ranking-badge" :class="{ gold: rowIndex === 0, silver: rowIndex === 1, bronze: rowIndex === 2 }">
              {{ rowIndex + 1 }}
            </span>
          </template>
          <template #totalAmount="{ row }">
            <AmountText :value="row.totalAmount" bold />
          </template>
          <template #commission="{ row }">
            <AmountText :value="row.commission" />
          </template>
        </t-table>
        <EmptyState v-if="agentRanking.length === 0 && !salesLoading" type="data" description="暂无数据" />
      </TableCard>
    </div>

    <!-- 分润报表内容 -->
    <div v-if="activeTab === 'commission'" class="report-content">
      <div class="stats-grid">
        <StatCard
          label="分润总额"
          :value="commissionStats.totalAmount"
          icon="chart-pie"
          theme="primary"
          prefix="¥"
          :loading="commissionLoading"
        />
        <StatCard
          label="总代利润"
          :value="commissionStats.masterProfit"
          icon="home"
          theme="warning"
          prefix="¥"
          :loading="commissionLoading"
        />
        <StatCard
          label="一级分润"
          :value="commissionStats.level1Profit"
          icon="user-checked"
          theme="success"
          prefix="¥"
          :loading="commissionLoading"
        />
        <StatCard
          label="二级分润"
          :value="commissionStats.level2Profit"
          icon="usergroup"
          theme="primary"
          prefix="¥"
          :loading="commissionLoading"
        />
      </div>

      <!-- 图表区域 -->
      <div class="charts-grid">
        <div class="chart-card chart-large">
          <div class="chart-header">
            <h3>分润趋势 (近30天)</h3>
          </div>
          <div class="chart-content">
            <div ref="commissionTrendChartRef" style="width: 100%; height: 300px"></div>
          </div>
        </div>

        <div class="chart-card">
          <h3>各级分润占比</h3>
          <div class="chart-content">
            <div ref="commissionPieChartRef" style="width: 100%; height: 280px"></div>
          </div>
          <div class="category-legend">
            <div class="legend-item">
              <div class="legend-color" style="background: #f59e0b"></div>
              <span class="legend-name">总代利润</span>
              <span class="legend-value">{{ commissionStats.masterPercent }}%</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #10b981"></div>
              <span class="legend-name">一级分润</span>
              <span class="legend-value">{{ commissionStats.level1Percent }}%</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #3b82f6"></div>
              <span class="legend-name">二级分润</span>
              <span class="legend-value">{{ commissionStats.level2Percent }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 分润明细表 -->
      <TableCard title="分润明细">
        <t-table
          :data="commissionDetailList"
          :columns="commissionColumns"
          :loading="commissionLoading"
          :pagination="commissionPagination"
          row-key="id"
          hover
          @page-change="handleCommissionPageChange"
        >
          <template #salesperson="{ row }">
            <span v-if="row.salesperson">
              {{ row.salesperson.name }}
              <t-tag size="small" :theme="row.salesperson.type === 'LEVEL1' ? 'warning' : row.salesperson.type === 'LEVEL2' ? 'primary' : 'default'" variant="light">
                {{ row.salesperson.type === 'LEVEL1' ? '一级' : row.salesperson.type === 'LEVEL2' ? '二级' : '普通' }}
              </t-tag>
            </span>
            <span v-else class="text-placeholder">-</span>
          </template>
          <template #totalAmount="{ row }">
            <AmountText :value="row.totalAmount" />
          </template>
          <template #masterProfit="{ row }">
            <AmountText :value="row.masterProfit" bold theme="warning" />
          </template>
          <template #level1Profit="{ row }">
            <AmountText :value="row.level1Profit" :bold="row.level1Profit > 0" :theme="row.level1Profit > 0 ? 'success' : 'default'" />
          </template>
          <template #level2Profit="{ row }">
            <AmountText :value="row.level2Profit" :bold="row.level2Profit > 0" :theme="row.level2Profit > 0 ? 'primary' : 'default'" />
          </template>
          <template #completedAt="{ row }">
            {{ formatDateTime(row.completedAt) }}
          </template>
        </t-table>
      </TableCard>
    </div>

    <!-- 客户报表内容 -->
    <div v-if="activeTab === 'customer'" class="report-content">
      <div class="stats-grid">
        <StatCard
          label="客户总数"
          :value="customerStats.totalCount"
          icon="user"
          theme="primary"
          :loading="customerLoading"
        />
        <StatCard
          label="本月新增"
          :value="customerStats.monthNewCount"
          icon="user-add"
          theme="success"
          :trend="customerStats.newGrowth"
          trend-label="较上月"
          :loading="customerLoading"
        />
        <StatCard
          label="高风险客户"
          :value="customerStats.highRiskCount"
          icon="error-circle"
          theme="warning"
          :loading="customerLoading"
        />
        <StatCard
          label="黑名单"
          :value="customerStats.blockedCount"
          icon="close-circle"
          theme="danger"
          :loading="customerLoading"
        />
      </div>

      <!-- 图表区域 -->
      <div class="charts-grid">
        <div class="chart-card chart-large">
          <div class="chart-header">
            <h3>客户增长趋势 (近30天)</h3>
          </div>
          <div class="chart-content">
            <div ref="customerTrendChartRef" style="width: 100%; height: 300px"></div>
          </div>
        </div>

        <div class="chart-card">
          <h3>客户风险分布</h3>
          <div class="chart-content">
            <div ref="customerRiskChartRef" style="width: 100%; height: 280px"></div>
          </div>
          <div class="category-legend">
            <div v-for="item in riskDistribution" :key="item.level" class="legend-item">
              <div class="legend-color" :style="{ background: item.color }"></div>
              <span class="legend-name">{{ item.name }}</span>
              <span class="legend-value">{{ item.count }}人</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 高风险客户列表 -->
      <TableCard title="高风险客户">
        <t-table
          :data="highRiskCustomers"
          :columns="customerColumns"
          :loading="customerLoading"
          row-key="id"
          hover
        >
          <template #riskLevel="{ row }">
            <StatusTag
              :type="getRiskType(row.riskLevel)"
              :text="RISK_LEVELS[row.riskLevel]?.label || '正常'"
            />
          </template>
          <template #phone="{ row }">
            {{ formatPhone(row.phone) }}
          </template>
        </t-table>
        <EmptyState v-if="highRiskCustomers.length === 0 && !customerLoading" type="data" description="暂无高风险客户" />
      </TableCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { MessagePlugin } from 'tdesign-vue-next'
import {
  PageHeader,
  TableCard,
  StatCard,
  StatusTag,
  AmountText,
  EmptyState,
} from '@/components'
import request from '@/api/request'

// 预约状态映射
const RESERVATION_STATUSES: Record<number, { label: string; color: string }> = {
  0: { label: '待确认', color: '#f59e0b' },
  1: { label: '确认中', color: '#3b82f6' },
  2: { label: '已确认', color: '#10b981' },
  3: { label: '已完成', color: '#6b7280' },
  4: { label: '已取消', color: '#9ca3af' },
  5: { label: '已过期', color: '#ef4444' },
  6: { label: '确认失败', color: '#dc2626' },
  7: { label: '待备货', color: '#f59e0b' },
  8: { label: '备货中', color: '#3b82f6' },
  9: { label: '待提货', color: '#10b981' },
}

// 风险等级映射
const RISK_LEVELS: Record<number, { label: string; color: string }> = {
  0: { label: '正常', color: '#10b981' },
  1: { label: '有记录', color: '#3b82f6' },
  2: { label: '高风险', color: '#f59e0b' },
  3: { label: '黑名单', color: '#ef4444' },
}

// 日期范围
const dateRange = ref<string[]>([])

// 导出选项
const exportOptions = [
  { content: '导出预约报表 (CSV)', value: 'reservation' },
  { content: '导出销售报表 (CSV)', value: 'sales' },
  { content: '导出分润报表 (CSV)', value: 'commission' },
  { content: '导出客户报表 (CSV)', value: 'customer' },
]

// Tab
const activeTab = ref('reservation')

// 搜索关键词
const searchKeyword = ref('')

// 加载状态
const loading = ref(false)
const statsLoading = ref(false)
const salesLoading = ref(false)
const commissionLoading = ref(false)
const customerLoading = ref(false)

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

const commissionPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

// ============ 预约报表数据 ============
const reservationStats = ref({
  todayCount: 0,
  weekCount: 0,
  monthCount: 0,
  completionRate: 0,
  todayGrowth: 0,
  weekGrowth: 0,
  monthGrowth: 0
})
const reservationTrendType = ref('count')
const reservationTrendData = ref<any[]>([])
const reservationStatusData = ref<any[]>([])
const reservationDetailList = ref<any[]>([])

// ============ 销售报表数据 ============
const salesStats = ref({
  monthAmount: 0,
  monthCompletedCount: 0,
  avgAmount: 0,
  cancelRate: 0,
  amountGrowth: 0,
  countGrowth: 0
})
const salesTrendData = ref<any[]>([])
const productRanking = ref<any[]>([])
const agentRanking = ref<any[]>([])

// ============ 分润报表数据 ============
const commissionStats = ref({
  totalAmount: 0,
  masterProfit: 0,
  level1Profit: 0,
  level2Profit: 0,
  masterPercent: 0,
  level1Percent: 0,
  level2Percent: 0
})
const commissionTrendData = ref<any[]>([])
const commissionDetailList = ref<any[]>([])

// ============ 客户报表数据 ============
const customerStats = ref({
  totalCount: 0,
  monthNewCount: 0,
  highRiskCount: 0,
  blockedCount: 0,
  newGrowth: 0
})
const customerTrendData = ref<any[]>([])
const riskDistribution = ref<any[]>([])
const highRiskCustomers = ref<any[]>([])

// 图表引用
const reservationTrendChartRef = ref<HTMLElement | null>(null)
const reservationStatusChartRef = ref<HTMLElement | null>(null)
const salesTrendChartRef = ref<HTMLElement | null>(null)
const commissionTrendChartRef = ref<HTMLElement | null>(null)
const commissionPieChartRef = ref<HTMLElement | null>(null)
const customerTrendChartRef = ref<HTMLElement | null>(null)
const customerRiskChartRef = ref<HTMLElement | null>(null)

let reservationTrendChart: echarts.ECharts | null = null
let reservationStatusChart: echarts.ECharts | null = null
let salesTrendChart: echarts.ECharts | null = null
let commissionTrendChart: echarts.ECharts | null = null
let commissionPieChart: echarts.ECharts | null = null
let customerTrendChart: echarts.ECharts | null = null
let customerRiskChart: echarts.ECharts | null = null

// 表格列配置
const reservationColumns = [
  { colKey: 'reservationNo', title: '预约号', width: 160 },
  { colKey: 'customerName', title: '客户姓名', width: 100 },
  { colKey: 'customerPhone', title: '手机号', width: 130 },
  { colKey: 'totalAmount', title: '预约金额', width: 120, align: 'right' as const },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'createdAt', title: '预约时间', width: 160 },
]

const agentRankingColumns = [
  { colKey: 'rank', title: '排名', width: 80 },
  { colKey: 'agentName', title: '推销员', width: 120 },
  { colKey: 'agentPhone', title: '手机号', width: 130 },
  { colKey: 'orderCount', title: '完成订单', width: 100, align: 'right' as const },
  { colKey: 'totalAmount', title: '销售额', width: 120, align: 'right' as const },
  { colKey: 'commission', title: '分润', width: 120, align: 'right' as const },
]

const commissionColumns = [
  { colKey: 'reservationNo', title: '预约号', width: 160 },
  { colKey: 'salesperson', title: '推销员', width: 120, cell: 'salesperson' },
  { colKey: 'totalAmount', title: '预约金额', width: 110, align: 'right' as const, cell: 'totalAmount' },
  { colKey: 'masterProfit', title: '总代利润', width: 110, align: 'right' as const, cell: 'masterProfit' },
  { colKey: 'level1Profit', title: '一级分润', width: 110, align: 'right' as const, cell: 'level1Profit' },
  { colKey: 'level2Profit', title: '二级分润', width: 110, align: 'right' as const, cell: 'level2Profit' },
  { colKey: 'completedAt', title: '完成时间', width: 150, cell: 'completedAt' },
]

const customerColumns = [
  { colKey: 'phone', title: '手机号', width: 130 },
  { colKey: 'name', title: '姓名', width: 100 },
  { colKey: 'noShowCount', title: '爽约次数', width: 100, align: 'right' as const },
  { colKey: 'riskLevel', title: '风险等级', width: 100 },
  { colKey: 'lastReservationDate', title: '最近预约', width: 120 },
]

// 格式化函数
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatPhone = (phone: string) => {
  if (!phone || phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

// 状态类型
const getStatusType = (status: number): string => {
  const map: Record<number, string> = {
    0: 'warning', 1: 'primary', 2: 'success', 3: 'default',
    4: 'default', 5: 'danger', 6: 'danger',
    7: 'warning', 8: 'primary', 9: 'success'
  }
  return map[status] || 'default'
}

const getRiskType = (level: number): string => {
  const map: Record<number, string> = {
    0: 'success', 1: 'primary', 2: 'warning', 3: 'danger'
  }
  return map[level] || 'default'
}

// ============ 数据加载函数 ============

// 加载预约统计
const loadReservationStats = async () => {
  statsLoading.value = true
  try {
    const params: any = {}
    if (dateRange.value?.[0]) params.startDate = dateRange.value[0]
    if (dateRange.value?.[1]) params.endDate = dateRange.value[1]

    const res = await request.get('/admin/reports/reservation/stats', { params })
    if (res.code === 0) {
      reservationStats.value = res.data
    }
  } catch (error) {
    console.error('加载预约统计失败:', error)
  } finally {
    statsLoading.value = false
  }
}

// 加载预约趋势
const loadReservationTrend = async () => {
  try {
    const res = await request.get('/admin/reports/reservation/trend', { params: { days: 30 } })
    if (res.code === 0) {
      reservationTrendData.value = res.data
      await nextTick()
      renderReservationTrendChart()
    }
  } catch (error) {
    console.error('加载预约趋势失败:', error)
  }
}

// 加载预约状态分布
const loadReservationStatus = async () => {
  try {
    const res = await request.get('/admin/reports/reservation/status')
    if (res.code === 0) {
      const statusColors: Record<number, string> = {
        0: '#f59e0b', 1: '#3b82f6', 2: '#10b981', 3: '#6b7280',
        4: '#9ca3af', 5: '#ef4444', 6: '#dc2626',
        7: '#fbbf24', 8: '#60a5fa', 9: '#34d399'
      }
      reservationStatusData.value = res.data.map((item: any) => ({
        ...item,
        name: RESERVATION_STATUSES[item.status]?.label || '未知',
        color: statusColors[item.status] || '#ccc'
      }))
      await nextTick()
      renderReservationStatusChart()
    }
  } catch (error) {
    console.error('加载预约状态分布失败:', error)
  }
}

// 加载预约明细
const loadReservationDetail = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.current,
      pageSize: pagination.pageSize
    }
    if (searchKeyword.value) params.keyword = searchKeyword.value
    if (dateRange.value?.[0]) params.startDate = dateRange.value[0]
    if (dateRange.value?.[1]) params.endDate = dateRange.value[1]

    const res = await request.get('/admin/reservations', { params })
    if (res.code === 0) {
      reservationDetailList.value = res.data.list
      pagination.total = res.data.total
    }
  } catch (error) {
    console.error('加载预约明细失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载销售统计
const loadSalesStats = async () => {
  salesLoading.value = true
  try {
    const params: any = {}
    if (dateRange.value?.[0]) params.startDate = dateRange.value[0]
    if (dateRange.value?.[1]) params.endDate = dateRange.value[1]

    const res = await request.get('/admin/reports/sales/stats', { params })
    if (res.code === 0) {
      salesStats.value = res.data
    }
  } catch (error) {
    console.error('加载销售统计失败:', error)
  } finally {
    salesLoading.value = false
  }
}

// 加载销售趋势
const loadSalesTrend = async () => {
  try {
    const res = await request.get('/admin/reports/sales/trend', { params: { days: 30 } })
    if (res.code === 0) {
      salesTrendData.value = res.data
      await nextTick()
      renderSalesTrendChart()
    }
  } catch (error) {
    console.error('加载销售趋势失败:', error)
  }
}

// 加载商品排行
const loadProductRanking = async () => {
  try {
    const params: any = { limit: 10 }
    if (dateRange.value?.[0]) params.startDate = dateRange.value[0]
    if (dateRange.value?.[1]) params.endDate = dateRange.value[1]

    const res = await request.get('/admin/reports/sales/product-ranking', { params })
    if (res.code === 0) {
      productRanking.value = res.data
    }
  } catch (error) {
    console.error('加载商品排行失败:', error)
  }
}

// 加载推销员排行
const loadAgentRanking = async () => {
  try {
    const params: any = { limit: 10 }
    if (dateRange.value?.[0]) params.startDate = dateRange.value[0]
    if (dateRange.value?.[1]) params.endDate = dateRange.value[1]

    const res = await request.get('/admin/reports/sales/agent-ranking', { params })
    if (res.code === 0) {
      agentRanking.value = res.data
    }
  } catch (error) {
    console.error('加载推销员排行失败:', error)
  }
}

// 加载分润统计
const loadCommissionStats = async () => {
  commissionLoading.value = true
  try {
    const params: any = {}
    if (dateRange.value?.[0]) params.startDate = dateRange.value[0]
    if (dateRange.value?.[1]) params.endDate = dateRange.value[1]

    const res = await request.get('/admin/reports/commission/stats', { params })
    if (res.code === 0) {
      commissionStats.value = res.data
      await nextTick()
      renderCommissionPieChart()
    }
  } catch (error) {
    console.error('加载分润统计失败:', error)
  } finally {
    commissionLoading.value = false
  }
}

// 加载分润趋势
const loadCommissionTrend = async () => {
  try {
    const res = await request.get('/admin/reports/commission/trend', { params: { days: 30 } })
    if (res.code === 0) {
      commissionTrendData.value = res.data
      await nextTick()
      renderCommissionTrendChart()
    }
  } catch (error) {
    console.error('加载分润趋势失败:', error)
  }
}

// 加载分润明细
const loadCommissionDetail = async () => {
  try {
    const params: any = {
      page: commissionPagination.current,
      pageSize: commissionPagination.pageSize
    }
    if (dateRange.value?.[0]) params.startDate = dateRange.value[0]
    if (dateRange.value?.[1]) params.endDate = dateRange.value[1]

    const res = await request.get('/admin/reports/commission/list', { params })
    if (res.code === 0) {
      commissionDetailList.value = res.data.list
      commissionPagination.total = res.data.total
    }
  } catch (error) {
    console.error('加载分润明细失败:', error)
  }
}

// 加载客户统计
const loadCustomerStats = async () => {
  customerLoading.value = true
  try {
    const res = await request.get('/admin/reports/customer/stats')
    if (res.code === 0) {
      customerStats.value = res.data
    }
  } catch (error) {
    console.error('加载客户统计失败:', error)
  } finally {
    customerLoading.value = false
  }
}

// 加载客户趋势
const loadCustomerTrend = async () => {
  try {
    const res = await request.get('/admin/reports/customer/trend', { params: { days: 30 } })
    if (res.code === 0) {
      customerTrendData.value = res.data
      await nextTick()
      renderCustomerTrendChart()
    }
  } catch (error) {
    console.error('加载客户趋势失败:', error)
  }
}

// 加载风险分布
const loadRiskDistribution = async () => {
  try {
    const res = await request.get('/admin/reports/customer/risk-distribution')
    if (res.code === 0) {
      const riskColors: Record<number, string> = {
        0: '#10b981', 1: '#3b82f6', 2: '#f59e0b', 3: '#ef4444'
      }
      riskDistribution.value = res.data.map((item: any) => ({
        ...item,
        name: RISK_LEVELS[item.level]?.label || '未知',
        color: riskColors[item.level] || '#ccc'
      }))
      await nextTick()
      renderCustomerRiskChart()
    }
  } catch (error) {
    console.error('加载风险分布失败:', error)
  }
}

// 加载高风险客户
const loadHighRiskCustomers = async () => {
  try {
    const res = await request.get('/admin/customers', {
      params: { page: 1, pageSize: 20, minRiskLevel: 2 }
    })
    if (res.code === 0) {
      highRiskCustomers.value = res.data.list
    }
  } catch (error) {
    console.error('加载高风险客户失败:', error)
  }
}

// ============ 图表渲染函数 ============

const renderReservationTrendChart = () => {
  if (!reservationTrendChartRef.value) return
  if (!reservationTrendChart) {
    reservationTrendChart = echarts.init(reservationTrendChartRef.value)
  }

  const dates = reservationTrendData.value.map(item => item.date?.slice(5) || '')
  const values = reservationTrendData.value.map(item =>
    reservationTrendType.value === 'amount' ? item.amount : item.count
  )

  reservationTrendChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#e5e5e5' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#666' }
    },
    series: [{
      data: values,
      type: 'line',
      smooth: true,
      lineStyle: { color: '#3b82f6', width: 3 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
          { offset: 1, color: 'rgba(59, 130, 246, 0)' }
        ])
      },
      itemStyle: { color: '#3b82f6' }
    }]
  })
}

const renderReservationStatusChart = () => {
  if (!reservationStatusChartRef.value) return
  if (!reservationStatusChart) {
    reservationStatusChart = echarts.init(reservationStatusChartRef.value)
  }

  reservationStatusChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}单 ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['50%', '70%'],
      avoidLabelOverlap: false,
      label: { show: false },
      data: reservationStatusData.value.map(item => ({
        name: item.name,
        value: item.count,
        itemStyle: { color: item.color }
      }))
    }]
  })
}

const renderSalesTrendChart = () => {
  if (!salesTrendChartRef.value) return
  if (!salesTrendChart) {
    salesTrendChart = echarts.init(salesTrendChartRef.value)
  }

  const dates = salesTrendData.value.map(item => item.date?.slice(5) || '')
  const amounts = salesTrendData.value.map(item => item.amount || 0)

  salesTrendChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#e5e5e5' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#666' }
    },
    series: [{
      data: amounts,
      type: 'line',
      smooth: true,
      lineStyle: { color: '#10b981', width: 3 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
          { offset: 1, color: 'rgba(16, 185, 129, 0)' }
        ])
      },
      itemStyle: { color: '#10b981' }
    }]
  })
}

const renderCommissionTrendChart = () => {
  if (!commissionTrendChartRef.value) return
  if (!commissionTrendChart) {
    commissionTrendChart = echarts.init(commissionTrendChartRef.value)
  }

  const dates = commissionTrendData.value.map(item => item.date?.slice(5) || '')
  const amounts = commissionTrendData.value.map(item => item.amount || 0)

  commissionTrendChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#e5e5e5' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#666' }
    },
    series: [{
      data: amounts,
      type: 'line',
      smooth: true,
      lineStyle: { color: '#f59e0b', width: 3 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
          { offset: 1, color: 'rgba(245, 158, 11, 0)' }
        ])
      },
      itemStyle: { color: '#f59e0b' }
    }]
  })
}

const renderCommissionPieChart = () => {
  if (!commissionPieChartRef.value) return
  if (!commissionPieChart) {
    commissionPieChart = echarts.init(commissionPieChartRef.value)
  }

  commissionPieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['50%', '70%'],
      avoidLabelOverlap: false,
      label: { show: false },
      data: [
        { name: '总代利润', value: commissionStats.value.masterProfit, itemStyle: { color: '#f59e0b' } },
        { name: '一级分润', value: commissionStats.value.level1Profit, itemStyle: { color: '#10b981' } },
        { name: '二级分润', value: commissionStats.value.level2Profit, itemStyle: { color: '#3b82f6' } },
      ]
    }]
  })
}

const renderCustomerTrendChart = () => {
  if (!customerTrendChartRef.value) return
  if (!customerTrendChart) {
    customerTrendChart = echarts.init(customerTrendChartRef.value)
  }

  const dates = customerTrendData.value.map(item => item.date?.slice(5) || '')
  const counts = customerTrendData.value.map(item => item.count || 0)

  customerTrendChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#e5e5e5' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#666' }
    },
    series: [{
      data: counts,
      type: 'bar',
      barWidth: '60%',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#3b82f6' },
          { offset: 1, color: '#93c5fd' }
        ])
      }
    }]
  })
}

const renderCustomerRiskChart = () => {
  if (!customerRiskChartRef.value) return
  if (!customerRiskChart) {
    customerRiskChart = echarts.init(customerRiskChartRef.value)
  }

  customerRiskChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['50%', '70%'],
      avoidLabelOverlap: false,
      label: { show: false },
      data: riskDistribution.value.map(item => ({
        name: item.name,
        value: item.count,
        itemStyle: { color: item.color }
      }))
    }]
  })
}

// ============ 事件处理 ============

const handleTabChange = () => {
  switch (activeTab.value) {
    case 'reservation':
      loadReservationStats()
      loadReservationTrend()
      loadReservationStatus()
      loadReservationDetail()
      break
    case 'sales':
      loadSalesStats()
      loadSalesTrend()
      loadProductRanking()
      loadAgentRanking()
      break
    case 'commission':
      loadCommissionStats()
      loadCommissionTrend()
      loadCommissionDetail()
      break
    case 'customer':
      loadCustomerStats()
      loadCustomerTrend()
      loadRiskDistribution()
      loadHighRiskCustomers()
      break
  }
}

const handleDateChange = () => {
  handleTabChange()
}

const handlePageChange = (pageInfo: { current: number; pageSize: number }) => {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  loadReservationDetail()
}

const handleCommissionPageChange = (pageInfo: { current: number; pageSize: number }) => {
  commissionPagination.current = pageInfo.current
  commissionPagination.pageSize = pageInfo.pageSize
  loadCommissionDetail()
}

// 监听趋势类型变化
watch(reservationTrendType, () => {
  renderReservationTrendChart()
})

// 下载CSV
const downloadCSV = (content: string, filename: string) => {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 导出报表
const handleExport = async (data: { value: string }) => {
  MessagePlugin.loading('正在生成报表...')
  const dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')

  try {
    let csvContent = ''
    let filename = ''

    switch (data.value) {
      case 'reservation':
        csvContent = await exportReservationReport()
        filename = `预约报表_${dateStr}.csv`
        break
      case 'sales':
        csvContent = await exportSalesReport()
        filename = `销售报表_${dateStr}.csv`
        break
      case 'commission':
        csvContent = await exportCommissionReport()
        filename = `分润报表_${dateStr}.csv`
        break
      case 'customer':
        csvContent = await exportCustomerReport()
        filename = `客户报表_${dateStr}.csv`
        break
    }

    if (csvContent) {
      downloadCSV(csvContent, filename)
      MessagePlugin.closeAll()
      MessagePlugin.success('导出成功')
    }
  } catch (error) {
    MessagePlugin.closeAll()
    MessagePlugin.error('导出失败')
    console.error('导出失败:', error)
  }
}

const exportReservationReport = async () => {
  const res = await request.get('/admin/reservations', {
    params: { page: 1, pageSize: 9999 }
  })
  if (res.code !== 0) throw new Error('获取数据失败')

  const headers = ['预约号', '客户姓名', '手机号', '预约金额', '状态', '预约时间']
  const rows = res.data.list.map((item: any) => [
    item.reservationNo,
    item.customerName,
    item.customerPhone,
    item.totalAmount,
    RESERVATION_STATUSES[item.status]?.label || '未知',
    formatDateTime(item.createdAt)
  ])

  return [headers.join(','), ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))].join('\n')
}

const exportSalesReport = async () => {
  const headers = ['指标', '数值']
  const rows = [
    ['本月销售额', `¥${salesStats.value.monthAmount}`],
    ['本月完成订单', salesStats.value.monthCompletedCount],
    ['平均客单价', `¥${salesStats.value.avgAmount}`],
    ['取消率', `${salesStats.value.cancelRate}%`],
  ]
  return [headers.join(','), ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))].join('\n')
}

const exportCommissionReport = async () => {
  const res = await request.get('/admin/reports/commission/list', {
    params: { page: 1, pageSize: 9999 }
  })
  if (res.code !== 0) throw new Error('获取数据失败')

  const headers = ['推销员', '关联预约', '金额', '类型', '入账时间']
  const rows = res.data.list.map((item: any) => [
    item.agentName,
    item.reservationNo,
    item.amount,
    item.type === 'PROFIT' ? '利润' : '奖励',
    formatDateTime(item.createdAt)
  ])

  return [headers.join(','), ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))].join('\n')
}

const exportCustomerReport = async () => {
  const res = await request.get('/admin/customers', {
    params: { page: 1, pageSize: 9999 }
  })
  if (res.code !== 0) throw new Error('获取数据失败')

  const headers = ['手机号', '姓名', '爽约次数', '风险等级']
  const rows = res.data.list.map((item: any) => [
    item.phone,
    item.name || '-',
    item.noShowCount,
    RISK_LEVELS[item.riskLevel]?.label || '正常'
  ])

  return [headers.join(','), ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))].join('\n')
}

// 窗口大小变化
function handleResize() {
  reservationTrendChart?.resize()
  reservationStatusChart?.resize()
  salesTrendChart?.resize()
  commissionTrendChart?.resize()
  commissionPieChart?.resize()
  customerTrendChart?.resize()
  customerRiskChart?.resize()
}

onMounted(async () => {
  // 默认加载预约报表
  await loadReservationStats()
  await loadReservationTrend()
  await loadReservationStatus()
  await loadReservationDetail()

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  reservationTrendChart?.dispose()
  reservationStatusChart?.dispose()
  salesTrendChart?.dispose()
  commissionTrendChart?.dispose()
  commissionPieChart?.dispose()
  customerTrendChart?.dispose()
  customerRiskChart?.dispose()
})
</script>

<style scoped>
.reports-page {
  max-width: var(--content-max-width);
  margin: 0 auto;
}

.report-content {
  margin-top: var(--spacing-2xl);
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

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

/* 图表网格 */
.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--spacing-lg);
}

@media (max-width: 1200px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-2xl);
  border: 1px solid var(--color-border-light);
}

.chart-card h3 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-xl) 0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.chart-header h3 {
  margin: 0;
}

.chart-content {
  width: 100%;
}

/* 品类图例 */
.category-legend {
  margin-top: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-name {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.legend-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

/* 商品排行 */
.product-ranking {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  max-height: 280px;
  overflow-y: auto;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-page);
  border-radius: var(--radius-md);
}

.ranking-num {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  background: var(--color-bg-hover);
  color: var(--color-text-secondary);
}

.ranking-num.top {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
}

.ranking-name {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

/* 排名徽章 */
.ranking-badge {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  background: var(--color-bg-hover);
  color: var(--color-text-secondary);
}

.ranking-badge.gold {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #fff;
}

.ranking-badge.silver {
  background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
  color: #fff;
}

.ranking-badge.bronze {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  color: #fff;
}

/* Tabs样式 */
:deep(.t-tabs__nav) {
  background: var(--color-bg-card);
  padding: 0 var(--spacing-2xl);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  border: 1px solid var(--color-border-light);
  border-bottom: none;
}
</style>
