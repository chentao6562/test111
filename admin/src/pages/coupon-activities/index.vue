<script setup lang="ts">
/**
 * 代金券活动管理页面
 * 【2026-01-19 活动系统增强】
 * 创建可领取的代金券活动，推销员可在H5端领取
 */
import { ref, onMounted } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { PrimaryTableCol, PageInfo } from 'tdesign-vue-next'
import request from '@/api/request'
import { EmptyState } from '@/components'

// 活动类型
interface CouponActivity {
  id: number
  name: string
  couponAmount: number
  totalCount: number
  issuedCount: number
  limitPerUser: number
  startTime: string
  endTime: string
  expiredAt: string
  status: string
  createdAt: string
}

// 活动列表数据
const activities = ref<CouponActivity[]>([])
const loading = ref(false)
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

// 筛选条件
const searchForm = ref({
  status: '',
  keyword: ''
})

// 活动对话框
const activityDialogVisible = ref(false)
const activityDialogTitle = ref('')
const activityFormLoading = ref(false)
const editingActivityId = ref<number | null>(null)
const activityForm = ref({
  name: '',
  couponAmount: 10,
  totalCount: 100,
  limitPerUser: 1,
  startTime: '',
  endTime: '',
  expiredAt: ''
})

// 活动列表列定义
const activityColumns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'name', title: '活动名称', minWidth: 180 },
  { colKey: 'couponAmount', title: '券面额', width: 100, cell: 'couponAmount' },
  { colKey: 'stock', title: '库存/发放', width: 140, cell: 'stock' },
  { colKey: 'limitPerUser', title: '每人限领', width: 100, cell: 'limitPerUser' },
  { colKey: 'time', title: '领取时间', width: 300, cell: 'time' },
  { colKey: 'expiredAt', title: '券过期时间', width: 150, cell: 'expiredAt' },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'action', title: '操作', width: 200, fixed: 'right', cell: 'action' }
]

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: '草稿', value: 'DRAFT' },
  { label: '进行中', value: 'ACTIVE' },
  { label: '已结束', value: 'ENDED' }
]

// 计算活动状态标签
const getStatusInfo = (activity: CouponActivity) => {
  const now = new Date()
  const start = new Date(activity.startTime)
  const end = new Date(activity.endTime)

  if (activity.status === 'DRAFT') {
    return { label: '草稿', theme: 'default' as const }
  }
  if (activity.status === 'ENDED' || now > end) {
    return { label: '已结束', theme: 'danger' as const }
  }
  if (activity.status === 'ACTIVE') {
    if (now < start) {
      return { label: '未开始', theme: 'warning' as const }
    }
    if (activity.issuedCount >= activity.totalCount) {
      return { label: '已领完', theme: 'warning' as const }
    }
    return { label: '进行中', theme: 'success' as const }
  }
  return { label: '未知', theme: 'default' as const }
}

