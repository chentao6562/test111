<template>
  <div class="staff-page">
    <!-- 页面标题 -->
    <PageHeader title="员工管理" subtitle="管理库管和货管账号，分配系统权限">
      <template #actions>
        <t-button theme="primary" @click="handleCreate">
          <template #icon><t-icon name="add" /></template>
          新建员工
        </t-button>
      </template>
    </PageHeader>

    <!-- 筛选栏 -->
    <t-card :bordered="false" class="filter-card">
      <t-form :data="filters" layout="inline" @submit="handleSearch" @reset="handleReset">
        <t-form-item label="关键词">
          <t-input
            v-model="filters.keyword"
            placeholder="搜索用户名/姓名/手机号"
            clearable
            style="width: 200px"
          />
        </t-form-item>
        <t-form-item label="角色">
          <t-select
            v-model="filters.role"
            placeholder="全部"
            clearable
            style="width: 120px"
          >
            <t-option value="WAREHOUSE" label="库管" />
            <t-option value="LOGISTICS" label="货管" />
            <t-option value="SERVICE" label="客服" />
          </t-select>
        </t-form-item>
        <t-form-item label="状态">
          <t-select
            v-model="filters.status"
            placeholder="全部"
            clearable
            style="width: 120px"
          >
            <t-option value="ACTIVE" label="正常" />
            <t-option value="DISABLED" label="禁用" />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" type="submit">搜索</t-button>
          <t-button theme="default" type="reset" style="margin-left: 8px">重置</t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <!-- 数据表格 -->
    <TableCard title="员工列表">
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
            :type="filters.keyword || filters.role || filters.status ? 'search' : 'data'"
            :title="filters.keyword || filters.role || filters.status ? '未找到匹配结果' : '暂无员工'"
            :description="filters.keyword || filters.role || filters.status ? '请尝试调整筛选条件' : ''"
          />
        </template>
        <!-- 角色列 -->
        <template #role="{ row }">
          <t-tag v-if="row.role === 'WAREHOUSE'" theme="primary" variant="light">库管</t-tag>
          <t-tag v-else-if="row.role === 'LOGISTICS'" theme="success" variant="light">货管</t-tag>
          <t-tag v-else-if="row.role === 'SERVICE'" theme="warning" variant="light">客服</t-tag>
          <t-tag v-else theme="default" variant="light">{{ row.role }}</t-tag>
        </template>

        <!-- 仓库列【2026-01-13】 -->
        <template #warehouse="{ row }">
          <span v-if="row.warehouse">{{ row.warehouse.name }}</span>
          <span v-else-if="row.role === 'WAREHOUSE'" class="text-placeholder">未分配</span>
          <span v-else class="text-placeholder">-</span>
        </template>

        <!-- 状态列 -->
        <template #status="{ row }">
          <t-tag v-if="row.status === 'ACTIVE'" theme="success">正常</t-tag>
          <t-tag v-else theme="danger">禁用</t-tag>
        </template>

        <!-- 操作列 -->
        <template #operation="{ row }">
          <t-space>
            <t-link theme="primary" @click="handleEdit(row)">编辑</t-link>
            <t-link theme="warning" @click="handleResetPassword(row)">重置密码</t-link>
            <t-link
              v-if="row.status === 'ACTIVE'"
              theme="danger"
              @click="handleDisable(row)"
            >
              禁用
            </t-link>
            <t-link
              v-else
              theme="success"
              @click="handleEnable(row)"
            >
              启用
            </t-link>
          </t-space>
        </template>
      </t-table>
    </TableCard>

    <!-- 新建/编辑弹窗 -->
    <t-dialog
      v-model:visible="formVisible"
      :header="formMode === 'create' ? '新建员工' : '编辑员工'"
      :width="560"
      :confirm-btn="{ content: '确定', loading: formSubmitting }"
      @confirm="handleFormSubmit"
    >
      <t-form
        :data="formData"
        :rules="formRules"
        ref="formRef"
        label-width="100px"
      >
        <t-form-item label="用户名" name="username">
          <t-input
            v-model="formData.username"
            placeholder="4-20位字母、数字或下划线"
            :disabled="formMode === 'edit'"
          />
        </t-form-item>
        <t-form-item label="密码" name="password" v-if="formMode === 'create'">
          <t-input
            v-model="formData.password"
            type="password"
            placeholder="至少6位"
          />
        </t-form-item>
        <t-form-item label="姓名" name="name">
          <t-input v-model="formData.name" placeholder="请输入姓名" />
        </t-form-item>
        <t-form-item label="手机号" name="phone">
          <t-input v-model="formData.phone" placeholder="请输入手机号（可选）" />
        </t-form-item>
        <t-form-item label="角色" name="role" v-if="formMode === 'create'">
          <t-radio-group v-model="formData.role" @change="handleRoleChange">
            <t-radio value="WAREHOUSE">库管</t-radio>
            <t-radio value="LOGISTICS">货管</t-radio>
            <t-radio value="SERVICE">客服</t-radio>
          </t-radio-group>
        </t-form-item>
        <!-- 仓库选择【2026-01-13】仅库管显示 -->
        <t-form-item label="所属仓库" v-if="formData.role === 'WAREHOUSE'">
          <t-select
            v-model="formData.warehouseId"
            placeholder="请选择所属仓库"
            clearable
            :options="warehouseOptions"
          />
          <span class="form-tip">库管只能查看和处理所属仓库的订单</span>
        </t-form-item>
        <t-form-item label="状态" name="status" v-if="formMode === 'edit'">
          <t-radio-group v-model="formData.status">
            <t-radio value="ACTIVE">正常</t-radio>
            <t-radio value="DISABLED">禁用</t-radio>
          </t-radio-group>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 重置密码弹窗 -->
    <t-dialog
      v-model:visible="passwordVisible"
      header="重置密码"
      :width="460"
      :confirm-btn="{ content: '确定', loading: passwordSubmitting }"
      @confirm="handlePasswordSubmit"
    >
      <t-form
        :data="passwordData"
        :rules="passwordRules"
        ref="passwordFormRef"
        label-width="100px"
      >
        <t-form-item label="员工" class="readonly-item">
          <span>{{ currentStaff?.name }} ({{ currentStaff?.username }})</span>
        </t-form-item>
        <t-form-item label="新密码" name="newPassword">
          <t-input
            v-model="passwordData.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
          />
        </t-form-item>
        <t-form-item label="确认密码" name="confirmPassword">
          <t-input
            v-model="passwordData.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
          />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { PageHeader, TableCard, EmptyState } from '@/components'
