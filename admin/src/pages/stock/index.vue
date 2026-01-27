<template>
  <div class="stock-page">
    <!-- 页面标题 -->
    <PageHeader title="库存管理" subtitle="管理商品库存、入库、调整和预警设置">
      <template #actions>
        <t-space>
          <t-button variant="outline" @click="openAdjustDialog">
            <template #icon><t-icon name="edit" /></template>
            库存盘点
          </t-button>
          <t-button theme="primary" @click="openStockInDialog">
            <template #icon><t-icon name="add" /></template>
            新增入库
          </t-button>
        </t-space>
      </template>
    </PageHeader>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <StatCard
        label="库存预警"
        :value="statistics.warningCount"
        icon="error-circle"
        theme="warning"
        :loading="statsLoading"
        :highlight="statistics.warningCount > 0"
        clickable
        @click="filterByStatus('WARNING')"
      />
      <StatCard
        label="缺货商品"
        :value="statistics.outOfStockCount"
        icon="close-circle"
        theme="danger"
        :loading="statsLoading"
        :highlight="statistics.outOfStockCount > 0"
        clickable
        @click="filterByStatus('OUT_OF_STOCK')"
      />
      <StatCard
        label="库存总量"
        :value="formatNumber(statistics.totalStock)"
        icon="layers"
        theme="primary"
        :loading="statsLoading"
      />
      <StatCard
        label="商品种类"
        :value="statistics.productCount"
        icon="root-list"
        theme="success"
        :loading="statsLoading"
      />
    </div>

    <!-- 畅销商品推荐 -->
    <TableCard title="畅销商品 TOP5" class="hot-products-card">
      <template #actions>
        <t-tag theme="primary" variant="light" size="small">
          <t-icon name="chart-line" style="margin-right: 4px;" />
          按销量排序
        </t-tag>
      </template>
      <div class="hot-products-grid" v-if="!hotProductsLoading && hotProducts.length > 0">
        <div
          class="hot-product-item"
          v-for="(item, index) in hotProducts"
          :key="item.id"
        >
          <div class="rank-badge" :class="{ 'top-3': index < 3 }">{{ index + 1 }}</div>
          <div class="product-image">
            <img :src="getProductImage(item)" :alt="item.name" />
          </div>
          <div class="product-info">
            <div class="product-name">{{ item.name }}</div>
            <div class="product-meta">
              <span class="sales-count">
                <t-icon name="trending-up" />
                已售 {{ item.salesCount || 0 }}
              </span>
              <span class="stock-info" :class="getStockClass(item)">
                库存 {{ item.stock }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="hotProductsLoading" class="hot-products-loading">
        <t-loading size="small" text="加载中..." />
      </div>
      <EmptyState v-else type="data" description="暂无销售数据" />
    </TableCard>

    <!-- 筛选区域 -->
    <FilterCard>
      <t-form layout="inline" :data="filterForm" @submit="handleSearch">
        <t-form-item label="商品名称/编号">
          <t-input
            v-model="filterForm.keyword"
            placeholder="请输入商品名称或SKU"
            clearable
            style="width: 220px"
          >
            <template #prefix-icon>
              <t-icon name="search" />
            </template>
          </t-input>
        </t-form-item>
        <t-form-item label="商品分类">
          <t-select
            v-model="filterForm.categoryId"
            placeholder="全部分类"
            clearable
            style="width: 160px"
          >
            <t-option
              v-for="cat in categoryList"
              :key="cat.id"
              :value="cat.id"
              :label="cat.name"
            />
          </t-select>
        </t-form-item>
        <t-form-item label="库存状态">
          <t-select
            v-model="filterForm.status"
            placeholder="全部状态"
            clearable
            style="width: 140px"
          >
            <t-option
              v-for="(item, key) in STOCK_STATUSES"
              :key="key"
              :value="key"
              :label="item.label"
            />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-space>
            <t-button theme="default" @click="handleReset">重置</t-button>
            <t-button theme="primary" type="submit">
              <template #icon><t-icon name="search" /></template>
              查询
            </t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </FilterCard>

    <!-- 数据表格 -->
    <TableCard title="库存列表">
      <template #actions>
        <t-button variant="text" @click="handleExport" :disabled="stockList.length === 0">
          <template #icon><t-icon name="download" /></template>
          导出
        </t-button>
      </template>

      <t-table
        :data="stockList"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        :sort="sortConfig"
        row-key="id"
        hover
        stripe
        @page-change="handlePageChange"
        @sort-change="handleSortChange"
      >
        <!-- 商品信息 -->
        <template #productInfo="{ row }">
          <ProductCell
            :name="row.name"
            :image="getProductImage(row)"
            :sku="`MQ-${String(row.id).padStart(4, '0')}`"
          />
        </template>

        <!-- 当前库存 -->
        <template #stock="{ row }">
          <div class="stock-cell">
            <span :class="['stock-value', getStockClass(row)]">
              {{ row.stock }}
            </span>
            <span class="stock-unit">{{ row.unit || '件' }}</span>
          </div>
        </template>

        <!-- 锁定库存 -->
        <template #lockStock="{ row }">
          <span class="lock-stock">{{ row.lockStock || 0 }}</span>
        </template>

        <!-- 可用库存 -->
        <template #availableStock="{ row }">
          <span class="available-stock">{{ (row.stock || 0) - (row.lockStock || 0) }}</span>
        </template>

        <!-- 累计销量 -->
        <template #salesCount="{ row }">
          <span class="sales-count-cell">{{ row.salesCount || 0 }}</span>
        </template>

        <!-- 预警值 -->
        <template #minStock="{ row }">
          <span class="min-stock">{{ row.minStock || 10 }}</span>
        </template>

        <!-- 状态 -->
        <template #status="{ row }">
          <StatusTag :status="row.status" :status-map="stockStatusMap" />
        </template>

        <!-- 操作 -->
        <template #action="{ row }">
          <t-space size="small">
            <t-link theme="primary" @click="handleStockIn(row)">入库</t-link>
            <t-link theme="warning" @click="handleSetWarning(row)">预警</t-link>
            <t-link theme="default" @click="handleViewLogs(row)">记录</t-link>
          </t-space>
        </template>

        <!-- 空状态 -->
        <template #empty>
          <EmptyState
            v-if="!loading"
            :type="filterForm.keyword || filterForm.categoryId || filterForm.status ? 'search' : 'data'"
            :description="filterForm.keyword || filterForm.categoryId || filterForm.status ? '没有找到匹配的库存记录' : '暂无库存数据'"
          >
            <t-button
              v-if="filterForm.keyword || filterForm.categoryId || filterForm.status"
              theme="primary"
              variant="text"
              @click="handleReset"
            >
              清空筛选条件
            </t-button>
          </EmptyState>
        </template>
      </t-table>
    </TableCard>

    <!-- 入库弹窗 -->
    <t-dialog
      v-model:visible="stockInDialog.visible"
      header="商品入库"
      width="480px"
      :confirm-btn="{ content: '确认入库', loading: stockInDialog.loading }"
      @confirm="handleStockInConfirm"
    >
      <t-form :data="stockInForm" :rules="stockInRules" ref="stockInFormRef" label-width="100px">
        <t-form-item label="商品" name="productId">
          <t-select
            v-model="stockInForm.productId"
            placeholder="请选择商品"
            filterable
            :loading="productLoading"
            @search="handleProductSearch"
          >
            <t-option
              v-for="p in productList"
              :key="p.id"
              :value="p.id"
              :label="p.name"
            />
          </t-select>
        </t-form-item>
        <t-form-item label="入库数量" name="quantity">
          <t-input-number
            v-model="stockInForm.quantity"
            :min="1"
            :max="99999"
            theme="normal"
            style="width: 100%"
          />
        </t-form-item>
        <t-form-item label="备注" name="remark">
          <t-textarea
            v-model="stockInForm.remark"
            placeholder="请输入备注信息（选填）"
            :maxlength="200"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 库存调整弹窗 -->
    <t-dialog
      v-model:visible="adjustDialog.visible"
      header="库存盘点/调整"
      width="480px"
      :confirm-btn="{ content: '确认调整', loading: adjustDialog.loading }"
      @confirm="handleAdjustConfirm"
    >
      <t-form :data="adjustForm" :rules="adjustRules" ref="adjustFormRef" label-width="100px">
        <t-form-item label="商品" name="productId">
          <t-select
            v-model="adjustForm.productId"
            placeholder="请选择商品"
            filterable
            :loading="productLoading"
            @search="handleProductSearch"
          >
            <t-option
              v-for="p in productList"
              :key="p.id"
              :value="p.id"
              :label="p.name"
            />
          </t-select>
        </t-form-item>
        <t-form-item label="调整数量" name="adjustQuantity">
          <t-input-number
            v-model="adjustForm.adjustQuantity"
            :min="-99999"
            :max="99999"
            theme="normal"
            style="width: 100%"
          />
          <p class="form-tip">正数增加库存，负数减少库存</p>
        </t-form-item>
        <t-form-item label="调整原因" name="reason">
          <t-textarea
            v-model="adjustForm.reason"
            placeholder="请输入调整原因"
            :maxlength="200"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 预警值设置弹窗 -->
    <t-dialog
      v-model:visible="warningDialog.visible"
      header="设置库存预警值"
      width="420px"
      :confirm-btn="{ content: '确认设置', loading: warningDialog.loading }"
      @confirm="handleWarningConfirm"
    >
      <div class="warning-dialog-content">
        <div class="warning-product-info">
          <div class="info-row">
            <span class="info-label">商品名称</span>
            <span class="info-value">{{ warningDialog.productName }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">当前库存</span>
            <span class="info-value highlight">{{ warningDialog.currentStock }}</span>
          </div>
        </div>
        <t-divider />
        <t-form :data="warningForm" label-width="80px">
          <t-form-item label="预警值">
            <t-input-number
              v-model="warningForm.minStock"
              :min="0"
              :max="99999"
              theme="normal"
              style="width: 160px"
            />
            <p class="form-tip">当库存低于此值时将显示预警状态</p>
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>

    <!-- 库存日志弹窗 -->
    <t-dialog
      v-model:visible="logsDialog.visible"
      :header="`库存变动记录 - ${logsDialog.productName}`"
      width="720px"
      :footer="false"
    >
      <t-table
        :data="stockLogs"
        :columns="logColumns"
        :loading="logsDialog.loading"
        :pagination="logsPagination"
        row-key="id"
        size="small"
        @page-change="handleLogsPageChange"
      >
        <template #type="{ row }">
          <StatusTag :status="row.type" :status-map="stockLogTypeMap" size="small" />
        </template>
        <template #quantity="{ row }">
          <span :class="['quantity-change', row.quantity > 0 ? 'positive' : 'negative']">
            {{ row.quantity > 0 ? '+' : '' }}{{ row.quantity }}
          </span>
        </template>
        <template #empty>
          <EmptyState type="data" description="暂无库存变动记录" />
        </template>
      </t-table>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 库存管理页面
 * 功能：库存列表、入库、调整、预警设置、变动记录
 */
import { ref, reactive, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import {
  PageHeader,
  FilterCard,
  TableCard,
  StatCard,
  StatusTag,
  ProductCell,
  EmptyState,
} from '@/components'
import {
  getStockList,
  getStockStatistics,
  getStockLogs,
  stockIn,
  stockAdjust,
  setStockWarning,
  STOCK_STATUSES,
  STOCK_LOG_TYPES,
  type StockItem,
  type StockStatistics,
  type StockLog,
} from '@/api/stock'
import { getCategoryList, type Category } from '@/api/category'
import { getFirstImage, DEFAULT_PRODUCT_IMAGE } from '@/utils/image'

// 状态映射
const stockStatusMap = {
  NORMAL: { label: '正常', color: 'success' as const },
  WARNING: { label: '预警', color: 'warning' as const },
  OUT_OF_STOCK: { label: '缺货', color: 'danger' as const },
}

const stockLogTypeMap = {
  IN: { label: '入库', color: 'success' as const },
  OUT: { label: '出库', color: 'danger' as const },
  ADJUST: { label: '调整', color: 'warning' as const },
  LOCK: { label: '锁定', color: 'primary' as const },
  UNLOCK: { label: '解锁', color: 'default' as const },
}

// 统计数据
const statistics = ref<StockStatistics>({
  totalStock: 0,
  warningCount: 0,
  outOfStockCount: 0,
  pendingOrderCount: 0,
  productCount: 0,
})
const statsLoading = ref(false)

// 畅销商品
const hotProducts = ref<StockItem[]>([])
const hotProductsLoading = ref(false)

// 分类列表
const categoryList = ref<Category[]>([])

// 商品列表（用于选择）
const productList = ref<{ id: number; name: string }[]>([])
const productLoading = ref(false)

// 筛选表单
const filterForm = reactive({
  keyword: '',
  categoryId: undefined as number | undefined,
  status: '',
})

// 库存列表
const stockList = ref<StockItem[]>([])
const loading = ref(false)

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50],
})

