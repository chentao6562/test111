<template>
  <div class="transfer-page">
    <!-- 页面标题 -->
    <PageHeader title="移库管理" subtitle="管理商品移库设置、订单打包与撮合规则" />

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <StatCard
        label="待撮合订单"
        :value="statistics.pendingMatchCount"
        suffix="单"
        icon="time"
        theme="warning"
        :loading="statsLoading"
        :highlight="statistics.pendingMatchCount > 0"
        clickable
        @click="switchTab('orders')"
      />
      <StatCard
        label="待抢打包"
        :value="statistics.pendingBundleCount"
        suffix="包"
        icon="layers"
        theme="primary"
        :loading="statsLoading"
        :highlight="statistics.pendingBundleCount > 0"
        clickable
        @click="switchTab('bundles')"
      />
      <StatCard
        label="进行中任务"
        :value="statistics.inProgressCount"
        suffix="单"
        icon="load"
        theme="info"
        :loading="statsLoading"
        clickable
        @click="switchTab('tasks')"
      />
      <StatCard
        label="本月完成"
        :value="statistics.completedThisMonth"
        suffix="单"
        icon="check-circle"
        theme="success"
        :loading="statsLoading"
      />
    </div>

    <!-- 主内容卡片 -->
    <t-card class="main-card" :bordered="false">
      <template #header>
        <t-tabs v-model="activeTab" @change="handleTabChange">
          <t-tab-panel value="products" label="商品移库设置" />
          <t-tab-panel value="orders">
            <template #label>
              <span>待撮合订单</span>
              <t-badge v-if="statistics.pendingMatchCount > 0" :count="statistics.pendingMatchCount" />
            </template>
          </t-tab-panel>
          <t-tab-panel value="bundles">
            <template #label>
              <span>订单打包</span>
              <t-badge v-if="statistics.pendingBundleCount > 0" :count="statistics.pendingBundleCount" />
            </template>
          </t-tab-panel>
          <t-tab-panel value="tasks" label="移库任务" />
          <t-tab-panel value="config" label="撮合规则" />
        </t-tabs>
      </template>

      <!-- 商品移库设置 -->
      <div v-if="activeTab === 'products'" class="tab-content">
        <div class="filter-bar">
          <t-input
            v-model="productFilter.keyword"
            placeholder="商品名称/编码"
            clearable
            style="width: 200px"
          >
            <template #prefix-icon><t-icon name="search" /></template>
          </t-input>
          <t-select
            v-model="productFilter.categoryId"
            placeholder="全部分类"
            clearable
            style="width: 150px"
          >
            <t-option v-for="cat in categories" :key="cat.id" :value="cat.id" :label="cat.name" />
          </t-select>
          <t-select
            v-model="productFilter.transferStatus"
            placeholder="移库状态"
            clearable
            style="width: 120px"
          >
            <t-option value="" label="全部" />
            <t-option value="enabled" label="已启用" />
            <t-option value="disabled" label="已禁用" />
            <t-option value="noFee" label="未设价" />
          </t-select>
          <t-space style="margin-left: auto;">
            <t-button theme="default" @click="handleProductReset">重置</t-button>
            <t-button theme="primary" @click="loadProducts">查询</t-button>
            <t-button variant="outline" @click="showBatchSetDialog = true">
              <template #icon><t-icon name="setting" /></template>
              批量设置
            </t-button>
          </t-space>
        </div>

        <t-table
          :data="productList"
          :columns="productColumns"
          :loading="productLoading"
          :pagination="productPagination"
          row-key="id"
          hover
          stripe
          @page-change="handleProductPageChange"
          @select-change="handleProductSelect"
          :selected-row-keys="selectedProductIds"
        >
          <template #name="{ row }">
            <div class="product-cell">
              <t-image
                :src="getProductImage(row.images)"
                fit="cover"
                class="product-thumb"
              />
              <div class="product-info">
                <span class="product-name">{{ row.name }}</span>
                <span class="product-sku">{{ row.sku || '-' }}</span>
              </div>
            </div>
          </template>
          <template #allowTransfer="{ row }">
            <t-switch
              :value="row.allowTransfer"
              @change="(val) => handleToggleTransfer(row.id, val)"
            />
          </template>
          <template #transferFee="{ row }">
            <span v-if="row.transferFee" class="fee-value">¥{{ row.transferFee }}</span>
            <span v-else class="fee-empty">未设置</span>
          </template>
          <template #operation="{ row }">
            <t-button theme="primary" variant="text" size="small" @click="openSetFeeDialog(row)">
              设置移库费
            </t-button>
          </template>
        </t-table>
      </div>

      <!-- 待撮合订单 -->
      <div v-if="activeTab === 'orders'" class="tab-content">
        <div class="filter-bar">
          <t-input
            v-model="orderFilter.keyword"
            placeholder="订单号/代理商名称"
            clearable
            style="width: 200px"
          >
            <template #prefix-icon><t-icon name="search" /></template>
          </t-input>
          <t-date-range-picker
            v-model="orderFilter.dateRange"
            placeholder="选择日期范围"
            style="width: 260px"
          />
          <t-space style="margin-left: auto;">
            <t-button theme="default" @click="handleOrderReset">重置</t-button>
            <t-button theme="primary" @click="loadPendingOrders">查询</t-button>
            <t-button theme="primary" variant="outline" @click="handleManualMatch">
              <template #icon><t-icon name="layers" /></template>
              立即撮合
            </t-button>
            <t-button variant="outline" @click="showCreateBundleDialog = true" :disabled="selectedOrderIds.length < 1">
              <template #icon><t-icon name="add" /></template>
              手动打包 ({{ selectedOrderIds.length }})
            </t-button>
          </t-space>
        </div>

        <t-table
          :data="pendingOrderList"
          :columns="pendingOrderColumns"
          :loading="orderLoading"
          :pagination="orderPagination"
          row-key="id"
          hover
          stripe
          @page-change="handleOrderPageChange"
          @select-change="handleOrderSelect"
          :selected-row-keys="selectedOrderIds"
        >
          <template #orderNo="{ row }">
            <t-link theme="primary" hover="color" @click="goToOrderDetail(row.id)">{{ row.orderNo }}</t-link>
          </template>
          <template #agent="{ row }">
            <div class="agent-info">
              <span class="agent-name">{{ row.agent?.name || '-' }}</span>
              <span class="agent-phone">{{ row.agent?.phone || '-' }}</span>
            </div>
          </template>
          <template #transferFee="{ row }">
            <span class="fee-value">¥{{ row.transferFee || 0 }}</span>
          </template>
          <template #waitTime="{ row }">
            <span :class="getWaitTimeClass(row.createdAt)">{{ getWaitTime(row.createdAt) }}</span>
          </template>
        </t-table>
      </div>

      <!-- 订单打包 -->
      <div v-if="activeTab === 'bundles'" class="tab-content">
        <div class="filter-bar">
          <t-input
            v-model="bundleFilter.keyword"
            placeholder="打包编号"
            clearable
            style="width: 200px"
          >
            <template #prefix-icon><t-icon name="search" /></template>
          </t-input>
          <t-select
            v-model="bundleFilter.status"
            placeholder="全部状态"
            clearable
            style="width: 120px"
          >
            <t-option value="" label="全部" />
            <t-option value="PENDING" label="待抢单" />
            <t-option value="DISPATCHED" label="进行中" />
            <t-option value="COMPLETED" label="已完成" />
          </t-select>
          <t-date-range-picker
            v-model="bundleFilter.dateRange"
            placeholder="选择日期范围"
            style="width: 260px"
          />
          <t-space style="margin-left: auto;">
            <t-button theme="default" @click="handleBundleReset">重置</t-button>
            <t-button theme="primary" @click="loadBundles">查询</t-button>
          </t-space>
        </div>

        <t-table
          :data="bundleList"
          :columns="bundleColumns"
          :loading="bundleLoading"
          :pagination="bundlePagination"
          row-key="id"
          hover
          stripe
          @page-change="handleBundlePageChange"
        >
          <template #bundleNo="{ row }">
            <span class="bundle-no">{{ row.bundleNo }}</span>
          </template>
          <template #status="{ row }">
            <t-tag :theme="getBundleStatusTheme(row.status)" variant="light">
              {{ getBundleStatusText(row.status) }}
            </t-tag>
          </template>
          <template #totalFee="{ row }">
            <span class="fee-value">¥{{ row.totalFee }}</span>
          </template>
          <template #logistics="{ row }">
            <span v-if="row.logistics">{{ row.logistics.name }}</span>
            <span v-else class="text-muted">-</span>
          </template>
          <template #operation="{ row }">
            <t-button theme="primary" variant="text" size="small" @click="openBundleDetail(row)">
              查看详情
            </t-button>
          </template>
        </t-table>
      </div>

      <!-- 移库任务 -->
      <div v-if="activeTab === 'tasks'" class="tab-content">
        <div class="filter-bar">
          <t-input
            v-model="taskFilter.keyword"
            placeholder="订单号/货管姓名"
            clearable
            style="width: 200px"
          >
            <template #prefix-icon><t-icon name="search" /></template>
          </t-input>
          <t-select
            v-model="taskFilter.status"
            placeholder="全部状态"
            clearable
            style="width: 120px"
          >
            <t-option value="" label="全部" />
            <t-option value="PENDING" label="待接单" />
            <t-option value="ACCEPTED" label="进行中" />
            <t-option value="COMPLETED" label="已完成" />
          </t-select>
          <t-date-range-picker
            v-model="taskFilter.dateRange"
            placeholder="选择日期范围"
            style="width: 260px"
          />
          <t-space style="margin-left: auto;">
            <t-button theme="default" @click="handleTaskReset">重置</t-button>
            <t-button theme="primary" @click="loadTasks">查询</t-button>
          </t-space>
        </div>

        <t-table
          :data="taskList"
          :columns="taskColumns"
          :loading="taskLoading"
          :pagination="taskPagination"
          row-key="id"
          hover
          stripe
          @page-change="handleTaskPageChange"
        >
          <template #orderNo="{ row }">
            <span class="order-no">{{ row.order?.orderNo || '-' }}</span>
          </template>
          <template #status="{ row }">
            <t-tag :theme="getTaskStatusTheme(row.status)" variant="light">
              {{ getTaskStatusText(row.status) }}
            </t-tag>
          </template>
          <template #fee="{ row }">
            <span class="fee-value">¥{{ row.fee || 0 }}</span>
          </template>
          <template #logistics="{ row }">
            <span v-if="row.logistics">{{ row.logistics.name }}</span>
            <span v-else class="text-muted">未接单</span>
          </template>
        </t-table>
      </div>

      <!-- 撮合规则 -->
      <div v-if="activeTab === 'config'" class="tab-content">
        <div class="config-section">
          <h3 class="section-title">撮合规则配置</h3>
          <p class="section-desc">配置订单自动撮合的规则参数，系统将根据这些规则自动将待移库订单打包</p>

          <t-form
            ref="configFormRef"
            :data="configForm"
            :rules="configRules"
            label-width="150px"
            class="config-form"
          >
            <t-form-item label="自动撮合" name="autoMatchEnabled">
              <t-switch v-model="configForm.autoMatchEnabled" />
              <span class="form-tip">开启后系统将每小时自动执行撮合</span>
            </t-form-item>
            <t-form-item label="最低打包金额" name="minBundleFee">
              <t-input-number
                v-model="configForm.minBundleFee"
                theme="normal"
                :min="0"
                :max="10000"
                suffix="元"
                style="width: 200px"
              />
              <span class="form-tip">订单移库费累计达到此金额时创建打包</span>
            </t-form-item>
            <t-form-item label="单包最大订单数" name="maxOrdersPerBundle">
              <t-input-number
                v-model="configForm.maxOrdersPerBundle"
                theme="normal"
                :min="1"
                :max="20"
                suffix="单"
                style="width: 200px"
              />
              <span class="form-tip">每个打包最多包含的订单数量</span>
            </t-form-item>
            <t-form-item label="最长等待时间" name="maxWaitHours">
              <t-input-number
                v-model="configForm.maxWaitHours"
                theme="normal"
                :min="1"
                :max="168"
                suffix="小时"
                style="width: 200px"
              />
              <span class="form-tip">超过此时间的订单将强制打包发出</span>
            </t-form-item>
            <t-form-item>
              <t-space>
                <t-button theme="primary" :loading="configSaving" @click="handleSaveConfig">
                  保存配置
                </t-button>
                <t-button theme="default" @click="loadConfig">重置</t-button>
              </t-space>
            </t-form-item>
          </t-form>
        </div>
      </div>
    </t-card>

    <!-- 设置移库费弹窗 -->
    <t-dialog
      v-model:visible="showSetFeeDialog"
      header="设置移库费"
      :confirm-btn="{ content: '确定', loading: setFeeLoading }"
      @confirm="handleSetFee"
    >
      <t-form :data="setFeeForm" label-width="100px">
        <t-form-item label="商品名称">
          <span>{{ currentProduct?.name }}</span>
        </t-form-item>
        <t-form-item label="移库费用">
          <t-input-number
            v-model="setFeeForm.transferFee"
            theme="normal"
            :min="0"
            :max="9999"
            :decimal-places="2"
            suffix="元/件"
            style="width: 200px"
          />
        </t-form-item>
        <t-form-item label="启用移库">
          <t-switch v-model="setFeeForm.allowTransfer" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 批量设置弹窗 -->
    <t-dialog
      v-model:visible="showBatchSetDialog"
      header="批量设置移库费"
      width="500px"
      :confirm-btn="{ content: '确定', loading: batchSetLoading, disabled: selectedProductIds.length === 0 }"
      @confirm="handleBatchSet"
    >
      <t-alert theme="info" style="margin-bottom: 16px">
        已选择 {{ selectedProductIds.length }} 个商品
      </t-alert>
      <t-form :data="batchSetForm" label-width="100px">
        <t-form-item label="移库费用">
          <t-input-number
            v-model="batchSetForm.transferFee"
            theme="normal"
            :min="0"
            :max="9999"
            :decimal-places="2"
            suffix="元/件"
            style="width: 200px"
          />
        </t-form-item>
        <t-form-item label="启用移库">
          <t-radio-group v-model="batchSetForm.allowTransfer">
            <t-radio :value="true">全部启用</t-radio>
            <t-radio :value="false">全部禁用</t-radio>
            <t-radio :value="null">不修改</t-radio>
          </t-radio-group>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 手动打包弹窗 -->
    <t-dialog
      v-model:visible="showCreateBundleDialog"
      header="手动创建打包"
      width="600px"
      :confirm-btn="{ content: '创建打包', loading: createBundleLoading }"
      @confirm="handleCreateBundle"
    >
      <t-alert theme="info" style="margin-bottom: 16px">
        已选择 {{ selectedOrderIds.length }} 个订单，总移库费：¥{{ selectedOrdersTotalFee }}
      </t-alert>
      <t-table
        :data="selectedOrders"
        :columns="[
          { colKey: 'orderNo', title: '订单号', width: 150 },
          { colKey: 'agentName', title: '代理商', width: 120 },
          { colKey: 'transferFee', title: '移库费', width: 100 },
        ]"
        row-key="id"
        size="small"
        max-height="300"
      >
        <template #transferFee="{ row }">
          ¥{{ row.transferFee || 0 }}
        </template>
      </t-table>
    </t-dialog>

    <!-- 打包详情弹窗 -->
    <t-dialog
      v-model:visible="showBundleDetailDialog"
      header="打包详情"
      width="700px"
      :footer="false"
    >
      <div v-if="currentBundle" class="bundle-detail">
        <div class="detail-header">
          <div class="detail-item">
            <span class="label">打包编号</span>
            <span class="value">{{ currentBundle.bundleNo }}</span>
          </div>
          <div class="detail-item">
            <span class="label">状态</span>
            <t-tag :theme="getBundleStatusTheme(currentBundle.status)" variant="light">
              {{ getBundleStatusText(currentBundle.status) }}
            </t-tag>
          </div>
          <div class="detail-item">
            <span class="label">总移库费</span>
            <span class="value fee">¥{{ currentBundle.totalFee }}</span>
          </div>
          <div class="detail-item">
            <span class="label">接单货管</span>
            <span class="value">{{ currentBundle.logistics?.name || '未接单' }}</span>
          </div>
        </div>
        <t-divider />
        <h4>包含订单 ({{ currentBundle.orders?.length || 0 }})</h4>
        <t-table
          :data="currentBundle.orders || []"
          :columns="bundleOrderColumns"
          row-key="id"
          size="small"
          max-height="300"
        />
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 移库管理页面
 * 包含：商品移库设置、待撮合订单、订单打包、移库任务、撮合规则
 * 2026-01-11 新增
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import request from '@/api/request'
const { get, post, put } = request

