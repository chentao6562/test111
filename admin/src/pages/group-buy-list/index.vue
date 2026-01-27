<script setup lang="ts">
/**
 * 拼团列表管理页面
 * 查看所有拼团活动及其成员详情
 * @since 2026-01-21
 */
import { ref, onMounted, computed } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next'
import request from '@/api/request'
import { EmptyState } from '@/components'

// 拼团状态枚举
const GroupBuyStatus = {
  FORMING: 'FORMING',
  FULL: 'FULL',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
} as const

// 状态标签
const statusLabels: Record<string, string> = {
  FORMING: '组队中',
  FULL: '已满员',
  COMPLETED: '已完成',
  EXPIRED: '已过期',
  CANCELLED: '已取消'
}

// 状态颜色
const statusThemes: Record<string, string> = {
  FORMING: 'warning',
  FULL: 'success',
  COMPLETED: 'default',
  EXPIRED: 'default',
  CANCELLED: 'danger'
}

// 拼团成员类型
interface GroupBuyMember {
  id: number
  customerName: string
  customerPhone: string
  reservationId: number
  status: string
  joinedAt: string
  pickedUpAt: string | null
  bonusGiftDelivered: boolean
}

// 拼团类型
interface GroupBuy {
  id: number
  code: string
  initiatorName: string
  initiatorPhone: string
  requiredCount: number
  currentCount: number
  bonusGiftName: string | null
  storeName: string
  storeAddress: string | null
  storeId: number
  regionName: string | null  // 顺路拼团区域
  pickupDate: string
  status: string
  expireAt: string
  createdAt: string
  completedAt: string | null
  members: GroupBuyMember[]
}

// 统计数据
const stats = ref({
  total: 0,
  forming: 0,
  full: 0,
  completed: 0,
  expired: 0
})

// 表格数据
const data = ref<GroupBuy[]>([])
const loading = ref(false)
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
})

// 搜索条件
const searchForm = ref({
  status: '',
  code: '',
  phone: '',
  dateRange: [] as string[]
})

// 详情对话框
const detailVisible = ref(false)
const currentGroupBuy = ref<GroupBuy | null>(null)
const cancelLoading = ref(false)

// 表格列定义
const columns: PrimaryTableCol[] = [
  { colKey: 'code', title: '拼团码', width: 130 },
  { colKey: 'initiator', title: '发起人', width: 150, cell: 'initiator' },
  { colKey: 'store', title: '提货门店', minWidth: 120 },
  { colKey: 'pickupDate', title: '提货日期', width: 110, cell: 'pickupDate' },
  { colKey: 'progress', title: '进度', width: 120, cell: 'progress' },
  { colKey: 'bonusGiftName', title: '成团赠品', width: 150, cell: 'bonusGift' },
  { colKey: 'expireAt', title: '过期时间', width: 160, cell: 'expireAt' },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'createdAt', title: '创建时间', width: 160, cell: 'createdAt' },
  { colKey: 'action', title: '操作', width: 100, fixed: 'right', cell: 'action' }
]

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: '组队中', value: 'FORMING' },
  { label: '已满员', value: 'FULL' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已过期', value: 'EXPIRED' },
  { label: '已取消', value: 'CANCELLED' }
]

// 加载统计数据
const loadStats = async () => {
  try {
    const res = await request.get('/admin/group-buy/stats')
    if (res.data) {
      stats.value = {
        total: res.data.total || 0,
        forming: res.data.forming || 0,
        full: res.data.full || 0,
        completed: res.data.completed || 0,
        expired: res.data.expired || 0
      }
    }
  } catch (error: any) {
    console.error('加载统计失败:', error)
  }
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.value.current,
      pageSize: pagination.value.pageSize
    }

    if (searchForm.value.status) params.status = searchForm.value.status
    if (searchForm.value.code) params.code = searchForm.value.code
    if (searchForm.value.phone) params.phone = searchForm.value.phone
    if (searchForm.value.dateRange?.length === 2) {
      params.startDate = searchForm.value.dateRange[0]
      params.endDate = searchForm.value.dateRange[1]
    }

    const res = await request.get('/admin/group-buy/list', { params })
    if (res.data) {
      if (Array.isArray(res.data)) {
        data.value = res.data
        pagination.value.total = res.data.length
      } else if (res.data.list) {
        data.value = res.data.list
        pagination.value.total = res.data.total || res.data.list.length
      }
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
  loadData()
}

