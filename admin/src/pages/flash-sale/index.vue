<script setup lang="ts">
/**
 * 限时秒杀活动管理页面
 * 完整的秒杀活动管理：活动CRUD、商品配置、状态管理
 */
import { ref, onMounted, computed } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { PrimaryTableCol, PageInfo } from 'tdesign-vue-next'
import request from '@/api/request'
import { EmptyState } from '@/components'

// 活动状态
const ActivityStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED'
}

// 活动类型
interface FlashSaleActivity {
  id: number
  name: string
  startTime: string
  endTime: string
  status: string
  bannerImage?: string
  description?: string
  itemCount: number
  totalSold: number
  totalStock: number
  items: FlashSaleItem[]
  createdAt: string
}

// 秒杀商品
interface FlashSaleItem {
  id: number
  activityId: number
  productId: number
  flashPrice: number
  flashStock: number
  soldCount: number
  limitPerUser: number
  sort: number
  product: {
    id: number
    name: string
    images: string
    retailPrice: number
    supplyPrice: number
    stock: number
    lockStock: number
    unit: string
    category?: { id: number; name: string }
  }
}

// 商品类型
interface Product {
  id: number
  name: string
  images: string
  retailPrice: number
  supplyPrice: number
  stock: number
  lockStock: number
  unit: string
  category?: { id: number; name: string }
}

// 活动列表数据
const activities = ref<FlashSaleActivity[]>([])
const loading = ref(false)
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

// 筛选条件
const searchForm = ref({
  status: '',
  keyword: ''
})

// 活动对话框
const activityDialogVisible = ref(false)
const activityDialogTitle = ref('')
const activityFormLoading = ref(false)
const editingActivityId = ref<number | null>(null)
const activityForm = ref({
  name: '',
  startTime: '',
  endTime: '',
  bannerImage: '',
  description: ''
})

// 商品配置对话框
const itemsDialogVisible = ref(false)
const currentActivity = ref<FlashSaleActivity | null>(null)
const activityItems = ref<FlashSaleItem[]>([])
const itemsLoading = ref(false)

// 添加商品对话框
const addItemDialogVisible = ref(false)
const availableProducts = ref<Product[]>([])
const selectedProducts = ref<number[]>([])
const productSearchKeyword = ref('')
const productsLoading = ref(false)

// 编辑商品对话框
const editItemDialogVisible = ref(false)
const editingItem = ref<FlashSaleItem | null>(null)
const editItemForm = ref({
  flashPrice: 0,
  flashStock: 0,
  limitPerUser: 0,
  sort: 0
})

// 活动列表列定义
const activityColumns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'name', title: '活动名称', minWidth: 200 },
  { colKey: 'time', title: '活动时间', width: 320, cell: 'time' },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'itemCount', title: '商品数', width: 100, cell: 'itemCount' },
  { colKey: 'totalSold', title: '已售', width: 100, cell: 'totalSold' },
  { colKey: 'action', title: '操作', width: 250, fixed: 'right', cell: 'action' }
]

// 秒杀商品列定义
const itemColumns: PrimaryTableCol[] = [
  { colKey: 'image', title: '商品图', width: 80, cell: 'image' },
  { colKey: 'name', title: '商品名称', minWidth: 200, cell: 'name' },
  { colKey: 'flashPrice', title: '秒杀价', width: 120, cell: 'flashPrice' },
  { colKey: 'originalPrice', title: '原价', width: 100, cell: 'originalPrice' },
  { colKey: 'flashStock', title: '秒杀库存', width: 100 },
  { colKey: 'soldCount', title: '已售', width: 80 },
  { colKey: 'limitPerUser', title: '限购', width: 80, cell: 'limitPerUser' },
  { colKey: 'action', title: '操作', width: 150, fixed: 'right', cell: 'action' }
]

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: '草稿', value: 'DRAFT' },
  { label: '进行中', value: 'ACTIVE' },
  { label: '已结束', value: 'ENDED' }
]

// 计算活动状态标签
const getStatusInfo = (activity: FlashSaleActivity) => {
  const now = new Date()
  const start = new Date(activity.startTime)
  const end = new Date(activity.endTime)

  if (activity.status === 'DRAFT') {
    return { label: '草稿', theme: 'default' as const }
  }
  if (activity.status === 'ENDED' || now > end) {
    return { label: '已结束', theme: 'danger' as const }
  }
  if (activity.status === 'ACTIVE') {
    if (now < start) {
      return { label: '未开始', theme: 'warning' as const }
    }
    return { label: '进行中', theme: 'success' as const }
  }
  return { label: '未知', theme: 'default' as const }
}

