<template>
  <div class="category-page">
    <!-- 页面标题 -->
    <PageHeader title="分类管理" subtitle="管理商品分类，设置分类图标和排序">
      <template #actions>
        <t-button theme="primary" @click="handleAdd">
          <template #icon><t-icon name="add" /></template>
          新增分类
        </t-button>
      </template>
    </PageHeader>

    <!-- 分类列表 -->
    <TableCard title="分类列表">
      <t-table
        :data="categoryList"
        :columns="columns"
        :loading="loading"
        row-key="id"
        stripe
        hover
      >
        <template #empty>
          <EmptyState type="data" title="暂无分类" description="点击右上角新增分类" />
        </template>
        <!-- 图标列 -->
        <!-- 注意：此处使用 v-html 是安全的，因为 iconMap 来源于硬编码的 categoryIconsData.ts -->
        <!-- 如果将来需要支持用户自定义图标，必须使用 DOMPurify 进行净化 -->
        <template #icon="{ row }">
          <div class="category-icon-cell">
            <div v-if="row.icon && iconMap[row.icon]" class="svg-icon" v-html="iconMap[row.icon]"></div>
            <div v-else class="default-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="8" width="32" height="32" rx="4" fill="#e5e7eb"/>
                <path d="M24 16V32M16 24H32" stroke="#9ca3af" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </div>
          </div>
        </template>

        <!-- 状态列 -->
        <template #status="{ row }">
          <t-tag :theme="row.status === 'ACTIVE' ? 'success' : 'default'">
            {{ row.status === 'ACTIVE' ? '启用' : '禁用' }}
          </t-tag>
        </template>

        <!-- 商品数量列 -->
        <template #productCount="{ row }">
          <t-tag theme="primary" variant="light">{{ row.productCount || 0 }}</t-tag>
        </template>

        <!-- 操作列 -->
        <template #operation="{ row }">
          <t-space>
            <t-link theme="primary" hover="color" @click="handleEdit(row)">编辑</t-link>
            <t-link
              :theme="row.status === 'ACTIVE' ? 'warning' : 'success'"
              hover="color"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 'ACTIVE' ? '禁用' : '启用' }}
            </t-link>
            <t-popconfirm
              content="确定要删除该分类吗？"
              theme="danger"
              @confirm="handleDelete(row)"
            >
              <t-link theme="danger" hover="color">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </TableCard>

    <!-- 新增/编辑弹窗 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="isEdit ? '编辑分类' : '新增分类'"
      :confirm-btn="{ loading: submitLoading }"
      @confirm="handleSubmit"
    >
      <t-form
        ref="formRef"
        :data="formData"
        :rules="formRules"
        label-width="80px"
      >
        <t-form-item label="分类名称" name="name">
          <t-input v-model="formData.name" placeholder="请输入分类名称" maxlength="50" />
        </t-form-item>
        <t-form-item label="分类图标" name="icon">
          <div class="icon-selector">
            <div
              class="selected-icon"
              :class="{ 'has-icon': formData.icon && iconMap[formData.icon] }"
              @click="showIconPicker = true"
            >
              <div v-if="formData.icon && iconMap[formData.icon]" class="svg-icon" v-html="iconMap[formData.icon]"></div>
              <div v-else class="placeholder-icon">
                <t-icon name="add" />
                <span>选择图标</span>
              </div>
            </div>
            <t-button variant="outline" size="small" @click="showIconPicker = true">
              {{ formData.icon ? '更换图标' : '选择图标' }}
            </t-button>
            <t-button v-if="formData.icon" variant="text" size="small" theme="danger" @click="formData.icon = ''">
              清除
            </t-button>
          </div>
        </t-form-item>
        <t-form-item label="排序" name="sort">
          <t-input-number v-model="formData.sort" :min="0" :max="999" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 图标选择器 -->
    <CategoryIcons
      v-model="showIconPicker"
      :current-icon="formData.icon"
      @select="handleIconSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import type { FormInstanceFunctions, FormRule, TableColumnType } from 'tdesign-vue-next'