const router = useRouter()

// =============== 统计数据 ===============
const statsLoading = ref(false)
const statistics = reactive({
  pendingMatchCount: 0,
  pendingBundleCount: 0,
  inProgressCount: 0,
  completedThisMonth: 0,
})

async function loadStatistics() {
  statsLoading.value = true
  try {
    const res = await get('/admin/transfer/bundles/stats')
    if (res.code === 0) {
      Object.assign(statistics, res.data)
    }
  } catch (e) {
    console.error('加载统计数据失败', e)
  } finally {
    statsLoading.value = false
  }
}

// =============== Tab切换 ===============
const activeTab = ref('products')

function switchTab(tab: string) {
  activeTab.value = tab
  handleTabChange(tab)
}

function handleTabChange(tab: string | number) {
  if (tab === 'products') loadProducts()
  else if (tab === 'orders') loadPendingOrders()
  else if (tab === 'bundles') loadBundles()
  else if (tab === 'tasks') loadTasks()
  else if (tab === 'config') loadConfig()
}

// =============== 商品移库设置 ===============
const productLoading = ref(false)
const productList = ref<any[]>([])
const selectedProductIds = ref<number[]>([])
const categories = ref<any[]>([])
const productFilter = reactive({
  keyword: '',
  categoryId: null as number | null,
  transferStatus: '',
})
const productPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

