<script setup lang="ts">
/**
 * 下级订单页面
 * 【2026-01-30新增】推销员查看下级的客户预约
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { get } from '../api'

defineOptions({
  name: 'TeamOrders'
})

const router = useRouter()
const route = useRoute()

// 状态颜色映射
const StatusColors: Record<number, string> = {
  0: '#FF9800',
  1: '#2196F3',
  2: '#4CAF50',
  3: '#4CAF50',
  4: '#999999',
  5: '#999999',
  6: '#F44336',
  7: '#FF9800',
  8: '#2196F3',
  9: '#9C27B0',
}

// 状态Tab
const statusTabs = [
  { label: '全部', value: undefined },
  { label: '待确认', value: 0 },
  { label: '处理中', value: '2,7,8,9' },
  { label: '已完成', value: 3 },
]
const activeTab = ref(0)

// 下级成员筛选
interface TeamMember {
  id: number
  name: string
  phone: string
  level: string
}
const teamMembers = ref<TeamMember[]>([])
const selectedMemberId = ref<number | null>(null)
const showMemberPicker = ref(false)
const tempMemberId = ref<number | null>(null)

// 订单数据
interface OrderItem {
  id: number
  reservationNo: string
  customerName: string
  customerPhone: string
  pickupDate: string
  totalAmount: number
  status: number
  statusLabel: string
  giftName?: string
  itemCount: number
  storeName: string
  createdAt: string
  salesperson: {
    id: number
    name: string
    phone: string
    level: string
  } | null
}

interface Summary {
  totalOrders: number
  totalAmount: number
  completedOrders: number
  completedAmount: number
}

const loading = ref(false)
const refreshing = ref(false)
const list = ref<OrderItem[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)
const hasMore = computed(() => list.value.length < total.value)
const summary = ref<Summary>({
  totalOrders: 0,
  totalAmount: 0,
  completedOrders: 0,
  completedAmount: 0,
})

// 页面标题
const pageTitle = computed(() => {
  if (selectedMemberId.value) {
    const member = teamMembers.value.find(m => m.id === selectedMemberId.value)
    return member ? `${member.name}的订单` : '下级订单'
  }
  return '下级订单'
})

// 选中成员名称
const selectedMemberName = computed(() => {
  if (!selectedMemberId.value) return '全部下级'
  const member = teamMembers.value.find(m => m.id === selectedMemberId.value)
  return member ? member.name : '全部下级'
})

// 加载团队成员列表
const loadTeamMembers = async () => {
  try {
    const res = await get<{ list: TeamMember[] }>('/commission/team-members', { pageSize: 100 })
    teamMembers.value = res.data.list || []
  } catch (err) {
    console.error('加载团队成员失败:', err)
  }
}

// 加载订单数据
const loadData = async (refresh = false) => {
  if (loading.value) return

  if (refresh) {
    page.value = 1
    list.value = []
    refreshing.value = true
  }

  loading.value = true

  try {
    const tab = statusTabs[activeTab.value]
    const params: any = {
      page: page.value,
      pageSize,
    }

    if (selectedMemberId.value) {
      params.memberId = selectedMemberId.value
    }

    if (tab?.value !== undefined) {
      params.status = tab.value
    }

    const res = await get<{
      list: OrderItem[]
      total: number
      summary: Summary
    }>('/commission/team-orders', params)

    if (refresh) {
      list.value = res.data.list
    } else {
      list.value = [...list.value, ...res.data.list]
    }
    total.value = res.data.total
    summary.value = res.data.summary
  } catch (err) {
    console.error('加载下级订单失败:', err)
    Toast({ message: '加载失败', theme: 'error' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 下拉刷新
const onRefresh = async () => {
  await loadData(true)
}

// 加载更多
const onLoadMore = async () => {
  if (!hasMore.value || loading.value) return
  page.value++
  await loadData()
}

// 切换Tab
const onTabChange = (index: number) => {
  activeTab.value = index
  loadData(true)
}

// 打开成员选择器
const openMemberPicker = () => {
  tempMemberId.value = selectedMemberId.value
  showMemberPicker.value = true
}

// 确认选择成员
const confirmMemberSelect = () => {
  selectedMemberId.value = tempMemberId.value
  showMemberPicker.value = false
  loadData(true)
}

// 跳转详情
const goDetail = (id: number) => {
  router.push(`/reservations/${id}`)
}

// 返回
const goBack = () => {
  router.back()
}

// 获取状态样式
const getStatusStyle = (status: number) => {
  const color = StatusColors[status] || '#999'
  return {
    color,
    backgroundColor: `${color}15`
  }
}

// 格式化日期
const formatDate = (dateStr: string, showTime = false) => {
  const date = new Date(dateStr)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  if (showTime) {
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d} ${h}:${min}`
  }
  return `${y}-${m}-${d}`
}

// 格式化金额
const formatPrice = (price: number) => {
  return `¥${price.toFixed(2)}`
}

// 初始化
onMounted(async () => {
  // 从URL参数获取memberId
  const memberIdParam = route.query.memberId
  if (memberIdParam) {
    selectedMemberId.value = Number(memberIdParam)
  }

  await loadTeamMembers()
  await loadData(true)
})

// 监听路由参数变化
watch(() => route.query.memberId, (newVal) => {
  if (newVal) {
    selectedMemberId.value = Number(newVal)
    loadData(true)
  }
})
</script>

<template>
  <div class="team-orders-page">
    <!-- 顶部导航 -->
    <nav class="nav-bar">
      <div class="nav-back" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <h2 class="nav-title">{{ pageTitle }}</h2>
      <div class="nav-placeholder"></div>
    </nav>

    <!-- 汇总统计卡片 -->
    <div class="summary-card">
      <div class="stat-item">
        <div class="stat-value">{{ summary.totalOrders }}</div>
        <div class="stat-label">总订单</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ formatPrice(summary.totalAmount) }}</div>
        <div class="stat-label">总金额</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ summary.completedOrders }}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-item highlight">
        <div class="stat-value">{{ formatPrice(summary.completedAmount) }}</div>
        <div class="stat-label">完成金额</div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-section">
      <!-- 下级选择器 -->
      <div class="member-filter" @click="openMemberPicker">
        <span>{{ selectedMemberName }}</span>
        <t-icon name="chevron-down" size="16px" />
      </div>

      <!-- 状态Tab -->
      <div class="status-tabs">
        <div
          class="tab-item"
          :class="{ active: activeTab === index }"
          v-for="(tab, index) in statusTabs"
          :key="index"
          @click="onTabChange(index)"
        >
          {{ tab.label }}
        </div>
      </div>
    </div>

    <!-- 订单列表 -->
    <div class="list-content">
      <t-pull-down-refresh v-model="refreshing" @refresh="onRefresh">
        <!-- 空状态 -->
        <div class="empty-state" v-if="!loading && list.length === 0">
          <t-icon name="inbox" size="64px" class="empty-icon" />
          <p class="empty-text">暂无下级订单</p>
          <p class="empty-tip">您的下级推销员暂无客户预约</p>
        </div>

        <!-- 订单卡片列表 -->
        <div class="order-list" v-else>
          <div
            class="order-card"
            v-for="item in list"
            :key="item.id"
            @click="goDetail(item.id)"
          >
            <!-- 推销员信息栏 -->
            <div class="salesperson-info" v-if="item.salesperson">
              <t-icon name="user" size="16px" />
              <span class="salesperson-name">{{ item.salesperson.name }}</span>
              <span class="salesperson-level">{{ item.salesperson.level }}</span>
            </div>

            <!-- 卡片头部 -->
            <div class="card-header">
              <span class="order-no">{{ item.reservationNo }}</span>
              <span class="status-tag" :style="getStatusStyle(item.status)">
                {{ item.statusLabel }}
              </span>
            </div>

            <!-- 客户信息 -->
            <div class="customer-info">
              <t-icon name="user" size="18px" />
              <span class="customer-name">{{ item.customerName }}</span>
              <span class="customer-phone">{{ item.customerPhone }}</span>
            </div>

            <!-- 卡片内容 -->
            <div class="card-body">
              <div class="info-row">
                <t-icon name="shop" size="16px" />
                <span class="info-text">{{ item.storeName }}</span>
              </div>
              <div class="info-row">
                <t-icon name="calendar" size="16px" />
                <span class="info-text">提货日期：{{ formatDate(item.pickupDate) }}</span>
              </div>
              <div class="info-row" v-if="item.giftName">
                <t-icon name="gift" size="16px" />
                <span class="info-text gift">赠品：{{ item.giftName }}</span>
              </div>
            </div>

            <!-- 卡片底部 -->
            <div class="card-footer">
              <div class="footer-left">
                <span class="item-count">共{{ item.itemCount }}件商品</span>
                <span class="create-time">{{ formatDate(item.createdAt, true) }}</span>
              </div>
              <div class="footer-right">
                <span class="amount-label">预约金额</span>
                <span class="amount-value">{{ formatPrice(item.totalAmount) }}</span>
              </div>
            </div>
          </div>

          <!-- 加载更多 -->
          <div class="load-more" v-if="hasMore" @click="onLoadMore">
            <t-loading v-if="loading" theme="circular" size="20px" />
            <span v-else>加载更多</span>
          </div>

          <!-- 没有更多 -->
          <div class="no-more" v-else-if="list.length > 0">
            没有更多了
          </div>
        </div>
      </t-pull-down-refresh>
    </div>

    <!-- 下级选择弹窗 -->
    <t-popup v-model="showMemberPicker" placement="bottom">
      <div class="member-picker">
        <div class="picker-header">
          <span class="picker-cancel" @click="showMemberPicker = false">取消</span>
          <span class="picker-title">选择下级</span>
          <span class="picker-confirm" @click="confirmMemberSelect">确定</span>
        </div>
        <div class="picker-content">
          <div
            class="picker-item"
            :class="{ selected: tempMemberId === null }"
            @click="tempMemberId = null"
          >
            <span>全部下级</span>
            <t-icon v-if="tempMemberId === null" name="check" size="20px" class="check-icon" />
          </div>
          <div
            class="picker-item"
            :class="{ selected: tempMemberId === member.id }"
            v-for="member in teamMembers"
            :key="member.id"
            @click="tempMemberId = member.id"
          >
            <span>{{ member.name }} ({{ member.level }})</span>
            <t-icon v-if="tempMemberId === member.id" name="check" size="20px" class="check-icon" />
          </div>
        </div>
      </div>
    </t-popup>
  </div>
</template>

<style scoped>
.team-orders-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: env(safe-area-inset-bottom);
}

/* 导航栏 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.nav-back {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.nav-title {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.nav-placeholder {
  width: 40px;
}

/* 汇总统计卡片 */
.summary-card {
  margin: 12px;
  background: linear-gradient(135deg, #E53935 0%, #FF5722 100%);
  border-radius: 12px;
  padding: 20px;
  display: flex;
}

.summary-card .stat-item {
  flex: 1;
  text-align: center;
}

.summary-card .stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.summary-card .stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.summary-card .stat-item.highlight .stat-value {
  color: #FFD54F;
}

/* 筛选区域 */
.filter-section {
  background: white;
  margin: 0 12px 12px;
  border-radius: 12px;
  padding: 12px;
}

.member-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
}

