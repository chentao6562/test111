<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon sales">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ formatMoney(stats.todaySales) }}</div>
              <div class="stat-label">今日销售额</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon orders">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.todayOrders }}</div>
              <div class="stat-label">今日订单数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon agents">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.todayAgents }}</div>
              <div class="stat-label">今日新增代理</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon pending">
              <el-icon><Bell /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingOrders }}</div>
              <div class="stat-label">待处理订单</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="main-content">
      <!-- 销售趋势图 -->
      <el-col :span="16">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span>销售趋势</span>
              <el-radio-group v-model="chartDays" size="small" @change="fetchChartData">
                <el-radio-button :value="7">近7天</el-radio-button>
                <el-radio-button :value="30">近30天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="chartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 待办事项 -->
      <el-col :span="8">
        <el-card shadow="hover" class="todo-card">
          <template #header>
            <span>待办事项</span>
          </template>
          <div class="todo-list">
            <div
              v-for="item in todos"
              :key="item.type"
              class="todo-item"
              @click="handleTodoClick(item)"
            >
              <div class="todo-info">
                <el-badge :value="item.count" :max="99" type="danger">
                  <span class="todo-label">{{ item.label }}</span>
                </el-badge>
              </div>
              <el-icon><ArrowRight /></el-icon>
            </div>
            <el-empty v-if="todos.length === 0" description="暂无待办事项" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷入口 -->
    <el-row :gutter="20" class="quick-entry">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <span>快捷入口</span>
          </template>
          <div class="entry-list">
            <div class="entry-item" @click="$router.push('/order')">
              <el-icon class="entry-icon"><Document /></el-icon>
              <span>订单管理</span>
            </div>
            <div class="entry-item" @click="$router.push('/product')">
              <el-icon class="entry-icon"><Goods /></el-icon>
              <span>商品管理</span>
            </div>
            <div class="entry-item" @click="$router.push('/agent')">
              <el-icon class="entry-icon"><User /></el-icon>
              <span>代理商管理</span>
            </div>
            <div class="entry-item" @click="$router.push('/inventory')">
              <el-icon class="entry-icon"><Box /></el-icon>
              <span>库存管理</span>
            </div>
            <div class="entry-item" @click="$router.push('/withdrawal')">
              <el-icon class="entry-icon"><Money /></el-icon>
              <span>提现审核</span>
            </div>
            <div class="entry-item" @click="$router.push('/system')">
              <el-icon class="entry-icon"><Setting /></el-icon>
              <span>系统配置</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import {
  Money,
  Document,
  User,
  Bell,
  ArrowRight,
  Goods,
  Box,
  Setting,
} from '@element-plus/icons-vue'
import { getDashboardStats, getDashboardChart, getDashboardTodos } from '@/api/dashboard'

const router = useRouter()

interface Stats {
  todaySales: number
  todayOrders: number
  todayAgents: number
  pendingOrders: number
  pendingAgents: number
  pendingWithdrawals: number
  warningStock: number
  pendingTransfers: number
}

interface Todo {
  type: string
  count: number
  label: string
}

const stats = ref<Stats>({
  todaySales: 0,
  todayOrders: 0,
  todayAgents: 0,
  pendingOrders: 0,
  pendingAgents: 0,
  pendingWithdrawals: 0,
  warningStock: 0,
  pendingTransfers: 0,
})

const todos = ref<Todo[]>([])
const chartDays = ref(7)
const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

const formatMoney = (value: number) => {
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const fetchStats = async () => {
  try {
    const res = await getDashboardStats()
    if (res.data) {
      stats.value = res.data
    }
  } catch (error) {
    console.error('获取统计数据失败', error)
  }
}

const fetchTodos = async () => {
  try {
    const res = await getDashboardTodos()
    if (res.data) {
      todos.value = res.data
    }
  } catch (error) {
    console.error('获取待办事项失败', error)
  }
}

const fetchChartData = async () => {
  try {
    const res = await getDashboardChart(chartDays.value)
    if (res.data?.salesTrend) {
      updateChart(res.data.salesTrend)
    }
  } catch (error) {
    console.error('获取图表数据失败', error)
  }
}

const updateChart = (data: { date: string; sales: number; orders: number }[]) => {
  if (!chartInstance) return

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
    },
    legend: {
      data: ['销售额', '订单数'],
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.date),
    },
    yAxis: [
      {
        type: 'value',
        name: '销售额(元)',
        position: 'left',
      },
      {
        type: 'value',
        name: '订单数',
        position: 'right',
      },
    ],
    series: [
      {
        name: '销售额',
        type: 'line',
        smooth: true,
        data: data.map((item) => item.sales),
        itemStyle: {
          color: '#409eff',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' },
          ]),
        },
      },
      {
        name: '订单数',
        type: 'bar',
        yAxisIndex: 1,
        data: data.map((item) => item.orders),
        itemStyle: {
          color: '#67c23a',
        },
      },
    ],
  }

  chartInstance.setOption(option)
}

const initChart = () => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    window.addEventListener('resize', handleResize)
  }
}

const handleResize = () => {
  chartInstance?.resize()
}

const handleTodoClick = (item: Todo) => {
  const routeMap: Record<string, string> = {
    agent_audit: '/agent',
    order_prepare: '/order',
    withdrawal_audit: '/withdrawal',
    transfer_assign: '/transfer',
  }
  const path = routeMap[item.type]
  if (path) {
    router.push(path)
  }
}

onMounted(() => {
  initChart()
  fetchStats()
  fetchTodos()
  fetchChartData()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style lang="scss" scoped>
.dashboard {
  .stat-cards {
    margin-bottom: 20px;

    .stat-card {
      .stat-content {
        display: flex;
        align-items: center;

        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          color: #fff;
          margin-right: 16px;

          &.sales {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          &.orders {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }

          &.agents {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          }

          &.pending {
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
          }
        }

        .stat-info {
          .stat-value {
            font-size: 24px;
            font-weight: 600;
            color: #333;
          }

          .stat-label {
            font-size: 14px;
            color: #999;
            margin-top: 4px;
          }
        }
      }
    }
  }

  .main-content {
    margin-bottom: 20px;

    .chart-card {
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .chart-container {
        height: 350px;
      }
    }

    .todo-card {
      .todo-list {
        .todo-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
          transition: background-color 0.3s;

          &:hover {
            background-color: #f5f7fa;
          }

          &:last-child {
            border-bottom: none;
          }

          .todo-label {
            font-size: 14px;
            color: #333;
          }
        }
      }
    }
  }

  .quick-entry {
    .entry-list {
      display: flex;
      flex-wrap: wrap;

      .entry-item {
        width: 16.66%;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px 0;
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          background-color: #f5f7fa;

          .entry-icon {
            transform: scale(1.1);
            color: #409eff;
          }
        }

        .entry-icon {
          font-size: 32px;
          color: #666;
          margin-bottom: 8px;
          transition: all 0.3s;
        }

        span {
          font-size: 14px;
          color: #333;
        }
      }
    }
  }
}
</style>
