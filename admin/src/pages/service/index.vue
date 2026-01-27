<template>
  <div class="service-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">客服管理</h1>
        <p class="page-desc">异常工单查询与管理</p>
      </div>
    </div>

    <!-- 主内容卡片 -->
    <t-card :bordered="false" class="main-card">
      <!-- 【2026-01-27】移除锁货功能，只保留异常工单 -->
      <t-tabs v-model="activeTab" @change="handleTabChange">
        <t-tab-panel value="exception">
          <template #label>
            异常工单列表
            <t-tag v-if="pendingExceptionCount > 0" size="small" theme="danger" variant="light" style="margin-left: 4px;">
              {{ pendingExceptionCount }}
            </t-tag>
          </template>
          <div class="tab-content">
            <!-- 筛选 -->
            <div class="filter-section">
              <t-form :data="exceptionFilters" layout="inline">
                <t-form-item label="搜索">
                  <t-input
                    v-model="exceptionFilters.keyword"
                    placeholder="请输入工单号/订单号"
                    clearable
                    style="width: 200px;"
                  >
                    <template #prefix-icon><t-icon name="search" /></template>
                  </t-input>
                </t-form-item>
                <t-form-item label="状态">
                  <t-select v-model="exceptionFilters.status" clearable placeholder="全部状态" style="width: 150px;">
                    <t-option value="PENDING" label="待处理" />
                    <t-option value="RESOLVED" label="已处理" />
                  </t-select>
                </t-form-item>
                <t-form-item label="类型">
                  <t-select v-model="exceptionFilters.type" clearable placeholder="全部类型" style="width: 150px;">
                    <t-option v-for="item in exceptionTypes" :key="item.value" :value="item.value" :label="item.label" />
                  </t-select>
                </t-form-item>
                <t-form-item label="日期范围">
                  <t-date-range-picker v-model="exceptionFilters.dateRange" style="width: 260px;" />
                </t-form-item>
                <t-form-item>
                  <t-button theme="primary" @click="loadExceptionList">查询</t-button>
                  <t-button variant="outline" @click="resetExceptionFilters" style="margin-left: 8px;">重置</t-button>
                </t-form-item>
              </t-form>
            </div>

            <!-- 表格 -->
            <t-table
              :data="exceptionList"
              :columns="exceptionColumns"
              :loading="exceptionLoading"
              :pagination="exceptionPagination"
              row-key="id"
              hover
              stripe
              @page-change="handleExceptionPageChange"
            >
              <template #empty>
                <EmptyState
                  :type="exceptionFilters.keyword || exceptionFilters.type || exceptionFilters.status ? 'search' : 'data'"
                  :title="exceptionFilters.keyword || exceptionFilters.type || exceptionFilters.status ? '未找到匹配结果' : '暂无异常工单'"
                  :description="exceptionFilters.keyword || exceptionFilters.type || exceptionFilters.status ? '请尝试调整筛选条件' : ''"
                />
              </template>
              <template #type="{ row }">
                {{ getExceptionTypeText(row.type) }}
              </template>
              <template #status="{ row }">
                <t-tag :theme="row.status === 'PENDING' ? 'warning' : 'success'" variant="light">
                  {{ row.status === 'PENDING' ? '待处理' : '已处理' }}
                </t-tag>
              </template>
              <template #createdAt="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
              <template #op="{ row }">
                <t-button
                  v-if="row.status === 'PENDING'"
                  theme="primary"
                  variant="text"
                  size="small"
                  @click="showResolveDialog(row)"
                >处理</t-button>
                <t-button variant="text" size="small" @click="showExceptionDetail(row)">详情</t-button>
              </template>
            </t-table>
          </div>
        </t-tab-panel>
      </t-tabs>
    </t-card>

    <!-- 处理异常工单弹窗 -->
    <t-dialog
      v-model:visible="resolveDialogVisible"
      header="处理异常工单"
      :confirm-btn="{ content: '确认', loading: resolveLoading }"
      @confirm="handleResolve"
    >
      <div class="resolve-content" v-if="currentException">
        <div class="resolve-info">
          <p><strong>工单编号：</strong>{{ currentException.ticketNo }}</p>
          <p><strong>关联订单：</strong>{{ currentException.order?.orderNo }}</p>
          <p><strong>异常类型：</strong>{{ getExceptionTypeText(currentException.type) }}</p>
          <p><strong>问题描述：</strong>{{ currentException.description }}</p>
        </div>
        <t-form ref="resolveFormRef" :data="resolveForm" :rules="resolveRules">
          <t-form-item label="处理结果" name="resolution">
            <t-textarea v-model="resolveForm.resolution" placeholder="请输入处理结果" :rows="4" />
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>

    <!-- 异常工单详情弹窗 -->
    <t-dialog
      v-model:visible="exceptionDetailVisible"
      header="异常工单详情"
      :footer="false"
      width="500px"
    >
      <div class="detail-content" v-if="currentException">
        <t-descriptions :column="1" bordered>
          <t-descriptions-item label="工单编号">{{ currentException.ticketNo }}</t-descriptions-item>
          <t-descriptions-item label="关联订单">{{ currentException.order?.orderNo }}</t-descriptions-item>
          <t-descriptions-item label="异常类型">{{ getExceptionTypeText(currentException.type) }}</t-descriptions-item>
          <t-descriptions-item label="问题描述">{{ currentException.description }}</t-descriptions-item>
          <t-descriptions-item label="提交时间">{{ formatDateTime(currentException.createdAt) }}</t-descriptions-item>
          <t-descriptions-item label="状态">
            <t-tag :theme="currentException.status === 'PENDING' ? 'warning' : 'success'" variant="light">
              {{ currentException.status === 'PENDING' ? '待处理' : '已处理' }}
            </t-tag>
          </t-descriptions-item>
          <t-descriptions-item v-if="currentException.resolution" label="处理结果">{{ currentException.resolution }}</t-descriptions-item>
          <t-descriptions-item v-if="currentException.resolvedAt" label="处理时间">{{ formatDateTime(currentException.resolvedAt) }}</t-descriptions-item>
        </t-descriptions>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { EmptyState } from '@/components'