// 排序配置
const sortConfig = ref({
  sortBy: '',
  descending: true,
})

// 表格列配置
const columns = [
  {
    colKey: 'productInfo',
    title: '商品信息',
    width: 280,
  },
  {
    colKey: 'stock',
    title: '当前库存',
    width: 120,
    align: 'right' as const,
    sortType: 'all' as const,
    sorter: true,
  },
  {
    colKey: 'lockStock',
    title: '锁定库存',
    width: 100,
    align: 'right' as const,
    sortType: 'all' as const,
    sorter: true,
  },
  {
    colKey: 'availableStock',
    title: '可用库存',
    width: 100,
    align: 'right' as const,
  },
  {
    colKey: 'salesCount',
    title: '累计销量',
    width: 100,
    align: 'right' as const,
    sortType: 'all' as const,
    sorter: true,
  },
  {
    colKey: 'minStock',
    title: '预警值',
    width: 90,
    align: 'right' as const,
  },
  {
    colKey: 'status',
    title: '状态',
    width: 90,
    align: 'center' as const,
  },
  {
    colKey: 'action',
    title: '操作',
    width: 140,
    align: 'center' as const,
  },
]

// 入库弹窗
const stockInDialog = reactive({
  visible: false,
  loading: false,
})
const stockInForm = reactive({
  productId: undefined as number | undefined,
  quantity: 1,
  remark: '',
})
const stockInFormRef = ref()
const stockInRules = {
  productId: [{ required: true, message: '请选择商品' }],
  quantity: [{ required: true, message: '请输入入库数量' }],
}

