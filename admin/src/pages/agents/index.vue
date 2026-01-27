<template>
  <div class="agents-page">
    <!-- 页面标题 -->
    <PageHeader title="推销员管理" subtitle="管理所有推销员、查看业绩及审核新申请">
      <template #actions>
        <t-button theme="primary" @click="handleAdd">
          <template #icon><t-icon name="add" /></template>
          新增推销员
        </t-button>
      </template>
    </PageHeader>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <StatCard
        label="推销员总数"
        :value="statistics.total"
        icon="user"
        theme="primary"
        :loading="statsLoading"
      />
      <StatCard
        label="一级推销员"
        :value="statistics.byType?.LEVEL1 || 0"
        icon="user-checked"
        theme="warning"
        :loading="statsLoading"
      />
      <StatCard
        label="二级推销员"
        :value="statistics.byType?.LEVEL2 || 0"
        icon="usergroup"
        theme="info"
        :loading="statsLoading"
      />
      <StatCard
        label="普通用户"
        :value="statistics.byType?.WHOLESALE || 0"
        icon="user"
        theme="default"
        :loading="statsLoading"
      />
      <StatCard
        label="待审核"
        :value="statistics.pending"
        icon="time"
        theme="danger"
        :loading="statsLoading"
        :highlight="statistics.pending > 0"
        clickable
        @click="filterByStatus('PENDING')"
      />
    </div>

    <!-- 筛选区域 -->
    <FilterCard>
      <t-form layout="inline" :data="filterForm" @submit="handleSearch">
        <t-form-item label="推销员名称/手机号">
          <t-input
            v-model="filterForm.keyword"
            placeholder="输入名称或手机号"
            clearable
            style="width: 200px"
          >
            <template #prefix-icon><t-icon name="search" /></template>
          </t-input>
        </t-form-item>
        <t-form-item label="推销员等级">
          <t-select
            v-model="filterForm.type"
            placeholder="全部等级"
            clearable
            style="width: 140px"
          >
            <t-option value="LEVEL1" label="一级推销员" />
            <t-option value="LEVEL2" label="二级推销员" />
            <t-option value="WHOLESALE" label="普通用户" />
          </t-select>
        </t-form-item>
        <t-form-item label="状态筛选">
          <t-radio-group v-model="filterForm.status" variant="default-filled">
            <t-radio-button value="">全部</t-radio-button>
            <t-radio-button value="ACTIVE">正常</t-radio-button>
            <t-radio-button value="PENDING">待审核</t-radio-button>
            <t-radio-button value="DISABLED">已禁用</t-radio-button>
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
    <TableCard title="推销员列表">
      <template v-if="!loading && tableData.length === 0">
        <EmptyState
          v-if="hasFilters"
          type="search"
          title="未找到匹配的推销员"
          description="请尝试调整筛选条件"
        >
          <template #action>
            <t-button theme="primary" @click="handleReset">清除筛选</t-button>
          </template>
        </EmptyState>
        <EmptyState
          v-else
          type="data"
          title="暂无推销员"
          description="点击右上角按钮添加第一个推销员"
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
            <div class="agent-avatar" :class="getAvatarClass(row.type)">
              {{ row.name?.charAt(0) || '?' }}
            </div>
            <div class="agent-detail">
              <div class="agent-name">
                {{ row.name }}
                <span v-if="row.inviteCode" class="invite-code">{{ row.inviteCode }}</span>
              </div>
              <div class="agent-phone">{{ formatPhone(row.phone) }}</div>
            </div>
          </div>
        </template>

        <!-- 层级&区域列 -->
        <template #levelArea="{ row }">
          <div class="level-area">
            <StatusTag
              :type="getLevelTagType(row.type)"
              :text="AGENT_TYPES[row.type]?.label || row.type"
            />
            <div class="parent-info" v-if="row.parent">
              <t-icon name="user" size="12px" />
              <span>{{ row.parent.name }}</span>
            </div>
            <div class="parent-info independent" v-else>
              <t-icon name="home" size="12px" />
              <span>独立运营</span>
            </div>
          </div>
        </template>

        <!-- 业绩数据列 -->
        <template #performance="{ row }">
          <div class="performance-data">
            <AmountText :value="row.totalCommission" />
            <div class="order-count">
              <t-icon name="assignment" size="12px" />
              本月订单: {{ row._count?.orders || 0 }}
            </div>
          </div>
        </template>

        <!-- 下级数量列（团队） -->
        <template #children="{ row }">
          <div class="team-count" :class="{ active: (row._count?.children || 0) > 0 }">
            <span class="count-value">{{ row._count?.children || 0 }}</span>
            <span class="count-unit">人</span>
          </div>
        </template>

        <!-- 状态列 -->
        <template #statusCol="{ row }">
          <StatusTag
            :type="getStatusType(row.status)"
            :text="AGENT_STATUSES[row.status]?.label || row.status"
            :pulse="row.status === 'PENDING'"
          />
        </template>

        <!-- 加入时间列 -->
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
              <t-link theme="primary" @click="handleApprove(row)">审核通过</t-link>
            </template>
            <template v-else>
              <t-link theme="primary" @click="handleDetail(row)">详情</t-link>
              <t-divider layout="vertical" />
              <t-link theme="primary" @click="handleEdit(row)">编辑</t-link>
            </template>
          </t-space>
        </template>
      </t-table>
    </TableCard>

    <!-- 新增/编辑弹窗 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="dialogTitle"
      :confirm-btn="{ loading: submitLoading }"
      width="520px"
      @confirm="handleSubmit"
      @close="handleDialogClose"
    >
      <t-form
        ref="formRef"
        :data="formData"
        :rules="formRules"
        label-width="100px"
      >
        <t-form-item label="手机号" name="phone">
          <t-input
            v-model="formData.phone"
            placeholder="请输入手机号"
            :disabled="isEdit"
            maxlength="11"
          />
        </t-form-item>
        <t-form-item label="推销员名称" name="name">
          <t-input
            v-model="formData.name"
            placeholder="请输入推销员名称"
            maxlength="50"
          />
        </t-form-item>
        <t-form-item label="推销员等级" name="type">
          <t-select v-model="formData.type" placeholder="请选择推销员等级" @change="handleTypeChange">
            <t-option value="LEVEL1" label="一级推销员" />
            <t-option value="LEVEL2" label="二级推销员" />
          </t-select>
        </t-form-item>
        <t-form-item label="上级推销员" name="parentId" v-if="showParentSelect">
          <t-select
            v-model="formData.parentId"
            placeholder="请选择上级推销员"
            clearable
            filterable
            :loading="parentLoading"
          >
            <t-option
              v-for="parent in parentOptions"
              :key="parent.id"
              :value="parent.id"
              :label="`${parent.name} (${AGENT_TYPES[parent.type]?.label || parent.type})`"
            />
          </t-select>
          <template #help>
            <span class="form-help">{{ parentHelp }}</span>
          </template>
        </t-form-item>
        <t-form-item v-if="!isEdit" label="初始密码" name="password">
          <t-input
            v-model="formData.password"
            type="password"
            placeholder="留空则使用手机号后6位"
            maxlength="20"
          />
        </t-form-item>
        <t-form-item label="状态" name="status">
          <t-select v-model="formData.status" placeholder="请选择状态">
            <t-option value="ACTIVE" label="正常运营" />
            <t-option value="PENDING" label="待审核" />
            <t-option value="DISABLED" label="已禁用" />
          </t-select>
        </t-form-item>
        <!-- 【2026-01-27】移除分润方式选择，统一使用差价模式 -->
        <t-form-item label="分润方式" v-if="formData.type === 'LEVEL1'">
          <t-input value="进货差价" disabled />
          <template #help>
            <span class="form-help">分润 = Σ(零售价 - 代理价) × 数量</span>
          </template>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 详情弹窗 - Tab模式 -->
    <t-dialog
      v-model:visible="detailVisible"
      header="推销员详情"
      :footer="false"
      width="720px"
    >
      <div class="agent-detail-content" v-if="currentAgent">
        <!-- 推销员头部信息（始终显示） -->
        <div class="detail-header">
          <div class="detail-avatar" :class="getAvatarClass(currentAgent.type)">
            {{ currentAgent.name?.charAt(0) || '?' }}
          </div>
          <div class="detail-info">
            <div class="detail-name">
              {{ currentAgent.name }}
              <span class="detail-invite-code">{{ currentAgent.inviteCode }}</span>
            </div>
            <div class="detail-phone">{{ formatPhone(currentAgent.phone) }}</div>
            <div class="detail-tags">
              <StatusTag
                :type="getLevelTagType(currentAgent.type)"
                :text="AGENT_TYPES[currentAgent.type]?.label || currentAgent.type"
              />
              <StatusTag
                :type="getStatusType(currentAgent.status)"
                :text="AGENT_STATUSES[currentAgent.status]?.label || currentAgent.status"
              />
            </div>
          </div>
        </div>

        <!-- Tab分组内容 -->
        <t-tabs v-model="detailTab" class="detail-tabs">
          <!-- 基本信息Tab -->
          <t-tab-panel value="basic" label="基本信息">
            <div class="tab-content">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="item-label">推销员ID</span>
                  <span class="item-value">{{ currentAgent.id }}</span>
                </div>
                <div class="detail-item">
                  <span class="item-label">手机号</span>
                  <span class="item-value">{{ currentAgent.phone }}</span>
                </div>
                <div class="detail-item">
                  <span class="item-label">上级推销员</span>
                  <span class="item-value">
                    {{ currentAgent.parent ? `${currentAgent.parent.name} (${currentAgent.parent.phone})` : '无（独立运营）' }}
                  </span>
                </div>
                <div class="detail-item" v-if="currentAgent.type === 'LEVEL1'">
                  <span class="item-label">分润方式</span>
                  <span class="item-value">
                    <StatusTag
                      :type="currentAgent.commissionMethod === 'PRICE_DIFF' ? 'warning' : 'info'"
                      :text="COMMISSION_METHODS[currentAgent.commissionMethod || 'RATE']?.label || '按比例'"
                    />
                  </span>
                </div>
                <div class="detail-item">
                  <span class="item-label">加入时间</span>
                  <span class="item-value">{{ formatDateTime(currentAgent.createdAt) }}</span>
                </div>
                <div class="detail-item">
                  <span class="item-label">最近更新</span>
                  <span class="item-value">{{ formatDateTime(currentAgent.updatedAt) }}</span>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="tab-actions">
                <t-space>
                  <t-button variant="outline" @click="handleResetPassword(currentAgent)">
                    <template #icon><t-icon name="lock-on" /></template>
                    重置密码
                  </t-button>
                  <t-button variant="outline" @click="handleChangeParent(currentAgent)">
                    <template #icon><t-icon name="swap" /></template>
                    调整上级
                  </t-button>
                  <t-button
                    v-if="currentAgent.status === 'ACTIVE'"
                    theme="danger"
                    variant="outline"
                    @click="handleDisable(currentAgent)"
                  >
                    <template #icon><t-icon name="poweroff" /></template>
                    禁用账号
                  </t-button>
                  <t-button
                    v-if="currentAgent.status === 'DISABLED'"
                    theme="success"
                    variant="outline"
                    @click="handleEnable(currentAgent)"
                  >
                    <template #icon><t-icon name="check-circle" /></template>
                    启用账号
                  </t-button>
                </t-space>
              </div>
            </div>
          </t-tab-panel>

          <!-- 业绩数据Tab -->
          <t-tab-panel value="performance" label="业绩数据">
            <div class="tab-content">
              <!-- 数据统计卡片 -->
              <div class="detail-stats">
                <div class="detail-stat-item">
                  <div class="stat-icon balance">
                    <t-icon name="wallet" />
                  </div>
                  <div class="stat-info">
                    <div class="stat-value"><AmountText :value="currentAgent.balance" /></div>
                    <div class="stat-label">账户余额</div>
                  </div>
                </div>
                <div class="detail-stat-item">
                  <div class="stat-icon commission">
                    <t-icon name="chart" />
                  </div>
                  <div class="stat-info">
                    <div class="stat-value"><AmountText :value="currentAgent.totalCommission" /></div>
                    <div class="stat-label">累计分润</div>
                  </div>
                </div>
                <div class="detail-stat-item">
                  <div class="stat-icon team">
                    <t-icon name="usergroup" />
                  </div>
                  <div class="stat-info">
                    <div class="stat-value">{{ currentAgent._count?.children || 0 }}</div>
                    <div class="stat-label">团队成员</div>
                  </div>
                </div>
                <div class="detail-stat-item">
                  <div class="stat-icon orders">
                    <t-icon name="assignment" />
                  </div>
                  <div class="stat-info">
                    <div class="stat-value">{{ currentAgent._count?.orders || 0 }}</div>
                    <div class="stat-label">订单数量</div>
                  </div>
                </div>
              </div>

              <!-- 快速链接 -->
              <div class="quick-links">
                <div class="quick-link-item" @click="goToCommissionRecords(currentAgent)">
                  <div class="quick-link-icon">
                    <t-icon name="chart" />
                  </div>
                  <div class="quick-link-info">
                    <div class="quick-link-title">查看分润记录</div>
                    <div class="quick-link-desc">查看该推销员的所有分润明细</div>
                  </div>
                  <t-icon name="chevron-right" class="quick-link-arrow" />
                </div>
                <div class="quick-link-item" @click="goToWithdrawals(currentAgent)">
                  <div class="quick-link-icon orange">
                    <t-icon name="wallet" />
                  </div>
                  <div class="quick-link-info">
                    <div class="quick-link-title">提现记录</div>
                    <div class="quick-link-desc">查看该推销员的提现申请记录</div>
                  </div>
                  <t-icon name="chevron-right" class="quick-link-arrow" />
                </div>
              </div>
            </div>
          </t-tab-panel>

          <!-- 团队成员Tab -->
          <t-tab-panel value="team" label="团队成员">
            <div class="tab-content">
              <div v-if="(currentAgent._count?.children || 0) > 0" class="team-hint">
                <t-icon name="info-circle" />
                <span>该推销员下有 {{ currentAgent._count?.children || 0 }} 名下级成员</span>
              </div>
              <EmptyState
                v-else
                type="data"
                title="暂无团队成员"
                description="该推销员还未发展下级推销员"
                size="small"
              />
            </div>
          </t-tab-panel>
        </t-tabs>
      </div>
    </t-dialog>

    <!-- 调整上级弹窗 -->
    <t-dialog
      v-model:visible="changeParentVisible"
      header="调整上级推销员"
      width="450px"
      @confirm="handleChangeParentSubmit"
    >
      <t-form label-width="100px">
        <t-form-item label="当前推销员">
          <span>{{ currentAgent?.name }} ({{ AGENT_TYPES[currentAgent?.type || '']?.label || currentAgent?.type }})</span>
        </t-form-item>
        <t-form-item label="当前上级">
          <span>{{ currentAgent?.parent?.name || '无' }}</span>
        </t-form-item>
        <t-form-item label="新上级推销员">
          <t-select
            v-model="newParentId"
            placeholder="请选择新的上级推销员（留空表示移除上级）"
            clearable
            filterable
            :loading="parentLoading"
          >
            <t-option :value="0" label="无上级（独立）" />
            <t-option
              v-for="parent in parentOptions"
              :key="parent.id"
              :value="parent.id"
              :label="`${parent.name} (${AGENT_TYPES[parent.type]?.label || parent.type})`"
            />
          </t-select>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 推销员管理页面
 * 管理所有推销员、查看业绩及审核新申请
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
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
import {
  getAgentList,
  getAgentDetail,
  getAgentStatistics,
  createAgent,
  updateAgent,
  updateAgentStatus,
  resetAgentPassword,
  deleteAgent,
  AGENT_TYPES,
  AGENT_STATUSES,
  COMMISSION_METHODS,
  type Agent,
  type AgentFormData,
  type AgentStatistics,
} from '@/api/agent'

