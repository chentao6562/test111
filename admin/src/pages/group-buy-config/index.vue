<script setup lang="ts">
/**
 * 拼团配置管理页面
 * 管理拼团活动的基础配置
 * @since 2026-01-21
 */
import { ref, onMounted, computed } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next'
import request from '@/api/request'
import { EmptyState } from '@/components'

// 拼团配置类型
interface GroupBuyConfig {
  id: number
  name: string
  requiredCount: number
  minAmount: number
  formingHours: number
  bonusGiftName: string | null
  bonusGiftCost: number
  startTime: string | null
  endTime: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  memberGiftsJson?: string | null  // 【2026-01-29】多档位赠品配置
}

// 【2026-01-29】多档位赠品配置类型
interface TierGiftConfig {
  count: number           // 成团人数档位
  memberGifts: string[]   // 团员赠品列表
  memberGiftCost: number  // 团员赠品成本
  leaderGift: string      // 团长奖励
  leaderCount: number     // 团长奖励数量
  leaderGiftCost: number  // 团长奖励成本
}

// 系统配置
const systemConfig = ref({
  enabled: false,
  requiredCount: 3,
  minAmount: 200,
  formingHours: 24
})

// 表格数据
const data = ref<GroupBuyConfig[]>([])
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
  name: '',
  requiredCount: 3,
  minAmount: 200,
  formingHours: 24,
  bonusGiftName: '',
  bonusGiftCost: 0,
  startTime: '',
  endTime: '',
  isActive: true,
  // 【2026-01-29】多档位赠品模式
  useMultiTier: false,
  giftTiers: [
    { count: 3, memberGifts: ['28寸仙女棒×2盒'], memberGiftCost: 4, leaderGift: '超级棒棒糖', leaderCount: 1, leaderGiftCost: 10 },
    { count: 5, memberGifts: ['水母派对×1盒'], memberGiftCost: 8, leaderGift: '超级棒棒糖', leaderCount: 2, leaderGiftCost: 20 },
    { count: 10, memberGifts: ['水母派对×1盒', '迷你加特林×1个'], memberGiftCost: 18, leaderGift: '超级棒棒糖', leaderCount: 3, leaderGiftCost: 30 }
  ] as TierGiftConfig[]
})
const editingId = ref<number | null>(null)

// 表格列定义
const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 60 },
  { colKey: 'name', title: '活动名称', minWidth: 150 },
  {
    colKey: 'requiredCount',
    title: '成团人数',
    width: 120,
    cell: 'requiredCount'
  },
  {
    colKey: 'minAmount',
    title: '最低预约金额',
    width: 120,
    cell: 'minAmount'
  },
  {
    colKey: 'formingHours',
    title: '组团时限',
    width: 100,
    cell: 'formingHours'
  },
  {
    colKey: 'bonusGiftName',
    title: '成团赠品',
    minWidth: 200,
    cell: 'bonusGift'
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

// 【2026-01-29】解析多档位赠品配置
const parseGiftTiers = (json: string | null | undefined): TierGiftConfig[] => {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    if (parsed.tiers && Array.isArray(parsed.tiers)) {
      return parsed.tiers
    }
    return []
  } catch {
    return []
  }
}

// 【2026-01-29】检查是否启用多档位模式
const hasMultiTier = (row: GroupBuyConfig): boolean => {
  const tiers = parseGiftTiers(row.memberGiftsJson)
  return tiers.length > 0
}

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'inactive' }
]

// 加载系统配置
const loadSystemConfig = async () => {
  try {
    const res = await request.get('/admin/group-buy/system-config')
    if (res.data) {
      systemConfig.value = {
        enabled: res.data.enabled || false,
        requiredCount: res.data.requiredCount || 3,
        minAmount: res.data.minAmount || 200,
        formingHours: res.data.formingHours || 24
      }
    }
  } catch (error: any) {
    console.error('加载系统配置失败:', error)
  }
}

// 保存系统配置
const saveSystemConfig = async () => {
  try {
    await request.post('/admin/group-buy/system-config', systemConfig.value)
    MessagePlugin.success('系统配置保存成功')
  } catch (error: any) {
    MessagePlugin.error(error.message || '保存失败')
  }
}

