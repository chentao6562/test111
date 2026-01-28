<script setup lang="ts">
/**
 * 我的拼团列表页面
 * @since 2026-01-21
 */
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import {
  getMyGroupBuys,
  getGroupBuyConfig,
  GroupBuyStatus,
  GroupBuyStatusLabels,
  GroupBuyStatusColors,
  type MyGroupBuyItem,
  type GroupBuyConfig
} from '../api/groupBuy'

const router = useRouter()

// 数据
const loading = ref(true)
const config = ref<GroupBuyConfig | null>(null)
const groupBuys = ref<MyGroupBuyItem[]>([])

// 当前Tab
const activeTab = ref('all')
const tabs = [
  { value: 'all', label: '全部' },
  { value: 'FORMING', label: '组队中' },
  { value: 'FULL', label: '已满员' },
  { value: 'COMPLETED', label: '已完成' },
]

// 【2026-01-27修复】从tiers动态计算最大档位人数
const maxTierCount = computed(() => {
  if (!config.value?.tiers || config.value.tiers.length === 0) {
    return 10 // 默认最大10人
  }
  return Math.max(...config.value.tiers.map(t => t.count))
})

// 【2026-01-27修复】动态生成档位文案，如"3人团/5人团/10人团"
const tierLabels = computed(() => {
  if (!config.value?.tiers || config.value.tiers.length === 0) {
    return '3人团/5人团/10人团' // 默认文案
  }
  return config.value.tiers.map(t => `${t.count}人团`).join('/')
})

// 加载配置
const loadConfig = async () => {
  try {
    config.value = await getGroupBuyConfig()
  } catch {
    // 忽略
  }
}

// 加载拼团列表
const loadGroupBuys = async () => {
  loading.value = true
  try {
    const list = await getMyGroupBuys()
    groupBuys.value = list || []
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
  } finally {
    loading.value = false
  }
}

// 过滤后的列表
const filteredGroupBuys = () => {
  if (activeTab.value === 'all') {
    return groupBuys.value
  }
  return groupBuys.value.filter(item => item.status === activeTab.value)
}

// 切换Tab
const onTabChange = (value: string) => {
  activeTab.value = value
}

// 查看详情
const viewDetail = (code: string) => {
  router.push(`/group-buy/${code}`)
}

// 计算剩余时间
const getRemainingTime = (expireAt: string): string => {
  const expireTime = new Date(expireAt).getTime()
  const now = Date.now()
  const diff = expireTime - now

  if (diff <= 0) return '已过期'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `剩余${days}天`
  } else if (hours > 0) {
    return `剩余${hours}小时${minutes}分`
  } else {
    return `剩余${minutes}分钟`
  }
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

// 返回
const goBack = () => {
  router.back()
}

onMounted(() => {
  loadConfig()
  loadGroupBuys()
})
</script>