import {
  getServiceStatistics,
  getExceptionTypes as fetchExceptionTypes,
  getExceptionList,
  getExceptionDetail,
  resolveException,
} from '@/api/service'

// Tab状态 - 【2026-01-27】移除锁货功能，默认显示异常工单
const activeTab = ref('exception')

// 待处理异常工单数量
const pendingExceptionCount = ref(0)

// 异常类型列表
const exceptionTypes = ref<{ value: string; label: string }[]>([])

// ========== 异常工单 ==========
const exceptionList = ref<any[]>([])
const exceptionLoading = ref(false)
const exceptionFilters = reactive({
  keyword: '',
  status: '',
  type: '',
  dateRange: [] as string[],
})
const exceptionPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})
const exceptionColumns = [
  { colKey: 'ticketNo', title: '工单编号', width: 150 },
  { colKey: 'order.orderNo', title: '关联订单', width: 150 },
  { colKey: 'type', title: '异常类型', width: 100 },
  { colKey: 'description', title: '问题描述', minWidth: 200, ellipsis: true },
  { colKey: 'createdAt', title: '提交时间', width: 160 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'op', title: '操作', width: 120, fixed: 'right' },
]

// ========== 弹窗状态 ==========
const resolveDialogVisible = ref(false)
const exceptionDetailVisible = ref(false)
const resolveLoading = ref(false)
const currentException = ref<any>(null)

// 处理表单
const resolveForm = reactive({
  resolution: '',
})
const resolveRules = {
  resolution: [{ required: true, message: '请输入处理结果', trigger: 'blur' }],
}