// 加载活动列表
const loadActivities = async () => {
  loading.value = true
  try {
    const res = await request.get('/admin/flash-sale/activities', {
      params: {
        page: pagination.value.current,
        pageSize: pagination.value.pageSize,
        status: searchForm.value.status,
        keyword: searchForm.value.keyword
      }
    })
    if (res.data) {
      activities.value = res.data.list || []
      pagination.value.total = res.data.total || 0
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// 分页变化
const onPageChange = (pageInfo: PageInfo) => {
  pagination.value.current = pageInfo.current
  pagination.value.pageSize = pageInfo.pageSize
  loadActivities()
}

// 搜索
const onSearch = () => {
  pagination.value.current = 1
  loadActivities()
}

// 重置
const onReset = () => {
  searchForm.value = { status: '', keyword: '' }
  pagination.value.current = 1
  loadActivities()
}

// 新建活动
const handleCreateActivity = () => {
  activityDialogTitle.value = '新建秒杀活动'
  editingActivityId.value = null
  activityForm.value = {
    name: '',
    startTime: '',
    endTime: '',
    bannerImage: '',
    description: ''
  }
  activityDialogVisible.value = true
}

// 编辑活动
const handleEditActivity = (activity: FlashSaleActivity) => {
  activityDialogTitle.value = '编辑秒杀活动'
  editingActivityId.value = activity.id
  activityForm.value = {
    name: activity.name,
    startTime: activity.startTime,
    endTime: activity.endTime,
    bannerImage: activity.bannerImage || '',
    description: activity.description || ''
  }
  activityDialogVisible.value = true
}

// 提交活动表单
const submitActivityForm = async () => {
  if (!activityForm.value.name.trim()) {
    MessagePlugin.warning('请输入活动名称')
    return
  }
  if (!activityForm.value.startTime || !activityForm.value.endTime) {
    MessagePlugin.warning('请选择活动时间')
    return
  }

  activityFormLoading.value = true
  try {
    if (editingActivityId.value) {
      await request.put(`/admin/flash-sale/activities/${editingActivityId.value}`, activityForm.value)
      MessagePlugin.success('更新成功')
    } else {
      await request.post('/admin/flash-sale/activities', activityForm.value)
      MessagePlugin.success('创建成功')
    }
    activityDialogVisible.value = false
    loadActivities()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  } finally {
    activityFormLoading.value = false
  }
}

// 删除活动
const handleDeleteActivity = (activity: FlashSaleActivity) => {
  const confirmDia = DialogPlugin.confirm({
    header: '确认删除',
    body: `确定要删除活动【${activity.name}】吗？`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        await request.delete(`/admin/flash-sale/activities/${activity.id}`)
        MessagePlugin.success('删除成功')
        loadActivities()
        confirmDia.hide()
      } catch (error: any) {
        MessagePlugin.error(error.message || '删除失败')
      }
    }
  })
}

// 切换活动状态
const handleToggleStatus = async (activity: FlashSaleActivity, newStatus: string) => {
  const statusText = newStatus === 'ACTIVE' ? '启用' : newStatus === 'ENDED' ? '结束' : '暂停'
  try {
    await request.put(`/admin/flash-sale/activities/${activity.id}/status`, { status: newStatus })
    MessagePlugin.success(`${statusText}成功`)
    loadActivities()
  } catch (error: any) {
    MessagePlugin.error(error.message || `${statusText}失败`)
  }
}

// 配置商品
const handleConfigItems = async (activity: FlashSaleActivity) => {
  currentActivity.value = activity
  itemsDialogVisible.value = true
  await loadActivityItems(activity.id)
}

// 加载活动商品
const loadActivityItems = async (activityId: number) => {
  itemsLoading.value = true
  try {
    const res = await request.get(`/admin/flash-sale/activities/${activityId}`)
    if (res.data) {
      // 转换后端扁平化数据为前端期望的嵌套格式
      activityItems.value = (res.data.items || []).map((item: any) => ({
        ...item,
        product: {
          id: item.productId,
          name: item.productName || '',
          images: item.productImage || '',
          retailPrice: item.originalPrice || 0,
          supplyPrice: 0,
          stock: item.mainStock || 0,
          lockStock: 0,
          unit: ''
        }
      }))
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '加载商品失败')
  } finally {
    itemsLoading.value = false
  }
}

// 打开添加商品对话框
const handleOpenAddItem = async () => {
  addItemDialogVisible.value = true
  selectedProducts.value = []
  productSearchKeyword.value = ''
  await loadAvailableProducts()
}

// 加载可选商品
const loadAvailableProducts = async () => {
  productsLoading.value = true
  try {
    const res = await request.get('/admin/products', {
      params: {
        page: 1,
        pageSize: 100,
        status: 'ACTIVE',
        keyword: productSearchKeyword.value
      }
    })
    if (res.data) {
      // 过滤掉已添加的商品
      const existingIds = activityItems.value.map(item => item.productId)
      availableProducts.value = (res.data.list || []).filter(
        (p: Product) => !existingIds.includes(p.id)
      )
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '加载商品失败')
  } finally {
    productsLoading.value = false
  }
}

// 添加商品
const handleAddItems = async () => {
  if (selectedProducts.value.length === 0) {
    MessagePlugin.warning('请选择要添加的商品')
    return
  }

  const items = selectedProducts.value.map(productId => {
    const product = availableProducts.value.find(p => p.id === productId)
    return {
      productId,
      flashPrice: product ? Number(product.retailPrice) * 0.8 : 0, // 默认8折
      flashStock: 100, // 默认库存
      limitPerUser: 0,
      sort: 0
    }
  })

  try {
    await request.post(`/admin/flash-sale/activities/${currentActivity.value?.id}/items`, { items })
    MessagePlugin.success('添加成功')
    addItemDialogVisible.value = false
    await loadActivityItems(currentActivity.value!.id)
    loadActivities() // 刷新列表以更新商品数
  } catch (error: any) {
    MessagePlugin.error(error.message || '添加失败')
  }
}

// 编辑商品配置
const handleEditItem = (item: FlashSaleItem) => {
  editingItem.value = item
  editItemForm.value = {
    flashPrice: Number(item.flashPrice),
    flashStock: item.flashStock,
    limitPerUser: item.limitPerUser,
    sort: item.sort
  }
  editItemDialogVisible.value = true
}

// 提交商品配置
const submitItemForm = async () => {
  if (editItemForm.value.flashPrice <= 0) {
    MessagePlugin.warning('秒杀价必须大于0')
    return
  }
  if (editItemForm.value.flashStock < 0) {
    MessagePlugin.warning('库存不能为负数')
    return
  }

  try {
    await request.put(
      `/admin/flash-sale/activities/${currentActivity.value?.id}/items/${editingItem.value?.id}`,
      editItemForm.value
    )
    MessagePlugin.success('更新成功')
    editItemDialogVisible.value = false
    await loadActivityItems(currentActivity.value!.id)
  } catch (error: any) {
    MessagePlugin.error(error.message || '更新失败')
  }
}

// 移除商品
const handleRemoveItem = (item: FlashSaleItem) => {
  const confirmDia = DialogPlugin.confirm({
    header: '确认移除',
    body: `确定要移除【${item.product.name}】吗？`,
    confirmBtn: '移除',
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        await request.delete(
          `/admin/flash-sale/activities/${currentActivity.value?.id}/items/${item.id}`
        )
        MessagePlugin.success('移除成功')
        await loadActivityItems(currentActivity.value!.id)
        loadActivities()
        confirmDia.hide()
      } catch (error: any) {
        MessagePlugin.error(error.message || '移除失败')
      }
    }
  })
}

