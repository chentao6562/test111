<script setup lang="ts">
/**
 * 代金券统计管理页面
 * 【2026-01-21】
 * 功能：
 * 1. 代金券总体统计（发放、使用、过期）
 * 2. 按来源类型统计
 * 3. 按推销员统计
 * 4. 代金券明细查看
 * 5. 给一级推销员返券
 */
import { ref, onMounted, computed } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { PrimaryTableCol, PageInfo } from 'tdesign-vue-next'
import request from '@/api/request'
import { EmptyState } from '@/components'

// ============ 数据类型 ============

interface Overview {
  totalIssued: number
  totalIssuedAmount: number
  totalUsed: number
  totalUsedAmount: number
  totalUnused: number
  totalUnusedAmount: number
  totalExpired: number
  totalExpiredAmount: number
}

interface SourceStat {
  sourceType: string
  sourceDesc: string
  count: number
  amount: number
  usedCount: number
  usedAmount: number
}

interface AgentStat {
  agentId: number
  agentName: string
  agentPhone: string
  agentType: string
  totalCount: number
  totalAmount: number
  usedCount: number
  usedAmount: number
  unusedCount: number
  unusedAmount: number
}

interface CouponItem {
  id: number
  code: string
  amount: number
  agentId: number
  agentName: string
  agentPhone: string
  sourceType: string
  sourceDesc: string | null
  status: string
  usedAt: string | null
  expiredAt: string
  createdAt: string
}

// ============ 状态数据 ============

// 当前标签页
const activeTab = ref('overview')

// 总体统计
const overview = ref<Overview>({
  totalIssued: 0,
  totalIssuedAmount: 0,
  totalUsed: 0,
  totalUsedAmount: 0,
  totalUnused: 0,
  totalUnusedAmount: 0,
  totalExpired: 0,
  totalExpiredAmount: 0
})
const overviewLoading = ref(false)

// 来源统计
const sourceStats = ref<SourceStat[]>([])
const sourceLoading = ref(false)

// 推销员统计
const agentStats = ref<AgentStat[]>([])
const agentLoading = ref(false)
const agentPagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})
const agentSearchForm = ref({
  keyword: '',
  agentType: ''
})

// 代金券明细
const couponList = ref<CouponItem[]>([])
const couponLoading = ref(false)
const couponPagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})
const couponSearchForm = ref({
  keyword: '',
  status: '',
  sourceType: ''
})

// 发券对话框
const grantDialogVisible = ref(false)
const grantFormLoading = ref(false)
const grantForm = ref({
  agentId: null as number | null,
  agentName: '',
  amount: 10,
  remark: ''
})

// 推销员选择（用于发券）
const agentOptions = ref<Array<{ value: number; label: string }>>([])
const agentSearchKeyword = ref('')

// ============ 列定义 ============

const sourceColumns: PrimaryTableCol[] = [
  { colKey: 'sourceDesc', title: '来源类型', minWidth: 150 },
  { colKey: 'count', title: '发放数量', width: 100 },
  { colKey: 'amount', title: '发放金额', width: 120, cell: 'amount' },
  { colKey: 'usedCount', title: '已使用数量', width: 120 },
  { colKey: 'usedAmount', title: '已使用金额', width: 120, cell: 'usedAmount' },
  { colKey: 'useRate', title: '使用率', width: 100, cell: 'useRate' }
]

const agentColumns: PrimaryTableCol[] = [
  { colKey: 'agentId', title: 'ID', width: 80 },
  { colKey: 'agent', title: '推销员', minWidth: 150, cell: 'agent' },
  { colKey: 'agentType', title: '类型', width: 100, cell: 'agentType' },
  { colKey: 'totalCount', title: '总券数', width: 100 },
  { colKey: 'totalAmount', title: '总金额', width: 120, cell: 'totalAmount' },
  { colKey: 'unusedCount', title: '未使用', width: 100 },
  { colKey: 'unusedAmount', title: '未使用金额', width: 120, cell: 'unusedAmount' },
  { colKey: 'usedCount', title: '已使用', width: 100 },
  { colKey: 'action', title: '操作', width: 120, fixed: 'right', cell: 'action' }
]

const couponColumns: PrimaryTableCol[] = [
  { colKey: 'code', title: '券码', width: 150 },
  { colKey: 'amount', title: '面额', width: 100, cell: 'couponAmount' },
  { colKey: 'agent', title: '持有人', minWidth: 150, cell: 'agent' },
  { colKey: 'sourceDesc', title: '来源', minWidth: 150 },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'createdAt', title: '发放时间', width: 180, cell: 'createdAt' },
  { colKey: 'expiredAt', title: '过期时间', width: 120, cell: 'expiredAt' }
]

