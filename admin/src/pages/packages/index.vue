<template>
  <div class="packages-page">
    <!-- 页面标题 -->
    <PageHeader title="套餐管理" subtitle="管理商品组合套餐">
      <template #actions>
        <t-button theme="primary" @click="handleAdd">
          <template #icon><t-icon name="add" /></template>
          新增套餐
        </t-button>
      </template>
    </PageHeader>

    <!-- 筛选区域 -->
    <FilterCard>
      <div class="filter-row">
        <div class="filter-item search-input">
          <t-input
            v-model="filters.keyword"
            placeholder="搜索套餐名称/编码"
            clearable
            @enter="loadPackageList"
          >
            <template #prefix-icon>
              <t-icon name="search" />
            </template>
          </t-input>
        </div>
        <div class="filter-item">
          <t-select
            v-model="filters.positioning"
            placeholder="所有定位"
            clearable
            @change="loadPackageList"
          >
            <t-option value="ENTRY" label="引流款" />
            <t-option value="HOT" label="爆款" />
            <t-option value="PROFIT" label="利润款" />
          </t-select>
        </div>
        <div class="filter-item">
          <t-select
            v-model="filters.status"
            placeholder="所有状态"
            clearable
            @change="loadPackageList"
          >
            <t-option value="ACTIVE" label="已上架" />
            <t-option value="INACTIVE" label="已下架" />
          </t-select>
        </div>
      </div>
    </FilterCard>

    <!-- 套餐列表 -->
    <TableCard title="套餐列表" :hide-header="true">
      <t-table
        :data="packageList"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        hover
        stripe
        @page-change="handlePageChange"
      >
        <!-- 套餐信息 -->
        <template #package="{ row }">
          <div class="package-info">
            <t-image
              v-if="getFirstImage(row.images)"
              :src="getFirstImage(row.images)"
              fit="cover"
              :style="{ width: '60px', height: '60px', borderRadius: '4px' }"
            />
            <div class="package-detail">
              <div class="package-name">{{ row.name }}</div>
              <div class="package-code">{{ row.code }}</div>
            </div>
          </div>
        </template>

        <!-- 定位 -->
        <template #positioning="{ row }">
          <t-tag
            :theme="positioningTheme[row.positioning]"
            variant="light"
            size="small"
          >
            {{ positioningLabel[row.positioning] }}
          </t-tag>
        </template>

        <!-- 价格 -->
        <template #price="{ row }">
          <div class="price-info">
            <div>成本: ¥{{ row.costPrice }}</div>
            <div>供价: ¥{{ row.supplyPrice }}</div>
            <div class="retail-price">零售: ¥{{ row.masterRetailPrice }}</div>
          </div>
        </template>

        <!-- 毛利率 -->
        <template #margin="{ row }">
          <t-tag theme="success" variant="light" size="small">
            {{ row.grossMargin ? `${row.grossMargin}%` : '-' }}
          </t-tag>
        </template>

        <!-- 商品数量 -->
        <template #itemCount="{ row }">
          {{ row.items?.length || 0 }}个商品
        </template>

        <!-- 可售库存 -->
        <template #stock="{ row }">
          <span :class="{ 'low-stock': row.availableStock < 10 }">
            {{ row.availableStock ?? '-' }}
          </span>
        </template>

        <!-- 状态 -->
        <template #status="{ row }">
          <t-tag
            :theme="row.status === 'ACTIVE' ? 'success' : 'default'"
            variant="light"
            size="small"
          >
            {{ row.status === 'ACTIVE' ? '已上架' : '已下架' }}
          </t-tag>
        </template>

        <!-- 操作 -->
        <template #action="{ row }">
          <t-space>
            <t-link theme="primary" @click="handleEdit(row)">编辑</t-link>
            <t-link theme="primary" @click="handleConfigItems(row)">配置商品</t-link>
            <t-link
              :theme="row.status === 'ACTIVE' ? 'warning' : 'success'"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 'ACTIVE' ? '下架' : '上架' }}
            </t-link>
            <t-link theme="danger" @click="handleDelete(row)">删除</t-link>
          </t-space>
        </template>
      </t-table>
    </TableCard>

    <!-- 新建/编辑对话框 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="editingId ? '编辑套餐' : '新建套餐'"
      width="700px"
      :confirm-btn="{ content: '保存', loading: submitting }"
      :on-confirm="handleSubmit"
    >
      <t-form :data="formData" label-width="100px">
        <t-form-item label="套餐编码" required>
          <t-input v-model="formData.code" placeholder="如: PKG001" :disabled="!!editingId" />
        </t-form-item>
        <t-form-item label="套餐名称" required>
          <t-input v-model="formData.name" placeholder="如: 欢乐体验装" />
        </t-form-item>
        <t-form-item label="定位" required>
          <t-radio-group v-model="formData.positioning">
            <t-radio value="ENTRY">引流款</t-radio>
            <t-radio value="HOT">爆款</t-radio>
            <t-radio value="PROFIT">利润款</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="套餐图片">
          <div class="image-upload-area">
            <div class="image-list">
              <div v-for="(img, idx) in imageList" :key="idx" class="image-item">
                <t-image :src="img.url" fit="cover" class="preview-img" />
                <div class="image-actions">
                  <t-button size="small" variant="text" theme="danger" @click="removeImage(idx)">
                    <t-icon name="delete" />
                  </t-button>
                </div>
              </div>
              <div v-if="imageList.length < 5" class="upload-btn" @click="triggerUpload">
                <t-icon name="add" size="24px" />
                <span>上传图片</span>
              </div>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              multiple
              style="display: none"
              @change="handleFileSelect"
            />
            <div class="upload-tip">支持jpg、png格式，最多5张</div>
          </div>
        </t-form-item>
        <t-row :gutter="16">
          <t-col :span="12">
            <t-form-item label="成本价" required>
              <t-input-number v-model="formData.costPrice" :min="0" :decimal-places="2" suffix="元" style="width: 100%" />
            </t-form-item>
          </t-col>
          <t-col :span="12">
            <t-form-item label="供货价" required>
              <t-input-number v-model="formData.supplyPrice" :min="0" :decimal-places="2" suffix="元" style="width: 100%" />
            </t-form-item>
          </t-col>
        </t-row>
        <t-row :gutter="16">
          <t-col :span="12">
            <t-form-item label="零售价" required>
              <t-input-number v-model="formData.masterRetailPrice" :min="0" :decimal-places="2" suffix="元" style="width: 100%" />
            </t-form-item>
          </t-col>
          <t-col :span="12">
            <t-form-item label="毛利率">
              <t-input-number v-model="formData.grossMargin" :min="0" :max="100" :decimal-places="2" suffix="%" style="width: 100%" />
            </t-form-item>
          </t-col>
        </t-row>
        <t-form-item label="场景标签">
          <t-input v-model="formData.sceneTags" placeholder="如: [&quot;入门尝鲜&quot;, &quot;预算有限&quot;]" />
        </t-form-item>
        <t-form-item label="目标人群">
          <t-input v-model="formData.targetAudience" placeholder="如: 有孩家庭" />
        </t-form-item>
        <t-form-item label="描述">
          <t-textarea v-model="formData.description" placeholder="套餐描述" :rows="3" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 配置商品对话框 -->
    <t-dialog
      v-model:visible="itemsDialogVisible"
      header="配置套餐商品"
      width="800px"
      :confirm-btn="{ content: '保存', loading: itemsSubmitting }"
      :on-confirm="handleSaveItems"
    >
      <div class="items-config">
        <div class="items-header">
          <span>当前套餐: {{ currentPackage?.name }}</span>
          <t-button size="small" @click="addItem">添加商品</t-button>
        </div>
        <t-table
          :data="packageItems"
          :columns="itemColumns"
          row-key="productId"
          size="small"
        >
          <template #product="{ row, rowIndex }">
            <t-select
              v-model="packageItems[rowIndex].productId"
              :options="productOptions"
              placeholder="选择商品"
              filterable
              style="width: 250px"
            />
          </template>
          <template #quantity="{ row, rowIndex }">
            <t-input-number
              v-model="packageItems[rowIndex].quantity"
              :min="1"
              :max="100"
              style="width: 100px"
            />
          </template>
          <template #action="{ rowIndex }">
            <t-link theme="danger" @click="removeItem(rowIndex)">删除</t-link>
          </template>
        </t-table>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import * as packageApi from '@/api/package'