// 搜索
const onSearch = () => {
  pagination.value.current = 1
  loadData()
}

// 重置搜索
const onReset = () => {
  searchForm.value = {
    status: '',
    code: '',
    phone: '',
    dateRange: []
  }
  pagination.value.current = 1
  loadData()
}

// 查看详情
const viewDetail = async (row: GroupBuy) => {
  try {
    const res = await request.get(`/admin/group-buy/${row.code}`)
    if (res.data) {
      currentGroupBuy.value = res.data
      detailVisible.value = true
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '加载详情失败')
  }
}

// 取消拼团
const handleCancel = async () => {
  if (!currentGroupBuy.value) return

  cancelLoading.value = true
  try {
    await request.post(`/admin/group-buy/${currentGroupBuy.value.code}/cancel`)
    MessagePlugin.success('取消成功')
    detailVisible.value = false
    loadStats()
    loadData()
  } catch (error: any) {
    MessagePlugin.error(error.message || '取消失败')
  } finally {
    cancelLoading.value = false
  }
}

// 是否可以取消（只有组队中和已满员状态可以取消）
const canCancel = computed(() => {
  if (!currentGroupBuy.value) return false
  return ['FORMING', 'FULL'].includes(currentGroupBuy.value.status)
})

// 格式化时间
const formatTime = (timeStr: string | null) => {
  if (!timeStr) return '-'
  return new Date(timeStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化日期
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  })
}

// 手机号脱敏
const maskPhone = (phone: string) => {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 计算剩余时间
const getRemainingTime = (expireAt: string): string => {
  const expireTime = new Date(expireAt).getTime()
  const now = Date.now()
  const diff = expireTime - now

  if (diff <= 0) return '已过期'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `剩余${days}天`
  } else if (hours > 0) {
    return `剩余${hours}小时${minutes}分`
  } else {
    return `剩余${minutes}分钟`
  }
}

// 成员状态标签
const getMemberStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    JOINED: '已加入',
    PICKED_UP: '已提货',
    QUIT: '已退出'
  }
  return labels[status] || status
}

const getMemberStatusTheme = (status: string) => {
  const themes: Record<string, string> = {
    JOINED: 'primary',
    PICKED_UP: 'success',
    QUIT: 'default'
  }
  return themes[status] || 'default'
}

onMounted(() => {
  loadStats()
  loadData()
})
</script>