const router = useRouter()

// 筛选表单
const filterForm = reactive({
  keyword: '',
  type: '',
  status: '',
})

// 统计数据
const statistics = ref<AgentStatistics>({
  total: 0,
  active: 0,
  pending: 0,
  disabled: 0,
  byType: {},
})
const statsLoading = ref(false)

// 表格数据
const tableData = ref<Agent[]>([])
const loading = ref(false)

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

// 是否有筛选条件
const hasFilters = computed(() => {
  return filterForm.keyword || filterForm.type || filterForm.status
})

// 表格列定义
const columns = [
  { colKey: 'agentInfo', title: '推销员信息', width: 240 },
  { colKey: 'levelArea', title: '等级 & 上级', width: 160 },
  { colKey: 'performance', title: '业绩数据', width: 140 },
  { colKey: 'children', title: '团队', width: 80 },
  { colKey: 'statusCol', title: '状态', width: 100 },
  { colKey: 'createdAt', title: '加入时间', width: 130 },
  { colKey: 'operation', title: '操作', width: 120, fixed: 'right' as const },
]

// 弹窗状态
const dialogVisible = ref(false)
const detailVisible = ref(false)
const changeParentVisible = ref(false)
const detailTab = ref('basic') // 详情弹窗Tab
const submitLoading = ref(false)
const isEdit = ref(false)
const currentAgent = ref<Agent | null>(null)
const formRef = ref()

