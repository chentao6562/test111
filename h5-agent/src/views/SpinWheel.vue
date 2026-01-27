<template>
  <div class="spin-wheel-page">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="coin coin-1">💰</div>
      <div class="coin coin-2">🪙</div>
      <div class="star star-1">⭐</div>
      <div class="star star-2">✨</div>
    </div>

    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left" @click="goBack">
        <span class="icon">‹</span>
      </div>
      <h1 class="header-title">现金大转盘</h1>
      <div class="header-right">
        <span class="icon-sound">🔊</span>
        <span class="rule-link" @click="showRules = true">规则</span>
        <span class="divider">|</span>
        <span class="detail-link" @click="goRecords">明细</span>
      </div>
    </header>

    <!-- 滚动播报条 -->
    <div class="marquee-bar">
      <div class="marquee-content">
        <span v-for="(notice, index) in notices" :key="index" class="marquee-item">
          {{ notice.phone }} {{ notice.action === 'spin' ? '抽中了' : '成功提现' }}{{ notice.amount }}元 &nbsp;&nbsp;
        </span>
      </div>
    </div>

    <!-- 横幅 -->
    <div class="banner-scroll">
      <div class="scroll-ornament left"></div>
      <div class="scroll-ornament right"></div>
      <span class="banner-text">开年大吉 马上提现</span>
    </div>

    <!-- 金黄色账户卡片 -->
    <div class="account-card">
      <!-- 我的账户标签 -->
      <div class="account-tag">
        <span>我</span>
        <span>的</span>
        <span>账</span>
        <span>户</span>
      </div>

      <!-- 用户信息 -->
      <div class="user-info">
        <img
          :src="userStore.userInfo?.avatar || defaultAvatar"
          class="user-avatar"
          alt="头像"
        />
        <span class="user-name">{{ userStore.userInfo?.name || '用户' }}的账户：</span>
      </div>

      <!-- 累计金额 -->
      <div class="total-amount">
        <span class="currency">¥</span>
        <span class="amount-number">{{ formatAmount(participation?.availableAmount || 0) }}</span>
      </div>

      <!-- 提示文字 -->
      <p class="amount-tip">
        离微信提现仅差<span class="highlight">{{ formatAmount(amountNeeded) }}元</span>
      </p>

      <!-- 已获得/待获得 -->
      <div class="amount-details">
        <div class="amount-item">
          <p class="label">已获得金额</p>
          <p class="value">{{ formatAmount(participation?.availableAmount || 0) }}<span class="unit">元</span></p>
        </div>
        <div class="amount-divider"></div>
        <div class="amount-item">
          <p class="label">待获得金额</p>
          <p class="value pending">{{ formatAmount(amountNeeded) }}<span class="unit">元</span></p>
        </div>
      </div>
    </div>

    <!-- 抽奖区域 -->
    <div class="spin-area">
      <!-- 祝福语 -->
      <div class="blessing-bar">
        <span>祝你今天能成功提现100元！</span>
      </div>

      <!-- 剩余次数 -->
      <div class="spin-count-bar">
        <span>抽奖机会<span class="count">{{ participation?.remainingSpins || 0 }}</span>次</span>
        <span class="expire-tip">{{ countdown }} 后失效</span>
      </div>

      <!-- 转盘 -->
      <div class="wheel-container">
        <SpinWheelComponent
          ref="wheelRef"
          :prizes="prizes"
          :remaining-spins="participation?.remainingSpins || 0"
          :disabled="!participation || spinning"
          @spin="handleSpin"
          @spin-end="handleSpinEnd"
        />

        <!-- 新用户提示 -->
        <div class="new-user-tip">
          <p class="main">你是活动<span class="highlight">新用户</span>，超容易提现</p>
          <p class="sub">-活动新用户指10日内未参与现金大转盘活动的用户-</p>
        </div>
      </div>
    </div>

    <!-- 底部操作区 -->
    <div class="bottom-action">
      <button class="main-btn" @click="handleMainAction">
        <span>2026超容易提现100元</span>
        <span class="check-icon">✓</span>
      </button>
      <div class="action-buttons">
        <div class="action-item" @click="showSharePopup = true">
          <div class="action-icon">📱</div>
          <span>扫码助力</span>
        </div>
        <div class="action-item" @click="goRecords">
          <div class="action-icon">📋</div>
          <span>提现晒单</span>
        </div>
      </div>
      <div class="home-indicator"></div>
    </div>

    <!-- 抽奖结果弹窗 -->
    <div class="popup-overlay" v-if="showResult" @click="showResult = false">
      <div class="result-popup" @click.stop>
        <div class="result-header">
          <div class="result-icon">🎉</div>
          <h2>恭喜获得</h2>
        </div>
        <div class="result-amount">
          <span class="currency">¥</span>
          <span class="number">{{ lastResult?.prizeAmount?.toFixed(2) || '0.00' }}</span>
        </div>
        <p class="result-tip">累计金额：{{ lastResult?.totalAmount?.toFixed(2) || '0.00' }}元</p>
        <button class="result-btn" @click="showResult = false">继续抽奖</button>
      </div>
    </div>

    <!-- 分享弹窗 -->
    <div class="popup-overlay" v-if="showSharePopup" @click="showSharePopup = false">
      <div class="share-popup" @click.stop>
        <div class="share-header">
          <h2>邀请好友助力</h2>
          <span class="close-btn" @click="showSharePopup = false">×</span>
        </div>
        <div class="share-content">
          <p class="share-tip">分享给好友，让他们帮你获得更多金额！</p>
          <div class="share-url-box">
            <input type="text" :value="shareUrl" readonly class="share-url-input" />
          </div>
          <button class="share-btn" @click="copyShareUrl">复制链接</button>
          <button class="share-btn secondary" @click="handleShareBonus" :disabled="participation?.shareBonus">
            {{ participation?.shareBonus ? '已领取' : `分享得${config?.shareSpinCount || 2}次抽奖` }}
          </button>
        </div>
      </div>
    </div>

    <!-- 规则弹窗 -->
    <div class="popup-overlay" v-if="showRules" @click="showRules = false">
      <div class="rules-popup" @click.stop>
        <div class="rules-header">
          <h2>活动规则</h2>
          <span class="close-btn" @click="showRules = false">×</span>
        </div>
        <div class="rules-content">
          <p>1. 每日可免费抽奖{{ config?.freeSpinCount || 3 }}次</p>
          <p>2. 分享活动可额外获得{{ config?.shareSpinCount || 2 }}次抽奖机会</p>
          <p>3. 邀请好友助力，每位好友可帮您增加金额</p>
          <p>4. 累计满{{ config?.redeemThreshold || 100 }}元可兑换代金券</p>
          <p>5. 代金券可在门店消费时使用</p>
          <p>6. 代金券有效期至2026年2月14日</p>
          <p>7. 活动最终解释权归平台所有</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-mobile-vue'
