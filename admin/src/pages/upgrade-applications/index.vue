<template>
  <div class="upgrade-page">
    <!-- 页面标题 -->
    <PageHeader title="晋升申请管理" subtitle="审核二级推销员升级为一级的申请">
      <template #actions>
        <t-button variant="outline" @click="loadData">
          <template #icon><t-icon name="refresh" /></template>
          刷新
        </t-button>
      </template>
    </PageHeader>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <StatCard
        label="待审核"
        :value="stats.pending"
        icon="time"
        theme="warning"
        :loading="statsLoading"
        :highlight="stats.pending > 0"
        clickable
        @click="filterByStatus(0)"
      />
      <StatCard
        label="已通过"
        :value="stats.approved"
        icon="check-circle"
        theme="success"
        :loading="statsLoading"
        clickable
        @click="filterByStatus(1)"
      />
      <StatCard
        label="已拒绝"
        :value="stats.rejected"
        icon="close-circle"
        theme="danger"
        :loading="statsLoading"
        clickable
        @click="filterByStatus(2)"
      />
      <StatCard
        label="申请总数"
        :value="stats.total"
        icon="file-paste"
        theme="primary"
        :loading="statsLoading"
        clickable
        @click="filterByStatus(null)"
      />
    </div>

    <!-- 筛选区域 -->
    <FilterCard>
      <t-form layout="inline" :data="filterForm" @submit="handleSearch">
        <t-form-item label="申请状态">
          <t-radio-group v-model="filterForm.status" variant="default-filled">
            <t-radio-button :value="null">全部</t-radio-button>
            <t-radio-button :value="0">待审核</t-radio-button>
            <t-radio-button :value="1">已通过</t-radio-button>
            <t-radio-button :value="2">已拒绝</t-radio-button>
          </t-radio-group>
        </t-form-item>
        <t-form-item>
          <t-space>
            <t-button theme="primary" type="submit">查询</t-button>
            <t-button variant="outline" @click="handleReset">重置</t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </FilterCard>

    <!-- 数据表格 -->
    <TableCard title="申请列表">
      <template v-if="!loading && tableData.length === 0">
        <EmptyState
          v-if="filterForm.status !== null"
          type="search"
          title="未找到匹配的申请"
          description="请尝试调整筛选条件"
        >
          <template #action>
            <t-button theme="primary" @click="handleReset">清除筛选</t-button>
          </template>
        </EmptyState>
        <EmptyState
          v-else
          type="data"
          title="暂无晋升申请"
          description="二级推销员累计销售达到门槛后可申请晋升"
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
        <!-- 申请人信息列 -->
        <template #agentInfo="{ row }">
          <div class="agent-info">
            <div class="agent-avatar avatar-level2">
              {{ row.agentName?.charAt(0) || '?' }}
            </div>
            <div class="agent-detail">
              <div class="agent-name">{{ row.agentName }}</div>
              <div class="agent-phone">{{ formatPhone(row.agentPhone) }}</div>
            </div>
          </div>
        </template>

        <!-- 原上级列 -->
        <template #oldParent="{ row }">
          <span v-if="row.oldParentName" class="parent-name">{{ row.oldParentName }}</span>
          <span v-else class="no-parent">无</span>
        </template>

        <!-- 申请数据列 -->
        <template #applyData="{ row }">
          <div class="apply-data">
            <div class="apply-item">
              <span class="apply-label">累计销售额</span>
              <AmountText :value="row.applySales" />
            </div>
            <div class="apply-item" v-if="row.applyOrders">
              <span class="apply-label">订单数</span>
              <span class="apply-value">{{ row.applyOrders }}</span>
            </div>
          </div>
        </template>

        <!-- 申请原因列 -->
        <template #applyReason="{ row }">
          <t-tooltip v-if="row.applyReason && row.applyReason.length > 20" :content="row.applyReason">
            <span class="reason-text">{{ row.applyReason.substring(0, 20) }}...</span>
          </t-tooltip>
          <span v-else-if="row.applyReason" class="reason-text">{{ row.applyReason }}</span>
          <span v-else class="no-reason">未填写</span>
        </template>

        <!-- 状态列 -->
        <template #statusCol="{ row }">
          <StatusTag
            :type="getStatusType(row.status)"
            :text="getStatusText(row.status)"
            :pulse="row.status === 0"
          />
        </template>

        <!-- 申请时间列 -->
        <template #createdAt="{ row }">
          <div class="time-cell">
            <div class="time-date">{{ formatDate(row.createdAt) }}</div>
            <div class="time-detail">{{ formatTime(row.createdAt) }}</div>
          </div>
        </template>

        <!-- 操作列 -->
        <template #operation="{ row }">
          <t-space size="small">
            <template v-if="row.status === 0">
              <t-link theme="success" @click="handleApprove(row)">通过</t-link>
              <t-divider layout="vertical" />
              <t-link theme="danger" @click="handleReject(row)">拒绝</t-link>
            </template>
            <template v-else>
              <t-link theme="primary" @click="handleDetail(row)">详情</t-link>
            </template>
          </t-space>
        </template>
      </t-table>
    </TableCard>

    <!-- 详情弹窗 -->
    <t-dialog
      v-model:visible="detailVisible"
      header="申请详情"
      :footer="false"
      width="520px"
    >
      <div class="detail-content" v-if="currentApp">
        <div class="detail-section">
          <div class="section-title">申请人信息</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="item-label">姓名</span>
              <span class="item-value">{{ currentApp.agentName }}</span>
            </div>
            <div class="detail-item">
              <span class="item-label">手机号</span>
              <span class="item-value">{{ currentApp.agentPhone }}</span>
            </div>
            <div class="detail-item">
              <span class="item-label">原上级</span>
              <span class="item-value">{{ currentApp.oldParentName || '无' }}</span>
            </div>
            <div class="detail-item">
              <span class="item-label">累计销售额</span>
              <span class="item-value"><AmountText :value="currentApp.applySales" /></span>
            </div>
          </div>
        </div>

        <div class="detail-section" v-if="currentApp.applyReason">
          <div class="section-title">申请原因</div>
          <p class="reason-content">{{ currentApp.applyReason }}</p>
        </div>

        <div class="detail-section">
          <div class="section-title">审核结果</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="item-label">状态</span>
              <span class="item-value">
                <StatusTag
                  :type="getStatusType(currentApp.status)"
                  :text="getStatusText(currentApp.status)"
                />
              </span>
            </div>
            <div class="detail-item" v-if="currentApp.reviewedAt">
              <span class="item-label">审核时间</span>
              <span class="item-value">{{ formatDateTime(currentApp.reviewedAt) }}</span>
            </div>
          </div>
          <div class="detail-item full-width" v-if="currentApp.reviewRemark">
            <span class="item-label">审核备注</span>
            <p class="remark-content">{{ currentApp.reviewRemark }}</p>
          </div>
        </div>
      </div>
    </t-dialog>

    <!-- 拒绝原因弹窗 -->
    <t-dialog
      v-model:visible="rejectVisible"
      header="拒绝申请"
      :confirm-btn="{ loading: submitLoading, content: '确认拒绝', theme: 'danger' }"
      width="450px"
      @confirm="handleRejectSubmit"
    >
      <t-form label-width="80px">
        <t-form-item label="申请人">
          <span>{{ currentApp?.agentName }}</span>
        </t-form-item>
        <t-form-item label="拒绝原因">
          <t-textarea
            v-model="rejectRemark"
            placeholder="请输入拒绝原因（可选）"
            :maxlength="200"
          />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 晋升申请管理页面
 * 审核二级推销员升级为一级的申请
 */
