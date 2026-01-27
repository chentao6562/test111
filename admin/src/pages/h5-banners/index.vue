<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next'
import * as h5MaterialApi from '@/api/h5Material'
import type { Banner } from '@/api/h5Material'
import { EmptyState } from '@/components'
import { uploadImage } from '@/api/upload'
import { getProductList } from '@/api/product'
import { getCategoryList } from '@/api/category'

// 表格数据
const data = ref<Banner[]>([])
const loading = ref(false)
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
})

// 搜索条件
const searchForm = ref({
  status: ''
})

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formData = ref<h5MaterialApi.CreateBannerRequest>({
  title: '',
  imageUrl: '',
  linkType: 'NONE',
  linkValue: '',
  sort: 0,
  status: 'ACTIVE',
  startTime: '',
  endTime: ''
})
const editingId = ref<number | null>(null)

// 商品和分类列表
const products = ref<any[]>([])
const categories = ref<any[]>([])
// 【2026-01-19】活动列表
const flashSaleActivities = ref<any[]>([])
const activityPages = ref<any[]>([])

// 表格列定义
const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 80 },
  {
    colKey: 'imageUrl',
    title: '轮播图',
    width: 120,
    cell: 'image'
  },
  { colKey: 'title', title: '标题', minWidth: 150 },
  {
    colKey: 'linkType',
    title: '链接类型',
    width: 100,
    cell: 'linkType'
  },
  {
    colKey: 'linkValue',
    title: '链接值',
    width: 150,
    ellipsis: true
  },
  { colKey: 'sort', title: '排序', width: 80 },
  {
    colKey: 'status',
    title: '状态',
    width: 100,
    cell: 'status'
  },
  {
    colKey: 'createdAt',
    title: '创建时间',
    width: 180
  },
  {
    colKey: 'action',
    title: '操作',
    width: 180,
    fixed: 'right',
    cell: 'action'
  }
]

// 链接类型选项
const linkTypeOptions = [
  { label: '无跳转', value: 'NONE' },
  { label: '商品详情', value: 'PRODUCT' },
  { label: '分类页', value: 'CATEGORY' },
  { label: '限时秒杀', value: 'FLASH_SALE' },
  { label: '满赠活动', value: 'GIFT_ACTIVITY' },
  { label: '活动专题页', value: 'ACTIVITY_PAGE' },
  { label: '外部链接', value: 'URL' }
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
    const res = await h5MaterialApi.getBanners({
      page: pagination.value.current,
      pageSize: pagination.value.pageSize,
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
    const res = await getProductList({ page: 1, pageSize: 100 })
    products.value = res.data.list.map((p: any) => ({
      label: p.name,
      value: p.id
    }))
  } catch (error: any) {
    console.error('加载商品失败:', error)
  }
}

// 加载分类列表
const loadCategories = async () => {
  try {
    const res = await getCategoryList()
    categories.value = res.data.map((c: any) => ({
      label: c.name,
      value: c.id
    }))
  } catch (error: any) {
    console.error('加载分类失败:', error)
  }
}

// 【2026-01-19】加载秒杀活动列表
const loadFlashSaleActivities = async () => {
  try {
    const res = await get<any>('/admin/flash-sale/activities', { page: 1, pageSize: 100, status: 'ACTIVE' })
    flashSaleActivities.value = (res.data?.list || []).map((a: any) => ({
      label: a.name,
      value: String(a.id)
    }))
  } catch (error: any) {
    console.error('加载秒杀活动失败:', error)
  }
}

// 【2026-01-19】加载活动专题页列表
const loadActivityPages = async () => {
  try {
    const res = await get<any>('/admin/activity-pages', { page: 1, pageSize: 100, status: 'ACTIVE' })
    activityPages.value = (res.data?.list || []).map((p: any) => ({
      label: p.name,
      value: p.slug // 使用slug作为链接值
    }))
  } catch (error: any) {
    console.error('加载活动专题页失败:', error)
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
    status: ''
  }
  pagination.value.current = 1
  loadData()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增轮播图'
  editingId.value = null
  formData.value = {
    title: '',
    imageUrl: '',
    linkType: 'NONE',
    linkValue: '',
    sort: 0,
    status: 'ACTIVE',
    startTime: '',
    endTime: ''
  }
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: Banner) => {
  dialogTitle.value = '编辑轮播图'
  editingId.value = row.id
  formData.value = {
    title: row.title,
    imageUrl: row.imageUrl,
    linkType: row.linkType,
    linkValue: row.linkValue || '',
    sort: row.sort,
    status: row.status,
    startTime: row.startTime || '',
    endTime: row.endTime || ''
  }
  dialogVisible.value = true
}

// 删除
const handleDelete = (row: Banner) => {
  const confirmDia = DialogPlugin.confirm({
    header: '确认删除',
    body: `确定要删除轮播图"${row.title}"吗？`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        await h5MaterialApi.deleteBanner(row.id)
        MessagePlugin.success('删除成功')
        loadData()
        confirmDia.hide()
      } catch (error: any) {
        MessagePlugin.error(error.message || '删除失败')
      }
    }
  })
}

// 图片上传
const beforeUpload = async (file: File) => {
  try {
    const res = await uploadImage(file)
    formData.value.imageUrl = res.data.url
    MessagePlugin.success('上传成功')
    return false
  } catch (error: any) {
    MessagePlugin.error(error.message || '上传失败')
    return false
  }
}

// 链接类型变化
const onLinkTypeChange = () => {
  formData.value.linkValue = ''
}

