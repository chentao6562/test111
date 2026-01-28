<template>
  <div class="customers-page">
    <!-- 页面标题 -->
    <PageHeader title="客户风控" subtitle="管理客户预约记录，监控风险等级，处理黑名单" />

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card total">
        <div class="stat-icon">
          <t-icon name="user" size="28px" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总客户数</div>
        </div>
      </div>
      <div class="stat-card normal">
        <div class="stat-icon">
          <t-icon name="check-circle" size="28px" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.normal }}</div>
          <div class="stat-label">正常客户</div>
        </div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon">
          <t-icon name="error-circle" size="28px" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.mediumRisk + stats.highRisk }}</div>
          <div class="stat-label">风险客户</div>
        </div>
      </div>
      <div class="stat-card danger">
        <div class="stat-icon">
          <t-icon name="close-circle" size="28px" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.blocked }}</div>
          <div class="stat-label">黑名单</div>
        </div>
      </div>
    </div>

    <!-- 筛选区域 -->
    <FilterCard>
      <t-form layout="inline" :data="filterForm" @submit="handleSearch">
        <t-form-item label="手机号">
          <t-input
            v-model="filterForm.phone"
            placeholder="请输入手机号"
            clearable
            style="width: 180px"
          />
        </t-form-item>
        <t-form-item label="风险等级">
          <t-select
            v-model="filterForm.riskLevel"
            placeholder="全部等级"
            clearable
            style="width: 140px"
          >
            <t-option
              v-for="(item, key) in RISK_LEVELS"
              :key="key"
              :value="parseInt(key)"
              :label="item.label"
            />
          </t-select>
        </t-form-item>
        <t-form-item label="黑名单">
          <t-select
            v-model="filterForm.isBlocked"
            placeholder="全部"
            clearable
            style="width: 120px"
          >
            <t-option :value="true" label="是" />
            <t-option :value="false" label="否" />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-space>
            <t-button theme="primary" type="submit">
              <template #icon><t-icon name="search" /></template>
              查询
            </t-button>
            <t-button theme="default" @click="handleReset">
              <template #icon><t-icon name="refresh" /></template>
              重置
            </t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </FilterCard>

    <!-- 数据表格 -->
    <TableCard title="客户列表">
      <template v-if="!loading && customerList.length === 0">
        <EmptyState
          v-if="hasFilters"
          type="search"
          title="未找到匹配的客户"
          description="请尝试调整筛选条件"
        >
          <template #action>
            <t-button theme="primary" @click="handleReset">清除筛选</t-button>
          </template>
        </EmptyState>
        <EmptyState
          v-else
          type="data"
          title="暂无客户数据"
          description="还没有客户预约记录"
        />
      </template>

      <t-table
        v-else
        :data="customerList"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        hover
        stripe
        @page-change="handlePageChange"
      >
        <!-- 手机号 -->
        <template #phone="{ row }">
          <span class="phone-text">{{ row.phone }}</span>
        </template>

        <!-- 开发人员【2026-01-28新增】 -->
        <template #firstAgent="{ row }">
          <div v-if="row.firstAgentId" class="agent-cell">
            <span class="agent-name">{{ row.firstAgentName || '-' }}</span>
          </div>
          <span v-else class="empty-text">自然流量</span>
        </template>

        <!-- 预约统计 -->
        <template #reservationStats="{ row }">
          <div class="stats-cell">
            <span class="stat-item">
              <span class="label">预约</span>
              <span class="value">{{ row.totalReservations }}</span>
            </span>
            <span class="divider">|</span>
            <span class="stat-item success">
              <span class="label">完成</span>
              <span class="value">{{ row.completedCount }}</span>
            </span>
            <span class="divider">|</span>
            <span class="stat-item danger">
              <span class="label">爽约</span>
              <span class="value">{{ row.noShowCount }}</span>
            </span>
          </div>
        </template>

        <!-- 风险等级 -->
        <template #riskLevel="{ row }">
          <StatusTag
            :type="RISK_LEVELS[row.riskLevel]?.color || 'default'"
            :text="RISK_LEVELS[row.riskLevel]?.label || '未知'"
          />
        </template>

        <!-- 黑名单 -->
        <template #isBlocked="{ row }">
          <t-tag v-if="row.isBlocked" theme="danger" variant="light">
            <t-icon name="close-circle" size="14px" />
            黑名单
          </t-tag>
          <span v-else class="normal-text">-</span>
        </template>

        <!-- 最后预约 -->
        <template #lastReservationAt="{ row }">
          <span v-if="row.lastReservationAt" class="time-text">
            {{ formatTime(row.lastReservationAt) }}
          </span>
          <span v-else class="empty-text">-</span>
        </template>

        <!-- 操作 -->
        <template #operation="{ row }">
          <t-space size="small">
            <t-link theme="primary" @click="handleViewDetail(row)">详情</t-link>
            <t-popconfirm
              v-if="!row.isBlocked"
              content="确定将此客户加入黑名单？"
              @confirm="handleBlock(row)"
            >
              <t-link theme="danger">拉黑</t-link>
            </t-popconfirm>
            <t-popconfirm
              v-else
              content="确定解除此客户的黑名单？"
              @confirm="handleUnblock(row)"
            >
              <t-link theme="success">解除</t-link>
            </t-popconfirm>
            <t-popconfirm
              v-if="row.riskLevel > 0 && !row.isBlocked"
              content="确定重置此客户的风险等级？"
              @confirm="handleResetRisk(row)"
            >
              <t-link theme="warning">重置</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </TableCard>

    <!-- 客户详情弹窗 -->
    <t-dialog
      v-model:visible="detailVisible"
      header="客户详情"
      width="700px"
      :footer="false"
    >
      <div v-if="currentCustomer" class="customer-detail">
        <!-- 基本信息 -->
        <div class="detail-section">
          <div class="section-title">基本信息</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">手机号</span>
              <span class="info-value highlight">{{ currentCustomer.phone }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">风险等级</span>
              <StatusTag
                :type="RISK_LEVELS[currentCustomer.riskLevel]?.color || 'default'"
                :text="RISK_LEVELS[currentCustomer.riskLevel]?.label || '未知'"
              />
            </div>
            <div class="info-item">
              <span class="info-label">黑名单状态</span>
              <t-tag v-if="currentCustomer.isBlocked" theme="danger" variant="light">
                是
              </t-tag>
              <t-tag v-else theme="success" variant="light">否</t-tag>
            </div>
            <div class="info-item">
              <span class="info-label">创建时间</span>
              <span class="info-value">{{ formatTime(currentCustomer.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- 预约统计 -->
        <div class="detail-section">
          <div class="section-title">预约统计</div>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-number">{{ currentCustomer.totalReservations }}</div>
              <div class="stat-text">总预约数</div>
            </div>
            <div class="stat-box success">
              <div class="stat-number">{{ currentCustomer.completedCount }}</div>
              <div class="stat-text">完成数</div>
            </div>
            <div class="stat-box warning">
              <div class="stat-number">{{ currentCustomer.cancelCount }}</div>
              <div class="stat-text">取消数</div>
            </div>
            <div class="stat-box danger">
              <div class="stat-number">{{ currentCustomer.noShowCount }}</div>
              <div class="stat-text">爽约数</div>
            </div>
          </div>
        </div>

        <!-- 预约历史 -->
        <div class="detail-section">
          <div class="section-title">最近预约</div>
          <t-table
            :data="customerReservations"
            :columns="reservationColumns"
            size="small"
            :loading="loadingReservations"
            max-height="300"
          >
            <template #status="{ row }">
              <StatusTag
                :type="getReservationStatusColor(row.status)"
                :text="getReservationStatusLabel(row.status)"
              />
            </template>
          </t-table>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import FilterCard from '@/components/FilterCard.vue'
import TableCard from '@/components/TableCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useFormatter } from '@/composables/useFormatter'
import {
  getCustomerStats,
  getCustomerList,
  getCustomerReservations,
  blockCustomer,
  unblockCustomer,
  resetCustomerRisk,
  RISK_LEVELS,
  type CustomerRecord,
  type CustomerStats
} from '@/api/customer'

const { formatTime } = useFormatter()

// 预约状态映射（完整支持0-9状态）
const RESERVATION_STATUSES: Record<number, { label: string; color: string }> = {
  0: { label: '待确认', color: 'warning' },
  1: { label: '确认中', color: 'primary' },
  2: { label: '已确认', color: 'success' },
  3: { label: '已完成', color: 'default' },
  4: { label: '已取消', color: 'default' },
  5: { label: '已过期', color: 'danger' },
  6: { label: '确认失败', color: 'danger' },
  7: { label: '待备货', color: 'warning' },
  8: { label: '备货中', color: 'primary' },
  9: { label: '待提货', color: 'success' },
}

// 统计数据
const stats = ref<CustomerStats>({
  total: 0,
  normal: 0,
  lowRisk: 0,
  mediumRisk: 0,
  highRisk: 0,
  blocked: 0,
})

// 筛选表单
const filterForm = reactive({
  phone: '',
  riskLevel: undefined as number | undefined,
  isBlocked: undefined as boolean | undefined,
})

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

// 数据
const loading = ref(false)
const customerList = ref<CustomerRecord[]>([])
const currentCustomer = ref<CustomerRecord | null>(null)
const detailVisible = ref(false)
const customerReservations = ref<any[]>([])
const loadingReservations = ref(false)

// 表格列配置
const columns = [
  { colKey: 'phone', title: '手机号', width: 140 },
  { colKey: 'firstAgent', title: '开发人员', width: 140 },
  { colKey: 'reservationStats', title: '预约统计', width: 220 },
  { colKey: 'riskLevel', title: '风险等级', width: 100 },
  { colKey: 'isBlocked', title: '黑名单', width: 100 },
  { colKey: 'lastReservationAt', title: '最后预约', width: 160 },
  { colKey: 'operation', title: '操作', width: 160, fixed: 'right' },
]

// 预约历史表格列
const reservationColumns = [
  { colKey: 'reservationNo', title: '预约号', width: 140 },
  { colKey: 'customerName', title: '客户名', width: 80 },
  { colKey: 'totalAmount', title: '金额', width: 80 },
  { colKey: 'status', title: '状态', width: 90 },
  { colKey: 'createdAt', title: '预约时间', width: 140, cell: (h: any, { row }: any) => formatTime(row.createdAt) },
]

// 是否有筛选条件
const hasFilters = computed(() => {
  return filterForm.phone || filterForm.riskLevel !== undefined || filterForm.isBlocked !== undefined
})

// 获取预约状态颜色
const getReservationStatusColor = (status: number) => {
  return RESERVATION_STATUSES[status]?.color || 'default'
}

// 获取预约状态标签
const getReservationStatusLabel = (status: number) => {
  return RESERVATION_STATUSES[status]?.label || '未知'
}

// 加载统计数据
const loadStats = async () => {
  try {
    const data = await getCustomerStats()
    stats.value = data
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

// 加载客户列表
const loadCustomers = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.current,
      pageSize: pagination.pageSize,
    }
    if (filterForm.phone) params.phone = filterForm.phone
    if (filterForm.riskLevel !== undefined) params.riskLevel = filterForm.riskLevel
    if (filterForm.isBlocked !== undefined) params.isBlocked = filterForm.isBlocked

    const res = await getCustomerList(params)
    customerList.value = res.list || []
    pagination.total = res.total || 0
  } catch (error) {
    console.error('加载客户列表失败:', error)
    MessagePlugin.error('加载客户列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.current = 1
  loadCustomers()
}

// 重置
const handleReset = () => {
  filterForm.phone = ''
  filterForm.riskLevel = undefined
  filterForm.isBlocked = undefined
  pagination.current = 1
  loadCustomers()
}

// 分页
const handlePageChange = (pageInfo: any) => {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  loadCustomers()
}

// 查看详情
const handleViewDetail = async (row: CustomerRecord) => {
  currentCustomer.value = row
  detailVisible.value = true
  loadCustomerReservations(row.phone)
}

// 加载客户预约历史
const loadCustomerReservations = async (phone: string) => {
  loadingReservations.value = true
  try {
    const res = await getCustomerReservations(phone, { pageSize: 10 })
    customerReservations.value = res.list || []
  } catch (error) {
    console.error('加载预约历史失败:', error)
    customerReservations.value = []
  } finally {
    loadingReservations.value = false
  }
}

// 拉黑客户
const handleBlock = async (row: CustomerRecord) => {
  try {
    await blockCustomer(row.id)
    MessagePlugin.success('已加入黑名单')
    loadCustomers()
    loadStats()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  }
}

// 解除黑名单
const handleUnblock = async (row: CustomerRecord) => {
  try {
    await unblockCustomer(row.id)
    MessagePlugin.success('已解除黑名单')
    loadCustomers()
    loadStats()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  }
}

// 重置风险等级
const handleResetRisk = async (row: CustomerRecord) => {
  try {
    await resetCustomerRisk(row.id)
    MessagePlugin.success('风险等级已重置')
    loadCustomers()
    loadStats()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  }
}

// 初始化
onMounted(() => {
  loadStats()
  loadCustomers()
})
</script>

<style scoped lang="less">
.customers-page {
  padding: 0;
}

// 统计卡片
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
  }

  .stat-info {
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
  }

  &.total .stat-icon {
    background: linear-gradient(135deg, #2196F3, #64B5F6);
  }
  &.normal .stat-icon {
    background: linear-gradient(135deg, #4CAF50, #81C784);
  }
  &.warning .stat-icon {
    background: linear-gradient(135deg, #FF9800, #FFB74D);
  }
  &.danger .stat-icon {
    background: linear-gradient(135deg, #F44336, #EF5350);
  }
}

// 表格单元格
.phone-text {
  font-family: monospace;
  font-size: 14px;
  color: #1890ff;
}

// 开发人员单元格【2026-01-28新增】
.agent-cell {
  .agent-name {
    font-weight: 500;
    color: #333;
  }
}

.stats-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;

  .stat-item {
    .label {
      color: #999;
      margin-right: 4px;
    }
    .value {
      font-weight: 500;
      color: #333;
    }
    &.success .value {
      color: #4CAF50;
    }
    &.danger .value {
      color: #F44336;
    }
  }

  .divider {
    color: #ddd;
  }
}

.time-text {
  font-size: 13px;
  color: #666;
}

.empty-text,
.normal-text {
  color: #999;
}

// 详情弹窗
.customer-detail {
  .detail-section {
    margin-bottom: 24px;
    padding: 16px;
    background: #fafafa;
    border-radius: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #eee;
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .info-label {
        color: #666;
      }
      .info-value {
        font-weight: 500;
        &.highlight {
          color: #1890ff;
          font-size: 16px;
        }
      }
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;

    .stat-box {
      text-align: center;
      padding: 16px;
      background: #fff;
      border-radius: 8px;
      border: 1px solid #eee;

      .stat-number {
        font-size: 24px;
        font-weight: 700;
        color: #333;
        margin-bottom: 4px;
      }
      .stat-text {
        font-size: 13px;
        color: #666;
      }

      &.success {
        border-color: #c8e6c9;
        background: #e8f5e9;
        .stat-number { color: #4CAF50; }
      }
      &.warning {
        border-color: #ffe0b2;
        background: #fff3e0;
        .stat-number { color: #FF9800; }
      }
      &.danger {
        border-color: #ffcdd2;
        background: #ffebee;
        .stat-number { color: #F44336; }
      }
    }
  }
}
</style>
