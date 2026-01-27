<script setup lang="ts">
/**
 * 大转盘活动配置管理页面
 * @since 2026-01-23
 */
import { ref, onMounted } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next'
import {
  getConfigList,
  createConfig,
  updateConfig,
  deleteConfig,
  toggleConfig,
  getStats,
  type SpinWheelConfig,
  type SpinWheelStats
} from '@/api/spinWheel'

// 表格数据
const data = ref<SpinWheelConfig[]>([])
const loading = ref(false)
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
})

// 搜索条件
const searchForm = ref({
  isActive: '',
  keyword: ''
})

// 统计数据
const stats = ref<SpinWheelStats | null>(null)

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const editingId = ref<number | null>(null)

// 表单数据
const formData = ref({
  name: '',
  description: '',
  startTime: '',
  endTime: '',
  redeemThreshold: 100,
  maxDailyHelp: 10,
  fragmentExpireDays: 7,
  newUserHelpMin: 1,
  newUserHelpMax: 5,
  oldUserHelpMin: 0.1,
  oldUserHelpMax: 1,
  prizes: [] as any[],
  isActive: true
})

// 默认奖品配置
const defaultPrizes = [
  { name: '现金红包', type: 'CASH', amount: 0, weight: 80 },
  { name: '谢谢参与', type: 'EMPTY', amount: 0, weight: 10 },
  { name: '再来一次', type: 'EXTRA_SPIN', amount: 0, weight: 5 },
  { name: '幸运奖', type: 'CASH', amount: 0, weight: 3 },
  { name: '惊喜奖', type: 'CASH', amount: 0, weight: 1.5 },
  { name: '大奖', type: 'CASH', amount: 0, weight: 0.5 }
]