const productColumns = [
  { colKey: 'row-select', type: 'multiple', width: 50 },
  { colKey: 'name', title: '商品', width: 250 },
  { colKey: 'categoryName', title: '分类', width: 100 },
  { colKey: 'agentPrice', title: '代理价', width: 100, cell: (h: any, { row }: any) => `¥${row.agentPrice || 0}` },
  { colKey: 'allowTransfer', title: '支持移库', width: 100 },
  { colKey: 'transferFee', title: '移库费', width: 100 },
  { colKey: 'stock', title: '库存', width: 80 },
  { colKey: 'operation', title: '操作', width: 120 },
]

async function loadProducts() {
  productLoading.value = true
  try {
    const params: any = {
      page: productPagination.current,
      pageSize: productPagination.pageSize,
    }
    if (productFilter.keyword) params.keyword = productFilter.keyword
    if (productFilter.categoryId) params.categoryId = productFilter.categoryId
    if (productFilter.transferStatus) params.transferStatus = productFilter.transferStatus

    const res = await get('/admin/products', params)
    if (res.code === 0) {
      productList.value = res.data.list || []
      productPagination.total = res.data.total || 0
    }
  } catch (e) {
    console.error('加载商品失败', e)
  } finally {
    productLoading.value = false
  }
}

async function loadCategories() {
  try {
    const res = await get('/admin/categories')
    if (res.code === 0) {
      categories.value = res.data || []
    }
  } catch (e) {
    console.error('加载分类失败', e)
  }
}