// 调整弹窗
const adjustDialog = reactive({
  visible: false,
  loading: false,
})
const adjustForm = reactive({
  productId: undefined as number | undefined,
  adjustQuantity: 0,
  reason: '',
})
const adjustFormRef = ref()
const adjustRules = {
  productId: [{ required: true, message: '请选择商品' }],
  adjustQuantity: [{ required: true, message: '请输入调整数量' }],
  reason: [{ required: true, message: '请输入调整原因' }],
}

// 预警设置弹窗
const warningDialog = reactive({
  visible: false,
  loading: false,
  productId: 0,
  productName: '',
  currentStock: 0,
})
const warningForm = reactive({
  minStock: 10,
})

// 日志弹窗
const logsDialog = reactive({
  visible: false,
  loading: false,
  productId: 0,
  productName: '',
})
const stockLogs = ref<StockLog[]>([])
const logsPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})
const logColumns = [
  { colKey: 'type', title: '类型', width: 80 },
  { colKey: 'quantity', title: '变动', width: 80, align: 'right' as const },
  { colKey: 'beforeStock', title: '变动前', width: 80, align: 'right' as const },
  { colKey: 'afterStock', title: '变动后', width: 80, align: 'right' as const },
  { colKey: 'operatorName', title: '操作人', width: 100 },
  { colKey: 'remark', title: '备注', ellipsis: true },
  {
    colKey: 'createdAt',
    title: '时间',
    width: 160,
    cell: (h: any, { row }: { row: StockLog }) => {
      return new Date(row.createdAt).toLocaleString('zh-CN')
    },
  },
]

