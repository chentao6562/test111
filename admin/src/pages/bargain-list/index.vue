<script setup lang="ts">
/**
 * 砍价数据列表页面
 * @since 2026-01-22
 */
import { ref, onMounted } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next'
import {
  getBargainList,
  getStats,
  getBargainDetail,
  getBlacklist,
  addBlacklist,
  removeBlacklist,
  BargainStatusLabels,
  BlacklistTypeLabels,
  type BargainItem,
  type BargainStats,
  type BlacklistItem
} from '@/api/bargain'

// 当前标签页
const activeTab = ref('list')

// ========== 砍价列表 ==========
const listData = ref<BargainItem[]>([])
const listLoading = ref(false)
const listPagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
})

const searchForm = ref({
  status: '',
  phone: '',
  code: ''
})

// 统计数据
const stats = ref<BargainStats | null>(null)
const statsLoading = ref(false)

// 详情对话框
const detailVisible = ref(false)
const detailData = ref<any>(null)
const detailLoading = ref(false)

// 表格列定义
const listColumns: PrimaryTableCol[] = [
  { colKey: 'code', title: '砍价码', width: 130 },
  { colKey: 'initiatorPhone', title: '发起人', width: 150, cell: 'initiator' },
  { colKey: 'productName', title: '商品', minWidth: 150 },
  { colKey: 'priceInfo', title: '价格信息', width: 200, cell: 'priceInfo' },
  { colKey: 'cutInfo', title: '砍价进度', width: 150, cell: 'cutInfo' },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'salesperson', title: '推销员', width: 120, cell: 'salesperson' },
  { colKey: 'expireAt', title: '过期时间', width: 160, cell: 'expireAt' },
  { colKey: 'action', title: '操作', width: 80, fixed: 'right', cell: 'action' }
]

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: '砍价中', value: 'BARGAINING' },
  { label: '砍价成功', value: 'SUCCESS' },
  { label: '已下单', value: 'ORDERED' },
  { label: '已过期', value: 'EXPIRED' },
  { label: '已取消', value: 'CANCELLED' }
]

// 状态颜色
const statusTheme: Record<string, string> = {
  BARGAINING: 'warning',
  SUCCESS: 'success',
  ORDERED: 'primary',
  EXPIRED: 'default',
  CANCELLED: 'danger'
}

// ========== 黑名单 ==========
const blacklistData = ref<BlacklistItem[]>([])
const blacklistLoading = ref(false)
const blacklistPagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
})

const blacklistDialogVisible = ref(false)
const blacklistForm = ref({
  type: 'PHONE',
  value: '',
  reason: '',
  expireHours: 0
})

// 黑名单列定义
const blacklistColumns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 60 },
  { colKey: 'type', title: '类型', width: 100, cell: 'type' },
  { colKey: 'value', title: '值', minWidth: 200 },
  { colKey: 'reason', title: '原因', minWidth: 150 },
  { colKey: 'expireAt', title: '过期时间', width: 160, cell: 'expireAt' },
  { colKey: 'createdAt', title: '创建时间', width: 160, cell: 'createdAt' },
  { colKey: 'action', title: '操作', width: 80, fixed: 'right', cell: 'action' }
]

// 黑名单类型选项
const blacklistTypeOptions = [
  { label: '手机号', value: 'PHONE' },
  { label: 'IP地址', value: 'IP' },
  { label: '设备ID', value: 'DEVICE' }
]

// 加载统计
const loadStats = async () => {
  statsLoading.value = true
  try {
    const res = await getStats()
    stats.value = res.data
  } catch {
    // ignore
  } finally {
    statsLoading.value = false
  }
}

// 加载砍价列表
const loadListData = async () => {
  listLoading.value = true
  try {
    const res = await getBargainList({
      page: listPagination.value.current,
      pageSize: listPagination.value.pageSize,
      status: searchForm.value.status,
      phone: searchForm.value.phone,
      code: searchForm.value.code
    })
    if (res.data) {
      listData.value = res.data.list || []
      listPagination.value.total = res.data.total || 0
    }
  } catch {
    MessagePlugin.error('加载失败')
  } finally {
    listLoading.value = false
  }
}

// 分页变化
const onListPageChange = (pageInfo: PageInfo) => {
  listPagination.value.current = pageInfo.current
  listPagination.value.pageSize = pageInfo.pageSize
  loadListData()
}

// 搜索
const onSearch = () => {
  listPagination.value.current = 1
  loadListData()
}

// 重置
const onReset = () => {
  searchForm.value = { status: '', phone: '', code: '' }
  listPagination.value.current = 1
  loadListData()
}

