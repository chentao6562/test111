<template>
  <div class="agent-prices-page">
    <!-- 页面标题 -->
    <PageHeader title="推销员定价管理" subtitle="查看和管理推销员为商品设置的定价">
      <template #actions>
        <t-button variant="outline" @click="handleExport">
          <template #icon><t-icon name="download" /></template>
          导出数据
        </t-button>
      </template>
    </PageHeader>

    <!-- 筛选区域 -->
    <FilterCard>
      <t-form layout="inline" :data="filterForm" @submit="handleSearch">
        <t-form-item label="推销员">
          <t-select
            v-model="filterForm.agentId"
            placeholder="选择推销员"
            clearable
            filterable
            style="width: 200px"
            :loading="agentsLoading"
          >
            <t-option
              v-for="agent in agentOptions"
              :key="agent.id"
              :value="agent.id"
              :label="`${agent.name} (${agent.phone})`"
            />
          </t-select>
        </t-form-item>
        <t-form-item label="商品">
          <t-select
            v-model="filterForm.productId"
            placeholder="选择商品"
            clearable
            filterable
            style="width: 200px"
            :loading="productsLoading"
          >
            <t-option
              v-for="product in productOptions"
              :key="product.id"
              :value="product.id"
              :label="product.name"
            />
          </t-select>
        </t-form-item>
        <t-form-item label="推销员等级">
          <t-select
            v-model="filterForm.agentType"
            placeholder="全部等级"
            clearable
            style="width: 140px"
          >
            <t-option value="LEVEL1" label="一级推销员" />
            <t-option value="LEVEL2" label="二级推销员" />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-space>
            <t-button theme="primary" type="submit">查询</t-button>
            <t-button variant="outline" @click="handleReset">重置</t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </FilterCard>

    <!-- 数据表格 -->
    <TableCard title="定价列表">
      <template v-if="!loading && tableData.length === 0">
        <EmptyState
          v-if="hasFilters"
          type="search"
          title="未找到匹配的定价记录"
          description="请尝试调整筛选条件"
        >
          <template #action>
            <t-button theme="primary" @click="handleReset">清除筛选</t-button>
          </template>
        </EmptyState>
        <EmptyState
          v-else
          type="data"
          title="暂无定价数据"
          description="推销员设置商品价格后将在此显示"
        />
      </template>

      <t-table
        v-else
        :data="tableData"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        stripe
        hover
        @page-change="handlePageChange"
      >
        <!-- 推销员信息列 -->
        <template #agentInfo="{ row }">
          <div class="agent-info">
            <div class="agent-avatar" :class="getAvatarClass(row.agentType)">
              {{ row.agentName?.charAt(0) || '?' }}
            </div>
            <div class="agent-detail">
              <div class="agent-name">{{ row.agentName }}</div>
              <div class="agent-phone">{{ formatPhone(row.agentPhone) }}</div>
            </div>
          </div>
        </template>

        <!-- 推销员等级列 -->
        <template #agentType="{ row }">
          <StatusTag
            :type="getLevelTagType(row.agentType)"
            :text="AGENT_TYPES[row.agentType]?.label || row.agentType"
          />
        </template>

        <!-- 商品信息列 -->
        <template #productInfo="{ row }">
          <div class="product-info">
            <img
              v-if="row.productImage"
              :src="getProductImage(row.productImage)"
              class="product-image"
              alt=""
            />
            <div class="product-image placeholder" v-else>
              <t-icon name="image" />
            </div>
            <span class="product-name">{{ row.productName }}</span>
          </div>
        </template>

        <!-- 供货价列 -->
        <template #supplyPrice="{ row }">
          <AmountText :value="row.supplyPrice" />
        </template>

        <!-- 给二级的价列 -->
        <template #subPrice="{ row }">
          <template v-if="row.agentType === 'LEVEL1'">
            <AmountText v-if="row.subPrice" :value="row.subPrice" />
            <span v-else class="price-not-set">未设置</span>
          </template>
          <span v-else class="price-na">-</span>
        </template>

        <!-- 零售价列 -->
        <template #retailPrice="{ row }">
          <AmountText v-if="row.retailPrice" :value="row.retailPrice" />
          <span v-else class="price-not-set">未设置</span>
        </template>

        <!-- 利润预估列 -->
        <template #profitEstimate="{ row }">
          <div class="profit-info" v-if="row.retailPrice">
            <span class="profit-value">{{ formatProfit(row) }}</span>
            <span class="profit-label">预估利润</span>
          </div>
          <span v-else class="price-na">-</span>
        </template>

        <!-- 更新时间列 -->
        <template #updatedAt="{ row }">
          <div class="time-cell">
            <div class="time-date">{{ formatDate(row.updatedAt) }}</div>
            <div class="time-detail">{{ formatTime(row.updatedAt) }}</div>
          </div>
        </template>
      </t-table>
    </TableCard>
  </div>
</template>

