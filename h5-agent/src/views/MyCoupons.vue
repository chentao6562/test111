<script setup lang="ts">
/**
 * 我的代金券页面
 * 【2026-01-18 春节营销】
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import {
  getMyCoupons,
  getMyCouponStats,
  CouponStatus,
  CouponSourceLabel,
  type Coupon,
  type CouponStats
} from '../api/coupon'

const router = useRouter()

// 数据
const stats = ref<CouponStats | null>(null)
const coupons = ref<Coupon[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const finished = ref(false)
const page = ref(1)
const pageSize = 20

// 当前Tab
const activeTab = ref('UNUSED')
const tabs = [
  { value: 'UNUSED', label: '未使用' },
  { value: 'USED', label: '已使用' },
  { value: 'EXPIRED', label: '已过期' },
]

// 加载统计
const loadStats = async () => {
  try {
    stats.value = await getMyCouponStats()
  } catch {
    Toast({ message: '加载统计失败', theme: 'error' })
  }
}

// 加载代金券列表
const loadCoupons = async (refresh = false) => {
  if (refresh) {
    page.value = 1
    finished.value = false
  }

  if (page.value === 1) {
    loading.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const result = await getMyCoupons({
      status: activeTab.value,
      page: page.value,
      pageSize
    })
    const list = result.list || []

    if (refresh) {
      coupons.value = list
    } else {
      coupons.value.push(...list)
    }

    if (list.length < pageSize) {
      finished.value = true
    }
  } catch {
    Toast({ message: '加载代金券失败', theme: 'error' })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 切换Tab
const onTabChange = (value: string) => {
  activeTab.value = value
  loadCoupons(true)
}

// 加载更多
const loadMore = () => {
  if (loadingMore.value || finished.value) return
  page.value++
  loadCoupons()
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 格式化时间
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 获取券码状态样式
const getCouponStatusClass = (status: string) => {
  return {
    'status-unused': status === CouponStatus.UNUSED,
    'status-used': status === CouponStatus.USED,
    'status-expired': status === CouponStatus.EXPIRED,
  }
}

// 返回
const goBack = () => {
  router.back()
}

onMounted(() => {
  loadStats()
  loadCoupons()
})
</script>

<template>
  <div class="coupons-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">我的代金券</div>
      <div class="nav-right" @click="router.push('/coupon-center')">
        领券中心
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-card">
      <div class="stats-loading" v-if="!stats">
        <t-loading theme="circular" size="32px" />
      </div>
      <template v-else>
        <div class="stats-main">
          <div class="main-label">可用代金券(元)</div>
          <div class="main-value">{{ (stats?.unusedAmount || 0).toFixed(2) }}</div>
          <div class="main-count">{{ stats?.unused || 0 }}张可用</div>
        </div>

        <div class="stats-detail">
          <div class="stat-item">
            <div class="stat-value">{{ stats?.total || 0 }}</div>
            <div class="stat-label">全部</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats?.used || 0 }}</div>
            <div class="stat-label">已使用</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats?.expired || 0 }}</div>
            <div class="stat-label">已过期</div>
          </div>
        </div>
      </template>
    </div>

    <!-- 使用说明 -->
    <div class="notice-card">
      <t-icon name="info-circle" size="16px" />
      <span>代金券仅限本人到门店购买烟花时使用，过期作废</span>
    </div>

    <!-- Tab切换 -->
    <div class="tabs-wrap">
      <div
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab-item', { active: activeTab === tab.value }]"
        @click="onTabChange(tab.value)"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- 代金券列表 -->
    <div class="coupons-section">
      <!-- 加载中 -->
      <div class="loading-wrap" v-if="loading">
        <t-loading theme="circular" size="32px" />
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else-if="coupons.length === 0">
        <t-icon name="gift" size="48px" class="empty-icon" />
        <p>暂无{{ tabs.find(t => t.value === activeTab)?.label }}代金券</p>
      </div>

      <!-- 代金券列表 -->
      <div class="coupons-list" v-else>
        <div
          v-for="coupon in coupons"
          :key="coupon.id"
          :class="['coupon-card', getCouponStatusClass(coupon.status)]"
        >
          <div class="coupon-left">
            <div class="coupon-amount">
              <span class="amount-symbol">¥</span>
              <span class="amount-value">{{ coupon.amount }}</span>
            </div>
            <div class="coupon-desc">{{ coupon.sourceDesc || CouponSourceLabel[coupon.sourceType] || coupon.sourceType }}</div>
          </div>
          <div class="coupon-divider">
            <div class="divider-circle top"></div>
            <div class="divider-line"></div>
            <div class="divider-circle bottom"></div>
          </div>
          <div class="coupon-right">
            <div class="coupon-code">券码：{{ coupon.code }}</div>
            <div class="coupon-expire">有效期至 {{ formatDate(coupon.expiredAt) }}</div>
            <div class="coupon-status" v-if="coupon.status !== CouponStatus.UNUSED">
              <template v-if="coupon.status === CouponStatus.USED">
                {{ formatTime(coupon.usedAt!) }} 已使用
              </template>
              <template v-else>
                已过期
              </template>
            </div>
            <div class="coupon-tip" v-else>
              到店出示券码核销
            </div>
          </div>
        </div>

        <!-- 加载更多 -->
        <div class="load-more">
          <t-loading v-if="loadingMore" theme="circular" size="24px" />
          <span v-else-if="!finished" @click="loadMore">加载更多</span>
          <span v-else>没有更多了</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coupons-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 20px;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  background: linear-gradient(135deg, #E53935 0%, #ff6f61 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  z-index: 100;
  color: #fff;
}

.nav-back {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-right {
  font-size: 14px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 14px;
}

.nav-title {
  font-size: 16px;
  font-weight: 500;
}

.stats-card {
  background: linear-gradient(135deg, #E53935 0%, #ff6f61 100%);
  margin: 0;
  padding: 60px 20px 24px;
  color: #fff;
}

.stats-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
}

.stats-main {
  text-align: center;
  margin-bottom: 24px;
}

.main-label {
  font-size: 13px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.main-value {
  font-size: 42px;
  font-weight: 600;
  margin-bottom: 8px;
}

.main-count {
  font-size: 13px;
  opacity: 0.8;
}

.stats-detail {
  display: flex;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 16px;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-item .stat-value {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
}

.stat-item .stat-label {
  font-size: 12px;
  opacity: 0.8;
}

.notice-card {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px;
  padding: 12px 16px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  font-size: 13px;
  color: #8c6d00;
}

.tabs-wrap {
  display: flex;
  background: #fff;
  margin: 0 12px;
  border-radius: 8px;
  padding: 4px;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.tab-item.active {
  background: #E53935;
  color: #fff;
  font-weight: 500;
}

.coupons-section {
  margin: 12px;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  background: #fff;
  border-radius: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  background: #fff;
  border-radius: 12px;
  color: #999;
}

.empty-icon {
  color: #ccc;
  margin-bottom: 12px;
}

.coupons-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.coupon-card {
  display: flex;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.coupon-card.status-unused {
  border-left: 4px solid #E53935;
}

.coupon-card.status-used,
.coupon-card.status-expired {
  border-left: 4px solid #ccc;
  opacity: 0.7;
}

.coupon-left {
  flex: 0 0 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 12px;
  background: linear-gradient(135deg, rgba(229, 57, 53, 0.08) 0%, rgba(255, 111, 97, 0.08) 100%);
}

.coupon-card.status-used .coupon-left,
.coupon-card.status-expired .coupon-left {
  background: #f5f5f5;
}

.coupon-amount {
  color: #E53935;
  margin-bottom: 4px;
}

.coupon-card.status-used .coupon-amount,
.coupon-card.status-expired .coupon-amount {
  color: #999;
}

.amount-symbol {
  font-size: 14px;
  font-weight: 500;
}

.amount-value {
  font-size: 32px;
  font-weight: 600;
}

.coupon-desc {
  font-size: 11px;
  color: #666;
  text-align: center;
}

.coupon-divider {
  width: 16px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
}

.divider-circle {
  width: 16px;
  height: 8px;
  background: #f5f5f5;
}

.divider-circle.top {
  border-radius: 0 0 8px 8px;
}

.divider-circle.bottom {
  border-radius: 8px 8px 0 0;
}

.divider-line {
  flex: 1;
  width: 1px;
  border-left: 1px dashed #ddd;
}

.coupon-right {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.coupon-code {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
}

.coupon-expire {
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
}

.coupon-status {
  font-size: 12px;
  color: #999;
}

.coupon-tip {
  font-size: 12px;
  color: #E53935;
  font-weight: 500;
}

.load-more {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 13px;
}
</style>