import SpinWheelComponent from '@/components/SpinWheelComponent.vue'
import {
  getSpinWheelConfig,
  getMyParticipation,
  joinSpinWheel,
  doSpin,
  shareForSpins,
  redeemCoupon,
  getNotices,
  type SpinWheelConfig,
  type ParticipationInfo,
  type SpinResult,
  type DynamicNotice,
  type PrizePoolItem,
} from '@/api/spinWheel'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// 默认头像
const defaultAvatar = 'https://via.placeholder.com/40'

// 状态
const config = ref<SpinWheelConfig | null>(null)
const participation = ref<ParticipationInfo | null>(null)
const notices = ref<DynamicNotice[]>([])
const spinning = ref(false)
const showResult = ref(false)
const showSharePopup = ref(false)
const showRules = ref(false)
const lastResult = ref<SpinResult | null>(null)
const countdown = ref('')

// 组件引用
const wheelRef = ref<InstanceType<typeof SpinWheelComponent> | null>(null)

// 计算需要的金额
const amountNeeded = computed(() => {
  const threshold = config.value?.redeemThreshold || 100
  const current = participation.value?.availableAmount || 0
  return Math.max(0, threshold - current)
})

// 计算奖品列表
const prizes = computed<PrizePoolItem[]>(() => {
  return config.value?.prizePool || [
    { name: '0.01元', amount: 0.01, color: '#FF6B6B' },
    { name: '0.1元', amount: 0.1, color: '#FFD93D' },
    { name: '0.5元', amount: 0.5, color: '#6BCB77' },
    { name: '1元', amount: 1, color: '#4D96FF' },
    { name: '2元', amount: 2, color: '#FF6B6B' },
    { name: '5元', amount: 5, color: '#FFD93D' },
    { name: '10元', amount: 10, color: '#6BCB77' },
    { name: '50元', amount: 50, color: '#4D96FF' },
  ]
})