function handleProductReset() {
  productFilter.keyword = ''
  productFilter.categoryId = null
  productFilter.transferStatus = ''
  productPagination.current = 1
  loadProducts()
}

function handleProductPageChange(pageInfo: { current: number; pageSize: number }) {
  productPagination.current = pageInfo.current
  productPagination.pageSize = pageInfo.pageSize
  loadProducts()
}

function handleProductSelect(selectedRowKeys: number[]) {
  selectedProductIds.value = selectedRowKeys
}

function getProductImage(images: string | string[] | null | undefined) {
  if (!images) return ''
  // 如果已经是数组，直接返回第一个元素
  if (Array.isArray(images)) {
    return images.length > 0 ? images[0] : ''
  }
  // 如果是字符串，尝试JSON解析
  if (typeof images === 'string') {
    try {
      const arr = JSON.parse(images)
      return Array.isArray(arr) && arr.length > 0 ? arr[0] : ''
    } catch {
      return images.replace(/^\[|\]$/g, '').trim()
    }
  }
  return ''
}

// 设置移库费
const showSetFeeDialog = ref(false)
const setFeeLoading = ref(false)
const currentProduct = ref<any>(null)
const setFeeForm = reactive({
  transferFee: 0,
  allowTransfer: true,
})

function openSetFeeDialog(product: any) {
  currentProduct.value = product
  setFeeForm.transferFee = product.transferFee || 0
  setFeeForm.allowTransfer = product.allowTransfer !== false
  showSetFeeDialog.value = true
}