// ============ 选项 ============

const statusOptions = [
  { label: '全部', value: '' },
  { label: '未使用', value: 'UNUSED' },
  { label: '已使用', value: 'USED' },
  { label: '已过期', value: 'EXPIRED' }
]

const agentTypeOptions = [
  { label: '全部', value: '' },
  { label: '一级推销员', value: 'LEVEL1' },
  { label: '二级推销员', value: 'LEVEL2' }
]

const sourceTypeOptions = [
  { label: '全部', value: '' },
  { label: '注册奖励', value: 'REGISTER' },
  { label: '首发圈奖励', value: 'FIRST_SHARE' },
  { label: '首预约奖励', value: 'FIRST_RESERVATION' },
  { label: '首单成交奖励', value: 'FIRST_COMPLETE' },
  { label: '拉新奖励', value: 'RECRUIT' },
  { label: '激活再奖', value: 'RECRUIT_ACTIVATE' },
  { label: '周销售奖励', value: 'WEEK_SALES' },
  { label: '周发圈全勤', value: 'WEEK_SHARE_FULL' },
  { label: '周拉新奖励', value: 'WEEK_RECRUIT_3' },
  { label: '活动领取', value: 'ACTIVITY' },
  { label: '管理员发放', value: 'ADMIN_GRANT' },
  { label: '上级发放', value: 'LEVEL1_GRANT' }
]

// ============ 计算属性 ============

const useRate = computed(() => {
  if (overview.value.totalIssued === 0) return 0
  return Math.round((overview.value.totalUsed / overview.value.totalIssued) * 100)
})

// ============ 数据加载 ============

// 加载总体统计
const loadOverview = async () => {
  overviewLoading.value = true
  try {
    const res = await request.get('/admin/coupon-stats/overview')
    if (res.data) {
      overview.value = res.data
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '加载失败')
  } finally {
    overviewLoading.value = false
  }
}

// 加载来源统计
const loadSourceStats = async () => {
  sourceLoading.value = true
  try {
    const res = await request.get('/admin/coupon-stats/by-source')
    if (res.data) {
      sourceStats.value = res.data
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '加载失败')
  } finally {
    sourceLoading.value = false
  }
}

// 加载推销员统计
const loadAgentStats = async () => {
  agentLoading.value = true
  try {
    const res = await request.get('/admin/coupon-stats/by-agent', {
      params: {
        page: agentPagination.value.current,
        pageSize: agentPagination.value.pageSize,
        ...agentSearchForm.value
      }
    })
    if (res.data) {
      agentStats.value = res.data.list || []
      agentPagination.value.total = res.data.total || 0
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '加载失败')
  } finally {
    agentLoading.value = false
  }
}

// 加载代金券明细
const loadCouponList = async () => {
  couponLoading.value = true
  try {
    const res = await request.get('/admin/coupon-stats/list', {
      params: {
        page: couponPagination.value.current,
        pageSize: couponPagination.value.pageSize,
        ...couponSearchForm.value
      }
    })
    if (res.data) {
      couponList.value = res.data.list || []
      couponPagination.value.total = res.data.total || 0
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '加载失败')
  } finally {
    couponLoading.value = false
  }
}

// ============ 事件处理 ============

// 标签页切换
const onTabChange = (val: string | number) => {
  activeTab.value = val as string
  if (val === 'overview') {
    loadOverview()
    loadSourceStats()
  } else if (val === 'agent') {
    loadAgentStats()
  } else if (val === 'detail') {
    loadCouponList()
  }
}

// 推销员分页变化
const onAgentPageChange = (pageInfo: PageInfo) => {
  agentPagination.value.current = pageInfo.current
  agentPagination.value.pageSize = pageInfo.pageSize
  loadAgentStats()
}

// 推销员搜索
const onAgentSearch = () => {
  agentPagination.value.current = 1
  loadAgentStats()
}

// 推销员重置
const onAgentReset = () => {
  agentSearchForm.value = { keyword: '', agentType: '' }
  agentPagination.value.current = 1
  loadAgentStats()
}

// 代金券分页变化
const onCouponPageChange = (pageInfo: PageInfo) => {
  couponPagination.value.current = pageInfo.current
  couponPagination.value.pageSize = pageInfo.pageSize
  loadCouponList()
}

// 代金券搜索
const onCouponSearch = () => {
  couponPagination.value.current = 1
  loadCouponList()
}

