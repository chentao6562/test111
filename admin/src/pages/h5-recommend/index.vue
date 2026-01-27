<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next'
import * as h5MaterialApi from '@/api/h5Material'
import type { RecommendProduct } from '@/api/h5Material'
import { EmptyState } from '@/components'
import { getProductList } from '@/api/product'

// 表格数据
const data = ref<RecommendProduct[]>([])
const loading = ref(false)
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
})

// 搜索条件
const searchForm = ref({
  type: '',
  status: ''
})

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formData = ref<h5MaterialApi.CreateRecommendProductRequest>({
  productId: 0,
  type: 'HOT',
  title: '',
  subtitle: '',
  badge: '',
  sort: 0,
  status: 'ACTIVE'
})
const editingId = ref<number | null>(null)

// 商品列表
const products = ref<any[]>([])

// 表格列定义
const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 80 },
  {
    colKey: 'product',
    title: '商品信息',
    minWidth: 250,
    cell: 'product'
  },
  {
    colKey: 'type',
    title: '推荐类型',
    width: 100,
    cell: 'type'
  },
  {
    colKey: 'title',
    title: '推荐标题',
    width: 150,
    ellipsis: true
  },
  {
    colKey: 'subtitle',
    title: '推荐副标题',
    width: 150,
    ellipsis: true
  },
  {
    colKey: 'badge',
    title: '角标文字',
    width: 100
  },
  { colKey: 'sort', title: '排序', width: 80 },
  {
    colKey: 'status',
    title: '状态',
    width: 100,
    cell: 'status'
  },
  {
    colKey: 'action',
    title: '操作',
    width: 180,
    fixed: 'right',
    cell: 'action'
  }
]

// 推荐类型选项
const typeOptions = [
  { label: '全部', value: '' },
  { label: '热销', value: 'HOT' },
  { label: '新品', value: 'NEW' },
  { label: '精选', value: 'FEATURED' }
]

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: 'ACTIVE' },
  { label: '禁用', value: 'INACTIVE' }
]

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res = await h5MaterialApi.getRecommendProducts({
      page: pagination.value.current,
      pageSize: pagination.value.pageSize,
      type: searchForm.value.type,
      status: searchForm.value.status
    })
    data.value = res.data.list
    pagination.value.total = res.data.total
  } catch (error: any) {
    MessagePlugin.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// 加载商品列表
const loadProducts = async () => {
  try {
    const res = await getProductList({ page: 1, pageSize: 200 })
    products.value = res.data.list.map((p: any) => ({
      label: `${p.name} (库存: ${p.stock}, 状态: ${p.status === 'ACTIVE' ? '上架' : '下架'})`,
      value: p.id
    }))
  } catch (error: any) {
    console.error('加载商品失败:', error)
  }
}

// 分页变化
const onPageChange = (pageInfo: PageInfo) => {
  pagination.value.current = pageInfo.current
  pagination.value.pageSize = pageInfo.pageSize
  loadData()
}

// 搜索
const onSearch = () => {
  pagination.value.current = 1
  loadData()
}

// 重置搜索
const onReset = () => {
  searchForm.value = {
    type: '',
    status: ''
  }
  pagination.value.current = 1
  loadData()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增推荐商品'
  editingId.value = null
  formData.value = {
    productId: 0,
    type: 'HOT',
    title: '',
    subtitle: '',
    badge: '',
    sort: 0,
    status: 'ACTIVE'
  }
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: RecommendProduct) => {
  dialogTitle.value = '编辑推荐商品'
  editingId.value = row.id
  formData.value = {
    productId: row.productId,
    type: row.type,
    title: row.title || '',
    subtitle: row.subtitle || '',
    badge: row.badge || '',
    sort: row.sort,
    status: row.status
  }
  dialogVisible.value = true
}

// 删除
const handleDelete = (row: RecommendProduct) => {
  const confirmDia = DialogPlugin.confirm({
    header: '确认删除',
    body: `确定要删除推荐"${row.product.name}"吗？`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        await h5MaterialApi.deleteRecommendProduct(row.id)
        MessagePlugin.success('删除成功')
        loadData()
        confirmDia.hide()
      } catch (error: any) {
        MessagePlugin.error(error.message || '删除失败')
      }
    }
  })
}