<template>
  <div class="my-group-buys-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">我的拼团</div>
      <div class="nav-right"></div>
    </div>

    <!-- 功能说明 -->
    <div class="intro-card" v-if="config?.enabled">
      <div class="intro-icon">
        <t-icon name="user-add" size="32px" />
      </div>
      <div class="intro-content">
        <!-- 【2026-01-27修复】使用动态计算的档位数据 -->
        <div class="intro-title">{{ config.requiredCount }}-{{ maxTierCount }}人拼团 享阶梯赠品</div>
        <div class="intro-desc">
          {{ config.requiredCount }}人成团，人越多赠品越好！
          <br />{{ tierLabels }} 各有惊喜
        </div>
      </div>
    </div>

    <!-- 功能未开放提示 -->
    <div class="disabled-card" v-else-if="config && !config.enabled">
      <t-icon name="info-circle" size="24px" />
      <span>拼团功能暂未开放</span>
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

    <!-- 拼团列表 -->
    <div class="group-buys-section">
      <!-- 加载中 -->
      <div class="loading-wrap" v-if="loading">
        <t-loading theme="circular" size="32px" />
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else-if="filteredGroupBuys().length === 0">
        <t-icon name="user-add" size="48px" class="empty-icon" />
        <p>暂无拼团记录</p>
        <p class="empty-tip">预约确认后可发起拼团</p>
      </div>

      <!-- 拼团列表 -->
      <div class="group-buys-list" v-else>
        <div
          v-for="item in filteredGroupBuys()"
          :key="item.id"
          class="group-buy-card"
          @click="viewDetail(item.code)"
        >
          <div class="card-header">
            <div class="initiator-tag" v-if="item.isInitiator">
              <t-icon name="flag" size="12px" />
              我发起的
            </div>
            <div
              class="status-tag"
              :style="{ backgroundColor: GroupBuyStatusColors[item.status] }"
            >
              {{ GroupBuyStatusLabels[item.status] }}
            </div>
          </div>

          <div class="card-content">
            <div class="progress-info">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: `${(item.currentCount / item.requiredCount) * 100}%` }"
                ></div>
              </div>
              <div class="progress-text">{{ item.currentCount }}/{{ item.requiredCount }}人</div>
            </div>

            <!-- 【2026-01-28修复】多档位赠品显示阶梯信息，单一模式显示bonusGiftName -->
            <div class="gift-info" v-if="item.giftTiers && item.giftTiers.length > 0">
              <t-icon name="gift" size="14px" />
              阶梯赠品：{{ item.giftTiers.map(t => `${t.count}人档`).join('/') }}
            </div>
            <div class="gift-info" v-else-if="item.bonusGiftName">
              <t-icon name="gift" size="14px" />
              成团赠品：{{ item.bonusGiftName }}
            </div>

            <!-- 【2026-01-26】显示区域位置 -->
            <div class="region-info" v-if="item.regionName">
              <t-icon name="location" size="14px" />
              {{ item.regionName }}
            </div>

            <div class="meta-info">
              <span class="pickup-date">提货日期：{{ formatDate(item.pickupDate) }}</span>
              <span class="remaining-time" v-if="item.status === GroupBuyStatus.FORMING">
                {{ getRemainingTime(item.expireAt) }}
              </span>
            </div>
          </div>

          <div class="card-footer">
            <span class="code">拼团码：{{ item.code }}</span>
            <t-icon name="chevron-right" size="16px" class="arrow" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-group-buys-page {
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
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  z-index: 100;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.nav-back {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-right {
  width: 40px;
}

.nav-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.intro-card {
  margin: 56px 12px 12px;
  padding: 16px;
  background: linear-gradient(135deg, #E53935 0%, #ff6f61 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: #fff;
}

.intro-icon {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.intro-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.intro-desc {
  font-size: 13px;
  opacity: 0.9;
}

.disabled-card {
  margin: 56px 12px 12px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #999;
  font-size: 14px;
}

.tabs-wrap {
  display: flex;
  background: #fff;
  margin: 12px;
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

.group-buys-section {
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

.empty-tip {
  font-size: 13px;
  margin-top: 8px;
}

.group-buys-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-buy-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.initiator-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #E53935;
  font-weight: 500;
}

.status-tag {
  font-size: 12px;
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
}

.card-content {
  padding: 16px;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #E53935, #ff6f61);
  border-radius: 4px;
}

.progress-text {
  font-size: 14px;
  color: #E53935;
  font-weight: 500;
  min-width: 60px;
  text-align: right;
}

.gift-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #8c6d00;
  background: #fffbe6;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
}

/* 【2026-01-26】区域位置样式 */
.region-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
}

.meta-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.pickup-date {
  color: #666;
}

.remaining-time {
  color: #E53935;
  font-weight: 500;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f9f9f9;
}

.code {
  font-size: 12px;
  color: #999;
}

.arrow {
  color: #ccc;
}
</style>