// 代金券重置
const onCouponReset = () => {
  couponSearchForm.value = { keyword: '', status: '', sourceType: '' }
  couponPagination.value.current = 1
  loadCouponList()
}

// ============ 发券功能 ============

// 搜索推销员（用于发券）
const searchAgents = async (keyword: string) => {
  if (!keyword || keyword.length < 2) {
    agentOptions.value = []
    return
  }
  try {
    const res = await request.get('/admin/coupon-stats/by-agent', {
      params: { keyword, pageSize: 20 }
    })
    if (res.data?.list) {
      agentOptions.value = res.data.list.map((a: AgentStat) => ({
        value: a.agentId,
        label: `${a.agentName} (${a.agentPhone}) - ${a.agentType === 'LEVEL1' ? '一级' : '二级'}`
      }))
    }
  } catch (error) {
    // 忽略搜索错误
  }
}

// 打开发券对话框
const handleOpenGrant = (agent?: AgentStat) => {
  if (agent) {
    grantForm.value = {
      agentId: agent.agentId,
      agentName: `${agent.agentName} (${agent.agentPhone})`,
      amount: 10,
      remark: ''
    }
  } else {
    grantForm.value = {
      agentId: null,
      agentName: '',
      amount: 10,
      remark: ''
    }
  }
  agentOptions.value = []
  grantDialogVisible.value = true
}

// 提交发券
const submitGrant = async () => {
  if (!grantForm.value.agentId) {
    MessagePlugin.warning('请选择推销员')
    return
  }
  if (!grantForm.value.amount || grantForm.value.amount <= 0) {
    MessagePlugin.warning('请输入正确的金额')
    return
  }

  grantFormLoading.value = true
  try {
    const res = await request.post('/admin/coupon-stats/grant', {
      agentId: grantForm.value.agentId,
      amount: grantForm.value.amount,
      remark: grantForm.value.remark
    })
    if (res.data) {
      MessagePlugin.success(`发放成功，券码: ${res.data.code}`)
      grantDialogVisible.value = false
      // 刷新数据
      loadOverview()
      if (activeTab.value === 'agent') {
        loadAgentStats()
      }
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '发放失败')
  } finally {
    grantFormLoading.value = false
  }
}

// ============ 格式化函数 ============

const formatAmount = (val: number) => `¥${Number(val).toFixed(2)}`

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

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'UNUSED': return { label: '未使用', theme: 'success' as const }
    case 'USED': return { label: '已使用', theme: 'default' as const }
    case 'EXPIRED': return { label: '已过期', theme: 'danger' as const }
    default: return { label: status, theme: 'default' as const }
  }
}

const getAgentTypeLabel = (type: string) => {
  switch (type) {
    case 'LEVEL1': return '一级推销员'
    case 'LEVEL2': return '二级推销员'
    default: return type
  }
}

// ============ 初始化 ============

onMounted(() => {
  loadOverview()
  loadSourceStats()
})
</script>

