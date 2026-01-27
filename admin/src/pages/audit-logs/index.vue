<template>
  <div class="audit-logs-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">操作日志</h1>
        <p class="page-desc">查看系统所有用户的操作记录</p>
      </div>
    </div>

    <!-- 筛选栏 -->
    <t-card :bordered="false" class="filter-card">
      <t-form :data="filters" layout="inline" @submit="handleSearch" @reset="handleReset">
        <t-form-item label="用户类型">
          <t-select
            v-model="filters.userType"
            placeholder="全部"
            clearable
            style="width: 120px"
          >
            <t-option value="admin" label="管理员" />
            <t-option value="agent" label="代理商" />
            <t-option value="staff" label="员工" />
          </t-select>
        </t-form-item>
        <t-form-item label="操作类型">
          <t-select
            v-model="filters.action"
            placeholder="全部"
            clearable
            style="width: 120px"
          >
            <t-option value="create" label="创建" />
            <t-option value="update" label="更新" />
            <t-option value="delete" label="删除" />
            <t-option value="login" label="登录" />
            <t-option value="reset_password" label="重置密码" />
          </t-select>
        </t-form-item>
        <t-form-item label="模块">
          <t-select
            v-model="filters.module"
            placeholder="全部"
            clearable
            style="width: 150px"
          >
            <t-option value="staff" label="员工管理" />
            <t-option value="agent" label="代理商" />
            <t-option value="order" label="订单" />
            <t-option value="product" label="商品" />
            <t-option value="stock" label="库存" />
            <t-option value="commission" label="分润" />
            <t-option value="finance" label="财务" />
            <t-option value="system" label="系统设置" />
          </t-select>
        </t-form-item>
        <t-form-item label="开始日期">
          <t-date-picker
            v-model="filters.startDate"
            placeholder="请选择"
            clearable
            style="width: 180px"
          />
        </t-form-item>
        <t-form-item label="结束日期">
          <t-date-picker
            v-model="filters.endDate"
            placeholder="请选择"
            clearable
            style="width: 180px"
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" type="submit">搜索</t-button>
          <t-button theme="default" type="reset" style="margin-left: 8px">重置</t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <!-- 数据表格 -->
    <t-card :bordered="false" class="table-card">
      <t-table
        :data="tableData"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        stripe
        hover
        @page-change="handlePageChange"
      >
        <template #empty>
          <EmptyState
            :type="filters.userType || filters.action || filters.module ? 'search' : 'data'"
            :title="filters.userType || filters.action || filters.module ? '未找到匹配结果' : '暂无操作日志'"
            :description="filters.userType || filters.action || filters.module ? '请尝试调整筛选条件' : ''"
          />
        </template>
        <!-- 用户类型列 -->
        <template #userType="{ row }">
          <t-tag v-if="row.userType === 'admin'" theme="primary">管理员</t-tag>
          <t-tag v-else-if="row.userType === 'agent'" theme="success">代理商</t-tag>
          <t-tag v-else-if="row.userType === 'staff'" theme="warning">员工</t-tag>
          <t-tag v-else theme="default">{{ row.userType }}</t-tag>
        </template>

        <!-- 操作类型列 -->
        <template #action="{ row }">
          <t-tag v-if="row.action === 'create'" theme="success" variant="light">创建</t-tag>
          <t-tag v-else-if="row.action === 'update'" theme="primary" variant="light">更新</t-tag>
          <t-tag v-else-if="row.action === 'delete'" theme="danger" variant="light">删除</t-tag>
          <t-tag v-else-if="row.action === 'login'" theme="default" variant="light">登录</t-tag>
          <t-tag v-else-if="row.action === 'reset_password'" theme="warning" variant="light">重置密码</t-tag>
          <t-tag v-else theme="default" variant="light">{{ row.action }}</t-tag>
        </template>

        <!-- 详情列 -->
        <template #detail="{ row }">
          <span class="detail-text">{{ row.detail || '-' }}</span>
        </template>
      </t-table>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { getAuditLogs } from '@/api/auditLog'
import { EmptyState } from '@/components'

// 筛选条件
const filters = reactive({
  userType: '',
  action: '',
  module: '',
  startDate: '',
  endDate: ''
})

// 表格数据
const loading = ref(false)
const tableData = ref([])
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

// 表格列定义
const columns = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'userType', title: '用户类型', width: 100 },
  { colKey: 'userName', title: '用户名', width: 150 },
  { colKey: 'action', title: '操作类型', width: 120 },
  { colKey: 'module', title: '模块', width: 120 },
  { colKey: 'detail', title: '操作详情', minWidth: 300 },
  { colKey: 'ip', title: 'IP地址', width: 150 },
  { colKey: 'createdAt', title: '操作时间', width: 180 }
]

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.current,
      pageSize: pagination.pageSize
    }

    // 添加筛选条件
    if (filters.userType) params.userType = filters.userType
    if (filters.action) params.action = filters.action
    if (filters.module) params.module = filters.module
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate

    const res = await getAuditLogs(params)
    tableData.value = res.data.list
    pagination.total = res.data.total
  } catch (error) {
    MessagePlugin.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.current = 1
  loadData()
}

// 重置
const handleReset = () => {
  filters.userType = ''
  filters.action = ''
  filters.module = ''
  filters.startDate = ''
  filters.endDate = ''
  handleSearch()
}

// 翻页
const handlePageChange = (pageInfo: any) => {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.audit-logs-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  .page-title {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  .page-desc {
    font-size: 14px;
    color: var(--td-text-color-secondary);
    margin: 0;
  }
}

.filter-card,
.table-card {
  margin-bottom: 16px;
}

.detail-text {
  color: var(--td-text-color-primary);
  word-break: break-all;
}
</style>
