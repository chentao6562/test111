<script setup lang="ts">
/**
 * 大转盘风控黑名单管理页面
 * @since 2026-01-23
 */
import { ref, onMounted } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next'
import {
  getBlacklist,
  addBlacklist,
  removeBlacklist,
  BlacklistTypeLabels,
  type BlacklistItem
} from '@/api/spinWheel'

// 表格数据
const data = ref<BlacklistItem[]>([])
const loading = ref(false)
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
})

// 搜索条件
const searchForm = ref({
  type: '',
  keyword: ''
})

// 新增对话框
const addDialogVisible = ref(false)
const addFormLoading = ref(false)
const addForm = ref({
  type: 'PHONE',
  value: '',
  reason: '',
  expireAt: ''
})

// 表格列定义
const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 60 },
  { colKey: 'type', title: '类型', width: 100, cell: 'type' },
  { colKey: 'value', title: '值', minWidth: 150 },
  { colKey: 'reason', title: '原因', minWidth: 150, cell: 'reason' },
  { colKey: 'expireAt', title: '过期时间', width: 160, cell: 'expireAt' },
  { colKey: 'createdAt', title: '创建时间', width: 160, cell: 'createdAt' },
  { colKey: 'action', title: '操作', width: 80, fixed: 'right', cell: 'action' }
]

// 类型选项
const typeOptions = [
  { label: '全部', value: '' },
  { label: '手机号', value: 'PHONE' },
  { label: 'IP地址', value: 'IP' },
  { label: '设备ID', value: 'DEVICE' }
]

