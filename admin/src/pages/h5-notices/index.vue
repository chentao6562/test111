<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next'
import * as h5MaterialApi from '@/api/h5Material'
import type { Notice } from '@/api/h5Material'
import { EmptyState } from '@/components'

// 表格数据
const data = ref<Notice[]>([])
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
const formData = ref<h5MaterialApi.CreateNoticeRequest>({
  title: '',
  content: '',
  type: 'SYSTEM',
  sort: 0,
  status: 'ACTIVE',
  startTime: '',
  endTime: ''
})
const editingId = ref<number | null>(null)

// 表格列定义
const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'title', title: '标题', minWidth: 200 },
  {
    colKey: 'content',
    title: '内容',
    minWidth: 250,
    ellipsis: true
  },
  {
    colKey: 'type',
    title: '类型',
    width: 100,
    cell: 'type'
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

// 公告类型选项
const typeOptions = [
  { label: '全部', value: '' },
  { label: '系统通知', value: 'SYSTEM' },
  { label: '活动通知', value: 'ACTIVITY' },
  { label: '重要通知', value: 'IMPORTANT' }
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
    const res = await h5MaterialApi.getNotices({
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
  dialogTitle.value = '新增公告'
  editingId.value = null
  formData.value = {
    title: '',
    content: '',
    type: 'SYSTEM',
    sort: 0,
    status: 'ACTIVE',
    startTime: '',
    endTime: ''
  }
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: Notice) => {
  dialogTitle.value = '编辑公告'
  editingId.value = row.id
  formData.value = {
    title: row.title,
    content: row.content,
    type: row.type,
    sort: row.sort,
    status: row.status,
    startTime: row.startTime || '',
    endTime: row.endTime || ''
  }
  dialogVisible.value = true
}

// 删除
const handleDelete = (row: Notice) => {
  const confirmDia = DialogPlugin.confirm({
    header: '确认删除',
    body: `确定要删除公告"${row.title}"吗？`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        await h5MaterialApi.deleteNotice(row.id)
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
  if (!formData.value.title) {
    MessagePlugin.warning('请输入标题')
    return
  }
  if (!formData.value.content) {
    MessagePlugin.warning('请输入内容')
    return
  }
  if (!formData.value.type) {
    MessagePlugin.warning('请选择类型')
    return
  }

  formLoading.value = true
  try {
    if (editingId.value) {
      await h5MaterialApi.updateNotice(editingId.value, formData.value)
      MessagePlugin.success('更新成功')
    } else {
      await h5MaterialApi.createNotice(formData.value)
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
    case 'SYSTEM':
      return 'primary'
    case 'ACTIVITY':
      return 'success'
    case 'IMPORTANT':
      return 'danger'
    default:
      return 'default'
  }
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
        <t-form-item label="公告类型" name="type">
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
          <t-button theme="success" @click="handleAdd">新增公告</t-button>
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
            :title="searchForm.type || searchForm.status ? '未找到匹配结果' : '暂无公告'"
            :description="searchForm.type || searchForm.status ? '请尝试调整筛选条件' : '点击上方按钮新增公告'"
          />
        </template>
        <!-- 公告类型 -->
        <template #type="{ row }">
          <t-tag :theme="getTypeTheme(row.type)">{{ getTypeLabel(row.type) }}</t-tag>
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
          <t-input v-model="formData.title" placeholder="请输入公告标题" maxlength="100" />
        </t-form-item>

        <t-form-item label="内容" name="content" required>
          <t-textarea
            v-model="formData.content"
            placeholder="请输入公告内容（支持换行）"
            :autosize="{ minRows: 5, maxRows: 10 }"
          />
        </t-form-item>

        <t-form-item label="公告类型" name="type" required>
          <t-radio-group v-model="formData.type">
            <t-radio value="SYSTEM">系统通知</t-radio>
            <t-radio value="ACTIVITY">活动通知</t-radio>
            <t-radio value="IMPORTANT">重要通知</t-radio>
          </t-radio-group>
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
  // 样式已通过全局样式定义
}

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}
</style>
