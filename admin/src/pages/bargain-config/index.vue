<script setup lang="ts">
/**
 * 砍价活动配置管理页面
 * @since 2026-01-22
 */
import { ref, onMounted } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next'
import request from '@/api/request'
import {
  getConfigList,
  createConfig,
  updateConfig,
  deleteConfig,
  toggleConfig,
  type BargainConfig,
  type BargainConfigItem
} from '@/api/bargain'

// 表格数据
const data = ref<BargainConfig[]>([])
const loading = ref(false)
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
})

// 搜索条件
const searchForm = ref({
  status: ''
})

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const editingId = ref<number | null>(null)

// 表单数据
const formData = ref({
  name: '',
  startTime: '',
  endTime: '',
  bargainHours: 24,
  minBargainCount: 3,
  maxBargainCount: 20,
  newUserBonus: 2,
  costBearerType: 'PLATFORM',
  agentBearRatio: 50,
  minCartAmount: 0, // 【2026-01-23】采购单门槛金额
  isActive: true,
  items: [] as BargainConfigItem[]
})

// 商品列表
const products = ref<any[]>([])
const productLoading = ref(false)

// 表格列定义
const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 60 },
  { colKey: 'name', title: '活动名称', minWidth: 150 },
  { colKey: 'bargainHours', title: '砍价时限', width: 100, cell: 'bargainHours' },
  { colKey: 'bargainCount', title: '砍价次数', width: 120, cell: 'bargainCount' },
  { colKey: 'newUserBonus', title: '新用户加成', width: 100, cell: 'newUserBonus' },
  { colKey: 'costBearerType', title: '成本承担', width: 100, cell: 'costBearer' },
  { colKey: 'timeRange', title: '活动时间', width: 200, cell: 'timeRange' },
  { colKey: 'isActive', title: '状态', width: 80, cell: 'status' },
  { colKey: 'action', title: '操作', width: 180, fixed: 'right', cell: 'action' }
]

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'inactive' }
]

// 成本承担选项
const costBearerOptions = [
  { label: '平台承担', value: 'PLATFORM' },
  { label: '按比例分摊', value: 'SHARED' },
  { label: '推销员承担', value: 'AGENT' }
]