<template>
  <div class="page-container">
    <!-- 页面说明 -->
    <t-card class="info-card" :bordered="false">
      <div class="info-content">
        <div class="info-icon">🎫</div>
        <div class="info-text">
          <h3>代金券统计</h3>
          <p>查看代金券发放和使用情况，可给推销员发放代金券。<strong>券成本由推销员自己承担（核销时从余额扣除）。</strong></p>
        </div>
        <div class="info-action">
          <t-button theme="primary" @click="handleOpenGrant()">
            <template #icon><t-icon name="add" /></template>
            发放代金券
          </t-button>
        </div>
      </div>
    </t-card>

    <!-- 标签页 -->
    <t-card :bordered="false">
      <t-tabs v-model="activeTab" @change="onTabChange">
        <!-- 总体统计 -->
        <t-tab-panel value="overview" label="总体统计">
          <div class="stats-section">
            <!-- 统计卡片 -->
            <t-loading :loading="overviewLoading">
              <div class="stat-cards">
                <div class="stat-card issued">
                  <div class="stat-icon">📊</div>
                  <div class="stat-info">
                    <div class="stat-label">总发放</div>
                    <div class="stat-value">{{ overview.totalIssued }}张</div>
                    <div class="stat-amount">{{ formatAmount(overview.totalIssuedAmount) }}</div>
                  </div>
                </div>
                <div class="stat-card unused">
                  <div class="stat-icon">🎁</div>
                  <div class="stat-info">
                    <div class="stat-label">未使用</div>
                    <div class="stat-value">{{ overview.totalUnused }}张</div>
                    <div class="stat-amount">{{ formatAmount(overview.totalUnusedAmount) }}</div>
                  </div>
                </div>
                <div class="stat-card used">
                  <div class="stat-icon">✅</div>
                  <div class="stat-info">
                    <div class="stat-label">已使用</div>
                    <div class="stat-value">{{ overview.totalUsed }}张</div>
                    <div class="stat-amount">{{ formatAmount(overview.totalUsedAmount) }}</div>
                  </div>
                </div>
                <div class="stat-card expired">
                  <div class="stat-icon">⏰</div>
                  <div class="stat-info">
                    <div class="stat-label">已过期</div>
                    <div class="stat-value">{{ overview.totalExpired }}张</div>
                    <div class="stat-amount">{{ formatAmount(overview.totalExpiredAmount) }}</div>
                  </div>
                </div>
              </div>

              <!-- 使用率进度条 -->
              <div class="use-rate-section">
                <div class="use-rate-header">
                  <span>使用率</span>
                  <span class="use-rate-value">{{ useRate }}%</span>
                </div>
                <t-progress :percentage="useRate" :color="useRate > 50 ? '#00a870' : '#e34d59'" />
              </div>
            </t-loading>

            <!-- 来源统计表格 -->
            <div class="source-section">
              <h4>按来源类型统计</h4>
              <t-table
                :data="sourceStats"
                :columns="sourceColumns"
                :loading="sourceLoading"
                row-key="sourceType"
                size="small"
              >
                <template #empty>
                  <EmptyState type="data" title="暂无数据" />
                </template>
                <template #amount="{ row }">
                  <span class="amount-text">{{ formatAmount(row.amount) }}</span>
                </template>
                <template #usedAmount="{ row }">
                  {{ formatAmount(row.usedAmount) }}
                </template>
                <template #useRate="{ row }">
                  <t-tag :theme="row.count > 0 && row.usedCount / row.count > 0.5 ? 'success' : 'warning'" variant="light">
                    {{ row.count > 0 ? Math.round((row.usedCount / row.count) * 100) : 0 }}%
                  </t-tag>
                </template>
              </t-table>
            </div>
          </div>
        </t-tab-panel>

        <!-- 推销员统计 -->
        <t-tab-panel value="agent" label="推销员统计">
          <!-- 搜索栏 -->
          <t-form :data="agentSearchForm" layout="inline" class="search-form">
            <t-form-item label="关键词">
              <t-input
                v-model="agentSearchForm.keyword"
                placeholder="姓名/手机号"
                style="width: 200px"
                clearable
              />
            </t-form-item>
            <t-form-item label="类型">
              <t-select
                v-model="agentSearchForm.agentType"
                :options="agentTypeOptions"
                placeholder="请选择"
                style="width: 150px"
                clearable
              />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" @click="onAgentSearch">查询</t-button>
              <t-button theme="default" @click="onAgentReset">重置</t-button>
            </t-form-item>
          </t-form>

          <t-table
            :data="agentStats"
            :columns="agentColumns"
            :loading="agentLoading"
            :pagination="agentPagination"
            row-key="agentId"
            @page-change="onAgentPageChange"
          >
            <template #empty>
              <EmptyState type="data" title="暂无数据" />
            </template>
            <template #agent="{ row }">
              <div>{{ row.agentName }}</div>
              <div class="sub-text">{{ row.agentPhone }}</div>
            </template>
            <template #agentType="{ row }">
              <t-tag :theme="row.agentType === 'LEVEL1' ? 'primary' : 'default'" variant="light">
                {{ getAgentTypeLabel(row.agentType) }}
              </t-tag>
            </template>
            <template #totalAmount="{ row }">
              <span class="amount-text">{{ formatAmount(row.totalAmount) }}</span>
            </template>
            <template #unusedAmount="{ row }">
              {{ formatAmount(row.unusedAmount) }}
            </template>
            <template #action="{ row }">
              <t-link theme="primary" @click="handleOpenGrant(row)">发券</t-link>
            </template>
          </t-table>
        </t-tab-panel>

        <!-- 代金券明细 -->
        <t-tab-panel value="detail" label="代金券明细">
          <!-- 搜索栏 -->
          <t-form :data="couponSearchForm" layout="inline" class="search-form">
            <t-form-item label="关键词">
              <t-input
                v-model="couponSearchForm.keyword"
                placeholder="券码/姓名/手机号"
                style="width: 200px"
                clearable
              />
            </t-form-item>
            <t-form-item label="状态">
              <t-select
                v-model="couponSearchForm.status"
                :options="statusOptions"
                placeholder="请选择"
                style="width: 120px"
                clearable
              />
            </t-form-item>
            <t-form-item label="来源">
              <t-select
                v-model="couponSearchForm.sourceType"
                :options="sourceTypeOptions"
                placeholder="请选择"
                style="width: 150px"
                clearable
              />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" @click="onCouponSearch">查询</t-button>
              <t-button theme="default" @click="onCouponReset">重置</t-button>
            </t-form-item>
          </t-form>

          <t-table
            :data="couponList"
            :columns="couponColumns"
            :loading="couponLoading"
            :pagination="couponPagination"
            row-key="id"
            @page-change="onCouponPageChange"
          >
            <template #empty>
              <EmptyState type="data" title="暂无数据" />
            </template>
            <template #couponAmount="{ row }">
              <span class="amount-text">{{ formatAmount(row.amount) }}</span>
            </template>
            <template #agent="{ row }">
              <div>{{ row.agentName }}</div>
              <div class="sub-text">{{ row.agentPhone }}</div>
            </template>
            <template #status="{ row }">
              <t-tag :theme="getStatusInfo(row.status).theme">
                {{ getStatusInfo(row.status).label }}
              </t-tag>
            </template>
            <template #createdAt="{ row }">
              {{ formatDateTime(row.createdAt) }}
            </template>
            <template #expiredAt="{ row }">
              <t-tag theme="warning" variant="light">{{ formatDate(row.expiredAt) }}</t-tag>
            </template>
          </t-table>
        </t-tab-panel>
      </t-tabs>
    </t-card>

    <!-- 发券对话框 -->
    <t-dialog
      v-model:visible="grantDialogVisible"
      header="发放代金券"
      width="500px"
      :confirm-btn="{ content: '发放', loading: grantFormLoading }"
      :on-confirm="submitGrant"
    >
      <t-form :data="grantForm" label-width="100px">
        <t-form-item label="推销员" required>
          <template v-if="grantForm.agentName">
            <t-input v-model="grantForm.agentName" disabled />
          </template>
          <template v-else>
            <t-select
              v-model="grantForm.agentId"
              :options="agentOptions"
              filterable
              :filter="() => true"
              placeholder="输入姓名或手机号搜索"
              @search="searchAgents"
            />
          </template>
        </t-form-item>
        <t-form-item label="金额" required>
          <t-input-number
            v-model="grantForm.amount"
            :min="1"
            :max="1000"
            :decimal-places="2"
            suffix="元"
            style="width: 200px"
          />
        </t-form-item>
        <t-form-item label="备注">
          <t-input
            v-model="grantForm.remark"
            placeholder="发放原因（可选）"
            maxlength="100"
          />
        </t-form-item>
      </t-form>
      <t-alert theme="warning" class="grant-tip">
        <template #message>
          代金券发放后，推销员可在门店使用。核销时将从推销员余额中扣除等额金额。
        </template>
      </t-alert>
    </t-dialog>
  </div>