// 加载统计数据
async function loadStatistics() {
  try {
    const res = await getServiceStatistics()
    if (res.code === 0) {
      pendingExceptionCount.value = res.data.pendingException
    }
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

// 加载异常类型
async function loadExceptionTypes() {
  try {
    const res = await fetchExceptionTypes()
    if (res.code === 0) {
      exceptionTypes.value = res.data
    }
  } catch (error) {
    console.error('加载异常类型失败:', error)
  }
}

// 加载异常工单列表
async function loadExceptionList() {
  exceptionLoading.value = true
  try {
    const params: any = {
      page: exceptionPagination.current,
      pageSize: exceptionPagination.pageSize,
    }
    if (exceptionFilters.keyword) params.keyword = exceptionFilters.keyword
    if (exceptionFilters.status) params.status = exceptionFilters.status
    if (exceptionFilters.type) params.type = exceptionFilters.type
    if (exceptionFilters.dateRange && exceptionFilters.dateRange.length === 2) {
      params.startDate = exceptionFilters.dateRange[0]
      params.endDate = exceptionFilters.dateRange[1]
    }

    const res = await getExceptionList(params)
    if (res.code === 0) {
      exceptionList.value = res.data.list
      exceptionPagination.total = res.data.total
    }
  } catch (error) {
    console.error('加载异常工单列表失败:', error)
  } finally {
    exceptionLoading.value = false
  }
}

// 重置筛选
function resetExceptionFilters() {
  exceptionFilters.keyword = ''
  exceptionFilters.status = ''
  exceptionFilters.type = ''
  exceptionFilters.dateRange = []
  exceptionPagination.current = 1
  loadExceptionList()
}

// 分页变化
function handleExceptionPageChange({ current, pageSize }: { current: number; pageSize: number }) {
  exceptionPagination.current = current
  exceptionPagination.pageSize = pageSize
  loadExceptionList()
}

// 【2026-01-27】Tab切换 - 移除锁货功能后简化
function handleTabChange(value: string) {
  if (value === 'exception') {
    loadExceptionList()
  }
}

// 显示处理异常工单弹窗
function showResolveDialog(row: any) {
  currentException.value = row
  resolveForm.resolution = ''
  resolveDialogVisible.value = true
}

// 显示异常工单详情
async function showExceptionDetail(row: any) {
  try {
    const res = await getExceptionDetail(row.id)
    if (res.code === 0) {
      currentException.value = res.data
      exceptionDetailVisible.value = true
    }
  } catch (error) {
    MessagePlugin.error('获取详情失败')
  }
}

// 处理异常工单
async function handleResolve() {
  if (!currentException.value) return

  if (!resolveForm.resolution.trim()) {
    MessagePlugin.warning('请输入处理结果')
    return
  }

  resolveLoading.value = true
  try {
    const res = await resolveException(currentException.value.id, {
      resolution: resolveForm.resolution,
    })
    if (res.code === 0) {
      MessagePlugin.success('工单已处理')
      resolveDialogVisible.value = false
      loadExceptionList()
      loadStatistics()
    } else {
      MessagePlugin.error(res.message || '操作失败')
    }
  } catch (error) {
    MessagePlugin.error('操作失败')
  } finally {
    resolveLoading.value = false
  }
}

// 格式化日期时间
function formatDateTime(dateStr: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

// 获取异常类型文本
function getExceptionTypeText(type: string) {
  const item = exceptionTypes.value.find((t) => t.value === type)
  return item?.label || type
}

// 初始化 - 【2026-01-27】移除锁货功能后改为加载异常工单
onMounted(() => {
  loadStatistics()
  loadExceptionTypes()
  loadExceptionList()
})
</script>

<style scoped>
.service-page {
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 4px 0;
}

.page-desc {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.main-card {
  background: #fff;
  border-radius: 8px;
}

.tab-content {
  padding: 24px 0;
}

.filter-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

/* 【2026-01-27】锁货功能已移除，保留异常工单相关样式 */
.resolve-content,
.detail-content {
  padding: 16px 0;
}

.resolve-info {
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 20px;
}

.resolve-info p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #333;
}

.resolve-info p:last-child {
  margin-bottom: 0;
}

/* TDesign 样式覆盖 */
:deep(.t-tabs__nav-item) {
  font-size: 14px;
}

:deep(.t-tabs__nav-item.t-is-active) {
  font-weight: 500;
}

:deep(.t-form__item) {
  margin-bottom: 16px;
}

:deep(.t-descriptions__body) {
  font-size: 14px;
}
</style>
