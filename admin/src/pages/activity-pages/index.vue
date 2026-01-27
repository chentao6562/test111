<script setup lang="ts">
/**
 * 活动专题页管理页面
 * 【2026-01-19 活动系统增强】
 * 创建和管理可配置的营销专题页
 */
import { ref, onMounted, computed } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { PrimaryTableCol, PageInfo } from 'tdesign-vue-next'
import request from '@/api/request'
import { EmptyState } from '@/components'

// 专题页类型
interface ActivityPage {
  id: number
  name: string
  slug: string
  bannerImage?: string
  description?: string
  startTime?: string
  endTime?: string
  status: string
  layout: string
  sectionCount: number
  createdAt: string
  sections?: Section[]
}

// 区块类型
interface Section {
  id: number
  title?: string
  type: string
  content?: string
  sort: number
  products?: Product[]
}

// 商品类型
interface Product {
  id: number
  name: string
  images: string
  retailPrice: number
  stock: number
  lockStock: number
}

// 专题页列表数据
const pages = ref<ActivityPage[]>([])
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

// 专题页对话框
const pageDialogVisible = ref(false)
const pageDialogTitle = ref('')
const pageFormLoading = ref(false)
const editingPageId = ref<number | null>(null)
const pageForm = ref({
  name: '',
  slug: '',
  bannerImage: '',
  description: '',
  startTime: '',
  endTime: '',
  layout: 'GRID'
})

// 区块配置对话框
const sectionDialogVisible = ref(false)
const currentPage = ref<ActivityPage | null>(null)
const sectionsLoading = ref(false)

// 添加商品对话框
const addProductDialogVisible = ref(false)
const editingSectionId = ref<number | null>(null)
const availableProducts = ref<Product[]>([])
const selectedProducts = ref<number[]>([])
const productSearchKeyword = ref('')
const productsLoading = ref(false)

// 专题页列表列定义
const pageColumns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'name', title: '专题名称', minWidth: 150 },
  { colKey: 'slug', title: 'URL标识', width: 150, cell: 'slug' },
  { colKey: 'time', title: '活动时间', width: 280, cell: 'time' },
  { colKey: 'sectionCount', title: '区块数', width: 80, cell: 'sectionCount' },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'action', title: '操作', width: 250, fixed: 'right', cell: 'action' }
]

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: '草稿', value: 'DRAFT' },
  { label: '已启用', value: 'ACTIVE' },
  { label: '已停用', value: 'INACTIVE' }
]

// 布局选项
const layoutOptions = [
  { label: '网格布局', value: 'GRID' },
  { label: '列表布局', value: 'LIST' }
]

// 计算状态标签
const getStatusInfo = (page: ActivityPage) => {
  const now = new Date()
  const start = page.startTime ? new Date(page.startTime) : null
  const end = page.endTime ? new Date(page.endTime) : null

  if (page.status === 'DRAFT') {
    return { label: '草稿', theme: 'default' as const }
  }
  if (page.status === 'INACTIVE') {
    return { label: '已停用', theme: 'danger' as const }
  }
  if (page.status === 'ACTIVE') {
    if (start && now < start) {
      return { label: '未开始', theme: 'warning' as const }
    }
    if (end && now > end) {
      return { label: '已结束', theme: 'danger' as const }
    }
    return { label: '进行中', theme: 'success' as const }
  }
  return { label: '未知', theme: 'default' as const }
}