// 加载活动列表
const loadActivities = async () => {
  loading.value = true
  try {
    const res = await request.get('/admin/coupon-activities', {
      params: {
        page: pagination.value.current,
        pageSize: pagination.value.pageSize,
        status: searchForm.value.status,
        keyword: searchForm.value.keyword
      }
    })
    if (res.data) {
      activities.value = res.data.list || []
      pagination.value.total = res.data.total || 0
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// 分页变化
const onPageChange = (pageInfo: PageInfo) => {
  pagination.value.current = pageInfo.current
  pagination.value.pageSize = pageInfo.pageSize
  loadActivities()
}

// 搜索
const onSearch = () => {
  pagination.value.current = 1
  loadActivities()
}

// 重置
const onReset = () => {
  searchForm.value = { status: '', keyword: '' }
  pagination.value.current = 1
  loadActivities()
}

// 新建活动
const handleCreateActivity = () => {
  activityDialogTitle.value = '新建代金券活动'
  editingActivityId.value = null
  // 默认过期时间为2026-02-14（情人节）
  activityForm.value = {
    name: '',
    couponAmount: 10,
    totalCount: 100,
    limitPerUser: 1,
    startTime: '',
    endTime: '',
    expiredAt: '2026-02-14 23:59:59'
  }
  activityDialogVisible.value = true
}

// 编辑活动
const handleEditActivity = (activity: CouponActivity) => {
  activityDialogTitle.value = '编辑代金券活动'
  editingActivityId.value = activity.id
  activityForm.value = {
    name: activity.name,
    couponAmount: activity.couponAmount,
    totalCount: activity.totalCount,
    limitPerUser: activity.limitPerUser,
    startTime: activity.startTime,
    endTime: activity.endTime,
    expiredAt: activity.expiredAt
  }
  activityDialogVisible.value = true
}

// 提交活动表单
const submitActivityForm = async () => {
  if (!activityForm.value.name.trim()) {
    MessagePlugin.warning('请输入活动名称')
    return
  }
  if (!activityForm.value.couponAmount || activityForm.value.couponAmount <= 0) {
    MessagePlugin.warning('请输入正确的券面额')
    return
  }
  if (!activityForm.value.totalCount || activityForm.value.totalCount <= 0) {
    MessagePlugin.warning('请输入正确的发放数量')
    return
  }
  if (!activityForm.value.startTime || !activityForm.value.endTime) {
    MessagePlugin.warning('请选择领取时间范围')
    return
  }
  if (!activityForm.value.expiredAt) {
    MessagePlugin.warning('请选择券过期时间')
    return
  }

  activityFormLoading.value = true
  try {
    if (editingActivityId.value) {
      await request.put(`/admin/coupon-activities/${editingActivityId.value}`, activityForm.value)
      MessagePlugin.success('更新成功')
    } else {
      await request.post('/admin/coupon-activities', activityForm.value)
      MessagePlugin.success('创建成功')
    }
    activityDialogVisible.value = false
    loadActivities()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  } finally {
    activityFormLoading.value = false
  }
}

// 删除活动
const handleDeleteActivity = (activity: CouponActivity) => {
  const confirmDia = DialogPlugin.confirm({
    header: '确认删除',
    body: `确定要删除活动【${activity.name}】吗？`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        await request.delete(`/admin/coupon-activities/${activity.id}`)
        MessagePlugin.success('删除成功')
        loadActivities()
        confirmDia.hide()
      } catch (error: any) {
        MessagePlugin.error(error.message || '删除失败')
      }
    }
  })
}

// 切换活动状态
const handleToggleStatus = async (activity: CouponActivity, newStatus: string) => {
  const statusText = newStatus === 'ACTIVE' ? '启用' : '结束'
  try {
    await request.put(`/admin/coupon-activities/${activity.id}/status`, { status: newStatus })
    MessagePlugin.success(`${statusText}成功`)
    loadActivities()
  } catch (error: any) {
    MessagePlugin.error(error.message || `${statusText}失败`)
  }
}

// 格式化金额
const formatAmount = (val: number | string) => {
  return `¥${Number(val).toFixed(2)}`
}

// 格式化时间
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

onMounted(() => {
  loadActivities()
})
</script>

<template>
  <div class="page-container">
    <!-- 页面说明 -->
    <t-card class="info-card" :bordered="false">
      <div class="info-content">
        <div class="info-icon">🎫</div>
        <div class="info-text">
          <h3>代金券活动管理</h3>
          <p>创建代金券领取活动，推销员可在H5端领取代金券，到门店消费时使用。<strong>券成本由总代理承担。</strong></p>
        </div>
      </div>
    </t-card>

    <!-- 搜索栏 -->
    <t-card class="search-card" :bordered="false">
      <t-form :data="searchForm" layout="inline">
        <t-form-item label="活动状态" name="status">
          <t-select
            v-model="searchForm.status"
            :options="statusOptions"
            placeholder="请选择"
            style="width: 150px"
            clearable
          />
        </t-form-item>
        <t-form-item label="活动名称" name="keyword">
          <t-input
            v-model="searchForm.keyword"
            placeholder="请输入关键词"
            style="width: 200px"
            clearable
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" @click="onSearch">查询</t-button>
          <t-button theme="default" @click="onReset">重置</t-button>
          <t-button theme="success" @click="handleCreateActivity">
            <template #icon><t-icon name="add" /></template>
            新建活动
          </t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <!-- 活动列表 -->
    <t-card class="table-card" :bordered="false">
      <t-table
        :data="activities"
        :columns="activityColumns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="onPageChange"
      >
        <template #empty>
          <EmptyState
            :type="searchForm.status || searchForm.keyword ? 'search' : 'data'"
            :title="searchForm.status || searchForm.keyword ? '未找到匹配结果' : '暂无代金券活动'"
            :description="searchForm.status || searchForm.keyword ? '请尝试调整筛选条件' : '点击上方按钮创建新活动'"
          />
        </template>

        <!-- 券面额 -->
        <template #couponAmount="{ row }">
          <span class="amount-text">{{ formatAmount(row.couponAmount) }}</span>
        </template>

        <!-- 库存/发放 -->
        <template #stock="{ row }">
          <div class="stock-cell">
            <span class="issued">{{ row.issuedCount }}</span>
            <span class="separator">/</span>
            <span class="total">{{ row.totalCount }}</span>
          </div>
          <t-progress
            :percentage="Math.round((row.issuedCount / row.totalCount) * 100)"
            :color="row.issuedCount >= row.totalCount ? '#e34d59' : '#0052d9'"
            size="small"
            :show-label="false"
          />
        </template>

        <!-- 每人限领 -->
        <template #limitPerUser="{ row }">
          {{ row.limitPerUser }}张
        </template>

        <!-- 领取时间 -->
        <template #time="{ row }">
          <div class="time-cell">
            <div class="time-item">
              <span class="time-label">开始：</span>
              <span>{{ formatDateTime(row.startTime) }}</span>
            </div>
            <div class="time-item">
              <span class="time-label">结束：</span>
              <span>{{ formatDateTime(row.endTime) }}</span>
            </div>
          </div>
        </template>

        <!-- 券过期时间 -->
        <template #expiredAt="{ row }">
          <t-tag theme="warning" variant="light">{{ formatDate(row.expiredAt) }}</t-tag>
        </template>

        <!-- 状态 -->
        <template #status="{ row }">
          <t-tag :theme="getStatusInfo(row).theme">{{ getStatusInfo(row).label }}</t-tag>
        </template>

        <!-- 操作 -->
        <template #action="{ row }">
          <t-space>
            <t-link theme="primary" @click="handleEditActivity(row)">编辑</t-link>
            <template v-if="row.status === 'DRAFT'">
              <t-link theme="success" @click="handleToggleStatus(row, 'ACTIVE')">启用</t-link>
            </template>
            <template v-else-if="row.status === 'ACTIVE'">
              <t-link theme="warning" @click="handleToggleStatus(row, 'ENDED')">结束</t-link>
            </template>
            <t-link
              v-if="row.status !== 'ACTIVE' || row.issuedCount === 0"
              theme="danger"
              @click="handleDeleteActivity(row)"
            >删除</t-link>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 活动对话框 -->
    <t-dialog
      v-model:visible="activityDialogVisible"
      :header="activityDialogTitle"
      width="600px"
      :confirm-btn="{ content: '保存', loading: activityFormLoading }"
      :on-confirm="submitActivityForm"
    >
      <t-form :data="activityForm" label-width="100px">
        <t-form-item label="活动名称" name="name" required>
          <t-input
            v-model="activityForm.name"
            placeholder="例如：新春领券福利"
            maxlength="100"
          />
        </t-form-item>
        <t-form-item label="券面额" name="couponAmount" required>
          <t-input-number
            v-model="activityForm.couponAmount"
            :min="1"
            :max="1000"
            :decimal-places="2"
            suffix="元"
            placeholder="每张代金券的面额"
            style="width: 200px"
          />
        </t-form-item>
        <t-form-item label="发放数量" name="totalCount" required>
          <t-input-number
            v-model="activityForm.totalCount"
            :min="1"
            :max="100000"
            :decimal-places="0"
            suffix="张"
            placeholder="总共可发放的数量"
            style="width: 200px"
          />
        </t-form-item>
        <t-form-item label="每人限领" name="limitPerUser" required>
          <t-input-number
            v-model="activityForm.limitPerUser"
            :min="1"
            :max="100"
            :decimal-places="0"
            suffix="张"
            placeholder="每人可领取的数量"
            style="width: 200px"
          />
        </t-form-item>
        <t-form-item label="领取开始" name="startTime" required>
          <t-date-picker
            v-model="activityForm.startTime"
            mode="date"
            enable-time-picker
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择开始时间"
            style="width: 100%"
          />
        </t-form-item>
        <t-form-item label="领取结束" name="endTime" required>
          <t-date-picker
            v-model="activityForm.endTime"
            mode="date"
            enable-time-picker
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择结束时间"
            style="width: 100%"
          />
        </t-form-item>
        <t-form-item label="券过期时间" name="expiredAt" required>
          <t-date-picker
            v-model="activityForm.expiredAt"
            mode="date"
            enable-time-picker
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="代金券过期时间"
            style="width: 100%"
          />
          <div class="form-tip">建议设置为2026-02-14（情人节），春节期间使用</div>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<style scoped lang="less">
.page-container {
  padding: 20px;
}

.info-card {
  margin-bottom: 20px;
  background: linear-gradient(135deg, #fff7e6 0%, #ffe4ba 100%);
}

.info-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.info-icon {
  font-size: 32px;
}

.info-text {
  h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #d46b08;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #666;

    strong {
      color: #d46b08;
    }
  }
}

.search-card {
  margin-bottom: 20px;
}

.table-card {
  .amount-text {
    color: #f40;
    font-weight: 600;
    font-size: 16px;
  }

  .stock-cell {
    margin-bottom: 4px;

    .issued {
      color: #0052d9;
      font-weight: 600;
    }

    .separator {
      color: #999;
      margin: 0 4px;
    }

    .total {
      color: #666;
    }
  }

  .time-cell {
    .time-item {
      line-height: 1.8;
    }
    .time-label {
      color: #999;
      font-size: 12px;
    }
  }
}

.form-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}
</style>
