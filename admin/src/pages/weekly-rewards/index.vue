<template>
  <div class="weekly-rewards-page">
    <!-- 页面标题 -->
    <PageHeader title="周期奖励统计" subtitle="查看推销员周销售、发圈、拉新任务完成情况">
      <template #actions>
        <t-space>
          <t-button variant="outline" @click="loadData">
            <template #icon><t-icon name="refresh" /></template>
            刷新
          </t-button>
          <t-button theme="primary" @click="handleManualProcess" :loading="processLoading">
            <template #icon><t-icon name="play-circle" /></template>
            手动发放奖励
          </t-button>
        </t-space>
      </template>
    </PageHeader>

    <!-- 周选择器 -->
    <div class="week-selector">
      <t-button variant="text" @click="goToPrevWeek">
        <template #icon><t-icon name="chevron-left" /></template>
      </t-button>
      <div class="week-display">
        <span class="week-range">{{ weekRangeText }}</span>
        <span class="week-label" v-if="isCurrentWeek">（本周）</span>
        <span class="week-label" v-else-if="isLastWeek">（上周）</span>
      </div>
      <t-button variant="text" @click="goToNextWeek" :disabled="isCurrentWeek">
        <template #icon><t-icon name="chevron-right" /></template>
      </t-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <StatCard
        label="达标推销员"
        :value="stats.qualifiedAgents"
        icon="user-checked"
        theme="success"
        :loading="statsLoading"
      />
      <StatCard
        label="发放奖励金额"
        :value="stats.totalRewardAmount"
        icon="money-circle"
        theme="primary"
        :loading="statsLoading"
        prefix="¥"
      />
      <StatCard
        label="周销售达标"
        :value="stats.salesQualified"
        icon="chart-bar"
        theme="warning"
        :loading="statsLoading"
      />
      <StatCard
        label="发圈全勤达标"
        :value="stats.shareFullQualified"
        icon="share"
        theme="danger"
        :loading="statsLoading"
      />
    </div>

    <!-- 奖励档位说明 -->
    <div class="reward-tiers">
      <t-card title="奖励档位说明" :bordered="false">
        <div class="tier-grid">
          <div class="tier-item">
            <div class="tier-icon sales">
              <t-icon name="chart-bar" />
            </div>
            <div class="tier-content">
              <div class="tier-title">周销售奖励</div>
              <div class="tier-desc">
                <span>3单 → ¥30</span>
                <span>5单 → ¥80</span>
                <span>10单 → ¥200</span>
              </div>
            </div>
          </div>
          <div class="tier-item">
            <div class="tier-icon share">
              <t-icon name="share" />
            </div>
            <div class="tier-content">
              <div class="tier-title">发圈全勤奖励</div>
              <div class="tier-desc">
                <span>7天全勤 → ¥20</span>
              </div>
            </div>
          </div>
          <div class="tier-item">
            <div class="tier-icon recruit">
              <t-icon name="usergroup-add" />
            </div>
            <div class="tier-content">
              <div class="tier-title">周拉新奖励</div>
              <div class="tier-desc">
                <span>3人 → ¥50</span>
              </div>
            </div>
          </div>
        </div>
      </t-card>
    </div>

    <!-- 数据表格 -->
    <TableCard title="推销员周统计">
      <template v-if="!loading && tableData.length === 0">
        <EmptyState
          type="data"
          title="暂无统计数据"
          description="本周暂无推销员完成任务数据"
        />
      </template>

      <t-table
        v-else
        :data="tableData"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        stripe
        hover
        @page-change="handlePageChange"
      >
        <!-- 推销员信息列 -->
        <template #agentInfo="{ row }">
          <div class="agent-info">
            <div class="agent-avatar" :class="'avatar-' + row.agentType?.toLowerCase()">
              {{ row.agentName?.charAt(0) || '?' }}
            </div>
            <div class="agent-detail">
              <div class="agent-name">{{ row.agentName }}</div>
              <div class="agent-phone">{{ formatPhone(row.agentPhone) }}</div>
            </div>
          </div>
        </template>

        <!-- 周销售列 -->
        <template #salesCol="{ row }">
          <div class="progress-cell">
            <div class="progress-value">{{ row.completedOrders }} 单</div>
            <div class="progress-bar">
              <div
                class="progress-fill sales"
                :style="{ width: Math.min(row.completedOrders / 10 * 100, 100) + '%' }"
              />
            </div>
            <div class="progress-status">
              <t-tag v-if="row.completedOrders >= 10" theme="success" size="small">¥200</t-tag>
              <t-tag v-else-if="row.completedOrders >= 5" theme="warning" size="small">¥80</t-tag>
              <t-tag v-else-if="row.completedOrders >= 3" theme="primary" size="small">¥30</t-tag>
              <span v-else class="not-qualified">未达标</span>
            </div>
          </div>
        </template>

        <!-- 周发圈列 -->
        <template #shareCol="{ row }">
          <div class="progress-cell">
            <div class="progress-value">{{ row.approvedShares }} 天</div>
            <div class="progress-bar">
              <div
                class="progress-fill share"
                :style="{ width: Math.min(row.approvedShares / 7 * 100, 100) + '%' }"
              />
            </div>
            <div class="progress-status">
              <t-tag v-if="row.approvedShares >= 7" theme="success" size="small">¥20</t-tag>
              <span v-else class="not-qualified">{{ 7 - row.approvedShares }}天</span>
            </div>
          </div>
        </template>

        <!-- 周拉新列 -->
        <template #recruitCol="{ row }">
          <div class="progress-cell">
            <div class="progress-value">{{ row.newRecruits }} 人</div>
            <div class="progress-bar">
              <div
                class="progress-fill recruit"
                :style="{ width: Math.min(row.newRecruits / 3 * 100, 100) + '%' }"
              />
            </div>
            <div class="progress-status">
              <t-tag v-if="row.newRecruits >= 3" theme="success" size="small">¥50</t-tag>
              <span v-else class="not-qualified">差{{ 3 - row.newRecruits }}人</span>
            </div>
          </div>
        </template>

        <!-- 总奖励列 -->
        <template #rewardCol="{ row }">
          <div class="reward-amount" v-if="calculateReward(row) > 0">
            <AmountText :value="calculateReward(row)" />
          </div>
          <span v-else class="no-reward">-</span>
        </template>

        <!-- 发放状态列 -->
        <template #statusCol="{ row }">
          <t-tag v-if="allBonusPaid(row)" theme="success" variant="light">已发放</t-tag>
          <t-tag v-else-if="calculateReward(row) > 0" theme="warning" variant="light">待发放</t-tag>
          <span v-else class="no-status">-</span>
        </template>

        <!-- 操作列 -->
        <template #operation="{ row }">
          <t-link theme="primary" @click="handleDetail(row)">详情</t-link>
        </template>
      </t-table>
    </TableCard>

    <!-- 详情弹窗 -->
    <t-dialog
      v-model:visible="detailVisible"
      header="周统计详情"
      :footer="false"
      width="560px"
    >
      <div class="detail-content" v-if="currentAgent">
        <div class="detail-section">
          <div class="section-title">推销员信息</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="item-label">姓名</span>
              <span class="item-value">{{ currentAgent.agentName }}</span>
            </div>
            <div class="detail-item">
              <span class="item-label">手机号</span>
              <span class="item-value">{{ currentAgent.agentPhone }}</span>
            </div>
            <div class="detail-item">
              <span class="item-label">推销员类型</span>
              <span class="item-value">{{ currentAgent.agentType === 'LEVEL1' ? '一级推销员' : '二级推销员' }}</span>
            </div>
            <div class="detail-item">
              <span class="item-label">统计周期</span>
              <span class="item-value">{{ weekRangeText }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="section-title">任务完成情况</div>
          <div class="task-list">
            <div class="task-item">
              <div class="task-header">
                <span class="task-name">周销售</span>
                <span class="task-value">{{ currentAgent.completedOrders }} 单</span>
              </div>
              <t-progress
                :percentage="Math.min(currentAgent.completedOrders / 10 * 100, 100)"
                :color="currentAgent.completedOrders >= 10 ? '#22c55e' : currentAgent.completedOrders >= 3 ? '#f59e0b' : '#e5e7eb'"
              />
              <div class="task-tiers">
                <span :class="{ active: currentAgent.completedOrders >= 3 }">3单/¥30</span>
                <span :class="{ active: currentAgent.completedOrders >= 5 }">5单/¥80</span>
                <span :class="{ active: currentAgent.completedOrders >= 10 }">10单/¥200</span>
              </div>
            </div>

            <div class="task-item">
              <div class="task-header">
                <span class="task-name">发圈全勤</span>
                <span class="task-value">{{ currentAgent.approvedShares }} / 7 天</span>
              </div>
              <t-progress
                :percentage="Math.min(currentAgent.approvedShares / 7 * 100, 100)"
                :color="currentAgent.approvedShares >= 7 ? '#22c55e' : '#e5e7eb'"
              />
              <div class="task-tiers">
                <span :class="{ active: currentAgent.approvedShares >= 7 }">7天全勤/¥20</span>
              </div>
            </div>

            <div class="task-item">
              <div class="task-header">
                <span class="task-name">周拉新</span>
                <span class="task-value">{{ currentAgent.newRecruits }} / 3 人</span>
              </div>
              <t-progress
                :percentage="Math.min(currentAgent.newRecruits / 3 * 100, 100)"
                :color="currentAgent.newRecruits >= 3 ? '#22c55e' : '#e5e7eb'"
              />
              <div class="task-tiers">
                <span :class="{ active: currentAgent.newRecruits >= 3 }">3人/¥50</span>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="section-title">奖励汇总</div>
          <div class="reward-summary">
            <div class="reward-row">
              <span class="reward-label">周销售奖励</span>
              <span class="reward-value">
                <AmountText :value="getSalesReward(currentAgent)" />
                <t-tag v-if="currentAgent.salesBonusPaid" theme="success" size="small" variant="light">已发放</t-tag>
              </span>
            </div>
            <div class="reward-row">
              <span class="reward-label">发圈全勤奖励</span>
              <span class="reward-value">
                <AmountText :value="getShareReward(currentAgent)" />
                <t-tag v-if="currentAgent.shareBonusPaid" theme="success" size="small" variant="light">已发放</t-tag>
              </span>
            </div>
            <div class="reward-row">
              <span class="reward-label">周拉新奖励</span>
              <span class="reward-value">
                <AmountText :value="getRecruitReward(currentAgent)" />
                <t-tag v-if="currentAgent.recruitBonusPaid" theme="success" size="small" variant="light">已发放</t-tag>
              </span>
            </div>
            <div class="reward-row total">
              <span class="reward-label">合计</span>
              <span class="reward-value">
                <AmountText :value="calculateReward(currentAgent)" size="large" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 周期奖励统计页面
 * 【2026-01-20】
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import {
  PageHeader,
  TableCard,
  StatCard,
  AmountText,
  EmptyState,
} from '@/components'
import request from '@/api/request'

// 当前选择的周（周一的日期）
const selectedWeekStart = ref<Date>(getLastMonday(new Date()))
const processLoading = ref(false)

// 获取最近的周一
function getLastMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

// 格式化日期
function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

// 计算周范围文本
const weekRangeText = computed(() => {
  const start = new Date(selectedWeekStart.value)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`
})

// 是否是本周
const isCurrentWeek = computed(() => {
  const currentMonday = getLastMonday(new Date())
  return formatDateStr(selectedWeekStart.value) === formatDateStr(currentMonday)
})

// 是否是上周
const isLastWeek = computed(() => {
  const currentMonday = getLastMonday(new Date())
  const lastMonday = new Date(currentMonday)
  lastMonday.setDate(lastMonday.getDate() - 7)
  return formatDateStr(selectedWeekStart.value) === formatDateStr(lastMonday)
})

// 切换到上一周
function goToPrevWeek() {
  const newDate = new Date(selectedWeekStart.value)
  newDate.setDate(newDate.getDate() - 7)
  selectedWeekStart.value = newDate
  loadData()
  loadStats()
}

// 切换到下一周
function goToNextWeek() {
  if (isCurrentWeek.value) return
  const newDate = new Date(selectedWeekStart.value)
  newDate.setDate(newDate.getDate() + 7)
  selectedWeekStart.value = newDate
  loadData()
  loadStats()
}

// 统计数据
const stats = reactive({
  qualifiedAgents: 0,
  totalRewardAmount: 0,
  salesQualified: 0,
  shareFullQualified: 0,
})
const statsLoading = ref(false)

// 表格数据
const tableData = ref<any[]>([])
const loading = ref(false)

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

// 弹窗状态
const detailVisible = ref(false)
const currentAgent = ref<any>(null)

// 表格列定义
const columns = [
  { colKey: 'agentInfo', title: '推销员', width: 180 },
  { colKey: 'salesCol', title: '周销售', width: 180 },
  { colKey: 'shareCol', title: '发圈天数', width: 160 },
  { colKey: 'recruitCol', title: '周拉新', width: 160 },
  { colKey: 'rewardCol', title: '总奖励', width: 100 },
  { colKey: 'statusCol', title: '发放状态', width: 100 },
  { colKey: 'operation', title: '操作', width: 80, fixed: 'right' as const },
]

// 格式化手机号
function formatPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

// 计算销售奖励
function getSalesReward(row: any): number {
  if (row.completedOrders >= 10) return 200
  if (row.completedOrders >= 5) return 80
  if (row.completedOrders >= 3) return 30
  return 0
}

// 计算发圈奖励
function getShareReward(row: any): number {
  return row.approvedShares >= 7 ? 20 : 0
}

// 计算拉新奖励
function getRecruitReward(row: any): number {
  return row.newRecruits >= 3 ? 50 : 0
}

// 计算总奖励
function calculateReward(row: any): number {
  return getSalesReward(row) + getShareReward(row) + getRecruitReward(row)
}

// 检查所有奖励是否已发放
function allBonusPaid(row: any): boolean {
  const hasReward = calculateReward(row) > 0
  if (!hasReward) return false
  const salesPaid = getSalesReward(row) === 0 || row.salesBonusPaid
  const sharePaid = getShareReward(row) === 0 || row.shareBonusPaid
  const recruitPaid = getRecruitReward(row) === 0 || row.recruitBonusPaid
  return salesPaid && sharePaid && recruitPaid
}

// 加载统计数据
async function loadStats() {
  statsLoading.value = true
  try {
    const res = await request.get('/admin/weekly/stats', {
      params: { weekStart: formatDateStr(selectedWeekStart.value) },
    })
    if (res.code === 0) {
      stats.qualifiedAgents = res.data.qualifiedAgents || 0
      stats.totalRewardAmount = res.data.totalRewardAmount || 0
      stats.salesQualified = res.data.salesQualified || 0
      stats.shareFullQualified = res.data.shareFullQualified || 0
    }
  } catch (err) {
    console.error('加载统计数据失败:', err)
  } finally {
    statsLoading.value = false
  }
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      weekStart: formatDateStr(selectedWeekStart.value),
    }

    const res = await request.get('/admin/weekly/agents', { params })

    if (res.code === 0) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (err) {
    console.error('加载周统计列表失败:', err)
    MessagePlugin.error('加载周统计列表失败')
  } finally {
    loading.value = false
  }
}

// 分页变化
function handlePageChange(pageInfo: { current: number; pageSize: number }) {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  loadData()
}

// 查看详情
function handleDetail(row: any) {
  currentAgent.value = row
  detailVisible.value = true
}

// 手动发放奖励
function handleManualProcess() {
  const confirmDia = DialogPlugin.confirm({
    header: '手动发放奖励',
    body: `确认为 ${weekRangeText.value} 这一周的所有达标推销员发放周期奖励？该操作将发放代金券到推销员账户。`,
    confirmBtn: { theme: 'primary', content: '确认发放' },
    onConfirm: async () => {
      processLoading.value = true
      try {
        const res = await request.post('/admin/weekly/process', {
          weekStart: formatDateStr(selectedWeekStart.value),
        })
        MessagePlugin.success(res.message || '发放完成')
        loadData()
        loadStats()
        confirmDia.destroy()
      } catch (err: any) {
        MessagePlugin.error(err.message || '发放失败')
      } finally {
        processLoading.value = false
      }
    },
  })
}

// 初始化
onMounted(() => {
  loadData()
  loadStats()
})
</script>

<style scoped>
.weekly-rewards-page {
  padding: 0;
}

/* 周选择器 */
.week-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--color-bg-container);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-xl);
}

.week-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.week-range {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.week-label {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
}

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
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

/* 奖励档位 */
.reward-tiers {
  margin-bottom: var(--spacing-xl);
}

.tier-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-lg);
}

@media (max-width: 768px) {
  .tier-grid {
    grid-template-columns: 1fr;
  }
}

.tier-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-bg-page);
  border-radius: var(--radius-md);
}

.tier-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tier-icon.sales {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
}

.tier-icon.share {
  background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
  color: #fff;
}

.tier-icon.recruit {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #fff;
}

.tier-content {
  flex: 1;
}

.tier-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.tier-desc {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

/* 推销员信息 */
.agent-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.agent-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: #fff;
  flex-shrink: 0;
}

.agent-avatar.avatar-level1 {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.agent-avatar.avatar-level2 {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.agent-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.agent-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.agent-phone {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* 进度单元格 */
.progress-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.progress-bar {
  height: 4px;
  background: var(--color-bg-page);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}

.progress-fill.sales {
  background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
}

.progress-fill.share {
  background: linear-gradient(90deg, #ec4899 0%, #be185d 100%);
}

.progress-fill.recruit {
  background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
}

.progress-status {
  display: flex;
  align-items: center;
}

.not-qualified {
  font-size: var(--font-size-xs);
  color: var(--color-text-placeholder);
}

/* 奖励金额 */
.reward-amount {
  font-weight: var(--font-weight-semibold);
}

.no-reward,
.no-status {
  font-size: var(--font-size-sm);
  color: var(--color-text-placeholder);
}

/* 详情弹窗 */
.detail-content {
  padding: 0;
}

.detail-section {
  margin-bottom: var(--spacing-xl);
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
  padding-left: var(--spacing-sm);
  border-left: 3px solid var(--color-primary);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  background: var(--color-bg-page);
  border-radius: var(--radius-md);
}

.detail-item .item-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.detail-item .item-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

/* 任务列表 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.task-item {
  padding: var(--spacing-md);
  background: var(--color-bg-page);
  border-radius: var(--radius-md);
}

.task-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.task-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.task-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.task-tiers {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-placeholder);
}

.task-tiers span.active {
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
}

/* 奖励汇总 */
.reward-summary {
  background: var(--color-bg-page);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}

.reward-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
}

.reward-row:last-child {
  border-bottom: none;
}

.reward-row.total {
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-md);
  border-top: 2px solid var(--color-border);
  border-bottom: none;
}

.reward-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.reward-row.total .reward-label {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.reward-value {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
</style>