// 加载专题页列表
const loadPages = async () => {
  loading.value = true
  try {
    const res = await request.get('/admin/activity-pages', {
      params: {
        page: pagination.value.current,
        pageSize: pagination.value.pageSize,
        status: searchForm.value.status,
        keyword: searchForm.value.keyword
      }
    })
    if (res.data) {
      pages.value = res.data.list || []
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
  loadPages()
}

// 搜索
const onSearch = () => {
  pagination.value.current = 1
  loadPages()
}

// 重置
const onReset = () => {
  searchForm.value = { status: '', keyword: '' }
  pagination.value.current = 1
  loadPages()
}

// 新建专题页
const handleCreatePage = () => {
  pageDialogTitle.value = '新建活动专题页'
  editingPageId.value = null
  pageForm.value = {
    name: '',
    slug: '',
    bannerImage: '',
    description: '',
    startTime: '',
    endTime: '',
    layout: 'GRID'
  }
  pageDialogVisible.value = true
}

// 编辑专题页
const handleEditPage = (page: ActivityPage) => {
  pageDialogTitle.value = '编辑活动专题页'
  editingPageId.value = page.id
  pageForm.value = {
    name: page.name,
    slug: page.slug,
    bannerImage: page.bannerImage || '',
    description: page.description || '',
    startTime: page.startTime || '',
    endTime: page.endTime || '',
    layout: page.layout || 'GRID'
  }
  pageDialogVisible.value = true
}

// 提交专题页表单
const submitPageForm = async () => {
  if (!pageForm.value.name.trim()) {
    MessagePlugin.warning('请输入专题名称')
    return
  }
  if (!pageForm.value.slug.trim()) {
    MessagePlugin.warning('请输入URL标识')
    return
  }
  if (!/^[a-z0-9-]+$/.test(pageForm.value.slug)) {
    MessagePlugin.warning('URL标识只能包含小写字母、数字和连字符')
    return
  }

  pageFormLoading.value = true
  try {
    if (editingPageId.value) {
      await request.put(`/admin/activity-pages/${editingPageId.value}`, pageForm.value)
      MessagePlugin.success('更新成功')
    } else {
      await request.post('/admin/activity-pages', pageForm.value)
      MessagePlugin.success('创建成功')
    }
    pageDialogVisible.value = false
    loadPages()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  } finally {
    pageFormLoading.value = false
  }
}

// 删除专题页
const handleDeletePage = (page: ActivityPage) => {
  const confirmDia = DialogPlugin.confirm({
    header: '确认删除',
    body: `确定要删除专题页【${page.name}】吗？`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        await request.delete(`/admin/activity-pages/${page.id}`)
        MessagePlugin.success('删除成功')
        loadPages()
        confirmDia.hide()
      } catch (error: any) {
        MessagePlugin.error(error.message || '删除失败')
      }
    }
  })
}

// 切换专题页状态
const handleToggleStatus = async (page: ActivityPage, newStatus: string) => {
  const statusText = newStatus === 'ACTIVE' ? '启用' : '停用'
  try {
    await request.put(`/admin/activity-pages/${page.id}/status`, { status: newStatus })
    MessagePlugin.success(`${statusText}成功`)
    loadPages()
  } catch (error: any) {
    MessagePlugin.error(error.message || `${statusText}失败`)
  }
}

// 配置区块
const handleConfigSections = async (page: ActivityPage) => {
  currentPage.value = page
  sectionDialogVisible.value = true
  await loadPageDetail(page.id)
}

// 加载专题页详情
const loadPageDetail = async (id: number) => {
  sectionsLoading.value = true
  try {
    const res = await request.get(`/admin/activity-pages/${id}`)
    if (res.data && currentPage.value) {
      currentPage.value.sections = res.data.sections || []
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '加载区块失败')
  } finally {
    sectionsLoading.value = false
  }
}

// 添加区块
const handleAddSection = async () => {
  if (!currentPage.value) return
  try {
    await request.post(`/admin/activity-pages/${currentPage.value.id}/sections`, {
      title: '新商品区块',
      type: 'PRODUCTS',
      content: '[]',
      sort: (currentPage.value.sections?.length || 0) + 1
    })
    MessagePlugin.success('添加成功')
    await loadPageDetail(currentPage.value.id)
    loadPages()
  } catch (error: any) {
    MessagePlugin.error(error.message || '添加失败')
  }
}

// 删除区块
const handleDeleteSection = (section: Section) => {
  if (!currentPage.value) return
  const confirmDia = DialogPlugin.confirm({
    header: '确认删除',
    body: `确定要删除区块【${section.title || '未命名'}】吗？`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        await request.delete(`/admin/activity-pages/${currentPage.value!.id}/sections/${section.id}`)
        MessagePlugin.success('删除成功')
        await loadPageDetail(currentPage.value!.id)
        loadPages()
        confirmDia.hide()
      } catch (error: any) {
        MessagePlugin.error(error.message || '删除失败')
      }
    }
  })
}