// 获取商品图片
function getProductImage(item: StockItem): string {
  return getFirstImage(item.images, DEFAULT_PRODUCT_IMAGE)
}

// 获取库存样式类
function getStockClass(item: StockItem): string {
  if (item.status === 'OUT_OF_STOCK') return 'danger'
  if (item.status === 'WARNING') return 'warning'
  return ''
}

// 格式化数字
function formatNumber(num: number): string {
  return num.toLocaleString()
}

// 按状态筛选
function filterByStatus(status: string) {
  filterForm.status = status
  pagination.current = 1
  loadStockList()
}

// 加载统计数据
async function loadStatistics() {
  statsLoading.value = true
  try {
    const res = await getStockStatistics()
    if (res.code === 0) {
      statistics.value = res.data
    }
  } catch (err) {
    console.error('加载统计数据失败:', err)
  } finally {
    statsLoading.value = false
  }
}

// 加载畅销商品TOP5
async function loadHotProducts() {
  hotProductsLoading.value = true
  try {
    const res = await getStockList({
      page: 1,
      pageSize: 5,
      sortBy: 'salesCount',
      sortOrder: 'desc',
    })
    if (res.code === 0) {
      hotProducts.value = res.data.items
    }
  } catch (err) {
    console.error('加载畅销商品失败:', err)
  } finally {
    hotProductsLoading.value = false
  }
}

