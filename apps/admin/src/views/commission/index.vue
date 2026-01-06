<template>
  <!-- 直接套用设计稿: 网页版-管理后台/分润管理/code.html 的内容区域 -->
  <div class="flex flex-col gap-6">
    <!-- Page Heading & Actions -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <p class="text-text-secondary mt-1 text-sm">实时监控代理商分润收益与结算状态</p>
      </div>
      <div class="flex gap-3">
        <button class="flex items-center gap-2 px-4 py-2 bg-white border border-[#e5e7eb] rounded-lg text-sm font-medium text-text-main hover:bg-background-light transition-colors shadow-sm">
          <span class="material-symbols-outlined text-[18px]">download</span>
          导出报表
        </button>
        <button class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors shadow-sm shadow-primary/30">
          <span class="material-symbols-outlined text-[18px]">settings</span>
          分润规则配置
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-5 rounded-xl border border-[#f3e8e8] shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-[#d4af37]"></div>
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-[#fff0f0] rounded-lg text-primary">
            <span class="material-symbols-outlined">payments</span>
          </div>
          <span class="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+12.5%</span>
        </div>
        <p class="text-text-secondary text-sm font-medium">今日分润</p>
        <p class="text-2xl font-black text-text-main mt-1">¥{{ formatMoney(stats.todayCommission) }}</p>
        <div class="absolute -right-6 -bottom-6 opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform">
          <span class="material-symbols-outlined text-[100px]">payments</span>
        </div>
      </div>

      <div class="bg-white p-5 rounded-xl border border-[#f3e8e8] shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-[#d4af37]"></div>
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-[#fff0f0] rounded-lg text-primary">
            <span class="material-symbols-outlined">calendar_month</span>
          </div>
          <span class="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+8.2%</span>
        </div>
        <p class="text-text-secondary text-sm font-medium">本月分润</p>
        <p class="text-2xl font-black text-text-main mt-1">¥{{ formatMoney(stats.monthCommission) }}</p>
        <div class="absolute -right-6 -bottom-6 opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform">
          <span class="material-symbols-outlined text-[100px]">calendar_month</span>
        </div>
      </div>

      <div class="bg-white p-5 rounded-xl border border-[#f3e8e8] shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-[#d4af37]"></div>
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-[#fff7e6] rounded-lg text-[#d4af37]">
            <span class="material-symbols-outlined">savings</span>
          </div>
        </div>
        <p class="text-text-secondary text-sm font-medium">累计分润</p>
        <p class="text-2xl font-black text-[#d4af37] mt-1">¥{{ formatMoney(stats.totalCommission) }}</p>
        <div class="absolute -right-6 -bottom-6 opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform">
          <span class="material-symbols-outlined text-[100px]">savings</span>
        </div>
      </div>

      <div class="bg-white p-5 rounded-xl border border-[#f3e8e8] shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-[#d4af37]"></div>
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-[#fff0f0] rounded-lg text-primary">
            <span class="material-symbols-outlined">pending</span>
          </div>
          <span class="text-xs font-bold text-text-secondary bg-gray-100 px-2 py-1 rounded-full">待处理</span>
        </div>
        <p class="text-text-secondary text-sm font-medium">待结算金额</p>
        <p class="text-2xl font-black text-primary mt-1">¥{{ formatMoney(stats.pendingSettlement) }}</p>
        <div class="absolute -right-6 -bottom-6 opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform">
          <span class="material-symbols-outlined text-[100px]">pending</span>
        </div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="bg-white rounded-xl border border-[#f3e8e8] shadow-sm flex flex-col">
      <!-- Toolbar -->
      <div class="p-5 border-b border-[#f3e8e8] flex flex-col md:flex-row justify-between gap-4 items-center">
        <div class="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <h3 class="text-lg font-bold text-text-main mr-2">分润明细</h3>
          <!-- Search -->
          <div class="relative group">
            <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-secondary text-[20px]">search</span>
            <input
              v-model="searchForm.keyword"
              class="pl-10 pr-4 py-2 bg-background-light border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full md:w-64 transition-all"
              placeholder="搜索代理商/订单号"
              type="text"
              @keyup.enter="handleSearch"
            />
          </div>
          <!-- Filters -->
          <select
            v-model="searchForm.level"
            class="px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-sm text-text-secondary focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="">所有代理等级</option>
            <option value="1">一级代理</option>
            <option value="2">二级代理</option>
          </select>
          <select
            v-model="searchForm.status"
            class="px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-sm text-text-secondary focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="">所有状态</option>
            <option value="settled">已结算</option>
            <option value="pending">待结算</option>
          </select>
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            size="default"
            class="!w-64"
            value-format="YYYY-MM-DD"
          />
        </div>
        <div class="flex gap-2">
          <button
            @click="handleSearch"
            class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-1"
          >
            <span class="material-symbols-outlined text-[18px]">search</span>
            查询
          </button>
          <button
            @click="handleReset"
            class="px-4 py-2 bg-white border border-[#e5e7eb] text-text-secondary rounded-lg text-sm font-medium hover:bg-background-light transition-colors"
          >
            重置
          </button>
        </div>
      </div>

      <!-- Data Table -->
      <div class="overflow-x-auto" v-loading="loading">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-background-light text-text-secondary font-semibold border-b border-[#f3e8e8]">
            <tr>
              <th class="px-6 py-4">代理商信息</th>
              <th class="px-6 py-4">等级</th>
              <th class="px-6 py-4">来源订货单</th>
              <th class="px-6 py-4">订货代理</th>
              <th class="px-6 py-4 text-right">订货金额</th>
              <th class="px-6 py-4 text-right">分润比例</th>
              <th class="px-6 py-4 text-right">分润金额</th>
              <th class="px-6 py-4 text-center">状态</th>
              <th class="px-6 py-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#f3e8e8]">
            <tr
              v-for="item in tableData"
              :key="item.id"
              class="hover:bg-[#fff7f7] transition-colors group"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                    {{ item.agentName?.charAt(0) || 'U' }}
                  </div>
                  <div>
                    <p class="font-bold text-text-main">{{ item.agentName }}</p>
                    <p class="text-xs text-text-secondary">ID: {{ item.agentId }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  :class="[
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border',
                    item.commissionType === 'level1'
                      ? 'bg-[#fff0f0] text-primary border-primary/20'
                      : 'bg-[#fffdf0] text-[#d4af37] border-[#d4af37]/30'
                  ]"
                >
                  <span class="material-symbols-outlined text-[14px]">{{ item.commissionType === 'level1' ? 'stars' : 'workspace_premium' }}</span>
                  {{ item.commissionType === 'level1' ? '一级' : '二级' }}
                </span>
              </td>
              <td class="px-6 py-4 text-primary font-medium cursor-pointer hover:underline">{{ item.orderNo }}</td>
              <td class="px-6 py-4 text-text-secondary">{{ item.buyerName }} ({{ item.buyerLevel === 1 ? '一级' : '二级' }})</td>
              <td class="px-6 py-4 text-right font-medium">¥{{ item.orderAmount?.toFixed(2) }}</td>
              <td class="px-6 py-4 text-right text-text-secondary">{{ item.commissionRate }}%</td>
              <td class="px-6 py-4 text-right font-bold text-primary">+¥{{ item.commissionAmount?.toFixed(2) }}</td>
              <td class="px-6 py-4 text-center">
                <span
                  v-if="item.status === 'settled'"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700"
                >
                  <span class="size-1.5 rounded-full bg-green-600"></span>
                  已结算
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700"
                >
                  <span class="size-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                  待结算
                </span>
              </td>
              <td class="px-6 py-4 text-center">
                <button
                  @click="handleDetail(item)"
                  class="text-text-secondary hover:text-primary transition-colors p-1"
                >
                  <span class="material-symbols-outlined text-[20px]">visibility</span>
                </button>
              </td>
            </tr>
            <!-- 空状态 -->
            <tr v-if="tableData.length === 0 && !loading">
              <td colspan="9" class="px-6 py-8 text-center text-text-secondary">
                <span class="material-symbols-outlined text-4xl mb-2 block">payments</span>
                暂无分润数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="p-4 border-t border-[#f3e8e8] flex items-center justify-between">
        <span class="text-sm text-text-secondary">
          显示 {{ (pagination.page - 1) * pagination.pageSize + 1 }} 到
          {{ Math.min(pagination.page * pagination.pageSize, pagination.total) }} 条，共 {{ pagination.total }} 条记录
        </span>
        <div class="flex items-center gap-2">
          <button
            @click="handlePageChange(pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="px-3 py-1 text-sm border border-[#e5e7eb] rounded hover:bg-gray-50 disabled:opacity-50"
          >
            上一页
          </button>
          <template v-for="p in displayPages" :key="p">
            <span
              v-if="p === '...'"
              class="text-text-secondary"
            >
              ...
            </span>
            <button
              v-else
              @click="handlePageChange(p as number)"
              :class="[
                'px-3 py-1 text-sm rounded font-medium',
                pagination.page === p
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'border border-[#e5e7eb] hover:bg-gray-50 hover:text-primary'
              ]"
            >
              {{ p }}
            </button>
          </template>
          <button
            @click="handlePageChange(pagination.page + 1)"
            :disabled="pagination.page >= totalPages"
            class="px-3 py-1 text-sm border border-[#e5e7eb] rounded hover:bg-gray-50 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- Current Rules Summary -->
    <div class="bg-gradient-to-r from-[#211111] to-[#3a1d1d] rounded-xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg relative overflow-hidden">
      <div class="absolute right-0 top-0 h-full w-1/3 bg-primary/10 -skew-x-12 transform translate-x-10"></div>
      <div class="z-10 flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#d4af37]">verified</span>
          <h3 class="text-lg font-bold">当前分润规则生效中</h3>
        </div>
        <p class="text-white/70 text-sm max-w-2xl">
          当前规则版本 <span class="text-[#d4af37] font-mono">V2.4</span>，生效时间：2024-01-01。
          订单金额 &lt; 399: 一级代理享受 <span class="text-white font-bold">10%</span>，二级代理 <span class="text-white font-bold">2%</span>。
          订单金额 &ge; 399: 一级代理享受 <span class="text-white font-bold">15%</span>，二级代理 <span class="text-white font-bold">3%</span>。
        </p>
      </div>
      <div class="z-10 shrink-0">
        <button class="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg backdrop-blur-sm transition-all text-sm font-bold group">
          <span class="material-symbols-outlined group-hover:rotate-45 transition-transform">edit</span>
          编辑规则
        </button>
      </div>
    </div>
  </div>

  <!-- 详情弹窗 -->
  <el-dialog v-model="detailVisible" title="分润详情" width="600px">
    <div v-if="currentItem">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="代理商">{{ currentItem.agentName }}</el-descriptions-item>
        <el-descriptions-item label="代理商ID">{{ currentItem.agentId }}</el-descriptions-item>
        <el-descriptions-item label="关联订单">{{ currentItem.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="订货代理">{{ currentItem.buyerName }}</el-descriptions-item>
        <el-descriptions-item label="订货金额">
          <span class="font-medium">¥{{ currentItem.orderAmount?.toFixed(2) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="分润类型">
          <span
            :class="[
              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border',
              currentItem.commissionType === 'level1'
                ? 'bg-[#fff0f0] text-primary border-primary/20'
                : 'bg-[#fffdf0] text-[#d4af37] border-[#d4af37]/30'
            ]"
          >
            {{ currentItem.commissionType === 'level1' ? '一级分润' : '二级分润' }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="分润比例">{{ currentItem.commissionRate }}%</el-descriptions-item>
        <el-descriptions-item label="分润金额">
          <span class="text-primary font-bold">+¥{{ currentItem.commissionAmount?.toFixed(2) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="结算状态">
          <span
            :class="[
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
              currentItem.status === 'settled'
                ? 'bg-green-50 text-green-700'
                : 'bg-orange-50 text-orange-700'
            ]"
          >
            {{ currentItem.status === 'settled' ? '已结算' : '待结算' }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(currentItem.createdAt) }}</el-descriptions-item>
      </el-descriptions>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { getCommissionList, getCommissionStats } from '@/api/commission'

interface Commission {
  id: number
  orderNo: string
  orderId: number
  agentId: number
  agentName: string
  agentPhone: string
  buyerName: string
  buyerLevel: number
  commissionType: string
  orderAmount: number
  commissionRate: number
  commissionAmount: number
  status: string
  createdAt: string
}

interface Stats {
  totalCommission: number
  monthCommission: number
  todayCommission: number
  pendingSettlement: number
}

const loading = ref(false)
const detailVisible = ref(false)
const currentItem = ref<Commission | null>(null)

const stats = ref<Stats>({
  totalCommission: 0,
  monthCommission: 0,
  todayCommission: 0,
  pendingSettlement: 0,
})

const searchForm = reactive({
  keyword: '',
  level: '',
  status: '',
  dateRange: [] as string[],
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const tableData = ref<Commission[]>([])

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
  if (!value) return '0.00'
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const fetchStats = async () => {
  try {
    const res = await getCommissionStats()
    if (res.data) {
      stats.value = res.data
    }
  } catch (error) {
    console.error('获取分润统计失败', error)
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      level: searchForm.level || undefined,
      status: searchForm.status || undefined,
    }

    if (searchForm.dateRange?.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    const res = await getCommissionList(params)
    if (res.data) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取分润列表失败', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.level = ''
  searchForm.status = ''
  searchForm.dateRange = []
  handleSearch()
}

const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  pagination.page = page
  fetchData()
}

const handleDetail = (item: Commission) => {
  currentItem.value = item
  detailVisible.value = true
}

onMounted(() => {
  fetchStats()
  fetchData()
})
</script>