async function handleSetFee() {
  if (!currentProduct.value) return
  setFeeLoading.value = true
  try {
    const res = await put(`/admin/products/${currentProduct.value.id}/transfer`, {
      transferFee: setFeeForm.transferFee,
      allowTransfer: setFeeForm.allowTransfer,
    })
    if (res.code === 0) {
      MessagePlugin.success('设置成功')
      showSetFeeDialog.value = false
      loadProducts()
    } else {
      MessagePlugin.error(res.message || '设置失败')
    }
  } catch (e: any) {
    MessagePlugin.error(e.message || '设置失败')
  } finally {
    setFeeLoading.value = false
  }
}

async function handleToggleTransfer(productId: number, allowTransfer: boolean) {
  try {
    const res = await put(`/admin/products/${productId}/transfer`, { allowTransfer })
    if (res.code === 0) {
      MessagePlugin.success(allowTransfer ? '已启用移库' : '已禁用移库')
      loadProducts()
    } else {
      MessagePlugin.error(res.message || '操作失败')
    }
  } catch (e: any) {
    MessagePlugin.error(e.message || '操作失败')
  }
}

// 批量设置
const showBatchSetDialog = ref(false)
const batchSetLoading = ref(false)
const batchSetForm = reactive({
  transferFee: 0,
  allowTransfer: null as boolean | null,
})

async function handleBatchSet() {
  if (selectedProductIds.value.length === 0) {
    MessagePlugin.warning('请先选择商品')
    return
  }
  batchSetLoading.value = true
  try {
    const res = await put('/admin/products/batch-transfer', {
      productIds: selectedProductIds.value,
      transferFee: batchSetForm.transferFee,
      allowTransfer: batchSetForm.allowTransfer,
    })
    if (res.code === 0) {
      MessagePlugin.success(`成功更新 ${res.data?.updated || 0} 个商品`)
      showBatchSetDialog.value = false
      selectedProductIds.value = []
      loadProducts()
    } else {
      MessagePlugin.error(res.message || '批量设置失败')
    }
  } catch (e: any) {
    MessagePlugin.error(e.message || '批量设置失败')
  } finally {
    batchSetLoading.value = false
  }
}

