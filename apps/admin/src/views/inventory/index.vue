<template>
  <!-- 直接套用设计稿: 网页版-管理后台/库存查询/code.html 的内容区域 -->
  <div class="flex flex-col gap-6">
    <!-- Page Header & Stats -->
    <div class="flex flex-wrap justify-between items-center gap-4">
      <div>
        <p class="text-text-secondary mt-1 text-sm font-normal">实时监控商品库存状态，确保备货充足</p>
      </div>
      <div class="flex gap-3">
        <button class="flex items-center gap-2 px-4 h-10 rounded-lg border border-[#e6d0d0] hover:bg-background-light bg-white text-text-main text-sm font-medium transition-colors">
          <span class="material-symbols-outlined" style="font-size: 18px;">download</span>
          <span>导出报表</span>
        </button>
        <button class="flex items-center gap-2 px-4 h-10 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-medium shadow-md shadow-primary/20 transition-colors">
          <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
          <span>新增商品</span>
        </button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="flex flex-col gap-1 rounded-xl bg-white p-5 border border-[#e6d0d0] shadow-sm relative overflow-hidden">
        <div class="flex items-center justify-between">
          <p class="text-text-secondary text-sm font-medium">商品总数 (SKU)</p>
          <span class="material-symbols-outlined text-primary/40" style="font-size: 24px;">inventory_2</span>
        </div>
        <p class="text-text-main text-2xl font-bold mt-2">{{ overview.totalProducts.toLocaleString() }}</p>
        <div class="flex items-center gap-1 mt-1">
          <span class="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded font-medium">+12 新增</span>
        </div>
      </div>
      <div class="flex flex-col gap-1 rounded-xl bg-white p-5 border border-[#e6d0d0] shadow-sm">
        <div class="flex items-center justify-between">
          <p class="text-text-secondary text-sm font-medium">库存总量</p>
          <span class="material-symbols-outlined text-primary/40" style="font-size: 24px;">warehouse</span>
        </div>
        <p class="text-text-main text-2xl font-bold mt-2">{{ overview.totalStock.toLocaleString() }}</p>
        <div class="flex items-center gap-1 mt-1">
          <span class="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded font-medium">充足</span>
        </div>
      </div>
      <div class="flex flex-col gap-1 rounded-xl bg-white p-5 border border-[#e6d0d0] shadow-sm">
        <div class="flex items-center justify-between">
          <p class="text-text-secondary text-sm font-medium">VIP 锁定库存</p>
          <span class="material-symbols-outlined text-[#D4AF37]" style="font-size: 24px;">lock</span>
        </div>
        <p class="text-[#D4AF37] text-2xl font-bold mt-2">{{ overview.lockedStock.toLocaleString() }}</p>
        <div class="flex items-center gap-1 mt-1">
          <span class="text-text-secondary text-xs">待发货订单占用</span>
        </div>
      </div>
      <div
        @click="filterWarning"
        class="group cursor-pointer flex flex-col gap-1 rounded-xl bg-white p-5 border border-primary/30 hover:border-primary shadow-sm hover:shadow-lg transition-all relative"
      >
        <div class="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <span class="material-symbols-outlined text-primary" style="font-size: 64px;">warning</span>
        </div>
        <div class="flex items-center justify-between z-10">
          <p class="text-text-secondary group-hover:text-primary text-sm font-medium transition-colors">库存预警</p>
          <span class="material-symbols-outlined text-primary" style="font-size: 24px;">notifications_active</span>
        </div>
        <p class="text-primary text-2xl font-bold mt-2 z-10">{{ overview.warningCount }}</p>
        <div class="flex items-center gap-1 mt-1 z-10">
          <span class="text-primary text-xs underline font-medium">点击筛选缺货商品</span>
        </div>
      </div>
    </div>

    <!-- Filters & Search -->
    <div class="bg-white rounded-xl border border-[#e6d0d0] p-4 shadow-sm flex flex-col gap-4">
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label class="text-xs font-semibold text-text-secondary">商品名称/编码</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input
              v-model="searchForm.keyword"
              class="w-full pl-10 pr-4 h-10 rounded-lg border border-[#e6d0d0] bg-background-light text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="输入名称或编码"
              type="text"
            />
          </div>
        </div>
        <div class="flex flex-col gap-1.5 flex-1 min-w-[160px]">
          <label class="text-xs font-semibold text-text-secondary">商品分类</label>
          <div class="relative">
            <select
              v-model="searchForm.category"
              class="w-full px-4 h-10 rounded-lg border border-[#e6d0d0] bg-background-light text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
            >
              <option value="">全部分类</option>
              <option value="gift">新年礼盒</option>
              <option value="candy">散装糖果</option>
              <option value="drink">酒水饮料</option>
              <option value="nut">坚果干货</option>
            </select>
            <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] pointer-events-none">expand_more</span>
          </div>
        </div>
        <div class="flex flex-col gap-1.5 flex-1 min-w-[160px]">
          <label class="text-xs font-semibold text-text-secondary">库存状态</label>
          <div class="relative">
            <select
              v-model="searchForm.stockStatus"
              class="w-full px-4 h-10 rounded-lg border border-[#e6d0d0] bg-background-light text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
            >
              <option value="">全部状态</option>
              <option value="normal">库存充足</option>
              <option value="warning">库存紧张</option>
              <option value="low">缺货/预警</option>
            </select>
            <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] pointer-events-none">expand_more</span>
          </div>
        </div>
        <div class="flex flex-col gap-1.5 flex-1 min-w-[160px]">
          <label class="text-xs font-semibold text-text-secondary">条形码</label>
          <input
            v-model="searchForm.barcode"
            class="w-full px-4 h-10 rounded-lg border border-[#e6d0d0] bg-background-light text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            placeholder="扫描或输入条码"
            type="text"
          />
        </div>
        <div class="flex items-center gap-3 pb-0.5">
          <button
            @click="handleSearch"
            class="h-10 px-6 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
          >
            <span class="material-symbols-outlined text-[18px]">search</span>
            查询
          </button>
          <button
            @click="handleReset"
            class="h-10 px-4 rounded-lg border border-[#e6d0d0] hover:bg-background-light text-text-secondary text-sm font-medium transition-colors"
          >
            重置
          </button>
        </div>
      </div>
      <!-- Quick Filter Tags -->
      <div class="flex gap-2 border-t border-[#f0e6e6] pt-3">
        <span class="text-xs font-medium text-text-secondary py-1 self-center mr-2">常用筛选:</span>
        <label class="cursor-pointer group">
          <input v-model="quickFilter" value="low" class="peer hidden" name="quick_filter" type="radio" />
          <span class="px-3 py-1 rounded-full text-xs bg-[#f3e8e8] text-text-secondary peer-checked:bg-primary peer-checked:text-white transition-colors">仅显示缺货</span>
        </label>
        <label class="cursor-pointer group">
          <input v-model="quickFilter" value="vip" class="peer hidden" name="quick_filter" type="radio" />
          <span class="px-3 py-1 rounded-full text-xs bg-[#f3e8e8] text-text-secondary peer-checked:bg-primary peer-checked:text-white transition-colors">VIP专属商品</span>
        </label>
        <label class="cursor-pointer group">
          <input v-model="quickFilter" value="high" class="peer hidden" name="quick_filter" type="radio" />
          <span class="px-3 py-1 rounded-full text-xs bg-[#f3e8e8] text-text-secondary peer-checked:bg-primary peer-checked:text-white transition-colors">库存 > 1000</span>
        </label>
      </div>
    </div>

    <!-- Data Table -->
    <div class="flex-1 rounded-xl border border-[#e6d0d0] bg-white shadow-sm overflow-hidden flex flex-col">
      <div class="overflow-x-auto" v-loading="loading">
        <table class="w-full text-left border-collapse">
          <thead class="bg-background-light sticky top-0 z-10">
            <tr>
              <th class="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-[#e6d0d0] w-[30%]">商品信息</th>
              <th class="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-[#e6d0d0]">分类</th>
              <th class="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-[#e6d0d0] text-right">总库存</th>
              <th class="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-[#e6d0d0] text-right">可用</th>
              <th class="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-[#e6d0d0] text-right">VIP锁定</th>
              <th class="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-[#e6d0d0] text-right">预警值</th>
              <th class="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-[#e6d0d0] text-center">状态</th>
              <th class="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-[#e6d0d0] text-center w-[150px]">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#f0e6e6]">
            <tr
              v-for="item in tableData"
              :key="item.id"
              :class="[
                'hover:bg-[#fff5f5] transition-colors group',
                getRowClass(item)
              ]"
            >
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <div
                    class="h-12 w-12 rounded-lg bg-gray-100 flex-shrink-0 bg-cover bg-center border border-[#e6d0d0] flex items-center justify-center"
                    :style="item.image ? `background-image: url('${item.image}')` : ''"
                  >
                    <span v-if="!item.image" class="material-symbols-outlined text-gray-400">inventory_2</span>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-sm font-bold text-text-main">{{ item.name }}</span>
                    <span class="text-xs text-text-secondary">编码: {{ item.code || '-' }}</span>
                  </div>
                </div>
              </td>
              <td class="p-4 text-sm text-text-main">{{ item.categoryName || '-' }}</td>
              <td class="p-4 text-sm text-text-main font-medium text-right">{{ item.totalStock?.toLocaleString() }}</td>
              <td class="p-4 text-sm font-bold text-right" :class="item.availableStock === 0 ? 'text-primary' : 'text-text-main'">
                {{ item.availableStock?.toLocaleString() }}
              </td>
              <td class="p-4 text-sm text-[#D4AF37] font-medium text-right">{{ item.lockedStock || 0 }}</td>
              <td class="p-4 text-sm text-text-secondary text-right">{{ item.warningStock }}</td>
              <td class="p-4 text-center">
                <span :class="getStatusClass(item)">{{ getStatusText(item) }}</span>
              </td>
              <td class="p-4 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button
                    @click="handleLogs(item)"
                    class="text-text-secondary hover:text-primary p-1 rounded transition-colors"
                    title="明细"
                  >
                    <span class="material-symbols-outlined text-[20px]">visibility</span>
                  </button>
                  <button
                    @click="handleAdjust(item)"
                    class="text-primary hover:text-primary-dark p-1 rounded transition-colors font-medium text-sm"
                    title="调整库存"
                  >
                    调整
                  </button>
                </div>
              </td>
            </tr>
            <!-- 空状态 -->
            <tr v-if="tableData.length === 0 && !loading">
              <td colspan="8" class="p-8 text-center text-text-secondary">
                <span class="material-symbols-outlined text-4xl mb-2 block">inventory_2</span>
                暂无库存数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Pagination -->
      <div class="flex items-center justify-between border-t border-[#f0e6e6] bg-background-light px-4 py-3 sm:px-6">
        <div>
          <p class="text-sm text-text-secondary">
            显示第 <span class="font-medium">{{ (pagination.page - 1) * pagination.pageSize + 1 }}</span> 到
            <span class="font-medium">{{ Math.min(pagination.page * pagination.pageSize, pagination.total) }}</span> 条，共
            <span class="font-medium">{{ pagination.total.toLocaleString() }}</span> 条
          </p>
        </div>
        <div>
          <nav aria-label="Pagination" class="isolate inline-flex -space-x-px rounded-md shadow-sm">
            <button
              @click="handlePageChange(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span class="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <template v-for="p in displayPages" :key="p">
              <span
                v-if="p === '...'"
                class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
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
                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                ]"
              >
                {{ p }}
              </button>
            </template>
            <button
              @click="handlePageChange(pagination.page + 1)"
              :disabled="pagination.page >= totalPages"
              class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span class="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  </div>

  <!-- 库存调整弹窗 -->
  <el-dialog v-model="adjustVisible" title="库存调整" width="500px">
    <div v-if="currentProduct" class="p-3 bg-background-light rounded-lg border border-[#e6d0d0] flex justify-between items-center mb-4">
      <div>
        <p class="text-sm font-bold text-text-main">{{ currentProduct.name }}</p>
        <p class="text-xs text-text-secondary">当前总库存</p>
      </div>
      <div class="text-2xl font-bold text-text-main">{{ currentProduct.totalStock }}</div>
    </div>
    <el-form ref="adjustFormRef" :model="adjustForm" :rules="adjustRules" label-width="100px">
      <el-form-item label="调整类型" prop="type">
        <div class="grid grid-cols-3 gap-3 w-full">
          <label
            v-for="opt in adjustTypes"
            :key="opt.value"
            class="cursor-pointer border rounded-lg p-2 flex flex-col items-center justify-center hover:bg-[#fff5f5] hover:border-primary transition-all"
            :class="adjustForm.type === opt.value ? 'border-primary bg-[#fff5f5] text-primary' : 'border-[#e6d0d0] text-text-secondary'"
          >
            <input v-model="adjustForm.type" :value="opt.value" class="hidden" type="radio" />
            <span class="material-symbols-outlined text-[20px] mb-1">{{ opt.icon }}</span>
            <span class="text-xs font-bold">{{ opt.label }}</span>
          </label>
        </div>
      </el-form-item>
      <el-form-item label="调整数量" prop="quantity">
        <div class="flex items-center gap-4 w-full">
          <el-input-number v-model="adjustForm.quantity" :min="1" style="flex: 1" />
          <div class="text-sm text-text-secondary whitespace-nowrap">
            调整后库存: <span class="font-bold text-primary">{{ computedNewStock }}</span>
          </div>
        </div>
      </el-form-item>
      <el-form-item label="调整原因" prop="reason">
        <el-input v-model="adjustForm.reason" type="textarea" :rows="2" placeholder="请输入调整备注说明..." />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="adjustVisible = false">取消</el-button>
      <el-button type="primary" :loading="adjustLoading" @click="submitAdjust">确认调整</el-button>
    </template>
  </el-dialog>

  <!-- 变动记录弹窗 -->
  <el-dialog v-model="logsVisible" title="库存变动记录" width="800px">
    <el-table :data="stockLogs" v-loading="logsLoading" stripe size="small">
      <el-table-column type="index" label="#" width="60" />
      <el-table-column label="变动类型" width="100">
        <template #default="{ row }">
          <el-tag :type="row.type === 'in' ? 'success' : 'danger'" size="small">
            {{ row.type === 'in' ? '入库' : '出库' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="变动数量" width="100">
        <template #default="{ row }">
          <span :class="row.type === 'in' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'">
            {{ row.type === 'in' ? '+' : '-' }}{{ row.quantity }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="beforeStock" label="变动前库存" width="100" />
      <el-table-column prop="afterStock" label="变动后库存" width="100" />
      <el-table-column prop="reason" label="变动原因" min-width="150" />
      <el-table-column prop="operator" label="操作人" width="100" />
      <el-table-column label="变动时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { getInventoryOverview, getInventoryList, getStockLogs, adjustStock } from '@/api/inventory'

interface Product {
  id: number
  name: string
  code: string
  image: string
  categoryName: string
  totalStock: number
  availableStock: number
  lockedStock: number
  warningStock: number
}

interface StockLog {
  id: number
  type: string
  quantity: number
  beforeStock: number
  afterStock: number
  reason: string
  operator: string
  createdAt: string
}

const loading = ref(false)
const adjustLoading = ref(false)
const logsLoading = ref(false)
const adjustVisible = ref(false)
const logsVisible = ref(false)
const quickFilter = ref('')

const overview = reactive({
  totalProducts: 0,
  totalStock: 0,
  lockedStock: 0,
  warningCount: 0,
})

const searchForm = reactive({
  keyword: '',
  category: '',
  stockStatus: '',
  barcode: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const tableData = ref<Product[]>([])
const stockLogs = ref<StockLog[]>([])
const currentProduct = ref<Product | null>(null)

const adjustFormRef = ref<FormInstance>()
const adjustForm = reactive({
  type: 'in',
  quantity: 1,
  reason: '',
})

const adjustTypes = [
  { value: 'in', label: '入库 (+)', icon: 'add_circle' },
  { value: 'out', label: '出库/损耗 (-)', icon: 'remove_circle' },
  { value: 'reset', label: '盘点重置 (=)', icon: 'sync_alt' },
]

const adjustRules: FormRules = {
  type: [{ required: true, message: '请选择调整类型', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入调整数量', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入调整原因', trigger: 'blur' }],
}

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

const computedNewStock = computed(() => {
  if (!currentProduct.value) return 0
  const current = currentProduct.value.totalStock
  const qty = adjustForm.quantity || 0

  if (adjustForm.type === 'in') return current + qty
  if (adjustForm.type === 'out') return Math.max(0, current - qty)
  return qty // reset
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const getRowClass = (item: Product) => {
  if (item.availableStock === 0) return 'bg-red-50/30'
  if (item.availableStock <= item.warningStock) return 'bg-yellow-50/30'
  return ''
}

const getStatusClass = (item: Product) => {
  const baseClass = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset'
  if (item.availableStock === 0) return `${baseClass} bg-red-50 text-red-700 ring-red-600/10`
  if (item.availableStock <= item.warningStock) return `${baseClass} bg-yellow-50 text-yellow-800 ring-yellow-600/20`
  return `${baseClass} bg-green-50 text-green-700 ring-green-600/20`
}

const getStatusText = (item: Product) => {
  if (item.availableStock === 0) return '缺货预警'
  if (item.availableStock <= item.warningStock) return '库存紧张'
  return '库存充足'
}

const filterWarning = () => {
  searchForm.stockStatus = 'low'
  handleSearch()
}

const fetchOverview = async () => {
  try {
    const res = await getInventoryOverview()
    if (res.data) {
      Object.assign(overview, res.data)
    }
  } catch (error) {
    console.error('获取库存概览失败', error)
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getInventoryList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      category: searchForm.category || undefined,
      stockStatus: searchForm.stockStatus || undefined,
      barcode: searchForm.barcode || undefined,
    })
    if (res.data) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取库存列表失败', error)
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
  searchForm.category = ''
  searchForm.stockStatus = ''
  searchForm.barcode = ''
  quickFilter.value = ''
  handleSearch()
}

const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  pagination.page = page
  fetchData()
}

const handleAdjust = (row: Product) => {
  currentProduct.value = row
  adjustForm.type = 'in'
  adjustForm.quantity = 1
  adjustForm.reason = ''
  adjustVisible.value = true
}

const submitAdjust = async () => {
  if (!adjustFormRef.value || !currentProduct.value) return

  await adjustFormRef.value.validate(async (valid) => {
    if (!valid) return

    adjustLoading.value = true
    try {
      await adjustStock(currentProduct.value!.id, {
        type: adjustForm.type,
        quantity: adjustForm.quantity,
        reason: adjustForm.reason,
      })
      ElMessage.success('库存调整成功')
      adjustVisible.value = false
      fetchData()
      fetchOverview()
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    } finally {
      adjustLoading.value = false
    }
  })
}

const handleLogs = async (row: Product) => {
  currentProduct.value = row
  logsVisible.value = true
  logsLoading.value = true

  try {
    const res = await getStockLogs(row.id)
    if (res.data) {
      stockLogs.value = res.data
    }
  } catch (error) {
    console.error('获取变动记录失败', error)
  } finally {
    logsLoading.value = false
  }
}

watch(quickFilter, (val) => {
  if (val === 'low') {
    searchForm.stockStatus = 'low'
  } else if (val === 'high') {
    searchForm.stockStatus = 'high'
  } else {
    searchForm.stockStatus = ''
  }
  handleSearch()
})

onMounted(() => {
  fetchOverview()
  fetchData()
})
</script>
