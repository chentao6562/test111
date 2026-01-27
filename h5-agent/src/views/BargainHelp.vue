<script setup lang="ts">
/**
 * 帮砍页面 - 拼多多风格重构
 * @since 2026-01-22
 * @updated 2026-01-23 UI重构为拼多多风格
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { getOptimizedImageUrl } from '../api'
import {
  getBargainDetail,
  sendHelpCutCode,
  doHelpCut,
  BargainStatus,
  formatCountdown,
  type BargainDetail
} from '../api/bargain'

const router = useRouter()
const route = useRoute()

// 砍价码
const bargainCode = computed(() => route.params.code as string)

// 数据
const loading = ref(true)
const detail = ref<BargainDetail | null>(null)
const helpForm = ref({
  phone: '',
  name: '',
  code: ''
})
const sending = ref(false)
const cutting = ref(false)
const countdown = ref(0)
const countdownTimer = ref<number | null>(null)

// 帮砍成功状态
const helpSuccess = ref(false)
const helpResult = ref<{
  cutAmount: number
  isNewUser: boolean
  message: string
  helperBargainCode?: string  // 帮砍者自己的砍价码
} | null>(null)

// 【2026-01-24】助力仪式感动画状态
const showSpinAnimation = ref(false)
const spinPhase = ref<'spinning' | 'slowing' | 'result'>('spinning')

// 二维码相关
const showQrCode = ref(false)
const copySuccess = ref(false)
const qrCodeUrl = computed(() => {
  if (!bargainCode.value) return ''
  const shareUrl = `${window.location.origin}/bargain/${bargainCode.value}/help`
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`
})

// 复制分享链接
// 【2026-01-24修复】添加HTTP环境兼容的复制方法
const copyShareLink = async () => {
  const shareUrl = `${window.location.origin}/bargain/${bargainCode.value}/help`

  // 尝试使用现代Clipboard API（需要HTTPS）
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(shareUrl)
      copySuccess.value = true
      setTimeout(() => {
        copySuccess.value = false
      }, 2000)
      return
    } catch {
      // 继续尝试fallback方案
    }
  }

  // Fallback方案：使用textarea + execCommand（兼容HTTP）
  const textArea = document.createElement('textarea')
  textArea.value = shareUrl
  textArea.style.position = 'fixed'
  textArea.style.left = '-9999px'
  textArea.style.top = '0'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  try {
    const successful = document.execCommand('copy')
    if (successful) {
      copySuccess.value = true
      setTimeout(() => {
        copySuccess.value = false
      }, 2000)
    } else {
      Toast({ message: `链接: ${shareUrl}`, theme: 'warning' })
    }
  } catch {
    Toast({ message: `链接: ${shareUrl}`, theme: 'warning' })
  } finally {
    document.body.removeChild(textArea)
  }
}

// 砍价倒计时
const remainingTime = ref('')
const bargainCountdownTimer = ref<number | null>(null)

// 是否已帮砍过
const hasHelped = computed(() => {
  if (!detail.value || !helpForm.value.phone) return false
  const maskedPhone = helpForm.value.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  return detail.value.cuts.some(cut => cut.helperPhone === maskedPhone)
})

// 加载砍价详情
const loadDetail = async () => {
  if (!bargainCode.value) {
    Toast({ message: '活动码无效', theme: 'error' })
    router.back()
    return
  }

  loading.value = true
  try {
    const data = await getBargainDetail(bargainCode.value)
    if (data) {
      detail.value = data
      startBargainCountdown()
    } else {
      Toast({ message: '活动不存在', theme: 'error' })
      router.back()
    }
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
  } finally {
    loading.value = false
  }
}

// 开始砍价倒计时
const startBargainCountdown = () => {
  if (bargainCountdownTimer.value) {
    clearInterval(bargainCountdownTimer.value)
  }

  const updateCountdown = () => {
    if (!detail.value || detail.value.status !== BargainStatus.BARGAINING) {
      remainingTime.value = ''
      return
    }

    remainingTime.value = formatCountdown(detail.value.expireAt)

    if (remainingTime.value === '已过期') {
      loadDetail()
    }
  }

  updateCountdown()
  bargainCountdownTimer.value = window.setInterval(updateCountdown, 1000)
}

// 发送验证码
const onSendCode = async () => {
  if (!helpForm.value.phone || !/^1\d{10}$/.test(helpForm.value.phone)) {
    Toast({ message: '请输入正确的手机号', theme: 'warning' })
    return
  }

  if (sending.value || countdown.value > 0) return

  sending.value = true
  try {
    await sendHelpCutCode(helpForm.value.phone)
    Toast({ message: '验证码已发送', theme: 'success' })
    startCountdown()
  } catch (error: any) {
    Toast({ message: error.message || '发送失败', theme: 'error' })
  } finally {
    sending.value = false
  }
}

// 开始验证码倒计时
const startCountdown = () => {
  countdown.value = 60
  countdownTimer.value = window.setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (countdownTimer.value) {
        clearInterval(countdownTimer.value)
        countdownTimer.value = null
      }
    }
  }, 1000)
}

// 帮砍（带仪式感动画）
const onHelpCut = async () => {
  if (!detail.value || cutting.value) return

  // 表单验证
  if (!helpForm.value.phone || !/^1\d{10}$/.test(helpForm.value.phone)) {
    Toast({ message: '请输入正确的手机号', theme: 'warning' })
    return
  }
  if (!helpForm.value.code || helpForm.value.code.length !== 6) {
    Toast({ message: '请输入6位验证码', theme: 'warning' })
    return
  }

  cutting.value = true
  // 显示转盘动画
  showSpinAnimation.value = true
  spinPhase.value = 'spinning'

  try {
    const result = await doHelpCut({
      bargainCode: bargainCode.value,
      helperPhone: helpForm.value.phone,
      helperName: helpForm.value.name || undefined,
      verifyCode: helpForm.value.code
    })

    if (result.success) {
      // 等待动画效果（模拟转盘减速）
      spinPhase.value = 'slowing'
      await new Promise(resolve => setTimeout(resolve, 1500))
      spinPhase.value = 'result'
      await new Promise(resolve => setTimeout(resolve, 500))

      // 关闭动画，显示结果
      showSpinAnimation.value = false
      helpSuccess.value = true
      helpResult.value = {
        cutAmount: result.cutAmount || 0,
        isNewUser: result.isNewUser || false,
        message: result.message || '',
        helperBargainCode: result.helperBargainCode
      }
    } else {
      showSpinAnimation.value = false
      Toast({ message: result.message || '助力失败', theme: 'error' })
    }
  } catch (error: any) {
    showSpinAnimation.value = false
    Toast({ message: error.message || '助力失败', theme: 'error' })
  } finally {
    cutting.value = false
  }
}

// 我也要砍价
const goStartBargain = () => {
  router.push('/bargain-products')
}

// 去我的砍价（获得砍价机会后）
const goMyBargain = () => {
  if (helpResult.value?.helperBargainCode) {
    router.push(`/bargain/${helpResult.value.helperBargainCode}`)
  } else {
    router.push('/bargain-products')
  }
}

// 返回首页
const goHome = () => {
  router.push('/')
}

// 格式化日期显示
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekDay = weekDays[date.getDay()]
  return `${month}月${day}日 ${weekDay}`
}

onMounted(() => {
  loadDetail()
})

onUnmounted(() => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
  }
  if (bargainCountdownTimer.value) {
    clearInterval(bargainCountdownTimer.value)
  }
})
</script>

<template>
  <div class="help-page">
    <!-- 背景装饰 -->
    <div class="bg-decorations">
      <span class="coin coin-1">🪙</span>
      <span class="coin coin-2">💰</span>
      <span class="star star-1">⭐</span>
      <span class="star star-2">✨</span>
    </div>

    <!-- 【2026-01-24】助力仪式感动画 -->
    <div class="spin-overlay" v-if="showSpinAnimation">
      <div class="spin-container">
        <!-- 转盘圆环 -->
        <div class="spin-wheel" :class="spinPhase">
          <div class="wheel-inner">
            <div class="wheel-segment" v-for="i in 8" :key="i" :style="{ transform: `rotate(${i * 45}deg)` }">
              <span class="segment-icon">{{ ['💰', '🎁', '🔥', '⭐', '💎', '🎉', '❤️', '✨'][i-1] }}</span>
            </div>
          </div>
          <div class="wheel-pointer">
            <span>▼</span>
          </div>
        </div>
        <!-- 提示文字 -->
        <p class="spin-text" v-if="spinPhase === 'spinning'">正在计算助力金额...</p>
        <p class="spin-text" v-else-if="spinPhase === 'slowing'">即将揭晓...</p>
        <p class="spin-text result-text" v-else>🎉 助力成功！</p>
      </div>
    </div>

    <!-- 帮砍成功弹窗 -->
    <div class="success-modal" v-if="helpSuccess">
      <div class="success-card">
        <!-- 红包头部 -->
        <div class="success-header">
          <div class="header-decorations">
            <span class="deco deco-1">⭐</span>
            <span class="deco deco-2">❤️</span>
            <span class="deco deco-3">○</span>
          </div>

          <!-- 成功图标 -->
          <div class="success-icon">
            <span>🎉</span>
          </div>

          <h2 class="success-title">{{ helpResult?.isNewUser ? '暴击助力成功！' : '助力成功！' }}</h2>
          <p class="success-subtitle">你帮好友助力了</p>

          <!-- 砍掉金额 -->
          <div class="cut-amount">
            <span class="currency">¥</span>
            <span class="amount-value">{{ helpResult?.cutAmount?.toFixed(2) || '0.00' }}</span>
          </div>

          <p class="new-user-badge" v-if="helpResult?.isNewUser">
            <span class="badge-icon">⚡</span>
            新用户超级暴击
          </p>
        </div>

        <!-- 福利区域 -->
        <div class="benefit-section">
          <!-- 如果获得了自己的砍价机会 -->
          <div class="benefit-card highlight-card" v-if="helpResult?.helperBargainCode">
            <div class="benefit-badge">🎁 恭喜获得免费领机会</div>
            <div class="benefit-content">
              <p class="benefit-title">
                你已获得<span class="highlight">0元拿</span>机会！
              </p>
              <p class="benefit-sub">
                <span>🔥</span>
                快邀请好友帮你助力吧
              </p>
            </div>
          </div>
          <div class="benefit-card" v-else>
            <div class="benefit-badge">限时福利</div>
            <div class="benefit-content">
              <p class="benefit-title">
                你也可以<span class="highlight">0元</span>拿好货！
              </p>
              <p class="benefit-sub">
                <span>👥</span>
                今日已有超过 100+ 人成功参与
              </p>
            </div>
          </div>

          <!-- 参与按钮 -->
          <button class="join-btn" @click="helpResult?.helperBargainCode ? goMyBargain() : goStartBargain()">
            <span>{{ helpResult?.helperBargainCode ? '去我的活动' : '我也要0元拿' }}</span>
            <span class="arrow">→</span>
          </button>

          <!-- 分享二维码 -->
          <div class="qr-section">
            <p class="qr-tip">继续邀请好友助力</p>
            <div class="qr-code-box" @click="showQrCode = true">
              <img :src="qrCodeUrl" alt="分享二维码" class="qr-image" />
            </div>
            <p class="qr-hint">点击放大二维码</p>
          </div>

          <!-- 返回首页 -->
          <button class="back-btn" @click="goHome">
            返回首页
          </button>
        </div>
      </div>
    </div>

    <!-- 帮砍表单页面 -->
    <div class="modal-container" v-else>
      <!-- 红包头部 - 2026-01-24 优化：左右布局 + 倒计时置顶 -->
      <div class="envelope-header">
        <div class="header-decorations">
          <span class="deco deco-1">⭐</span>
          <span class="deco deco-2">❤️</span>
          <span class="deco deco-3">○</span>
        </div>

        <!-- 倒计时（置顶） -->
        <div class="countdown-tip-top" v-if="remainingTime">
          <span class="time-icon">⏰</span>
          <span>剩余 {{ remainingTime }}</span>
        </div>

        <!-- 左右布局容器 -->
        <div class="header-row" v-if="detail">
          <!-- 左侧：用户信息 -->
          <div class="header-left">
            <div class="user-avatar-lg">
              {{ detail.initiatorName?.charAt(0) || '用' }}
            </div>
            <div class="user-info">
              <p class="user-name">{{ detail.initiatorName || detail.initiatorPhone }}</p>
              <p class="user-tip-small">获得了0元拿的机会</p>
            </div>
          </div>
          <!-- 右侧：商品信息 + 提货日期 -->
          <div class="header-right">
            <img :src="getOptimizedImageUrl(detail.productImage, 'medium')" class="product-img-sm" />
            <div class="product-info-sm">
              <p class="product-name-sm">{{ detail.productName }}</p>
              <div class="price-row-sm">
                <span class="current-price-sm">¥{{ detail.currentPrice.toFixed(2) }}</span>
                <span class="original-price-sm">¥{{ detail.originalPrice.toFixed(2) }}</span>
              </div>
              <!-- 显示发起人选择的提货日期 -->
              <div class="pickup-date-row" v-if="detail.pickupDate">
                <span class="pickup-icon">📅</span>
                <span class="pickup-date">{{ formatDate(detail.pickupDate) }}提货</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 进度条 - 紧凑版 -->
        <div class="progress-section-compact" v-if="detail">
          <!-- 简化进度条 -->
          <div class="progress-bar-simple">
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: `${detail.progressPercent}%` }"></div>
            </div>
            <div class="progress-labels">
              <span class="label-left">已助力 <strong>{{ detail.progressPercent.toFixed(0) }}%</strong></span>
              <span class="label-right">还差 <strong>¥{{ detail.remainingCut.toFixed(2) }}</strong></span>
            </div>
          </div>
          <!-- 人数统计 -->
          <div class="helper-stats-inline">
            <span>👥 {{ detail.cutCount }}人已助力</span>
          </div>
        </div>
      </div>

      <!-- 加载中 -->
      <div class="loading-wrap" v-if="loading">
        <t-loading theme="circular" size="48px" />
      </div>

      <!-- 非砍价中状态 -->
      <div class="not-bargaining" v-else-if="detail && detail.status !== BargainStatus.BARGAINING">
        <div class="status-info">
          <span class="status-icon">ℹ️</span>
          <p class="status-text" v-if="detail.status === BargainStatus.SUCCESS">
            活动已成功，等待下单
          </p>
          <p class="status-text" v-else-if="detail.status === BargainStatus.ORDERED">
            活动已完成下单
          </p>
          <p class="status-text" v-else-if="detail.status === BargainStatus.EXPIRED">
            活动已过期
          </p>
          <p class="status-text" v-else-if="detail.status === BargainStatus.CANCELLED">
            活动已取消
          </p>
        </div>
        <button class="join-btn" @click="goStartBargain">
          <span>我也要参与</span>
        </button>
      </div>

      <!-- 帮砍表单 -->
      <div class="form-section" v-else-if="detail">
        <div class="form-card">
          <h3 class="form-title">输入手机号帮好友助力</h3>

          <!-- 已助力提示 -->
          <div class="helped-tip" v-if="hasHelped">
            <span class="helped-icon">✅</span>
            <p>你已经助力过了</p>
            <button class="mini-btn" @click="goStartBargain">
              我也要参与
            </button>
          </div>

          <!-- 表单 -->
          <div class="help-form" v-else>
            <div class="input-group">
              <input
                v-model="helpForm.phone"
                type="tel"
                placeholder="请输入您的手机号"
                maxlength="11"
                class="input-field"
              />
            </div>

            <div class="input-group code-group">
              <input
                v-model="helpForm.code"
                type="text"
                placeholder="请输入验证码"
                maxlength="6"
                class="input-field code-input"
              />
              <button
                class="code-btn"
                :class="{ disabled: countdown > 0 }"
                :disabled="countdown > 0 || sending"
                @click="onSendCode"
              >
                {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
              </button>
            </div>

            <div class="input-group">
              <input
                v-model="helpForm.name"
                type="text"
                placeholder="您的昵称（选填）"
                class="input-field"
              />
            </div>

            <button
              class="submit-btn"
              :class="{ loading: cutting }"
              :disabled="cutting"
              @click="onHelpCut"
            >
              <span v-if="cutting">助力中...</span>
              <span v-else>立即帮TA助力</span>
            </button>

            <p class="form-tip">
              <span class="tip-icon">💡</span>
              新用户助力金额更多哦~
            </p>
          </div>
        </div>

        <!-- 助力记录 -->
        <div class="records-card" v-if="detail.cuts.length > 0">
          <div class="records-header">
            <span class="records-title">助力记录</span>
            <span class="records-count">{{ detail.cuts.length }}人已助力</span>
          </div>
          <div class="records-list">
            <div
              class="record-item"
              v-for="cut in detail.cuts.slice(0, 5)"
              :key="cut.id"
            >
              <div class="record-left">
                <div class="record-avatar">{{ (cut.helperName || cut.helperPhone).charAt(0) }}</div>
                <span class="record-name">{{ cut.helperName || cut.helperPhone }}</span>
                <span class="new-badge" v-if="cut.isNewUser">暴击</span>
              </div>
              <span class="record-amount">-¥{{ cut.cutAmount.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- 我也要参与 - 突出引导 -->
        <div class="join-promotion">
          <div class="promo-header">
            <span class="promo-badge">限时福利</span>
            <h4 class="promo-title">🎁 助力完成也能获得机会！</h4>
          </div>
          <div class="promo-content">
            <p class="promo-desc">助力好友后，你也可以发起自己的活动</p>
            <ul class="promo-benefits">
              <li><span>✅</span> 0元拿同款商品</li>
              <li><span>✅</span> 邀请好友助力更快完成</li>
              <li><span>✅</span> 今日已有100+人成功</li>
            </ul>
          </div>
          <button class="promo-btn" @click="goStartBargain">
            <span class="btn-text">我也要免费拿</span>
            <span class="btn-icon">→</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 二维码放大弹窗 -->
    <t-popup v-model="showQrCode" placement="center">
      <div class="qr-popup">
        <div class="qr-popup-header">
          <span>扫码帮好友助力</span>
          <t-icon name="close" @click="showQrCode = false" />
        </div>
        <div class="qr-popup-body">
          <div class="qr-image-wrapper" @click="copyShareLink">
            <img :src="qrCodeUrl" alt="分享二维码" class="qr-popup-image" />
          </div>
          <p class="qr-popup-tip">长按保存图片 · 点击复制链接</p>
          <div class="copy-success-inline" v-if="copySuccess">✅ 链接已复制</div>
          <button class="copy-link-btn" @click="copyShareLink">
            {{ copySuccess ? '✅ 已复制' : '📋 复制链接' }}
          </button>
        </div>
      </div>
    </t-popup>
  </div>
</template>

<style scoped>
.help-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #ff1438 0%, #ff6b6b 40%, #f5f5f5 40%);
  padding-bottom: 40px;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.bg-decorations {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40%;
  pointer-events: none;
}

.coin, .star {
  position: absolute;
  opacity: 0.3;
  font-size: 24px;
}

.coin-1 { top: 10%; left: 10%; }
.coin-2 { top: 15%; right: 15%; }
.star-1 { top: 25%; left: 20%; font-size: 16px; }
.star-2 { top: 8%; right: 25%; font-size: 20px; }

/* 弹窗容器 */
.modal-container {
  padding: 20px 16px;
  position: relative;
  z-index: 10;
}