// 排序变化处理
function handleSortChange(sort: { sortBy: string; descending: boolean }) {
  sortConfig.value = sort
  // 前端排序
  if (sort.sortBy) {
    stockList.value = [...stockList.value].sort((a: any, b: any) => {
      const aVal = a[sort.sortBy] || 0
      const bVal = b[sort.sortBy] || 0
      return sort.descending ? bVal - aVal : aVal - bVal
    })
  } else {
    // 无排序时重新加载
    loadStockList()
  }
}

// 加载分类列表
async function loadCategories() {
  try {
    const res = await getCategoryList('ACTIVE')
    if (res.code === 0) {
      categoryList.value = res.data
    }
  } catch (err) {
    console.error('加载分类失败:', err)
  }
}

// 加载库存列表
async function loadStockList() {
  loading.value = true
  try {
    const res = await getStockList({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: filterForm.keyword || undefined,
      categoryId: filterForm.categoryId,
      status: filterForm.status || undefined,
    })
    if (res.code === 0) {
      stockList.value = res.data.items
      pagination.total = res.data.total
    }
  } catch (err) {
    console.error('加载库存列表失败:', err)
    MessagePlugin.error('加载库存列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  pagination.current = 1
  loadStockList()
}

// 重置
function handleReset() {
  filterForm.keyword = ''
  filterForm.categoryId = undefined
  filterForm.status = ''
  pagination.current = 1
  loadStockList()
}

// 分页变化
function handlePageChange(pageInfo: { current: number; pageSize: number }) {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  loadStockList()
}

// 导出
function handleExport() {
  const headers = ['商品名称', 'SKU', '当前库存', '锁定库存', '可用库存', '预警值', '状态']
  const rows = stockList.value.map((item) => [
    item.name,
    `MQ-${String(item.id).padStart(4, '0')}`,
    item.stock,
    item.lockStock || 0,
    (item.stock || 0) - (item.lockStock || 0),
    item.minStock || 10,
    stockStatusMap[item.status as keyof typeof stockStatusMap]?.label || item.status,
  ])
  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `库存报表_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`
  link.click()
  URL.revokeObjectURL(url)
  MessagePlugin.success('导出成功')
}

// 搜索商品
async function handleProductSearch(keyword: string) {
  if (!keyword) return
  productLoading.value = true
  try {
    const res = await getStockList({ keyword, pageSize: 50 })
    if (res.code === 0) {
      productList.value = res.data.items.map((item) => ({
        id: item.id,
        name: item.name,
      }))
    }
  } catch (err) {
    console.error('搜索商品失败:', err)
  } finally {
    productLoading.value = false
  }
}

// 打开入库弹窗
function openStockInDialog() {
  stockInForm.productId = undefined
  stockInForm.quantity = 1
  stockInForm.remark = ''
  loadProductList()
  stockInDialog.visible = true
}

// 快速入库
function handleStockIn(row: StockItem) {
  stockInForm.productId = row.id
  stockInForm.quantity = 1
  stockInForm.remark = ''
  productList.value = [{ id: row.id, name: row.name }]
  stockInDialog.visible = true
}

// 确认入库
async function handleStockInConfirm() {
  const valid = await stockInFormRef.value?.validate()
  if (valid !== true) return

  stockInDialog.loading = true
  try {
    const res = await stockIn({
      productId: stockInForm.productId!,
      quantity: stockInForm.quantity,
      remark: stockInForm.remark,
    })
    if (res.code === 0) {
      MessagePlugin.success('入库成功')
      stockInDialog.visible = false
      loadStockList()
      loadStatistics()
    } else {
      MessagePlugin.error(res.message || '入库失败')
    }
  } catch (err: any) {
    MessagePlugin.error(err.message || '入库失败')
  } finally {
    stockInDialog.loading = false
  }
}

// 打开调整弹窗
function openAdjustDialog() {
  adjustForm.productId = undefined
  adjustForm.adjustQuantity = 0
  adjustForm.reason = ''
  loadProductList()
  adjustDialog.visible = true
}

// 确认调整
async function handleAdjustConfirm() {
  const valid = await adjustFormRef.value?.validate()
  if (valid !== true) return

  if (adjustForm.adjustQuantity === 0) {
    MessagePlugin.warning('调整数量不能为0')
    return
  }

  adjustDialog.loading = true
  try {
    const res = await stockAdjust({
      productId: adjustForm.productId!,
      adjustQuantity: adjustForm.adjustQuantity,
      reason: adjustForm.reason,
    })
    if (res.code === 0) {
      MessagePlugin.success('库存调整成功')
      adjustDialog.visible = false
      loadStockList()
      loadStatistics()
    } else {
      MessagePlugin.error(res.message || '库存调整失败')
    }
  } catch (err: any) {
    MessagePlugin.error(err.message || '库存调整失败')
  } finally {
    adjustDialog.loading = false
  }
}

// 打开预警设置弹窗
function handleSetWarning(row: StockItem) {
  warningDialog.productId = row.id
  warningDialog.productName = row.name
  warningDialog.currentStock = row.stock
  warningForm.minStock = row.minStock || 10
  warningDialog.visible = true
}

// 确认设置预警值
async function handleWarningConfirm() {
  if (warningForm.minStock < 0) {
    MessagePlugin.warning('预警值不能为负数')
    return
  }

  warningDialog.loading = true
  try {
    const res = await setStockWarning(warningDialog.productId, warningForm.minStock)
    if (res.code === 0) {
      MessagePlugin.success('预警值设置成功')
      warningDialog.visible = false
      loadStockList()
      loadStatistics()
    } else {
      MessagePlugin.error(res.message || '设置预警值失败')
    }
  } catch (err: any) {
    MessagePlugin.error(err.message || '设置预警值失败')
  } finally {
    warningDialog.loading = false
  }
}

// 查看库存日志
async function handleViewLogs(row: StockItem) {
  logsDialog.productId = row.id
  logsDialog.productName = row.name
  logsDialog.visible = true
  logsPagination.current = 1
  await loadLogs()
}

// 加载日志
async function loadLogs() {
  logsDialog.loading = true
  try {
    const res = await getStockLogs(logsDialog.productId, {
      page: logsPagination.current,
      pageSize: logsPagination.pageSize,
    })
    if (res.code === 0) {
      stockLogs.value = res.data.items
      logsPagination.total = res.data.total
    }
  } catch (err) {
    console.error('加载日志失败:', err)
  } finally {
    logsDialog.loading = false
  }
}

// 日志分页变化
function handleLogsPageChange(pageInfo: { current: number; pageSize: number }) {
  logsPagination.current = pageInfo.current
  logsPagination.pageSize = pageInfo.pageSize
  loadLogs()
}

// 加载商品列表
async function loadProductList() {
  productLoading.value = true
  try {
    const res = await getStockList({ pageSize: 100 })
    if (res.code === 0) {
      productList.value = res.data.items.map((item) => ({
        id: item.id,
        name: item.name,
      }))
    }
  } catch (err) {
    console.error('加载商品列表失败:', err)
  } finally {
    productLoading.value = false
  }
}

// 初始化
onMounted(() => {
  loadStatistics()
  loadCategories()
  loadStockList()
  loadHotProducts()
})
</script>

<style scoped>
.stock-page {
  padding: var(--spacing-xl);
}

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

/* 库存单元格 */
.stock-cell {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: var(--spacing-xs);
}

.stock-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.stock-value.warning {
  color: var(--color-warning);
}

.stock-value.danger {
  color: var(--color-danger);
}

.stock-unit {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.lock-stock {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}

.available-stock {
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
}

.min-stock {
  color: var(--color-text-tertiary);
}

/* 表单提示 */
.form-tip {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-xs);
}

/* 预警弹窗内容 */
.warning-dialog-content {
  padding: var(--spacing-sm) 0;
}

.warning-product-info {
  background: var(--color-bg-container);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
}

.info-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border-light);
}

