<template>
  <div class="warehouse-page">
    <!-- 页面标题 -->
    <PageHeader title="仓库管理" subtitle="管理多个提货点（仓库），支持多仓库分发订单">
      <template #actions>
        <t-button theme="primary" @click="handleCreate">
          <template #icon><t-icon name="add" /></template>
          新建仓库
        </t-button>
      </template>
    </PageHeader>

    <!-- 统计卡片 -->
    <t-row :gutter="16" class="stat-row">
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-value">{{ stats.totalCount || 0 }}</div>
          <div class="stat-label">仓库总数</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card stat-active">
          <div class="stat-value">{{ stats.activeCount || 0 }}</div>
          <div class="stat-label">运营中</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card stat-inactive">
          <div class="stat-value">{{ stats.inactiveCount || 0 }}</div>
          <div class="stat-label">已停用</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card stat-orders">
          <div class="stat-value">{{ todayOrdersTotal }}</div>
          <div class="stat-label">今日订单</div>
        </t-card>
      </t-col>
    </t-row>

    <!-- 筛选栏 -->
    <t-card :bordered="false" class="filter-card">
      <t-form :data="filters" layout="inline" @submit="handleSearch" @reset="handleReset">
        <t-form-item label="关键词">
          <t-input
            v-model="filters.keyword"
            placeholder="仓库名称/编码/地址/电话"
            clearable
            style="width: 220px"
          />
        </t-form-item>
        <t-form-item label="状态">
          <t-select
            v-model="filters.status"
            placeholder="全部"
            clearable
            style="width: 120px"
          >
            <t-option value="ACTIVE" label="运营中" />
            <t-option value="INACTIVE" label="已停用" />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" type="submit">搜索</t-button>
          <t-button theme="default" type="reset" style="margin-left: 8px">重置</t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <!-- 数据表格 -->
    <TableCard title="仓库列表">
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
            :type="filters.keyword || filters.status ? 'search' : 'data'"
            :title="filters.keyword || filters.status ? '未找到匹配结果' : '暂无仓库'"
            :description="filters.keyword || filters.status ? '请尝试调整筛选条件' : '点击右上角【新建仓库】添加第一个仓库'"
          />
        </template>

        <!-- 仓库名称列（含默认标记） -->
        <template #name="{ row }">
          <div class="warehouse-name">
            <span>{{ row.name }}</span>
            <t-tag v-if="row.isDefault" theme="primary" size="small" style="margin-left: 8px">默认</t-tag>
          </div>
          <div class="warehouse-code">{{ row.code }}</div>
        </template>

        <!-- 地址列 -->
        <template #address="{ row }">
          <div class="address-text">
            {{ row.province }}{{ row.city }}{{ row.district || '' }}
          </div>
          <div class="address-detail">{{ row.address }}</div>
        </template>

        <!-- 联系方式列 -->
        <template #contact="{ row }">
          <div v-if="row.contactName">{{ row.contactName }}</div>
          <div>{{ row.contactPhone }}</div>
        </template>

        <!-- 统计列 -->
        <template #stats="{ row }">
          <div>库管：{{ row._count?.staff || 0 }}人</div>
          <div>订单：{{ row._count?.orders || 0 }}单</div>
        </template>

        <!-- 状态列 -->
        <template #status="{ row }">
          <t-tag v-if="row.status === 'ACTIVE'" theme="success">运营中</t-tag>
          <t-tag v-else theme="default">已停用</t-tag>
        </template>

        <!-- 操作列 -->
        <template #operation="{ row }">
          <t-space>
            <t-link theme="primary" @click="handleEdit(row)">编辑</t-link>
            <t-link
              v-if="!row.isDefault && row.status === 'ACTIVE'"
              theme="warning"
              @click="handleSetDefault(row)"
            >
              设为默认
            </t-link>
            <t-link
              v-if="row.status === 'ACTIVE'"
              theme="danger"
              @click="handleDisable(row)"
            >
              停用
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
      :header="formMode === 'create' ? '新建仓库' : '编辑仓库'"
      :width="640"
      :confirm-btn="{ content: '确定', loading: formSubmitting }"
      @confirm="handleFormSubmit"
    >
      <t-form
        :data="formData"
        :rules="formRules"
        ref="formRef"
        label-width="100px"
      >
        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item label="仓库名称" name="name">
              <t-input
                v-model="formData.name"
                placeholder="如：蒙庆烟花总仓"
              />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="仓库编码" name="code">
              <t-input
                v-model="formData.code"
                placeholder="如：WH001"
                :disabled="formMode === 'edit'"
              />
            </t-form-item>
          </t-col>
        </t-row>

        <t-row :gutter="16">
          <t-col :span="4">
            <t-form-item label="省份" name="province">
              <t-input v-model="formData.province" placeholder="省份" />
            </t-form-item>
          </t-col>
          <t-col :span="4">
            <t-form-item label="城市" name="city">
              <t-input v-model="formData.city" placeholder="城市" />
            </t-form-item>
          </t-col>
          <t-col :span="4">
            <t-form-item label="区县">
              <t-input v-model="formData.district" placeholder="区县（可选）" />
            </t-form-item>
          </t-col>
        </t-row>

        <t-form-item label="详细地址" name="address">
          <t-input
            v-model="formData.address"
            placeholder="详细街道门牌号"
          />
        </t-form-item>

        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item label="联系人">
              <t-input v-model="formData.contactName" placeholder="联系人姓名（可选）" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="联系电话" name="contactPhone">
              <t-input v-model="formData.contactPhone" placeholder="联系电话" />
            </t-form-item>
          </t-col>
        </t-row>

        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item label="营业时间">
              <t-input v-model="formData.businessHours" placeholder="如：08:00-18:00" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="排序">
              <t-input-number
                v-model="formData.sort"
                :min="0"
                :max="999"
                placeholder="数值越小越靠前"
                style="width: 100%"
              />
            </t-form-item>
          </t-col>
        </t-row>

        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item label="经度">
              <t-input v-model="formData.longitude" placeholder="可选，用于地图定位" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="纬度">
              <t-input v-model="formData.latitude" placeholder="可选，用于地图定位" />
            </t-form-item>
          </t-col>
        </t-row>

        <t-form-item label="设为默认" v-if="formMode === 'create'">
          <t-switch v-model="formData.isDefault" />
          <span class="form-tip">默认仓库将作为代理商下单时的默认提货点</span>
        </t-form-item>

        <t-form-item label="状态" v-if="formMode === 'edit'">
          <t-radio-group v-model="formData.status">
            <t-radio value="ACTIVE">运营中</t-radio>
            <t-radio value="INACTIVE">已停用</t-radio>
          </t-radio-group>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { PageHeader, TableCard, EmptyState } from '@/components'
