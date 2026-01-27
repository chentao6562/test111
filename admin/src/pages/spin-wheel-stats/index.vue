<script setup lang="ts">
/**
 * 大转盘数据分析报表页面
 * @since 2026-01-23
 */
import { ref, onMounted, computed } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import {
  getStats,
  getConfigList,
  getParticipationList,
  type SpinWheelStats,
  type SpinWheelConfig,
  type Participation
} from '@/api/spinWheel'

// 统计数据
const stats = ref<SpinWheelStats | null>(null)
const loading = ref(false)

// 配置列表
const configs = ref<SpinWheelConfig[]>([])
const selectedConfigId = ref<number | null>(null)

// 参与列表（最近）
const recentParticipations = ref<Participation[]>([])

// 日期范围
const dateRange = ref<string[]>([])

// 核心指标卡片数据
const overviewCards = computed(() => {
  if (!stats.value) return []
  return [
    {
      title: '总参与人数',
      value: stats.value.overview.totalParticipants,
      icon: 'user',
      color: '#1976d2',
      trend: stats.value.today.participants,
      trendLabel: '今日新增'
    },
    {
      title: '总抽奖次数',
      value: stats.value.overview.totalSpins,
      icon: 'rotation',
      color: '#f57c00',
      trend: stats.value.today.spins,
      trendLabel: '今日抽奖'
    },
    {
      title: '总助力次数',
      value: stats.value.overview.totalHelps,
      icon: 'heart',
      color: '#e91e63',
      trend: stats.value.today.helps,
      trendLabel: '今日助力'
    },
    {
      title: '总兑换金额',
      value: `¥${stats.value.overview.totalRedeemedAmount.toFixed(2)}`,
      icon: 'money-circle',
      color: '#4caf50',
      trend: stats.value.overview.totalRedeems,
      trendLabel: '兑换次数'
    }
  ]
})

// 转化漏斗数据
const funnelData = computed(() => {
  if (!stats.value) return []
  const { totalParticipants, totalSpins, totalHelps, totalRedeems } = stats.value.overview
  return [
    { name: '参与人数', value: totalParticipants, rate: '100%' },
    { name: '抽奖次数', value: totalSpins, rate: totalParticipants ? `${((totalSpins / totalParticipants) * 100).toFixed(1)}%` : '0%' },
    { name: '获得助力', value: totalHelps, rate: totalParticipants ? `${((totalHelps / totalParticipants) * 100).toFixed(1)}%` : '0%' },
    { name: '成功兑换', value: totalRedeems, rate: totalParticipants ? `${((totalRedeems / totalParticipants) * 100).toFixed(1)}%` : '0%' }
  ]
})

// 近7天趋势数据
const dailyTrendData = computed(() => {
  if (!stats.value?.dailyTrend) return []
  return stats.value.dailyTrend.map(item => ({
    date: item.date,
    count: item.participantCount
  }))
})

// 加载统计数据
const loadStats = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (selectedConfigId.value) {
      params.configId = selectedConfigId.value
    }
    if (dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await getStats(params)
    if (res.data) {
      stats.value = res.data
    }
  } catch {
    MessagePlugin.error('加载统计数据失败')
  } finally {
    loading.value = false
  }
}

// 加载配置列表
const loadConfigs = async () => {
  try {
    const res = await getConfigList({ page: 1, pageSize: 100 })
    configs.value = res.data?.list || []
  } catch {
    // ignore
  }
}

// 加载最近参与
const loadRecentParticipations = async () => {
  try {
    const res = await getParticipationList({
      page: 1,
      pageSize: 10,
      configId: selectedConfigId.value || undefined
    })
    recentParticipations.value = res.data?.list || []
  } catch {
    // ignore
  }
}

// 筛选变化
const onFilterChange = () => {
  loadStats()
  loadRecentParticipations()
}

// 重置筛选
const onReset = () => {
  selectedConfigId.value = null
  dateRange.value = []
  loadStats()
  loadRecentParticipations()
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 格式化时间
const formatTime = (timeStr: string) => {
  return new Date(timeStr).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadStats()
  loadConfigs()
  loadRecentParticipations()
})
</script>