import { PageHeader, TableCard, EmptyState } from '@/components'
import {
  getCategoryList,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  type Category,
} from '@/api/category'
import CategoryIcons from '@/components/CategoryIcons.vue'
import { iconMap } from '@/components/categoryIconsData'

// 表格列定义
const columns: TableColumnType[] = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'icon', title: '图标', width: 100 },
  { colKey: 'name', title: '分类名称', width: 200 },
  { colKey: 'productCount', title: '商品数量', width: 120 },
  { colKey: 'sort', title: '排序', width: 100 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'operation', title: '操作', width: 200, fixed: 'right' },
]

// 状态
const loading = ref(false)
const categoryList = ref<Category[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstanceFunctions>()
const editingId = ref<number | null>(null)
const showIconPicker = ref(false)

// 表单数据
const formData = reactive({
  name: '',
  icon: '',
  sort: 0,
})

// 表单验证规则
const formRules: Record<string, FormRule[]> = {
  name: [
    { required: true, message: '请输入分类名称' },
    { max: 50, message: '分类名称不能超过50个字符' },
  ],
}

// 加载分类列表
async function loadCategoryList() {
  loading.value = true
  try {
    const res = await getCategoryList()
    categoryList.value = res.data
  } catch (error) {
    console.error('加载分类列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 新增分类
function handleAdd() {
  isEdit.value = false
  editingId.value = null
  formData.name = ''
  formData.icon = ''
  formData.sort = 0
  dialogVisible.value = true
}

// 编辑分类
function handleEdit(row: Category) {
  isEdit.value = true
  editingId.value = row.id
  formData.name = row.name
  formData.icon = row.icon || ''
  formData.sort = row.sort
  dialogVisible.value = true
}

// 选择图标
function handleIconSelect(iconKey: string) {
  formData.icon = iconKey
}

// 提交表单
async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (valid !== true) return

  submitLoading.value = true
  try {
    if (isEdit.value && editingId.value) {
      await updateCategory(editingId.value, {
        name: formData.name,
        icon: formData.icon || null,
        sort: formData.sort,
      })
      MessagePlugin.success('更新成功')
    } else {
      await createCategory({
        name: formData.name,
        icon: formData.icon || undefined,
        sort: formData.sort,
      })
      MessagePlugin.success('创建成功')
    }
    dialogVisible.value = false
    loadCategoryList()
  } catch (error) {
    console.error('保存分类失败:', error)
  } finally {
    submitLoading.value = false
  }
}

// 切换状态
async function handleToggleStatus(row: Category) {
  try {
    await toggleCategoryStatus(row.id)
    MessagePlugin.success('状态更新成功')
    loadCategoryList()
  } catch (error) {
    console.error('切换状态失败:', error)
  }
}

// 删除分类
async function handleDelete(row: Category) {
  try {
    await deleteCategory(row.id)
    MessagePlugin.success('删除成功')
    loadCategoryList()
  } catch (error: any) {
    console.error('删除分类失败:', error)
    // 显示友好的错误提示
    const message = error.response?.data?.message || error.message || '删除分类失败'
    MessagePlugin.error(message)
  }
}

// 初始化
onMounted(() => {
  loadCategoryList()
})
</script>

<style scoped>
.category-page {
  padding: 0;
}

/* 表格中的图标单元格 */
.category-icon-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-icon-cell .svg-icon {
  width: 40px;
  height: 40px;
}

.category-icon-cell .svg-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.category-icon-cell .default-icon {
  width: 40px;
  height: 40px;
}

.category-icon-cell .default-icon svg {
  width: 100%;
  height: 100%;
}

/* 图标选择器样式 */
.icon-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-icon {
  width: 64px;
  height: 64px;
  border: 2px dashed #ddd;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f8f8f8;
}

.selected-icon:hover {
  border-color: #e53734;
  background: #fff;
}

.selected-icon.has-icon {
  border-style: solid;
  border-color: #e53734;
  background: #fef2f2;
}

.selected-icon .svg-icon {
  width: 48px;
  height: 48px;
}

.selected-icon .svg-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.placeholder-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #999;
  font-size: 12px;
}

.placeholder-icon :deep(.t-icon) {
  font-size: 20px;
}
</style>
