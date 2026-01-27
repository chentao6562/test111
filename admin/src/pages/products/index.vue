<template>
  <div class="products-page">
    <!-- 页面标题 -->
    <PageHeader title="商品管理" subtitle="管理所有烟花产品信息、库存及上架状态">
      <template #actions>
        <t-space>
          <t-button variant="outline" @click="handleExport">
            <template #icon><t-icon name="download" /></template>
            导出数据
          </t-button>
          <t-button theme="primary" @click="handleAdd">
            <template #icon><t-icon name="add" /></template>
            新增商品
          </t-button>
        </t-space>
      </template>
    </PageHeader>

    <!-- 筛选区域 -->
    <FilterCard>
      <div class="filter-row">
        <div class="filter-item search-input">
          <t-input
            v-model="filters.keyword"
            placeholder="搜索商品名称/编码"
            clearable
            @enter="loadProductList"
          >
            <template #prefix-icon>
              <t-icon name="search" />
            </template>
          </t-input>
        </div>
        <div class="filter-item">
          <t-select
            v-model="filters.status"
            placeholder="所有状态"
            clearable
            @change="loadProductList"
          >
            <t-option value="ACTIVE" label="已上架" />
            <t-option value="INACTIVE" label="已下架" />
          </t-select>
        </div>
        <div class="filter-item">
          <t-select
            v-model="filters.categoryId"
            placeholder="所有分类"
            clearable
            @change="loadProductList"
          >
            <t-option
              v-for="cat in categoryList"
              :key="cat.id"
              :value="cat.id"
              :label="cat.name"
            />
          </t-select>
        </div>
        <!-- 【2026-01-25新增】排序切换按钮组 -->
        <div class="filter-item sort-buttons">
          <t-radio-group v-model="filters.sort" variant="default-filled" size="small" @change="handleSortChange">
            <t-radio-button value="default">
              <t-icon name="order-ascending" /> 默认
            </t-radio-button>
            <t-radio-button value="sales">
              <t-icon name="chart-bar" /> 销量
            </t-radio-button>
            <t-radio-button value="price_asc">
              <t-icon name="trending-up" /> 价格↑
            </t-radio-button>
            <t-radio-button value="price_desc">
              <t-icon name="trending-down" /> 价格↓
            </t-radio-button>
          </t-radio-group>
          <span v-if="filters.sort === 'default'" class="drag-tip">
            <t-icon name="info-circle" size="14px" /> 可拖拽排序
          </span>
        </div>
        <div class="filter-spacer"></div>
        <div class="batch-actions" v-if="selectedIds.length > 0">
          <span class="selected-count">已选 {{ selectedIds.length }} 项</span>
          <t-button variant="text" size="small" @click="batchUpdateStatus('ACTIVE')">批量上架</t-button>
          <t-button variant="text" size="small" @click="batchUpdateStatus('INACTIVE')">批量下架</t-button>
          <t-button variant="text" size="small" theme="warning" @click="handleBatchGenerateAICopy">批量生成AI文案</t-button>
        </div>
      </div>
    </FilterCard>

    <!-- 商品列表 -->
    <TableCard title="商品列表" :hide-header="true">
      <t-table
        ref="tableRef"
        :data="productList"
        :columns="tableColumns"
        :loading="loading"
        :pagination="pagination"
        :selected-row-keys="selectedIds"
        row-key="id"
        hover
        stripe
        @page-change="handlePageChange"
        @select-change="handleSelectChange"
      >
        <!-- 【2026-01-25新增】拖拽手柄 -->
        <template #drag>
          <span class="drag-handle">
            <t-icon name="drag-move" />
          </span>
        </template>
        <!-- 商品信息（图片+名称） -->
        <template #product="{ row }">
          <div class="product-cell-wrapper">
            <ProductCell
              :name="row.name"
              :image="getFirstImage(row.images)"
              :sku="`ID: ${row.id}`"
              clickable
              @click="previewImage(row)"
            />
            <t-tag v-if="row.isSpecialPrice" theme="warning" size="small" class="special-price-tag">特价</t-tag>
          </div>
        </template>

        <!-- 分类列 -->
        <template #category="{ row }">
          <t-tag variant="light" theme="default" size="small">
            {{ row.category?.name || '未分类' }}
          </t-tag>
        </template>

        <!-- 价格列 -->
        <template #price="{ row }">
          <div class="price-cell">
            <AmountText :value="row.masterRetailPrice || row.retailPrice" type="price" highlight />
            <div class="supply-price">供货价: <AmountText :value="row.supplyPrice" type="price" size="small" /></div>
          </div>
        </template>

        <!-- 库存列 -->
        <template #stock="{ row }">
          <div class="stock-cell">
            <span :class="['stock-num', { 'stock-low': row.stock <= 10, 'stock-out': row.stock === 0 }]">
              {{ row.stock.toLocaleString() }}
            </span>
            <span class="stock-unit">{{ row.unit }}</span>
          </div>
        </template>

        <!-- 销量列 -->
        <template #sales="{ row }">
          <span class="sales-num">{{ (row.salesCount || 0).toLocaleString() }}</span>
        </template>

        <!-- 状态列 -->
        <template #status="{ row }">
          <StatusTag
            :status="row.status === 'ACTIVE' ? 'ACTIVE' : (row.stock === 0 ? 'OUT_OF_STOCK' : 'INACTIVE')"
            :status-map="productStatusMap"
          />
        </template>

        <!-- 操作列 -->
        <template #operation="{ row }">
          <div class="operation-cell">
            <t-tooltip content="编辑">
              <t-button variant="text" shape="circle" @click="handleEdit(row)">
                <template #icon><t-icon name="edit" size="18px" /></template>
              </t-button>
            </t-tooltip>
            <t-tooltip :content="row.status === 'ACTIVE' ? '下架' : '上架'">
              <t-button variant="text" shape="circle" @click="handleToggleStatus(row)">
                <template #icon>
                  <t-icon :name="row.status === 'ACTIVE' ? 'remove' : 'add-rectangle'" size="18px" />
                </template>
              </t-button>
            </t-tooltip>
            <t-dropdown :options="getMoreOptions(row)" @click="handleMoreAction($event, row)">
              <t-button variant="text" shape="circle">
                <template #icon><t-icon name="ellipsis" size="18px" /></template>
              </t-button>
            </t-dropdown>
          </div>
        </template>

        <!-- 空状态 -->
        <template #empty>
          <EmptyState
            v-if="!loading"
            :type="filters.keyword || filters.categoryId || filters.status ? 'search' : 'data'"
            :description="filters.keyword || filters.categoryId || filters.status ? '没有找到匹配的商品' : '暂无商品数据'"
          >
            <t-button theme="primary" @click="handleAdd">新增商品</t-button>
          </EmptyState>
        </template>
      </t-table>
    </TableCard>

    <!-- 新增/编辑弹窗 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="isEdit ? '编辑商品' : '新增商品'"
      width="800px"
      :footer="false"
      class="product-dialog"
      destroy-on-close
    >
      <div class="product-form">
        <t-form
          ref="formRef"
          :data="formData"
          :rules="formRules"
          label-align="top"
          :colon="false"
        >
          <!-- 基本信息区域 -->
          <div class="form-section">
            <div class="section-title">基本信息</div>
            <t-row :gutter="24">
              <t-col :span="6">
                <t-form-item label="商品名称" name="name">
                  <t-input v-model="formData.name" placeholder="请输入商品名称" maxlength="100" />
                </t-form-item>
              </t-col>
              <t-col :span="6">
                <t-form-item label="商品分类" name="categoryId">
                  <t-select v-model="formData.categoryId" placeholder="请选择分类">
                    <t-option
                      v-for="cat in categoryList"
                      :key="cat.id"
                      :value="cat.id"
                      :label="cat.name"
                    />
                  </t-select>
                </t-form-item>
              </t-col>
            </t-row>
          </div>

          <!-- 价格信息区域 -->
          <div class="form-section">
            <div class="section-title">价格设置</div>
            <t-row :gutter="24">
              <t-col :span="4">
                <t-form-item label="成本价" name="costPrice">
                  <t-input-number
                    v-model="formData.costPrice"
                    :min="0"
                    :decimal-places="2"
                    theme="normal"
                    placeholder="0.00"
                  >
                    <template #suffix>元</template>
                  </t-input-number>
                  <div class="form-tip">总代进货成本</div>
                </t-form-item>
              </t-col>
              <t-col :span="4">
                <t-form-item label="供货价" name="supplyPrice">
                  <t-input-number
                    v-model="formData.supplyPrice"
                    :min="0"
                    :decimal-places="2"
                    theme="normal"
                    placeholder="0.00"
                  >
                    <template #suffix>元</template>
                  </t-input-number>
                  <div class="form-tip">一级推销员拿货价</div>
                </t-form-item>
              </t-col>
              <t-col :span="4">
                <t-form-item label="建议零售价" name="suggestedPrice">
                  <t-input-number
                    v-model="formData.suggestedPrice"
                    :min="0"
                    :decimal-places="2"
                    theme="normal"
                    placeholder="0.00"
                  >
                    <template #suffix>元</template>
                  </t-input-number>
                  <div class="form-tip">推销员参考售价</div>
                </t-form-item>
              </t-col>
            </t-row>
            <t-row :gutter="24">
              <t-col :span="4">
                <t-form-item label="最低零售价" name="minRetailPrice">
                  <t-input-number
                    v-model="formData.minRetailPrice"
                    :min="0"
                    :decimal-places="2"
                    theme="normal"
                    placeholder="0.00"
                  >
                    <template #suffix>元</template>
                  </t-input-number>
                  <div class="form-tip">强制最低售价（可选）</div>
                </t-form-item>
              </t-col>
              <t-col :span="4">
                <t-form-item label="总代零售价" name="masterRetailPrice">
                  <t-input-number
                    v-model="formData.masterRetailPrice"
                    :min="0"
                    :decimal-places="2"
                    theme="normal"
                    placeholder="0.00"
                  >
                    <template #suffix>元</template>
                  </t-input-number>
                  <div class="form-tip">门店直售价格</div>
                </t-form-item>
              </t-col>
              <t-col :span="4">
                <div class="profit-preview" v-if="formData.costPrice && formData.supplyPrice">
                  <div class="preview-title">利润预览</div>
                  <div class="preview-item">
                    <span class="preview-label">供货利润:</span>
                    <span class="preview-value">¥{{ (formData.supplyPrice - formData.costPrice).toFixed(2) }}</span>
                  </div>
                  <div class="preview-item" v-if="formData.suggestedPrice">
                    <span class="preview-label">最大零售利润:</span>
                    <span class="preview-value">¥{{ (formData.suggestedPrice - formData.supplyPrice).toFixed(2) }}</span>
                  </div>
                </div>
              </t-col>
            </t-row>
          </div>

          <!-- 库存信息区域 -->
          <div class="form-section">
            <div class="section-title">库存信息</div>
            <t-row :gutter="24">
              <t-col :span="4">
                <t-form-item label="库存数量" name="stock">
                  <t-input-number v-model="formData.stock" :min="0" theme="normal" placeholder="0" />
                </t-form-item>
              </t-col>
              <t-col :span="4">
                <t-form-item label="销售单位" name="unit">
                  <t-select v-model="formData.unit" placeholder="选择单位">
                    <t-option value="箱" label="箱" />
                    <t-option value="盒" label="盒" />
                    <t-option value="个" label="个" />
                    <t-option value="包" label="包" />
                    <t-option value="件" label="件" />
                    <t-option value="组" label="组" />
                    <t-option value="套" label="套" />
                    <t-option value="袋" label="袋" />
                    <t-option value="礼盒" label="礼盒" />
                  </t-select>
                </t-form-item>
              </t-col>
              <t-col :span="4">
                <t-form-item label="排序权重" name="sort">
                  <t-input-number v-model="formData.sort" :min="0" theme="normal" placeholder="0" />
                </t-form-item>
              </t-col>
            </t-row>
            <t-row :gutter="24">
              <t-col :span="4">
                <t-form-item label="进货单位" name="purchaseUnit">
                  <t-select v-model="formData.purchaseUnit" placeholder="选择进货单位">
                    <t-option value="件" label="件" />
                    <t-option value="箱" label="箱" />
                    <t-option value="包" label="包" />
                  </t-select>
                </t-form-item>
              </t-col>
              <t-col :span="4">
                <t-form-item label="换算比例" name="unitConversion">
                  <t-input-number v-model="formData.unitConversion" :min="1" :max="9999" theme="normal" placeholder="1" />
                  <div class="form-tip">1{{ formData.purchaseUnit }} = {{ formData.unitConversion }}{{ formData.unit }}</div>
                </t-form-item>
              </t-col>
              <t-col :span="4">
                <t-form-item label="特价商品" name="isSpecialPrice">
                  <t-switch v-model="formData.isSpecialPrice">
                    <template #label="{ value }">{{ value ? '是' : '否' }}</template>
                  </t-switch>
                  <div class="form-tip">特价商品不参与秒杀加购、拼团（占比≥80%禁止）、赠品活动</div>
                </t-form-item>
              </t-col>
            </t-row>
          </div>

          <!-- 媒体文件区域 -->
          <div class="form-section">
            <div class="section-title">
              商品图片
              <span class="title-tip">建议上传800*800像素的正方形图片，第一张为主图</span>
            </div>
            <div class="image-wall">
              <div
                v-for="(img, index) in imageList"
                :key="img.url || index"
                class="image-item"
                :class="{ 'is-main': index === 0, 'is-uploading': img.status === 'progress' }"
              >
                <img v-if="img.url || img.response?.url" :src="img.url || img.response?.url" alt="" />
                <div v-if="img.status === 'progress'" class="upload-progress">
                  <t-loading size="small" />
                </div>
                <div class="image-actions">
                  <span class="action-btn" @click="previewFormImage(index)" title="预览">
                    <t-icon name="browse" />
                  </span>
                  <span class="action-btn" @click="removeImage(index)" title="删除">
                    <t-icon name="delete" />
                  </span>
                  <span v-if="index > 0" class="action-btn" @click="setAsMain(index)" title="设为主图">
                    <t-icon name="star" />
                  </span>
                </div>
                <div v-if="index === 0" class="main-badge">主图</div>
              </div>
              <div v-if="imageList.length < 9" class="upload-btn" @click="triggerUpload">
                <t-icon name="add" class="add-icon" />
                <span class="upload-text">上传图片</span>
                <span class="upload-count">{{ imageList.length }}/9</span>
              </div>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                multiple
                style="display: none"
                @change="handleFileSelect"
              />
            </div>
            <div class="upload-tips">
              <t-icon name="info-circle" />
              支持 jpg、png 格式，单张不超过5MB，最多上传9张
            </div>
          </div>

          <!-- 视频上传区域 -->
          <div class="form-section">
            <div class="section-title">
              商品视频 <span class="optional-tag">选填</span>
            </div>
            <div class="video-wall">
              <div v-if="formData.videoUrl" class="video-item">
                <video :src="formData.videoUrl" class="video-thumb"></video>
                <div class="video-play-btn" @click="playVideo">
                  <t-icon name="play-circle" />
                </div>
                <div class="video-actions">
                  <span class="action-btn" @click="playVideo" title="播放">
                    <t-icon name="play-circle" />
                  </span>
                  <span class="action-btn" @click="removeVideo" title="删除">
                    <t-icon name="delete" />
                  </span>
                </div>
                <div class="video-badge">视频</div>
              </div>
              <div v-else class="upload-btn video-upload-btn" @click="triggerVideoUpload">
                <t-icon name="video" class="add-icon" />
                <span class="upload-text">上传视频</span>
                <span class="upload-limit">最大50MB</span>
              </div>
              <input
                ref="videoInputRef"
                type="file"
                accept="video/mp4,video/webm"
                style="display: none"
                @change="handleVideoSelect"
              />
            </div>
          </div>

          <!-- 视频播放弹窗 -->
          <t-dialog
            v-model:visible="videoPlayerVisible"
            header="视频预览"
            width="640px"
            :footer="false"
          >
            <video v-if="formData.videoUrl" :src="formData.videoUrl" controls autoplay class="video-player"></video>
          </t-dialog>

          <!-- 【2026-01-26】特价商品设置 -->
          <div class="form-section">
            <div class="section-title">特价设置</div>
            <t-form-item name="isSpecialPrice" label="特价商品">
              <t-switch v-model="formData.isSpecialPrice" />
              <span class="form-item-tip">
                开启后该商品不参与砍价、秒杀、锁价、拼团等营销活动，订单不享受赠品，不能使用代金券
              </span>
            </t-form-item>
          </div>

          <!-- 商品描述 -->
          <div class="form-section">
            <div class="section-title">商品描述 <span class="optional-tag">选填</span></div>
            <t-form-item name="description" :label-width="0">
              <t-textarea
                v-model="formData.description"
                placeholder="请输入商品描述，如产品特点、规格参数等"
                :maxlength="500"
                :autosize="{ minRows: 3, maxRows: 6 }"
              />
            </t-form-item>
          </div>
        </t-form>

        <!-- 底部按钮 -->
        <div class="form-footer">
          <t-button variant="outline" @click="dialogVisible = false">取消</t-button>
          <t-button theme="primary" :loading="submitLoading" @click="handleSubmit">
            {{ isEdit ? '保存修改' : '创建商品' }}
          </t-button>
        </div>
      </div>
    </t-dialog>

    <!-- 图片预览 -->
    <t-image-viewer
      v-model:visible="imageViewerVisible"
      :images="previewImages"
      :default-index="previewIndex"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 商品管理页面
 * 功能：商品列表、新增、编辑、上下架、批量操作、拖拽排序
 * 【2026-01-25】新增排序切换和拖拽排序功能
 */
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import type { FormInstanceFunctions, FormRule, TableColumnType, PageInfo, UploadFile, RequestMethodResponse } from 'tdesign-vue-next'
import Sortable from 'sortablejs'
import {
  PageHeader,
  FilterCard,
  TableCard,
  StatusTag,
  AmountText,
  ProductCell,
  EmptyState,
} from '@/components'
import { getCategoryList, type Category } from '@/api/category'
import {
  getProductList,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  generateProductAICopy,
  batchGenerateAICopy,
  updateProductSort,
  type Product,
} from '@/api/product'
import { uploadImage, uploadVideo as uploadVideoApi } from '@/api/upload'
import { getFirstImage as getFirstImageUtil, parseImages, getImageUrl } from '@/utils/image'