// 上级代理商相关
const parentOptions = ref<Agent[]>([])
const parentLoading = ref(false)
const newParentId = ref<number | null>(null)

// 表单数据
const formData = reactive<AgentFormData>({
  phone: '',
  name: '',
  type: 'LEVEL2',
  password: '',
  status: 'ACTIVE',
  parentId: null,
  commissionMethod: 'PRICE_DIFF', // 【2026-01-27】统一使用差价模式
})

// 表单校验规则
const formRules = {
  phone: [
    { required: true, message: '请输入手机号' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
  ],
  name: [{ required: true, message: '请输入推销员名称' }],
  type: [{ required: true, message: '请选择推销员等级' }],
}

// 弹窗标题
const dialogTitle = computed(() => isEdit.value ? '编辑推销员' : '新增推销员')

// 是否显示上级选择（仅二级推销员需要选择上级）
const showParentSelect = computed(() => {
  return formData.type === 'LEVEL2'
})

// 上级选择提示
const parentHelp = computed(() => {
  if (formData.type === 'LEVEL2') return '二级推销员需选择一级推销员作为上级'
  return ''
})

// 获取头像样式类
function getAvatarClass(type: string): string {
  const map: Record<string, string> = {
    LEVEL1: 'avatar-level1',
    LEVEL2: 'avatar-level2',
    LEVEL3: 'avatar-level3',
    WHOLESALE: 'avatar-wholesale',
  }
  return map[type] || 'avatar-default'
}

// 获取层级标签类型
function getLevelTagType(type: string): string {
  const map: Record<string, string> = {
    LEVEL1: 'warning',
    LEVEL2: 'info',
    LEVEL3: 'default',
    WHOLESALE: 'success',
  }
  return map[type] || 'default'
}

// 获取状态类型
function getStatusType(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'success',
    PENDING: 'warning',
    DISABLED: 'danger',
  }
  return map[status] || 'default'
}

