<template>
  <div class="product-page">
    <el-card shadow="never">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-form :inline="true" :model="searchForm">
          <el-form-item label="商品名称">
            <el-input v-model="searchForm.keyword" placeholder="请输入商品名称" clearable />
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="searchForm.categoryId" placeholder="全部分类" clearable>
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
                :value="cat.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="全部状态" clearable>
              <el-option label="上架" :value="1" />
              <el-option label="下架" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增商品
        </el-button>
      </div>

      <!-- 表格 -->
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column type="index" label="#" width="60" />
        <el-table-column label="商品图片" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.image"
              :preview-src-list="[row.image]"
              fit="cover"
              class="product-image"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" min-width="180" />
        <el-table-column prop="categoryName" label="分类" width="120" />
        <el-table-column label="价格" width="100">
          <template #default="{ row }">
            <span class="price">¥{{ row.price }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="100" />
        <el-table-column prop="sales" label="销量" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '上架' : '下架' }}
            </el-tag>
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
              {{ row.status === 1 ? '下架' : '上架' }}
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="商品图片" prop="image">
          <el-input v-model="form.image" placeholder="请输入图片URL" />
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number v-model="form.price" :precision="2" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="库存" prop="stock">
          <el-input-number v-model="form.stock" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="规格" prop="spec">
          <el-input v-model="form.spec" placeholder="如: 1箱/10盒" />
        </el-form-item>
        <el-form-item label="商品描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入商品描述"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">上架</el-radio>
            <el-radio :value="0">下架</el-radio>
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
import { getProductList, createProduct, updateProduct, deleteProduct } from '@/api/product'
import { getCategoryList } from '@/api/product'

interface Product {
  id: number
  name: string
  categoryId: number
  categoryName: string
  image: string
  price: number
  stock: number
  sales: number
  spec: string
  description: string
  status: number
}

interface Category {
  id: number
  name: string
}

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)

const searchForm = reactive({
  keyword: '',
  categoryId: undefined as number | undefined,
  status: undefined as number | undefined,
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const tableData = ref<Product[]>([])
const categories = ref<Category[]>([])

const formRef = ref<FormInstance>()
const form = reactive({
  id: 0,
  name: '',
  categoryId: undefined as number | undefined,
  image: '',
  price: 0,
  stock: 0,
  spec: '',
  description: '',
  status: 1,
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
}

const dialogTitle = computed(() => (isEdit.value ? '编辑商品' : '新增商品'))

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getProductList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      categoryId: searchForm.categoryId,
      status: searchForm.status,
    })
    if (res.data) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取商品列表失败', error)
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const res = await getCategoryList()
    if (res.data) {
      categories.value = res.data
    }
  } catch (error) {
    console.error('获取分类列表失败', error)
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.categoryId = undefined
  searchForm.status = undefined
  handleSearch()
}

const resetForm = () => {
  form.id = 0
  form.name = ''
  form.categoryId = undefined
  form.image = ''
  form.price = 0
  form.stock = 0
  form.spec = ''
  form.description = ''
  form.status = 1
}

const handleAdd = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row: Product) => {
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    image: row.image,
    price: row.price,
    stock: row.stock,
    spec: row.spec,
    description: row.description,
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
        await updateProduct(form.id, form)
        ElMessage.success('编辑成功')
      } else {
        await createProduct(form)
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

const handleToggleStatus = async (row: Product) => {
  const newStatus = row.status === 1 ? 0 : 1
  const action = newStatus === 1 ? '上架' : '下架'

  try {
    await ElMessageBox.confirm(`确定要${action}该商品吗？`, '提示', { type: 'warning' })
    await updateProduct(row.id, { status: newStatus })
    ElMessage.success(`${action}成功`)
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

const handleDelete = async (row: Product) => {
  try {
    await ElMessageBox.confirm('确定要删除该商品吗？', '提示', { type: 'warning' })
    await deleteProduct(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

onMounted(() => {
  fetchCategories()
  fetchData()
})
</script>

<style lang="scss" scoped>
.product-page {
  .search-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .product-image {
    width: 60px;
    height: 60px;
    border-radius: 4px;
  }

  .price {
    color: #f56c6c;
    font-weight: 600;
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
