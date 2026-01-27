<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { PageInfo, PrimaryTableCol, UploadFile, RequestMethodResponse } from 'tdesign-vue-next'
import * as promotionMaterialApi from '@/api/promotionMaterial'
import type { BrandAsset } from '@/api/promotionMaterial'
import { EmptyState } from '@/components'
import { getImageUrl } from '@/utils/image'

// 表格数据
const data = ref<BrandAsset[]>([])
const loading = ref(false)
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
})

// 搜索条件
const searchForm = ref({
  type: '',
  status: '',
  keyword: ''
})

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formData = ref<promotionMaterialApi.CreateAssetRequest>({
  type: 'PHOTO',
  name: '',
  url: '',
  thumbnail: '',
  fileSize: undefined,
  description: '',
  sort: 0,
  status: 'ACTIVE'
})
const editingId = ref<number | null>(null)
const fileList = ref<UploadFile[]>([])
const thumbnailList = ref<UploadFile[]>([])

// 表格列定义
const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 80 },
  {
    colKey: 'preview',
    title: '预览',
    width: 100,
    cell: 'preview'
  },
  { colKey: 'name', title: '名称', minWidth: 180 },
  {
    colKey: 'type',
    title: '类型',
    width: 120,
    cell: 'type'
  },
  {
    colKey: 'fileSize',
    title: '大小',
    width: 100,
    cell: 'fileSize'
  },
  {
    colKey: 'description',
    title: '描述',
    minWidth: 150,
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

// 素材类型选项
const typeOptions = [
  { label: '全部', value: '' },
  { label: '品牌LOGO', value: 'LOGO' },
  { label: '产品实拍', value: 'PHOTO' },
  { label: '产品视频', value: 'VIDEO' },
  { label: '海报模板', value: 'POSTER' }
]

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: 'ACTIVE' },
  { label: '禁用', value: 'INACTIVE' }
]

// 上传API地址
const uploadAction = '/api/upload'

// 是否视频类型
const isVideoType = computed(() => formData.value.type === 'VIDEO')

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res = await promotionMaterialApi.getBrandAssets({
      page: pagination.value.current,
      pageSize: pagination.value.pageSize,
      type: searchForm.value.type,
      status: searchForm.value.status,
      keyword: searchForm.value.keyword
    })
    data.value = res.data.list
    pagination.value.total = res.data.total
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
    status: '',
    keyword: ''
  }
  pagination.value.current = 1
  loadData()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增品牌素材'
  editingId.value = null
  formData.value = {
    type: 'PHOTO',
    name: '',
    url: '',
    thumbnail: '',
    fileSize: undefined,
    description: '',
    sort: 0,
    status: 'ACTIVE'
  }
  fileList.value = []
  thumbnailList.value = []
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: BrandAsset) => {
  dialogTitle.value = '编辑品牌素材'
  editingId.value = row.id
  formData.value = {
    type: row.type,
    name: row.name,
    url: row.url,
    thumbnail: row.thumbnail || '',
    fileSize: row.fileSize,
    description: row.description || '',
    sort: row.sort,
    status: row.status
  }
  // 设置已有文件
  fileList.value = row.url ? [{
    url: getImageUrl(row.url),
    name: row.name,
    status: 'success'
  }] : []
  thumbnailList.value = row.thumbnail ? [{
    url: getImageUrl(row.thumbnail),
    name: '缩略图',
    status: 'success'
  }] : []
  dialogVisible.value = true
}

// 删除
const handleDelete = (row: BrandAsset) => {
  const confirmDia = DialogPlugin.confirm({
    header: '确认删除',
    body: `确定要删除素材"${row.name}"吗？`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        await promotionMaterialApi.deleteAsset(row.id)
        MessagePlugin.success('删除成功')
        loadData()
        confirmDia.hide()
      } catch (error: any) {
        MessagePlugin.error(error.message || '删除失败')
      }
    }
  })
}

// 文件上传成功
const onFileSuccess = (response: RequestMethodResponse) => {
  if (response.response?.data?.url) {
    formData.value.url = response.response.data.url
    // 计算文件大小(KB)
    if (response.file?.size) {
      formData.value.fileSize = Math.round(response.file.size / 1024)
    }
  }
}

// 缩略图上传成功
const onThumbnailSuccess = (response: RequestMethodResponse) => {
  if (response.response?.data?.url) {
    formData.value.thumbnail = response.response.data.url
  }
}

// 文件移除
const onFileRemove = () => {
  formData.value.url = ''
  formData.value.fileSize = undefined
}

// 缩略图移除
const onThumbnailRemove = () => {
  formData.value.thumbnail = ''
}

