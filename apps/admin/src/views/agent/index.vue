<template>
  <!-- 直接套用设计稿: 网页版-管理后台/代理商列表/code.html 的内容区域 -->
  <div class="flex flex-col gap-6">
    <!-- Stats Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="flex flex-col gap-1 rounded-xl p-5 border border-[#e6d0d0] bg-white shadow-sm relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-4 opacity-10 text-primary group-hover:scale-110 transition-transform">
          <span class="material-symbols-outlined text-6xl">groups</span>
        </div>
        <p class="text-text-secondary text-sm font-medium">代理商总数</p>
        <div class="flex items-end gap-2 mt-2">
          <p class="text-text-main text-3xl font-bold tracking-tight">{{ stats.total }}</p>
          <span class="text-green-600 text-xs font-bold mb-1 flex items-center bg-green-50 px-1.5 py-0.5 rounded">
            <span class="material-symbols-outlined text-[14px]">trending_up</span> 12%
          </span>
        </div>
      </div>
      <div class="flex flex-col gap-1 rounded-xl p-5 border border-[#e6d0d0] bg-white shadow-sm relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-4 opacity-10 text-primary group-hover:scale-110 transition-transform">
          <span class="material-symbols-outlined text-6xl">stars</span>
        </div>
        <p class="text-text-secondary text-sm font-medium">一级代理</p>
        <div class="flex items-end gap-2 mt-2">
          <p class="text-text-main text-3xl font-bold tracking-tight">{{ stats.level1 }}</p>
          <span class="text-green-600 text-xs font-bold mb-1 flex items-center bg-green-50 px-1.5 py-0.5 rounded">
            <span class="material-symbols-outlined text-[14px]">trending_up</span> 5%
          </span>
        </div>
      </div>
      <div class="flex flex-col gap-1 rounded-xl p-5 border border-[#e6d0d0] bg-white shadow-sm relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-4 opacity-10 text-primary group-hover:scale-110 transition-transform">
          <span class="material-symbols-outlined text-6xl">diversity_3</span>
        </div>
        <p class="text-text-secondary text-sm font-medium">二级代理</p>
        <div class="flex items-end gap-2 mt-2">
          <p class="text-text-main text-3xl font-bold tracking-tight">{{ stats.level2 }}</p>
          <span class="text-green-600 text-xs font-bold mb-1 flex items-center bg-green-50 px-1.5 py-0.5 rounded">
            <span class="material-symbols-outlined text-[14px]">trending_up</span> 15%
          </span>
        </div>
      </div>
      <div class="flex flex-col gap-1 rounded-xl p-5 border border-primary/20 bg-gradient-to-br from-white to-primary/5 shadow-sm relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-4 opacity-10 text-primary group-hover:scale-110 transition-transform">
          <span class="material-symbols-outlined text-6xl">payments</span>
        </div>
        <p class="text-primary text-sm font-bold">本月分润 (CNY)</p>
        <div class="flex items-end gap-2 mt-2">
          <p class="text-primary text-3xl font-black tracking-tight">¥ {{ formatMoney(stats.monthCommission) }}</p>
          <span class="text-primary text-xs font-bold mb-1 flex items-center bg-primary/10 px-1.5 py-0.5 rounded">
            <span class="material-symbols-outlined text-[14px]">trending_up</span> 22%
          </span>
        </div>
      </div>
    </div>

    <!-- Filters & Search -->
    <div class="flex flex-col rounded-xl border border-[#e6d0d0] bg-white p-5 shadow-sm gap-4">
      <div class="flex flex-col md:flex-row items-end gap-4 w-full">
        <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold text-text-secondary">代理商姓名</span>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-secondary text-lg">person</span>
              <input
                v-model="searchForm.name"
                class="w-full h-10 pl-9 pr-3 rounded-lg border border-[#e6d0d0] bg-background-light text-sm focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-text-secondary/50"
                placeholder="请输入姓名"
                type="text"
              />
            </div>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold text-text-secondary">手机号码</span>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-secondary text-lg">phone</span>
              <input
                v-model="searchForm.phone"
                class="w-full h-10 pl-9 pr-3 rounded-lg border border-[#e6d0d0] bg-background-light text-sm focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-text-secondary/50"
                placeholder="请输入手机号"
                type="text"
              />
            </div>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold text-text-secondary">代理等级</span>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-secondary text-lg">workspace_premium</span>
              <select
                v-model="searchForm.level"
                class="w-full h-10 pl-9 pr-8 rounded-lg border border-[#e6d0d0] bg-background-light text-sm focus:ring-1 focus:ring-primary focus:border-primary text-text-main appearance-none"
              >
                <option value="">全部等级</option>
                <option :value="1">一级代理</option>
                <option :value="2">二级代理</option>
              </select>
              <span class="material-symbols-outlined absolute right-2 top-2.5 text-text-secondary text-lg pointer-events-none">expand_more</span>
            </div>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold text-text-secondary">上级代理</span>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-secondary text-lg">supervisor_account</span>
              <input
                v-model="searchForm.parentName"
                class="w-full h-10 pl-9 pr-3 rounded-lg border border-[#e6d0d0] bg-background-light text-sm focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-text-secondary/50"
                placeholder="请输入上级姓名"
                type="text"
              />
            </div>
          </label>
        </div>
        <div class="flex gap-3 mt-4 md:mt-0">
          <button
            @click="handleSearch"
            class="h-10 px-6 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <span class="material-symbols-outlined text-[18px]">search</span>
            查询
          </button>
          <button
            @click="handleReset"
            class="h-10 px-6 bg-white border border-[#e6d0d0] hover:bg-background-light text-text-main text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            <span class="material-symbols-outlined text-[18px]">restart_alt</span>
            重置
          </button>
        </div>
      </div>
    </div>

    <!-- Data List -->
    <div class="flex flex-col rounded-xl border border-[#e6d0d0] bg-white shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-[#e6d0d0] flex justify-between items-center bg-background-light/50">
        <h3 class="text-lg font-bold text-text-main">代理商列表</h3>
        <button class="text-primary text-sm font-bold flex items-center gap-1 hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors">
          <span class="material-symbols-outlined text-[18px]">download</span>
          导出数据
        </button>
      </div>
      <div class="overflow-x-auto" v-loading="loading">
        <table class="w-full text-left border-collapse">
          <thead class="bg-background-light/80 text-text-secondary text-xs font-bold uppercase tracking-wider">
            <tr>
              <th class="p-4 border-b border-[#e6d0d0] min-w-[200px]">代理商信息</th>
              <th class="p-4 border-b border-[#e6d0d0]">等级</th>
              <th class="p-4 border-b border-[#e6d0d0]">上级代理</th>
              <th class="p-4 border-b border-[#e6d0d0] text-center">下级数</th>
              <th class="p-4 border-b border-[#e6d0d0] text-center">订货数</th>
              <th class="p-4 border-b border-[#e6d0d0] text-right">订货额</th>
              <th class="p-4 border-b border-[#e6d0d0] text-right">累计分润</th>
              <th class="p-4 border-b border-[#e6d0d0]">状态</th>
              <th class="p-4 border-b border-[#e6d0d0] text-right">操作</th>
            </tr>
          </thead>
          <tbody class="text-sm text-text-main divide-y divide-[#e6d0d0]">
            <tr
              v-for="item in tableData"
              :key="item.id"
              class="hover:bg-primary-light/10 transition-colors group"
            >
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <div
                    class="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm border border-[#e6d0d0]"
                  >
                    {{ item.nickname?.charAt(0) || 'U' }}
                  </div>
                  <div class="flex flex-col">
                    <span class="font-bold text-text-main group-hover:text-primary transition-colors">{{ item.nickname || '-' }}</span>
                    <span class="text-xs text-text-secondary font-mono">{{ item.phone }}</span>
                  </div>
                </div>
              </td>
              <td class="p-4">
                <span
                  v-if="item.agentLevel === 1"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100"
                >
                  <span class="material-symbols-outlined text-[14px] filled text-amber-500">star</span>
                  一级代理
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100"
                >
                  <span class="material-symbols-outlined text-[14px] filled text-blue-500">person</span>
                  二级代理
                </span>
              </td>
              <td class="p-4">
                <div v-if="item.parentName" class="flex flex-col">
                  <span class="text-xs font-bold">{{ item.parentName }}</span>
                  <span class="text-[10px] text-text-secondary">{{ item.parentPhone || '' }}</span>
                </div>
                <span v-else class="text-text-secondary">— (总部)</span>
              </td>
              <td class="p-4 text-center font-medium">{{ item.childCount || 0 }}</td>
              <td class="p-4 text-center font-medium">{{ item.orderCount || 0 }}</td>
              <td class="p-4 text-right font-medium">¥ {{ formatMoney(item.totalSales) }}</td>
              <td class="p-4 text-right font-bold text-primary">¥ {{ formatMoney(item.totalCommission) }}</td>
              <td class="p-4">
                <span
                  v-if="item.agentStatus === 2"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                >
                  正常
                </span>
                <span
                  v-else-if="item.agentStatus === 1"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20"
                >
                  待审核
                </span>
                <span
                  v-else-if="item.agentStatus === 3"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                >
                  已拒绝
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20"
                >
                  禁用
                </span>
              </td>
              <td class="p-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="handleDetail(item)"
                    class="text-primary hover:text-primary-dark font-medium text-xs hover:underline"
                  >
                    详情
                  </button>
                  <span class="text-[#e6d0d0]">|</span>
                  <template v-if="item.agentStatus === 1">
                    <button
                      @click="handleAudit(item, 'approve')"
                      class="text-green-600 hover:text-green-800 font-medium text-xs hover:underline"
                    >
                      通过
                    </button>
                    <span class="text-[#e6d0d0]">|</span>
                    <button
                      @click="handleAudit(item, 'reject')"
                      class="text-red-600 hover:text-red-800 font-medium text-xs hover:underline"
                    >
                      拒绝
                    </button>
                  </template>
                  <template v-else-if="item.agentStatus === 2">
                    <button class="text-text-secondary hover:text-primary font-medium text-xs hover:underline">禁用</button>
                  </template>
                  <template v-else>
                    <button class="text-green-600 hover:text-green-800 font-medium text-xs hover:underline">启用</button>
                  </template>
                </div>
              </td>
            </tr>
            <!-- 空状态 -->
            <tr v-if="tableData.length === 0 && !loading">
              <td colspan="9" class="p-8 text-center text-text-secondary">
                <span class="material-symbols-outlined text-4xl mb-2 block">person_off</span>
                暂无代理商数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Pagination -->
      <div class="flex items-center justify-between border-t border-[#e6d0d0] bg-white px-4 py-3 sm:px-6">
        <div>
          <p class="text-sm text-text-secondary">
            显示 <span class="font-bold text-text-main">{{ (pagination.page - 1) * pagination.pageSize + 1 }}</span> 到
            <span class="font-bold text-text-main">{{ Math.min(pagination.page * pagination.pageSize, pagination.total) }}</span> 条，共
            <span class="font-bold text-text-main">{{ pagination.total }}</span> 条记录
          </p>
        </div>
        <div>
          <nav aria-label="Pagination" class="isolate inline-flex -space-x-px rounded-md shadow-sm">
            <button
              @click="handlePageChange(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="relative inline-flex items-center rounded-l-md px-2 py-2 text-text-secondary ring-1 ring-inset ring-[#e6d0d0] hover:bg-background-light focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span class="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <template v-for="p in displayPages" :key="p">
              <span
                v-if="p === '...'"
                class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-text-main ring-1 ring-inset ring-[#e6d0d0]"
              >
                ...
              </span>
              <button
                v-else
                @click="handlePageChange(p as number)"
                :class="[
                  'relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20',
                  pagination.page === p
                    ? 'z-10 bg-primary text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
                    : 'text-text-main ring-1 ring-inset ring-[#e6d0d0] hover:bg-background-light focus:outline-offset-0'
                ]"
              >
                {{ p }}
              </button>
            </template>
            <button
              @click="handlePageChange(pagination.page + 1)"
              :disabled="pagination.page >= totalPages"
              class="relative inline-flex items-center rounded-r-md px-2 py-2 text-text-secondary ring-1 ring-inset ring-[#e6d0d0] hover:bg-background-light focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span class="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  </div>

  <!-- 代理商详情弹窗 -->
  <el-dialog v-model="detailVisible" title="代理商详情" width="700px">
    <div v-if="currentAgent" class="agent-detail">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="头像">
          <div class="size-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
            {{ currentAgent.nickname?.charAt(0) || 'U' }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="昵称">{{ currentAgent.nickname }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ currentAgent.phone }}</el-descriptions-item>
        <el-descriptions-item label="代理等级">
          <span
            :class="[
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border',
              currentAgent.agentLevel === 1
                ? 'bg-amber-50 text-amber-700 border-amber-100'
                : 'bg-blue-50 text-blue-700 border-blue-100'
            ]"
          >
            {{ currentAgent.agentLevel === 1 ? '一级代理' : '二级代理' }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="审核状态">
          <span
            :class="[
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ring-1 ring-inset',
              currentAgent.agentStatus === 2
                ? 'bg-green-50 text-green-700 ring-green-600/20'
                : currentAgent.agentStatus === 1
                ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                : 'bg-red-50 text-red-700 ring-red-600/20'
            ]"
          >
            {{ getAgentStatusText(currentAgent.agentStatus) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="上级代理">{{ currentAgent.parentName || '无 (总部直属)' }}</el-descriptions-item>
        <el-descriptions-item label="累计订货额">
          <span class="text-primary font-bold">¥{{ formatMoney(currentAgent.totalSales) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="累计分润">
          <span class="text-primary font-bold">¥{{ formatMoney(currentAgent.totalCommission) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="下级代理数">{{ currentAgent.childCount || 0 }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ formatDate(currentAgent.createdAt) }}</el-descriptions-item>
      </el-descriptions>

      <div class="text-sm font-semibold mt-5 mb-3 pl-2 border-l-[3px] border-primary">分润规则</div>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="订单金额 < 399">
          一级10%, 二级2%
        </el-descriptions-item>
        <el-descriptions-item label="订单金额 >= 399">
          一级15%, 二级3%
        </el-descriptions-item>
      </el-descriptions>
    </div>
  </el-dialog>

  <!-- 审核弹窗 -->
  <el-dialog v-model="auditVisible" :title="auditType === 'approve' ? '审核通过' : '审核拒绝'" width="500px">
    <el-form ref="auditFormRef" :model="auditForm" :rules="auditRules" label-width="100px">
      <el-form-item label="审核备注" prop="remark">
        <el-input
          v-model="auditForm.remark"
          type="textarea"
          :rows="3"
          :placeholder="auditType === 'approve' ? '请输入审核通过备注（可选）' : '请输入拒绝原因'"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="auditVisible = false">取消</el-button>
      <el-button
        :type="auditType === 'approve' ? 'success' : 'danger'"
        :loading="auditLoading"
        @click="submitAudit"
      >
        确定{{ auditType === 'approve' ? '通过' : '拒绝' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { getAgentList, getAgentDetail, auditAgent } from '@/api/agent'

interface Agent {
  id: number
  avatar: string
  nickname: string
  phone: string
  agentLevel: number
  agentStatus: number
  parentId: number
  parentName: string
  parentPhone: string
  totalSales: number
  totalCommission: number
  childCount: number
  orderCount: number
  createdAt: string
}

const loading = ref(false)
const auditLoading = ref(false)
const detailVisible = ref(false)
const auditVisible = ref(false)
const auditType = ref<'approve' | 'reject'>('approve')

const searchForm = reactive({
  name: '',
  phone: '',
  level: '' as number | string,
  parentName: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const stats = reactive({
  total: 0,
  level1: 0,
  level2: 0,
  monthCommission: 0,
})

const tableData = ref<Agent[]>([])
const currentAgent = ref<Agent | null>(null)

const auditFormRef = ref<FormInstance>()
const auditForm = reactive({
  agentId: 0,
  remark: '',
})

const auditRules = computed<FormRules>(() => ({
  remark: auditType.value === 'reject'
    ? [{ required: true, message: '请输入拒绝原因', trigger: 'blur' }]
    : [],
}))

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

const agentStatusMap: Record<number, string> = {
  0: '普通用户',
  1: '待审核',
  2: '已通过',
  3: '已拒绝',
}

const getAgentStatusText = (status: number) => agentStatusMap[status] || '未知'

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const formatMoney = (value: number) => {
  if (!value) return '0'
  if (value >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M'
  }
  return value.toLocaleString('zh-CN')
}

const fetchData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      name: searchForm.name || undefined,
      phone: searchForm.phone || undefined,
      level: searchForm.level || undefined,
      parentName: searchForm.parentName || undefined,
    }

    const res = await getAgentList(params)
    if (res.data) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0

      // 更新统计数据
      if (res.data.stats) {
        stats.total = res.data.stats.total || 0
        stats.level1 = res.data.stats.level1 || 0
        stats.level2 = res.data.stats.level2 || 0
        stats.monthCommission = res.data.stats.monthCommission || 0
      }
    }
  } catch (error) {
    console.error('获取代理商列表失败', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  searchForm.name = ''
  searchForm.phone = ''
  searchForm.level = ''
  searchForm.parentName = ''
  handleSearch()
}

const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  pagination.page = page
  fetchData()
}

const handleDetail = async (row: Agent) => {
  try {
    const res = await getAgentDetail(row.id)
    if (res.data) {
      currentAgent.value = res.data
      detailVisible.value = true
    }
  } catch (error) {
    console.error('获取代理商详情失败', error)
  }
}

const handleAudit = (row: Agent, type: 'approve' | 'reject') => {
  auditType.value = type
  auditForm.agentId = row.id
  auditForm.remark = ''
  auditVisible.value = true
}

const submitAudit = async () => {
  if (!auditFormRef.value) return

  await auditFormRef.value.validate(async (valid) => {
    if (!valid) return

    auditLoading.value = true
    try {
      await auditAgent(auditForm.agentId, {
        status: auditType.value === 'approve' ? 2 : 3,
        remark: auditForm.remark,
      })
      ElMessage.success(auditType.value === 'approve' ? '审核通过成功' : '审核拒绝成功')
      auditVisible.value = false
      fetchData()
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    } finally {
      auditLoading.value = false
    }
  })
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.agent-detail .border-l-\[3px\] {
  border-left-width: 3px;
}
</style>
