<script setup lang="ts">
/**
 * 限时锁价配置页面
 * @since 2026-01-21
 */
import { ref, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import request from '@/api/request'

// 系统配置
const systemConfig = ref({
  enabled: false,
  lockHours: 24,
  minAmount: 100,
})

// 活动配置列表
const configList = ref<any[]>([])
const loading = ref(false)
const configLoading = ref(false)

// 弹窗状态
const showConfigDialog = ref(false)
const dialogTitle = ref('新增活动配置')
const configForm = ref({
  id: null as number | null,
  name: '',
  lockHours: 24,
  minAmount: 100,
  startTime: null as string | null,
  endTime: null as string | null,
  isActive: true,
})

// 分页
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
})

// 表格列定义
const columns = [
  { colKey: 'id', title: 'ID', width: 60 },
  { colKey: 'name', title: '活动名称', minWidth: 150 },
  { colKey: 'lockHours', title: '锁价时长(小时)', width: 120 },
  { colKey: 'minAmount', title: '最低金额', width: 100 },
  { colKey: 'time', title: '活动时间', minWidth: 200 },
  { colKey: 'isActive', title: '状态', width: 80 },
  { colKey: 'createdAt', title: '创建时间', width: 160 },
  { colKey: 'operations', title: '操作', width: 150 },
]

// 获取系统配置
const fetchSystemConfig = async () => {
  try {
    const res = await request.get<any>('/admin/price-lock/system-config')
    if (res.code === 0) {
      systemConfig.value = res.data
    }
  } catch (error) {
    console.error('获取系统配置失败:', error)
  }
}

// 保存系统配置
const saveSystemConfig = async () => {
  loading.value = true
  try {
    const res = await request.post<any>('/admin/price-lock/system-config', systemConfig.value)
    if (res.code === 0) {
      MessagePlugin.success('保存成功')
    } else {
      MessagePlugin.error(res.message || '保存失败')
    }
  } catch (error) {
    MessagePlugin.error('保存失败')
  } finally {
    loading.value = false
  }
}

// 获取活动配置列表
const fetchConfigList = async () => {
  configLoading.value = true
  try {
    const res = await request.get<any>('/admin/price-lock/configs', {
      params: {
        page: pagination.value.current,
        pageSize: pagination.value.pageSize,
      }
    })
    if (res.code === 0) {
      configList.value = res.data.list || []
      pagination.value.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取配置列表失败:', error)
  } finally {
    configLoading.value = false
  }
}

// 新增活动配置
const handleAdd = () => {
  dialogTitle.value = '新增活动配置'
  configForm.value = {
    id: null,
    name: '',
    lockHours: 24,
    minAmount: 100,
    startTime: null,
    endTime: null,
    isActive: true,
  }
  showConfigDialog.value = true
}

// 编辑活动配置
const handleEdit = (row: any) => {
  dialogTitle.value = '编辑活动配置'
  configForm.value = {
    id: row.id,
    name: row.name,
    lockHours: row.lockHours,
    minAmount: row.minAmount,
    startTime: row.startTime ? row.startTime.slice(0, 16) : null,
    endTime: row.endTime ? row.endTime.slice(0, 16) : null,
    isActive: row.isActive,
  }
  showConfigDialog.value = true
}

// 保存活动配置
const saveConfig = async () => {
  if (!configForm.value.name) {
    MessagePlugin.warning('请输入活动名称')
    return
  }

  loading.value = true
  try {
    const url = configForm.value.id
      ? `/admin/price-lock/configs/${configForm.value.id}`
      : '/admin/price-lock/configs'

    const res = configForm.value.id
      ? await request.put<any>(url, configForm.value)
      : await request.post<any>(url, configForm.value)

    if (res.code === 0) {
      MessagePlugin.success('保存成功')
      showConfigDialog.value = false
      fetchConfigList()
    } else {
      MessagePlugin.error(res.message || '保存失败')
    }
  } catch (error) {
    MessagePlugin.error('保存失败')
  } finally {
    loading.value = false
  }
}

// 删除活动配置
const handleDelete = async (row: any) => {
  try {
    const res = await request.delete<any>(`/admin/price-lock/configs/${row.id}`)
    if (res.code === 0) {
      MessagePlugin.success('删除成功')
      fetchConfigList()
    } else {
      MessagePlugin.error(res.message || '删除失败')
    }
  } catch (error) {
    MessagePlugin.error('删除失败')
  }
}

// 页码变化
const handlePageChange = (pageInfo: any) => {
  pagination.value.current = pageInfo.current
  pagination.value.pageSize = pageInfo.pageSize
  fetchConfigList()
}

// 格式化时间
const formatTime = (row: any) => {
  if (!row.startTime && !row.endTime) {
    return '不限时间'
  }
  const start = row.startTime ? new Date(row.startTime).toLocaleString('zh-CN') : '不限'
  const end = row.endTime ? new Date(row.endTime).toLocaleString('zh-CN') : '不限'
  return `${start} ~ ${end}`
}

// 格式化创建时间
const formatCreatedAt = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchSystemConfig()
  fetchConfigList()
})
</script>