<template>
  <div class="page-container">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <t-card class="stat-card" :bordered="false">
        <div class="stat-content">
          <div class="stat-icon total">
            <t-icon name="usergroup" size="24px" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">总拼团数</div>
          </div>
        </div>
      </t-card>
      <t-card class="stat-card" :bordered="false">
        <div class="stat-content">
          <div class="stat-icon forming">
            <t-icon name="time" size="24px" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.forming }}</div>
            <div class="stat-label">组队中</div>
          </div>
        </div>
      </t-card>
      <t-card class="stat-card" :bordered="false">
        <div class="stat-content">
          <div class="stat-icon full">
            <t-icon name="check-circle" size="24px" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.full }}</div>
            <div class="stat-label">已满员</div>
          </div>
        </div>
      </t-card>
      <t-card class="stat-card" :bordered="false">
        <div class="stat-content">
          <div class="stat-icon completed">
            <t-icon name="check-double" size="24px" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.completed }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
      </t-card>
      <t-card class="stat-card" :bordered="false">
        <div class="stat-content">
          <div class="stat-icon expired">
            <t-icon name="close-circle" size="24px" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.expired }}</div>
            <div class="stat-label">已过期</div>
          </div>
        </div>
      </t-card>
    </div>

    <!-- 搜索栏 -->
    <t-card class="search-card" :bordered="false">
      <t-form :data="searchForm" layout="inline">
        <t-form-item label="状态" name="status">
          <t-select
            v-model="searchForm.status"
            :options="statusOptions"
            placeholder="请选择状态"
            style="width: 140px"
            clearable
          />
        </t-form-item>
        <t-form-item label="拼团码" name="code">
          <t-input
            v-model="searchForm.code"
            placeholder="请输入拼团码"
            style="width: 160px"
            clearable
          />
        </t-form-item>
        <t-form-item label="手机号" name="phone">
          <t-input
            v-model="searchForm.phone"
            placeholder="发起人或成员手机号"
            style="width: 160px"
            clearable
          />
        </t-form-item>
        <t-form-item label="创建日期" name="dateRange">
          <t-date-range-picker
            v-model="searchForm.dateRange"
            placeholder="选择日期范围"
            style="width: 240px"
            clearable
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" @click="onSearch">查询</t-button>
          <t-button theme="default" variant="base" @click="onReset">重置</t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <!-- 表格 -->
    <t-card class="table-card" :bordered="false">
      <t-table
        :data="data"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="onPageChange"
      >
        <template #empty>
          <EmptyState
            :type="searchForm.status || searchForm.code ? 'search' : 'data'"
            :title="searchForm.status || searchForm.code ? '未找到匹配结果' : '暂无拼团记录'"
            :description="searchForm.status || searchForm.code ? '请尝试调整筛选条件' : '当客户发起拼团后将在此显示'"
          />
        </template>

        <!-- 发起人 -->
        <template #initiator="{ row }">
          <div class="initiator-info">
            <div class="name">{{ row.initiatorName }}</div>
            <div class="phone">{{ maskPhone(row.initiatorPhone) }}</div>
          </div>
        </template>

        <!-- 提货门店 -->
        <template #store="{ row }">
          {{ row.storeName || '-' }}
        </template>

        <!-- 提货日期 -->
        <template #pickupDate="{ row }">
          {{ formatDate(row.pickupDate) }}
        </template>

        <!-- 进度 -->
        <template #progress="{ row }">
          <div class="progress-info">
            <t-progress
              :percentage="(row.currentCount / row.requiredCount) * 100"
              :color="row.currentCount >= row.requiredCount ? '#52c41a' : '#1890ff'"
              size="small"
              :stroke-width="6"
            />
            <span class="progress-text">{{ row.currentCount }}/{{ row.requiredCount }}人</span>
          </div>
        </template>

        <!-- 成团赠品 -->
        <template #bonusGift="{ row }">
          <div v-if="row.bonusGiftName" class="gift-info">
            <t-icon name="gift" size="14px" style="color: #f60" />
            <span>{{ row.bonusGiftName }}</span>
          </div>
          <span v-else class="no-gift">-</span>
        </template>

        <!-- 过期时间 -->
        <template #expireAt="{ row }">
          <div v-if="row.status === 'FORMING'" class="expire-info">
            <div>{{ formatTime(row.expireAt) }}</div>
            <t-tag theme="warning" size="small">{{ getRemainingTime(row.expireAt) }}</t-tag>
          </div>
          <span v-else>{{ formatTime(row.expireAt) }}</span>
        </template>

        <!-- 状态 -->
        <template #status="{ row }">
          <t-tag :theme="statusThemes[row.status]">{{ statusLabels[row.status] }}</t-tag>
        </template>

        <!-- 创建时间 -->
        <template #createdAt="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>

        <!-- 操作 -->
        <template #action="{ row }">
          <t-link theme="primary" @click="viewDetail(row)">详情</t-link>
        </template>
      </t-table>
    </t-card>

    <!-- 详情对话框 -->
    <t-dialog
      v-model:visible="detailVisible"
      header="拼团详情"
      width="700px"
    >
      <template #footer>
        <t-button theme="default" @click="detailVisible = false">关闭</t-button>
        <t-popconfirm
          v-if="canCancel"
          content="确定要取消该拼团吗？取消后所有成员都将退出拼团。"
          @confirm="handleCancel"
        >
          <t-button theme="danger" :loading="cancelLoading">取消拼团</t-button>
        </t-popconfirm>
      </template>
      <div v-if="currentGroupBuy" class="detail-content">
        <!-- 基本信息 -->
        <div class="detail-section">
          <h4>基本信息</h4>
          <t-descriptions :column="2" bordered>
            <t-descriptions-item label="拼团码">{{ currentGroupBuy.code }}</t-descriptions-item>
            <t-descriptions-item label="状态">
              <t-tag :theme="statusThemes[currentGroupBuy.status]">
                {{ statusLabels[currentGroupBuy.status] }}
              </t-tag>
            </t-descriptions-item>
            <t-descriptions-item label="发起人">
              {{ currentGroupBuy.initiatorName }} ({{ maskPhone(currentGroupBuy.initiatorPhone) }})
            </t-descriptions-item>
            <t-descriptions-item label="提货门店">{{ currentGroupBuy.storeName }}</t-descriptions-item>
            <t-descriptions-item label="门店地址" :span="2">
              {{ currentGroupBuy.storeAddress || '-' }}
            </t-descriptions-item>
            <t-descriptions-item label="顺路区域" v-if="currentGroupBuy.regionName">
              <t-tag theme="primary" variant="light">{{ currentGroupBuy.regionName }}</t-tag>
            </t-descriptions-item>
            <t-descriptions-item label="提货日期">{{ formatDate(currentGroupBuy.pickupDate) }}</t-descriptions-item>
            <t-descriptions-item label="成团进度">
              {{ currentGroupBuy.currentCount }}/{{ currentGroupBuy.requiredCount }}人
            </t-descriptions-item>
            <t-descriptions-item label="成团赠品">
              {{ currentGroupBuy.bonusGiftName || '未设置' }}
            </t-descriptions-item>
            <t-descriptions-item label="创建时间">{{ formatTime(currentGroupBuy.createdAt) }}</t-descriptions-item>
            <t-descriptions-item label="过期时间" v-if="currentGroupBuy.status === 'FORMING'">
              {{ formatTime(currentGroupBuy.expireAt) }}
              <t-tag theme="warning" size="small" style="margin-left: 8px">
                {{ getRemainingTime(currentGroupBuy.expireAt) }}
              </t-tag>
            </t-descriptions-item>
            <t-descriptions-item label="完成时间" v-if="currentGroupBuy.completedAt">
              {{ formatTime(currentGroupBuy.completedAt) }}
            </t-descriptions-item>
          </t-descriptions>
        </div>

        <!-- 成员列表 -->
        <div class="detail-section">
          <h4>成员列表 ({{ currentGroupBuy.members?.length || 0 }}人)</h4>
          <t-table
            :data="currentGroupBuy.members || []"
            :columns="[
              { colKey: 'customerName', title: '姓名', width: 100 },
              { colKey: 'customerPhone', title: '手机号', width: 130, cell: 'phone' },
              { colKey: 'reservationId', title: '预约ID', width: 100 },
              { colKey: 'joinedAt', title: '加入时间', width: 160, cell: 'joinedAt' },
              { colKey: 'status', title: '状态', width: 100, cell: 'memberStatus' },
              { colKey: 'bonusGiftDelivered', title: '赠品发放', width: 100, cell: 'giftStatus' }
            ]"
            row-key="id"
            size="small"
            :hover="true"
          >
            <template #phone="{ row }">
              {{ maskPhone(row.customerPhone) }}
            </template>
            <template #joinedAt="{ row }">
              {{ formatTime(row.joinedAt) }}
            </template>
            <template #memberStatus="{ row }">
              <t-tag :theme="getMemberStatusTheme(row.status)" size="small">
                {{ getMemberStatusLabel(row.status) }}
              </t-tag>
            </template>
            <template #giftStatus="{ row }">
              <t-tag v-if="row.bonusGiftDelivered" theme="success" size="small">已发放</t-tag>
              <t-tag v-else theme="default" size="small">未发放</t-tag>
            </template>
          </t-table>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<style scoped lang="less">
.page-container {
  padding: 20px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  .stat-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;

    &.total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    &.forming { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    &.full { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    &.completed { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
    &.expired { background: linear-gradient(135deg, #868f96 0%, #596164 100%); }
  }

  .stat-info {
    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: var(--td-text-color-primary);
    }

    .stat-label {
      font-size: 13px;
      color: var(--td-text-color-secondary);
      margin-top: 4px;
    }
  }
}

.search-card {
  margin-bottom: 20px;
}

.table-card {
  :deep(.t-table) {
    .initiator-info {
      .name {
        font-weight: 500;
      }
      .phone {
        font-size: 12px;
        color: #999;
      }
    }

    .progress-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .t-progress {
        flex: 1;
      }

      .progress-text {
        font-size: 12px;
        color: #666;
        white-space: nowrap;
      }
    }

    .gift-info {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .no-gift {
      color: #999;
    }

    .expire-info {
      font-size: 12px;
      line-height: 1.5;
    }
  }
}

.detail-content {
  .detail-section {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }

    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--td-text-color-primary);
      padding-left: 8px;
      border-left: 3px solid var(--td-brand-color);
    }
  }
}
</style>