// 格式化手机号
function formatPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone
  return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`
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
async function loadStatistics() {
  statsLoading.value = true
  try {
    const res = await getAgentStatistics()
    if (res.code === 0) {
      statistics.value = res.data
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
    const res = await getAgentList({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: filterForm.keyword || undefined,
      type: filterForm.type || undefined,
      status: filterForm.status || undefined,
    })
    tableData.value = res.data.list
    pagination.total = res.data.total
  } catch (err) {
    console.error('加载推销员列表失败:', err)
    MessagePlugin.error('加载推销员列表失败')
  } finally {
    loading.value = false
  }
}

// 加载上级推销员选项（一级推销员列表）
async function loadParentOptions(type?: string) {
  parentLoading.value = true
  try {
    // 二级推销员只能选择一级推销员作为上级
    const res = await getAgentList({
      page: 1,
      pageSize: 100,
      type: 'LEVEL1',
      status: 'ACTIVE',
    })

    parentOptions.value = res.data.list.filter((a: Agent) => {
      // 排除当前编辑的推销员自身
      if (currentAgent.value && a.id === currentAgent.value.id) return false
      return a.type === 'LEVEL1'
    })
  } catch (err) {
    console.error('加载上级推销员失败:', err)
  } finally {
    parentLoading.value = false
  }
}

// 按状态筛选
function filterByStatus(status: string) {
  filterForm.status = status
  pagination.current = 1
  loadData()
}

// 处理等级变化
function handleTypeChange(type: string) {
  formData.parentId = null
  if (type === 'LEVEL2') {
    loadParentOptions(type)
  }
}

// 搜索
function handleSearch() {
  pagination.current = 1
  loadData()
}

// 重置筛选
function handleReset() {
  filterForm.keyword = ''
  filterForm.type = ''
  filterForm.status = ''
  pagination.current = 1
  loadData()
}

// 分页变化
function handlePageChange(pageInfo: { current: number; pageSize: number }) {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  loadData()
}

// 新增
function handleAdd() {
  isEdit.value = false
  currentAgent.value = null
  Object.assign(formData, {
    phone: '',
    name: '',
    type: 'LEVEL2',
    password: '',
    status: 'ACTIVE',
    parentId: null,
    commissionMethod: 'PRICE_DIFF', // 【2026-01-27】统一使用差价模式
  })
  // 加载一级推销员列表作为上级选项
  loadParentOptions('LEVEL2')
  dialogVisible.value = true
}

// 编辑
function handleEdit(row: Agent) {
  isEdit.value = true
  currentAgent.value = row
  Object.assign(formData, {
    phone: row.phone,
    name: row.name,
    type: row.type,
    status: row.status,
    parentId: row.parent?.id || null,
    commissionMethod: 'PRICE_DIFF', // 【2026-01-27】统一使用差价模式，忽略原有值
  })
  if (row.type === 'LEVEL2') {
    loadParentOptions(row.type)
  }
  dialogVisible.value = true
}

// 查看详情
async function handleDetail(row: Agent) {
  try {
    const res = await getAgentDetail(row.id)
    currentAgent.value = res.data
    detailTab.value = 'basic' // 重置为基本信息Tab
    detailVisible.value = true
  } catch (err) {
    MessagePlugin.error('获取推销员详情失败')
  }
}

// 审核通过
async function handleApprove(row: Agent) {
  const confirmDia = DialogPlugin.confirm({
    header: '审核确认',
    body: `确认通过推销员「${row.name}」的审核申请？`,
    confirmBtn: { theme: 'primary', content: '确认通过' },
    onConfirm: async () => {
      try {
        await updateAgentStatus(row.id, 'ACTIVE')
        MessagePlugin.success('审核通过')
        loadData()
        loadStatistics()
        confirmDia.destroy()
      } catch (err) {
        MessagePlugin.error('审核失败')
      }
    },
  })
}

// 提交表单
async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (valid !== true) return

  submitLoading.value = true
  try {
    if (isEdit.value && currentAgent.value) {
      const updateData: AgentFormData = {
        name: formData.name,
        type: formData.type,
        status: formData.status,
        parentId: formData.parentId,
      }
      if (formData.type === 'LEVEL1') {
        updateData.commissionMethod = formData.commissionMethod
      }
      await updateAgent(currentAgent.value.id, updateData)
      MessagePlugin.success('更新成功')
    } else {
      await createAgent(formData)
      MessagePlugin.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
    loadStatistics()
  } catch (err) {
    MessagePlugin.error('提交失败')
  } finally {
    submitLoading.value = false
  }
}

// 关闭弹窗
function handleDialogClose() {
  formRef.value?.reset()
}

// 重置密码
function handleResetPassword(agent: Agent) {
  const confirmDia = DialogPlugin.confirm({
    header: '重置密码',
    body: `确认将推销员「${agent.name}」的密码重置为手机号后6位？`,
    confirmBtn: { theme: 'warning', content: '确认重置' },
    onConfirm: async () => {
      try {
        const newPassword = agent.phone.slice(-6)
        await resetAgentPassword(agent.id, newPassword)
        MessagePlugin.success(`密码已重置为: ${newPassword}`)
        confirmDia.destroy()
      } catch (err) {
        MessagePlugin.error('重置密码失败')
      }
    },
  })
}

// 调整上级
function handleChangeParent(agent: Agent) {
  currentAgent.value = agent
  newParentId.value = agent.parent?.id || null
  loadParentOptions(agent.type)
  changeParentVisible.value = true
}

// 提交调整上级
async function handleChangeParentSubmit() {
  if (!currentAgent.value) return
  try {
    await updateAgent(currentAgent.value.id, {
      parentId: newParentId.value === 0 ? null : newParentId.value,
    })
    MessagePlugin.success('上级调整成功')
    changeParentVisible.value = false
    detailVisible.value = false
    loadData()
  } catch (err) {
    MessagePlugin.error('调整上级失败')
  }
}

// 禁用账号
function handleDisable(agent: Agent) {
  const confirmDia = DialogPlugin.confirm({
    header: '禁用确认',
    body: `确认禁用推销员「${agent.name}」的账号？禁用后该推销员将无法登录。`,
    confirmBtn: { theme: 'danger', content: '确认禁用' },
    onConfirm: async () => {
      try {
        await updateAgentStatus(agent.id, 'DISABLED')
        MessagePlugin.success('已禁用')
        detailVisible.value = false
        loadData()
        loadStatistics()
        confirmDia.destroy()
      } catch (err) {
        MessagePlugin.error('禁用失败')
      }
    },
  })
}

// 启用账号
async function handleEnable(agent: Agent) {
  try {
    await updateAgentStatus(agent.id, 'ACTIVE')
    MessagePlugin.success('已启用')
    detailVisible.value = false
    loadData()
    loadStatistics()
  } catch (err) {
    MessagePlugin.error('启用失败')
  }
}

// 跳转到分润记录页
function goToCommissionRecords(agent: Agent) {
  detailVisible.value = false
  router.push({ path: '/commission', query: { tab: 'records', keyword: agent.phone } })
}

// 跳转到提现记录页
function goToWithdrawals(agent: Agent) {
  detailVisible.value = false
  router.push({ path: '/commission', query: { tab: 'withdrawals', keyword: agent.phone } })
}

// 初始化
onMounted(() => {
  loadData()
  loadStatistics()
})
</script>

<style scoped>
.agents-page {
  padding: 0;
}

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 推销员信息 */
.agent-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.agent-avatar {
  width: 40px;
  height: 40px;
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

.agent-avatar.avatar-level3 {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
}

.agent-avatar.avatar-wholesale {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.agent-avatar.avatar-default {
  background: var(--color-bg-hover);
  color: var(--color-text-tertiary);
}

.agent-detail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  min-width: 0;
}

.agent-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.invite-code {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  background: var(--color-primary-lighter);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-primary-border);
}

.agent-phone {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* 层级区域 */
.level-area {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.parent-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.parent-info.independent {
  color: var(--color-text-secondary);
}

/* 业绩数据 */
.performance-data {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.order-count {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* 团队数量 */
.team-count {
  display: flex;
  align-items: baseline;
  gap: 2px;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-bg-page);
  border-radius: var(--radius-md);
  width: fit-content;
}

.team-count.active {
  background: var(--color-success-lighter);
}

.team-count.active .count-value {
  color: var(--color-success);
}

.count-value {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

.count-unit {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
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
.agent-detail-content {
  padding: 0;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-xl);
  background: linear-gradient(135deg, var(--color-primary-lighter) 0%, #fff5f2 100%);
  border-radius: var(--radius-xl);
  margin-bottom: var(--spacing-xl);
}

.detail-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.detail-info {
  flex: 1;
}

.detail-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.detail-invite-code {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  background: #fff;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-primary-border);
}

.detail-phone {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.detail-tags {
  display: flex;
  gap: var(--spacing-sm);
}

/* 详情统计 */
.detail-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.detail-stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-bg-page);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
}

.detail-stat-item .stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.detail-stat-item .stat-icon.balance {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
}

.detail-stat-item .stat-icon.commission {
  background: linear-gradient(135deg, #ec4899 0%, #d946ef 100%);
}

.detail-stat-item .stat-icon.team {
  background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
}

.detail-stat-item .stat-icon.orders {
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
}

.detail-stat-item .stat-info .stat-value {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.detail-stat-item .stat-info .stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

/* 详情区块 */
.detail-section {
  margin-bottom: var(--spacing-xl);
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

.detail-actions {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
  display: flex;
  justify-content: flex-end;
}

/* 快速链接 */
.quick-links {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.quick-link-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg-page);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid var(--color-border-light);
}

.quick-link-item:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-default);
}

.quick-link-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ec4899 0%, #d946ef 100%);
  color: #fff;
  flex-shrink: 0;
}

.quick-link-icon.orange {
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
}

.quick-link-info {
  flex: 1;
}

.quick-link-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: 2px;
}

.quick-link-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.quick-link-arrow {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.form-help {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* Tab样式 */
.detail-tabs {
  margin-top: var(--spacing-lg);
}

.tab-content {
  padding: var(--spacing-lg) 0;
}

.tab-actions {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
  display: flex;
  justify-content: flex-end;
}

.team-hint {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  background: var(--color-primary-lighter);
  border-radius: var(--radius-lg);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
}

.team-hint .t-icon {
  flex-shrink: 0;
}
</style>