<template>
  <div class="price-lock-config-page">
    <!-- 系统配置卡片 -->
    <t-card title="系统配置" :bordered="false" class="config-card">
      <t-form :data="systemConfig" layout="inline" label-align="left" :label-width="100">
        <t-form-item label="功能开关">
          <t-switch v-model="systemConfig.enabled">
            <template #label="{ value }">{{ value ? '已开启' : '已关闭' }}</template>
          </t-switch>
        </t-form-item>
        <t-form-item label="默认锁价时长">
          <t-input-number
            v-model="systemConfig.lockHours"
            :min="1"
            :max="168"
            suffix="小时"
            style="width: 150px"
          />
        </t-form-item>
        <t-form-item label="默认最低金额">
          <t-input-number
            v-model="systemConfig.minAmount"
            :min="0"
            :max="10000"
            prefix="¥"
            style="width: 150px"
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" :loading="loading" @click="saveSystemConfig">
            保存配置
          </t-button>
        </t-form-item>
      </t-form>
      <t-alert theme="info" style="margin-top: 16px">
        <template #message>
          <div>锁价功能说明：客户可在浏览商品时锁定当前价格，在锁价有效期内以锁定价格预约。</div>
          <div style="margin-top: 4px">营销心理：制造"价格即将上涨"的紧迫感，促进客户尽快到店。</div>
        </template>
      </t-alert>
    </t-card>

    <!-- 活动配置卡片 -->
    <t-card title="活动配置" :bordered="false" class="config-card" style="margin-top: 16px">
      <template #actions>
        <t-button theme="primary" @click="handleAdd">
          <template #icon><t-icon name="add" /></template>
          新增活动
        </t-button>
      </template>

      <t-table
        :data="configList"
        :columns="columns"
        :loading="configLoading"
        :pagination="pagination"
        row-key="id"
        stripe
        hover
        @page-change="handlePageChange"
      >
        <template #minAmount="{ row }">
          ¥{{ row.minAmount }}
        </template>
        <template #time="{ row }">
          {{ formatTime(row) }}
        </template>
        <template #isActive="{ row }">
          <t-tag :theme="row.isActive ? 'success' : 'default'">
            {{ row.isActive ? '启用' : '禁用' }}
          </t-tag>
        </template>
        <template #createdAt="{ row }">
          {{ formatCreatedAt(row.createdAt) }}
        </template>
        <template #operations="{ row }">
          <t-space>
            <t-link theme="primary" @click="handleEdit(row)">编辑</t-link>
            <t-popconfirm content="确定删除该配置？" @confirm="handleDelete(row)">
              <t-link theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 编辑弹窗 -->
    <t-dialog
      v-model:visible="showConfigDialog"
      :header="dialogTitle"
      width="500px"
      :confirm-btn="{ content: '保存', loading }"
      @confirm="saveConfig"
    >
      <t-form :data="configForm" :label-width="100">
        <t-form-item label="活动名称" required>
          <t-input v-model="configForm.name" placeholder="请输入活动名称" />
        </t-form-item>
        <t-form-item label="锁价时长">
          <t-input-number
            v-model="configForm.lockHours"
            :min="1"
            :max="168"
            suffix="小时"
            style="width: 100%"
          />
        </t-form-item>
        <t-form-item label="最低金额">
          <t-input-number
            v-model="configForm.minAmount"
            :min="0"
            :max="10000"
            prefix="¥"
            style="width: 100%"
          />
        </t-form-item>
        <t-form-item label="开始时间">
          <t-date-picker
            v-model="configForm.startTime"
            enable-time-picker
            placeholder="不限"
            style="width: 100%"
          />
        </t-form-item>
        <t-form-item label="结束时间">
          <t-date-picker
            v-model="configForm.endTime"
            enable-time-picker
            placeholder="不限"
            style="width: 100%"
          />
        </t-form-item>
        <t-form-item label="状态">
          <t-switch v-model="configForm.isActive">
            <template #label="{ value }">{{ value ? '启用' : '禁用' }}</template>
          </t-switch>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<style scoped>
.price-lock-config-page {
  padding: 16px;
}

.config-card {
  margin-bottom: 16px;
}

:deep(.t-card__body) {
  padding: 20px;
}
</style>