// 配置商品
const handleConfigProducts = (section: Section) => {
  editingSectionId.value = section.id
  const productIds = section.content ? JSON.parse(section.content) : []
  selectedProducts.value = productIds
  addProductDialogVisible.value = true
  loadAvailableProducts()
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
      availableProducts.value = res.data.list || []
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '加载商品失败')
  } finally {
    productsLoading.value = false
  }
}

// 保存商品配置
const handleSaveProducts = async () => {
  if (!currentPage.value || !editingSectionId.value) return
  try {
    await request.put(
      `/admin/activity-pages/${currentPage.value.id}/sections/${editingSectionId.value}`,
      { content: JSON.stringify(selectedProducts.value) }
    )
    MessagePlugin.success('保存成功')
    addProductDialogVisible.value = false
    await loadPageDetail(currentPage.value.id)
  } catch (error: any) {
    MessagePlugin.error(error.message || '保存失败')
  }
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

// 预览链接
const getPreviewUrl = (slug: string) => {
  return `http://39.104.58.26/activity/${slug}`
}

// 复制链接
const copyLink = async (slug: string) => {
  const url = getPreviewUrl(slug)
  try {
    await navigator.clipboard.writeText(url)
    MessagePlugin.success('链接已复制')
  } catch {
    MessagePlugin.error('复制失败')
  }
}

onMounted(() => {
  loadPages()
})
</script>

<template>
  <div class="page-container">
    <!-- 页面说明 -->
    <t-card class="info-card" :bordered="false">
      <div class="info-content">
        <div class="info-icon">📄</div>
        <div class="info-text">
          <h3>活动专题页管理</h3>
          <p>创建营销专题页，配置商品区块，生成可分享的专题页链接。<strong>访问地址：/activity/{URL标识}</strong></p>
        </div>
      </div>
    </t-card>

    <!-- 搜索栏 -->
    <t-card class="search-card" :bordered="false">
      <t-form :data="searchForm" layout="inline">
        <t-form-item label="状态" name="status">
          <t-select
            v-model="searchForm.status"
            :options="statusOptions"
            placeholder="请选择"
            style="width: 150px"
            clearable
          />
        </t-form-item>
        <t-form-item label="搜索" name="keyword">
          <t-input
            v-model="searchForm.keyword"
            placeholder="名称/URL标识"
            style="width: 200px"
            clearable
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" @click="onSearch">查询</t-button>
          <t-button theme="default" @click="onReset">重置</t-button>
          <t-button theme="success" @click="handleCreatePage">
            <template #icon><t-icon name="add" /></template>
            新建专题页
          </t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <!-- 专题页列表 -->
    <t-card class="table-card" :bordered="false">
      <t-table
        :data="pages"
        :columns="pageColumns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="onPageChange"
      >
        <template #empty>
          <EmptyState
            :type="searchForm.status || searchForm.keyword ? 'search' : 'data'"
            :title="searchForm.status || searchForm.keyword ? '未找到匹配结果' : '暂无专题页'"
            :description="searchForm.status || searchForm.keyword ? '请尝试调整筛选条件' : '点击上方按钮创建新专题页'"
          />
        </template>

        <!-- URL标识 -->
        <template #slug="{ row }">
          <div class="slug-cell">
            <code>/activity/{{ row.slug }}</code>
            <t-icon name="file-copy" class="copy-icon" @click="copyLink(row.slug)" />
          </div>
        </template>

        <!-- 活动时间 -->
        <template #time="{ row }">
          <div class="time-cell" v-if="row.startTime || row.endTime">
            <div class="time-item" v-if="row.startTime">
              <span class="time-label">开始：</span>
              <span>{{ formatDateTime(row.startTime) }}</span>
            </div>
            <div class="time-item" v-if="row.endTime">
              <span class="time-label">结束：</span>
              <span>{{ formatDateTime(row.endTime) }}</span>
            </div>
          </div>
          <span v-else class="no-limit">不限时间</span>
        </template>

        <!-- 区块数 -->
        <template #sectionCount="{ row }">
          <t-tag theme="primary" variant="light">{{ row.sectionCount }}个</t-tag>
        </template>

        <!-- 状态 -->
        <template #status="{ row }">
          <t-tag :theme="getStatusInfo(row).theme">{{ getStatusInfo(row).label }}</t-tag>
        </template>

        <!-- 操作 -->
        <template #action="{ row }">
          <t-space>
            <t-link theme="primary" @click="handleConfigSections(row)">配置区块</t-link>
            <t-link theme="primary" @click="handleEditPage(row)">编辑</t-link>
            <template v-if="row.status === 'DRAFT' || row.status === 'INACTIVE'">
              <t-link theme="success" @click="handleToggleStatus(row, 'ACTIVE')">启用</t-link>
            </template>
            <template v-else-if="row.status === 'ACTIVE'">
              <t-link theme="warning" @click="handleToggleStatus(row, 'INACTIVE')">停用</t-link>
            </template>
            <t-link
              v-if="row.status !== 'ACTIVE'"
              theme="danger"
              @click="handleDeletePage(row)"
            >删除</t-link>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 专题页对话框 -->
    <t-dialog
      v-model:visible="pageDialogVisible"
      :header="pageDialogTitle"
      width="600px"
      :confirm-btn="{ content: '保存', loading: pageFormLoading }"
      :on-confirm="submitPageForm"
    >
      <t-form :data="pageForm" label-width="100px">
        <t-form-item label="专题名称" name="name" required>
          <t-input
            v-model="pageForm.name"
            placeholder="例如：春节特惠专场"
            maxlength="100"
          />
        </t-form-item>
        <t-form-item label="URL标识" name="slug" required>
          <t-input
            v-model="pageForm.slug"
            placeholder="例如：spring-sale"
            maxlength="50"
          />
          <div class="form-tip">只能包含小写字母、数字和连字符，将作为访问路径使用</div>
        </t-form-item>
        <t-form-item label="布局方式" name="layout">
          <t-radio-group v-model="pageForm.layout">
            <t-radio v-for="opt in layoutOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="开始时间" name="startTime">
          <t-date-picker
            v-model="pageForm.startTime"
            mode="date"
            enable-time-picker
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择（可选）"
            style="width: 100%"
            clearable
          />
        </t-form-item>
        <t-form-item label="结束时间" name="endTime">
          <t-date-picker
            v-model="pageForm.endTime"
            mode="date"
            enable-time-picker
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择（可选）"
            style="width: 100%"
            clearable
          />
        </t-form-item>
        <t-form-item label="描述" name="description">
          <t-textarea
            v-model="pageForm.description"
            placeholder="专题页描述（可选）"
            :maxlength="500"
            :autosize="{ minRows: 2 }"
          />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 区块配置对话框 -->
    <t-dialog
      v-model:visible="sectionDialogVisible"
      :header="`配置区块 - ${currentPage?.name || ''}`"
      width="900px"
      :footer="false"
    >
      <div class="sections-dialog">
        <div class="sections-toolbar">
          <t-button theme="primary" @click="handleAddSection">
            <template #icon><t-icon name="add" /></template>
            添加商品区块
          </t-button>
          <span class="sections-count">共 {{ currentPage?.sections?.length || 0 }} 个区块</span>
        </div>

        <t-loading :loading="sectionsLoading">
          <div v-if="!currentPage?.sections?.length" class="sections-empty">
            <t-icon name="layers" size="48px" style="color: #ccc" />
            <p>暂无区块，点击上方按钮添加</p>
          </div>

          <div v-else class="sections-list">
            <div v-for="section in currentPage?.sections" :key="section.id" class="section-card">
              <div class="section-header">
                <span class="section-title">{{ section.title || '未命名区块' }}</span>
                <div class="section-actions">
                  <t-button theme="primary" size="small" @click="handleConfigProducts(section)">
                    配置商品
                  </t-button>
                  <t-button theme="danger" variant="text" size="small" @click="handleDeleteSection(section)">
                    删除
                  </t-button>
                </div>
              </div>
              <div class="section-products">
                <div v-if="!section.products?.length" class="no-products">
                  暂未添加商品
                </div>
                <div v-else class="products-grid">
                  <div v-for="product in section.products.slice(0, 6)" :key="product.id" class="product-item">
                    <img :src="getProductImage(product.images)" class="product-img" />
                    <div class="product-name">{{ product.name }}</div>
                    <div class="product-price">{{ formatAmount(product.retailPrice) }}</div>
                  </div>
                  <div v-if="section.products.length > 6" class="more-count">
                    +{{ section.products.length - 6 }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </t-loading>
      </div>
    </t-dialog>

    <!-- 添加商品对话框 -->
    <t-dialog
      v-model:visible="addProductDialogVisible"
      header="选择商品"
      width="800px"
      :confirm-btn="{ content: '保存' }"
      :on-confirm="handleSaveProducts"
    >
      <div class="add-products-content">
        <t-input
          v-model="productSearchKeyword"
          placeholder="搜索商品名称"
          style="width: 300px; margin-bottom: 16px"
          clearable
          @change="loadAvailableProducts"
        >
          <template #prefix-icon><t-icon name="search" /></template>
        </t-input>

        <t-checkbox-group v-model="selectedProducts" class="products-list">
          <t-loading :loading="productsLoading">
            <div v-if="availableProducts.length === 0" class="no-data">
              暂无可添加的商品
            </div>
            <div v-else class="products-grid-select">
              <div
                v-for="product in availableProducts"
                :key="product.id"
                class="product-select-item"
                :class="{ selected: selectedProducts.includes(product.id) }"
              >
                <t-checkbox :value="product.id">
                  <div class="product-select-info">
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

        <div v-if="selectedProducts.length > 0" class="selected-info">
          已选择 {{ selectedProducts.length }} 件商品
        </div>
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
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
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
    color: #0050b3;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #666;

    strong {
      color: #0050b3;
    }
  }
}

