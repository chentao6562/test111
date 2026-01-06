<template>
  <!-- 直接套用设计稿: 网页版-管理后台/提现审核/code.html 的内容区域 -->
  <div class="flex flex-col gap-6">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Card 1 -->
      <div class="bg-white p-5 rounded-xl border border-[#f3e8e8] shadow-sm relative overflow-hidden group">
        <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span class="material-symbols-outlined text-[80px] text-primary">pending_actions</span>
        </div>
        <div class="relative z-10">
          <p class="text-text-secondary text-sm font-medium mb-1">待审核</p>
          <p class="text-3xl font-bold text-primary">{{ stats.pending }}</p>
          <div class="mt-2 text-xs text-text-secondary flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px] text-[#f4c430]">bolt</span>
            <span>需尽快处理</span>
          </div>
        </div>
      </div>
      <!-- Card 2 -->
      <div class="bg-white p-5 rounded-xl border border-[#f3e8e8] shadow-sm relative overflow-hidden">
        <div class="relative z-10">
          <p class="text-text-secondary text-sm font-medium mb-1">今日已审核</p>
          <p class="text-3xl font-bold text-text-main">{{ stats.auditedToday }}</p>
          <div class="mt-2 text-xs text-green-600 flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">trending_up</span>
            <span>+12% 较昨日</span>
          </div>
        </div>
      </div>
      <!-- Card 3 -->
      <div class="bg-white p-5 rounded-xl border border-[#f3e8e8] shadow-sm relative overflow-hidden">
        <div class="relative z-10">
          <p class="text-text-secondary text-sm font-medium mb-1">今日打款</p>
          <p class="text-3xl font-bold text-text-main">¥{{ formatMoney(stats.paidToday) }}</p>
          <div class="mt-2 text-xs text-text-secondary">
            {{ stats.paidTodayCount }} 笔交易
          </div>
        </div>
      </div>
      <!-- Card 4 -->
      <div class="bg-primary text-white p-5 rounded-xl shadow-md shadow-primary/20 relative overflow-hidden">
        <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 20px 20px;"></div>
        <div class="relative z-10">
          <p class="text-white/80 text-sm font-medium mb-1">本月打款</p>
          <p class="text-3xl font-bold tracking-tight">¥{{ formatMoney(stats.paidMonth) }}</p>
          <div class="mt-2 text-xs text-white/70 bg-white/10 w-fit px-2 py-0.5 rounded-full">
            财务总计
          </div>
        </div>
      </div>
    </div>

    <!-- Filters & Toolbar -->
    <div class="bg-white p-4 rounded-xl border border-[#f3e8e8] shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
      <!-- Tabs/Chips -->
      <div class="flex items-center gap-2 p-1 bg-background-light rounded-lg border border-[#eee]">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          @click="activeStatus = tab.value"
          :class="[
            'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
            activeStatus === tab.value
              ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
              : 'text-text-secondary hover:text-text-main hover:bg-white/50'
          ]"
        >
          {{ tab.label }}
          <template v-if="tab.value === 'pending' && stats.pending > 0">
            ({{ stats.pending }})
          </template>
        </button>
      </div>
      <!-- Inputs -->
      <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <div class="relative group">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-[20px] group-focus-within:text-primary transition-colors">search</span>
          <input
            v-model="searchForm.keyword"
            class="pl-10 pr-4 py-2 bg-background-light border-transparent focus:bg-white focus:border-primary/30 focus:ring-0 rounded-lg text-sm w-full md:w-64 transition-all"
            placeholder="搜索代理商姓名/ID..."
            type="text"
            @keyup.enter="handleSearch"
          />
        </div>
        <div class="relative group">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-[20px]">calendar_today</span>
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            size="default"
            class="!w-64"
          />
        </div>
        <button class="px-4 py-2 bg-white border border-[#e6e6e6] text-text-secondary rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">download</span>
          导出
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-[#f3e8e8] shadow-sm overflow-hidden">
      <div class="overflow-x-auto" v-loading="loading">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-background-light border-b border-[#f3e8e8]">
              <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">代理商</th>
              <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">等级</th>
              <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">提现金额</th>
              <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">提现方式</th>
              <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">申请时间</th>
              <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">状态</th>
              <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#f3e8e8]">
            <tr
              v-for="item in tableData"
              :key="item.id"
              class="group hover:bg-primary-light/30 transition-colors"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="size-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {{ item.agentName?.charAt(0) || 'U' }}
                  </div>
                  <div>
                    <p class="text-sm font-bold text-text-main">{{ item.agentName }}</p>
                    <p class="text-xs text-text-secondary">ID: {{ item.agentId }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  :class="[
                    'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
                    item.agentLevel === 1
                      ? 'bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-700 border-yellow-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  ]"
                >
                  <span class="material-symbols-outlined text-[14px]">{{ item.agentLevel === 1 ? 'diamond' : 'military_tech' }}</span>
                  {{ item.agentLevel === 1 ? '一级代理' : '二级代理' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <span
                  :class="[
                    'font-bold text-lg',
                    item.status === 3 ? 'text-text-secondary line-through' : 'text-primary'
                  ]"
                >
                  ¥{{ item.amount?.toFixed(2) }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 text-sm text-text-main">
                  <span
                    :class="[
                      'size-6 rounded flex items-center justify-center',
                      getMethodStyle(item.method).bg
                    ]"
                  >
                    <span class="material-symbols-outlined text-[16px]" :class="getMethodStyle(item.method).text">
                      {{ getMethodStyle(item.method).icon }}
                    </span>
                  </span>
                  {{ getMethodText(item.method) }}
                </div>
              </td>
              <td class="px-6 py-4">
                <p class="text-sm text-text-secondary">{{ formatDate(item.createdAt) }}</p>
                <p class="text-xs text-text-secondary">{{ formatTime(item.createdAt) }}</p>
              </td>
              <td class="px-6 py-4">
                <span :class="getStatusClass(item.status)">
                  <span v-if="item.status === 0" class="size-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                  <span v-else class="material-symbols-outlined text-[14px]">{{ getStatusIcon(item.status) }}</span>
                  {{ getStatusText(item.status) }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  v-if="item.status === 0"
                  @click="handleAudit(item)"
                  class="inline-flex items-center justify-center px-4 py-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg shadow-sm shadow-red-200 transition-all"
                >
                  审核
                </button>
                <button
                  v-else
                  @click="handleDetail(item)"
                  class="inline-flex items-center justify-center px-4 py-1.5 bg-white border border-[#e6e6e6] text-text-secondary text-sm font-medium rounded-lg hover:bg-gray-50 transition-all"
                >
                  查看
                </button>
              </td>
            </tr>
            <!-- 空状态 -->
            <tr v-if="tableData.length === 0 && !loading">
              <td colspan="7" class="px-6 py-8 text-center text-text-secondary">
                <span class="material-symbols-outlined text-4xl mb-2 block">payments</span>
                暂无提现申请
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Pagination -->
      <div class="px-6 py-4 border-t border-[#f3e8e8] flex items-center justify-between">
        <p class="text-sm text-text-secondary">
          显示 {{ (pagination.page - 1) * pagination.pageSize + 1 }} 到
          {{ Math.min(pagination.page * pagination.pageSize, pagination.total) }} 条，共 {{ pagination.total }} 条
        </p>
        <div class="flex gap-2">
          <button
            @click="handlePageChange(pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="size-8 flex items-center justify-center rounded border border-[#e6e6e6] text-text-secondary hover:bg-gray-50 disabled:opacity-50"
          >
            <span class="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
          <template v-for="p in displayPages" :key="p">
            <span
              v-if="p === '...'"
              class="size-8 flex items-center justify-center rounded border border-[#e6e6e6] text-text-secondary text-sm font-medium"
            >
              ...
            </span>
            <button
              v-else
              @click="handlePageChange(p as number)"
              :class="[
                'size-8 flex items-center justify-center rounded text-sm font-medium',
                pagination.page === p
                  ? 'bg-primary text-white'
                  : 'border border-[#e6e6e6] text-text-secondary hover:bg-gray-50'
              ]"
            >
              {{ p }}
            </button>
          </template>
          <button
            @click="handlePageChange(pagination.page + 1)"
            :disabled="pagination.page >= totalPages"
            class="size-8 flex items-center justify-center rounded border border-[#e6e6e6] text-text-secondary hover:bg-gray-50 disabled:opacity-50"
          >
            <span class="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 审核弹窗 -->
  <el-dialog v-model="auditVisible" title="" width="500px" :show-close="false" class="audit-dialog">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold text-text-main flex items-center gap-2">
          <span class="size-1.5 rounded-full bg-primary"></span>
          提现审核
        </h3>
        <button @click="auditVisible = false" class="text-text-secondary hover:text-text-main">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </template>

    <div v-if="currentItem" class="flex flex-col gap-6">
      <!-- Main Info -->
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div class="size-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg border-2 border-white shadow-sm">
            {{ currentItem.agentName?.charAt(0) || 'U' }}
          </div>
          <div>
            <p class="text-base font-bold text-text-main">{{ currentItem.agentName }}</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 uppercase tracking-wide">
                {{ currentItem.agentLevel === 1 ? 'Level 1' : 'Level 2' }}
              </span>
              <span class="text-xs text-text-secondary">{{ currentItem.agentPhone }}</span>
            </div>
          </div>
        </div>
        <div class="text-right">
          <p class="text-xs text-text-secondary mb-1">申请提现金额</p>
          <p class="text-2xl font-bold text-primary">¥{{ currentItem.amount?.toFixed(2) }}</p>
        </div>
      </div>

      <!-- Detail Grid -->
      <div class="bg-background-light rounded-xl p-4 border border-[#f3e8e8]">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-xs text-text-secondary mb-1">提现方式</p>
            <p class="text-sm font-medium flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px] text-blue-500">
                {{ getMethodStyle(currentItem.method).icon }}
              </span>
              {{ getMethodText(currentItem.method) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-text-secondary mb-1">申请时间</p>
            <p class="text-sm font-medium">{{ formatDateTime(currentItem.createdAt) }}</p>
          </div>
          <div>
            <p class="text-xs text-text-secondary mb-1">当前可提余额</p>
            <p class="text-sm font-bold">¥{{ currentItem.availableBalance?.toFixed(2) }}</p>
          </div>
          <div>
            <p class="text-xs text-text-secondary mb-1">累计已提现</p>
            <p class="text-sm font-bold text-text-secondary">¥{{ currentItem.totalWithdrawn?.toFixed(2) }}</p>
          </div>
        </div>
      </div>

      <!-- Action Form -->
      <div>
        <p class="text-sm font-bold text-text-main mb-3">审核结果</p>
        <div class="flex gap-4 mb-4">
          <label class="flex items-center gap-2 cursor-pointer group">
            <input v-model="auditForm.result" value="pass" class="size-4 text-primary focus:ring-primary border-gray-300" type="radio" />
            <span class="text-sm group-hover:text-primary transition-colors">通过</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer group">
            <input v-model="auditForm.result" value="reject" class="size-4 text-primary focus:ring-primary border-gray-300" type="radio" />
            <span class="text-sm group-hover:text-primary transition-colors">拒绝</span>
          </label>
        </div>
        <div class="relative">
          <textarea
            v-model="auditForm.remark"
            class="w-full h-24 rounded-lg bg-background-light border-transparent focus:bg-white focus:border-primary focus:ring-0 text-sm p-3 resize-none transition-all placeholder:text-text-secondary"
            placeholder="若拒绝，请在此填写原因..."
          ></textarea>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button type="primary" :loading="auditLoading" @click="submitAudit">
          <span class="material-symbols-outlined text-[18px] mr-1">check</span>
          确认审核
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 详情弹窗 -->
  <el-dialog v-model="detailVisible" title="提现详情" width="500px">
    <div v-if="currentItem">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="代理商">{{ currentItem.agentName }}</el-descriptions-item>
        <el-descriptions-item label="代理商ID">{{ currentItem.agentId }}</el-descriptions-item>
        <el-descriptions-item label="提现金额">
          <span class="text-primary font-bold">¥{{ currentItem.amount?.toFixed(2) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="提现方式">{{ getMethodText(currentItem.method) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <span :class="getStatusClass(currentItem.status)">{{ getStatusText(currentItem.status) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ formatDateTime(currentItem.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="审核时间" v-if="currentItem.auditedAt">{{ formatDateTime(currentItem.auditedAt) }}</el-descriptions-item>
        <el-descriptions-item label="审核人" v-if="currentItem.auditor">{{ currentItem.auditor }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2" v-if="currentItem.remark">{{ currentItem.remark }}</el-descriptions-item>
      </el-descriptions>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getWithdrawalList, getWithdrawalStats, auditWithdrawal } from '@/api/withdrawal'

interface WithdrawalItem {
  id: number
  agentId: number
  agentName: string
  agentPhone: string
  agentLevel: number
  amount: number
  method: string
  status: number
  availableBalance: number
  totalWithdrawn: number
  remark: string
  auditor: string
  createdAt: string
  auditedAt: string
}

const loading = ref(false)
const auditLoading = ref(false)
const auditVisible = ref(false)
const detailVisible = ref(false)
const activeStatus = ref('')

const statusTabs = [
  { label: '全部状态', value: '' },
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
]

const stats = reactive({
  pending: 0,
  auditedToday: 0,
  paidToday: 0,
  paidTodayCount: 0,
  paidMonth: 0,
})

const searchForm = reactive({
  keyword: '',
  dateRange: null as any,
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const tableData = ref<WithdrawalItem[]>([])
const currentItem = ref<WithdrawalItem | null>(null)

const auditForm = reactive({
  result: 'pass',
  remark: '',
})

const totalPages = computed(() => Math.ceil(pagination.total / pagination.pageSize) || 1)

const displayPages = computed(() => {
  const pages: (number | string)[] = []
  const total = totalPages.value
  const current = pagination.page

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')

    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)

    for (let i = start; i <= end; i++) pages.push(i)

    if (current < total - 2) pages.push('...')
    pages.push(total)
  }
  return pages
})

const formatMoney = (value: number) => {
  if (!value) return '0'
  return value.toLocaleString('zh-CN')
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const getMethodStyle = (method: string) => {
  const styles: Record<string, { bg: string; text: string; icon: string }> = {
    alipay: { bg: 'bg-blue-50', text: 'text-blue-500', icon: 'account_balance_wallet' },
    wechat: { bg: 'bg-green-50', text: 'text-green-500', icon: 'chat' },
    bank: { bg: 'bg-gray-100', text: 'text-gray-500', icon: 'account_balance' },
  }
  return styles[method] || styles.bank
}

const getMethodText = (method: string) => {
  const texts: Record<string, string> = {
    alipay: '支付宝',
    wechat: '微信',
    bank: '银行卡',
  }
  return texts[method] || '银行卡'
}

const getStatusClass = (status: number) => {
  const baseClass = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border'
  const styles: Record<number, string> = {
    0: 'bg-orange-50 text-orange-600 border-orange-100',
    1: 'bg-green-50 text-green-600 border-green-100',
    2: 'bg-blue-50 text-blue-600 border-blue-100',
    3: 'bg-red-50 text-red-600 border-red-100',
  }
  return `${baseClass} ${styles[status] || styles[0]}`
}

const getStatusText = (status: number) => {
  const texts: Record<number, string> = {
    0: '待审核',
    1: '已通过',
    2: '打款中',
    3: '已驳回',
  }
  return texts[status] || '待审核'
}

const getStatusIcon = (status: number) => {
  const icons: Record<number, string> = {
    1: 'check_circle',
    2: 'schedule',
    3: 'cancel',
  }
  return icons[status] || ''
}

const fetchStats = async () => {
  try {
    const res = await getWithdrawalStats()
    if (res.data) {
      Object.assign(stats, res.data)
    }
  } catch (error) {
    console.error('获取统计数据失败', error)
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const statusMap: Record<string, number> = {
      pending: 0,
      approved: 1,
      rejected: 3,
    }

    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      status: activeStatus.value ? statusMap[activeStatus.value] : undefined,
    }

    if (searchForm.dateRange) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    const res = await getWithdrawalList(params)
    if (res.data) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取提现列表失败', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  pagination.page = page
  fetchData()
}

const handleAudit = (item: WithdrawalItem) => {
  currentItem.value = item
  auditForm.result = 'pass'
  auditForm.remark = ''
  auditVisible.value = true
}

const handleDetail = (item: WithdrawalItem) => {
  currentItem.value = item
  detailVisible.value = true
}

const submitAudit = async () => {
  if (!currentItem.value) return

  if (auditForm.result === 'reject' && !auditForm.remark) {
    ElMessage.warning('请填写拒绝原因')
    return
  }

  auditLoading.value = true
  try {
    await auditWithdrawal(currentItem.value.id, {
      status: auditForm.result === 'pass' ? 1 : 3,
      remark: auditForm.remark,
    })
    ElMessage.success(auditForm.result === 'pass' ? '审核通过' : '已驳回')
    auditVisible.value = false
    fetchData()
    fetchStats()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    auditLoading.value = false
  }
}

watch(activeStatus, () => {
  handleSearch()
})

onMounted(() => {
  fetchStats()
  fetchData()
})
</script>

<style scoped>
.audit-dialog :deep(.el-dialog__header) {
  padding: 16px 24px;
  border-bottom: 1px solid #f3e8e8;
  background: #f8f6f6;
  margin: 0;
}

.audit-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

.audit-dialog :deep(.el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid #f3e8e8;
  background: #fcfafa;
}
</style>