// 成本承担标签
const costBearerLabels: Record<string, string> = {
  PLATFORM: '平台全部',
  SHARED: '按比例',
  AGENT: '推销员'
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res = await getConfigList({
      page: pagination.value.current,
      pageSize: pagination.value.pageSize,
      status: searchForm.value.status
    })
    if (res.data) {
      data.value = res.data.list || []
      pagination.value.total = res.data.total || 0
    }
  } catch {
    MessagePlugin.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 加载商品列表
const loadProducts = async () => {
  productLoading.value = true
  try {
    const res = await request.get('/admin/products', {
      params: { page: 1, pageSize: 100, status: 'ACTIVE' }
    })
    products.value = res.data?.list || res.data || []
  } catch {
    // ignore
  } finally {
    productLoading.value = false
  }
}

// 分页变化
const onPageChange = (pageInfo: PageInfo) => {
  pagination.value.current = pageInfo.current
  pagination.value.pageSize = pageInfo.pageSize
  loadData()
}

// 搜索
const onSearch = () => {
  pagination.value.current = 1
  loadData()
}

// 重置
const onReset = () => {
  searchForm.value = { status: '' }
  pagination.value.current = 1
  loadData()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增砍价活动'
  editingId.value = null
  formData.value = {
    name: '',
    startTime: '',
    endTime: '',
    bargainHours: 24,
    minBargainCount: 3,
    maxBargainCount: 20,
    newUserBonus: 2,
    costBearerType: 'PLATFORM',
    agentBearRatio: 50,
    minCartAmount: 0, // 【2026-01-23】采购单门槛
    isActive: true,
    items: []
  }
  dialogVisible.value = true
}

// 编辑
const handleEdit = async (row: BargainConfig) => {
  dialogTitle.value = '编辑砍价活动'
  editingId.value = row.id

  // 加载详情
  try {
    const res = await request.get(`/admin/bargain/config/${row.id}`)
    const detail = res.data
    formData.value = {
      name: detail.name,
      startTime: detail.startTime ? detail.startTime.slice(0, 16) : '',
      endTime: detail.endTime ? detail.endTime.slice(0, 16) : '',
      bargainHours: detail.bargainHours,
      minBargainCount: detail.minBargainCount,
      maxBargainCount: detail.maxBargainCount,
      newUserBonus: detail.newUserBonus,
      costBearerType: detail.costBearerType,
      agentBearRatio: detail.agentBearRatio || 50,
      minCartAmount: detail.minCartAmount || 0, // 【2026-01-23】采购单门槛
      isActive: detail.isActive,
      items: detail.items || []
    }
  } catch {
    formData.value = {
      name: row.name,
      startTime: row.startTime ? row.startTime.slice(0, 16) : '',
      endTime: row.endTime ? row.endTime.slice(0, 16) : '',
      bargainHours: row.bargainHours,
      minBargainCount: row.minBargainCount,
      maxBargainCount: row.maxBargainCount,
      newUserBonus: row.newUserBonus,
      costBearerType: row.costBearerType,
      agentBearRatio: row.agentBearRatio || 50,
      minCartAmount: (row as any).minCartAmount || 0, // 【2026-01-23】采购单门槛
      isActive: row.isActive,
      items: row.items || []
    }
  }

  dialogVisible.value = true
}

// 删除
const handleDelete = (row: BargainConfig) => {
  const confirmDia = DialogPlugin.confirm({
    header: '确认删除',
    body: `确定要删除"${row.name}"活动吗？`,
    confirmBtn: '删除',
    onConfirm: async () => {
      try {
        await deleteConfig(row.id)
        MessagePlugin.success('删除成功')
        loadData()
        confirmDia.hide()
      } catch (error: any) {
        MessagePlugin.error(error.message || '删除失败')
      }
    }
  })
}

// 切换状态
const handleToggle = async (row: BargainConfig) => {
  try {
    await toggleConfig(row.id)
    MessagePlugin.success(row.isActive ? '已禁用' : '已启用')
    loadData()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  }
}

// 添加商品
const handleAddItem = () => {
  formData.value.items.push({
    productId: 0,
    originalPrice: 0,
    floorPrice: 0,
    bargainStock: 0,
    limitPerUser: 1,
    sort: formData.value.items.length
  })
}

// 删除商品
const handleRemoveItem = (index: number) => {
  formData.value.items.splice(index, 1)
}

// 提交表单
const handleSubmit = async () => {
  if (!formData.value.name.trim()) {
    MessagePlugin.warning('请输入活动名称')
    return
  }
  if (!formData.value.startTime || !formData.value.endTime) {
    MessagePlugin.warning('请选择活动时间')
    return
  }
  if (new Date(formData.value.startTime) >= new Date(formData.value.endTime)) {
    MessagePlugin.warning('结束时间必须晚于开始时间')
    return
  }
  if (formData.value.items.length === 0) {
    MessagePlugin.warning('请至少添加一个商品')
    return
  }

  // 验证商品
  for (const item of formData.value.items) {
    if (!item.productId) {
      MessagePlugin.warning('请选择商品')
      return
    }
    if (item.floorPrice >= item.originalPrice) {
      MessagePlugin.warning('底价必须低于原价')
      return
    }
  }

  formLoading.value = true
  try {
    const submitData = {
      name: formData.value.name,
      startTime: formData.value.startTime,
      endTime: formData.value.endTime,
      bargainHours: formData.value.bargainHours,
      minBargainCount: formData.value.minBargainCount,
      maxBargainCount: formData.value.maxBargainCount,
      newUserBonus: formData.value.newUserBonus,
      costBearerType: formData.value.costBearerType,
      agentBearRatio: formData.value.agentBearRatio,
      minCartAmount: formData.value.minCartAmount, // 【2026-01-23】采购单门槛
      isActive: formData.value.isActive,
      items: formData.value.items.map(item => ({
        productId: item.productId,
        originalPrice: item.originalPrice,
        floorPrice: item.floorPrice,
        bargainStock: item.bargainStock,
        limitPerUser: item.limitPerUser,
        sort: item.sort
      }))
    }

    if (editingId.value) {
      await updateConfig(editingId.value, submitData)
      MessagePlugin.success('更新成功')
    } else {
      await createConfig(submitData)
      MessagePlugin.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  } finally {
    formLoading.value = false
  }
}

// 格式化时间
const formatTime = (timeStr: string | null) => {
  if (!timeStr) return '-'
  return new Date(timeStr).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 检查活动是否在有效期内
const isActivityActive = (row: BargainConfig) => {
  const now = new Date()
  if (row.startTime && new Date(row.startTime) > now) return false
  if (row.endTime && new Date(row.endTime) < now) return false
  return true
}

onMounted(() => {
  loadData()
  loadProducts()
})
</script>

<template>
  <div class="page-container">
    <!-- 功能说明 -->
    <t-card class="info-card" :bordered="false">
      <div class="info-content">
        <t-icon name="discount" size="24px" style="color: var(--td-error-color)" />
        <div class="info-text">
          <h3>砍价活动说明</h3>
          <p>
            用户选择商品发起砍价，邀请好友帮忙砍价，达到底价后可以优惠价预约。
            成本默认由平台（总代理）承担，推销员利润不受影响。
          </p>
        </div>
      </div>
    </t-card>

    <!-- 搜索栏 -->
    <t-card class="search-card" :bordered="false">
      <t-form :data="searchForm" layout="inline">
        <t-form-item label="状态" name="status">
          <t-select
            v-model="searchForm.status"
            :options="statusOptions"
            placeholder="请选择状态"
            style="width: 200px"
            clearable
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" @click="onSearch">查询</t-button>
          <t-button theme="default" variant="base" @click="onReset">重置</t-button>
          <t-button theme="success" @click="handleAdd">新增活动</t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <!-- 表格 -->
    <t-card class="table-card" :bordered="false">
      <t-table
        :data="data"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="onPageChange"
      >
        <template #empty>
          <div style="padding: 40px; text-align: center; color: #999;">
            暂无砍价活动配置
          </div>
        </template>

        <!-- 砍价时限 -->
        <template #bargainHours="{ row }">
          {{ row.bargainHours }}小时
        </template>

        <!-- 砍价次数 -->
        <template #bargainCount="{ row }">
          {{ row.minBargainCount }}-{{ row.maxBargainCount }}次
        </template>

        <!-- 新用户加成 -->
        <template #newUserBonus="{ row }">
          <t-tag theme="warning">{{ row.newUserBonus }}x</t-tag>
        </template>

        <!-- 成本承担 -->
        <template #costBearer="{ row }">
          {{ costBearerLabels[row.costBearerType] || row.costBearerType }}
        </template>

        <!-- 活动时间 -->
        <template #timeRange="{ row }">
          <div class="time-range">
            <div>{{ formatTime(row.startTime) }}</div>
            <div class="time-separator">至</div>
            <div>{{ formatTime(row.endTime) }}</div>
            <t-tag
              v-if="!isActivityActive(row)"
              theme="warning"
              size="small"
              style="margin-left: 8px"
            >
              未在有效期
            </t-tag>
          </div>
        </template>

        <!-- 状态 -->
        <template #status="{ row }">
          <t-tag v-if="row.isActive" theme="success">启用</t-tag>
          <t-tag v-else theme="danger">禁用</t-tag>
        </template>

        <!-- 操作 -->
        <template #action="{ row }">
          <t-space>
            <t-link theme="primary" @click="handleEdit(row)">编辑</t-link>
            <t-link
              :theme="row.isActive ? 'warning' : 'success'"
              @click="handleToggle(row)"
            >
              {{ row.isActive ? '禁用' : '启用' }}
            </t-link>
            <t-link theme="danger" @click="handleDelete(row)">删除</t-link>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 编辑对话框 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="dialogTitle"
      width="800px"
      :confirm-btn="{ content: '提交', loading: formLoading }"
      :on-confirm="handleSubmit"
    >
      <t-form :data="formData" label-width="120px">
        <!-- 基本信息 -->
        <t-divider>基本信息</t-divider>

        <t-form-item label="活动名称" name="name" required>
          <t-input v-model="formData.name" placeholder="例如：春节砍价活动" maxlength="100" />
        </t-form-item>

        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item label="砍价有效期" name="bargainHours" help="发起砍价后有效时长">
              <t-input-number v-model="formData.bargainHours" :min="1" :max="168" suffix="小时" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="基准砍价人数" name="minBargainCount" help="用于计算展示参考（实际为黑箱算法）">
              <t-input-number v-model="formData.minBargainCount" :min="1" :max="50" suffix="人" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="最多帮砍人数" name="maxBargainCount" help="超过此人数不能再帮砍">
              <t-input-number v-model="formData.maxBargainCount" :min="1" :max="500" suffix="人" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="新用户加成" name="newUserBonus" help="新用户帮砍金额翻倍">
              <t-input-number v-model="formData.newUserBonus" :min="1" :max="5" :decimal-places="1" suffix="倍" />
            </t-form-item>
          </t-col>
        </t-row>

        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item label="成本承担方" name="costBearerType">
              <t-select v-model="formData.costBearerType" :options="costBearerOptions" />
            </t-form-item>
          </t-col>
          <t-col :span="6" v-if="formData.costBearerType === 'SHARED'">
            <t-form-item label="推销员比例" name="agentBearRatio">
              <t-input-number v-model="formData.agentBearRatio" :min="0" :max="100" suffix="%" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="采购单门槛" name="minCartAmount" help="用户采购单需满此金额才能参与砍价（0=不限）">
              <t-input-number v-model="formData.minCartAmount" :min="0" :decimal-places="2" suffix="元" />
            </t-form-item>
          </t-col>
        </t-row>

        <!-- 活动时间 -->
        <t-divider>活动时间</t-divider>

        <t-row :gutter="16">
          <t-col :span="12">
            <t-form-item label="开始时间" name="startTime" required>
              <t-date-picker
                v-model="formData.startTime"
                mode="date"
                enable-time-picker
                format="YYYY-MM-DD HH:mm"
                placeholder="选择开始时间"
                style="width: 100%"
              />
            </t-form-item>
          </t-col>
          <t-col :span="12">
            <t-form-item label="结束时间" name="endTime" required>
              <t-date-picker
                v-model="formData.endTime"
                mode="date"
                enable-time-picker
                format="YYYY-MM-DD HH:mm"
                placeholder="选择结束时间"
                style="width: 100%"
              />
            </t-form-item>
          </t-col>
        </t-row>

        <!-- 砍价商品 -->
        <t-divider>砍价商品</t-divider>

        <div class="items-section">
          <t-button theme="primary" variant="outline" @click="handleAddItem">
            <t-icon name="add" /> 添加商品
          </t-button>

          <div class="items-list" v-if="formData.items.length > 0">
            <!-- 表头行 -->
            <div class="item-header">
              <span class="col-product">商品</span>
              <span class="col-price">原价</span>
              <span class="col-price">底价</span>
              <span class="col-calc">需砍</span>
              <span class="col-calc">约每次砍</span>
              <span class="col-stock">库存</span>
              <span class="col-limit">限购</span>
              <span class="col-action">操作</span>
            </div>
            <div class="item-row" v-for="(item, index) in formData.items" :key="index">
              <t-select
                v-model="item.productId"
                placeholder="选择商品"
                :options="products.map(p => ({ label: p.name, value: p.id }))"
                class="col-product"
                filterable
              />
              <t-input-number
                v-model="item.originalPrice"
                :min="0"
                :decimal-places="2"
                placeholder="原价"
                class="col-price"
                theme="normal"
              />
              <t-input-number
                v-model="item.floorPrice"
                :min="0"
                :decimal-places="2"
                placeholder="底价"
                class="col-price"
                theme="normal"
              />
              <!-- 需砍金额（自动计算） -->
              <span class="col-calc calc-value">
                ¥{{ ((item.originalPrice || 0) - (item.floorPrice || 0)).toFixed(2) }}
              </span>
              <!-- 约每次砍（自动计算） -->
              <span class="col-calc calc-value">
                ¥{{ formData.minBargainCount > 0 ? (((item.originalPrice || 0) - (item.floorPrice || 0)) / formData.minBargainCount).toFixed(2) : '0.00' }}
              </span>
              <t-input-number
                v-model="item.bargainStock"
                :min="0"
                placeholder="0不限"
                class="col-stock"
                theme="normal"
              />
              <t-input-number
                v-model="item.limitPerUser"
                :min="1"
                placeholder="限购"
                class="col-limit"
                theme="normal"
              />
              <t-button theme="danger" variant="text" class="col-action" @click="handleRemoveItem(index)">
                <t-icon name="delete" />
              </t-button>
            </div>
          </div>
          <div v-else class="no-items">
            暂未添加商品
          </div>
        </div>

        <!-- 状态 -->
        <t-divider>状态设置</t-divider>

        <t-form-item label="状态" name="isActive">
          <t-radio-group v-model="formData.isActive">
            <t-radio :value="true">启用</t-radio>
            <t-radio :value="false">禁用</t-radio>
          </t-radio-group>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<style scoped lang="less">
.page-container {
  padding: 20px;
}

.info-card {
  margin-bottom: 20px;
  background: linear-gradient(135deg, #fff1f0 0%, #fff0f0 100%);
}

.info-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.info-text {
  h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #e53935;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #666;
  }
}

.search-card {
  margin-bottom: 20px;
}

.table-card {
  .time-range {
    font-size: 12px;
    line-height: 1.5;

    .time-separator {
      color: #999;
    }
  }
}

.items-section {
  margin-top: 12px;
}

.items-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f0f0f0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

/* 列宽定义 - 表头和数据行共用 */
.col-product {
  flex: 0 0 180px;
  min-width: 180px;
}

.col-price {
  flex: 0 0 100px;
  min-width: 100px;
}

.col-stock {
  flex: 0 0 90px;
  min-width: 90px;
}

.col-limit {
  flex: 0 0 60px;
  min-width: 60px;
}

.col-calc {
  flex: 0 0 80px;
  min-width: 80px;
  text-align: center;
}

.calc-value {
  color: #e53935;
  font-weight: 500;
  font-size: 13px;
}

.col-action {
  flex: 0 0 50px;
  min-width: 50px;
  text-align: center;
}

.no-items {
  margin-top: 12px;
  padding: 20px;
  text-align: center;
  color: #999;
  background: #f9f9f9;
  border-radius: 8px;
}
</style>