import { ref, reactive, onMounted } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import {
  PageHeader,
  FilterCard,
  TableCard,
  StatCard,
  StatusTag,
  AmountText,
  EmptyState,
} from '@/components'
import request from '@/api/request'

// 筛选表单
const filterForm = reactive({
  status: null as number | null,
})

// 统计数据
const stats = reactive({
  pending: 0,
  approved: 0,
  rejected: 0,
  total: 0,
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
const rejectVisible = ref(false)
const submitLoading = ref(false)
const currentApp = ref<any>(null)
const rejectRemark = ref('')

// 表格列定义
const columns = [
  { colKey: 'agentInfo', title: '申请人', width: 180 },
  { colKey: 'oldParent', title: '原上级', width: 100 },
  { colKey: 'applyData', title: '业绩数据', width: 160 },
  { colKey: 'applyReason', title: '申请原因', width: 180 },
  { colKey: 'statusCol', title: '状态', width: 100 },
  { colKey: 'createdAt', title: '申请时间', width: 140 },
  { colKey: 'operation', title: '操作', width: 120, fixed: 'right' as const },
]

// 获取状态类型
function getStatusType(status: number): string {
  const map: Record<number, string> = {
    0: 'warning',
    1: 'success',
    2: 'danger',
  }
  return map[status] || 'default'
}

// 获取状态文本
function getStatusText(status: number): string {
  const map: Record<number, string> = {
    0: '待审核',
    1: '已通过',
    2: '已拒绝',
  }
  return map[status] || '未知'
}

// 格式化手机号
function formatPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

// 格式化日期
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// 格式化时间
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 格式化日期时间
function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`
}

// 加载统计数据
async function loadStats() {
  statsLoading.value = true
  try {
    // 分别获取各状态的数量
    const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
      request.get('/admin/upgrade-applications', { params: { status: 0, page: 1, pageSize: 1 } }),
      request.get('/admin/upgrade-applications', { params: { status: 1, page: 1, pageSize: 1 } }),
      request.get('/admin/upgrade-applications', { params: { status: 2, page: 1, pageSize: 1 } }),
    ])

    stats.pending = pendingRes.data?.total || 0
    stats.approved = approvedRes.data?.total || 0
    stats.rejected = rejectedRes.data?.total || 0
    stats.total = stats.pending + stats.approved + stats.rejected
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
    }
    if (filterForm.status !== null) {
      params.status = filterForm.status
    }

    const res = await request.get('/admin/upgrade-applications', { params })

    if (res.code === 0 || res.code === 200) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (err) {
    console.error('加载申请列表失败:', err)
    MessagePlugin.error('加载申请列表失败')
  } finally {
    loading.value = false
  }
}

// 按状态筛选
function filterByStatus(status: number | null) {
  filterForm.status = status
  pagination.current = 1
  loadData()
}

// 搜索
function handleSearch() {
  pagination.current = 1
  loadData()
}

// 重置筛选
function handleReset() {
  filterForm.status = null
  pagination.current = 1
  loadData()
}

// 分页变化
function handlePageChange(pageInfo: { current: number; pageSize: number }) {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  loadData()
}

// 查看详情
function handleDetail(row: any) {
  currentApp.value = row
  detailVisible.value = true
}

// 通过申请
function handleApprove(row: any) {
  const confirmDia = DialogPlugin.confirm({
    header: '通过申请',
    body: `确认通过「${row.agentName}」的晋升申请？通过后该推销员将升级为一级推销员。`,
    confirmBtn: { theme: 'success', content: '确认通过' },
    onConfirm: async () => {
      try {
        await request.post(`/admin/upgrade-applications/${row.id}/review`, {
          approved: true,
        })
        MessagePlugin.success('审核通过')
        loadData()
        loadStats()
        confirmDia.destroy()
      } catch (err: any) {
        MessagePlugin.error(err.message || '审核失败')
      }
    },
  })
}

// 拒绝申请
function handleReject(row: any) {
  currentApp.value = row
  rejectRemark.value = ''
  rejectVisible.value = true
}

// 提交拒绝
async function handleRejectSubmit() {
  if (!currentApp.value) return

  submitLoading.value = true
  try {
    await request.post(`/admin/upgrade-applications/${currentApp.value.id}/review`, {
      approved: false,
      remark: rejectRemark.value || undefined,
    })
    MessagePlugin.success('已拒绝该申请')
    rejectVisible.value = false
    loadData()
    loadStats()
  } catch (err: any) {
    MessagePlugin.error(err.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

// 初始化
onMounted(() => {
  loadData()
  loadStats()
})
</script>

<style scoped>
.upgrade-page {
  padding: 0;
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

/* 上级名称 */
.parent-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.no-parent {
  font-size: var(--font-size-sm);
  color: var(--color-text-placeholder);
}

/* 申请数据 */
.apply-data {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.apply-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.apply-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.apply-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

/* 申请原因 */
.reason-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.no-reason {
  font-size: var(--font-size-sm);
  color: var(--color-text-placeholder);
}

/* 时间单元格 */
.time-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.time-date {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.time-detail {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
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

.detail-item.full-width {
  grid-column: span 2;
}

.detail-item .item-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.detail-item .item-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.reason-content,
.remark-content {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
  padding: var(--spacing-md);
  background: var(--color-bg-page);
  border-radius: var(--radius-md);
  margin: 0;
}
</style>