<script setup lang="ts">
/**
 * 推销员定价管理页面
 * 查看和管理推销员为商品设置的定价
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import {
  PageHeader,
  FilterCard,
  TableCard,
  StatusTag,
  AmountText,
  EmptyState,
} from '@/components'
import request from '@/api/request'

// 推销员类型映射
const AGENT_TYPES: Record<string, { label: string }> = {
  LEVEL1: { label: '一级推销员' },
  LEVEL2: { label: '二级推销员' },
}

// 筛选表单
const filterForm = reactive({
  agentId: null as number | null,
  productId: null as number | null,
  agentType: '',
})

// 选项数据
const agentOptions = ref<any[]>([])
const productOptions = ref<any[]>([])
const agentsLoading = ref(false)
const productsLoading = ref(false)

// 表格数据
const tableData = ref<any[]>([])
const loading = ref(false)

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

// 是否有筛选条件
const hasFilters = computed(() => {
  return filterForm.agentId || filterForm.productId || filterForm.agentType
})

// 表格列定义
const columns = [
  { colKey: 'agentInfo', title: '推销员', width: 200 },
  { colKey: 'agentType', title: '等级', width: 100 },
  { colKey: 'productInfo', title: '商品', width: 200 },
  { colKey: 'supplyPrice', title: '供货价', width: 100 },
  { colKey: 'subPrice', title: '给二级的价', width: 100 },
  { colKey: 'retailPrice', title: '零售价', width: 100 },
  { colKey: 'profitEstimate', title: '利润预估', width: 120 },
  { colKey: 'updatedAt', title: '更新时间', width: 140 },
]

// 获取头像样式类
function getAvatarClass(type: string): string {
  const map: Record<string, string> = {
    LEVEL1: 'avatar-level1',
    LEVEL2: 'avatar-level2',
  }
  return map[type] || 'avatar-default'
}

// 获取层级标签类型
function getLevelTagType(type: string): string {
  const map: Record<string, string> = {
    LEVEL1: 'warning',
    LEVEL2: 'info',
  }
  return map[type] || 'default'
}

// 格式化手机号
function formatPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

// 格式化日期
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// 格式化时间
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 获取商品图片
function getProductImage(images: string | string[]): string {
  if (Array.isArray(images)) {
    return images[0] || ''
  }
  try {
    const arr = JSON.parse(images)
    return Array.isArray(arr) ? arr[0] : images
  } catch {
    return images
  }
}

// 计算利润
function formatProfit(row: any): string {
  if (!row.retailPrice) return '-'

  let profit = 0
  if (row.agentType === 'LEVEL1') {
    // 一级利润 = 零售价 - 供货价
    profit = row.retailPrice - (row.supplyPrice || 0)
  } else if (row.agentType === 'LEVEL2') {
    // 二级利润 = 零售价 - 上级给的价（需要从其他地方获取，这里简化处理）
    // 由于 API 不返回上级给的价，这里暂时显示零售价
    profit = row.retailPrice - (row.supplyPrice || 0)
  }

  return `¥${profit.toFixed(2)}`
}

// 加载推销员选项
async function loadAgentOptions() {
  agentsLoading.value = true
  try {
    const res = await request.get('/admin/agents', { params: { page: 1, pageSize: 200, status: 'ACTIVE' } })
    if (res.code === 0 || res.code === 200) {
      agentOptions.value = res.data.list || []
    }
  } catch (err) {
    console.error('加载推销员列表失败:', err)
  } finally {
    agentsLoading.value = false
  }
}

// 加载商品选项
async function loadProductOptions() {
  productsLoading.value = true
  try {
    const res = await request.get('/admin/products', { params: { page: 1, pageSize: 200, status: 'ACTIVE' } })
    if (res.code === 0 || res.code === 200) {
      productOptions.value = res.data.list || res.data || []
    }
  } catch (err) {
    console.error('加载商品列表失败:', err)
  } finally {
    productsLoading.value = false
  }
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.current,
      pageSize: pagination.pageSize,
    }
    if (filterForm.agentId) params.agentId = filterForm.agentId
    if (filterForm.productId) params.productId = filterForm.productId

    const res = await request.get('/admin/agent-prices', { params })

    if (res.code === 0 || res.code === 200) {
      let list = res.data.list || []

      // 如果有等级筛选，前端过滤
      if (filterForm.agentType) {
        list = list.filter((item: any) => item.agentType === filterForm.agentType)
      }

      tableData.value = list
      pagination.total = res.data.total || 0
    }
  } catch (err) {
    console.error('加载定价列表失败:', err)
    MessagePlugin.error('加载定价列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  pagination.current = 1
  loadData()
}

// 重置筛选
function handleReset() {
  filterForm.agentId = null
  filterForm.productId = null
  filterForm.agentType = ''
  pagination.current = 1
  loadData()
}

// 分页变化
function handlePageChange(pageInfo: { current: number; pageSize: number }) {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  loadData()
}

// 导出数据
function handleExport() {
  MessagePlugin.info('导出功能开发中')
}

// 初始化
onMounted(() => {
  loadData()
  loadAgentOptions()
  loadProductOptions()
})
</script>

<style scoped>
.agent-prices-page {
  padding: 0;
}

/* 推销员信息 */
.agent-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.agent-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: #fff;
  flex-shrink: 0;
}

.agent-avatar.avatar-level1 {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.agent-avatar.avatar-level2 {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.agent-avatar.avatar-default {
  background: var(--color-bg-hover);
  color: var(--color-text-tertiary);
}

.agent-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.agent-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.agent-phone {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* 商品信息 */
.product-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.product-image {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  object-fit: cover;
  flex-shrink: 0;
}

.product-image.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-page);
  color: var(--color-text-placeholder);
}

.product-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 价格状态 */
.price-not-set {
  font-size: var(--font-size-sm);
  color: var(--color-warning);
}

.price-na {
  font-size: var(--font-size-sm);
  color: var(--color-text-placeholder);
}

/* 利润信息 */
.profit-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.profit-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-success);
}

.profit-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* 时间单元格 */
.time-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.time-date {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.time-detail {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
</style>