// =============== 待撮合订单 ===============
const orderLoading = ref(false)
const pendingOrderList = ref<any[]>([])
const selectedOrderIds = ref<number[]>([])
const orderFilter = reactive({
  keyword: '',
  dateRange: [] as string[],
})
const orderPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

const pendingOrderColumns = [
  { colKey: 'row-select', type: 'multiple', width: 50 },
  { colKey: 'orderNo', title: '订单号', width: 160 },
  { colKey: 'agent', title: '代理商', width: 150 },
  { colKey: 'totalAmount', title: '订单金额', width: 100, cell: (h: any, { row }: any) => `¥${row.totalAmount}` },
  { colKey: 'transferFee', title: '移库费', width: 100 },
  { colKey: 'waitTime', title: '等待时间', width: 100 },
  { colKey: 'createdAt', title: '下单时间', width: 160, cell: (h: any, { row }: any) => formatTime(row.createdAt) },
]

async function loadPendingOrders() {
  orderLoading.value = true
  try {
    const params: any = {
      page: orderPagination.current,
      pageSize: orderPagination.pageSize,
    }
    if (orderFilter.keyword) params.keyword = orderFilter.keyword
    if (orderFilter.dateRange?.length === 2) {
      params.startDate = orderFilter.dateRange[0]
      params.endDate = orderFilter.dateRange[1]
    }

    const res = await get('/admin/transfer/pending-orders', params)
    if (res.code === 0) {
      pendingOrderList.value = res.data.list || []
      orderPagination.total = res.data.total || 0
    }
  } catch (e) {
    console.error('加载待撮合订单失败', e)
  } finally {
    orderLoading.value = false
  }
}

function handleOrderReset() {
  orderFilter.keyword = ''
  orderFilter.dateRange = []
  orderPagination.current = 1
  loadPendingOrders()
}

function handleOrderPageChange(pageInfo: { current: number; pageSize: number }) {
  orderPagination.current = pageInfo.current
  orderPagination.pageSize = pageInfo.pageSize
  loadPendingOrders()
}

function handleOrderSelect(selectedRowKeys: number[]) {
  selectedOrderIds.value = selectedRowKeys
}

// 跳转到订单详情页
function goToOrderDetail(orderId: number) {
  router.push(`/orders?id=${orderId}`)
}

function getWaitTime(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '< 1小时'
  if (hours < 24) return `${hours}小时`
  return `${Math.floor(hours / 24)}天`
}

function getWaitTimeClass(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours >= 24) return 'wait-danger'
  if (hours >= 12) return 'wait-warning'
  return 'wait-normal'
}

// 立即撮合
async function handleManualMatch() {
  try {
    const res = await post('/admin/transfer/match')
    if (res.code === 0) {
      if (res.data?.created > 0) {
        MessagePlugin.success(`撮合成功，创建了 ${res.data.created} 个打包`)
      } else {
        MessagePlugin.info('当前无满足条件的订单需要打包')
      }
      loadPendingOrders()
      loadBundles()
      loadStatistics()
    } else {
      MessagePlugin.error(res.message || '撮合失败')
    }
  } catch (e: any) {
    MessagePlugin.error(e.message || '撮合失败')
  }
}

// 手动打包
const showCreateBundleDialog = ref(false)
const createBundleLoading = ref(false)

const selectedOrders = computed(() => {
  return pendingOrderList.value
    .filter(o => selectedOrderIds.value.includes(o.id))
    .map(o => ({
      id: o.id,
      orderNo: o.orderNo,
      agentName: o.agent?.name || '-',
      transferFee: o.transferFee || 0,
    }))
})

const selectedOrdersTotalFee = computed(() => {
  return selectedOrders.value.reduce((sum, o) => sum + Number(o.transferFee || 0), 0).toFixed(2)
})

async function handleCreateBundle() {
  if (selectedOrderIds.value.length === 0) {
    MessagePlugin.warning('请选择要打包的订单')
    return
  }
  createBundleLoading.value = true
  try {
    const res = await post('/admin/transfer/bundles', {
      orderIds: selectedOrderIds.value,
    })
    if (res.code === 0) {
      MessagePlugin.success('打包创建成功')
      showCreateBundleDialog.value = false
      selectedOrderIds.value = []
      loadPendingOrders()
      loadBundles()
      loadStatistics()
    } else {
      MessagePlugin.error(res.message || '创建失败')
    }
  } catch (e: any) {
    MessagePlugin.error(e.message || '创建失败')
  } finally {
    createBundleLoading.value = false
  }
}