// 状态映射（使用label和color字段，匹配StatusTag组件的StatusConfig接口）
const productStatusMap = {
  ACTIVE: { label: '已上架', color: 'success' },
  INACTIVE: { label: '已下架', color: 'default' },
  OUT_OF_STOCK: { label: '缺货', color: 'danger' },
}

// 基础表格列定义
const baseColumns: TableColumnType[] = [
  { colKey: 'row-select', type: 'multiple', width: 50 },
  { colKey: 'product', title: '商品信息', width: 320 },
  { colKey: 'category', title: '分类', width: 100 },
  { colKey: 'price', title: '价格', width: 160 },
  { colKey: 'stock', title: '库存', width: 100 },
  { colKey: 'sales', title: '销量', width: 80 },
  { colKey: 'status', title: '状态', width: 90 },
  { colKey: 'operation', title: '操作', width: 120, fixed: 'right' },
]

// 【2026-01-25新增】动态表格列（根据排序模式添加拖拽列）
const tableColumns = computed<TableColumnType[]>(() => {
  if (filters.sort === 'default') {
    return [
      { colKey: 'drag', title: '', width: 50 },
      ...baseColumns,
    ]
  }
  return baseColumns
})

// 状态
const loading = ref(false)
const productList = ref<Product[]>([])
const categoryList = ref<Category[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstanceFunctions>()
const editingId = ref<number | null>(null)
const selectedIds = ref<number[]>([])

// 图片预览
const imageViewerVisible = ref(false)
const previewImages = ref<string[]>([])
const previewIndex = ref(0)

// 图片墙相关
const fileInputRef = ref<HTMLInputElement>()
const videoInputRef = ref<HTMLInputElement>()
const videoPlayerVisible = ref(false)

// 筛选条件
const filters = reactive({
  categoryId: null as number | null,
  status: '' as string,
  keyword: '',
  sort: 'default' as 'default' | 'sales' | 'price_asc' | 'price_desc',
})

// 【2026-01-25新增】表格引用和拖拽实例
const tableRef = ref<any>()
let sortableInstance: Sortable | null = null

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

// 表单数据
const formData = reactive({
  name: '',
  categoryId: null as number | null,
  description: '',
  costPrice: 0,
  supplyPrice: 0,
  suggestedPrice: 0,
  minRetailPrice: 0,
  masterRetailPrice: 0,
  stock: 0,
  unit: '箱',
  purchaseUnit: '件',
  unitConversion: 1,
  sort: 0,
  videoUrl: '',
  isSpecialPrice: false, // 【2026-01-26】特价商品标识
})

// 图片上传列表
const imageList = ref<UploadFile[]>([])

// 表单验证规则
const formRules: Record<string, FormRule[]> = {
  name: [
    { required: true, message: '请输入商品名称' },
    { max: 100, message: '商品名称不能超过100个字符' },
  ],
  categoryId: [{ required: true, message: '请选择商品分类' }],
  costPrice: [{ required: true, message: '请输入成本价' }],
  supplyPrice: [{ required: true, message: '请输入供货价' }],
  unit: [{ required: true, message: '请选择计量单位' }],
}

// 获取第一张图片（使用工具函数）
function getFirstImage(images: string | string[]): string {
  return getFirstImageUtil(images)
}

// 获取所有图片（使用工具函数）
function getAllImages(images: string | string[]): string[] {
  return parseImages(images)
}

// 预览图片
function previewImage(row: Product) {
  const images = getAllImages(row.images)
  if (images.length > 0) {
    previewImages.value = images
    previewIndex.value = 0
    imageViewerVisible.value = true
  }
}

// 加载分类列表
async function loadCategoryList() {
  try {
    const res = await getCategoryList()
    categoryList.value = res.data
  } catch (error) {
    console.error('加载分类列表失败:', error)
  }
}

// 加载商品列表
async function loadProductList() {
  loading.value = true
  try {
    const res = await getProductList({
      page: pagination.current,
      pageSize: pagination.pageSize,
      categoryId: filters.categoryId || undefined,
      status: filters.status || undefined,
      keyword: filters.keyword || undefined,
      sort: filters.sort,
    })
    productList.value = res.data.list
    pagination.total = res.data.total
    // 【2026-01-25新增】数据加载后初始化拖拽
    if (filters.sort === 'default') {
      nextTick(() => initSortable())
    }
  } catch (error) {
    console.error('加载商品列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 【2026-01-25新增】排序方式变化
function handleSortChange() {
  // 销毁拖拽实例
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
  loadProductList()
}

// 【2026-01-25新增】初始化拖拽排序
function initSortable() {
  // 销毁旧实例
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }

  // 仅在默认排序模式下启用拖拽
  if (filters.sort !== 'default') return

  nextTick(() => {
    const tableBody = document.querySelector('.t-table__body tbody')
    if (!tableBody) return

    sortableInstance = new Sortable(tableBody as HTMLElement, {
      handle: '.drag-handle',
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onEnd: async (evt) => {
        if (evt.oldIndex === evt.newIndex) return
        if (evt.oldIndex === undefined || evt.newIndex === undefined) return

        // 重新计算排序
        const newList = [...productList.value]
        const [moved] = newList.splice(evt.oldIndex, 1)
        newList.splice(evt.newIndex, 0, moved)

        // 提取ID列表
        const ids = newList.map(p => p.id)

        try {
          await updateProductSort(ids)
          productList.value = newList
          MessagePlugin.success('排序已保存')
        } catch (error) {
          // 失败时恢复原顺序
          loadProductList()
          MessagePlugin.error('排序保存失败')
        }
      },
    })
  })
}

// 分页变化
function handlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  loadProductList()
}

// 选择变化
function handleSelectChange(value: number[]) {
  selectedIds.value = value
}

// 批量更新状态
async function batchUpdateStatus(status: string) {
  if (selectedIds.value.length === 0) return
  try {
    for (const id of selectedIds.value) {
      await toggleProductStatus(id)
    }
    MessagePlugin.success('批量操作成功')
    selectedIds.value = []
    loadProductList()
  } catch (error) {
    console.error('批量操作失败:', error)
  }
}

// 导出数据
function handleExport() {
  const headers = ['ID', '商品名称', '分类', '成本价', '供货价', '建议零售价', '总代零售价', '库存', '销量', '状态']
  const rows = productList.value.map((item) => [
    item.id,
    item.name,
    item.category?.name || '未分类',
    (item as any).costPrice || 0,
    (item as any).supplyPrice || 0,
    (item as any).suggestedPrice || 0,
    (item as any).masterRetailPrice || 0,
    item.stock,
    item.salesCount || 0,
    item.status === 'ACTIVE' ? '已上架' : '已下架',
  ])
  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `商品列表_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`
  link.click()
  URL.revokeObjectURL(url)
  MessagePlugin.success('导出成功')
}

// 更多操作下拉选项
function getMoreOptions(row: Product) {
  return [
    { content: '复制商品', value: 'copy' },
    { content: '生成AI卖点', value: 'ai-copy' },
    { divider: true },
    { content: '删除', value: 'delete', theme: 'error' },
  ]
}

// 更多操作处理
function handleMoreAction(data: any, row: Product) {
  const action = data.value
  switch (action) {
    case 'copy':
      handleCopyProduct(row)
      break
    case 'ai-copy':
      handleGenerateAICopy(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

// 复制商品
function handleCopyProduct(row: Product) {
  isEdit.value = false
  editingId.value = null
  Object.assign(formData, {
    name: row.name + ' (副本)',
    categoryId: row.categoryId,
    description: row.description || '',
    costPrice: Number((row as any).costPrice) || 0,
    supplyPrice: Number((row as any).supplyPrice) || 0,
    suggestedPrice: Number((row as any).suggestedPrice) || 0,
    minRetailPrice: Number((row as any).minRetailPrice) || 0,
    masterRetailPrice: Number((row as any).masterRetailPrice) || 0,
    stock: row.stock,
    unit: row.unit,
    purchaseUnit: row.purchaseUnit || '件',
    unitConversion: row.unitConversion || 1,
    sort: row.sort,
    videoUrl: (row as any).videoUrl || '',
  })

  let existingImages: string[] = []
  if (Array.isArray(row.images)) {
    existingImages = row.images
  } else if (typeof row.images === 'string' && row.images) {
    try {
      existingImages = JSON.parse(row.images)
    } catch {
      existingImages = row.images.split(',').filter(s => s.trim())
    }
  }
  imageList.value = existingImages.map((url, index) => ({
    url,
    name: `image-${index}`,
    status: 'success' as const,
  }))

  dialogVisible.value = true
  MessagePlugin.success('已复制商品信息，请修改后保存')
}

// 删除商品
async function handleDelete(row: Product) {
  try {
    await deleteProduct(row.id)
    MessagePlugin.success('删除成功')
    loadProductList()
  } catch (error) {
    console.error('删除商品失败:', error)
  }
}

// 生成AI文案
async function handleGenerateAICopy(row: Product) {
  try {
    MessagePlugin.loading('正在生成AI文案...')
    const res = await generateProductAICopy(row.id)
    MessagePlugin.closeAll()
    MessagePlugin.success(`AI文案生成成功：${res.data.slogan}`)
    // 重新加载列表以显示更新后的数据
    loadProductList()
  } catch (error: any) {
    MessagePlugin.closeAll()
    MessagePlugin.error(error.response?.data?.message || 'AI文案生成失败')
    console.error('生成AI文案失败:', error)
  }
}

// 批量生成AI文案（供批量操作按钮使用）
async function handleBatchGenerateAICopy() {
  if (selectedIds.value.length === 0) {
    MessagePlugin.warning('请先选择商品')
    return
  }
  try {
    MessagePlugin.loading(`正在为 ${selectedIds.value.length} 个商品生成AI文案...`)
    const res = await batchGenerateAICopy(selectedIds.value)
    MessagePlugin.closeAll()
    MessagePlugin.success(`AI文案生成完成：成功 ${res.data.success} 个，失败 ${res.data.failed} 个`)
    selectedIds.value = []
    loadProductList()
  } catch (error: any) {
    MessagePlugin.closeAll()
    MessagePlugin.error(error.response?.data?.message || '批量生成AI文案失败')
    console.error('批量生成AI文案失败:', error)
  }
}

// 新增商品
function handleAdd() {
  isEdit.value = false
  editingId.value = null
  Object.assign(formData, {
    name: '',
    categoryId: null,
    description: '',
    costPrice: 0,
    supplyPrice: 0,
    suggestedPrice: 0,
    minRetailPrice: 0,
    masterRetailPrice: 0,
    stock: 0,
    unit: '箱',
    purchaseUnit: '件',
    unitConversion: 1,
    sort: 0,
    videoUrl: '',
    isSpecialPrice: false, // 【2026-01-26】特价商品标识
  })
  imageList.value = []
  dialogVisible.value = true
}

// 编辑商品
function handleEdit(row: Product) {
  isEdit.value = true
  editingId.value = row.id
  Object.assign(formData, {
    name: row.name,
    categoryId: row.categoryId,
    description: row.description || '',
    costPrice: Number((row as any).costPrice) || 0,
    supplyPrice: Number((row as any).supplyPrice) || 0,
    suggestedPrice: Number((row as any).suggestedPrice) || 0,
    minRetailPrice: Number((row as any).minRetailPrice) || 0,
    masterRetailPrice: Number((row as any).masterRetailPrice) || 0,
    stock: row.stock,
    unit: row.unit,
    purchaseUnit: row.purchaseUnit || '件',
    unitConversion: row.unitConversion || 1,
    sort: row.sort,
    videoUrl: (row as any).videoUrl || '',
    isSpecialPrice: (row as any).isSpecialPrice || false, // 【2026-01-26】特价商品标识
  })

  let existingImages: string[] = []
  if (Array.isArray(row.images)) {
    existingImages = row.images
  } else if (typeof row.images === 'string' && row.images) {
    try {
      existingImages = JSON.parse(row.images)
    } catch {
      existingImages = row.images.split(',').filter(s => s.trim())
    }
  }

  imageList.value = existingImages.map((url, index) => ({
    url,
    name: `image-${index}`,
    status: 'success' as const,
  }))

  dialogVisible.value = true
}

// 删除视频
function removeVideo() {
  formData.videoUrl = ''
}

// 触发图片上传
function triggerUpload() {
  fileInputRef.value?.click()
}

// 处理图片选择
async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  const maxCount = 9 - imageList.value.length
  const filesToUpload = Array.from(files).slice(0, maxCount)

  for (const file of filesToUpload) {
    if (file.size > 5 * 1024 * 1024) {
      MessagePlugin.warning(`${file.name} 超过5MB，已跳过`)
      continue
    }

    const tempId = Date.now() + Math.random()
    const uploadingItem = {
      url: '',
      name: file.name,
      status: 'progress' as const,
      tempId,
    }
    imageList.value.push(uploadingItem as any)

    try {
      const result = await uploadImage(file)
      const index = imageList.value.findIndex((item: any) => item.tempId === tempId)
      if (index > -1) {
        imageList.value[index] = {
          url: result.url,
          name: file.name,
          status: 'success' as const,
        }
      }
    } catch (error: any) {
      const index = imageList.value.findIndex((item: any) => item.tempId === tempId)
      if (index > -1) {
        imageList.value.splice(index, 1)
      }
      MessagePlugin.error(`${file.name} 上传失败`)
    }
  }

  input.value = ''
}

// 删除图片
function removeImage(index: number) {
  imageList.value.splice(index, 1)
}

// 设为主图
function setAsMain(index: number) {
  if (index <= 0) return
  const item = imageList.value.splice(index, 1)[0]
  imageList.value.unshift(item)
  MessagePlugin.success('已设为主图')
}

// 预览表单中的图片
function previewFormImage(index: number) {
  const images = imageList.value
    .filter(file => file.status === 'success' && (file.url || file.response?.url))
    .map(file => file.url || file.response?.url) as string[]

  if (images.length > 0) {
    previewImages.value = images
    previewIndex.value = index
    imageViewerVisible.value = true
  }
}

// 触发视频上传
function triggerVideoUpload() {
  videoInputRef.value?.click()
}

// 处理视频选择
async function handleVideoSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  const file = files[0]

  if (file.size > 50 * 1024 * 1024) {
    MessagePlugin.warning('视频大小不能超过50MB')
    input.value = ''
    return
  }

  MessagePlugin.loading('视频上传中...', 0)
  try {
    const result = await uploadVideoApi(file)
    formData.videoUrl = result.url
    MessagePlugin.closeAll()
    MessagePlugin.success('视频上传成功')
  } catch (error: any) {
    MessagePlugin.closeAll()
    MessagePlugin.error(error.message || '视频上传失败')
  }

  input.value = ''
}

// 播放视频
function playVideo() {
  if (formData.videoUrl) {
    videoPlayerVisible.value = true
  }
}

// 提交表单
async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (valid !== true) return

  submitLoading.value = true
  try {
    const imagesArray = imageList.value
      .filter(file => file.status === 'success')
      .map(file => file.url || file.response?.url)
      .filter(Boolean) as string[]

    const data = {
      name: formData.name,
      categoryId: formData.categoryId!,
      images: JSON.stringify(imagesArray),
      description: formData.description || undefined,
      costPrice: formData.costPrice,
      supplyPrice: formData.supplyPrice,
      suggestedPrice: formData.suggestedPrice || undefined,
      minRetailPrice: formData.minRetailPrice || undefined,
      masterRetailPrice: formData.masterRetailPrice || undefined,
      stock: formData.stock,
      unit: formData.unit,
      purchaseUnit: formData.purchaseUnit,
      unitConversion: formData.unitConversion,
      sort: formData.sort,
      videoUrl: formData.videoUrl || undefined,
      isSpecialPrice: formData.isSpecialPrice, // 【2026-01-26】特价商品标识
    }

    if (isEdit.value && editingId.value) {
      await updateProduct(editingId.value, data)
      MessagePlugin.success('更新成功')
    } else {
      await createProduct(data)
      MessagePlugin.success('创建成功')
    }
    dialogVisible.value = false
    loadProductList()
  } catch (error) {
    console.error('保存商品失败:', error)
  } finally {
    submitLoading.value = false
  }
}

// 切换状态
async function handleToggleStatus(row: Product) {
  try {
    await toggleProductStatus(row.id)
    MessagePlugin.success('状态更新成功')
    loadProductList()
  } catch (error) {
    console.error('切换状态失败:', error)
  }
}

// 初始化
onMounted(() => {
  loadCategoryList()
  loadProductList()
})

// 【2026-01-25新增】清理拖拽实例
onUnmounted(() => {
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
})
</script>

<style scoped>
.products-page {
  padding: var(--spacing-xl);
}

/* 【2026-01-26】特价商品标记 */
.product-cell-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.special-price-tag {
  flex-shrink: 0;
}

.form-item-tip {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  margin-left: 12px;
}

/* 筛选行 */
.filter-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.filter-item {
  min-width: 160px;
}

.filter-item.search-input {
  min-width: 280px;
}

.filter-spacer {
  flex: 1;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.selected-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

/* 【2026-01-25新增】排序按钮组样式 */
.sort-buttons {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.sort-buttons :deep(.t-radio-button__label) {
  display: flex;
  align-items: center;
  gap: 4px;
}

.drag-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* 拖拽手柄样式 */
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  cursor: grab;
  color: var(--color-text-tertiary);
  transition: color var(--transition-fast);
}

.drag-handle:hover {
  color: var(--color-primary);
}

.drag-handle:active {
  cursor: grabbing;
}

/* 拖拽时的幽灵元素 */
:deep(.sortable-ghost) {
  opacity: 0.5;
  background: var(--color-primary-lighter) !important;
}

:deep(.sortable-chosen) {
  background: var(--color-bg-container);
  box-shadow: var(--shadow-card-hover);
}

/* 价格单元格 */
.price-cell {
  line-height: 1.5;
}

.supply-price {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-xs);
}

/* 库存单元格 */
.stock-cell {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-xs);
}

.stock-num {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.stock-num.stock-low {
  color: var(--color-warning);
}

.stock-num.stock-out {
  color: var(--color-danger);
}

.stock-unit {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.sales-num {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}

/* 操作单元格 */
.operation-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.operation-cell :deep(.t-button) {
  width: 32px;
  height: 32px;
  color: var(--color-text-secondary);
}

.operation-cell :deep(.t-button:hover) {
  color: var(--color-primary);
  background: var(--color-primary-lighter);
}

/* 弹窗表单样式 */
.product-form {
  padding: var(--spacing-sm) 0;
}

.form-section {
  margin-bottom: var(--spacing-xl);
}

.section-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.title-tip {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-normal);
  color: var(--color-text-tertiary);
  margin-left: var(--spacing-sm);
}

.optional-tag {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-normal);
  color: var(--color-text-tertiary);
  margin-left: var(--spacing-sm);
}

/* 表单提示和利润预览 */
.form-tip {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-xs);
}