/* 红包头部 */
.envelope-header {
  background: linear-gradient(180deg, #ff4d4d 0%, #e02e24 100%);
  border-radius: 24px 24px 0 0;
  padding: 24px 20px 32px;
  text-align: center;
  position: relative;
  color: #fff;
}

.header-decorations {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.deco {
  position: absolute;
  opacity: 0.4;
}

.deco-1 { top: 15px; left: 30px; font-size: 16px; color: #FFD700; }
.deco-2 { top: 30px; right: 25px; font-size: 14px; }
.deco-3 { bottom: 50px; left: 15px; font-size: 12px; }

/* ========== 2026-01-24 新布局：倒计时置顶 + 左右布局 ========== */

/* 倒计时置顶 */
.countdown-tip-top {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.25);
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 12px;
  margin-bottom: 12px;
}

.countdown-tip-top .time-icon {
  font-size: 12px;
}

/* 左右布局容器 */
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px;
  margin-bottom: 12px;
}

/* 左侧：用户信息 */
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.user-avatar-lg {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: bold;
  margin: 0 0 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-tip-small {
  font-size: 11px;
  opacity: 0.85;
  margin: 0;
}

/* 右侧：商品信息 */
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 8px;
  flex-shrink: 0;
  max-width: 55%;
}

.product-img-sm {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.product-info-sm {
  flex: 1;
  min-width: 0;
}

.product-name-sm {
  font-size: 12px;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.price-row-sm {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.current-price-sm {
  font-size: 14px;
  font-weight: bold;
  color: #FFD700;
}

.original-price-sm {
  font-size: 10px;
  opacity: 0.6;
  text-decoration: line-through;
}

/* 提货日期显示 */
.pickup-date-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
}

.pickup-date-row .pickup-icon {
  font-size: 10px;
}

.pickup-date-row .pickup-date {
  font-size: 10px;
  color: #FFD700;
  font-weight: 500;
}

/* 紧凑版进度条 */
.progress-section-compact {
  padding: 0 4px;
}

.progress-bar-simple {
  margin-bottom: 8px;
}

.bar-track {
  height: 10px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 5px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF9800, #FF5722);
  border-radius: 5px;
  transition: width 0.5s ease-out;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 12px;
}

.label-left strong {
  color: #FFD700;
}

.label-right strong {
  color: #FFD700;
}

.helper-stats-inline {
  font-size: 11px;
  opacity: 0.8;
  text-align: center;
}

/* ========== 保留旧样式以兼容其他页面 ========== */

.user-section {
  margin-bottom: 16px;
}

.user-avatar {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  backdrop-filter: blur(4px);
}

.user-tip {
  font-size: 13px;
  opacity: 0.9;
}

.header-title {
  font-size: 26px;
  font-weight: 900;
  margin-bottom: 16px;
}

.product-preview {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  gap: 12px;
  text-align: left;
  margin-bottom: 16px;
}

.preview-image {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
}

/* 大尺寸商品预览 */
.product-preview.large {
  padding: 16px;
}

.product-preview.large .preview-image {
  width: 80px;
  height: 80px;
  border-radius: 12px;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}

.current-price {
  font-size: 18px;
  font-weight: bold;
  color: #FFD700;
}

.original-price {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: line-through;
}

.preview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.preview-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-progress {
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.progress-text {
  color: #FFD700;
  font-weight: bold;
}

.remaining-text {
  opacity: 0.85;
}

/* 进度区域 - 优化版 */
.progress-section {
  padding: 0 16px 16px;
}

.price-comparison {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}

.price-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
}

.price-item.current .price-value {
  color: #FFD700;
  font-size: 18px;
  font-weight: bold;
}

.price-item.target {
  position: relative;
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.5);
}

.price-item.target .price-value {
  color: #4CAF50;
  font-size: 20px;
  font-weight: bold;
}

.free-tag {
  position: absolute;
  top: -8px;
  right: -8px;
  background: linear-gradient(135deg, #FF6B6B, #FF3D3D);
  color: #fff;
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: bold;
  animation: pulse 1.5s infinite;
}

.price-label {
  font-size: 10px;
  opacity: 0.7;
  margin-bottom: 2px;
}

.price-arrow {
  font-size: 20px;
  opacity: 0.6;
}

.arrow-icon {
  animation: arrowBounce 1s infinite;
}

@keyframes arrowBounce {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(4px); }
}

/* 视觉冲击进度条 */
.impact-progress {
  margin-bottom: 12px;
}

.progress-track {
  position: relative;
  height: 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  overflow: visible;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.progress-fill.animated {
  height: 100%;
  background: linear-gradient(90deg, #FF9800, #FF5722, #E91E63);
  border-radius: 8px;
  position: relative;
  transition: width 0.5s ease-out;
  box-shadow: 0 0 10px rgba(255, 152, 0, 0.5);
}

.progress-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-milestone {
  position: absolute;
  top: -24px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.milestone-dot {
  width: 12px;
  height: 12px;
  background: #FFD700;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.8);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.milestone-text {
  font-size: 12px;
  font-weight: bold;
  color: #FFD700;
  margin-top: 2px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.progress-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
  padding: 8px 12px;
  background: rgba(255, 107, 107, 0.2);
  border-radius: 20px;
  border: 1px solid rgba(255, 107, 107, 0.4);
}

.hint-icon {
  font-size: 16px;
  margin-right: 4px;
  animation: fire 0.5s infinite alternate;
}

@keyframes fire {
  0% { transform: scale(1); }
  100% { transform: scale(1.1); }
}

.hint-text {
  font-size: 13px;
  color: #fff;
}

.hint-text strong {
  color: #FFD700;
  font-size: 15px;
}

.helper-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  opacity: 0.8;
  margin-top: 8px;
}

.stat-icon {
  margin-right: 4px;
}

.stat-text strong {
  color: #FFD700;
}

.countdown-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.2);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  margin-top: 16px;
}

/* 加载中 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  background: #fff;
  border-radius: 0 0 24px 24px;
}

/* 非砍价中状态 */
.not-bargaining {
  background: #fff;
  border-radius: 0 0 24px 24px;
  padding: 40px 20px;
  text-align: center;
}

.status-info {
  margin-bottom: 24px;
}

.status-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.status-text {
  font-size: 16px;
  color: #666;
}

/* 表单区域 */
.form-section {
  margin-top: -20px;
}

.form-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.form-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

/* 已帮砍提示 */
.helped-tip {
  text-align: center;
  padding: 24px 0;
}

.helped-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.helped-tip p {
  font-size: 16px;
  color: #333;
  margin-bottom: 16px;
}

.mini-btn {
  background: linear-gradient(135deg, #ff1438 0%, #ff6b6b 100%);
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
}

/* 表单 */
.help-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.input-group {
  position: relative;
}

.input-field {
  width: 100%;
  height: 48px;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 0 16px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.input-field:focus {
  border-color: #ff1438;
}

.code-group {
  display: flex;
  gap: 10px;
}

.code-input {
  flex: 1;
}

.code-btn {
  flex-shrink: 0;
  padding: 0 16px;
  height: 48px;
  background: #fff;
  border: 1px solid #ff1438;
  border-radius: 8px;
  color: #ff1438;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.code-btn.disabled {
  border-color: #ccc;
  color: #999;
  cursor: not-allowed;
}

.submit-btn {
  width: 100%;
  height: 50px;
  background: linear-gradient(180deg, #ff5f5f 0%, #e02e24 100%);
  border: none;
  border-radius: 25px;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 6px;
  box-shadow: 0 4px 15px rgba(224, 46, 36, 0.4);
}

.submit-btn.loading {
  opacity: 0.7;
  cursor: not-allowed;
}

.form-tip {
  text-align: center;
  font-size: 13px;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

/* 帮砍记录 */
.records-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin-top: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.records-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.records-count {
  font-size: 12px;
  color: #999;
}

.records-list {
  max-height: 200px;
  overflow-y: auto;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.record-item:last-child {
  border-bottom: none;
}

.record-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.record-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #ff1438, #ff6b6b);
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.record-name {
  color: #333;
  font-size: 14px;
}

.new-badge {
  background: #ff1438;
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
}

.record-amount {
  color: #ff1438;
  font-weight: bold;
  font-size: 14px;
}

/* 发起砍价横幅 */
/* 参与推广区域 - 突出引导 */
.join-promotion {
  background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
  border-radius: 16px;
  padding: 16px;
  margin-top: 16px;
  border: 2px solid #FFB74D;
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.2);
}

.promo-header {
  text-align: center;
  margin-bottom: 12px;
}

.promo-badge {
  display: inline-block;
  background: linear-gradient(135deg, #FF6B6B, #FF3D3D);
  color: #fff;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: bold;
  margin-bottom: 6px;
}

.promo-title {
  font-size: 16px;
  font-weight: bold;
  color: #E65100;
  margin: 0;
}

.promo-content {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.promo-desc {
  font-size: 12px;
  color: #666;
  margin: 0 0 8px 0;
  text-align: center;
}

.promo-benefits {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.promo-benefits li {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #333;
}

.promo-benefits li span {
  margin-right: 6px;
  color: #4CAF50;
}

.promo-btn {
  width: 100%;
  background: linear-gradient(135deg, #FF5722, #FF9800);
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 12px 20px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(255, 87, 34, 0.4);
  transition: all 0.3s ease;
}

.promo-btn:active {
  transform: scale(0.98);
}

.btn-icon {
  font-size: 18px;
  animation: arrowBounce 1s infinite;
}

/* 旧的banner样式保留兼容 */
.create-banner {
  background: linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%);
  border-radius: 16px;
  padding: 16px 20px;
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.banner-icon {
  font-size: 20px;
}

.banner-text {
  font-size: 15px;
  font-weight: bold;
  color: #8c6d00;
}

.banner-arrow {
  font-size: 24px;
  color: #8c6d00;
}

/* 成功弹窗 */
.success-modal {
  padding: 60px 20px 20px;
  position: relative;
  z-index: 10;
}

.success-card {
  background: #fff;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.success-header {
  background: linear-gradient(180deg, #ff4d4d 0%, #e02e24 100%);
  padding: 40px 20px;
  text-align: center;
  position: relative;
  color: #fff;
}

.success-icon {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  backdrop-filter: blur(4px);
}

.success-title {
  font-size: 28px;
  font-weight: 900;
  margin-bottom: 8px;
}

.success-subtitle {
  font-size: 15px;
  opacity: 0.95;
  margin-bottom: 8px;
}

.cut-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
}

.cut-amount .currency {
  font-size: 24px;
  font-weight: bold;
}

.cut-amount .amount-value {
  font-size: 56px;
  font-weight: 900;
  line-height: 1;
}

.new-user-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 215, 0, 0.3);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: bold;
  margin-top: 12px;
}

.badge-icon {
  font-size: 16px;
}

/* 福利区域 */
.benefit-section {
  padding: 24px 20px;
}

.benefit-card {
  background: #FFF8F8;
  border: 1px solid rgba(224, 46, 36, 0.1);
  border-radius: 16px;
  padding: 20px 16px 16px;
  position: relative;
  text-align: center;
  margin-bottom: 20px;
}

.benefit-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #ff1438;
  color: #fff;
  font-size: 11px;
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 20px;
  white-space: nowrap;
}

.benefit-title {
  font-size: 17px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.benefit-title .highlight {
  color: #ff1438;
}

.benefit-sub {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.join-btn {
  width: 100%;
  height: 56px;
  background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
  border: none;
  border-radius: 28px;
  color: #6B3A00;
  font-size: 20px;
  font-weight: 900;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.5);
  margin-bottom: 12px;
}

.join-btn:active {
  transform: scale(0.98);
}

.arrow {
  font-size: 24px;
}

.back-btn {
  width: 100%;
  background: none;
  border: none;
  color: #999;
  font-size: 14px;
  cursor: pointer;
  padding: 8px;
}

/* 高亮福利卡片 */
.benefit-card.highlight-card {
  background: linear-gradient(135deg, #FFF8F0 0%, #FFEFDC 100%);
  border: 2px solid #FFD700;
}

.benefit-card.highlight-card .benefit-badge {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #6B3A00;
}

/* 二维码区域 */
.qr-section {
  margin-top: 20px;
  text-align: center;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 12px;
}

.qr-tip {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.qr-code-box {
  display: inline-block;
  padding: 8px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
}

.qr-image {
  width: 120px;
  height: 120px;
  display: block;
}

.qr-hint {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

/* 二维码弹窗 */
.qr-popup {
  background: #fff;
  border-radius: 16px;
  width: 280px;
  overflow: hidden;
}

.qr-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #ff1438 0%, #ff6b6b 100%);
  color: #fff;
  font-size: 16px;
  font-weight: bold;
}

.qr-popup-body {
  padding: 24px;
  text-align: center;
}

.qr-popup-image {
  width: 200px;
  height: 200px;
  display: block;
  margin: 0 auto;
}

.qr-popup-tip {
  font-size: 13px;
  color: #666;
  margin-top: 16px;
}

.qr-image-wrapper {
  cursor: pointer;
  display: inline-block;
  padding: 8px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qr-image-wrapper:active {
  transform: scale(0.98);
}

.copy-success-inline {
  color: #52C41A;
  font-size: 14px;
  font-weight: 500;
  margin-top: 12px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.copy-link-btn {
  margin-top: 16px;
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, #ff1438 0%, #ff6b6b 100%);
  border: none;
  border-radius: 22px;
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
}

.copy-link-btn:active {
  opacity: 0.9;
}

/* ========== 2026-01-24 助力仪式感转盘动画 ========== */
.spin-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.spin-container {
  text-align: center;
}

.spin-wheel {
  width: 200px;
  height: 200px;
  position: relative;
  margin: 0 auto 24px;
}

.wheel-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  position: relative;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
}

/* 转盘分段 */
.wheel-segment {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  padding-top: 20px;
}

.segment-icon {
  font-size: 24px;
}

/* 指针 */
.wheel-pointer {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 30px;
  color: #ff1438;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

/* 转动动画 */
.spin-wheel.spinning .wheel-inner {
  animation: spin 0.5s linear infinite;
}

.spin-wheel.slowing .wheel-inner {
  animation: spinSlow 1.5s cubic-bezier(0.17, 0.67, 0.12, 0.99) forwards;
}

.spin-wheel.result .wheel-inner {
  animation: none;
  transform: rotate(720deg);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes spinSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(720deg); }
}

/* 提示文字 */
.spin-text {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  margin: 0;
}

.spin-text.result-text {
  color: #FFD700;
  font-size: 24px;
  animation: bounceIn 0.5s ease;
}

@keyframes bounceIn {
  0% { transform: scale(0.5); opacity: 0; }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
</style>