// =============== 订单打包 ===============
const bundleLoading = ref(false)
const bundleList = ref<any[]>([])
const bundleFilter = reactive({
  keyword: '',
  status: '',
  dateRange: [] as string[],
})
const bundlePagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

const bundleColumns = [
  { colKey: 'bundleNo', title: '打包编号', width: 160 },
  { colKey: 'orderCount', title: '订单数', width: 80 },
  { colKey: 'totalFee', title: '总移库费', width: 100 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'logistics', title: '接单货管', width: 120 },
  { colKey: 'createdAt', title: '创建时间', width: 160, cell: (h: any, { row }: any) => formatTime(row.createdAt) },
  { colKey: 'operation', title: '操作', width: 100 },
]

async function loadBundles() {
  bundleLoading.value = true
  try {
    const params: any = {
      page: bundlePagination.current,
      pageSize: bundlePagination.pageSize,
    }
    if (bundleFilter.keyword) params.keyword = bundleFilter.keyword
    if (bundleFilter.status) params.status = bundleFilter.status
    if (bundleFilter.dateRange?.length === 2) {
      params.startDate = bundleFilter.dateRange[0]
      params.endDate = bundleFilter.dateRange[1]
    }

    const res = await get('/admin/transfer/bundles', params)
    if (res.code === 0) {
      bundleList.value = res.data.list || []
      bundlePagination.total = res.data.total || 0
    }
  } catch (e) {
    console.error('加载打包列表失败', e)
  } finally {
    bundleLoading.value = false
  }
}

function handleBundleReset() {
  bundleFilter.keyword = ''
  bundleFilter.status = ''
  bundleFilter.dateRange = []
  bundlePagination.current = 1
  loadBundles()
}

function handleBundlePageChange(pageInfo: { current: number; pageSize: number }) {
  bundlePagination.current = pageInfo.current
  bundlePagination.pageSize = pageInfo.pageSize
  loadBundles()
}

function getBundleStatusTheme(status: string) {
  switch (status) {
    case 'PENDING': return 'warning'
    case 'DISPATCHED': return 'primary'
    case 'COMPLETED': return 'success'
    default: return 'default'
  }
}

function getBundleStatusText(status: string) {
  switch (status) {
    case 'PENDING': return '待抢单'
    case 'DISPATCHED': return '进行中'
    case 'COMPLETED': return '已完成'
    default: return status
  }
}

// 打包详情
const showBundleDetailDialog = ref(false)
const currentBundle = ref<any>(null)

const bundleOrderColumns = [
  { colKey: 'orderNo', title: '订单号', width: 160 },
  { colKey: 'agentName', title: '代理商', width: 120, cell: (h: any, { row }: any) => row.agent?.name || '-' },
  { colKey: 'totalAmount', title: '订单金额', width: 100, cell: (h: any, { row }: any) => `¥${row.totalAmount}` },
  { colKey: 'transferFee', title: '移库费', width: 100, cell: (h: any, { row }: any) => `¥${row.transferFee || 0}` },
  { colKey: 'status', title: '状态', width: 100 },
]

async function openBundleDetail(bundle: any) {
  try {
    const res = await get(`/admin/transfer/bundles/${bundle.id}`)
    if (res.code === 0) {
      currentBundle.value = res.data
      showBundleDetailDialog.value = true
    }
  } catch (e) {
    console.error('加载打包详情失败', e)
  }
}

// =============== 移库任务 ===============
const taskLoading = ref(false)
const taskList = ref<any[]>([])
const taskFilter = reactive({
  keyword: '',
  status: '',
  dateRange: [] as string[],
})
const taskPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

const taskColumns = [
  { colKey: 'id', title: '任务ID', width: 80 },
  { colKey: 'orderNo', title: '订单号', width: 160 },
  { colKey: 'fee', title: '移库费', width: 100 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'logistics', title: '货管', width: 120 },
  { colKey: 'createdAt', title: '创建时间', width: 160, cell: (h: any, { row }: any) => formatTime(row.createdAt) },
  { colKey: 'completedAt', title: '完成时间', width: 160, cell: (h: any, { row }: any) => row.completedAt ? formatTime(row.completedAt) : '-' },
]