// 获取商品图片
const getProductImage = (images: string) => {
  if (!images) return ''
  try {
    const arr = JSON.parse(images)
    return Array.isArray(arr) && arr.length > 0 ? arr[0] : images
  } catch {
    return images
  }
}

// 格式化金额
const formatAmount = (val: number | string) => {
  return `¥${Number(val).toFixed(2)}`
}

// 格式化时间
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

onMounted(() => {
  loadActivities()
})
</script>

<template>
  <div class="page-container">
    <!-- 页面说明 -->
    <t-card class="info-card" :bordered="false">
      <div class="info-content">
        <div class="info-icon">⚡</div>
        <div class="info-text">
          <h3>限时秒杀活动管理</h3>
          <p>创建秒杀活动，设置活动时间，配置秒杀商品和价格。<strong>同一时间只能有一个进行中的活动。</strong></p>
        </div>
      </div>
    </t-card>

    <!-- 搜索栏 -->
    <t-card class="search-card" :bordered="false">
      <t-form :data="searchForm" layout="inline">
        <t-form-item label="活动状态" name="status">
          <t-select
            v-model="searchForm.status"
            :options="statusOptions"
            placeholder="请选择"
            style="width: 150px"
            clearable
          />
        </t-form-item>
        <t-form-item label="活动名称" name="keyword">
          <t-input
            v-model="searchForm.keyword"
            placeholder="请输入关键词"
            style="width: 200px"
            clearable
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" @click="onSearch">查询</t-button>
          <t-button theme="default" @click="onReset">重置</t-button>
          <t-button theme="success" @click="handleCreateActivity">
            <template #icon><t-icon name="add" /></template>
            新建活动
          </t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <!-- 活动列表 -->
    <t-card class="table-card" :bordered="false">
      <t-table
        :data="activities"
        :columns="activityColumns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="onPageChange"
      >
        <template #empty>
          <EmptyState
            :type="searchForm.status || searchForm.keyword ? 'search' : 'data'"
            :title="searchForm.status || searchForm.keyword ? '未找到匹配结果' : '暂无秒杀活动'"
            :description="searchForm.status || searchForm.keyword ? '请尝试调整筛选条件' : '点击上方按钮创建新活动'"
          />
        </template>

        <!-- 活动时间 -->
        <template #time="{ row }">
          <div class="time-cell">
            <div class="time-item">
              <span class="time-label">开始：</span>
              <span>{{ formatDateTime(row.startTime) }}</span>
            </div>
            <div class="time-item">
              <span class="time-label">结束：</span>
              <span>{{ formatDateTime(row.endTime) }}</span>
            </div>
          </div>
        </template>

        <!-- 状态 -->
        <template #status="{ row }">
          <t-tag :theme="getStatusInfo(row).theme">{{ getStatusInfo(row).label }}</t-tag>
        </template>

        <!-- 商品数 -->
        <template #itemCount="{ row }">
          <t-tag theme="primary" variant="light">{{ row.itemCount }}件</t-tag>
        </template>

        <!-- 已售 -->
        <template #totalSold="{ row }">
          <span class="sold-text">{{ row.totalSold }}</span>
        </template>

        <!-- 操作 -->
        <template #action="{ row }">
          <t-space>
            <t-link theme="primary" @click="handleConfigItems(row)">配置商品</t-link>
            <t-link theme="primary" @click="handleEditActivity(row)">编辑</t-link>
            <template v-if="row.status === 'DRAFT'">
              <t-link theme="success" @click="handleToggleStatus(row, 'ACTIVE')">启用</t-link>
            </template>
            <template v-else-if="row.status === 'ACTIVE'">
              <t-link theme="warning" @click="handleToggleStatus(row, 'ENDED')">结束</t-link>
            </template>
            <t-link
              v-if="row.status !== 'ACTIVE' || row.totalSold === 0"
              theme="danger"
              @click="handleDeleteActivity(row)"
            >删除</t-link>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 活动对话框 -->
    <t-dialog
      v-model:visible="activityDialogVisible"
      :header="activityDialogTitle"
      width="600px"
      :confirm-btn="{ content: '保存', loading: activityFormLoading }"
      :on-confirm="submitActivityForm"
    >
      <t-form :data="activityForm" label-width="100px">
        <t-form-item label="活动名称" name="name" required>
          <t-input
            v-model="activityForm.name"
            placeholder="例如：春节秒杀专场"
            maxlength="100"
          />
        </t-form-item>
        <t-form-item label="开始时间" name="startTime" required>
          <t-date-picker
            v-model="activityForm.startTime"
            mode="date"
            enable-time-picker
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择开始时间"
            style="width: 100%"
          />
        </t-form-item>
        <t-form-item label="结束时间" name="endTime" required>
          <t-date-picker
            v-model="activityForm.endTime"
            mode="date"
            enable-time-picker
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择结束时间"
            style="width: 100%"
          />
        </t-form-item>
        <t-form-item label="活动描述" name="description">
          <t-textarea
            v-model="activityForm.description"
            placeholder="活动描述（可选）"
            :maxlength="500"
            :autosize="{ minRows: 3 }"
          />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 商品配置对话框 -->
    <t-dialog
      v-model:visible="itemsDialogVisible"
      :header="`配置秒杀商品 - ${currentActivity?.name || ''}`"
      width="1000px"
      :footer="false"
    >
      <div class="items-dialog-content">
        <div class="items-toolbar">
          <t-button theme="primary" @click="handleOpenAddItem">
            <template #icon><t-icon name="add" /></template>
            添加商品
          </t-button>
          <span class="items-count">共 {{ activityItems.length }} 件商品</span>
        </div>

        <t-table
          :data="activityItems"
          :columns="itemColumns"
          :loading="itemsLoading"
          row-key="id"
          max-height="400px"
        >
          <template #empty>
            <EmptyState
              type="data"
              title="暂无秒杀商品"
              description="点击上方按钮添加商品"
            />
          </template>

          <!-- 商品图 -->
          <template #image="{ row }">
            <img
              :src="getProductImage(row.product.images)"
              class="product-img"
              @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
            />
          </template>

          <!-- 商品名称 -->
          <template #name="{ row }">
            <div>
              <div>{{ row.product.name }}</div>
              <t-tag v-if="row.product.category" size="small" variant="light">
                {{ row.product.category.name }}
              </t-tag>
            </div>
          </template>

          <!-- 秒杀价 -->
          <template #flashPrice="{ row }">
            <span class="flash-price">{{ formatAmount(row.flashPrice) }}</span>
          </template>

          <!-- 原价 -->
          <template #originalPrice="{ row }">
            <span class="original-price">{{ formatAmount(row.product.retailPrice) }}</span>
          </template>

          <!-- 限购 -->
          <template #limitPerUser="{ row }">
            {{ row.limitPerUser > 0 ? `${row.limitPerUser}件` : '不限' }}
          </template>

          <!-- 操作 -->
          <template #action="{ row }">
            <t-space>
              <t-link theme="primary" @click="handleEditItem(row)">编辑</t-link>
              <t-link theme="danger" @click="handleRemoveItem(row)">移除</t-link>
            </t-space>
          </template>
        </t-table>
      </div>
    </t-dialog>

    <!-- 添加商品对话框 -->
    <t-dialog
      v-model:visible="addItemDialogVisible"
      header="添加秒杀商品"
      width="800px"
      :confirm-btn="{ content: '添加', disabled: selectedProducts.length === 0 }"
      :on-confirm="handleAddItems"
    >
      <div class="add-item-content">
        <t-input
          v-model="productSearchKeyword"
          placeholder="搜索商品名称"
          style="width: 300px; margin-bottom: 16px"
          clearable
          @change="loadAvailableProducts"
        >
          <template #prefix-icon><t-icon name="search" /></template>
        </t-input>

        <t-checkbox-group v-model="selectedProducts" class="product-list">
          <t-loading :loading="productsLoading">
            <div v-if="availableProducts.length === 0" class="no-products">
              暂无可添加的商品
            </div>
            <div v-else class="product-grid">
              <div
                v-for="product in availableProducts"
                :key="product.id"
                class="product-item"
                :class="{ selected: selectedProducts.includes(product.id) }"
              >
                <t-checkbox :value="product.id" class="product-checkbox">
                  <div class="product-info">
                    <img :src="getProductImage(product.images)" class="product-thumb" />
                    <div class="product-detail">
                      <div class="product-name">{{ product.name }}</div>
                      <div class="product-price">{{ formatAmount(product.retailPrice) }}</div>
                    </div>
                  </div>
                </t-checkbox>
              </div>
            </div>
          </t-loading>
        </t-checkbox-group>

        <div v-if="selectedProducts.length > 0" class="selected-count">
          已选择 {{ selectedProducts.length }} 件商品
        </div>
      </div>
    </t-dialog>

    <!-- 编辑商品对话框 -->
    <t-dialog
      v-model:visible="editItemDialogVisible"
      header="编辑秒杀配置"
      width="500px"
      :confirm-btn="{ content: '保存' }"
      :on-confirm="submitItemForm"
    >
      <div v-if="editingItem" class="edit-item-content">
        <div class="edit-item-product">
          <img :src="getProductImage(editingItem.product.images)" class="product-thumb" />
          <div class="product-info">
            <div class="product-name">{{ editingItem.product.name }}</div>
            <div class="product-price">
              原价：<span class="original">{{ formatAmount(editingItem.product.retailPrice) }}</span>
            </div>
          </div>
        </div>

        <t-form :data="editItemForm" label-width="100px">
          <t-form-item label="秒杀价" name="flashPrice" required>
            <t-input-number
              v-model="editItemForm.flashPrice"
              :min="0.01"
              :max="99999"
              :decimal-places="2"
              suffix="元"
              placeholder="设置秒杀价格"
            />
          </t-form-item>
          <t-form-item label="秒杀库存" name="flashStock" required>
            <t-input-number
              v-model="editItemForm.flashStock"
              :min="0"
              :max="99999"
              :decimal-places="0"
              suffix="件"
              placeholder="设置秒杀库存"
            />
            <div class="form-tip">主库存：{{ editingItem.product.stock - editingItem.product.lockStock }}件</div>
          </t-form-item>
          <t-form-item label="每人限购" name="limitPerUser">
            <t-input-number
              v-model="editItemForm.limitPerUser"
              :min="0"
              :max="999"
              :decimal-places="0"
              suffix="件"
              placeholder="0表示不限"
            />
            <div class="form-tip">0表示不限购</div>
          </t-form-item>
          <t-form-item label="排序" name="sort">
            <t-input-number
              v-model="editItemForm.sort"
              :min="0"
              :max="9999"
              placeholder="越小越靠前"
            />
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>
  </div>