</template>

<style scoped lang="less">
.page-container {
  padding: 20px;
}

.info-card {
  margin-bottom: 20px;
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
}

.info-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.info-icon {
  font-size: 32px;
}

.info-text {
  flex: 1;

  h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #0958d9;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #666;

    strong {
      color: #0958d9;
    }
  }
}

.stats-section {
  padding: 16px 0;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 8px;
  background: #f5f5f5;

  &.issued {
    background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  }

  &.unused {
    background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  }

  &.used {
    background: linear-gradient(135deg, #f0f5ff 0%, #d6e4ff 100%);
  }

  &.expired {
    background: linear-gradient(135deg, #fff2e8 0%, #ffd8bf 100%);
  }
}

.stat-icon {
  font-size: 36px;
}

.stat-info {
  .stat-label {
    font-size: 14px;
    color: #666;
    margin-bottom: 4px;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 600;
    color: #333;
  }

  .stat-amount {
    font-size: 14px;
    color: #999;
    margin-top: 4px;
  }
}

.use-rate-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;

  .use-rate-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
    color: #666;

    .use-rate-value {
      font-weight: 600;
      color: #333;
    }
  }
}

.source-section {
  h4 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #333;
  }
}

.search-form {
  margin-bottom: 16px;
}

.amount-text {
  color: #f40;
  font-weight: 600;
}

.sub-text {
  font-size: 12px;
  color: #999;
}

.grant-tip {
  margin-top: 16px;
}
</style>