import { getProductList } from '@/api/product'
import { uploadImage } from '@/api/upload'
import { PageHeader, FilterCard, TableCard } from '@/components'

// 定位标签映射
const positioningLabel: Record<string, string> = {
  ENTRY: '引流款',
  HOT: '爆款',
  PROFIT: '利润款'
}
const positioningTheme: Record<string, string> = {
  ENTRY: 'primary',
  HOT: 'danger',
  PROFIT: 'warning'
}

// 状态
const loading = ref(false)
const packageList = ref<packageApi.Package[]>([])
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})
const filters = reactive({
  keyword: '',
  positioning: '',
  status: ''
})

// 表格列配置
const columns = [
  { colKey: 'package', title: '套餐信息', width: 250, cell: 'package' },
  { colKey: 'positioning', title: '定位', width: 100, cell: 'positioning' },
  { colKey: 'price', title: '价格', width: 180, cell: 'price' },
  { colKey: 'margin', title: '毛利率', width: 80, cell: 'margin' },
  { colKey: 'itemCount', title: '商品数', width: 100, cell: 'itemCount' },
  { colKey: 'stock', title: '可售', width: 80, cell: 'stock' },
  { colKey: 'status', title: '状态', width: 80, cell: 'status' },
  { colKey: 'action', title: '操作', width: 220, fixed: 'right', cell: 'action' }
]

