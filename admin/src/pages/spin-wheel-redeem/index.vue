<script setup lang="ts">
/**
 * 大转盘兑换管理页面
 * @since 2026-01-23
 */
import { ref, onMounted } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next'
import {
  getRedeemList,
  retryRedeem,
  getConfigList,
  RedeemStatusLabels,
  type RedeemRecord,
  type SpinWheelConfig
} from '@/api/spinWheel'

// 表格数据
const data = ref<RedeemRecord[]>([])
const loading = ref(false)
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
})

// 配置列表（筛选用）
const configs = ref<SpinWheelConfig[]>([])

// 搜索条件
const searchForm = ref({
  configId: null as number | null,
  status: '',
  phone: ''
})

// 表格列定义
const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 60 },
  { colKey: 'participation', title: '参与者', width: 150, cell: 'participation' },
  { colKey: 'config', title: '活动名称', width: 150, cell: 'config' },
  { colKey: 'redeemAmount', title: '兑换金额', width: 100, cell: 'amount' },
  { colKey: 'coupon', title: '关联代金券', width: 200, cell: 'coupon' },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'createdAt', title: '兑换时间', width: 160, cell: 'createdAt' },
  { colKey: 'action', title: '操作', width: 100, fixed: 'right', cell: 'action' }
]

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILED' },
  { label: '处理中', value: 'PENDING' }
]

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res = await getRedeemList({
      page: pagination.value.current,
      pageSize: pagination.value.pageSize,
      configId: searchForm.value.configId || undefined,
      status: searchForm.value.status || undefined,
      phone: searchForm.value.phone || undefined
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

// 加载配置列表
const loadConfigs = async () => {
  try {
    const res = await getConfigList({ page: 1, pageSize: 100 })
    configs.value = res.data?.list || []
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
  searchForm.value = { configId: null, status: '', phone: '' }
  pagination.value.current = 1
  loadData()
}

// 重试兑换
const handleRetry = (row: RedeemRecord) => {
  const confirmDia = DialogPlugin.confirm({
    header: '确认重试',
    body: `确定要重试兑换ID=${row.id}吗？将重新发放代金券。`,
    confirmBtn: '确认重试',
    onConfirm: async () => {
      try {
        await retryRedeem(row.id)
        MessagePlugin.success('重试成功')
        loadData()
        confirmDia.hide()
      } catch (error: any) {
        MessagePlugin.error(error.message || '重试失败')
      }
    }
  })
}

// 格式化时间
const formatTime = (timeStr: string | null) => {
  if (!timeStr) return '-'
  return new Date(timeStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取状态颜色
const getStatusTheme = (status: string) => {
  const themes: Record<string, string> = {
    SUCCESS: 'success',
    FAILED: 'danger',
    PENDING: 'warning'
  }
  return themes[status] || 'default'
}

onMounted(() => {
  loadData()
  loadConfigs()
})
</script>

<template>
  <div class="page-container">
    <!-- 功能说明 -->
    <t-card class="info-card" :bordered="false">
      <div class="info-content">
        <t-icon name="swap" size="24px" style="color: var(--td-brand-color)" />
        <div class="info-text">
          <h3>兑换管理说明</h3>
          <p>
            查看和管理用户的代金券兑换记录。对于兑换失败的记录，可以手动重试发放代金券。
          </p>
        </div>
      </div>
    </t-card>

    <!-- 搜索栏 -->
    <t-card class="search-card" :bordered="false">
      <t-form :data="searchForm" layout="inline">
        <t-form-item label="活动" name="configId">
          <t-select
            v-model="searchForm.configId"
            placeholder="选择活动"
            style="width: 200px"
            clearable
          >
            <t-option
              v-for="config in configs"
              :key="config.id"
              :label="config.name"
              :value="config.id"
            />
          </t-select>
        </t-form-item>
        <t-form-item label="状态" name="status">
          <t-select
            v-model="searchForm.status"
            :options="statusOptions"
            placeholder="请选择状态"
            style="width: 150px"
            clearable
          />
        </t-form-item>
        <t-form-item label="手机号" name="phone">
          <t-input
            v-model="searchForm.phone"
            placeholder="输入手机号"
            style="width: 150px"
            clearable
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" @click="onSearch">查询</t-button>
          <t-button theme="default" variant="base" @click="onReset">重置</t-button>
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
            暂无兑换记录
          </div>
        </template>

        <!-- 参与者 -->
        <template #participation="{ row }">
          <div v-if="row.participation">
            <div>{{ row.participation.phone }}</div>
            <div class="sub-text">CODE: {{ row.participation.code }}</div>
          </div>
          <span v-else>-</span>
        </template>

        <!-- 活动名称 -->
        <template #config="{ row }">
          {{ row.config?.name || '-' }}
        </template>

        <!-- 兑换金额 -->
        <template #amount="{ row }">
          <span class="amount-value">¥{{ Number(row.redeemAmount).toFixed(2) }}</span>
        </template>

        <!-- 关联代金券 -->
        <template #coupon="{ row }">
          <div v-if="row.coupon">
            <div>{{ row.coupon.couponNo }}</div>
            <div class="sub-text">¥{{ Number(row.coupon.amount).toFixed(2) }} | {{ row.coupon.status }}</div>
          </div>
          <span v-else class="no-coupon">未关联代金券</span>
        </template>

        <!-- 状态 -->
        <template #status="{ row }">
          <t-tag :theme="getStatusTheme(row.status)">
            {{ RedeemStatusLabels[row.status] || row.status }}
          </t-tag>
        </template>

        <!-- 兑换时间 -->
        <template #createdAt="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>

        <!-- 操作 -->
        <template #action="{ row }">
          <t-link
            v-if="row.status === 'FAILED'"
            theme="warning"
            @click="handleRetry(row)"
          >
            重试
          </t-link>
          <span v-else class="no-action">-</span>
        </template>
      </t-table>
    </t-card>
  </div>
</template>

<style scoped lang="less">
.page-container {
  padding: 20px;
}

.info-card {
  margin-bottom: 20px;
  background: linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%);
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
    color: #1976d2;
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
  .sub-text {
    font-size: 12px;
    color: #999;
  }

  .amount-value {
    color: #e53935;
    font-weight: 600;
  }

  .no-coupon {
    color: #999;
  }

  .no-action {
    color: #ccc;
  }
}
</style>