import { getStaffList, createStaff, updateStaff, resetPassword as resetStaffPassword } from '@/api/staff'
import { getActiveWarehouses } from '@/api/warehouse'  // 【2026-01-13 多仓库支持】

// 筛选条件
const filters = reactive({
  keyword: '',
  role: '',
  status: ''
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
  { colKey: 'username', title: '用户名', width: 150 },
  { colKey: 'name', title: '姓名', width: 120 },
  { colKey: 'phone', title: '手机号', width: 130 },
  { colKey: 'role', title: '角色', width: 100 },
  { colKey: 'warehouse', title: '所属仓库', width: 150 },  // 【2026-01-13 多仓库支持】
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 250, fixed: 'right' }
]

// 表单相关
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const formSubmitting = ref(false)
const formRef = ref<any>(null)
const formData = reactive({
  id: 0,
  username: '',
  password: '',
  name: '',
  phone: '',
  role: 'WAREHOUSE',
  status: 'ACTIVE',
  warehouseId: null as number | null  // 【2026-01-13 多仓库支持】
})

// 仓库列表【2026-01-13 多仓库支持】
const warehouseOptions = ref<{value: number, label: string}[]>([])

// 表单验证规则
const formRules = {
  username: [
    { required: true, message: '请输入用户名' },
    { pattern: /^[a-zA-Z0-9_]{4,20}$/, message: '用户名必须是4-20位字母、数字或下划线' }
  ],
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, message: '密码长度不能少于6位' }
  ],
  name: [
    { required: true, message: '请输入姓名' }
  ],
  role: [
    { required: true, message: '请选择角色' }
  ]
}

// 重置密码相关
const passwordVisible = ref(false)
const passwordSubmitting = ref(false)
const passwordFormRef = ref<any>(null)
const currentStaff = ref<any>(null)
const passwordData = reactive({
  newPassword: '',
  confirmPassword: ''
})