// 对话框
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const submitting = ref(false)
const formData = reactive({
  code: '',
  name: '',
  positioning: 'HOT',
  description: '',
  images: '[]',
  costPrice: 0,
  supplyPrice: 0,
  masterRetailPrice: 0,
  grossMargin: 0,
  sceneTags: '',
  targetAudience: ''
})

// 图片上传
const imageList = ref<any[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

// 商品配置对话框
const itemsDialogVisible = ref(false)
const currentPackage = ref<packageApi.Package | null>(null)
const packageItems = ref<{ productId: number; quantity: number }[]>([])
const itemsSubmitting = ref(false)
const productOptions = ref<{ value: number; label: string }[]>([])

const itemColumns = [
  { colKey: 'product', title: '商品', width: 300, cell: 'product' },
  { colKey: 'quantity', title: '数量', width: 150, cell: 'quantity' },
  { colKey: 'action', title: '操作', width: 80, cell: 'action' }
]

// 加载套餐列表
async function loadPackageList() {
  loading.value = true
  try {
    const res = await packageApi.getPackageList({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: filters.keyword || undefined,
      positioning: filters.positioning || undefined,
      status: filters.status || undefined
    })
    packageList.value = res.data.list
    pagination.total = res.data.total
  } catch (error: any) {
    MessagePlugin.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// 加载商品列表（用于配置）
async function loadProductOptions() {
  try {
    const res = await getProductList({ page: 1, pageSize: 500, status: 'ACTIVE' })
    productOptions.value = res.data.list.map(p => ({
      value: p.id,
      label: `${p.name} (库存: ${p.stock})`
    }))
  } catch (error: any) {
    console.error('加载商品列表失败:', error)
  }
}

// 获取第一张图片
function getFirstImage(images: string | string[]): string {
  if (!images) return ''
  if (Array.isArray(images)) return images[0] || ''
  try {
    const arr = JSON.parse(images)
    return arr[0] || ''
  } catch {
    return images
  }
}

// 触发文件选择
function triggerUpload() {
  fileInputRef.value?.click()
}

// 处理文件选择
async function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  const remainingSlots = 5 - imageList.value.length
  const filesToUpload = Array.from(files).slice(0, remainingSlots)

  for (const file of filesToUpload) {
    if (file.size > 5 * 1024 * 1024) {
      MessagePlugin.warning(`${file.name} 超过5MB，已跳过`)
      continue
    }

    try {
      const result = await uploadImage(file)
      imageList.value.push({
        url: result.url,
        name: file.name,
        status: 'success'
      })
    } catch (error: any) {
      MessagePlugin.error(`${file.name} 上传失败: ${error.message}`)
    }
  }

  // 清空input以便重复选择
  input.value = ''
}

// 删除图片
function removeImage(index: number) {
  imageList.value.splice(index, 1)
}

// 从imageList获取URL数组
function getImageUrls(): string[] {
  return imageList.value
    .filter((item: any) => item.url || item.response?.url)
    .map((item: any) => item.url || item.response?.url)
}

// 分页变化
function handlePageChange(pageInfo: any) {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  loadPackageList()
}

// 新增
function handleAdd() {
  editingId.value = null
  imageList.value = []
  Object.assign(formData, {
    code: '',
    name: '',
    positioning: 'HOT',
    description: '',
    images: '[]',
    costPrice: 0,
    supplyPrice: 0,
    masterRetailPrice: 0,
    grossMargin: 0,
    sceneTags: '',
    targetAudience: ''
  })
  dialogVisible.value = true
}

// 编辑
function handleEdit(row: packageApi.Package) {
  editingId.value = row.id

  // 解析已有图片
  let existingImages: string[] = []
  if (Array.isArray(row.images)) {
    existingImages = row.images
  } else if (typeof row.images === 'string' && row.images) {
    try {
      existingImages = JSON.parse(row.images)
    } catch {
      existingImages = row.images ? [row.images] : []
    }
  }
  imageList.value = existingImages.map((url: string, index: number) => ({
    url,
    name: `image-${index + 1}`,
    status: 'success'
  }))

  Object.assign(formData, {
    code: row.code,
    name: row.name,
    positioning: row.positioning,
    description: row.description || '',
    images: typeof row.images === 'string' ? row.images : JSON.stringify(row.images || []),
    costPrice: Number(row.costPrice),
    supplyPrice: Number(row.supplyPrice),
    masterRetailPrice: Number(row.masterRetailPrice),
    grossMargin: row.grossMargin ? Number(row.grossMargin) : 0,
    sceneTags: typeof row.sceneTags === 'string' ? row.sceneTags : JSON.stringify(row.sceneTags || []),
    targetAudience: row.targetAudience || ''
  })
  dialogVisible.value = true
}

// 提交表单
async function handleSubmit() {
  if (!formData.code || !formData.name) {
    MessagePlugin.warning('请填写必填项')
    return
  }
  submitting.value = true
  try {
    // 收集图片URL
    const imageUrls = getImageUrls()
    const submitData = {
      ...formData,
      images: JSON.stringify(imageUrls)
    }

    if (editingId.value) {
      await packageApi.updatePackage(editingId.value, submitData)
      MessagePlugin.success('更新成功')
    } else {
      await packageApi.createPackage(submitData)
      MessagePlugin.success('创建成功')
    }
    dialogVisible.value = false
    loadPackageList()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 配置商品
function handleConfigItems(row: packageApi.Package) {
  currentPackage.value = row
  packageItems.value = (row.items || []).map(item => ({
    productId: item.productId,
    quantity: item.quantity
  }))
  itemsDialogVisible.value = true
}

// 添加商品项
function addItem() {
  packageItems.value.push({ productId: 0, quantity: 1 })
}

// 删除商品项
function removeItem(index: number) {
  packageItems.value.splice(index, 1)
}

// 保存商品配置
async function handleSaveItems() {
  const validItems = packageItems.value.filter(i => i.productId > 0)
  if (validItems.length === 0) {
    MessagePlugin.warning('请至少添加一个商品')
    return
  }
  itemsSubmitting.value = true
  try {
    await packageApi.setPackageItems(currentPackage.value!.id, validItems)
    MessagePlugin.success('配置成功')
    itemsDialogVisible.value = false
    loadPackageList()
  } catch (error: any) {
    MessagePlugin.error(error.message || '配置失败')
  } finally {
    itemsSubmitting.value = false
  }
}

// 切换状态
async function handleToggleStatus(row: packageApi.Package) {
  try {
    await packageApi.togglePackageStatus(row.id)
    MessagePlugin.success(row.status === 'ACTIVE' ? '已下架' : '已上架')
    loadPackageList()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  }
}

// 删除
function handleDelete(row: packageApi.Package) {
  const confirmDia = DialogPlugin.confirm({
    header: '确认删除',
    body: `确定要删除套餐"${row.name}"吗？`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        await packageApi.deletePackage(row.id)
        MessagePlugin.success('删除成功')
        loadPackageList()
        confirmDia.hide()
      } catch (error: any) {
        MessagePlugin.error(error.message || '删除失败')
      }
    }
  })
}

onMounted(() => {
  loadPackageList()
  loadProductOptions()
})
</script>

<style scoped lang="less">
.packages-page {
  padding: 16px;
}

.filter-row {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;

  .filter-item {
    min-width: 160px;

    &.search-input {
      min-width: 240px;
    }
  }
}

.package-info {
  display: flex;
  gap: 12px;
  align-items: center;

  .package-detail {
    .package-name {
      font-weight: 500;
      color: var(--td-text-color-primary);
    }
    .package-code {
      font-size: 12px;
      color: var(--td-text-color-placeholder);
    }
  }
}

.price-info {
  font-size: 12px;
  line-height: 1.6;

  .retail-price {
    font-weight: 500;
    color: var(--td-error-color);
  }
}

.low-stock {
  color: var(--td-error-color);
  font-weight: 500;
}

.items-config {
  .items-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.image-upload-area {
  width: 100%;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.image-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--td-border-level-2-color);

  .preview-img {
    width: 100%;
    height: 100%;
  }

  .image-actions {
    position: absolute;
    top: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 0 0 0 4px;
  }
}

.upload-btn {
  width: 80px;
  height: 80px;
  border: 1px dashed var(--td-border-level-2-color);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--td-text-color-placeholder);
  transition: all 0.2s;

  &:hover {
    border-color: var(--td-brand-color);
    color: var(--td-brand-color);
  }

  span {
    font-size: 12px;
    margin-top: 4px;
  }
}
</style>
