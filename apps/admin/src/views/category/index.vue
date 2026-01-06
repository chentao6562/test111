<template>
  <div class="category-page">
    <el-card shadow="never">
      <!-- 操作栏 -->
      <div class="action-bar">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增分类
        </el-button>
      </div>

      <!-- 表格 -->
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column type="index" label="#" width="60" />
        <el-table-column label="分类图标" width="100">
          <template #default="{ row }">
            <el-image
              v-if="row.icon"
              :src="row.icon"
              fit="cover"
              class="category-icon"
            />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="分类名称" min-width="150" />
        <el-table-column prop="sort" label="排序" width="100" />
        <el-table-column prop="productCount" label="商品数量" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button
              :type="row.status === 1 ? 'warning' : 'success'"
              link
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="分类图标" prop="icon">
          <el-input v-model="form.icon" placeholder="请输入图标URL" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
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
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getCategoryList, createCategory, updateCategory, deleteCategory } from '@/api/product'

interface Category {
  id: number
  name: string
  icon: string
  sort: number
  status: number
  productCount: number
  createdAt: string
}

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)

const tableData = ref<Category[]>([])

const formRef = ref<FormInstance>()
const form = reactive({
  id: 0,
  name: '',
  icon: '',
  sort: 0,
  status: 1,
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
}

const dialogTitle = computed(() => (isEdit.value ? '编辑分类' : '新增分类'))

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getCategoryList()
    if (res.data) {
      tableData.value = res.data
    }
  } catch (error) {
    console.error('获取分类列表失败', error)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.id = 0
  form.name = ''
  form.icon = ''
  form.sort = 0
  form.status = 1
}

const handleAdd = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row: Category) => {
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    name: row.name,
    icon: row.icon,
    sort: row.sort,
    status: row.status,
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitLoading.value = true
    try {
      if (isEdit.value) {
        await updateCategory(form.id, form)
        ElMessage.success('编辑成功')
      } else {
        await createCategory(form)
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
      fetchData()
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    } finally {
      submitLoading.value = false
    }
  })
}

const handleToggleStatus = async (row: Category) => {
  const newStatus = row.status === 1 ? 0 : 1
  const action = newStatus === 1 ? '启用' : '禁用'

  try {
    await ElMessageBox.confirm(`确定要${action}该分类吗？`, '提示', { type: 'warning' })
    await updateCategory(row.id, { status: newStatus })
    ElMessage.success(`${action}成功`)
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

const handleDelete = async (row: Category) => {
  try {
    await ElMessageBox.confirm('确定要删除该分类吗？删除后该分类下的商品将无法显示分类。', '提示', { type: 'warning' })
    await deleteCategory(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.category-page {
  .action-bar {
    margin-bottom: 20px;
  }

  .category-icon {
    width: 40px;
    height: 40px;
    border-radius: 4px;
  }
}
</style>