// 提交表单
const handleSubmit = async () => {
  if (!formData.value.productId) {
    MessagePlugin.warning('请选择商品')
    return
  }
  if (!formData.value.type) {
    MessagePlugin.warning('请选择推荐类型')
    return
  }

  formLoading.value = true
  try {
    if (editingId.value) {
      const { productId, type, ...updateData } = formData.value
      await h5MaterialApi.updateRecommendProduct(editingId.value, updateData)
      MessagePlugin.success('更新成功')
    } else {
      await h5MaterialApi.createRecommendProduct(formData.value)
      MessagePlugin.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  } finally {
    formLoading.value = false
  }
}

// 获取类型标签
const getTypeLabel = (type: string) => {
  const item = typeOptions.find(o => o.value === type)
  return item ? item.label : type
}

// 获取商品第一张图片
const getProductImage = (images: string) => {
  try {
    const arr = JSON.parse(images)
    return arr[0] || ''
  } catch {
    return ''
  }
}

// 计算是否编辑模式（商品ID只读）
const isEditMode = computed(() => editingId.value !== null)

onMounted(() => {
  loadData()
  loadProducts()
})
</script>

<template>
  <div class="page-container">
    <!-- 搜索栏 -->
    <t-card class="search-card" :bordered="false">
      <t-form :data="searchForm" layout="inline">
        <t-form-item label="推荐类型" name="type">
          <t-select
            v-model="searchForm.type"
            :options="typeOptions"
            placeholder="请选择类型"
            style="width: 150px"
            clearable
          />
        </t-form-item>
        <t-form-item label="状态" name="status">
          <t-select
            v-model="searchForm.status"
            :options="statusOptions"
            placeholder="请选择状态"
            style="width: 150px"
            clearable
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" @click="onSearch">查询</t-button>
          <t-button theme="default" variant="base" @click="onReset">重置</t-button>
          <t-button theme="success" @click="handleAdd">新增推荐</t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <!-- 表格 -->
    <t-card class="table-card" :bordered="false">
      <t-table
        :data="data"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="onPageChange"
      >
        <template #empty>
          <EmptyState
            :type="searchForm.type || searchForm.status ? 'search' : 'data'"
            :title="searchForm.type || searchForm.status ? '未找到匹配结果' : '暂无推荐商品'"
            :description="searchForm.type || searchForm.status ? '请尝试调整筛选条件' : '点击上方按钮新增推荐'"
          />
        </template>
        <!-- 商品信息 -->
        <template #product="{ row }">
          <div class="product-info">
            <t-image
              v-if="getProductImage(row.product.images)"
              :src="getProductImage(row.product.images)"
              :style="{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }"
            />
            <div class="product-detail">
              <div class="product-name">{{ row.product.name }}</div>
              <div class="product-meta">
                <t-tag size="small" variant="outline">库存: {{ row.product.stock }}</t-tag>
                <t-tag size="small" :theme="row.product.status === 'ACTIVE' ? 'success' : 'default'" variant="outline">
                  {{ row.product.status === 'ACTIVE' ? '上架' : '下架' }}
                </t-tag>
              </div>
            </div>
          </div>
        </template>

        <!-- 推荐类型 -->
        <template #type="{ row }">
          <t-tag v-if="row.type === 'HOT'" theme="danger">热销</t-tag>
          <t-tag v-else-if="row.type === 'NEW'" theme="success">新品</t-tag>
          <t-tag v-else theme="warning">精选</t-tag>
        </template>

        <!-- 状态 -->
        <template #status="{ row }">
          <t-tag v-if="row.status === 'ACTIVE'" theme="success">启用</t-tag>
          <t-tag v-else theme="danger">禁用</t-tag>
        </template>

        <!-- 操作 -->
        <template #action="{ row }">
          <t-space>
            <t-link theme="primary" @click="handleEdit(row)">编辑</t-link>
            <t-link theme="danger" @click="handleDelete(row)">删除</t-link>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 编辑对话框 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="dialogTitle"
      width="600px"
      :confirm-btn="{ content: '提交', loading: formLoading }"
      :on-confirm="handleSubmit"
    >
      <t-form :data="formData" label-width="100px">
        <t-form-item label="选择商品" name="productId" required>
          <t-select
            v-model="formData.productId"
            :options="products"
            placeholder="请选择商品"
            filterable
            :disabled="isEditMode"
          />
          <div v-if="isEditMode" class="form-tip">编辑时商品不可更改</div>
        </t-form-item>

        <t-form-item label="推荐类型" name="type" required>
          <t-radio-group v-model="formData.type" :disabled="isEditMode">
            <t-radio value="HOT">热销</t-radio>
            <t-radio value="NEW">新品</t-radio>
            <t-radio value="FEATURED">精选</t-radio>
          </t-radio-group>
          <div v-if="isEditMode" class="form-tip">编辑时类型不可更改</div>
        </t-form-item>

        <t-form-item label="推荐标题" name="title">
          <t-input v-model="formData.title" placeholder="如：今日爆款" maxlength="100" />
          <div class="form-tip">可选，用于前端展示</div>
        </t-form-item>

        <t-form-item label="推荐副标题" name="subtitle">
          <t-input v-model="formData.subtitle" placeholder="如：限时特惠" maxlength="200" />
          <div class="form-tip">可选，用于前端展示</div>
        </t-form-item>

        <t-form-item label="角标文字" name="badge">
          <t-input v-model="formData.badge" placeholder="如：热卖" maxlength="20" />
          <div class="form-tip">可选，显示在商品卡片右上角</div>
        </t-form-item>

        <t-form-item label="排序权重" name="sort">
          <t-input-number v-model="formData.sort" :min="0" :max="9999" placeholder="越小越靠前" />
        </t-form-item>

        <t-form-item label="状态" name="status">
          <t-radio-group v-model="formData.status">
            <t-radio value="ACTIVE">启用</t-radio>
            <t-radio value="INACTIVE">禁用</t-radio>
          </t-radio-group>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<style scoped lang="less">
.page-container {
  padding: 20px;
}

.search-card {
  margin-bottom: 20px;
}

.table-card {
  .product-info {
    display: flex;
    gap: 12px;
    align-items: center;

    .product-detail {
      flex: 1;
      min-width: 0;

      .product-name {
        font-size: 14px;
        color: var(--td-text-color-primary);
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .product-meta {
        display: flex;
        gap: 8px;
      }
    }
  }
}

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}
</style>