// 切换功能开关
const toggleEnabled = async () => {
  try {
    await request.post('/admin/group-buy/system-config', {
      ...systemConfig.value,
      enabled: !systemConfig.value.enabled
    })
    systemConfig.value.enabled = !systemConfig.value.enabled
    MessagePlugin.success(systemConfig.value.enabled ? '拼团功能已开启' : '拼团功能已关闭')
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  }
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res = await request.get('/admin/group-buy/configs', {
      params: {
        page: pagination.value.current,
        pageSize: pagination.value.pageSize,
        status: searchForm.value.status
      }
    })
    if (res.data) {
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
  searchForm.value = { status: '' }
  pagination.value.current = 1
  loadData()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增拼团活动配置'
  editingId.value = null
  formData.value = {
    name: '',
    requiredCount: systemConfig.value.requiredCount,
    minAmount: systemConfig.value.minAmount,
    formingHours: systemConfig.value.formingHours,
    bonusGiftName: '',
    bonusGiftCost: 0,
    startTime: '',
    endTime: '',
    isActive: true,
    useMultiTier: false,
    giftTiers: [
      { count: 3, memberGifts: ['28寸仙女棒×2盒'], memberGiftCost: 4, leaderGift: '超级棒棒糖', leaderCount: 1, leaderGiftCost: 10 },
      { count: 5, memberGifts: ['水母派对×1盒'], memberGiftCost: 8, leaderGift: '超级棒棒糖', leaderCount: 2, leaderGiftCost: 20 },
      { count: 10, memberGifts: ['水母派对×1盒', '迷你加特林×1个'], memberGiftCost: 18, leaderGift: '超级棒棒糖', leaderCount: 3, leaderGiftCost: 30 }
    ]
  }
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: GroupBuyConfig) => {
  dialogTitle.value = '编辑拼团活动配置'
  editingId.value = row.id
  const tiers = parseGiftTiers(row.memberGiftsJson)
  formData.value = {
    name: row.name,
    requiredCount: row.requiredCount,
    minAmount: row.minAmount,
    formingHours: row.formingHours,
    bonusGiftName: row.bonusGiftName || '',
    bonusGiftCost: row.bonusGiftCost || 0,
    startTime: row.startTime ? row.startTime.slice(0, 16) : '',
    endTime: row.endTime ? row.endTime.slice(0, 16) : '',
    isActive: row.isActive,
    useMultiTier: tiers.length > 0,
    giftTiers: tiers.length > 0 ? tiers : [
      { count: 3, memberGifts: ['28寸仙女棒×2盒'], memberGiftCost: 4, leaderGift: '超级棒棒糖', leaderCount: 1, leaderGiftCost: 10 },
      { count: 5, memberGifts: ['水母派对×1盒'], memberGiftCost: 8, leaderGift: '超级棒棒糖', leaderCount: 2, leaderGiftCost: 20 },
      { count: 10, memberGifts: ['水母派对×1盒', '迷你加特林×1个'], memberGiftCost: 18, leaderGift: '超级棒棒糖', leaderCount: 3, leaderGiftCost: 30 }
    ]
  }
  dialogVisible.value = true
}

// 删除
const handleDelete = (row: GroupBuyConfig) => {
  const confirmDia = DialogPlugin.confirm({
    header: '确认删除',
    body: `确定要删除"${row.name}"活动配置吗？`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        await request.delete(`/admin/group-buy/configs/${row.id}`)
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
  if (!formData.value.name.trim()) {
    MessagePlugin.warning('请输入活动名称')
    return
  }
  if (formData.value.minAmount < 0) {
    MessagePlugin.warning('最低预约金额不能为负数')
    return
  }

  // 【2026-01-29】多档位模式下不需要验证单一赠品
  if (!formData.value.useMultiTier) {
    if (formData.value.requiredCount < 2) {
      MessagePlugin.warning('成团人数至少为2人')
      return
    }
    if (!formData.value.bonusGiftName.trim()) {
      MessagePlugin.warning('请输入成团赠品名称')
      return
    }
  } else {
    // 多档位模式下验证档位配置
    if (formData.value.giftTiers.length === 0) {
      MessagePlugin.warning('请至少配置一个档位')
      return
    }
    for (const tier of formData.value.giftTiers) {
      if (tier.count < 2) {
        MessagePlugin.warning('每个档位人数至少为2人')
        return
      }
      if (tier.memberGifts.length === 0 || !tier.memberGifts[0]) {
        MessagePlugin.warning('请配置团员赠品')
        return
      }
      if (!tier.leaderGift) {
        MessagePlugin.warning('请配置团长奖励')
        return
      }
    }
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
    // 【2026-01-29】构建提交数据
    const submitData: any = {
      name: formData.value.name,
      minAmount: formData.value.minAmount,
      formingHours: formData.value.formingHours,
      startTime: formData.value.startTime || null,
      endTime: formData.value.endTime || null,
      isActive: formData.value.isActive
    }

    if (formData.value.useMultiTier) {
      // 多档位模式：requiredCount使用最小档位，赠品存入JSON
      const sortedTiers = [...formData.value.giftTiers].sort((a, b) => a.count - b.count)
      submitData.requiredCount = sortedTiers[0].count
      submitData.bonusGiftName = `多档位（${sortedTiers.map(t => t.count + '人').join('/')}）`
      submitData.bonusGiftCost = sortedTiers[0].memberGiftCost
      submitData.memberGiftsJson = JSON.stringify({ tiers: formData.value.giftTiers })
    } else {
      // 单一赠品模式
      submitData.requiredCount = formData.value.requiredCount
      submitData.bonusGiftName = formData.value.bonusGiftName || null
      submitData.bonusGiftCost = formData.value.bonusGiftCost
      submitData.memberGiftsJson = null
    }

    if (editingId.value) {
      await request.put(`/admin/group-buy/configs/${editingId.value}`, submitData)
      MessagePlugin.success('更新成功')
    } else {
      await request.post('/admin/group-buy/configs', submitData)
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

// 【2026-01-29】添加档位
const addTier = () => {
  const lastTier = formData.value.giftTiers[formData.value.giftTiers.length - 1]
  formData.value.giftTiers.push({
    count: lastTier ? lastTier.count + 5 : 3,
    memberGifts: [''],
    memberGiftCost: 0,
    leaderGift: '',
    leaderCount: 1,
    leaderGiftCost: 0
  })
}

// 【2026-01-29】删除档位
const removeTier = (index: number) => {
  if (formData.value.giftTiers.length > 1) {
    formData.value.giftTiers.splice(index, 1)
  }
}

// 【2026-01-29】更新团员赠品（逗号分隔转数组）
const updateMemberGifts = (index: number, value: string) => {
  formData.value.giftTiers[index].memberGifts = value.split('，').map(s => s.trim()).filter(Boolean)
  if (formData.value.giftTiers[index].memberGifts.length === 0) {
    formData.value.giftTiers[index].memberGifts = ['']
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
const isActivityActive = (row: GroupBuyConfig) => {
  if (!row.startTime && !row.endTime) return true
  const now = new Date()
  if (row.startTime && new Date(row.startTime) > now) return false
  if (row.endTime && new Date(row.endTime) < now) return false
  return true
}

onMounted(() => {
  loadSystemConfig()
  loadData()
})
</script>

<template>
  <div class="page-container">
    <!-- 功能说明 -->
    <t-card class="info-card" :bordered="false">
      <div class="info-content">
        <t-icon name="usergroup" size="24px" style="color: var(--td-brand-color)" />
        <div class="info-text">
          <h3>拼团功能说明</h3>
          <p>客户预约确认后可发起拼团，邀请好友一起到店。同一门店、同一提货日期的预约可加入同一个拼团。满足成团人数后，每人均可获得额外赠品。</p>
        </div>
      </div>
    </t-card>

    <!-- 系统配置 -->
    <t-card class="system-card" :bordered="false" title="系统配置">
      <template #actions>
        <t-switch
          v-model="systemConfig.enabled"
          :label="systemConfig.enabled ? '功能已开启' : '功能已关闭'"
          @change="toggleEnabled"
        />
      </template>
      <t-form :data="systemConfig" layout="inline">
        <t-form-item label="默认成团人数">
          <t-input-number
            v-model="systemConfig.requiredCount"
            :min="2"
            :max="10"
            suffix="人"
            style="width: 150px"
          />
        </t-form-item>
        <t-form-item label="默认最低金额">
          <t-input-number
            v-model="systemConfig.minAmount"
            :min="0"
            :max="99999"
            suffix="元"
            style="width: 150px"
          />
        </t-form-item>
        <t-form-item label="默认组团时限">
          <t-input-number
            v-model="systemConfig.formingHours"
            :min="1"
            :max="168"
            suffix="小时"
            style="width: 150px"
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" @click="saveSystemConfig">保存配置</t-button>
        </t-form-item>
      </t-form>
      <div class="config-tip">
        <t-icon name="info-circle" />
        <span>以上为默认配置，创建具体活动时可单独设置</span>
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
          <EmptyState
            :type="searchForm.status ? 'search' : 'data'"
            :title="searchForm.status ? '未找到匹配结果' : '暂无拼团活动配置'"
            :description="searchForm.status ? '请尝试调整筛选条件' : '点击上方按钮新增拼团活动'"
          />
        </template>

        <!-- 成团人数 -->
        <template #requiredCount="{ row }">
          <template v-if="hasMultiTier(row)">
            <t-space direction="vertical" size="small">
              <t-tag v-for="tier in parseGiftTiers(row.memberGiftsJson)" :key="tier.count" theme="primary" variant="light">
                {{ tier.count }}人档
              </t-tag>
            </t-space>
          </template>
          <t-tag v-else theme="primary">{{ row.requiredCount }}人成团</t-tag>
        </template>

        <!-- 最低预约金额 -->
        <template #minAmount="{ row }">
          <span class="amount-text">{{ formatAmount(row.minAmount) }}</span>
        </template>

        <!-- 组团时限 -->
        <template #formingHours="{ row }">
          <span>{{ row.formingHours }}小时</span>
        </template>

        <!-- 成团赠品 -->
        <template #bonusGift="{ row }">
          <template v-if="hasMultiTier(row)">
            <t-space direction="vertical" size="small" class="multi-tier-gifts">
              <div v-for="tier in parseGiftTiers(row.memberGiftsJson)" :key="tier.count" class="tier-gift-row">
                <t-tag size="small" theme="warning">{{ tier.count }}人</t-tag>
                <span class="tier-gift-text">
                  团员：{{ tier.memberGifts.join(' + ') }}
                  <span class="leader-gift">| 团长：{{ tier.leaderGift }}×{{ tier.leaderCount }}</span>
                </span>
              </div>
            </t-space>
          </template>
          <template v-else>
            <div v-if="row.bonusGiftName" class="gift-info">
              <t-icon name="gift" size="16px" style="color: #f60" />
              <span>{{ row.bonusGiftName }}</span>
              <span class="cost-text" v-if="row.bonusGiftCost">(成本¥{{ row.bonusGiftCost }})</span>
            </div>
            <span v-else class="no-gift">未设置</span>
          </template>
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
      <t-form :data="formData" label-width="120px">
        <!-- 基本信息 -->
        <t-divider>基本信息</t-divider>

        <t-form-item label="活动名称" name="name" required>
          <t-input
            v-model="formData.name"
            placeholder="例如：春节三人拼团活动"
            maxlength="100"
          />
        </t-form-item>

        <t-form-item label="成团人数" name="requiredCount" required>
          <t-input-number
            v-model="formData.requiredCount"
            :min="2"
            :max="10"
            suffix="人"
            style="width: 200px"
          />
          <div class="form-tip">达到此人数即为成团成功</div>
        </t-form-item>

        <t-form-item label="最低预约金额" name="minAmount">
          <t-input-number
            v-model="formData.minAmount"
            :min="0"
            :max="99999"
            suffix="元"
            style="width: 200px"
          />
          <div class="form-tip">预约金额达到此门槛才能参与拼团</div>
        </t-form-item>

        <t-form-item label="组团有效期" name="formingHours">
          <t-input-number
            v-model="formData.formingHours"
            :min="1"
            :max="168"
            suffix="小时"
            style="width: 200px"
          />
          <div class="form-tip">发起拼团后，超过此时间未成团将自动过期</div>
        </t-form-item>

        <!-- 赠品设置 -->
        <t-divider>成团赠品</t-divider>

        <!-- 【2026-01-29】多档位模式开关 -->
        <t-form-item label="赠品模式">
          <t-radio-group v-model="formData.useMultiTier">
            <t-radio :value="false">单一赠品（所有人相同）</t-radio>
            <t-radio :value="true">多档位阶梯（人越多赠品越好）</t-radio>
          </t-radio-group>
        </t-form-item>

        <!-- 单一赠品模式 -->
        <template v-if="!formData.useMultiTier">
          <t-form-item label="赠品名称" name="bonusGiftName" required>
            <t-input
              v-model="formData.bonusGiftName"
              placeholder="例如：精美仙女棒1盒"
              maxlength="100"
            />
            <div class="form-tip">成团后每人均可获得此赠品</div>
          </t-form-item>

          <t-form-item label="赠品成本" name="bonusGiftCost">
            <t-input-number
              v-model="formData.bonusGiftCost"
              :min="0"
              :max="9999"
              :decimal-places="2"
              suffix="元"
              style="width: 200px"
            />
            <div class="form-tip">赠品成本将由成团成员平摊，从各自订单的总代利润中扣除</div>
          </t-form-item>
        </template>

        <!-- 多档位赠品模式 -->
        <template v-else>
          <t-form-item label="赠品档位配置">
            <div class="tier-config-list">
              <div v-for="(tier, index) in formData.giftTiers" :key="index" class="tier-config-item">
                <div class="tier-header">
                  <t-tag theme="primary">档位 {{ index + 1 }}</t-tag>
                  <t-button v-if="formData.giftTiers.length > 1" theme="danger" variant="text" size="small" @click="removeTier(index)">
                    <t-icon name="delete" />
                  </t-button>
                </div>
                <t-space direction="vertical" size="small" style="width: 100%">
                  <t-form-item label="成团人数" style="margin-bottom: 8px">
                    <t-input-number v-model="tier.count" :min="2" :max="50" suffix="人" style="width: 120px" />
                  </t-form-item>
                  <t-form-item label="团员赠品" style="margin-bottom: 8px">
                    <t-input
                      :value="tier.memberGifts.join('，')"
                      @change="updateMemberGifts(index, $event)"
                      placeholder="多个赠品用中文逗号分隔，如：28寸仙女棒×2盒，水母派对×1盒"
                    />
                  </t-form-item>
                  <t-form-item label="团员赠品成本" style="margin-bottom: 8px">
                    <t-input-number v-model="tier.memberGiftCost" :min="0" :decimal-places="2" suffix="元" style="width: 150px" />
                  </t-form-item>
                  <t-form-item label="团长奖励" style="margin-bottom: 8px">
                    <t-space>
                      <t-input v-model="tier.leaderGift" placeholder="如：超级棒棒糖" style="width: 150px" />
                      <span>×</span>
                      <t-input-number v-model="tier.leaderCount" :min="1" :max="10" style="width: 80px" />
                      <span>个</span>
                    </t-space>
                  </t-form-item>
                  <t-form-item label="团长奖励成本" style="margin-bottom: 0">
                    <t-input-number v-model="tier.leaderGiftCost" :min="0" :decimal-places="2" suffix="元" style="width: 150px" />
                  </t-form-item>
                </t-space>
              </div>
              <t-button theme="default" variant="dashed" block @click="addTier">
                <t-icon name="add" /> 添加档位
              </t-button>
            </div>
            <div class="form-tip">人数越多，赠品越好。团长额外获得奖励以激励拉人</div>
          </t-form-item>
        </template>

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
  background: linear-gradient(135deg, #e6f4ff 0%, #f0f9ff 100%);
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
    color: #1677ff;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #666;
  }
}

.system-card {
  margin-bottom: 20px;

  .config-tip {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 16px;
    padding: 8px 12px;
    background: #f5f5f5;
    border-radius: 4px;
    font-size: 13px;
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

    .gift-info {
      display: flex;
      align-items: center;
      gap: 6px;

      .cost-text {
        font-size: 12px;
        color: #999;
      }
    }

    .no-gift {
      color: #999;
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

/* 【2026-01-29】多档位赠品样式 */
.multi-tier-gifts {
  .tier-gift-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    line-height: 1.5;

    .tier-gift-text {
      color: #333;
    }

    .leader-gift {
      color: #f40;
    }
  }
}

.tier-config-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.tier-config-item {
  padding: 16px;
  background: #f8f8f8;
  border-radius: 8px;
  border: 1px solid #e8e8e8;

  .tier-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
}
</style>
