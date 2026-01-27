<script setup lang="ts">
/**
 * 赠品档位管理页面
 * 用于管理H5满赠活动的赠品档位
 * 【2026-01-19】增强版：支持赠品图片、库存管理、活动时间控制
 */
import { ref, onMounted, computed } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next'
import request from '@/api/request'
import { EmptyState } from '@/components'

// 赠品档位类型
interface GiftTier {
  id: number
  minAmount: number
  giftName: string
  giftCost: number
  description: string | null
  sort: number
  sortOrder: number
  isActive: boolean
  status: string
  giftImage: string | null
  giftStock: number
  usedCount: number
  startTime: string | null
  endTime: string | null
  createdAt: string
  updatedAt: string
}

// 表格数据
const data = ref<GiftTier[]>([])
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
const formData = ref({
  minAmount: 100,
  giftName: '',
  giftCost: 0,
  description: '',
  sortOrder: 0,
  isActive: true,
  giftImage: '',
  giftStock: 0,
  startTime: '',
  endTime: ''
})
const editingId = ref<number | null>(null)

// 表格列定义
const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 60 },
  {
    colKey: 'giftImage',
    title: '赠品图片',
    width: 100,
    cell: 'giftImage'
  },
  {
    colKey: 'minAmount',
    title: '满额门槛',
    width: 100,
    cell: 'minAmount'
  },
  { colKey: 'giftName', title: '赠品名称', minWidth: 150 },
  {
    colKey: 'giftCost',
    title: '赠品成本',
    width: 100,
    cell: 'giftCost'
  },
  {
    colKey: 'stock',
    title: '库存/已发',
    width: 120,
    cell: 'stock'
  },
  {
    colKey: 'timeRange',
    title: '活动时间',
    width: 200,
    cell: 'timeRange'
  },
  {
    colKey: 'isActive',
    title: '状态',
    width: 80,
    cell: 'status'
  },
  {
    colKey: 'action',
    title: '操作',
    width: 160,
    fixed: 'right',
    cell: 'action'
  }
]

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: 'ACTIVE' },
  { label: '禁用', value: 'INACTIVE' }
]

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res = await request.get('/admin/gift-tiers', {
      params: {
        page: pagination.value.current,
        pageSize: pagination.value.pageSize,
        status: searchForm.value.status
      }
    })
    if (res.data) {
      // 支持两种返回格式
      if (Array.isArray(res.data)) {
        data.value = res.data
        pagination.value.total = res.data.length
      } else if (res.data.list) {
        data.value = res.data.list
        pagination.value.total = res.data.total || res.data.list.length
      }
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '加载失败')
  } finally {
    loading.value = false
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

// 重置搜索
const onReset = () => {
  searchForm.value = {
    status: ''
  }
  pagination.value.current = 1
  loadData()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增赠品档位'
  editingId.value = null
  formData.value = {
    minAmount: 100,
    giftName: '',
    giftCost: 0,
    description: '',
    sortOrder: 0,
    isActive: true,
    giftImage: '',
    giftStock: 0,
    startTime: '',
    endTime: ''
  }
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: GiftTier) => {
  dialogTitle.value = '编辑赠品档位'
  editingId.value = row.id
  formData.value = {
    minAmount: row.minAmount,
    giftName: row.giftName,
    giftCost: row.giftCost || 0,
    description: row.description || '',
    sortOrder: row.sortOrder || row.sort || 0,
    isActive: row.isActive,
    giftImage: row.giftImage || '',
    giftStock: row.giftStock || 0,
    startTime: row.startTime ? row.startTime.slice(0, 16) : '',
    endTime: row.endTime ? row.endTime.slice(0, 16) : ''
  }
  dialogVisible.value = true
}

// 删除
const handleDelete = (row: GiftTier) => {
  const confirmDia = DialogPlugin.confirm({
    header: '确认删除',
    body: `确定要删除"满¥${row.minAmount}送${row.giftName}"档位吗？`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        await request.delete(`/admin/gift-tiers/${row.id}`)
        MessagePlugin.success('删除成功')
        loadData()
        confirmDia.hide()
      } catch (error: any) {
        MessagePlugin.error(error.message || '删除失败')
      }
    }
  })
}