.info-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.info-value {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.info-value.highlight {
  font-size: var(--font-size-xl);
  color: var(--color-primary);
  font-weight: var(--font-weight-bold);
}

/* 数量变动样式 */
.quantity-change {
  font-weight: var(--font-weight-semibold);
}

.quantity-change.positive {
  color: var(--color-success);
}

.quantity-change.negative {
  color: var(--color-danger);
}

/* 畅销商品区域 */
.hot-products-card {
  margin-bottom: var(--spacing-xl);
}

.hot-products-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--spacing-lg);
}

.hot-product-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-lg);
  background: var(--color-bg-container);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  transition: all 0.2s ease;
}

.hot-product-item:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}

.rank-badge {
  position: absolute;
  top: -8px;
  left: -8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-text-tertiary);
  color: #fff;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rank-badge.top-3 {
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
}

.hot-product-item .product-image {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: var(--spacing-md);
}

.hot-product-item .product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hot-product-item .product-info {
  text-align: center;
  width: 100%;
}

.hot-product-item .product-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-product-item .product-meta {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
  font-size: var(--font-size-xs);
}

.hot-product-item .sales-count {
  color: var(--color-primary);
  display: flex;
  align-items: center;
  gap: 2px;
}

.hot-product-item .stock-info {
  color: var(--color-text-tertiary);
}

.hot-product-item .stock-info.warning {
  color: var(--color-warning);
}

.hot-product-item .stock-info.danger {
  color: var(--color-danger);
}

.hot-products-loading {
  display: flex;
  justify-content: center;
  padding: var(--spacing-xl);
}

/* 累计销量单元格 */
.sales-count-cell {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}

/* 响应式 */
@media (max-width: 1200px) {
  .hot-products-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stock-page {
    padding: var(--spacing-md);
  }

  .hot-products-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .hot-products-grid {
    grid-template-columns: 1fr;
  }
}
</style>