import {
  getWarehouseList,
  createWarehouse,
  updateWarehouse,
  setDefaultWarehouse,
  getWarehouseStats,
  type Warehouse
} from '@/api/warehouse'

// 统计数据
const stats = ref<any>({})

// 计算今日订单总数
const todayOrdersTotal = computed(() => {
  if (!stats.value.todayOrderCounts) return 0
  return stats.value.todayOrderCounts.reduce((sum: number, item: any) => sum + (item._count || 0), 0)
})

// 筛选条件
const filters = reactive({
  keyword: '',
  status: ''
})

// 表格数据
const loading = ref(false)
const tableData = ref<Warehouse[]>([])
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

// 表格列定义
const columns = [
  { colKey: 'name', title: '仓库名称', width: 200 },
  { colKey: 'address', title: '地址', minWidth: 250 },
  { colKey: 'contact', title: '联系方式', width: 140 },
  { colKey: 'businessHours', title: '营业时间', width: 120 },
  { colKey: 'stats', title: '统计', width: 100 },
  { colKey: 'status', title: '状态', width: 90 },
  { colKey: 'operation', title: '操作', width: 180, fixed: 'right' }
]

// 表单相关
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const formSubmitting = ref(false)
const formRef = ref<any>(null)
const formData = reactive({
  id: 0,
  name: '',
  code: '',
  province: '',
  city: '',
  district: '',
  address: '',
  latitude: '',
  longitude: '',
  contactName: '',
  contactPhone: '',
  businessHours: '',
  isDefault: false,
  sort: 0,
  status: 'ACTIVE'
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入仓库名称' },
    { max: 100, message: '仓库名称不能超过100个字符' }
  ],
  code: [
    { required: true, message: '请输入仓库编码' },
    { pattern: /^[A-Z0-9]{2,20}$/, message: '仓库编码为2-20位大写字母或数字' }
  ],
  province: [
    { required: true, message: '请输入省份' }
  ],
  city: [
    { required: true, message: '请输入城市' }
  ],
  address: [
    { required: true, message: '请输入详细地址' }
  ],
  contactPhone: [
    { required: true, message: '请输入联系电话' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
  ]
}

// 加载统计数据
const loadStats = async () => {
  try {
    const res = await getWarehouseStats()
    stats.value = res.data
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

// 加载列表数据
const loadData = async () => {
  loading.value = true
  try {
    const res = await getWarehouseList({
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
  filters.status = ''
  handleSearch()
}

// 翻页
const handlePageChange = (pageInfo: any) => {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  loadData()
}

// 新建
const handleCreate = () => {
  formMode.value = 'create'
  Object.assign(formData, {
    id: 0,
    name: '',
    code: '',
    province: '内蒙古自治区',
    city: '呼和浩特市',
    district: '',
    address: '',
    latitude: '',
    longitude: '',
    contactName: '',
    contactPhone: '',
    businessHours: '08:00-18:00',
    isDefault: false,
    sort: 0,
    status: 'ACTIVE'
  })
  formVisible.value = true
}

// 编辑
const handleEdit = (row: Warehouse) => {
  formMode.value = 'edit'
  Object.assign(formData, {
    id: row.id,
    name: row.name,
    code: row.code,
    province: row.province,
    city: row.city,
    district: row.district || '',
    address: row.address,
    latitude: row.latitude ? String(row.latitude) : '',
    longitude: row.longitude ? String(row.longitude) : '',
    contactName: row.contactName || '',
    contactPhone: row.contactPhone,
    businessHours: row.businessHours || '',
    isDefault: row.isDefault,
    sort: row.sort,
    status: row.status
  })
  formVisible.value = true
}

// 提交表单
const handleFormSubmit = async () => {
  const valid = await formRef.value?.validate()
  if (!valid) return

  formSubmitting.value = true
  try {
    const submitData = {
      name: formData.name,
      code: formData.code,
      province: formData.province,
      city: formData.city,
      district: formData.district || undefined,
      address: formData.address,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      contactName: formData.contactName || undefined,
      contactPhone: formData.contactPhone,
      businessHours: formData.businessHours || undefined,
      isDefault: formData.isDefault,
      sort: formData.sort,
      status: formData.status
    }

    if (formMode.value === 'create') {
      await createWarehouse(submitData)
      MessagePlugin.success('创建成功')
    } else {
      await updateWarehouse(formData.id, submitData)
      MessagePlugin.success('更新成功')
    }
    formVisible.value = false
    loadData()
    loadStats()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  } finally {
    formSubmitting.value = false
  }
}

// 设置默认仓库
const handleSetDefault = async (row: Warehouse) => {
  const dialog = DialogPlugin.confirm({
    header: '设置默认仓库',
    body: `确定将"${row.name}"设为默认仓库吗？`,
    confirmBtn: '确定',
    onConfirm: async () => {
      try {
        await setDefaultWarehouse(row.id)
        MessagePlugin.success('设置成功')
        loadData()
        dialog.destroy()
      } catch (error: any) {
        MessagePlugin.error(error.message || '设置失败')
      }
    }
  })
}

// 停用
const handleDisable = async (row: Warehouse) => {
  const dialog = DialogPlugin.confirm({
    header: '停用仓库',
    body: `确定停用"${row.name}"吗？停用后库管将无法接收该仓库的订单。`,
    theme: 'warning',
    confirmBtn: { content: '确定停用', theme: 'danger' },
    onConfirm: async () => {
      try {
        await updateWarehouse(row.id, { status: 'INACTIVE' })
        MessagePlugin.success('已停用')
        loadData()
        loadStats()
        dialog.destroy()
      } catch (error: any) {
        MessagePlugin.error(error.message || '操作失败')
      }
    }
  })
}

// 启用
const handleEnable = async (row: Warehouse) => {
  try {
    await updateWarehouse(row.id, { status: 'ACTIVE' })
    MessagePlugin.success('已启用')
    loadData()
    loadStats()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  }
}

onMounted(() => {
  loadData()
  loadStats()
})
</script>

<style scoped lang="scss">
.warehouse-page {
  padding: 0;
}

.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  text-align: center;

  .stat-value {
    font-size: 28px;
    font-weight: 600;
    color: var(--td-text-color-primary);
  }

  .stat-label {
    font-size: 14px;
    color: var(--td-text-color-secondary);
    margin-top: 4px;
  }

  &.stat-active .stat-value {
    color: var(--td-success-color);
  }

  &.stat-inactive .stat-value {
    color: var(--td-text-color-placeholder);
  }

  &.stat-orders .stat-value {
    color: var(--td-brand-color);
  }
}

.filter-card {
  margin-bottom: 16px;
}

.warehouse-name {
  font-weight: 500;
  display: flex;
  align-items: center;
}

.warehouse-code {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  margin-top: 4px;
}

.address-text {
  color: var(--td-text-color-primary);
}

.address-detail {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: 4px;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-tip {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  margin-left: 12px;
}
</style>