.profit-preview {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.preview-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
}

.preview-item {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  padding: var(--spacing-xs) 0;
}

.preview-label {
  color: var(--color-text-secondary);
}

.preview-value {
  font-weight: var(--font-weight-semibold);
  color: var(--color-success);
}

/* 图片墙样式 */
.image-wall {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.image-item {
  position: relative;
  width: 104px;
  height: 104px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-default);
  transition: all var(--transition-normal);
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-item:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-card-hover);
}

.image-item.is-main {
  border-color: var(--color-primary);
  border-width: 2px;
}

.image-item.is-uploading img {
  opacity: 0.5;
}

.upload-progress {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
}

.image-actions {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.image-item:hover .image-actions {
  opacity: 1;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--color-text-secondary);
}

.action-btn:hover {
  background: #fff;
  color: var(--color-primary);
  transform: scale(1.1);
}

.main-badge {
  position: absolute;
  left: 0;
  bottom: 0;
  padding: 2px var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: #fff;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
  border-top-right-radius: var(--radius-md);
}

.upload-btn {
  width: 104px;
  height: 104px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--color-border-default);
  background: var(--color-bg-container);
  cursor: pointer;
  transition: all var(--transition-normal);
}

.upload-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-lighter);
}

.upload-btn .add-icon {
  font-size: 24px;
  color: var(--color-text-tertiary);
}