// 提交表单
const handleSubmit = async () => {
  if (!formData.value.name) {
    MessagePlugin.warning('请输入素材名称')
    return
  }
  if (!formData.value.url) {
    MessagePlugin.warning('请上传素材文件')
    return
  }
  if (!formData.value.type) {
    MessagePlugin.warning('请选择素材类型')
    return
  }

  formLoading.value = true
  try {
    if (editingId.value) {
      await promotionMaterialApi.updateAsset(editingId.value, formData.value)
      MessagePlugin.success('更新成功')
    } else {
      await promotionMaterialApi.createAsset(formData.value)
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

// 获取类型主题
const getTypeTheme = (type: string) => {
  switch (type) {
    case 'LOGO':
      return 'primary'
    case 'PHOTO':
      return 'success'
    case 'VIDEO':
      return 'warning'
    case 'POSTER':
      return 'danger'
    default:
      return 'default'
  }
}

// 格式化文件大小
const formatFileSize = (size?: number) => {
  if (!size) return '-'
  if (size < 1024) return `${size} KB`
  return `${(size / 1024).toFixed(1)} MB`
}

// 判断是否为视频
const isVideo = (url: string) => {
  return /\.(mp4|webm|ogg)$/i.test(url)
}

// 预览对话框
const previewVisible = ref(false)
const previewUrl = ref('')
const previewIsVideo = ref(false)

const handlePreview = (row: BrandAsset) => {
  previewUrl.value = getImageUrl(row.url)
  previewIsVideo.value = row.type === 'VIDEO' || isVideo(row.url)
  previewVisible.value = true
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page-container">
    <!-- 搜索栏 -->
    <t-card class="search-card" :bordered="false">
      <t-form :data="searchForm" layout="inline">
        <t-form-item label="素材类型" name="type">
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
            style="width: 120px"
            clearable
          />
        </t-form-item>
        <t-form-item label="关键词" name="keyword">
          <t-input
            v-model="searchForm.keyword"
            placeholder="搜索名称/描述"
            style="width: 180px"
            clearable
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" @click="onSearch">查询</t-button>
          <t-button theme="default" variant="base" @click="onReset">重置</t-button>
          <t-button theme="success" @click="handleAdd">新增素材</t-button>
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
            :type="searchForm.type || searchForm.status || searchForm.keyword ? 'search' : 'data'"
            :title="searchForm.type || searchForm.status || searchForm.keyword ? '未找到匹配结果' : '暂无素材'"
            :description="searchForm.type || searchForm.status || searchForm.keyword ? '请尝试调整筛选条件' : '点击上方按钮新增素材'"
          />
        </template>

        <!-- 预览 -->
        <template #preview="{ row }">
          <div class="preview-cell" @click="handlePreview(row)">
            <template v-if="row.type === 'VIDEO'">
              <div class="video-preview">
                <img v-if="row.thumbnail" :src="getImageUrl(row.thumbnail)" alt="缩略图" />
                <t-icon v-else name="play-circle" size="32px" />
              </div>
            </template>
            <template v-else>
              <img :src="getImageUrl(row.url)" alt="预览" />
            </template>
          </div>
        </template>

        <!-- 素材类型 -->
        <template #type="{ row }">
          <t-tag :theme="getTypeTheme(row.type)">{{ getTypeLabel(row.type) }}</t-tag>
        </template>

        <!-- 文件大小 -->
        <template #fileSize="{ row }">
          {{ formatFileSize(row.fileSize) }}
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
        <t-form-item label="素材类型" name="type" required>
          <t-radio-group v-model="formData.type">
            <t-radio value="LOGO">品牌LOGO</t-radio>
            <t-radio value="PHOTO">产品实拍</t-radio>
            <t-radio value="VIDEO">产品视频</t-radio>
            <t-radio value="POSTER">海报模板</t-radio>
          </t-radio-group>
        </t-form-item>

        <t-form-item label="素材名称" name="name" required>
          <t-input v-model="formData.name" placeholder="请输入素材名称" maxlength="100" />
        </t-form-item>

        <t-form-item label="素材文件" name="url" required>
          <t-upload
            v-model="fileList"
            :action="uploadAction"
            :accept="isVideoType ? 'video/*' : 'image/*'"
            :max="1"
            theme="image"
            :size-limit="{ size: isVideoType ? 50 : 5, unit: 'MB' }"
            @success="onFileSuccess"
            @remove="onFileRemove"
          />
          <div class="form-tip">
            {{ isVideoType ? '支持mp4/webm格式，不超过50MB' : '支持jpg/png格式，不超过5MB' }}
          </div>
        </t-form-item>

        <t-form-item v-if="isVideoType" label="视频缩略图" name="thumbnail">
          <t-upload
            v-model="thumbnailList"
            :action="uploadAction"
            accept="image/*"
            :max="1"
            theme="image"
            :size-limit="{ size: 2, unit: 'MB' }"
            @success="onThumbnailSuccess"
            @remove="onThumbnailRemove"
          />
          <div class="form-tip">用于视频封面展示，支持jpg/png格式</div>
        </t-form-item>

        <t-form-item label="描述" name="description">
          <t-textarea
            v-model="formData.description"
            placeholder="请输入素材描述（可选）"
            :autosize="{ minRows: 2, maxRows: 4 }"
            maxlength="255"
          />
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

    <!-- 预览对话框 -->
    <t-dialog
      v-model:visible="previewVisible"
      header="素材预览"
      width="800px"
      :footer="false"
    >
      <div class="preview-content">
        <video v-if="previewIsVideo" :src="previewUrl" controls style="max-width: 100%; max-height: 500px;" />
        <img v-else :src="previewUrl" alt="预览" style="max-width: 100%; max-height: 500px;" />
      </div>
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

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.preview-cell {
  width: 60px;
  height: 60px;
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-preview {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--td-brand-color);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}

.preview-content {
  text-align: center;
}
</style>