<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <t-card class="header-card" :bordered="false">
      <div class="header-content">
        <div class="header-title">
          <t-icon name="chart-bar" size="28px" style="color: var(--td-brand-color)" />
          <h2>大转盘数据分析</h2>
        </div>
        <div class="header-filters">
          <t-select
            v-model="selectedConfigId"
            placeholder="全部活动"
            style="width: 200px"
            clearable
            @change="onFilterChange"
          >
            <t-option
              v-for="config in configs"
              :key="config.id"
              :label="config.name"
              :value="config.id"
            />
          </t-select>
          <t-date-range-picker
            v-model="dateRange"
            format="YYYY-MM-DD"
            placeholder="选择时间范围"
            style="width: 260px"
            @change="onFilterChange"
          />
          <t-button theme="default" variant="base" @click="onReset">重置</t-button>
        </div>
      </div>
    </t-card>

    <!-- 核心指标卡片 -->
    <t-row :gutter="16" class="stats-row">
      <t-col v-for="card in overviewCards" :key="card.title" :span="3">
        <t-card :bordered="false" class="stat-card" :style="{ borderTop: `3px solid ${card.color}` }">
          <div class="stat-header">
            <t-icon :name="card.icon" :style="{ color: card.color }" size="24px" />
          </div>
          <div class="stat-value">{{ card.value }}</div>
          <div class="stat-label">{{ card.title }}</div>
          <div class="stat-trend">
            <span class="trend-value">+{{ card.trend }}</span>
            <span class="trend-label">{{ card.trendLabel }}</span>
          </div>
        </t-card>
      </t-col>
    </t-row>

    <t-row :gutter="16">
      <!-- 转化漏斗 -->
      <t-col :span="6">
        <t-card title="转化漏斗" :bordered="false" class="funnel-card">
          <div class="funnel-list">
            <div
              v-for="(item, index) in funnelData"
              :key="item.name"
              class="funnel-item"
              :style="{ width: `${100 - index * 15}%` }"
            >
              <div class="funnel-bar">
                <span class="funnel-name">{{ item.name }}</span>
                <span class="funnel-value">{{ item.value }}</span>
              </div>
              <div class="funnel-rate">{{ item.rate }}</div>
            </div>
          </div>
        </t-card>
      </t-col>

      <!-- 近7天趋势 -->
      <t-col :span="6">
        <t-card title="近7天参与趋势" :bordered="false" class="trend-card">
          <div v-if="dailyTrendData.length > 0" class="trend-chart">
            <div class="chart-bars">
              <div
                v-for="item in dailyTrendData"
                :key="item.date"
                class="chart-bar-wrapper"
              >
                <div
                  class="chart-bar"
                  :style="{ height: `${Math.max((item.count / Math.max(...dailyTrendData.map(d => d.count || 1))) * 100, 5)}%` }"
                >
                  <span class="bar-value">{{ item.count }}</span>
                </div>
                <div class="bar-label">{{ formatDate(item.date) }}</div>
              </div>
            </div>
          </div>
          <div v-else class="no-data">
            暂无趋势数据
          </div>
        </t-card>
      </t-col>
    </t-row>

    <!-- 最近参与记录 -->
    <t-card title="最近参与记录" :bordered="false" class="recent-card">
      <t-table
        :data="recentParticipations"
        :columns="[
          { colKey: 'phone', title: '手机号', width: 130 },
          { colKey: 'config.name', title: '活动名称', width: 150 },
          { colKey: 'totalAmount', title: '累计金额', width: 100, cell: 'amount' },
          { colKey: 'remainingSpins', title: '剩余次数', width: 100 },
          { colKey: 'createdAt', title: '参与时间', width: 160, cell: 'time' }
        ]"
        :loading="loading"
        size="small"
      >
        <template #empty>
          <div style="padding: 20px; text-align: center; color: #999;">
            暂无参与记录
          </div>
        </template>
        <template #amount="{ row }">
          <span style="color: #e53935; font-weight: 500;">¥{{ Number(row.totalAmount).toFixed(2) }}</span>
        </template>
        <template #time="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </t-table>
    </t-card>
  </div>
</template>

<style scoped lang="less">
.page-container {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }
}

.header-filters {
  display: flex;
  gap: 12px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  padding: 20px;

  .stat-header {
    margin-bottom: 12px;
  }

  .stat-value {
    font-size: 32px;
    font-weight: 700;
    color: #333;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 14px;
    color: #666;
    margin-bottom: 12px;
  }

  .stat-trend {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;

    .trend-value {
      color: #4caf50;
      font-weight: 500;
    }

    .trend-label {
      color: #999;
      font-size: 12px;
    }
  }
}

.funnel-card {
  height: 320px;
}

.funnel-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 0;
}

.funnel-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.funnel-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  background: linear-gradient(90deg, #1976d2 0%, #64b5f6 100%);
  border-radius: 4px;
  color: #fff;

  .funnel-name {
    font-size: 14px;
  }

  .funnel-value {
    font-size: 16px;
    font-weight: 600;
  }
}

.funnel-rate {
  min-width: 50px;
  text-align: right;
  font-size: 14px;
  color: #666;
}

.trend-card {
  height: 320px;
}

.trend-chart {
  height: 220px;
  padding: 20px 0;
}

.chart-bars {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 100%;
}

.chart-bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.chart-bar {
  width: 40px;
  background: linear-gradient(180deg, #1976d2 0%, #64b5f6 100%);
  border-radius: 4px 4px 0 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 4px;
  transition: height 0.3s ease;

  .bar-value {
    font-size: 12px;
    color: #fff;
    font-weight: 500;
  }
}

.bar-label {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #999;
}

.recent-card {
  margin-top: 20px;
}
</style>
