<script setup lang="ts">
/**
 * 满赠活动页面
 * 【2026-01-19】增强版：支持赠品图片、库存显示、活动时间
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { get } from '../api'

const router = useRouter()

// 赠品档位类型
interface GiftTier {
  id: number
  minAmount: number
  giftName: string
  giftCost: number | null
  description: string | null
  giftImage: string | null
  giftStock: number
  usedCount: number
  startTime: string | null
  endTime: string | null
}

// 赠品档位数据
const giftTiers = ref<GiftTier[]>([])
const loading = ref(true)

// 预设赠品档位（如果API没有数据）
const defaultGiftTiers: GiftTier[] = [
  {
    id: 1,
    minAmount: 100,
    giftName: '小手持烟花 × 2',
    giftCost: 5,
    description: '入门档，适合小额预约',
    giftImage: null,
    giftStock: 0,
    usedCount: 0,
    startTime: null,
    endTime: null
  },
  {
    id: 2,
    minAmount: 200,
    giftName: '仙女棒 × 10 + 摔炮 × 1盒',
    giftCost: 15,
    description: '家庭档，孩子最爱',
    giftImage: null,
    giftStock: 0,
    usedCount: 0,
    startTime: null,
    endTime: null
  },
  {
    id: 3,
    minAmount: 300,
    giftName: '小型喷花 × 1 + 仙女棒 × 10',
    giftCost: 25,
    description: '实惠档，性价比之选',
    giftImage: null,
    giftStock: 0,
    usedCount: 0,
    startTime: null,
    endTime: null
  },
  {
    id: 4,
    minAmount: 500,
    giftName: '中型烟花 × 1 + 小礼包',
    giftCost: 50,
    description: '超值档，团购首选',
    giftImage: null,
    giftStock: 0,
    usedCount: 0,
    startTime: null,
    endTime: null
  },
  {
    id: 5,
    minAmount: 1000,
    giftName: '大型烟花 × 1 + 中礼包',
    giftCost: 100,
    description: '豪华档，年度巨献',
    giftImage: null,
    giftStock: 0,
    usedCount: 0,
    startTime: null,
    endTime: null
  }
]

// 加载赠品档位
const loadGiftTiers = async () => {
  loading.value = true
  try {
    const res = await get<GiftTier[]>('/shop/gift-tiers')
    if (res.data && res.data.length > 0) {
      giftTiers.value = res.data
    } else {
      giftTiers.value = defaultGiftTiers
    }
  } catch (e) {
    console.error('加载赠品档位失败', e)
    giftTiers.value = defaultGiftTiers
  } finally {
    loading.value = false
  }
}

// 计算剩余库存
const getRemainingStock = (tier: GiftTier): number => {
  if (tier.giftStock === 0) return -1 // -1表示不限库存
  return tier.giftStock - (tier.usedCount || 0)
}

// 检查是否库存紧张
const isLowStock = (tier: GiftTier): boolean => {
  const remaining = getRemainingStock(tier)
  return remaining > 0 && remaining <= 10
}

// 检查是否已售罄
const isSoldOut = (tier: GiftTier): boolean => {
  const remaining = getRemainingStock(tier)
  return remaining === 0
}

// 检查活动是否在有效期内
const isActivityActive = (tier: GiftTier): boolean => {
  if (!tier.startTime && !tier.endTime) return true
  const now = new Date()
  if (tier.startTime && new Date(tier.startTime) > now) return false
  if (tier.endTime && new Date(tier.endTime) < now) return false
  return true
}

// 获取活动时间显示文本
const getTimeText = (tier: GiftTier): string => {
  if (!tier.startTime && !tier.endTime) return ''
  const now = new Date()

  if (tier.startTime && new Date(tier.startTime) > now) {
    return `${formatDate(tier.startTime)} 开始`
  }

  if (tier.endTime) {
    const endDate = new Date(tier.endTime)
    if (endDate < now) {
      return '已结束'
    }
    return `${formatDate(tier.endTime)} 结束`
  }

  return ''
}

// 格式化日期
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 返回
const goBack = () => {
  router.back()
}

// 去预约
const goHome = () => {
  router.push('/')
}

onMounted(() => {
  loadGiftTiers()
})
</script>

<template>
  <div class="gift-activity-page">
    <!-- 顶部导航 -->
    <nav class="nav-bar">
      <button class="nav-back" @click="goBack">
        <span class="material-symbols-outlined">arrow_back_ios</span>
      </button>
      <h2 class="nav-title">满赠活动</h2>
      <div class="nav-placeholder"></div>
    </nav>

    <!-- 活动头部 -->
    <div class="activity-header">
      <div class="header-bg">
        <span class="header-icon">🎁</span>
        <h1 class="header-title">预约有礼</h1>
        <p class="header-subtitle">预约金额越多 赠品越丰厚</p>
      </div>
    </div>

    <!-- 活动规则 -->
    <div class="activity-rules">
      <div class="rule-item">
        <span class="rule-icon">✓</span>
        <span class="rule-text">线上预约，到店领取赠品</span>
      </div>
      <div class="rule-item">
        <span class="rule-icon">✓</span>
        <span class="rule-text">按预约金额自动匹配最高档位</span>
      </div>
      <div class="rule-item">
        <span class="rule-icon">✓</span>
        <span class="rule-text">赠品数量有限，先到先得</span>
      </div>
      <div class="rule-item rule-item-exclude">
        <span class="rule-icon">!</span>
        <span class="rule-text">特价商品、特价套餐不参与满赠活动</span>
      </div>
    </div>

    <!-- 【2026-01-22 卖点展示】平台优势说明 -->
    <div class="why-choose-section">
      <h3 class="section-title">为什么选择蒙庆烟花？</h3>
      <div class="reasons-grid">
        <div class="reason-card">
          <span class="reason-icon">🏭</span>
          <span class="reason-title">呼市较大仓库</span>
          <span class="reason-desc">500+品类一站购齐</span>
        </div>
        <div class="reason-card">
          <span class="reason-icon">💰</span>
          <span class="reason-title">厂家直供</span>
          <span class="reason-desc">没有中间商</span>
        </div>
        <div class="reason-card">
          <span class="reason-icon">🛡️</span>
          <span class="reason-title">正品保障</span>
          <span class="reason-desc">资质齐全</span>
        </div>
        <div class="reason-card">
          <span class="reason-icon">📞</span>
          <span class="reason-title">专属服务</span>
          <span class="reason-desc">30分钟响应</span>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="40px" />
    </div>

    <!-- 赠品档位列表 -->
    <div class="gift-tiers" v-else>
      <div
        class="gift-tier-card"
        v-for="(tier, index) in giftTiers"
        :key="tier.id"
        :class="{
          highlight: index === 2,
          'sold-out': isSoldOut(tier),
          'inactive': !isActivityActive(tier)
        }"
      >
        <!-- 推荐标签 -->
        <div class="tier-recommend" v-if="index === 2 && !isSoldOut(tier)">
          <span>最受欢迎</span>
        </div>

        <!-- 库存紧张标签 -->
        <div class="tier-low-stock" v-if="isLowStock(tier)">
          <span>仅剩{{ getRemainingStock(tier) }}份</span>
        </div>

        <!-- 售罄标签 -->
        <div class="tier-sold-out-badge" v-if="isSoldOut(tier)">
          <span>已领完</span>
        </div>

        <div class="tier-content">
          <!-- 赠品图片 -->
          <div class="tier-image" v-if="tier.giftImage">
            <img :src="tier.giftImage" :alt="tier.giftName" />
          </div>
          <div class="tier-image tier-image-placeholder" v-else>
            <span class="material-symbols-outlined">card_giftcard</span>
          </div>

          <div class="tier-info">
            <div class="tier-header">
              <div class="tier-amount">
                <span class="amount-label">满</span>
                <span class="amount-value">¥{{ tier.minAmount }}</span>
              </div>
              <div class="tier-arrow">
                <span class="material-symbols-outlined">arrow_forward</span>
              </div>
              <div class="tier-gift">
                <span class="gift-label">送</span>
              </div>
            </div>

            <div class="gift-name">{{ tier.giftName }}</div>

            <div class="tier-footer">
              <div class="tier-left">
                <span class="tier-desc">{{ tier.description || '精选好礼，诚意满满' }}</span>
                <span class="tier-time" v-if="getTimeText(tier)">
                  <span class="material-symbols-outlined">schedule</span>
                  {{ getTimeText(tier) }}
                </span>
              </div>
              <div class="tier-right">
                <span class="tier-cost" v-if="tier.giftCost">价值¥{{ tier.giftCost }}</span>
                <span class="tier-stock" v-if="tier.giftStock > 0 && !isSoldOut(tier)">
                  剩余{{ getRemainingStock(tier) }}份
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部行动按钮 -->
    <div class="bottom-action">
      <button class="action-btn" @click="goHome">
        <span class="material-symbols-outlined">shopping_bag</span>
        立即预约 领取赠品
      </button>
    </div>
  </div>
</template>

<style scoped>
.gift-activity-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF7E6 0%, #f5f5f5 30%);
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
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
  background: linear-gradient(135deg, #FFD700, #FFA500);
}

.nav-back {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

.nav-back .material-symbols-outlined {
  font-size: 20px;
  color: #5D4200;
}

.nav-title {
  font-size: 18px;
  font-weight: 700;
  color: #5D4200;
}

.nav-placeholder {
  width: 40px;
}

/* 活动头部 */
.activity-header {
  padding: 24px 16px;
}

