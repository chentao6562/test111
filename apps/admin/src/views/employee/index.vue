<template>
  <!-- 套用设计稿风格: 员工管理页面 -->
  <div class="flex flex-col gap-6">
    <!-- 页面标题区域 -->
    <div class="flex flex-wrap justify-between items-center gap-4">
      <div>
        <h3 class="text-2xl font-black text-text-main tracking-tight">员工管理</h3>
        <p class="text-text-secondary text-sm mt-1">管理库管员、货管员等系统用户</p>
      </div>
      <button
        @click="handleAdd"
        class="flex items-center gap-2 bg-primary hover:bg-[#c9240e] text-white px-6 py-2.5 rounded-lg shadow-lg shadow-primary/30 transition-all active:scale-95"
      >
        <span class="material-symbols-outlined text-lg">person_add</span>
        <span class="font-bold text-sm">添加员工</span>
      </button>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl p-5 border border-[#f3e8e8] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
        <div class="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-full -mr-4 -mt-4"></div>
        <div class="relative z-10 flex flex-col gap-2">
          <div class="flex items-center gap-2 text-text-secondary">
            <span class="material-symbols-outlined text-blue-500">groups</span>
            <span class="text-sm font-medium">全部员工</span>
          </div>
          <p class="text-2xl font-black text-text-main">{{ stats.total }}</p>
        </div>
      </div>
      <div class="bg-white rounded-xl p-5 border border-[#f3e8e8] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
        <div class="absolute top-0 right-0 w-20 h-20 bg-green-50 rounded-bl-full -mr-4 -mt-4"></div>
        <div class="relative z-10 flex flex-col gap-2">
          <div class="flex items-center gap-2 text-text-secondary">
            <span class="material-symbols-outlined text-green-500">inventory_2</span>
            <span class="text-sm font-medium">库管员</span>
          </div>
          <p class="text-2xl font-black text-text-main">{{ stats.warehouse }}</p>
        </div>
      </div>
      <div class="bg-white rounded-xl p-5 border border-[#f3e8e8] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
        <div class="absolute top-0 right-0 w-20 h-20 bg-orange-50 rounded-bl-full -mr-4 -mt-4"></div>
        <div class="relative z-10 flex flex-col gap-2">
          <div class="flex items-center gap-2 text-text-secondary">
            <span class="material-symbols-outlined text-orange-500">local_shipping</span>
            <span class="text-sm font-medium">货管员</span>
          </div>
          <p class="text-2xl font-black text-text-main">{{ stats.porter }}</p>
        </div>
      </div>
      <div class="bg-white rounded-xl p-5 border border-[#f3e8e8] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
        <div class="absolute top-0 right-0 w-20 h-20 bg-gray-100 rounded-bl-full -mr-4 -mt-4"></div>
        <div class="relative z-10 flex flex-col gap-2">
          <div class="flex items-center gap-2 text-text-secondary">
            <span class="material-symbols-outlined text-gray-500">person_off</span>
            <span class="text-sm font-medium">已禁用</span>
          </div>
          <p class="text-2xl font-black text-text-main">{{ stats.disabled }}</p>
        </div>
      </div>
    </div>

    <!-- 搜索筛选区 -->
    <div class="bg-white rounded-xl border border-[#f3e8e8] p-5 shadow-sm">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-text-secondary uppercase tracking-wider">员工姓名</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[20px]">search</span>
            <input
              v-model="searchForm.keyword"
              class="w-full pl-10 h-10 rounded-lg border border-[#e6d0d0] bg-background-light text-sm focus:border-primary focus:ring-1 focus:ring-primary/20"
              placeholder="输入姓名或手机号..."
            />
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-text-secondary uppercase tracking-wider">员工类型</label>
          <select
            v-model="searchForm.role"
            class="w-full h-10 rounded-lg border border-[#e6d0d0] bg-background-light text-sm focus:border-primary focus:ring-1 focus:ring-primary/20"
          >
            <option value="">全部类型</option>
            <option value="warehouse">库管员</option>
            <option value="porter">货管员</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-text-secondary uppercase tracking-wider">状态</label>
          <select
            v-model="searchForm.status"
            class="w-full h-10 rounded-lg border border-[#e6d0d0] bg-background-light text-sm focus:border-primary focus:ring-1 focus:ring-primary/20"
          >
            <option value="">全部状态</option>
            <option :value="1">正常</option>
            <option :value="0">禁用</option>
          </select>
        </div>
        <div class="flex items-end gap-3">
          <button
            @click="handleSearch"
            class="flex-1 h-10 rounded-lg bg-text-main text-white hover:bg-black font-bold text-sm transition-colors"
          >
            搜索
          </button>
          <button
            @click="handleReset"
            class="h-10 px-4 rounded-lg border border-[#e6d0d0] text-text-secondary hover:bg-gray-50 font-medium text-sm transition-colors"
          >
            重置
          </button>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="bg-white rounded-xl border border-[#f3e8e8] shadow-sm overflow-hidden flex flex-col">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50/80 border-b border-[#f3e8e8]">
              <th class="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">员工信息</th>
              <th class="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">手机号</th>
              <th class="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">类型</th>
              <th class="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider text-center">状态</th>
              <th class="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">入职时间</th>
              <th class="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#f3e8e8]">
            <tr
              v-for="item in tableData"
              :key="item.id"
              class="group hover:bg-primary/5 transition-colors"
            >
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <div
                    :class="[
                      'size-10 rounded-full flex items-center justify-center text-sm font-bold',
                      item.role === 'warehouse' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    ]"
                  >
                    {{ item.name.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-semibold text-text-main">{{ item.name }}</p>
                    <p class="text-xs text-text-secondary">ID: {{ item.id }}</p>
                  </div>
                </div>
              </td>
              <td class="py-4 px-6 text-sm text-text-main font-mono">{{ item.phone }}</td>
              <td class="py-4 px-6">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold',
                    item.role === 'warehouse'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-orange-50 text-orange-700 border border-orange-200'
                  ]"
                >
                  <span class="material-symbols-outlined text-sm">
                    {{ item.role === 'warehouse' ? 'inventory_2' : 'local_shipping' }}
                  </span>
                  {{ item.role === 'warehouse' ? '库管员' : '货管员' }}
                </span>
              </td>
              <td class="py-4 px-6 text-center">
                <span
                  :class="[
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    item.status === 1
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  ]"
                >
                  <span :class="['size-1.5 rounded-full', item.status === 1 ? 'bg-green-500' : 'bg-gray-400']"></span>
                  {{ item.status === 1 ? '正常' : '禁用' }}
                </span>
              </td>
              <td class="py-4 px-6 text-sm text-text-secondary">{{ formatDate(item.createdAt) }}</td>
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="handleEdit(item)"
                    class="text-primary hover:text-[#c9240e] font-medium text-sm flex items-center gap-1"
                  >
                    <span class="material-symbols-outlined text-lg">edit</span>
                    编辑
                  </button>
                  <div class="w-px h-4 bg-gray-200"></div>
                  <button
                    @click="handleToggleStatus(item)"
                    :class="[
                      'font-medium text-sm',
                      item.status === 1 ? 'text-gray-500 hover:text-red-600' : 'text-green-600 hover:text-green-700'
                    ]"
                  >
                    {{ item.status === 1 ? '禁用' : '启用' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="tableData.length === 0">
              <td colspan="6" class="py-12 text-center text-text-secondary">
                <span class="material-symbols-outlined text-4xl text-gray-300 mb-2">person_off</span>
                <p>暂无员工数据</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="flex items-center justify-between px-6 py-4 bg-white border-t border-[#f3e8e8]">
        <p class="text-sm text-text-secondary">
          显示 <span class="font-bold text-text-main">{{ (pagination.page - 1) * pagination.pageSize + 1 }}</span>
          到 <span class="font-bold text-text-main">{{ Math.min(pagination.page * pagination.pageSize, pagination.total) }}</span>
          条，共 <span class="font-bold text-text-main">{{ pagination.total }}</span> 条
        </p>
        <div class="flex gap-1">
          <button
            @click="pagination.page > 1 && (pagination.page--, fetchData())"
            :disabled="pagination.page <= 1"
            class="w-8 h-8 flex items-center justify-center rounded border border-[#e6d0d0] text-text-secondary hover:bg-gray-50 disabled:opacity-50"
          >
            <span class="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <button
            v-for="p in displayPages"
            :key="p"
            @click="typeof p === 'number' && (pagination.page = p, fetchData())"
            :class="[
              'w-8 h-8 flex items-center justify-center rounded text-sm transition-colors',
              p === pagination.page
                ? 'bg-primary text-white font-bold'
                : typeof p === 'number'
                  ? 'border border-[#e6d0d0] text-text-secondary hover:bg-gray-50 hover:text-primary'
                  : 'text-text-secondary cursor-default'
            ]"
          >
            {{ p }}
          </button>
          <button
            @click="pagination.page < totalPages && (pagination.page++, fetchData())"
            :disabled="pagination.page >= totalPages"
            class="w-8 h-8 flex items-center justify-center rounded border border-[#e6d0d0] text-text-secondary hover:bg-gray-50 disabled:opacity-50"
          >
            <span class="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑员工' : '添加员工'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入员工姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="类型" prop="role">
          <el-select v-model="form.role" placeholder="请选择员工类型" style="width: 100%">
            <el-option label="库管员" value="warehouse" />
            <el-option label="货管员" value="porter" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入登录密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'

interface Employee {
  id: number
  name: string
  phone: string
  role: 'warehouse' | 'porter'
  status: number
  createdAt: string
}

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)

