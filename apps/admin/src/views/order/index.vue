<template>
  <!-- 直接套用设计稿: 网页版-管理后台/订货单管理/code.html 的内容区域 -->
  <div class="flex flex-col gap-6">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <div
        @click="handleStatusFilter(-1)"
        :class="[
          'flex flex-col gap-1 rounded-xl p-5 bg-white dark:bg-card-dark border shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-md transition-all',
          activeStatus === -1 ? 'border-primary' : 'border-primary/20 hover:border-primary'
        ]"
      >
        <div class="absolute -right-4 -top-4 size-20 bg-primary/5 rounded-full group-hover:scale-110 transition-transform"></div>
        <p class="text-text-secondary dark:text-gray-400 text-sm font-medium z-10">全部订单</p>
        <div class="flex items-end gap-2 z-10">
          <p class="text-text-main dark:text-white text-3xl font-bold tracking-tight">{{ statusCount.all }}</p>
        </div>
      </div>
      <div
        @click="handleStatusFilter(0)"
        :class="[
          'flex flex-col gap-1 rounded-xl p-5 bg-gradient-to-br from-white to-red-50 dark:from-card-dark dark:to-red-900/10 border-l-4 shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-all',
          activeStatus === 0 ? 'border-l-primary border border-primary' : 'border-l-primary'
        ]"
      >
        <p class="text-text-secondary dark:text-gray-400 text-sm font-medium z-10">待付款</p>
        <div class="flex items-end gap-2 z-10">
          <p class="text-primary text-3xl font-bold tracking-tight">{{ statusCount.pending }}</p>
          <span v-if="statusCount.pending > 0" class="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold mb-1.5">需关注</span>
        </div>
      </div>
      <div
        @click="handleStatusFilter(2)"
        :class="[
          'flex flex-col gap-1 rounded-xl p-5 bg-white dark:bg-card-dark border shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-all',
          activeStatus === 2 ? 'border-orange-400' : 'border-[#f3e8e8] dark:border-[#3e2a2a] hover:border-orange-400'
        ]"
      >
        <p class="text-text-secondary dark:text-gray-400 text-sm font-medium z-10">待发货/备货</p>
        <div class="flex items-end gap-2 z-10">
          <p class="text-orange-500 text-3xl font-bold tracking-tight">{{ statusCount.preparing }}</p>
        </div>
      </div>
      <div
        @click="handleStatusFilter(3)"
        :class="[
          'flex flex-col gap-1 rounded-xl p-5 bg-white dark:bg-card-dark border shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-all',
          activeStatus === 3 ? 'border-blue-400' : 'border-[#f3e8e8] dark:border-[#3e2a2a] hover:border-blue-400'
        ]"
      >
        <p class="text-text-secondary dark:text-gray-400 text-sm font-medium z-10">待自提</p>
        <div class="flex items-end gap-2 z-10">
          <p class="text-blue-600 text-3xl font-bold tracking-tight">{{ statusCount.waiting }}</p>
        </div>
      </div>
      <div
        @click="handleStatusFilter(4)"
        :class="[
          'flex flex-col gap-1 rounded-xl p-5 bg-white dark:bg-card-dark border shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-all',
          activeStatus === 4 ? 'border-green-500' : 'border-[#f3e8e8] dark:border-[#3e2a2a] hover:border-green-500'
        ]"
      >
        <p class="text-text-secondary dark:text-gray-400 text-sm font-medium z-10">已完成</p>
        <div class="flex items-end gap-2 z-10">
          <p class="text-green-600 text-3xl font-bold tracking-tight">{{ statusCount.completed }}</p>
        </div>
      </div>
    </div>

    <!-- Filters Area -->
    <div class="bg-white dark:bg-card-dark rounded-xl p-6 shadow-sm border border-[#f3e8e8] dark:border-[#3e2a2a]">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
        <label class="flex flex-col gap-1.5">
          <span class="text-text-main dark:text-gray-300 text-sm font-medium">订货单号</span>
          <div class="relative">
            <input
              v-model="searchForm.orderNo"
              class="w-full rounded-lg border border-[#e6d0d0] dark:border-[#4a3b3b] bg-background-light dark:bg-[#1a1010] px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all dark:text-white"
              placeholder="输入单号"
            />
          </div>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-text-main dark:text-gray-300 text-sm font-medium">代理商姓名/手机号</span>
          <input
            v-model="searchForm.keyword"
            class="w-full rounded-lg border border-[#e6d0d0] dark:border-[#4a3b3b] bg-background-light dark:bg-[#1a1010] px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all dark:text-white"
            placeholder="输入姓名或手机号"
          />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-text-main dark:text-gray-300 text-sm font-medium">取货方式</span>
          <div class="relative">
            <select
              v-model="searchForm.pickupType"
              class="w-full appearance-none rounded-lg border border-[#e6d0d0] dark:border-[#4a3b3b] bg-background-light dark:bg-[#1a1010] px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-main dark:text-white"
            >
              <option value="">全部</option>
              <option value="store">门店自提</option>
              <option value="lock">提前锁货</option>
            </select>
            <span class="material-symbols-outlined absolute right-2.5 top-2.5 text-text-secondary pointer-events-none" style="font-size: 20px;">expand_more</span>
          </div>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-text-main dark:text-gray-300 text-sm font-medium">订单状态</span>
          <div class="relative">
            <select
              v-model="searchForm.status"
              class="w-full appearance-none rounded-lg border border-[#e6d0d0] dark:border-[#4a3b3b] bg-background-light dark:bg-[#1a1010] px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-main dark:text-white"
            >
              <option value="">全部状态</option>
              <option :value="0">待付款</option>
              <option :value="1">已付款待备货</option>
              <option :value="2">备货中</option>
              <option :value="3">待提货</option>
              <option :value="4">已完成</option>
              <option :value="5">已取消</option>
            </select>
            <span class="material-symbols-outlined absolute right-2.5 top-2.5 text-text-secondary pointer-events-none" style="font-size: 20px;">expand_more</span>
          </div>
        </label>
      </div>
      <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#f3e8e8] dark:border-[#3e2a2a]">
        <button
          @click="handleReset"
          class="px-5 py-2 rounded-lg border border-[#e6d0d0] dark:border-[#4a3b3b] text-text-main dark:text-white text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
        >
          <span class="material-symbols-outlined" style="font-size: 18px;">refresh</span>
          重置
        </button>
        <button class="px-5 py-2 rounded-lg border border-[#e6d0d0] dark:border-[#4a3b3b] text-text-main dark:text-white text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2">
          <span class="material-symbols-outlined" style="font-size: 18px;">download</span>
          导出数据
        </button>
        <button
          @click="handleSearch"
          class="px-8 py-2 rounded-lg bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary-dark transition-colors flex items-center gap-2"
        >
          <span class="material-symbols-outlined" style="font-size: 18px;">search</span>
          查询
        </button>
      </div>
    </div>

    <!-- Table Area -->
    <div class="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-[#f3e8e8] dark:border-[#3e2a2a] flex flex-col flex-1 min-h-[400px]">
      <div class="overflow-x-auto" v-loading="loading">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-[#f3e8e8] dark:border-[#3e2a2a] bg-[#fbf8f8] dark:bg-white/5">
              <th class="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-16">
                <input class="rounded border-gray-300 text-primary focus:ring-primary bg-transparent" type="checkbox" />
              </th>
              <th class="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">订货单号</th>
              <th class="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">代理商信息</th>
              <th class="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">商品概览</th>
              <th class="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">订单金额</th>
              <th class="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">状态</th>
              <th class="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#f3e8e8] dark:divide-[#3e2a2a]">
            <tr
              v-for="item in tableData"
              :key="item.id"
              class="group hover:bg-primary-light/10 transition-colors"
            >
              <td class="p-4">
                <input class="rounded border-gray-300 text-primary focus:ring-primary bg-transparent" type="checkbox" />
              </td>
              <td class="p-4">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-text-main dark:text-white font-mono">{{ item.orderNo }}</span>
                  <button
                    @click="copyOrderNo(item.orderNo)"
                    class="text-text-secondary hover:text-primary transition-colors"
                  >
                    <span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span>
                  </button>
                </div>
                <p class="text-xs text-text-secondary mt-0.5">{{ formatDate(item.createdAt) }}</p>
              </td>
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <div class="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {{ item.userName?.charAt(0) || 'U' }}
                  </div>
                  <div>
                    <p class="text-sm font-bold text-text-main dark:text-white">{{ item.userName || '-' }}</p>
                    <p class="text-xs text-text-secondary">{{ item.userPhone || '' }}</p>
                  </div>
                </div>
              </td>
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <div class="size-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <span class="material-symbols-outlined text-gray-400" style="font-size: 20px;">inventory_2</span>
                  </div>
                  <div class="flex flex-col">
                    <p class="text-sm font-medium text-text-main dark:text-white line-clamp-1">
                      {{ item.items?.[0]?.productName || '商品' }}
                    </p>
                    <p class="text-xs text-text-secondary">
                      x {{ item.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0 }} 件
                    </p>
                  </div>
                </div>
              </td>
              <td class="p-4">
                <p class="text-sm font-bold text-text-main dark:text-white font-mono">¥ {{ item.payAmount?.toFixed(2) }}</p>
                <span class="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 text-text-secondary rounded">
                  {{ item.pickupType === 'store' ? '门店自提' : '提前锁货' }}
                </span>
              </td>
              <td class="p-4">
                <span :class="getStatusClass(item.status)">
                  <span :class="getStatusDotClass(item.status)"></span>
                  {{ getStatusText(item.status) }}
                </span>
              </td>
              <td class="p-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="handleDetail(item)"
                    class="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
                  >
                    详情
                  </button>
                  <template v-if="item.status === 0">
                    <span class="text-gray-300">|</span>
                    <button class="text-sm font-medium text-primary hover:text-primary-dark transition-colors">手动核销</button>
                  </template>
                  <template v-else-if="item.status === 1 || item.status === 2">
                    <span class="text-gray-300">|</span>
                    <button
                      @click="handlePrepare(item)"
                      class="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                    >
                      {{ item.status === 1 ? '分配备货' : '移库' }}
                    </button>
                  </template>
                  <template v-else-if="item.status === 3">
                    <span class="text-gray-300">|</span>
                    <button class="text-sm font-medium text-primary hover:text-primary-dark transition-colors">核销取货</button>
                  </template>
                </div>
              </td>
            </tr>
            <!-- 空状态 -->
            <tr v-if="tableData.length === 0 && !loading">
              <td colspan="7" class="p-8 text-center text-text-secondary">
                <span class="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                暂无订单数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Pagination -->
      <div class="mt-auto flex items-center justify-between p-4 border-t border-[#f3e8e8] dark:border-[#3e2a2a]">
        <p class="text-sm text-text-secondary">
          显示 {{ (pagination.page - 1) * pagination.pageSize + 1 }} 到 {{ Math.min(pagination.page * pagination.pageSize, pagination.total) }} 条，共 {{ pagination.total }} 条记录
        </p>
        <div class="flex items-center gap-2">
          <button
            @click="handlePageChange(pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="size-8 flex items-center justify-center rounded border border-[#e6d0d0] hover:bg-gray-50 text-text-secondary disabled:opacity-50"
          >
            <span class="material-symbols-outlined" style="font-size: 16px;">chevron_left</span>
          </button>
          <template v-for="p in displayPages" :key="p">
            <span v-if="p === '...'" class="text-text-secondary px-1">...</span>
            <button
              v-else
              @click="handlePageChange(p as number)"
              :class="[
                'size-8 flex items-center justify-center rounded text-sm font-medium',
                pagination.page === p ? 'bg-primary text-white' : 'hover:bg-gray-50 text-text-secondary'
              ]"
            >
              {{ p }}
            </button>
          </template>
          <button
            @click="handlePageChange(pagination.page + 1)"
            :disabled="pagination.page >= totalPages"
            class="size-8 flex items-center justify-center rounded border border-[#e6d0d0] hover:bg-gray-50 text-text-secondary disabled:opacity-50"
          >
            <span class="material-symbols-outlined" style="font-size: 16px;">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 订单详情弹窗 -->
  <el-dialog v-model="detailVisible" title="订单详情" width="800px">
    <div v-if="currentOrder" class="order-detail">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="订单状态">
          <span :class="getStatusClass(currentOrder.status)">
            {{ getStatusText(currentOrder.status) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="下单用户">{{ currentOrder.userName }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentOrder.userPhone }}</el-descriptions-item>
        <el-descriptions-item label="提货方式">
          {{ currentOrder.pickupType === 'store' ? '门店自提' : '提前锁货' }}
        </el-descriptions-item>
        <el-descriptions-item label="提货地址" v-if="currentOrder.pickupType === 'lock'">
          {{ currentOrder.address }}
        </el-descriptions-item>
        <el-descriptions-item label="订单金额">
          <span class="text-primary font-bold">¥{{ currentOrder.totalAmount }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="实付金额">
          <span class="text-primary font-bold">¥{{ currentOrder.payAmount }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ formatDate(currentOrder.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="支付时间">{{ formatDate(currentOrder.paidAt) }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ currentOrder.remark || '无' }}</el-descriptions-item>
      </el-descriptions>

      <div class="text-sm font-semibold mt-5 mb-3 pl-2 border-l-3 border-primary">商品列表</div>
      <el-table :data="currentOrder.items" border size="small">
        <el-table-column prop="productName" label="商品名称" />
        <el-table-column prop="spec" label="规格" width="120" />
        <el-table-column label="单价" width="100">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column label="小计" width="100">
          <template #default="{ row }">¥{{ (row.price * row.quantity).toFixed(2) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrderList, getOrderDetail } from '@/api/order'

interface OrderItem {
  id: number
  productName: string
  spec: string
  price: number
  quantity: number
}

interface Order {
  id: number
  orderNo: string
  userId: number
  userName: string
  userPhone: string
  items: OrderItem[]
  totalAmount: number
  payAmount: number
  status: number
  pickupType: string
  address: string
  remark: string
  createdAt: string
  paidAt: string
}

const loading = ref(false)
const detailVisible = ref(false)
const activeStatus = ref(-1)

const searchForm = reactive({
  orderNo: '',
  keyword: '',
  status: '' as number | string,
  pickupType: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const statusCount = reactive({
  all: 0,
  pending: 0,
  preparing: 0,
  waiting: 0,
  completed: 0,
})

const tableData = ref<Order[]>([])
const currentOrder = ref<Order | null>(null)

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

const getStatusText = (status: number) => {
  const map: Record<number, string> = {
    0: '待付款',
    1: '已付款待备货',
    2: '备货中',
    3: '待提货',
    4: '已完成',
    5: '已取消',
  }
  return map[status] || '未知'
}

const getStatusClass = (status: number) => {
  const baseClass = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border'
  const map: Record<number, string> = {
    0: 'bg-red-50 text-red-600 border-red-100',
    1: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    2: 'bg-orange-50 text-orange-600 border-orange-100',
    3: 'bg-blue-50 text-blue-600 border-blue-100',
    4: 'bg-green-50 text-green-600 border-green-100',
    5: 'bg-gray-50 text-gray-600 border-gray-100',
  }
  return `${baseClass} ${map[status] || 'bg-gray-50 text-gray-600 border-gray-100'}`
}

const getStatusDotClass = (status: number) => {
  const baseClass = 'size-1.5 rounded-full'
  const map: Record<number, string> = {
    0: 'bg-red-600',
    1: 'bg-yellow-600',
    2: 'bg-orange-600',
    3: 'bg-blue-600',
    4: 'bg-green-600',
    5: 'bg-gray-600',
  }
  return `${baseClass} ${map[status] || 'bg-gray-600'}`
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const copyOrderNo = (orderNo: string) => {
  navigator.clipboard.writeText(orderNo)
  ElMessage.success('已复制订单号')
}

const fetchData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      orderNo: searchForm.orderNo || undefined,
      keyword: searchForm.keyword || undefined,
      status: activeStatus.value >= 0 ? activeStatus.value : (searchForm.status !== '' ? searchForm.status : undefined),
      pickupType: searchForm.pickupType || undefined,
    }

    const res = await getOrderList(params)
    if (res.data) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0

      // 更新状态统计
      if (res.data.statusCount) {
        statusCount.all = res.data.statusCount.all || 0
        statusCount.pending = res.data.statusCount.pending || 0
        statusCount.preparing = res.data.statusCount.preparing || 0
        statusCount.waiting = res.data.statusCount.waiting || 0
        statusCount.completed = res.data.statusCount.completed || 0
      }
    }
  } catch (error) {
    console.error('获取订单列表失败', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  activeStatus.value = -1
  fetchData()
}

const handleReset = () => {
  searchForm.orderNo = ''
  searchForm.keyword = ''
  searchForm.status = ''
  searchForm.pickupType = ''
  activeStatus.value = -1
  handleSearch()
}

const handleStatusFilter = (status: number) => {
  activeStatus.value = status
  pagination.page = 1
  fetchData()
}

const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  pagination.page = page
  fetchData()
}

const handleDetail = async (row: Order) => {
  try {
    const res = await getOrderDetail(row.id)
    if (res.data) {
      currentOrder.value = res.data
      detailVisible.value = true
    }
  } catch (error) {
    console.error('获取订单详情失败', error)
  }
}

const handlePrepare = async (row: Order) => {
  try {
    await ElMessageBox.confirm('确定要开始备货吗？', '提示', { type: 'warning' })
    ElMessage.success('已开始备货')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.order-detail .border-l-3 {
  border-left-width: 3px;
}
</style>