</template>

<style scoped lang="less">
.page-container {
  padding: 20px;
}

.info-card {
  margin-bottom: 20px;
  background: linear-gradient(135deg, #fff1f0 0%, #ffece8 100%);
}

.info-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.info-icon {
  font-size: 32px;
}

.info-text {
  h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #cf1322;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #666;

    strong {
      color: #cf1322;
    }
  }
}

.search-card {
  margin-bottom: 20px;
}

.table-card {
  .time-cell {
    .time-item {
      line-height: 1.8;
    }
    .time-label {
      color: #999;
      font-size: 12px;
    }
  }

  .sold-text {
    color: #f40;
    font-weight: 600;
  }
}

.items-dialog-content {
  .items-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;

    .items-count {
      color: #999;
      font-size: 14px;
    }
  }

  .product-img {
    width: 50px;
    height: 50px;
    object-fit: cover;
    border-radius: 4px;
    background: #f5f5f5;
  }

  .flash-price {
    color: #f40;
    font-weight: 600;
    font-size: 16px;
  }

  .original-price {
    color: #999;
    text-decoration: line-through;
  }
}

.add-item-content {
  .product-list {
    width: 100%;
  }

  .no-products {
    text-align: center;
    color: #999;
    padding: 40px;
  }

  .product-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    max-height: 400px;
    overflow-y: auto;
  }

  .product-item {
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: #0052d9;
    }

    &.selected {
      border-color: #0052d9;
      background: #f0f5ff;
    }
  }

  .product-checkbox {
    width: 100%;
  }

  .product-info {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .product-thumb {
    width: 48px;
    height: 48px;
    object-fit: cover;
    border-radius: 4px;
    background: #f5f5f5;
  }

  .product-detail {
    flex: 1;
    min-width: 0;
  }

  .product-name {
    font-size: 14px;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .product-price {
    font-size: 14px;
    color: #f40;
    font-weight: 600;
    margin-top: 4px;
  }

  .selected-count {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e5e5e5;
    color: #0052d9;
    font-weight: 500;
  }
}

.edit-item-content {
  .edit-item-product {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: #f9f9f9;
    border-radius: 8px;
    margin-bottom: 20px;

    .product-thumb {
      width: 64px;
      height: 64px;
      object-fit: cover;
      border-radius: 4px;
    }

    .product-info {
      .product-name {
        font-size: 15px;
        font-weight: 500;
        color: #333;
        margin-bottom: 8px;
      }

      .product-price {
        font-size: 14px;
        color: #666;

        .original {
          color: #999;
          text-decoration: line-through;
        }
      }
    }
  }

  .form-tip {
    margin-top: 4px;
    font-size: 12px;
    color: var(--td-text-color-placeholder);
  }
}
</style>
