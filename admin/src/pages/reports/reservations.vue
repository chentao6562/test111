<template>
  <div class="reservation-report-page">
    <!-- 页面标题 -->
    <PageHeader title="预约统计报表" subtitle="查看预约数据分析、趋势图表和推销员排行">
      <template #actions>
        <t-date-range-picker
          v-model="dateRange"
          :placeholder="['开始日期', '结束日期']"
          style="width: 260px"
          @change="handleDateChange"
        />
        <t-button theme="primary" @click="loadReport">
          <template #icon><t-icon name="refresh" /></template>
          刷新数据
        </t-button>
      </template>
    </PageHeader>

    <!-- 核心指标卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon total">
          <t-icon name="file-paste" size="28px" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ report?.summary?.totalReservations || 0 }}</div>
          <div class="stat-label">总预约数</div>
          <div class="stat-change" :class="{ positive: parseFloat(report?.summary?.countChange || '0') > 0 }">
            {{ parseFloat(report?.summary?.countChange || '0') >= 0 ? '+' : '' }}{{ report?.summary?.countChange || '0' }}%
            <span class="change-text">环比</span>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon completed">
          <t-icon name="check-circle" size="28px" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ report?.summary?.completedReservations || 0 }}</div>
          <div class="stat-label">完成数</div>
          <div class="stat-change" :class="{ positive: parseFloat(report?.summary?.completedChange || '0') > 0 }">
            {{ parseFloat(report?.summary?.completedChange || '0') >= 0 ? '+' : '' }}{{ report?.summary?.completedChange || '0' }}%
            <span class="change-text">环比</span>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon amount">
          <t-icon name="money-circle" size="28px" />
        </div>
        <div class="stat-content">
          <div class="stat-value">¥{{ formatAmount(report?.summary?.completedAmount) }}</div>
          <div class="stat-label">成交金额</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon rate">
          <t-icon name="trending-up" size="28px" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ report?.summary?.conversionRate || '0' }}%</div>
          <div class="stat-label">转化率</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-row">
      <!-- 趋势图 -->
      <div class="chart-card trend-chart">
        <div class="chart-header">
          <h3 class="chart-title">预约趋势</h3>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-dot count"></span>预约数</span>
            <span class="legend-item"><span class="legend-dot completed"></span>完成数</span>
          </div>
        </div>
        <div class="chart-body" ref="trendChartRef"></div>
      </div>

      <!-- 状态分布饼图 -->
      <div class="chart-card pie-chart">
        <div class="chart-header">
          <h3 class="chart-title">状态分布</h3>
        </div>
        <div class="chart-body" ref="statusChartRef"></div>
        <div class="status-summary">
          <div class="status-item">
            <span class="status-dot pending"></span>
            <span class="status-label">待确认</span>
            <span class="status-value">{{ report?.statusDistribution?.pending || 0 }}</span>
          </div>
          <div class="status-item">
            <span class="status-dot confirmed"></span>
            <span class="status-label">已确认</span>
            <span class="status-value">{{ report?.statusDistribution?.confirmed || 0 }}</span>
          </div>
          <div class="status-item">
            <span class="status-dot completed"></span>
            <span class="status-label">已完成</span>
            <span class="status-value">{{ report?.statusDistribution?.completed || 0 }}</span>
          </div>
          <div class="status-item">
            <span class="status-dot cancelled"></span>
            <span class="status-label">已取消</span>
            <span class="status-value">{{ report?.statusDistribution?.cancelled || 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 推销员排行榜 -->
    <TableCard title="推销员排行榜 TOP 10">
      <template v-if="!loading && (!report?.salespersonRanking || report.salespersonRanking.length === 0)">
        <EmptyState
          type="data"
          title="暂无数据"
          description="该时间段内没有推销员预约数据"
        />
      </template>
      <t-table
        v-else
        :data="report?.salespersonRanking || []"
        :columns="rankingColumns"
        :loading="loading"
        row-key="id"
        hover
        stripe
      >
        <!-- 排名 -->
        <template #rank="{ rowIndex }">
          <div class="rank-cell" :class="{ top3: rowIndex < 3 }">
            <span v-if="rowIndex === 0" class="rank-badge gold">1</span>
            <span v-else-if="rowIndex === 1" class="rank-badge silver">2</span>
            <span v-else-if="rowIndex === 2" class="rank-badge bronze">3</span>
            <span v-else class="rank-num">{{ rowIndex + 1 }}</span>
          </div>
        </template>

        <!-- 推销员信息 -->
        <template #salesperson="{ row }">
          <div class="salesperson-cell">
            <span class="salesperson-name">{{ row.name }}</span>
            <span class="salesperson-phone">{{ row.phone }}</span>
          </div>
        </template>

        <!-- 预约数量 -->
        <template #count="{ row }">
          <span class="count-text">{{ row.count }} 单</span>
        </template>

        <!-- 预约金额 -->
        <template #amount="{ row }">
          <AmountText :value="row.amount" />
        </template>

        <!-- 获得利润 -->
        <template #profit="{ row }">
          <span class="profit-text">¥{{ row.profit.toFixed(2) }}</span>
        </template>
      </t-table>
    </TableCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import TableCard from '@/components/TableCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import AmountText from '@/components/AmountText.vue'
import request from '@/api/request'

// 日期范围
const dateRange = ref<string[]>([])

// 报表数据
const report = ref<any>(null)
const loading = ref(false)

// 图表DOM引用
const trendChartRef = ref<HTMLElement | null>(null)
const statusChartRef = ref<HTMLElement | null>(null)

// 排行榜列配置
const rankingColumns = [
  { colKey: 'rank', title: '排名', width: 80, align: 'center' },
  { colKey: 'salesperson', title: '推销员', width: 200 },
  { colKey: 'count', title: '预约数', width: 120, align: 'center' },
  { colKey: 'amount', title: '预约金额', width: 150, align: 'right' },
  { colKey: 'profit', title: '获得利润', width: 150, align: 'right' },
]

// 格式化金额
const formatAmount = (amount: string | number | undefined) => {
  if (!amount) return '0.00'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 加载报表数据
const loadReport = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (dateRange.value?.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const res = await request.get('/admin/reservations/report', { params })
    report.value = res.data

    // 延迟渲染图表
    await nextTick()
    renderTrendChart()
    renderStatusChart()
  } catch (error: any) {
    console.error('加载报表失败:', error)
    MessagePlugin.error('加载报表失败')
  } finally {
    loading.value = false
  }
}

// 日期变化
const handleDateChange = () => {
  loadReport()
}

// 渲染趋势图（简单的Canvas实现）
const renderTrendChart = () => {
  if (!trendChartRef.value || !report.value?.trend?.length) return

  const container = trendChartRef.value
  container.innerHTML = ''

  const canvas = document.createElement('canvas')
  canvas.width = container.clientWidth
  canvas.height = 280
  container.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const data = report.value.trend
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const chartWidth = canvas.width - padding.left - padding.right
  const chartHeight = canvas.height - padding.top - padding.bottom

  // 找出最大值
  const maxCount = Math.max(...data.map((d: any) => d.count), 1)
  const maxCompleted = Math.max(...data.map((d: any) => d.completed), 1)
  const maxValue = Math.max(maxCount, maxCompleted)

  // 绘制网格线
  ctx.strokeStyle = '#eee'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(canvas.width - padding.right, y)
    ctx.stroke()

    // 刻度标签
    ctx.fillStyle = '#999'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(Math.round(maxValue * (5 - i) / 5).toString(), padding.left - 10, y + 4)
  }

  // 绘制预约数折线
  if (data.length > 1) {
    ctx.beginPath()
    ctx.strokeStyle = '#2196F3'
    ctx.lineWidth = 2
    data.forEach((d: any, i: number) => {
      const x = padding.left + (chartWidth / (data.length - 1)) * i
      const y = padding.top + chartHeight - (d.count / maxValue) * chartHeight
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // 绘制完成数折线
    ctx.beginPath()
    ctx.strokeStyle = '#4CAF50'
    ctx.lineWidth = 2
    data.forEach((d: any, i: number) => {
      const x = padding.left + (chartWidth / (data.length - 1)) * i
      const y = padding.top + chartHeight - (d.completed / maxValue) * chartHeight
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()
  }

  // 绘制X轴标签
  ctx.fillStyle = '#666'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  const labelInterval = Math.ceil(data.length / 7)
  data.forEach((d: any, i: number) => {
    if (i % labelInterval === 0 || i === data.length - 1) {
      const x = padding.left + (chartWidth / (data.length - 1)) * i
      ctx.fillText(d.date.slice(5), x, canvas.height - 10)
    }
  })
}

// 渲染状态分布饼图（简单Canvas实现）
const renderStatusChart = () => {
  if (!statusChartRef.value || !report.value?.statusDistribution) return

  const container = statusChartRef.value
  container.innerHTML = ''

  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 200
  container.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dist = report.value.statusDistribution
  const total = (dist.pending || 0) + (dist.confirmed || 0) + (dist.completed || 0) + (dist.cancelled || 0) + (dist.expired || 0)

  if (total === 0) {
    // 绘制空状态
    ctx.fillStyle = '#f0f0f0'
    ctx.beginPath()
    ctx.arc(100, 100, 70, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#999'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('暂无数据', 100, 105)
    return
  }

  const colors = ['#FF9800', '#2196F3', '#4CAF50', '#9E9E9E', '#F44336']
  const values = [dist.pending || 0, dist.confirmed || 0, dist.completed || 0, dist.cancelled || 0, dist.expired || 0]

  let startAngle = -Math.PI / 2
  values.forEach((value, i) => {
    if (value > 0) {
      const sliceAngle = (value / total) * Math.PI * 2
      ctx.fillStyle = colors[i]
      ctx.beginPath()
      ctx.moveTo(100, 100)
      ctx.arc(100, 100, 70, startAngle, startAngle + sliceAngle)
      ctx.closePath()
      ctx.fill()
      startAngle += sliceAngle
    }
  })

  // 中心白圆
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(100, 100, 40, 0, Math.PI * 2)
  ctx.fill()

  // 中心文字
  ctx.fillStyle = '#333'
  ctx.font = 'bold 20px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(total.toString(), 100, 105)
}

// 初始化
onMounted(() => {
  // 默认最近30天
  const end = new Date()
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  dateRange.value = [
    start.toISOString().split('T')[0],
    end.toISOString().split('T')[0],
  ]
  loadReport()
})
</script>

<style scoped lang="less">
.reservation-report-page {
  padding: 0;
}

// 核心指标卡片
.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  .stat-icon {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    color: #fff;

    &.total {
      background: linear-gradient(135deg, #2196F3, #64B5F6);
    }
    &.completed {
      background: linear-gradient(135deg, #4CAF50, #81C784);
    }
    &.amount {
      background: linear-gradient(135deg, #E53935, #FF6B6B);
    }
    &.rate {
      background: linear-gradient(135deg, #FF9800, #FFB74D);
    }
  }

  .stat-content {
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #333;
      line-height: 1.2;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
    .stat-change {
      font-size: 12px;
      color: #F44336;
      margin-top: 4px;

      &.positive {
        color: #4CAF50;
      }

      .change-text {
        margin-left: 4px;
        color: #999;
      }
    }
  }
}

// 图表区域
.charts-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.chart-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 20px;

  &.trend-chart {
    flex: 2;
  }

  &.pie-chart {
    flex: 1;
    min-width: 280px;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .chart-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin: 0;
    }

    .chart-legend {
      display: flex;
      gap: 16px;

      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #666;

        .legend-dot {
          width: 12px;
          height: 3px;
          border-radius: 2px;

          &.count {
            background: #2196F3;
          }
          &.completed {
            background: #4CAF50;
          }
        }
      }
    }
  }

  .chart-body {
    height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .status-summary {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #eee;

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;

      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;

        &.pending { background: #FF9800; }
        &.confirmed { background: #2196F3; }
        &.completed { background: #4CAF50; }
        &.cancelled { background: #9E9E9E; }
      }

      .status-label {
        flex: 1;
        font-size: 13px;
        color: #666;
      }

      .status-value {
        font-size: 14px;
        font-weight: 600;
        color: #333;
      }
    }
  }
}

// 排行榜
.rank-cell {
  display: flex;
  justify-content: center;

  .rank-badge {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #fff;

    &.gold { background: linear-gradient(135deg, #FFD700, #FFA500); }
    &.silver { background: linear-gradient(135deg, #C0C0C0, #A9A9A9); }
    &.bronze { background: linear-gradient(135deg, #CD7F32, #8B4513); }
  }

  .rank-num {
    font-size: 14px;
    color: #666;
  }
}

.salesperson-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .salesperson-name {
    font-weight: 500;
    color: #333;
  }

  .salesperson-phone {
    font-size: 12px;
    color: #999;
  }
}

.count-text {
  color: #2196F3;
  font-weight: 500;
}

.profit-text {
  color: #4CAF50;
  font-weight: 600;
}
</style>