.search-card {
  margin-bottom: 20px;
}

.table-card {
  .slug-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    code {
      background: #f5f5f5;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .copy-icon {
      color: #0052d9;
      cursor: pointer;
      &:hover {
        opacity: 0.7;
      }
    }
  }

  .time-cell {
    .time-item {
      line-height: 1.8;
    }
    .time-label {
      color: #999;
      font-size: 12px;
    }
  }

  .no-limit {
    color: #999;
    font-size: 13px;
  }
}

.form-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.sections-dialog {
  .sections-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;

    .sections-count {
      color: #999;
      font-size: 14px;
    }
  }

  .sections-empty {
    text-align: center;
    padding: 60px;
    color: #999;
  }

  .sections-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .section-card {
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 16px;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .section-title {
      font-weight: 500;
      color: #333;
    }
  }

  .no-products {
    text-align: center;
    color: #999;
    padding: 20px;
    background: #f9f9f9;
    border-radius: 4px;
  }

  .products-grid {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .product-item {
    width: 100px;
    text-align: center;

    .product-img {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 4px;
      background: #f5f5f5;
    }

    .product-name {
      font-size: 12px;
      color: #333;
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .product-price {
      font-size: 12px;
      color: #f40;
      font-weight: 500;
    }
  }

  .more-count {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
    border-radius: 4px;
    color: #999;
    font-size: 14px;
  }
}

.add-products-content {
  .products-list {
    width: 100%;
  }

  .no-data {
    text-align: center;
    color: #999;
    padding: 40px;
  }

  .products-grid-select {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    max-height: 400px;
    overflow-y: auto;
  }

  .product-select-item {
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 12px;
    cursor: pointer;

    &:hover {
      border-color: #0052d9;
    }

    &.selected {
      border-color: #0052d9;
      background: #f0f5ff;
    }
  }

  .product-select-info {
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
      font-weight: 500;
      margin-top: 4px;
    }
  }

  .selected-info {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e5e5e5;
    color: #0052d9;
    font-weight: 500;
  }
}
</style>