const passwordRules = {
  newPassword: [
    { required: true, message: '请输入新密码' },
    { min: 6, message: '密码长度不能少于6位' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码' },
    {
      validator: (val: string) => val === passwordData.newPassword,
      message: '两次输入的密码不一致'
    }
  ]
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res = await getStaffList({
      page: pagination.current,
      pageSize: pagination.pageSize,
      ...filters
    })
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
  filters.keyword = ''
  filters.role = ''
  filters.status = ''
  handleSearch()
}

// 翻页
const handlePageChange = (pageInfo: any) => {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  loadData()
}

// 加载仓库列表【2026-01-13 多仓库支持】
const loadWarehouses = async () => {
  try {
    const res = await getActiveWarehouses()
    warehouseOptions.value = (res.data || []).map((w: any) => ({
      value: w.id,
      label: `${w.name} (${w.code})`
    }))
  } catch (error) {
    console.error('加载仓库列表失败:', error)
  }
}

// 角色切换时清空仓库【2026-01-13】
const handleRoleChange = (val: string) => {
  if (val !== 'WAREHOUSE') {
    formData.warehouseId = null
  }
}

// 新建
const handleCreate = () => {
  formMode.value = 'create'
  Object.assign(formData, {
    id: 0,
    username: '',
    password: '',
    name: '',
    phone: '',
    role: 'WAREHOUSE',
    status: 'ACTIVE',
    warehouseId: null  // 【2026-01-13】
  })
  formVisible.value = true
}

// 编辑
const handleEdit = (row: any) => {
  formMode.value = 'edit'
  Object.assign(formData, {
    id: row.id,
    username: row.username,
    name: row.name,
    phone: row.phone || '',
    role: row.role,
    status: row.status,
    warehouseId: row.warehouseId || null  // 【2026-01-13】
  })
  formVisible.value = true
}

// 提交表单
const handleFormSubmit = async () => {
  const valid = await formRef.value?.validate()
  if (!valid) return

  formSubmitting.value = true
  try {
    if (formMode.value === 'create') {
      await createStaff({
        username: formData.username,
        password: formData.password,
        name: formData.name,
        phone: formData.phone || undefined,
        role: formData.role,
        warehouseId: formData.warehouseId || undefined  // 【2026-01-13 多仓库支持】
      })
      MessagePlugin.success('创建成功')
    } else {
      await updateStaff(formData.id, {
        name: formData.name,
        phone: formData.phone || undefined,
        status: formData.status,
        warehouseId: formData.role === 'WAREHOUSE' ? formData.warehouseId : undefined  // 【2026-01-13】
      })
      MessagePlugin.success('更新成功')
    }
    formVisible.value = false
    loadData()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  } finally {
    formSubmitting.value = false
  }
}

// 重置密码
const handleResetPassword = (row: any) => {
  currentStaff.value = row
  passwordData.newPassword = ''
  passwordData.confirmPassword = ''
  passwordVisible.value = true
}

// 提交重置密码
const handlePasswordSubmit = async () => {
  const valid = await passwordFormRef.value?.validate()
  if (!valid) return

  passwordSubmitting.value = true
  try {
    await resetStaffPassword(currentStaff.value.id, {
      newPassword: passwordData.newPassword
    })
    MessagePlugin.success('密码重置成功')
    passwordVisible.value = false
  } catch (error: any) {
    MessagePlugin.error(error.message || '密码重置失败')
  } finally {
    passwordSubmitting.value = false
  }
}

// 禁用
const handleDisable = async (row: any) => {
  try {
    await updateStaff(row.id, { status: 'DISABLED' })
    MessagePlugin.success('已禁用')
    loadData()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  }
}

// 启用
const handleEnable = async (row: any) => {
  try {
    await updateStaff(row.id, { status: 'ACTIVE' })
    MessagePlugin.success('已启用')
    loadData()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  }
}

onMounted(() => {
  loadData()
  loadWarehouses()  // 【2026-01-13 多仓库支持】
})
</script>

<style scoped lang="scss">
.staff-page {
  padding: 0;
}

.filter-card {
  margin-bottom: 16px;
}

.readonly-item {
  span {
    color: var(--td-text-color-primary);
    font-weight: 500;
  }
}

/* 【2026-01-13 多仓库支持】 */
.form-tip {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.text-placeholder {
  color: var(--td-text-color-placeholder);
}
</style>