// 表格列定义
const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 60 },
  { colKey: 'name', title: '活动名称', minWidth: 150 },
  { colKey: 'redeemThreshold', title: '兑换门槛', width: 100, cell: 'threshold' },
  { colKey: 'helpConfig', title: '助力金额配置', width: 180, cell: 'helpConfig' },
  { colKey: 'maxDailyHelp', title: '每日助力上限', width: 100 },
  { colKey: 'timeRange', title: '活动时间', width: 200, cell: 'timeRange' },
  { colKey: 'stats', title: '参与统计', width: 120, cell: 'stats' },
  { colKey: 'isActive', title: '状态', width: 80, cell: 'status' },
  { colKey: 'action', title: '操作', width: 180, fixed: 'right', cell: 'action' }
]

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: 'true' },
  { label: '禁用', value: 'false' }
]

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res = await getConfigList({
      page: pagination.value.current,
      pageSize: pagination.value.pageSize,
      isActive: searchForm.value.isActive,
      keyword: searchForm.value.keyword
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

// 加载统计数据
const loadStats = async () => {
  try {
    const res = await getStats()
    if (res.data) {
      stats.value = res.data
    }
  } catch {
    // ignore
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
  searchForm.value = { isActive: '', keyword: '' }
  pagination.value.current = 1
  loadData()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增大转盘活动'
  editingId.value = null
  formData.value = {
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    redeemThreshold: 100,
    maxDailyHelp: 10,
    fragmentExpireDays: 7,
    newUserHelpMin: 1,
    newUserHelpMax: 5,
    oldUserHelpMin: 0.1,
    oldUserHelpMax: 1,
    prizes: [...defaultPrizes],
    isActive: true
  }
  dialogVisible.value = true
}

// 编辑
const handleEdit = async (row: SpinWheelConfig) => {
  dialogTitle.value = '编辑大转盘活动'
  editingId.value = row.id
  formData.value = {
    name: row.name,
    description: row.description || '',
    startTime: row.startTime ? row.startTime.slice(0, 16) : '',
    endTime: row.endTime ? row.endTime.slice(0, 16) : '',
    redeemThreshold: row.redeemThreshold,
    maxDailyHelp: row.maxDailyHelp,
    fragmentExpireDays: row.fragmentExpireDays,
    newUserHelpMin: Number(row.newUserHelpMin),
    newUserHelpMax: Number(row.newUserHelpMax),
    oldUserHelpMin: Number(row.oldUserHelpMin),
    oldUserHelpMax: Number(row.oldUserHelpMax),
    prizes: row.prizes?.length ? row.prizes : [...defaultPrizes],
    isActive: row.isActive
  }
  dialogVisible.value = true
}

// 删除
const handleDelete = (row: SpinWheelConfig) => {
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
const handleToggle = async (row: SpinWheelConfig) => {
  try {
    await toggleConfig(row.id)
    MessagePlugin.success(row.isActive ? '已禁用' : '已启用')
    loadData()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  }
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
  if (formData.value.newUserHelpMin > formData.value.newUserHelpMax) {
    MessagePlugin.warning('新用户助力最小值不能大于最大值')
    return
  }
  if (formData.value.oldUserHelpMin > formData.value.oldUserHelpMax) {
    MessagePlugin.warning('老用户助力最小值不能大于最大值')
    return
  }

  formLoading.value = true
  try {
    const submitData = {
      name: formData.value.name,
      description: formData.value.description,
      startTime: formData.value.startTime,
      endTime: formData.value.endTime,
      redeemThreshold: formData.value.redeemThreshold,
      maxDailyHelp: formData.value.maxDailyHelp,
      fragmentExpireDays: formData.value.fragmentExpireDays,
      newUserHelpMin: formData.value.newUserHelpMin,
      newUserHelpMax: formData.value.newUserHelpMax,
      oldUserHelpMin: formData.value.oldUserHelpMin,
      oldUserHelpMax: formData.value.oldUserHelpMax,
      prizes: formData.value.prizes,
      isActive: formData.value.isActive
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
    loadStats()
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
const isActivityActive = (row: SpinWheelConfig) => {
  const now = new Date()
  if (row.startTime && new Date(row.startTime) > now) return false
  if (row.endTime && new Date(row.endTime) < now) return false
  return true
}

onMounted(() => {
  loadData()
  loadStats()
})
</script>

<template>
  <div class="page-container">
    <!-- 功能说明 -->
    <t-card class="info-card" :bordered="false">
      <div class="info-content">
        <t-icon name="gift" size="24px" style="color: var(--td-warning-color)" />
        <div class="info-text">
          <h3>现金大转盘活动说明</h3>
          <p>
            用户参与转盘活动，通过分享邀请好友助力获得碎片奖励，累计达到门槛后可兑换代金券。
            采用拼多多式黑箱算法，前期奖励较大，后期递减，实际需要大量助力才能达标。
          </p>
        </div>
      </div>
    </t-card>

    <!-- 统计卡片 -->
    <t-row v-if="stats" :gutter="16" class="stats-row">
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-value">{{ stats.overview.totalParticipants }}</div>
          <div class="stat-label">总参与人数</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-value">{{ stats.overview.totalSpins }}</div>
          <div class="stat-label">总抽奖次数</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-value">{{ stats.overview.totalHelps }}</div>
          <div class="stat-label">总助力次数</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-value">¥{{ stats.overview.totalRedeemedAmount.toFixed(2) }}</div>
          <div class="stat-label">总兑换金额</div>
        </t-card>
      </t-col>
    </t-row>

    <!-- 搜索栏 -->
    <t-card class="search-card" :bordered="false">
      <t-form :data="searchForm" layout="inline">
        <t-form-item label="状态" name="isActive">
          <t-select
            v-model="searchForm.isActive"
            :options="statusOptions"
            placeholder="请选择状态"
            style="width: 150px"
            clearable
          />
        </t-form-item>
        <t-form-item label="活动名称" name="keyword">
          <t-input
            v-model="searchForm.keyword"
            placeholder="输入活动名称搜索"
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
            暂无大转盘活动配置
          </div>
        </template>

        <!-- 兑换门槛 -->
        <template #threshold="{ row }">
          <span class="threshold-value">¥{{ row.redeemThreshold }}</span>
        </template>

        <!-- 助力金额配置 -->
        <template #helpConfig="{ row }">
          <div class="help-config">
            <div><t-tag theme="success" size="small">新用户</t-tag> {{ Number(row.newUserHelpMin).toFixed(2) }}-{{ Number(row.newUserHelpMax).toFixed(2) }}元</div>
            <div><t-tag theme="default" size="small">老用户</t-tag> {{ Number(row.oldUserHelpMin).toFixed(2) }}-{{ Number(row.oldUserHelpMax).toFixed(2) }}元</div>
          </div>
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

        <!-- 参与统计 -->
        <template #stats="{ row }">
          <div class="stats-cell">
            <div>{{ row.participantCount || 0 }} 人参与</div>
            <div>¥{{ (row.totalAmount || 0).toFixed(2) }}</div>
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
          <t-input v-model="formData.name" placeholder="例如：春节转盘活动" maxlength="100" />
        </t-form-item>

        <t-form-item label="活动描述" name="description">
          <t-textarea v-model="formData.description" placeholder="活动说明（选填）" :maxlength="500" :autosize="{ minRows: 2 }" />
        </t-form-item>

        <!-- 兑换配置 -->
        <t-divider>兑换配置</t-divider>

        <t-row :gutter="16">
          <t-col :span="8">
            <t-form-item label="兑换门槛" name="redeemThreshold" help="累计金额达到此值可兑换代金券">
              <t-input-number v-model="formData.redeemThreshold" :min="1" :decimal-places="0" suffix="元" />
            </t-form-item>
          </t-col>
          <t-col :span="8">
            <t-form-item label="碎片有效期" name="fragmentExpireDays" help="单个碎片过期天数，0=永不过期">
              <t-input-number v-model="formData.fragmentExpireDays" :min="0" suffix="天" />
            </t-form-item>
          </t-col>
          <t-col :span="8">
            <t-form-item label="每日助力上限" name="maxDailyHelp" help="每个用户每天最多被助力次数">
              <t-input-number v-model="formData.maxDailyHelp" :min="1" suffix="次" />
            </t-form-item>
          </t-col>
        </t-row>

        <!-- 助力金额配置 -->
        <t-divider>助力金额配置</t-divider>

        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item label="新用户最小" name="newUserHelpMin">
              <t-input-number v-model="formData.newUserHelpMin" :min="0" :decimal-places="2" suffix="元" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="新用户最大" name="newUserHelpMax">
              <t-input-number v-model="formData.newUserHelpMax" :min="0" :decimal-places="2" suffix="元" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="老用户最小" name="oldUserHelpMin">
              <t-input-number v-model="formData.oldUserHelpMin" :min="0" :decimal-places="2" suffix="元" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="老用户最大" name="oldUserHelpMax">
              <t-input-number v-model="formData.oldUserHelpMax" :min="0" :decimal-places="2" suffix="元" />
            </t-form-item>
          </t-col>
        </t-row>

        <t-alert theme="info" style="margin-bottom: 16px;">
          <template #message>
            助力金额采用递减算法：前几次助力金额较大（给用户惊喜感），后续逐渐递减（类似拼多多模式）。
            建议新用户金额设置较高以激励拉新，老用户金额设置较低以控制成本。
          </template>
        </t-alert>

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
  background: linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%);
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
    color: #f57c00;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #666;
  }
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  background: linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%);

  .stat-value {
    font-size: 28px;
    font-weight: 600;
    color: #1976d2;
  }

  .stat-label {
    margin-top: 8px;
    font-size: 14px;
    color: #666;
  }
}

.search-card {
  margin-bottom: 20px;
}

.table-card {
  .threshold-value {
    color: #e53935;
    font-weight: 600;
  }

  .help-config {
    font-size: 12px;
    line-height: 1.8;
  }

  .time-range {
    font-size: 12px;
    line-height: 1.5;

    .time-separator {
      color: #999;
    }
  }

  .stats-cell {
    font-size: 12px;
    line-height: 1.6;
  }
}
</style>