// 提交表单
const handleSubmit = async () => {
  if (formData.value.minAmount <= 0) {
    MessagePlugin.warning('请输入有效的满额门槛')
    return
  }
  if (!formData.value.giftName.trim()) {
    MessagePlugin.warning('请输入赠品名称')
    return
  }

  // 验证时间范围
  if (formData.value.startTime && formData.value.endTime) {
    if (new Date(formData.value.startTime) >= new Date(formData.value.endTime)) {
      MessagePlugin.warning('结束时间必须晚于开始时间')
      return
    }
  }

  formLoading.value = true
  try {
    const submitData = {
      minAmount: formData.value.minAmount,
      giftName: formData.value.giftName,
      giftCost: formData.value.giftCost,
      description: formData.value.description,
      sortOrder: formData.value.sortOrder,
      isActive: formData.value.isActive,
      giftImage: formData.value.giftImage || null,
      giftStock: formData.value.giftStock,
      startTime: formData.value.startTime || null,
      endTime: formData.value.endTime || null
    }

    if (editingId.value) {
      await request.put(`/admin/gift-tiers/${editingId.value}`, submitData)
      MessagePlugin.success('更新成功')
    } else {
      await request.post('/admin/gift-tiers', submitData)
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

// 格式化金额
const formatAmount = (val: number) => {
  return `¥${Number(val).toFixed(2)}`
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
const isActivityActive = (row: GiftTier) => {
  if (!row.startTime && !row.endTime) return true
  const now = new Date()
  if (row.startTime && new Date(row.startTime) > now) return false
  if (row.endTime && new Date(row.endTime) < now) return false
  return true
}

// 获取库存状态
const getStockStatus = (row: GiftTier) => {
  if (row.giftStock === 0) return 'default' // 不限库存
  const remaining = row.giftStock - (row.usedCount || 0)
  if (remaining <= 0) return 'danger'
  if (remaining <= 10) return 'warning'
  return 'success'
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page-container">
    <!-- 页面说明 -->
    <t-card class="info-card" :bordered="false">
      <div class="info-content">
        <t-icon name="gift" size="24px" style="color: var(--td-brand-color)" />
        <div class="info-text">
          <h3>满赠活动说明</h3>
          <p>客户预约金额达到对应档位门槛，将获得相应赠品。赠品成本将从总代利润中扣除。支持设置活动时间和库存限制。</p>
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
          <t-button theme="success" @click="handleAdd">新增档位</t-button>
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
          <EmptyState
            :type="searchForm.status ? 'search' : 'data'"
            :title="searchForm.status ? '未找到匹配结果' : '暂无赠品档位'"
            :description="searchForm.status ? '请尝试调整筛选条件' : '点击上方按钮新增赠品档位'"
          />
        </template>

        <!-- 赠品图片 -->
        <template #giftImage="{ row }">
          <t-image
            v-if="row.giftImage"
            :src="row.giftImage"
            fit="cover"
            :style="{ width: '60px', height: '60px', borderRadius: '4px' }"
          />
          <span v-else class="no-image">暂无图片</span>
        </template>

        <!-- 满额门槛 -->
        <template #minAmount="{ row }">
          <span class="amount-text">满 {{ formatAmount(row.minAmount) }}</span>
        </template>

        <!-- 赠品成本 -->
        <template #giftCost="{ row }">
          <span class="cost-text">{{ formatAmount(row.giftCost || 0) }}</span>
        </template>

        <!-- 库存/已发 -->
        <template #stock="{ row }">
          <div v-if="row.giftStock === 0" class="stock-unlimited">
            <t-tag theme="default" size="small">不限库存</t-tag>
          </div>
          <div v-else class="stock-info">
            <t-tag :theme="getStockStatus(row)" size="small">
              {{ row.giftStock - (row.usedCount || 0) }} / {{ row.giftStock }}
            </t-tag>
            <div class="stock-tip">剩余/总量</div>
          </div>
        </template>

        <!-- 活动时间 -->
        <template #timeRange="{ row }">
          <div v-if="!row.startTime && !row.endTime" class="time-unlimited">
            <t-tag theme="default" size="small">长期有效</t-tag>
          </div>
          <div v-else class="time-range">
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
            <t-link theme="danger" @click="handleDelete(row)">删除</t-link>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 编辑对话框 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="dialogTitle"
      width="600px"
      :confirm-btn="{ content: '提交', loading: formLoading }"
      :on-confirm="handleSubmit"
    >
      <t-form :data="formData" label-width="100px">
        <!-- 基本信息 -->
        <t-divider>基本信息</t-divider>

        <t-form-item label="满额门槛" name="minAmount" required>
          <t-input-number
            v-model="formData.minAmount"
            :min="1"
            :max="99999"
            :decimal-places="0"
            suffix="元"
            placeholder="预约金额达到此门槛可获得赠品"
            style="width: 200px"
          />
        </t-form-item>

        <t-form-item label="赠品名称" name="giftName" required>
          <t-input
            v-model="formData.giftName"
            placeholder="例如：小手持烟花 × 2"
            maxlength="100"
          />
        </t-form-item>

        <t-form-item label="赠品图片" name="giftImage">
          <t-input
            v-model="formData.giftImage"
            placeholder="输入赠品图片URL"
          />
          <div v-if="formData.giftImage" class="image-preview">
            <t-image
              :src="formData.giftImage"
              fit="cover"
              :style="{ width: '80px', height: '80px', borderRadius: '4px', marginTop: '8px' }"
            />
          </div>
        </t-form-item>

        <t-form-item label="赠品成本" name="giftCost">
          <t-input-number
            v-model="formData.giftCost"
            :min="0"
            :max="9999"
            :decimal-places="2"
            suffix="元"
            placeholder="赠品的采购成本"
            style="width: 200px"
          />
          <div class="form-tip">赠品成本将从总代利润中扣除</div>
        </t-form-item>

        <t-form-item label="档位描述" name="description">
          <t-textarea
            v-model="formData.description"
            placeholder="例如：入门档，适合小额预约"
            :maxlength="200"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
        </t-form-item>

        <!-- 库存控制 -->
        <t-divider>库存控制</t-divider>

        <t-form-item label="赠品库存" name="giftStock">
          <t-input-number
            v-model="formData.giftStock"
            :min="0"
            :max="99999"
            :decimal-places="0"
            placeholder="0表示不限库存"
            style="width: 200px"
          />
          <div class="form-tip">设置为0表示不限制库存数量</div>
        </t-form-item>

        <!-- 活动时间 -->
        <t-divider>活动时间</t-divider>

        <t-form-item label="开始时间" name="startTime">
          <t-date-picker
            v-model="formData.startTime"
            mode="date"
            enable-time-picker
            format="YYYY-MM-DD HH:mm"
            placeholder="选择开始时间（可选）"
            clearable
            style="width: 100%"
          />
        </t-form-item>

        <t-form-item label="结束时间" name="endTime">
          <t-date-picker
            v-model="formData.endTime"
            mode="date"
            enable-time-picker
            format="YYYY-MM-DD HH:mm"
            placeholder="选择结束时间（可选）"
            clearable
            style="width: 100%"
          />
          <div class="form-tip">不设置时间表示长期有效</div>
        </t-form-item>

        <!-- 其他设置 -->
        <t-divider>其他设置</t-divider>

        <t-form-item label="排序权重" name="sortOrder">
          <t-input-number
            v-model="formData.sortOrder"
            :min="0"
            :max="9999"
            placeholder="越小越靠前"
            style="width: 200px"
          />
        </t-form-item>

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
  background: linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%);
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
    color: #8b6914;
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
  :deep(.t-table) {
    .amount-text {
      color: #f40;
      font-weight: 600;
    }

    .cost-text {
      color: #52c41a;
    }

    .no-image {
      color: #999;
      font-size: 12px;
    }

    .stock-info {
      text-align: center;

      .stock-tip {
        font-size: 11px;
        color: #999;
        margin-top: 2px;
      }
    }

    .time-range {
      font-size: 12px;
      line-height: 1.5;

      .time-separator {
        color: #999;
      }
    }
  }
}

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.image-preview {
  margin-top: 8px;
}
</style>