.upload-btn:hover .add-icon {
  color: var(--color-primary);
}

.upload-btn .upload-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.upload-btn .upload-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.upload-tips {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* 视频上传样式 */
.video-wall {
  display: flex;
  gap: var(--spacing-md);
}

.video-item {
  position: relative;
  width: 160px;
  height: 104px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: #000;
  border: 1px solid var(--color-border-default);
}

.video-item:hover {
  border-color: var(--color-primary);
}

.video-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-primary);
  font-size: 24px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.video-play-btn:hover {
  transform: translate(-50%, -50%) scale(1.1);
  background: #fff;
}

.video-item .video-actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.video-item:hover .video-actions {
  opacity: 1;
}

.video-item:hover .video-play-btn {
  opacity: 0;
}

.video-badge {
  position: absolute;
  left: 0;
  bottom: 0;
  padding: 2px var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: #fff;
  background: linear-gradient(135deg, var(--color-info), var(--color-info-hover));
  border-top-right-radius: var(--radius-md);
}

.video-upload-btn {
  width: 160px;
}

.video-upload-btn .upload-limit {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.video-player {
  width: 100%;
  max-height: 400px;
  background: #000;
}

/* 底部按钮 */
.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--color-border-light);
}

/* 响应式 */
@media (max-width: 768px) {
  .products-page {
    padding: var(--spacing-md);
  }

  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-item {
    min-width: 100%;
  }

  .filter-spacer {
    display: none;
  }

  .image-wall {
    gap: var(--spacing-sm);
  }

  .image-item,
  .upload-btn {
    width: 80px;
    height: 80px;
  }

  .video-item,
  .video-upload-btn {
    width: 120px;
    height: 80px;
  }
}
</style>
