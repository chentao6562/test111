<template>
  <div class="flex flex-col gap-6">
    <!-- Page Heading & Actions -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <p class="text-text-secondary mt-1 text-sm">配置不同金额区间的代理商分润比例</p>
      </div>
      <div class="flex gap-3">
        <button
          @click="handleAdd"
          class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors shadow-sm shadow-primary/30"
        >
          <span class="material-symbols-outlined text-[18px]">add</span>
          添加规则
        </button>
      </div>
    </div>

    <!-- Rules Table -->
    <div class="bg-white rounded-xl border border-[#f3e8e8] shadow-sm flex flex-col">
      <!-- Toolbar -->
      <div class="p-5 border-b border-[#f3e8e8] flex flex-col md:flex-row justify-between gap-4 items-center">
        <div class="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <h3 class="text-lg font-bold text-text-main mr-2">分润规则列表</h3>
          <select
            v-model="searchForm.status"
            class="px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-sm text-text-secondary focus:outline-none focus:border-primary cursor-pointer"
            @change="handleSearch"
          >
            <option value="">全部状态</option>
            <option :value="1">已启用</option>
            <option :value="0">已禁用</option>
          </select>
        </div>
        <button
          @click="handleReset"
          class="px-4 py-2 bg-white border border-[#e5e7eb] text-text-secondary rounded-lg text-sm font-medium hover:bg-background-light transition-colors"
        >
          重置
        </button>
      </div>

      <!-- Data Table -->
      <div class="overflow-x-auto" v-loading="loading">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-background-light text-text-secondary font-semibold border-b border-[#f3e8e8]">
            <tr>
              <th class="px-6 py-4">排序</th>
              <th class="px-6 py-4">规则名称</th>
              <th class="px-6 py-4">金额区间</th>
              <th class="px-6 py-4 text-center">一级分润</th>
              <th class="px-6 py-4 text-center">二级分润</th>
              <th class="px-6 py-4 text-center">状态</th>
              <th class="px-6 py-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#f3e8e8]">
            <tr
              v-for="item in tableData"
              :key="item.id"
              class="hover:bg-[#fff7f7] transition-colors group"
            >
              <td class="px-6 py-4">
                <span class="inline-flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                  {{ item.sort }}
                </span>
              </td>
              <td class="px-6 py-4 font-medium text-text-main">{{ item.name }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <span class="text-primary font-medium">¥{{ formatAmount(item.minAmount) }}</span>
                  <span class="text-text-secondary">~</span>
                  <span class="text-primary font-medium">
                    {{ item.maxAmount ? `¥${formatAmount(item.maxAmount)}` : '无上限' }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#fff0f0] text-primary border border-primary/20">
                  <span class="material-symbols-outlined text-[14px]">stars</span>
                  {{ formatRate(item.level1Rate) }}%
                </span>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#fffdf0] text-[#d4af37] border border-[#d4af37]/30">
                  <span class="material-symbols-outlined text-[14px]">workspace_premium</span>
                  {{ formatRate(item.level2Rate) }}%
                </span>
              </td>
              <td class="px-6 py-4 text-center">
                <el-switch
                  :model-value="item.status === 1"
                  @change="(val: boolean) => handleStatusChange(item, val)"
                  inline-prompt
                  active-text="启用"
                  inactive-text="禁用"
                />
              </td>
              <td class="px-6 py-4 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button
                    @click="handleEdit(item)"
                    class="text-text-secondary hover:text-primary transition-colors p-1"
                    title="编辑"
                  >
                    <span class="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    @click="handleDelete(item)"
                    class="text-text-secondary hover:text-red-500 transition-colors p-1"
                    title="删除"
                  >
                    <span class="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </td>
            </tr>
            <!-- 空状态 -->
            <tr v-if="tableData.length === 0 && !loading">
              <td colspan="7" class="px-6 py-8 text-center text-text-secondary">
                <span class="material-symbols-outlined text-4xl mb-2 block">rule</span>
                暂无分润规则，请添加规则
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="p-4 border-t border-[#f3e8e8] flex items-center justify-between" v-if="pagination.total > 0">
        <span class="text-sm text-text-secondary">
          显示 {{ (pagination.page - 1) * pagination.pageSize + 1 }} 到
          {{ Math.min(pagination.page * pagination.pageSize, pagination.total) }} 条，共 {{ pagination.total }} 条记录
        </span>
        <div class="flex items-center gap-2">
          <button
            @click="handlePageChange(pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="px-3 py-1 text-sm border border-[#e5e7eb] rounded hover:bg-gray-50 disabled:opacity-50"
          >
            上一页
          </button>
          <button
            @click="handlePageChange(pagination.page + 1)"
            :disabled="pagination.page >= totalPages"
            class="px-3 py-1 text-sm border border-[#e5e7eb] rounded hover:bg-gray-50 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- Help Card -->
    <div class="bg-gradient-to-r from-[#211111] to-[#3a1d1d] rounded-xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg relative overflow-hidden">
      <div class="absolute right-0 top-0 h-full w-1/3 bg-primary/10 -skew-x-12 transform translate-x-10"></div>
      <div class="z-10 flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#d4af37]">info</span>
          <h3 class="text-lg font-bold">规则说明</h3>
        </div>
        <p class="text-white/70 text-sm max-w-2xl">
          分润规则按 <span class="text-[#d4af37] font-bold">排序值</span> 从小到大匹配，匹配到第一个符合条件的规则后停止。
          建议按金额区间从低到高设置排序值。如果没有匹配到任何规则，将使用系统默认分润比例（一级10%，二级2%）。
        </p>
      </div>
    </div>
  </div>

  <!-- 添加/编辑弹窗 -->
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑分润规则' : '添加分润规则'"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      class="pr-4"
    >
      <el-form-item label="规则名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入规则名称，如：基础档" />
      </el-form-item>
      <el-form-item label="最低金额" prop="minAmount">
        <el-input-number
          v-model="formData.minAmount"
          :min="0"
          :precision="2"
          :step="10"
          placeholder="含此金额"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item label="最高金额" prop="maxAmount">
        <div class="flex items-center gap-3 w-full">
          <el-input-number
            v-model="formData.maxAmount"
            :min="0"
            :precision="2"
            :step="10"
            :disabled="noMaxLimit"
            placeholder="不含此金额"
            class="!flex-1"
          />
          <el-checkbox v-model="noMaxLimit">无上限</el-checkbox>
        </div>
      </el-form-item>
      <el-form-item label="一级分润" prop="level1Rate">
        <el-input-number
          v-model="formData.level1Rate"
          :min="0"
          :max="100"
          :precision="2"
          :step="1"
          class="!w-full"
        />
        <template #suffix>%</template>
      </el-form-item>
      <el-form-item label="二级分润" prop="level2Rate">
        <el-input-number
          v-model="formData.level2Rate"
          :min="0"
          :max="100"
          :precision="2"
          :step="1"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number
          v-model="formData.sort"
          :min="0"
          :max="999"
          :step="1"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-switch
          v-model="formData.status"
          :active-value="1"
          :inactive-value="0"
          inline-prompt
          active-text="启用"
          inactive-text="禁用"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? '保存修改' : '确认添加' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  getCommissionRuleList,
  createCommissionRule,
  updateCommissionRule,
  deleteCommissionRule,
  type CommissionRule,
  type CreateCommissionRuleDto,
} from '@/api/commission-rule'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const noMaxLimit = ref(false)
const formRef = ref<FormInstance>()

const searchForm = reactive({
  status: '' as '' | number,
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const tableData = ref<CommissionRule[]>([])

const formData = reactive({
  name: '',
  minAmount: 0,
  maxAmount: null as number | null,
  level1Rate: 10,
  level2Rate: 2,
  sort: 0,
  status: 1,
})

const formRules: FormRules = {
  name: [
    { required: true, message: '请输入规则名称', trigger: 'blur' },
    { max: 50, message: '规则名称不能超过50个字符', trigger: 'blur' },
  ],
  minAmount: [
    { required: true, message: '请输入最低金额', trigger: 'blur' },
  ],
  level1Rate: [
    { required: true, message: '请输入一级分润比例', trigger: 'blur' },
  ],
  level2Rate: [
    { required: true, message: '请输入二级分润比例', trigger: 'blur' },
  ],
}

const totalPages = computed(() => Math.ceil(pagination.total / pagination.pageSize) || 1)

// 监听无上限复选框
watch(noMaxLimit, (val) => {
  if (val) {
    formData.maxAmount = null
  }
})

const formatAmount = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return num.toFixed(2)
}

const formatRate = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return (num * 100).toFixed(2)
}

const fetchData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (searchForm.status !== '') {
      params.status = searchForm.status
    }

    const res = await getCommissionRuleList(params)
    if (res.data) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取分润规则列表失败', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  searchForm.status = ''
  handleSearch()
}

const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  pagination.page = page
  fetchData()
}

const resetForm = () => {
  formData.name = ''
  formData.minAmount = 0
  formData.maxAmount = null
  formData.level1Rate = 10
  formData.level2Rate = 2
  formData.sort = 0
  formData.status = 1
  noMaxLimit.value = false
  editingId.value = null
}

const handleAdd = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (item: CommissionRule) => {
  isEdit.value = true
  editingId.value = item.id
  formData.name = item.name
  formData.minAmount = parseFloat(item.minAmount)
  formData.maxAmount = item.maxAmount ? parseFloat(item.maxAmount) : null
  formData.level1Rate = parseFloat(item.level1Rate) * 100
  formData.level2Rate = parseFloat(item.level2Rate) * 100
  formData.sort = item.sort
  formData.status = item.status
  noMaxLimit.value = item.maxAmount === null
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const data: CreateCommissionRuleDto = {
      name: formData.name,
      minAmount: formData.minAmount,
      maxAmount: noMaxLimit.value ? null : formData.maxAmount,
      level1Rate: formData.level1Rate / 100,
      level2Rate: formData.level2Rate / 100,
      sort: formData.sort,
      status: formData.status,
    }

    if (isEdit.value && editingId.value) {
      await updateCommissionRule(editingId.value, data)
      ElMessage.success('修改成功')
    } else {
      await createCommissionRule(data)
      ElMessage.success('添加成功')
    }

    dialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('保存规则失败', error)
  } finally {
    submitting.value = false
  }
}

const handleStatusChange = async (item: CommissionRule, enabled: boolean) => {
  try {
    await updateCommissionRule(item.id, { status: enabled ? 1 : 0 })
    ElMessage.success(enabled ? '已启用' : '已禁用')
    fetchData()
  } catch (error) {
    console.error('更新状态失败', error)
  }
}

const handleDelete = async (item: CommissionRule) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除规则「${item.name}」吗？删除后不可恢复。`,
      '确认删除',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
      }
    )

    await deleteCommissionRule(item.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除规则失败', error)
    }
  }
}

onMounted(() => {
  fetchData()
})
</script>