// 新增类型选项
const addTypeOptions = [
  { label: '手机号', value: 'PHONE' },
  { label: 'IP地址', value: 'IP' },
  { label: '设备ID', value: 'DEVICE' }
]

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res = await getBlacklist({
      page: pagination.value.current,
      pageSize: pagination.value.pageSize,
      type: searchForm.value.type || undefined,
      keyword: searchForm.value.keyword || undefined
    })
    if (res.data) {
      data.value = res.data.list || []
      pagination.value.total = res.data.total || 0
    }
  } catch {
    MessagePlugin.error('加载失败')
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

// 重置
const onReset = () => {
  searchForm.value = { type: '', keyword: '' }
  pagination.value.current = 1
  loadData()
}

// 打开新增对话框
const handleAdd = () => {
  addForm.value = {
    type: 'PHONE',
    value: '',
    reason: '',
    expireAt: ''
  }
  addDialogVisible.value = true
}

// 提交新增
const handleAddSubmit = async () => {
  if (!addForm.value.value.trim()) {
    MessagePlugin.warning('请输入值')
    return
  }

  addFormLoading.value = true
  try {
    await addBlacklist({
      type: addForm.value.type,
      value: addForm.value.value.trim(),
      reason: addForm.value.reason || undefined,
      expireAt: addForm.value.expireAt || undefined
    })
    MessagePlugin.success('添加成功')
    addDialogVisible.value = false
    loadData()
  } catch (error: any) {
    MessagePlugin.error(error.message || '添加失败')
  } finally {
    addFormLoading.value = false
  }
}

// 移除黑名单
const handleRemove = (row: BlacklistItem) => {
  const confirmDia = DialogPlugin.confirm({
    header: '确认移除',
    body: `确定要将"${row.value}"从黑名单中移除吗？`,
    confirmBtn: '移除',
    onConfirm: async () => {
      try {
        await removeBlacklist(row.id)
        MessagePlugin.success('移除成功')
        loadData()
        confirmDia.hide()
      } catch (error: any) {
        MessagePlugin.error(error.message || '移除失败')
      }
    }
  })
}

// 格式化时间
const formatTime = (timeStr: string | null) => {
  if (!timeStr) return '永久'
  return new Date(timeStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 检查是否已过期
const isExpired = (expireAt: string | null) => {
  if (!expireAt) return false
  return new Date(expireAt) < new Date()
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page-container">
    <!-- 功能说明 -->
    <t-card class="info-card" :bordered="false">
      <div class="info-content">
        <t-icon name="secured" size="24px" style="color: var(--td-error-color)" />
        <div class="info-text">
          <h3>风控黑名单管理</h3>
          <p>
            管理大转盘活动的黑名单，可按手机号、IP地址、设备ID进行封禁。
            被封禁的用户无法参与助力和抽奖活动。支持设置过期时间，过期后自动解除封禁。
          </p>
        </div>
      </div>
    </t-card>

    <!-- 搜索栏 -->
    <t-card class="search-card" :bordered="false">
      <t-form :data="searchForm" layout="inline">
        <t-form-item label="类型" name="type">
          <t-select
            v-model="searchForm.type"
            :options="typeOptions"
            placeholder="请选择类型"
            style="width: 150px"
            clearable
          />
        </t-form-item>
        <t-form-item label="关键词" name="keyword">
          <t-input
            v-model="searchForm.keyword"
            placeholder="输入手机号/IP/设备ID"
            style="width: 200px"
            clearable
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" @click="onSearch">查询</t-button>
          <t-button theme="default" variant="base" @click="onReset">重置</t-button>
          <t-button theme="danger" @click="handleAdd">添加黑名单</t-button>
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
          <div style="padding: 40px; text-align: center; color: #999;">
            暂无黑名单记录
          </div>
        </template>

        <!-- 类型 -->
        <template #type="{ row }">
          <t-tag
            :theme="row.type === 'PHONE' ? 'primary' : row.type === 'IP' ? 'warning' : 'default'"
          >
            {{ BlacklistTypeLabels[row.type] || row.type }}
          </t-tag>
        </template>

        <!-- 原因 -->
        <template #reason="{ row }">
          {{ row.reason || '-' }}
        </template>

        <!-- 过期时间 -->
        <template #expireAt="{ row }">
          <span :class="{ expired: isExpired(row.expireAt) }">
            {{ formatTime(row.expireAt) }}
          </span>
          <t-tag v-if="isExpired(row.expireAt)" theme="default" size="small" style="margin-left: 8px">
            已过期
          </t-tag>
        </template>

        <!-- 创建时间 -->
        <template #createdAt="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>

        <!-- 操作 -->
        <template #action="{ row }">
          <t-link theme="danger" @click="handleRemove(row)">移除</t-link>
        </template>
      </t-table>
    </t-card>

    <!-- 新增对话框 -->
    <t-dialog
      v-model:visible="addDialogVisible"
      header="添加黑名单"
      width="500px"
      :confirm-btn="{ content: '添加', loading: addFormLoading }"
      :on-confirm="handleAddSubmit"
    >
      <t-form :data="addForm" label-width="80px">
        <t-form-item label="类型" name="type" required>
          <t-select v-model="addForm.type" :options="addTypeOptions" />
        </t-form-item>

        <t-form-item label="值" name="value" required>
          <t-input
            v-model="addForm.value"
            :placeholder="addForm.type === 'PHONE' ? '输入手机号' : addForm.type === 'IP' ? '输入IP地址' : '输入设备ID'"
          />
        </t-form-item>

        <t-form-item label="原因" name="reason">
          <t-textarea
            v-model="addForm.reason"
            placeholder="封禁原因（选填）"
            :maxlength="200"
            :autosize="{ minRows: 2 }"
          />
        </t-form-item>

        <t-form-item label="过期时间" name="expireAt" help="留空表示永久封禁">
          <t-date-picker
            v-model="addForm.expireAt"
            mode="date"
            enable-time-picker
            format="YYYY-MM-DD HH:mm"
            placeholder="选择过期时间（留空=永久）"
            style="width: 100%"
          />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<style scoped lang="less">
.page-container {
  padding: 20px;
}

.info-card {
  margin-bottom: 20px;
  background: linear-gradient(135deg, #ffebee 0%, #fce4ec 100%);
}

.info-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.info-text {
  h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #c62828;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #666;
  }
}

.search-card {
  margin-bottom: 20px;
}

.table-card {
  .expired {
    color: #999;
    text-decoration: line-through;
  }
}
</style>