.header-bg {
  text-align: center;
}

.header-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.header-title {
  font-size: 28px;
  font-weight: 800;
  color: #5D4200;
  margin: 0 0 8px;
}

.header-subtitle {
  font-size: 14px;
  color: #8B6914;
  margin: 0;
}

/* 活动规则 */
.activity-rules {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  background: white;
  margin: 0 16px 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #666;
}

.rule-icon {
  color: #52c41a;
  font-weight: 700;
}

.rule-item-exclude {
  color: #ff6b35;
  margin-top: 4px;
}

.rule-item-exclude .rule-icon {
  color: #ff6b35;
}

/* 加载中 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

/* 赠品档位列表 */
.gift-tiers {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gift-tier-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 2px solid transparent;
  transition: all 0.2s;
}

.gift-tier-card.highlight {
  border-color: #FFD700;
  background: linear-gradient(135deg, #FFFBE6 0%, #FFF7E6 100%);
}

.gift-tier-card.sold-out {
  opacity: 0.6;
}

.gift-tier-card.inactive {
  opacity: 0.5;
  background: #f5f5f5;
}

.gift-tier-card:active {
  transform: scale(0.99);
}

.tier-recommend {
  position: absolute;
  top: -1px;
  right: 16px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #5D4200;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 0 0 8px 8px;
}

.tier-low-stock {
  position: absolute;
  top: -1px;
  left: 16px;
  background: linear-gradient(135deg, #FF6B6B, #FF4757);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 0 0 8px 8px;
}

.tier-sold-out-badge {
  position: absolute;
  top: -1px;
  right: 16px;
  background: #999;
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 0 0 8px 8px;
}

.tier-content {
  display: flex;
  gap: 12px;
}

.tier-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.tier-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tier-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFF7E6, #FFE4B5);
}

.tier-image-placeholder .material-symbols-outlined {
  font-size: 36px;
  color: #D4A574;
}

.tier-info {
  flex: 1;
  min-width: 0;
}

.tier-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.tier-amount {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.amount-label {
  font-size: 12px;
  color: #999;
}

.amount-value {
  font-size: 20px;
  font-weight: 800;
  color: #F40;
}

.tier-arrow {
  color: #ccc;
}

.tier-arrow .material-symbols-outlined {
  font-size: 16px;
}

.tier-gift {
  display: flex;
  align-items: center;
}

.gift-label {
  font-size: 11px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #5D4200;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
}

.gift-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  line-height: 1.4;
}

.tier-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.tier-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tier-desc {
  font-size: 11px;
  color: #999;
}

.tier-time {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  color: #FF9800;
}

.tier-time .material-symbols-outlined {
  font-size: 12px;
}

.tier-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.tier-cost {
  font-size: 12px;
  color: #52c41a;
  font-weight: 600;
}

.tier-stock {
  font-size: 10px;
  color: #FF6B6B;
  font-weight: 500;
}

/* 底部行动按钮 */
.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: white;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);
}

.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #5D4200;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.action-btn:active {
  transform: scale(0.98);
}

.action-btn .material-symbols-outlined {
  font-size: 22px;
}

/* ========== 【2026-01-22】平台优势说明 ========== */
.why-choose-section {
  margin: 0 16px 16px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.why-choose-section .section-title {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  text-align: center;
  margin: 0 0 16px;
}

.reasons-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.reason-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 12px;
  background: linear-gradient(135deg, #FFF7E6 0%, #FFFBE6 100%);
  border-radius: 10px;
  border: 1px solid rgba(250, 173, 20, 0.2);
}

.reason-icon {
  font-size: 24px;
}

.reason-title {
  font-size: 13px;
  font-weight: 700;
  color: #5D4200;
}

.reason-desc {
  font-size: 11px;
  color: #8B6914;
}
</style>