async function loadTasks() {
  taskLoading.value = true
  try {
    const params: any = {
      page: taskPagination.current,
      pageSize: taskPagination.pageSize,
    }
    if (taskFilter.keyword) params.keyword = taskFilter.keyword
    if (taskFilter.status) params.status = taskFilter.status
    if (taskFilter.dateRange?.length === 2) {
      params.startDate = taskFilter.dateRange[0]
      params.endDate = taskFilter.dateRange[1]
    }

    const res = await get('/admin/transfer/tasks', params)
    if (res.code === 0) {
      taskList.value = res.data.list || []
      taskPagination.total = res.data.total || 0
    }
  } catch (e) {
    console.error('加载移库任务失败', e)
  } finally {
    taskLoading.value = false
  }
}

function handleTaskReset() {
  taskFilter.keyword = ''
  taskFilter.status = ''
  taskFilter.dateRange = []
  taskPagination.current = 1
  loadTasks()
}

function handleTaskPageChange(pageInfo: { current: number; pageSize: number }) {
  taskPagination.current = pageInfo.current
  taskPagination.pageSize = pageInfo.pageSize
  loadTasks()
}

function getTaskStatusTheme(status: string) {
  switch (status) {
    case 'PENDING': return 'warning'
    case 'ACCEPTED': return 'primary'
    case 'COMPLETED': return 'success'
    default: return 'default'
  }
}

function getTaskStatusText(status: string) {
  switch (status) {
    case 'PENDING': return '待接单'
    case 'ACCEPTED': return '进行中'
    case 'COMPLETED': return '已完成'
    default: return status
  }
}

// =============== 撮合规则配置 ===============
const configSaving = ref(false)
const configFormRef = ref()
const configForm = reactive({
  autoMatchEnabled: true,
  minBundleFee: 500,
  maxOrdersPerBundle: 5,
  maxWaitHours: 24,
})

const configRules = {
  minBundleFee: [{ required: true, message: '请输入最低打包金额' }],
  maxOrdersPerBundle: [{ required: true, message: '请输入单包最大订单数' }],
  maxWaitHours: [{ required: true, message: '请输入最长等待时间' }],
}

async function loadConfig() {
  try {
    const res = await get('/admin/transfer/config')
    if (res.code === 0 && res.data) {
      Object.assign(configForm, res.data)
    }
  } catch (e) {
    console.error('加载配置失败', e)
  }
}

async function handleSaveConfig() {
  configSaving.value = true
  try {
    const res = await put('/admin/transfer/config', configForm)
    if (res.code === 0) {
      MessagePlugin.success('配置保存成功')
    } else {
      MessagePlugin.error(res.message || '保存失败')
    }
  } catch (e: any) {
    MessagePlugin.error(e.message || '保存失败')
  } finally {
    configSaving.value = false
  }
}

// =============== 工具函数 ===============
function formatTime(time: string) {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// =============== 初始化 ===============
onMounted(() => {
  loadStatistics()
  loadCategories()
  loadProducts()
})
</script>

<style scoped>
.transfer-page {
  padding: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.main-card {
  border-radius: 8px;
}

.main-card :deep(.t-card__header) {
  padding: 0;
  border-bottom: none;
}

.main-card :deep(.t-tabs__nav) {
  padding: 0 24px;
}

.main-card :deep(.t-card__body) {
  padding: 0;
}

.tab-content {
  padding: 24px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

/* 商品单元格 */
.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.product-info {
  display: flex;
  flex-direction: column;
}

.product-name {
  font-weight: 500;
  color: #333;
}

.product-sku {
  font-size: 12px;
  color: #999;
}

/* 费用值 */
.fee-value {
  color: #e53734;
  font-weight: 500;
}

.fee-empty {
  color: #999;
}

/* 代理商信息 */
.agent-info {
  display: flex;
  flex-direction: column;
}

.agent-name {
  font-weight: 500;
}

.agent-phone {
  font-size: 12px;
  color: #999;
}

/* 订单号 */
.order-no, .bundle-no {
  font-family: monospace;
  color: #0052d9;
}

/* 等待时间 */
.wait-normal {
  color: #52c41a;
}

.wait-warning {
  color: #faad14;
}

.wait-danger {
  color: #ff4d4f;
}

/* 撮合规则配置 */
.config-section {
  max-width: 600px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.section-desc {
  color: #666;
  margin-bottom: 24px;
}

.config-form {
  margin-top: 24px;
}

.form-tip {
  margin-left: 12px;
  color: #999;
  font-size: 13px;
}

/* 打包详情 */
.bundle-detail {
  padding: 8px 0;
}

.detail-header {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item .label {
  font-size: 13px;
  color: #999;
}

.detail-item .value {
  font-size: 15px;
  font-weight: 500;
}

.detail-item .value.fee {
  color: #e53734;
}

.text-muted {
  color: #999;
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