const stats = reactive({
  total: 15,
  warehouse: 8,
  porter: 5,
  disabled: 2,
})

const searchForm = reactive({
  keyword: '',
  role: '',
  status: '' as number | '',
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 15,
})

const tableData = ref<Employee[]>([
  { id: 1, name: '王建军', phone: '138-0001-0001', role: 'warehouse', status: 1, createdAt: '2024-01-15T10:00:00' },
  { id: 2, name: '李晓明', phone: '139-0002-0002', role: 'warehouse', status: 1, createdAt: '2024-01-20T14:30:00' },
  { id: 3, name: '张伟', phone: '150-0003-0003', role: 'porter', status: 1, createdAt: '2024-02-01T09:00:00' },
  { id: 4, name: '陈刚', phone: '136-0004-0004', role: 'porter', status: 0, createdAt: '2024-02-05T16:00:00' },
  { id: 5, name: '刘芳', phone: '158-0005-0005', role: 'warehouse', status: 1, createdAt: '2024-02-10T11:00:00' },
])

const formRef = ref<FormInstance>()
const form = reactive({
  id: 0,
  name: '',
  phone: '',
  role: '' as 'warehouse' | 'porter' | '',
  password: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入员工姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  role: [{ required: true, message: '请选择员工类型', trigger: 'change' }],
  password: [{ required: true, message: '请输入登录密码', trigger: 'blur' }],
}

const totalPages = computed(() => Math.ceil(pagination.total / pagination.pageSize))

const displayPages = computed(() => {
  const pages: (number | string)[] = []
  const total = totalPages.value
  const current = pagination.page

  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    if (current <= 3) {
      pages.push(1, 2, 3, '...', total)
    } else if (current >= total - 2) {
      pages.push(1, '...', total - 2, total - 1, total)
    } else {
      pages.push(1, '...', current, '...', total)
    }
  }
  return pages
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const fetchData = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 500))
  } catch (error) {
    console.error('获取员工列表失败', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.role = ''
  searchForm.status = ''
  handleSearch()
}

const handleAdd = () => {
  isEdit.value = false
  form.id = 0
  form.name = ''
  form.phone = ''
  form.role = ''
  form.password = ''
  dialogVisible.value = true
}

const handleEdit = (row: Employee) => {
  isEdit.value = true
  form.id = row.id
  form.name = row.name
  form.phone = row.phone.replace(/-/g, '')
  form.role = row.role
  form.password = ''
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitLoading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      ElMessage.success(isEdit.value ? '编辑成功' : '添加成功')
      dialogVisible.value = false
      fetchData()
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    } finally {
      submitLoading.value = false
    }
  })
}

const handleToggleStatus = async (row: Employee) => {
  const action = row.status === 1 ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确定要${action}该员工吗？`, '提示', { type: 'warning' })
    row.status = row.status === 1 ? 0 : 1
    ElMessage.success(`${action}成功`)
  } catch {
    // 取消
  }
}

onMounted(() => {
  fetchData()
})
</script>