// 查看详情
const handleViewDetail = async (row: BargainItem) => {
  detailLoading.value = true
  detailVisible.value = true
  try {
    const res = await getBargainDetail(row.id)
    detailData.value = res.data
  } catch {
    MessagePlugin.error('加载详情失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

// 加载黑名单
const loadBlacklistData = async () => {
  blacklistLoading.value = true
  try {
    const res = await getBlacklist({
      page: blacklistPagination.value.current,
      pageSize: blacklistPagination.value.pageSize
    })
    if (res.data) {
      blacklistData.value = res.data.list || []
      blacklistPagination.value.total = res.data.total || 0
    }
  } catch {
    MessagePlugin.error('加载失败')
  } finally {
    blacklistLoading.value = false
  }
}

// 黑名单分页变化
const onBlacklistPageChange = (pageInfo: PageInfo) => {
  blacklistPagination.value.current = pageInfo.current
  blacklistPagination.value.pageSize = pageInfo.pageSize
  loadBlacklistData()
}

// 添加黑名单
const handleAddBlacklist = () => {
  blacklistForm.value = {
    type: 'PHONE',
    value: '',
    reason: '',
    expireHours: 0
  }
  blacklistDialogVisible.value = true
}

// 提交黑名单
const submitBlacklist = async () => {
  if (!blacklistForm.value.value.trim()) {
    MessagePlugin.warning('请输入值')
    return
  }

  try {
    await addBlacklist({
      type: blacklistForm.value.type,
      value: blacklistForm.value.value,
      reason: blacklistForm.value.reason || undefined,
      expireHours: blacklistForm.value.expireHours || undefined
    })
    MessagePlugin.success('添加成功')
    blacklistDialogVisible.value = false
    loadBlacklistData()
  } catch (error: any) {
    MessagePlugin.error(error.message || '添加失败')
  }
}

// 移除黑名单
const handleRemoveBlacklist = (row: BlacklistItem) => {
  const confirmDia = DialogPlugin.confirm({
    header: '确认移除',
    body: `确定要移除该黑名单记录吗？`,
    confirmBtn: '移除',
    onConfirm: async () => {
      try {
        await removeBlacklist(row.id)
        MessagePlugin.success('移除成功')
        loadBlacklistData()
        confirmDia.hide()
      } catch (error: any) {
        MessagePlugin.error(error.message || '移除失败')
      }
    }
  })
}

// 格式化时间
const formatTime = (timeStr: string | null) => {
  if (!timeStr) return '-'
  return new Date(timeStr).toLocaleString('zh-CN')
}

// 格式化金额
const formatAmount = (val: number) => {
  return `¥${Number(val).toFixed(2)}`
}

// 标签页切换
const handleTabChange = (val: string) => {
  activeTab.value = val
  if (val === 'blacklist' && blacklistData.value.length === 0) {
    loadBlacklistData()
  }
}

onMounted(() => {
  loadStats()
  loadListData()
})
</script>

<template>
  <div class="page-container">
    <!-- 统计卡片 -->
    <t-row :gutter="16" class="stats-row">
      <t-col :span="2">
        <t-card class="stat-card" :bordered="false">
          <div class="stat-value">{{ stats?.totalBargains || 0 }}</div>
          <div class="stat-label">总砍价数</div>
        </t-card>
      </t-col>
      <t-col :span="2">
        <t-card class="stat-card warning" :bordered="false">
          <div class="stat-value">{{ stats?.bargainingCount || 0 }}</div>
          <div class="stat-label">砍价中</div>
        </t-card>
      </t-col>
      <t-col :span="2">
        <t-card class="stat-card success" :bordered="false">
          <div class="stat-value">{{ stats?.successCount || 0 }}</div>
          <div class="stat-label">砍价成功</div>
        </t-card>
      </t-col>
      <t-col :span="2">
        <t-card class="stat-card primary" :bordered="false">
          <div class="stat-value">{{ stats?.orderedCount || 0 }}</div>
          <div class="stat-label">已下单</div>
        </t-card>
      </t-col>
      <t-col :span="2">
        <t-card class="stat-card" :bordered="false">
          <div class="stat-value">{{ stats?.expiredCount || 0 }}</div>
          <div class="stat-label">已过期</div>
        </t-card>
      </t-col>
      <t-col :span="2">
        <t-card class="stat-card danger" :bordered="false">
          <div class="stat-value">{{ formatAmount(stats?.totalCutAmount || 0) }}</div>
          <div class="stat-label">总砍价金额</div>
        </t-card>
      </t-col>
    </t-row>

    <!-- 标签页 -->
    <t-card :bordered="false">
      <t-tabs v-model="activeTab" @change="handleTabChange">
        <t-tab-panel value="list" label="砍价记录">
          <!-- 搜索栏 -->
          <div class="search-bar">
            <t-form :data="searchForm" layout="inline">
              <t-form-item label="状态">
                <t-select
                  v-model="searchForm.status"
                  :options="statusOptions"
                  placeholder="请选择状态"
                  style="width: 150px"
                  clearable
                />
              </t-form-item>
              <t-form-item label="手机号">
                <t-input
                  v-model="searchForm.phone"
                  placeholder="发起人手机号"
                  style="width: 150px"
                  clearable
                />
              </t-form-item>
              <t-form-item label="砍价码">
                <t-input
                  v-model="searchForm.code"
                  placeholder="砍价码"
                  style="width: 150px"
                  clearable
                />
              </t-form-item>
              <t-form-item>
                <t-button theme="primary" @click="onSearch">查询</t-button>
                <t-button theme="default" variant="base" @click="onReset">重置</t-button>
              </t-form-item>
            </t-form>
          </div>

          <!-- 表格 -->
          <t-table
            :data="listData"
            :columns="listColumns"
            :loading="listLoading"
            :pagination="listPagination"
            row-key="id"
            @page-change="onListPageChange"
          >
            <template #empty>
              <div style="padding: 40px; text-align: center; color: #999;">
                暂无砍价记录
              </div>
            </template>

            <!-- 发起人 -->
            <template #initiator="{ row }">
              <div>{{ row.initiatorName || '-' }}</div>
              <div class="text-muted">{{ row.initiatorPhone }}</div>
            </template>

            <!-- 价格信息 -->
            <template #priceInfo="{ row }">
              <div class="price-info">
                <div>原价: {{ formatAmount(row.originalPrice) }}</div>
                <div>底价: {{ formatAmount(row.floorPrice) }}</div>
                <div class="current-price">当前: {{ formatAmount(row.currentPrice) }}</div>
              </div>
            </template>

            <!-- 砍价进度 -->
            <template #cutInfo="{ row }">
              <div>已砍 {{ row.cutCount }} 刀</div>
              <div class="text-danger">-{{ formatAmount(row.totalCut) }}</div>
              <t-tag v-if="row.reachedFloor" theme="success" size="small">已达底价</t-tag>
            </template>

            <!-- 状态 -->
            <template #status="{ row }">
              <t-tag :theme="statusTheme[row.status] || 'default'">
                {{ BargainStatusLabels[row.status] || row.status }}
              </t-tag>
            </template>

            <!-- 推销员 -->
            <template #salesperson="{ row }">
              <template v-if="row.salespersonName">
                {{ row.salespersonName }}
              </template>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- 过期时间 -->
            <template #expireAt="{ row }">
              {{ formatTime(row.expireAt) }}
            </template>

            <!-- 操作 -->
            <template #action="{ row }">
              <t-link theme="primary" @click="handleViewDetail(row)">详情</t-link>
            </template>
          </t-table>
        </t-tab-panel>

        <t-tab-panel value="blacklist" label="黑名单管理">
          <!-- 搜索栏 -->
          <div class="search-bar">
            <t-button theme="primary" @click="handleAddBlacklist">添加黑名单</t-button>
          </div>

          <!-- 表格 -->
          <t-table
            :data="blacklistData"
            :columns="blacklistColumns"
            :loading="blacklistLoading"
            :pagination="blacklistPagination"
            row-key="id"
            @page-change="onBlacklistPageChange"
          >
            <template #empty>
              <div style="padding: 40px; text-align: center; color: #999;">
                暂无黑名单记录
              </div>
            </template>

            <!-- 类型 -->
            <template #type="{ row }">
              <t-tag>{{ BlacklistTypeLabels[row.type] || row.type }}</t-tag>
            </template>

            <!-- 过期时间 -->
            <template #expireAt="{ row }">
              {{ row.expireAt ? formatTime(row.expireAt) : '永久' }}
            </template>

            <!-- 创建时间 -->
            <template #createdAt="{ row }">
              {{ formatTime(row.createdAt) }}
            </template>

            <!-- 操作 -->
            <template #action="{ row }">
              <t-link theme="danger" @click="handleRemoveBlacklist(row)">移除</t-link>
            </template>
          </t-table>
        </t-tab-panel>
      </t-tabs>
    </t-card>

    <!-- 详情对话框 -->
    <t-dialog
      v-model:visible="detailVisible"
      header="砍价详情"
      width="700px"
      :footer="false"
    >
      <div v-if="detailLoading" style="text-align: center; padding: 40px;">
        <t-loading />
      </div>
      <div v-else-if="detailData" class="detail-content">
        <t-descriptions :column="2" bordered>
          <t-descriptions-item label="砍价码">{{ detailData.code }}</t-descriptions-item>
          <t-descriptions-item label="状态">
            <t-tag :theme="statusTheme[detailData.status] || 'default'">
              {{ BargainStatusLabels[detailData.status] || detailData.status }}
            </t-tag>
          </t-descriptions-item>
          <t-descriptions-item label="发起人">
            {{ detailData.initiatorName || '-' }} ({{ detailData.initiatorPhone }})
          </t-descriptions-item>
          <t-descriptions-item label="商品">{{ detailData.productName }}</t-descriptions-item>
          <t-descriptions-item label="原价">{{ formatAmount(detailData.originalPrice) }}</t-descriptions-item>
          <t-descriptions-item label="底价">{{ formatAmount(detailData.floorPrice) }}</t-descriptions-item>
          <t-descriptions-item label="当前价">
            <span class="text-danger">{{ formatAmount(detailData.currentPrice) }}</span>
          </t-descriptions-item>
          <t-descriptions-item label="已砍金额">
            <span class="text-danger">-{{ formatAmount(detailData.totalCut) }}</span>
          </t-descriptions-item>
          <t-descriptions-item label="砍价次数">{{ detailData.cutCount }}次</t-descriptions-item>
          <t-descriptions-item label="提货门店">{{ detailData.storeName }}</t-descriptions-item>
          <t-descriptions-item label="过期时间">{{ formatTime(detailData.expireAt) }}</t-descriptions-item>
          <t-descriptions-item label="创建时间">{{ formatTime(detailData.createdAt) }}</t-descriptions-item>
        </t-descriptions>

        <div v-if="detailData.cuts?.length > 0" style="margin-top: 20px;">
          <h4>帮砍记录</h4>
          <t-table
            :data="detailData.cuts"
            :columns="[
              { colKey: 'helperPhone', title: '帮砍人', width: 150 },
              { colKey: 'helperName', title: '昵称', width: 100 },
              { colKey: 'cutAmount', title: '砍价金额', width: 100, cell: (h: any, { row }: any) => formatAmount(row.cutAmount) },
              { colKey: 'isNewUser', title: '新用户', width: 80, cell: (h: any, { row }: any) => row.isNewUser ? '是' : '否' },
              { colKey: 'createdAt', title: '时间', width: 160, cell: (h: any, { row }: any) => formatTime(row.createdAt) }
            ]"
            row-key="id"
            size="small"
            max-height="300"
          />
        </div>
      </div>
    </t-dialog>

    <!-- 添加黑名单对话框 -->
    <t-dialog
      v-model:visible="blacklistDialogVisible"
      header="添加黑名单"
      width="500px"
      :confirm-btn="{ content: '添加' }"
      :on-confirm="submitBlacklist"
    >
      <t-form :data="blacklistForm" label-width="100px">
        <t-form-item label="类型" name="type" required>
          <t-select v-model="blacklistForm.type" :options="blacklistTypeOptions" />
        </t-form-item>
        <t-form-item label="值" name="value" required>
          <t-input
            v-model="blacklistForm.value"
            :placeholder="blacklistForm.type === 'PHONE' ? '手机号' : blacklistForm.type === 'IP' ? 'IP地址' : '设备ID'"
          />
        </t-form-item>
        <t-form-item label="原因" name="reason">
          <t-input v-model="blacklistForm.reason" placeholder="可选" />
        </t-form-item>
        <t-form-item label="过期时间" name="expireHours">
          <t-input-number v-model="blacklistForm.expireHours" :min="0" suffix="小时" />
          <div class="form-tip">0表示永久</div>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<style scoped lang="less">
.page-container {
  padding: 20px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  padding: 16px;

  .stat-value {
    font-size: 24px;
    font-weight: 600;
    color: #333;
  }

  .stat-label {
    font-size: 13px;
    color: #999;
    margin-top: 4px;
  }

  &.warning .stat-value {
    color: #ff9800;
  }

  &.success .stat-value {
    color: #4caf50;
  }

  &.primary .stat-value {
    color: #2196f3;
  }

  &.danger .stat-value {
    color: #e53935;
  }
}

.search-bar {
  margin-bottom: 16px;
}

.text-muted {
  color: #999;
  font-size: 12px;
}

.text-danger {
  color: #e53935;
}

.price-info {
  font-size: 12px;
  line-height: 1.6;

  .current-price {
    color: #e53935;
    font-weight: 600;
  }
}

.detail-content {
  h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #333;
  }
}

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}
</style>
