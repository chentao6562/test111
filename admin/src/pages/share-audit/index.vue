<template>
  <div class="share-audit-page">
    <!-- 页面标题 -->
    <PageHeader title="发圈审核" subtitle="审核推销员的朋友圈/小红书发圈截图">
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
        @click="filterByStatus('PENDING')"
      />
      <StatCard
        label="已通过"
        :value="stats.approved"
        icon="check-circle"
        theme="success"
        :loading="statsLoading"
        clickable
        @click="filterByStatus('APPROVED')"
      />
      <StatCard
        label="已驳回"
        :value="stats.rejected"
        icon="close-circle"
        theme="danger"
        :loading="statsLoading"
        clickable
        @click="filterByStatus('REJECTED')"
      />
      <StatCard
        label="今日提交"
        :value="stats.todayCount"
        icon="calendar"
        theme="primary"
        :loading="statsLoading"
        clickable
        @click="filterByStatus(null)"
      />
    </div>

    <!-- 筛选区域 -->
    <FilterCard>
      <t-form layout="inline" :data="filterForm" @submit="handleSearch">
        <t-form-item label="审核状态">
          <t-radio-group v-model="filterForm.status" variant="default-filled">
            <t-radio-button :value="null">全部</t-radio-button>
            <t-radio-button value="PENDING">待审核</t-radio-button>
            <t-radio-button value="APPROVED">已通过</t-radio-button>
            <t-radio-button value="REJECTED">已驳回</t-radio-button>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="关键词">
          <t-input
            v-model="filterForm.keyword"
            placeholder="推销员姓名/手机号"
            clearable
            style="width: 200px"
          />
        </t-form-item>
        <t-form-item>
          <t-space>
            <t-button theme="primary" type="submit">查询</t-button>
            <t-button variant="outline" @click="handleReset">重置</t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </FilterCard>

    <!-- 批量操作 -->
    <div class="batch-actions" v-if="selectedIds.length > 0">
      <t-alert theme="info">
        <template #message>
          已选择 {{ selectedIds.length }} 条记录
          <t-button
            theme="success"
            size="small"
            variant="text"
            @click="handleBatchApprove"
            :loading="batchLoading"
          >
            批量通过
          </t-button>
          <t-button size="small" variant="text" @click="handleClearSelection">
            清除选择
          </t-button>
        </template>
      </t-alert>
    </div>

    <!-- 数据表格 -->
    <TableCard title="发圈列表">
      <template v-if="!loading && tableData.length === 0">
        <EmptyState
          v-if="filterForm.status !== null || filterForm.keyword"
          type="search"
          title="未找到匹配的记录"
          description="请尝试调整筛选条件"
        >
          <template #action>
            <t-button theme="primary" @click="handleReset">清除筛选</t-button>
          </template>
        </EmptyState>
        <EmptyState
          v-else
          type="data"
          title="暂无发圈记录"
          description="推销员提交发圈截图后将在此显示"
        />
      </template>

      <t-table
        v-else
        :data="tableData"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        :selected-row-keys="selectedIds"
        row-key="id"
        stripe
        hover
        @page-change="handlePageChange"
        @select-change="handleSelectChange"
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

        <!-- 发圈截图列 -->
        <template #imageCol="{ row }">
          <div class="image-preview" @click="handlePreviewImage(row.imageUrl)">
            <t-image
              :src="row.imageUrl"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px; cursor: pointer"
            />
          </div>
        </template>

        <!-- 发圈类型列 -->
        <template #shareTypeCol="{ row }">
          <t-tag
            :theme="row.shareType === 'XIAOHONGSHU' ? 'danger' : 'success'"
            variant="light"
          >
            {{ row.shareType === 'XIAOHONGSHU' ? '小红书' : '朋友圈' }}
          </t-tag>
        </template>

        <!-- 状态列 -->
        <template #statusCol="{ row }">
          <StatusTag
            :type="getStatusType(row.status)"
            :text="getStatusText(row.status)"
            :pulse="row.status === 'PENDING'"
          />
        </template>

        <!-- 奖励状态列 -->
        <template #bonusCol="{ row }">
          <t-tag v-if="row.bonusPaid" theme="success" variant="light">已发放</t-tag>
          <t-tag v-else-if="row.status === 'APPROVED'" theme="warning" variant="light">待发放</t-tag>
          <span v-else class="no-bonus">-</span>
        </template>

        <!-- 提交时间列 -->
        <template #createdAt="{ row }">
          <div class="time-cell">
            <div class="time-date">{{ formatDate(row.createdAt) }}</div>
            <div class="time-detail">{{ formatTime(row.createdAt) }}</div>
          </div>
        </template>

        <!-- 操作列 -->
        <template #operation="{ row }">
          <t-space size="small">
            <template v-if="row.status === 'PENDING'">
              <t-link theme="success" @click="handleApprove(row)">通过</t-link>
              <t-divider layout="vertical" />
              <t-link theme="danger" @click="handleReject(row)">驳回</t-link>
            </template>
            <template v-else>
              <t-link theme="primary" @click="handleDetail(row)">详情</t-link>
            </template>
          </t-space>
        </template>
      </t-table>
    </TableCard>

    <!-- 图片预览 -->
    <t-image-viewer
      v-model:visible="imageViewerVisible"
      :images="[previewImage]"
    />

    <!-- 详情弹窗 -->
    <t-dialog
      v-model:visible="detailVisible"
      header="发圈详情"
      :footer="false"
      width="520px"
    >
      <div class="detail-content" v-if="currentShare">
        <div class="detail-section">
          <div class="section-title">推销员信息</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="item-label">姓名</span>
              <span class="item-value">{{ currentShare.agentName }}</span>
            </div>
            <div class="detail-item">
              <span class="item-label">手机号</span>
              <span class="item-value">{{ currentShare.agentPhone }}</span>
            </div>
            <div class="detail-item">
              <span class="item-label">发圈类型</span>
              <span class="item-value">{{ currentShare.shareType === 'XIAOHONGSHU' ? '小红书' : '朋友圈' }}</span>
            </div>
            <div class="detail-item">
              <span class="item-label">提交时间</span>
              <span class="item-value">{{ formatDateTime(currentShare.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="section-title">发圈截图</div>
          <div class="image-container">
            <t-image
              :src="currentShare.imageUrl"
              fit="contain"
              style="max-width: 100%; max-height: 400px; cursor: pointer"
              @click="handlePreviewImage(currentShare.imageUrl)"
            />
          </div>
        </div>

        <div class="detail-section">
          <div class="section-title">审核结果</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="item-label">状态</span>
              <span class="item-value">
                <StatusTag
                  :type="getStatusType(currentShare.status)"
                  :text="getStatusText(currentShare.status)"
                />
              </span>
            </div>
            <div class="detail-item" v-if="currentShare.reviewedAt">
              <span class="item-label">审核时间</span>
              <span class="item-value">{{ formatDateTime(currentShare.reviewedAt) }}</span>
            </div>
            <div class="detail-item" v-if="currentShare.bonusPaid">
              <span class="item-label">奖励状态</span>
              <span class="item-value">
                <t-tag theme="success" variant="light">已发放首发圈奖励</t-tag>
              </span>
            </div>
          </div>
          <div class="detail-item full-width" v-if="currentShare.rejectReason">
            <span class="item-label">驳回原因</span>
            <p class="remark-content">{{ currentShare.rejectReason }}</p>
          </div>
        </div>
      </div>
    </t-dialog>

    <!-- 驳回原因弹窗 -->
    <t-dialog
      v-model:visible="rejectVisible"
      header="驳回发圈"
      :confirm-btn="{ loading: submitLoading, content: '确认驳回', theme: 'danger' }"
      width="450px"
      @confirm="handleRejectSubmit"
    >
      <t-form label-width="80px">
        <t-form-item label="推销员">
          <span>{{ currentShare?.agentName }}</span>
        </t-form-item>
        <t-form-item label="驳回原因" required>
          <t-textarea
            v-model="rejectReason"
            placeholder="请输入驳回原因（必填）"
            :maxlength="200"
          />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 发圈审核管理页面
 * 【2026-01-20】
 */
import { ref, reactive, onMounted } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import {
  PageHeader,
  FilterCard,
  TableCard,
  StatCard,
  StatusTag,
  EmptyState,
} from '@/components'
import request from '@/api/request'

// 筛选表单
const filterForm = reactive({
  status: null as string | null,
  keyword: '',
})

// 统计数据
const stats = reactive({
  pending: 0,
  approved: 0,
  rejected: 0,
  todayCount: 0,
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

// 选择的行
const selectedIds = ref<number[]>([])
const batchLoading = ref(false)

// 弹窗状态
const detailVisible = ref(false)
const rejectVisible = ref(false)
const imageViewerVisible = ref(false)
const submitLoading = ref(false)
const currentShare = ref<any>(null)
const rejectReason = ref('')
const previewImage = ref('')

// 表格列定义
const columns = [
  { colKey: 'row-select', type: 'multiple', width: 50 },
  { colKey: 'agentInfo', title: '推销员', width: 180 },
  { colKey: 'imageCol', title: '发圈截图', width: 100 },
  { colKey: 'shareTypeCol', title: '类型', width: 100 },
  { colKey: 'statusCol', title: '状态', width: 100 },
  { colKey: 'bonusCol', title: '奖励', width: 100 },
  { colKey: 'createdAt', title: '提交时间', width: 140 },
  { colKey: 'operation', title: '操作', width: 120, fixed: 'right' as const },
]

// 获取状态类型
function getStatusType(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
  }
  return map[status] || 'default'
}

// 获取状态文本
function getStatusText(status: string): string {
  const map: Record<string, string> = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '已驳回',
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
    const res = await request.get('/admin/shares/stats')
    if (res.code === 0) {
      stats.pending = res.data.pending || 0
      stats.approved = res.data.approved || 0
      stats.rejected = res.data.rejected || 0
      stats.todayCount = res.data.todayCount || 0
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
    }
    if (filterForm.status !== null) {
      params.status = filterForm.status
    }
    if (filterForm.keyword) {
      params.keyword = filterForm.keyword
    }

    const res = await request.get('/admin/shares', { params })

    if (res.code === 0) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (err) {
    console.error('加载发圈列表失败:', err)
    MessagePlugin.error('加载发圈列表失败')
  } finally {
    loading.value = false
  }
}

// 按状态筛选
function filterByStatus(status: string | null) {
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
  filterForm.keyword = ''
  pagination.current = 1
  loadData()
}

// 分页变化
function handlePageChange(pageInfo: { current: number; pageSize: number }) {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  loadData()
}

// 选择变化
function handleSelectChange(selectedRowKeys: number[]) {
  selectedIds.value = selectedRowKeys
}

// 清除选择
function handleClearSelection() {
  selectedIds.value = []
}

// 预览图片
function handlePreviewImage(url: string) {
  previewImage.value = url
  imageViewerVisible.value = true
}

// 查看详情
function handleDetail(row: any) {
  currentShare.value = row
  detailVisible.value = true
}

// 通过审核
function handleApprove(row: any) {
  const confirmDia = DialogPlugin.confirm({
    header: '通过审核',
    body: `确认通过「${row.agentName}」的发圈审核？${row.isFirstShare ? '首次发圈将自动发放5元代金券奖励。' : ''}`,
    confirmBtn: { theme: 'success', content: '确认通过' },
    onConfirm: async () => {
      try {
        const res = await request.post(`/admin/shares/${row.id}/approve`)
        if (res.data?.bonusIssued) {
          MessagePlugin.success(`审核通过，已发放首发圈奖励 ${res.data.bonusAmount} 元`)
        } else {
          MessagePlugin.success('审核通过')
        }
        loadData()
        loadStats()
        confirmDia.destroy()
      } catch (err: any) {
        MessagePlugin.error(err.message || '审核失败')
      }
    },
  })
}

// 驳回审核
function handleReject(row: any) {
  currentShare.value = row
  rejectReason.value = ''
  rejectVisible.value = true
}

// 提交驳回
async function handleRejectSubmit() {
  if (!currentShare.value) return

  if (!rejectReason.value.trim()) {
    MessagePlugin.warning('请填写驳回原因')
    return
  }

  submitLoading.value = true
  try {
    await request.post(`/admin/shares/${currentShare.value.id}/reject`, {
      rejectReason: rejectReason.value,
    })
    MessagePlugin.success('已驳回')
    rejectVisible.value = false
    loadData()
    loadStats()
  } catch (err: any) {
    MessagePlugin.error(err.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

// 批量通过
async function handleBatchApprove() {
  if (selectedIds.value.length === 0) return

  const confirmDia = DialogPlugin.confirm({
    header: '批量通过',
    body: `确认批量通过选中的 ${selectedIds.value.length} 条发圈记录？`,
    confirmBtn: { theme: 'success', content: '确认通过' },
    onConfirm: async () => {
      batchLoading.value = true
      try {
        const res = await request.post('/admin/shares/batch-approve', {
          ids: selectedIds.value,
        })
        MessagePlugin.success(res.message || '批量审核完成')
        selectedIds.value = []
        loadData()
        loadStats()
        confirmDia.destroy()
      } catch (err: any) {
        MessagePlugin.error(err.message || '批量审核失败')
      } finally {
        batchLoading.value = false
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
.share-audit-page {
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

/* 批量操作 */
.batch-actions {
  margin-bottom: var(--spacing-lg);
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

/* 图片预览 */
.image-preview {
  cursor: pointer;
}

.image-preview:hover {
  opacity: 0.8;
}

/* 无奖励 */
.no-bonus {
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

.remark-content {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
  padding: var(--spacing-md);
  background: var(--color-bg-page);
  border-radius: var(--radius-md);
  margin: 0;
}

.image-container {
  background: var(--color-bg-page);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  text-align: center;
}
</style>