// 提交表单
const handleSubmit = async () => {
  if (!formData.value.title) {
    MessagePlugin.warning('请输入标题')
    return
  }
  if (!formData.value.imageUrl) {
    MessagePlugin.warning('请上传轮播图')
    return
  }
  if (formData.value.linkType !== 'NONE' && !formData.value.linkValue) {
    MessagePlugin.warning('请设置链接')
    return
  }

  formLoading.value = true
  try {
    if (editingId.value) {
      await h5MaterialApi.updateBanner(editingId.value, formData.value)
      MessagePlugin.success('更新成功')
    } else {
      await h5MaterialApi.createBanner(formData.value)
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

// 获取链接类型标签
const getLinkTypeLabel = (type: string) => {
  const item = linkTypeOptions.find(o => o.value === type)
  return item ? item.label : type
}

onMounted(() => {
  loadData()
  loadProducts()
  loadCategories()
  loadFlashSaleActivities()
  loadActivityPages()
})
</script>

<template>
  <div class="page-container">
    <!-- 搜索栏 -->
    <t-card class="search-card" :bordered="false">
      <t-form :data="searchForm" layout="inline">
        <t-form-item label="状态" name="status">
          <t-select
            v-model="searchForm.status"
            :options="statusOptions"
            placeholder="请选择状态"
            style="width: 200px"
            clearable
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" @click="onSearch">查询</t-button>
          <t-button theme="default" variant="base" @click="onReset">重置</t-button>
          <t-button theme="success" @click="handleAdd">新增轮播图</t-button>
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
            :type="searchForm.status ? 'search' : 'data'"
            :title="searchForm.status ? '未找到匹配结果' : '暂无轮播图'"
            :description="searchForm.status ? '请尝试调整筛选条件' : '点击上方按钮新增轮播图'"
          />
        </template>
        <!-- 轮播图 -->
        <template #image="{ row }">
          <t-image
            :src="row.imageUrl"
            :style="{ width: '80px', height: '45px', objectFit: 'cover' }"
          />
        </template>

        <!-- 链接类型 -->
        <template #linkType="{ row }">
          <t-tag theme="primary" variant="light">{{ getLinkTypeLabel(row.linkType) }}</t-tag>
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
        <t-form-item label="标题" name="title" required>
          <t-input v-model="formData.title" placeholder="请输入轮播图标题" maxlength="100" />
        </t-form-item>

        <t-form-item label="轮播图" name="imageUrl" required>
          <div class="upload-wrapper">
            <t-upload
              theme="image"
              :auto-upload="true"
              :before-upload="beforeUpload"
              accept="image/*"
              :max="1"
            >
              <template #file-list-display>
                <div v-if="formData.imageUrl" class="preview-image">
                  <t-image :src="formData.imageUrl" :style="{ width: '100%', height: '150px', objectFit: 'cover' }" />
                </div>
              </template>
            </t-upload>
            <div class="upload-tip">推荐尺寸：750x400px</div>
          </div>
        </t-form-item>

        <t-form-item label="链接类型" name="linkType" required>
          <t-radio-group v-model="formData.linkType" @change="onLinkTypeChange">
            <t-radio v-for="option in linkTypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </t-radio>
          </t-radio-group>
        </t-form-item>

        <t-form-item v-if="formData.linkType === 'PRODUCT'" label="选择商品" name="linkValue">
          <t-select
            v-model="formData.linkValue"
            :options="products"
            placeholder="请选择商品"
            filterable
          />
        </t-form-item>

        <t-form-item v-if="formData.linkType === 'CATEGORY'" label="选择分类" name="linkValue">
          <t-select
            v-model="formData.linkValue"
            :options="categories"
            placeholder="请选择分类"
          />
        </t-form-item>

        <t-form-item v-if="formData.linkType === 'URL'" label="外部链接" name="linkValue">
          <t-input v-model="formData.linkValue" placeholder="请输入完整的URL地址" />
        </t-form-item>

        <t-form-item v-if="formData.linkType === 'FLASH_SALE'" label="秒杀活动" name="linkValue">
          <t-select
            v-model="formData.linkValue"
            :options="flashSaleActivities"
            placeholder="请选择秒杀活动"
          />
          <div class="form-tip">跳转到限时秒杀页面</div>
        </t-form-item>

        <t-form-item v-if="formData.linkType === 'GIFT_ACTIVITY'" label="满赠活动" name="linkValue">
          <t-input v-model="formData.linkValue" value="GIFT" disabled />
          <div class="form-tip">跳转到满赠活动页面</div>
        </t-form-item>

        <t-form-item v-if="formData.linkType === 'ACTIVITY_PAGE'" label="专题页" name="linkValue">
          <t-select
            v-model="formData.linkValue"
            :options="activityPages"
            placeholder="请选择活动专题页"
            filterable
          />
          <div class="form-tip">跳转到活动专题页</div>
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

        <t-form-item label="生效时间" name="time">
          <t-space>
            <t-date-picker v-model="formData.startTime" placeholder="开始时间" clearable />
            <span>至</span>
            <t-date-picker v-model="formData.endTime" placeholder="结束时间" clearable />
          </t-space>
          <div class="form-tip">留空表示永久有效</div>
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
  :deep(.t-table) {
    .t-image {
      border-radius: 4px;
    }
  }
}

.upload-wrapper {
  .preview-image {
    width: 300px;
    border: 1px solid var(--td-border-level-1-color);
    border-radius: 4px;
    overflow: hidden;
  }

  .upload-tip {
    margin-top: 8px;
    font-size: 12px;
    color: var(--td-text-color-placeholder);
  }
}

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}
</style>
