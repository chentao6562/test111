<script setup lang="ts">
/**
 * 客户预约页面
 * 【2026-01-20新增】推销员查看通过自己链接提交的所有客户预约
 */
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  getAgentOrders,
  StatusLabels,
  StatusColors,
  type Reservation
} from '../api/reservation'
import { formatPrice, formatDate } from '../utils/format'
import { useUserStore } from '../stores/user'

defineOptions({
  name: 'CustomerOrders'
})

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 状态Tab
const statusTabs: Array<{ label: string; value?: number | number[]; title: string }> = [
  { label: '全部', value: undefined, title: '客户预约' },
  { label: '待确认', value: 0, title: '待确认预约' },
  { label: '处理中', value: [2, 7, 8, 9], title: '处理中预约' },
  { label: '已完成', value: 3, title: '已完成预约' },
]
const activeTab = ref(0)

const pageTitle = computed(() => {
  return statusTabs[activeTab.value]?.title || '客户预约'
})

const initTabFromQuery = () => {
  const statusParam = route.query.status
  if (statusParam !== undefined) {
    const statusValue = Number(statusParam)
    const tabIndex = statusTabs.findIndex(tab => {
      if (Array.isArray(tab.value)) {
        return tab.value.includes(statusValue)
      }
      return tab.value === statusValue
    })
    if (tabIndex !== -1) {
      activeTab.value = tabIndex
    }
  }
}

// 列表数据
const loading = ref(false)
const refreshing = ref(false)
const list = ref<Reservation[]>([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const hasMore = computed(() => list.value.length < total.value)

// 加载数据
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
    const statusValue = tab?.value
    const agentId = userStore.userInfo?.id
    if (!agentId) {
      console.error('用户未登录')
      return
    }
    const res = await getAgentOrders({
      agentId,
      page: page.value,
      pageSize,
      status: statusValue
    })

    if (refresh) {
      list.value = res.data.list
    } else {
      list.value = [...list.value, ...res.data.list]
    }
    total.value = res.data.total
  } catch (error) {
    console.error('加载客户预约列表失败:', error)
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

// 隐藏手机号中间四位
const maskPhone = (phone: string) => {
  if (!phone || phone.length !== 11) return phone
  return phone.substring(0, 3) + '****' + phone.substring(7)
}

onMounted(() => {
  initTabFromQuery()
  loadData(true)
})

onActivated(() => {
  initTabFromQuery()
  loadData(true)
})
</script>

<template>
  <div class="customer-orders-page">
    <!-- 顶部导航 -->
    <nav class="nav-bar">
      <div class="nav-back" @click="goBack">
        <span class="material-symbols-outlined">arrow_back</span>
      </div>
      <h2 class="nav-title">{{ pageTitle }}</h2>
      <div class="nav-placeholder"></div>
    </nav>

    <!-- 状态Tab -->
    <div class="tabs-wrapper">
      <div class="tabs">
        <div
          v-for="(tab, index) in statusTabs"
          :key="index"
          class="tab-item"
          :class="{ active: activeTab === index }"
          @click="onTabChange(index)"
        >
          {{ tab.label }}
          <div class="tab-line" v-if="activeTab === index"></div>
        </div>
      </div>
    </div>

    <!-- 列表内容 -->
    <div class="list-content">
      <t-pull-down-refresh v-model="refreshing" @refresh="onRefresh">
        <!-- 空状态 -->
        <div class="empty-state" v-if="!loading && list.length === 0">
          <span class="material-symbols-outlined empty-icon">groups</span>
          <p class="empty-text">暂无客户预约</p>
          <p class="empty-tip">分享您的推广链接给客户，客户预约后将在此显示</p>
        </div>

        <!-- 预约列表 -->
        <div class="order-list" v-else>
          <div
            class="order-card"
            v-for="item in list"
            :key="item.id"
            @click="goDetail(item.id)"
          >
            <!-- 卡片头部 -->
            <div class="card-header">
              <span class="order-no">{{ item.reservationNo }}</span>
              <span class="status-tag" :style="getStatusStyle(item.status)">
                {{ StatusLabels[item.status] }}
              </span>
            </div>

            <!-- 客户信息 -->
            <div class="customer-info">
              <span class="material-symbols-outlined">person</span>
              <span class="customer-name">{{ item.customerName }}</span>
              <span class="customer-phone">{{ maskPhone(item.customerPhone) }}</span>
            </div>

            <!-- 卡片内容 -->
            <div class="card-body">
              <div class="info-row">
                <span class="material-symbols-outlined">store</span>
                <span class="info-text">{{ item.storeName || '蒙庆烟花' }}</span>
              </div>
              <div class="info-row">
                <span class="material-symbols-outlined">calendar_today</span>
                <span class="info-text">提货日期：{{ formatDate(item.pickupDate) }}</span>
              </div>
              <div class="info-row" v-if="item.giftName">
                <span class="material-symbols-outlined">redeem</span>
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
  </div>
</template>

<style scoped>
.customer-orders-page {
  min-height: 100vh;
  background: #f5f5f5;
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

.nav-back .material-symbols-outlined {
  font-size: 24px;
  color: #333;
}

.nav-title {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.nav-placeholder {
  width: 40px;
}

/* Tab栏 */
.tabs-wrapper {
  background: white;
  padding: 0 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.tabs {
  display: flex;
  gap: 24px;
}

.tab-item {
  position: relative;
  padding: 12px 0;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
}

.tab-item.active {
  color: #EF062D;
  font-weight: 600;
}

.tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: #EF062D;
  border-radius: 2px;
}

/* 列表内容 */
.list-content {
  padding: 16px;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
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
  font-size: 64px;
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
  text-align: center;
  line-height: 1.5;
}

/* 预约卡片 */
.order-card {
  background: white;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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

.customer-info .material-symbols-outlined {
  font-size: 20px;
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

.info-row .material-symbols-outlined {
  font-size: 18px;
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
  color: #EF062D;
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
</style>