// 分享链接
const shareUrl = computed(() => {
  if (!participation.value) return ''
  return `${window.location.origin}/spin-wheel/help/${participation.value.code}`
})

// 倒计时定时器
let countdownTimer: number | null = null

// 格式化金额
function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

// 初始化
onMounted(async () => {
  await loadConfig()
  await loadParticipation()
  await loadNotices()
  startCountdown()
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})

// 加载活动配置
async function loadConfig() {
  try {
    const result = await getSpinWheelConfig()
    if (result.enabled && result.config) {
      config.value = result.config
    } else {
      MessagePlugin.warning('活动暂未开始')
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

// 加载参与信息
async function loadParticipation() {
  if (!config.value || !userStore.isLoggedIn) return

  try {
    let result = await getMyParticipation(config.value.id)

    if (!result) {
      result = await joinSpinWheel({
        phone: userStore.userInfo?.phone || '',
        name: userStore.userInfo?.name,
        configId: config.value.id,
        salespersonId: userStore.userInfo?.id,
      })
    }

    participation.value = result
  } catch (error) {
    console.error('加载参与信息失败:', error)
  }
}

// 加载滚动播报
async function loadNotices() {
  try {
    notices.value = await getNotices()
  } catch (error) {
    console.error('加载播报失败:', error)
  }
}

// 开始倒计时
function startCountdown() {
  const updateCountdown = () => {
    if (!config.value) return

    const now = Date.now()
    const end = new Date(config.value.endTime).getTime()
    const diff = end - now

    if (diff <= 0) {
      countdown.value = '已结束'
      return
    }

    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    const ms = Math.floor((diff % 1000) / 100)

    countdown.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${ms}`
  }

  updateCountdown()
  countdownTimer = window.setInterval(updateCountdown, 100)
}

// 返回
function goBack() {
  router.back()
}

// 查看记录
function goRecords() {
  MessagePlugin.info('功能开发中')
}

// 抽奖
async function handleSpin() {
  console.log('[抽奖] 点击抽奖按钮', { config: config.value, participation: participation.value, spinning: spinning.value })

  if (!config.value || !participation.value) {
    MessagePlugin.warning('请先登录')
    return
  }

  if (spinning.value) return

  if (participation.value.remainingSpins <= 0) {
    MessagePlugin.warning('抽奖次数已用完，邀请好友助力吧')
    return
  }

  spinning.value = true
  console.log('[抽奖] 开始调用API')

  try {
    const result = await doSpin(config.value.id)
    console.log('[抽奖] API返回:', result)

    if (result.success && result.prizeIndex !== undefined) {
      lastResult.value = result
      console.log('[抽奖] 调用转盘旋转, prizeIndex:', result.prizeIndex)
      wheelRef.value?.spinTo(result.prizeIndex)
    } else {
      spinning.value = false
      MessagePlugin.error(result.message || '抽奖失败')
    }
  } catch (error) {
    console.error('[抽奖] 错误:', error)
    spinning.value = false
    MessagePlugin.error('抽奖失败，请重试')
  }
}

// 抽奖动画结束
function handleSpinEnd(_prizeIndex: number) {
  spinning.value = false
  showResult.value = true

  if (lastResult.value && participation.value) {
    participation.value.totalAmount = lastResult.value.totalAmount || participation.value.totalAmount
    participation.value.availableAmount = lastResult.value.totalAmount || participation.value.availableAmount
    participation.value.remainingSpins = lastResult.value.remainingSpins || 0
  }
}

// 主操作按钮
async function handleMainAction() {
  if (!config.value || !participation.value) return

  if (participation.value.canRedeem) {
    // 可以兑换
    try {
      const result = await redeemCoupon({
        configId: config.value.id,
        amount: config.value.redeemThreshold,
      })

      if (result.success) {
        MessagePlugin.success(`兑换成功！代金券码：${result.couponCode}`)
        await loadParticipation()
      } else {
        MessagePlugin.error(result.message || '兑换失败')
      }
    } catch (error) {
      MessagePlugin.error('兑换失败，请重试')
    }
  } else {
    // 分享邀请
    showSharePopup.value = true
  }
}

// 复制分享链接
async function copyShareUrl() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    MessagePlugin.success('链接已复制')
  } catch {
    MessagePlugin.error('复制失败，请手动复制')
  }
}

// 分享获得次数
async function handleShareBonus() {
  if (!config.value) return

  try {
    const result = await shareForSpins(config.value.id)
    MessagePlugin.success(`获得${result.spinsAdded}次抽奖机会`)

    if (participation.value) {
      participation.value.remainingSpins += result.spinsAdded
      participation.value.shareBonus = true
    }
  } catch (error) {
    MessagePlugin.error('领取失败')
  }
}
</script>

<style scoped>
.spin-wheel-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FF4B2B 0%, #FF416C 100%);
  position: relative;
  overflow-x: hidden;
  padding-bottom: 180px;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.coin, .star {
  position: absolute;
  font-size: 24px;
  opacity: 0.3;
}

.coin-1 { top: 80px; left: 20px; transform: rotate(15deg); }
.coin-2 { top: 200px; right: 30px; transform: rotate(-10deg); }
.star-1 { top: 120px; right: 60px; }
.star-2 { top: 280px; left: 40px; }

/* 顶部导航 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  color: #fff;
}

.header-left {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
}

.header-title {
  font-size: 18px;
  font-weight: bold;
  letter-spacing: 2px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  opacity: 0.9;
}

.icon-sound { font-size: 16px; }

.divider {
  opacity: 0.3;
}

/* 滚动播报 */
.marquee-bar {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 20px;
  padding: 8px 16px;
  margin: 0 16px 16px;
  overflow: hidden;
}

.marquee-content {
  display: flex;
  white-space: nowrap;
  animation: marquee 20s linear infinite;
  color: #fff;
  font-size: 12px;
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

/* 横幅 */
.banner-scroll {
  background: #ff4d4f;
  border: 4px solid #fadb14;
  border-radius: 50px;
  padding: 10px 32px;
  margin: 0 auto 16px;
  width: fit-content;
  position: relative;
  box-shadow: 0 4px 0 #cf1322;
}

.scroll-ornament {
  position: absolute;
  width: 16px;
  height: 100%;
  background: #fadb14;
  border-radius: 50%;
  top: 0;
}

.scroll-ornament.left { left: -8px; }
.scroll-ornament.right { right: -8px; }

.banner-text {
  color: #fff;
  font-size: 18px;
  font-weight: 900;
  font-style: italic;
  letter-spacing: 3px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
}

/* 账户卡片 */
.account-card {
  background: linear-gradient(180deg, #FFF9E6 0%, #FFF5D6 100%);
  border-radius: 16px;
  padding: 24px 20px;
  margin: 0 16px 20px;
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-top: 4px solid #FFE4A0;
}

.account-tag {
  position: absolute;
  right: 0;
  top: 32px;
  background: #fadb14;
  color: #b8860b;
  font-size: 10px;
  font-weight: bold;
  padding: 4px 6px;
  border-radius: 4px 0 0 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.4;
  box-shadow: -2px 2px 4px rgba(0, 0, 0, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  background: #ddd;
}

.user-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.total-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  color: #E02E24;
  font-weight: bold;
}

.total-amount .currency {
  font-size: 24px;
  margin-right: 4px;
}

.total-amount .amount-number {
  font-size: 56px;
  letter-spacing: -2px;
}

.amount-tip {
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 16px 0;
}

.amount-tip .highlight {
  color: #E02E24;
  font-size: 18px;
  padding: 0 4px;
}

.amount-details {
  display: flex;
  border-top: 1px solid rgba(255, 215, 0, 0.3);
  padding-top: 16px;
  margin-top: 16px;
}

.amount-item {
  flex: 1;
  text-align: center;
}

.amount-divider {
  width: 1px;
  background: rgba(255, 215, 0, 0.3);
}

.amount-item .label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.amount-item .value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.amount-item .value.pending {
  color: #E02E24;
}

.amount-item .unit {
  font-size: 12px;
  margin-left: 2px;
}

/* 抽奖区域 */
.spin-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px;
}

.blessing-bar {
  background: rgba(255, 165, 0, 0.2);
  border: 1px solid rgba(255, 165, 0, 0.4);
  border-radius: 20px;
  padding: 6px 20px;
  margin-bottom: 12px;
}

.blessing-bar span {
  color: #FFA500;
  font-size: 13px;
  font-style: italic;
}

.spin-count-bar {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 8px 20px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.spin-count-bar span {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.spin-count-bar .count {
  color: #E02E24;
  font-size: 18px;
  margin: 0 4px;
}

.spin-count-bar .expire-tip {
  color: #999;
  font-size: 12px;
  font-weight: normal;
}

.wheel-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.new-user-tip {
  background: rgba(0, 0, 0, 0.75);
  border-radius: 12px;
  padding: 12px 20px;
  margin-top: 16px;
  text-align: center;
  max-width: 85%;
}

.new-user-tip .main {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

.new-user-tip .highlight {
  color: #fadb14;
}

.new-user-tip .sub {
  color: rgba(255, 255, 255, 0.6);
  font-size: 10px;
  margin-top: 4px;
}

/* 底部操作区 */
.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  padding: 16px 20px 24px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

.main-btn {
  width: 100%;
  background: linear-gradient(90deg, #FF8C00 0%, #FF4500 100%);
  border: none;
  border-radius: 50px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(255, 69, 0, 0.3);
}

.main-btn span {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}

.main-btn .check-icon {
  background: #4CAF50;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 48px;
  margin-top: 16px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.action-icon {
  width: 40px;
  height: 40px;
  background: #f5f5f5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.action-item span {
  font-size: 12px;
  color: #999;
}

.home-indicator {
  width: 128px;
  height: 5px;
  background: #ddd;
  border-radius: 3px;
  margin: 16px auto 0;
}

/* 弹窗通用样式 */
.popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

/* 抽奖结果弹窗 */
.result-popup {
  background: linear-gradient(180deg, #FFF9E6 0%, #fff 50%);
  border-radius: 20px;
  padding: 32px 24px;
  text-align: center;
  width: 100%;
  max-width: 320px;
}

.result-header {
  margin-bottom: 16px;
}

.result-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.result-header h2 {
  font-size: 20px;
  color: #333;
}

.result-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  color: #E02E24;
  margin: 16px 0;
}

.result-amount .currency {
  font-size: 24px;
}

.result-amount .number {
  font-size: 48px;
  font-weight: bold;
}

.result-tip {
  color: #999;
  font-size: 14px;
  margin-bottom: 24px;
}

.result-btn {
  width: 100%;
  background: linear-gradient(90deg, #FF8C00 0%, #FF4500 100%);
  border: none;
  border-radius: 50px;
  padding: 14px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

/* 分享弹窗 */
.share-popup, .rules-popup {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 340px;
}

.share-header, .rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.share-header h2, .rules-header h2 {
  font-size: 18px;
  color: #333;
}

.close-btn {
  font-size: 24px;
  color: #999;
  cursor: pointer;
}

.share-tip {
  color: #666;
  font-size: 14px;
  margin-bottom: 16px;
}

.share-url-box {
  margin-bottom: 16px;
}

.share-url-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 12px;
  color: #666;
}

.share-btn {
  width: 100%;
  background: linear-gradient(90deg, #FF8C00 0%, #FF4500 100%);
  border: none;
  border-radius: 50px;
  padding: 14px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin-bottom: 12px;
}

.share-btn.secondary {
  background: #fff;
  border: 2px solid #FF4500;
  color: #FF4500;
}

.share-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 规则弹窗 */
.rules-content p {
  font-size: 14px;
  color: #666;
  line-height: 2;
}
</style>