.member-filter span {
  font-size: 14px;
  color: #333;
}

.status-tabs {
  display: flex;
  gap: 8px;
}

.status-tabs .tab-item {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  font-size: 13px;
  color: #666;
  background: #f5f5f5;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.status-tabs .tab-item.active {
  background: #E53935;
  color: #fff;
}

/* 列表内容 */
.list-content {
  padding: 0 12px 80px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  color: #ddd;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
  color: #999;
  margin-bottom: 8px;
}

.empty-tip {
  font-size: 12px;
  color: #ccc;
}

/* 订单卡片 */
.order-card {
  background: white;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* 推销员信息栏 */
.salesperson-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
  border-bottom: 1px solid #f5f5f5;
}

.salesperson-info .t-icon {
  color: #1976D2;
}

.salesperson-name {
  font-size: 14px;
  font-weight: 500;
  color: #1976D2;
}

.salesperson-level {
  font-size: 11px;
  color: #1976D2;
  background: rgba(25, 118, 210, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: auto;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
}

.order-no {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.status-tag {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 12px;
}

/* 客户信息 */
.customer-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fff8e1 0%, #fffde7 100%);
  border-bottom: 1px solid #f5f5f5;
}

.customer-info .t-icon {
  color: #FF9800;
}

.customer-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.customer-phone {
  font-size: 13px;
  color: #666;
  margin-left: auto;
}

.card-body {
  padding: 12px 16px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .t-icon {
  color: #999;
}

.info-text {
  font-size: 13px;
  color: #666;
}

.info-text.gift {
  color: #4CAF50;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fafafa;
}

.footer-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-count {
  font-size: 12px;
  color: #999;
}

.create-time {
  font-size: 11px;
  color: #ccc;
}

.footer-right {
  text-align: right;
}

.amount-label {
  font-size: 11px;
  color: #999;
  display: block;
}

.amount-value {
  font-size: 18px;
  font-weight: 700;
  color: #E53935;
}

/* 加载更多 */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  font-size: 13px;
  color: #999;
  cursor: pointer;
}

.no-more {
  text-align: center;
  padding: 16px;
  font-size: 12px;
  color: #ccc;
}

/* 下级选择弹窗 */
.member-picker {
  background: white;
  border-radius: 12px 12px 0 0;
  max-height: 60vh;
  overflow: hidden;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f5f5f5;
}

.picker-cancel {
  font-size: 14px;
  color: #999;
  cursor: pointer;
}

.picker-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.picker-confirm {
  font-size: 14px;
  color: #E53935;
  font-weight: 500;
  cursor: pointer;
}

.picker-content {
  max-height: 50vh;
  overflow-y: auto;
  padding: 8px 0;
}

.picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

.picker-item:active {
  background: #f5f5f5;
}

.picker-item.selected {
  color: #E53935;
}

.check-icon {
  color: #E53935;
}
</style>
