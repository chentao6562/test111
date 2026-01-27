<script setup lang="ts">
/**
 * 我的锁价页面
 * @since 2026-01-21
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import {
  getMyPriceLocks,
  PriceLockStatus,
  PriceLockStatusLabels,
  PriceLockStatusColors,
  formatRemainingTime,
  type PriceLockDetail
} from '../api/priceLock'

const router = useRouter()
const userStore = useUserStore()

// 数据
const priceLocks = ref<PriceLockDetail[]>([])
const loading = ref(false)

// Tab标签
const activeTab = ref('all')
const tabs = [
  { label: '全部', value: 'all' },
  { label: '生效中', value: PriceLockStatus.ACTIVE },
  { label: '已使用', value: PriceLockStatus.USED },
  { label: '已过期', value: PriceLockStatus.EXPIRED },
]

// 过滤后的列表
const filteredList = computed(() => {
  if (activeTab.value === 'all') {
    return priceLocks.value
  }
  return priceLocks.value.filter(item => item.status === activeTab.value)
})

// 加载锁价列表
const loadPriceLocks = async () => {
  const phone = userStore.userInfo?.phone
  if (!phone) return

  loading.value = true
  try {
    priceLocks.value = await getMyPriceLocks(phone)
  } catch (error) {
    console.error('加载锁价列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 使用锁价预约
const usePriceLock = (priceLock: PriceLockDetail) => {
  // 跳转到购物车，并携带锁价码
  router.push({
    path: '/cart',
    query: { priceLockCode: priceLock.code }
  })
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 返回
const goBack = () => {
  router.back()
}

onMounted(() => {
  loadPriceLocks()
})
</script>

<template>
  <div class="my-price-locks-page">
    <!-- 顶部导航栏 -->
    <div class="nav-bar">
      <div class="nav-left" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">我的锁价</div>
      <div class="nav-right"></div>
    </div>

    <!-- Tab标签 -->
    <div class="tabs">
      <div
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: activeTab === tab.value }"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- 锁价列表 -->
    <div class="price-lock-list" v-if="!loading">
      <div v-if="filteredList.length === 0" class="empty-state">
        <t-icon name="file-unknown" size="60px" />
        <p>暂无锁价记录</p>
      </div>

      <div
        v-for="item in filteredList"
        :key="item.id"
        class="price-lock-card"
      >
        <div class="card-header">
          <div class="lock-code">锁价码: {{ item.code }}</div>
          <t-tag
            :style="{ backgroundColor: PriceLockStatusColors[item.status], color: '#fff' }"
            size="small"
          >
            {{ PriceLockStatusLabels[item.status] }}
          </t-tag>
        </div>

        <div class="card-body">
          <div class="lock-amount">
            <span class="label">锁定金额</span>
            <span class="value">¥{{ item.totalAmount.toFixed(2) }}</span>
          </div>

          <div class="lock-items">
            <div class="label">锁定商品</div>
            <div class="items-list">
              <div v-for="(prod, idx) in item.lockedItems.slice(0, 3)" :key="idx" class="item">
                {{ prod.productName }} x{{ prod.quantity }}
              </div>
              <div v-if="item.lockedItems.length > 3" class="item more">
                ...等{{ item.lockedItems.length }}件商品
              </div>
            </div>
          </div>

          <div class="lock-time">
            <div class="time-item">
              <span class="label">创建时间</span>
              <span class="value">{{ formatDate(item.createdAt) }}</span>
            </div>
            <div class="time-item">
              <span class="label">过期时间</span>
              <span class="value">{{ formatDate(item.expireAt) }}</span>
            </div>
          </div>

          <!-- 生效中显示剩余时间和操作按钮 -->
          <div v-if="item.status === PriceLockStatus.ACTIVE" class="lock-action">
            <div class="remaining-time">
              <t-icon name="time" />
              剩余 {{ formatRemainingTime(item.remainingSeconds) }}
            </div>
            <t-button theme="primary" size="small" @click="usePriceLock(item)">
              使用锁价预约
            </t-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <t-loading size="40px" />
      <p>加载中...</p>
    </div>

    <!-- 底部说明 -->
    <div class="bottom-tips">
      <t-icon name="info-circle" />
      <span>锁价功能可锁定当前优惠价格，在有效期内以锁定价格预约</span>
    </div>
  </div>
</template>

<style scoped>
.my-price-locks-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-left, .nav-right {
  width: 40px;
  display: flex;
  align-items: center;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

/* Tab标签 */
.tabs {
  display: flex;
  background: #fff;
  padding: 0 16px;
  border-bottom: 1px solid #eee;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 14px;
  color: #666;
  position: relative;
}

.tab-item.active {
  color: #E53935;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: #E53935;
  border-radius: 2px;
}

/* 锁价列表 */
.price-lock-list {
  padding: 12px;
}

.price-lock-card {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%);
  border-bottom: 1px solid #ffe58f;
}

.lock-code {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.card-body {
  padding: 16px;
}

.lock-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.lock-amount .label {
  font-size: 14px;
  color: #666;
}

.lock-amount .value {
  font-size: 20px;
  font-weight: 600;
  color: #E53935;
}

.lock-items {
  margin-bottom: 12px;
}

.lock-items .label {
  font-size: 13px;
  color: #999;
  margin-bottom: 6px;
}

.items-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.items-list .item {
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
}

.items-list .item.more {
  color: #999;
}

.lock-time {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
}

.time-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.time-item .label {
  font-size: 12px;
  color: #999;
}

.time-item .value {
  font-size: 13px;
  color: #333;
}

.lock-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.remaining-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #E53935;
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #999;
}

.empty-state p {
  margin-top: 16px;
  font-size: 14px;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #999;
}

.loading-state p {
  margin-top: 16px;
  font-size: 14px;
}

/* 底部说明 */
.bottom-tips {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px;
  background: #fff;
  border-top: 1px solid #eee;
  font-size: 12px;
  color: #999;
}
</style>
