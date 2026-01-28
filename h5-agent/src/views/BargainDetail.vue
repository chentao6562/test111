<script setup lang="ts">
/**
 * 砍价详情页面 - 拼多多风格重构
 * @since 2026-01-22
 * @updated 2026-01-23 UI重构为拼多多风格
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import { getOptimizedImageUrl } from '../api'
import {
  getBargainDetail,
  cancelBargain,
  addBargainToCart,
  BargainStatus,
  formatCountdown,
  type BargainDetail
} from '../api/bargain'
import { useUserStore } from '../stores/user'
import { matchMaskedPhone } from '../utils/phoneUtils'
import { setupWechatShare, isWechatBrowser } from '../utils/wechatShare'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 砍价码
const bargainCode = computed(() => route.params.code as string)

// 数据
const loading = ref(true)
const detail = ref<BargainDetail | null>(null)
const cancelling = ref(false)
// 【2026-01-23】加入采购单状态
const addingToCart = ref(false)

// 倒计时
const remainingTime = ref('')
const countdownTimer = ref<number | null>(null)
const countdownParts = ref({ hours: '00', minutes: '00', seconds: '00' })

// 【2026-01-24简化】分享弹窗（合并原二维码弹窗）
const showShare = ref(false)
const qrcodeUrl = computed(() => `${window.location.origin}/bargain/${bargainCode.value}/help`)
// 【2026-01-24】复制成功提示
const copySuccess = ref(false)
// 【2026-01-24】微信环境检测
const isWechat = computed(() => /MicroMessenger/i.test(navigator.userAgent))

// 【2026-01-23】规则弹窗
const showRules = ref(false)

// 是否是发起人
const isInitiator = computed(() => {
  if (!detail.value || !userStore.userInfo?.phone) return false
  return matchMaskedPhone(userStore.userInfo.phone, detail.value.initiatorPhone)
})

// 是否可以取消
const canCancel = computed(() => {
  if (!detail.value || !isInitiator.value) return false
  return detail.value.status === BargainStatus.BARGAINING || detail.value.status === BargainStatus.SUCCESS
})

// 是否可以下单
const canOrder = computed(() => {
  if (!detail.value || !isInitiator.value) return false
  return detail.value.status === BargainStatus.SUCCESS && detail.value.reachedFloor
})

// 加载砍价详情
const loadDetail = async () => {
  if (!bargainCode.value) {
    Toast({ message: '砍价码无效', theme: 'error' })
    router.back()
    return
  }

  loading.value = true
  try {
    const data = await getBargainDetail(bargainCode.value)
    if (data) {
      detail.value = data
      startCountdown()
      // 【2026-01-28】配置微信分享卡片
      configWechatShare(data)
    } else {
      Toast({ message: '砍价不存在', theme: 'error' })
      router.back()
    }
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
  } finally {
    loading.value = false
  }
}

// 【2026-01-28】配置微信分享卡片
const configWechatShare = async (data: BargainDetail) => {
  if (!isWechatBrowser()) return

  const shareTitle = `帮我助力！${data.productName}免费拿`
  const shareDesc = `${data.initiatorName || '好友'}发起了0元拿活动，快来帮TA助力吧！`
  const shareLink = `${window.location.origin}/bargain/${bargainCode.value}/help`
  const shareImg = getOptimizedImageUrl(data.productImage, 'medium')

  await setupWechatShare({
    title: shareTitle,
    desc: shareDesc,
    link: shareLink,
    imgUrl: shareImg
  })
}

// 开始倒计时
const startCountdown = () => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
  }

  const updateCountdown = () => {
    if (!detail.value || detail.value.status !== BargainStatus.BARGAINING) {
      remainingTime.value = ''
      countdownParts.value = { hours: '00', minutes: '00', seconds: '00' }
      return
    }

    const expireAt = new Date(detail.value.expireAt).getTime()
    const now = Date.now()
    const diff = expireAt - now

    if (diff <= 0) {
      remainingTime.value = '已过期'
      countdownParts.value = { hours: '00', minutes: '00', seconds: '00' }
      // 【2026-01-28修复】过期时停止定时器，只刷新一次
      if (countdownTimer.value) {
        clearInterval(countdownTimer.value)
        countdownTimer.value = null
      }
      // 刷新一次详情以获取最新状态
      loadDetail()
      return
    }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    countdownParts.value = {
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0')
    }
    remainingTime.value = formatCountdown(detail.value.expireAt)
  }

  updateCountdown()
  countdownTimer.value = window.setInterval(updateCountdown, 1000)
}

// 取消砍价
const onCancelBargain = async () => {
  if (!detail.value || cancelling.value) return

  Dialog.confirm({
    title: '取消砍价',
    content: '确定要取消这个砍价吗？取消后无法恢复。',
    confirmBtn: { content: '确定取消', theme: 'danger' },
    cancelBtn: '再想想',
    onConfirm: async () => {
      cancelling.value = true
      try {
        await cancelBargain(bargainCode.value)
        Toast({ message: '砍价已取消', theme: 'success' })
        await loadDetail()
      } catch (error: any) {
        Toast({ message: error.message || '取消失败', theme: 'error' })
      } finally {
        cancelling.value = false
      }
    }
  })
}

// 【2026-01-23】加入采购单
const onAddToCart = async () => {
  if (!detail.value || addingToCart.value) return

  addingToCart.value = true
  try {
    await addBargainToCart(bargainCode.value)
    Toast({ message: '已加入采购单', theme: 'success' })
    // 跳转到采购单页面
    router.push('/cart')
  } catch (error: any) {
    Toast({ message: error.message || '加入采购单失败', theme: 'error' })
  } finally {
    addingToCart.value = false
  }
}

// 【2026-01-24简化】分享砍价 - 直接显示分享弹窗
const shareBargain = () => {
  showShare.value = true
}

// 【2026-01-23】复制分享链接
// 【2026-01-24修复】使用内联提示避免被弹窗遮挡
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
  // 防止页面滚动
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
      // 如果execCommand也失败，显示链接让用户手动复制
      Dialog.alert({
        title: '分享链接',
        content: shareUrl,
        confirmBtn: '长按复制',
      })
    }
  } catch {
    Dialog.alert({
      title: '分享链接',
      content: shareUrl,
      confirmBtn: '长按复制',
    })
  } finally {
    document.body.removeChild(textArea)
  }
}

// 【2026-01-24简化】关闭分享弹窗
const closeSharePopup = () => {
  showShare.value = false
}

// 【2026-01-23】显示规则
const showRulesPopup = () => {
  showRules.value = true
}

// 返回
const goBack = () => {
  router.back()
}

// 【2026-01-26】跳转到商品详情
const goToProductDetail = () => {
  if (detail.value?.productId) {
    router.push(`/product/${detail.value.productId}`)
  }
}

// 格式化时间
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 格式化提货日期（友好显示）
const formatPickupDate = (dateStr: string) => {
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
})
</script>

<template>
  <div class="bargain-detail-page">
    <!-- 背景渐变 -->
    <div class="bg-gradient"></div>

    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">
        <span class="back-icon">‹</span>
      </div>
      <h2 class="nav-title">分享免费拿</h2>
      <div class="nav-right">
        <span class="rules-btn" @click="showRulesPopup">规则</span>
      </div>
    </div>

    <!-- 【2026-01-26】用户须知提示 -->
    <div class="notice-banner" v-if="!loading && detail && detail.status === BargainStatus.BARGAINING">
      <div class="notice-icon">📢</div>
      <div class="notice-text">
        <span class="notice-title">温馨提示</span>
        <span class="notice-content">砍价必须成功后才能享受优惠价格，请在活动结束前邀请足够好友助力</span>
      </div>
    </div>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="48px" />
    </div>

    <!-- 砍价详情 -->
    <main class="content" v-else-if="detail">
      <!-- 商品卡片 - 【2026-01-26】点击可跳转到商品详情 -->
      <div class="product-card clickable" @click="goToProductDetail">
        <div class="product-info">
          <div class="target-badge">
            原价 ¥{{ detail.originalPrice.toFixed(0) }} 今日幸运客户免费领
          </div>
          <h3 class="product-name">{{ detail.productName }}</h3>
          <p class="original-price" v-if="detail.floorPrice > 0">目标价: ¥{{ detail.floorPrice.toFixed(2) }}</p>
          <p class="original-price free-tag" v-else>目标价: 免费</p>
          <div class="hot-info">
            <span class="fire-icon">🔥</span>
            <span>今天已有 100+ 人免费拿到</span>
          </div>
        </div>
        <div class="product-image">
          <img :src="getOptimizedImageUrl(detail.productImage, 'medium')" alt="" />
          <div class="view-detail-badge">查看详情 ›</div>
        </div>
      </div>

      <!-- 进度卡片 -->
      <div class="progress-card">
        <!-- 装饰图标 -->
        <div class="celebration-icon">🎉</div>

        <!-- 大字进度 -->
        <h1 class="remaining-text">
          {{ detail.reachedFloor ? '恭喜成功！' : `还差${detail.remainingCut.toFixed(2)}元！` }}
        </h1>
        <p class="progress-tip">
          {{ detail.reachedFloor ? '恭喜你！可以免费领取啦' : `就快成功了！你已超过${Math.floor(detail.progressPercent)}%的用户` }}
        </p>

        <!-- 进度条 -->
        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-label">当前进度</span>
            <span class="progress-percent">{{ detail.progressPercent.toFixed(1) }}%</span>
          </div>
          <div class="progress-bar-wrapper">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${detail.progressPercent}%` }"
              >
                <div class="progress-stripes"></div>
              </div>
            </div>
          </div>
          <div class="progress-footer">
            <div class="helper-avatars">
              <div class="avatar" v-for="i in Math.min(detail.cutCount, 3)" :key="i">{{ i }}</div>
            </div>
            <span class="helper-tip" v-if="detail.cutCount > 0">{{ detail.cutCount }}位好友帮你助力！</span>
          </div>
        </div>

        <!-- 倒计时 -->
        <div class="countdown-section" v-if="detail.status === BargainStatus.BARGAINING">
          <p class="countdown-label">剩余时间</p>
          <div class="countdown-blocks">
            <div class="time-block">
              <div class="time-value">{{ countdownParts.hours }}</div>
              <div class="time-label">时</div>
            </div>
            <span class="time-sep">:</span>
            <div class="time-block">
              <div class="time-value">{{ countdownParts.minutes }}</div>
              <div class="time-label">分</div>
            </div>
            <span class="time-sep">:</span>
            <div class="time-block seconds">
              <div class="time-value">{{ countdownParts.seconds }}</div>
              <div class="time-label">秒</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 帮砍记录 -->
      <div class="cuts-card" v-if="detail.cuts.length > 0">
        <div class="cuts-header">
          <h3 class="cuts-title">
            <span class="cuts-icon">👥</span>
            助力记录 ({{ detail.cuts.length }})
          </h3>
          <span class="view-all">查看全部</span>
        </div>
        <div class="cuts-list">
          <div
            v-for="cut in detail.cuts.slice(0, 5)"
            :key="cut.id"
            class="cut-item"
          >
            <div class="cut-left">
              <div class="cut-avatar">{{ (cut.helperName || cut.helperPhone).charAt(0) }}</div>
              <div class="cut-info">
                <span class="cut-name">{{ cut.helperName || cut.helperPhone }}</span>
                <span class="cut-time">{{ formatTime(cut.createdAt) }}</span>
              </div>
            </div>
            <div class="cut-right">
              <span class="cut-amount">-¥{{ cut.cutAmount.toFixed(2) }}</span>
              <span class="cut-tag" v-if="cut.isNewUser">暴击！⚡️</span>
              <span class="cut-tag" v-else>助力成功</span>
            </div>
          </div>
        </div>
        <button class="view-more-btn" v-if="detail.cuts.length > 5">
          查看更多助力好友...
        </button>
      </div>

      <!-- 门店信息 -->
      <div class="store-card">
        <h3 class="store-title">提货门店</h3>
        <div class="store-info">
          <p class="store-name">{{ detail.storeName }}</p>
          <p class="store-address">{{ detail.storeAddress }}</p>
          <!-- 提货日期 -->
          <p class="pickup-date" v-if="detail.pickupDate">
            <span class="date-icon">📅</span>
            <span class="date-label">提货日期：</span>
            <span class="date-value">{{ formatPickupDate(detail.pickupDate) }}</span>
          </p>
        </div>
      </div>
    </main>

    <!-- 底部操作栏 -->
    <div class="action-bar" v-if="detail">
      <!-- 砍价中状态 - 【2026-01-24简化】只保留一个分享按钮 -->
      <template v-if="detail.status === BargainStatus.BARGAINING">
        <!-- 新用户双倍提示 -->
        <div class="new-user-hint">
          <span class="hint-icon">🔥</span>
          <span class="hint-text">新用户助力<span class="highlight">翻倍</span>！快邀请新朋友~</span>
        </div>
        <!-- 简化：单按钮布局 -->
        <div class="action-buttons-simple">
          <button class="main-btn share-btn-large" @click="shareBargain">
            <span class="btn-icon">📤</span>
            <span class="btn-title">分享给好友</span>
          </button>
          <button class="cancel-btn-small" v-if="canCancel" @click="onCancelBargain">
            取消
          </button>
        </div>
      </template>

      <!-- 砍价成功状态 -->
      <template v-else-if="detail.status === BargainStatus.SUCCESS && canOrder">
        <!-- 【2026-01-23】加入采购单（新流程：与其他商品一起提交） -->
        <div class="success-hint">
          <span class="hint-icon">🎉</span>
          <span class="hint-text">恭喜成功！可加入采购单与其他商品一起提交</span>
        </div>
        <div class="success-actions">
          <button class="main-btn cart-btn" :disabled="addingToCart" @click="onAddToCart">
            <span class="btn-title">{{ addingToCart ? '加入中...' : '加入采购单' }}</span>
            <span class="btn-sub">与其他商品一起结算</span>
          </button>
        </div>
      </template>

      <!-- 已下单状态 -->
      <template v-else-if="detail.status === BargainStatus.ORDERED">
        <button class="main-btn" @click="router.push('/reservations')">
          <span class="btn-title">查看预约</span>
          <span class="btn-sub">活动已完成，等待提货</span>
        </button>
      </template>
    </div>

    <!-- 【2026-01-24简化】分享弹窗 - 一键分享设计 -->
    <t-popup v-model="showShare" placement="center">
      <div class="share-popup-simple">
        <!-- 关闭按钮 -->
        <span class="close-btn-simple" @click="closeSharePopup">×</span>

        <!-- 标题 -->
        <div class="share-title-simple">
          <span class="gift-icon">🎁</span>
          <span>帮我助力，0元拿烟花</span>
        </div>

        <!-- 大二维码 -->
        <div class="qr-wrapper-large">
          <img
            :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrcodeUrl)}`"
            alt="分享二维码"
            class="qr-image-large"
          />
        </div>

        <!-- 智能提示 - 根据环境显示不同内容 -->
        <div class="share-guide-smart" v-if="isWechat">
          <p class="guide-main">👆 长按图片保存</p>
          <p class="guide-sub">然后发送给好友即可</p>
        </div>
        <div class="share-guide-smart" v-else>
          <p class="guide-main">📱 扫码或复制链接分享</p>
          <p class="guide-sub">发给微信好友帮你助力</p>
        </div>

        <!-- 复制成功提示 -->
        <div class="copy-success-inline" v-if="copySuccess">
          ✅ 链接已复制，快发给好友吧
        </div>

        <!-- 单一操作按钮 -->
        <button class="copy-btn-primary" @click="copyShareLink">
          {{ copySuccess ? '✅ 已复制链接' : '📋 复制链接发给好友' }}
        </button>
      </div>
    </t-popup>

    <!-- 【2026-01-23】活动规则弹窗 -->
    <t-popup v-model="showRules" placement="center">
      <div class="rules-popup">
        <div class="rules-header">
          <span class="rules-title">活动规则</span>
          <span class="close-btn" @click="showRules = false">×</span>
        </div>
        <div class="rules-content">
          <div class="rule-section important-notice">
            <h4>⚠️ 重要提示</h4>
            <p class="warning-text">砍价必须成功才能使用优惠价格！未完成砍价无法享受折扣，请在活动结束前邀请足够好友助力。</p>
          </div>
          <div class="rule-section">
            <h4>一、活动时间</h4>
            <p>活动期间内有效，具体以页面显示为准</p>
          </div>
          <div class="rule-section">
            <h4>二、参与规则</h4>
            <p>1. 每位用户同一时间只能参与一个活动</p>
            <p>2. 邀请好友助力，好友越多进度越快</p>
            <p>3. <strong>活动成功后</strong>需在24小时内下单</p>
            <p>4. 每个商品每人限领1件</p>
          </div>
          <div class="rule-section">
            <h4>三、提货说明</h4>
            <p class="warning-text">⚠️ 本活动商品不可代领，需本人凭预约手机号到店提货</p>
            <p>提货时请出示预约信息，由门店工作人员核验</p>
          </div>
          <div class="rule-section">
            <h4>四、其他说明</h4>
            <p>1. 禁止使用任何作弊手段，一经发现取消资格</p>
            <p>2. 活动最终解释权归主办方所有</p>
            <p>3. 如有疑问请联系客服：13190531439</p>
          </div>
        </div>
        <div class="rules-footer">
          <button class="confirm-btn" @click="showRules = false">我知道了</button>
        </div>
      </div>
    </t-popup>
  </div>
</template>

<style scoped>
.bargain-detail-page {
  min-height: 100vh;
  background: #f8f5f6;
  padding-bottom: 160px;
  position: relative;
}

/* 【2026-01-26】用户须知提示 */
.notice-banner {
  position: relative;
  z-index: 10;
  margin: 8px 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #FFF7E6 0%, #FFE7BA 100%);
  border: 1px solid #FFD591;
  border-radius: 12px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.notice-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.notice-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notice-title {
  font-size: 14px;
  font-weight: bold;
  color: #AD6800;
}

.notice-content {
  font-size: 13px;
  color: #AD6800;
  line-height: 1.5;
}

/* 背景渐变 */
.bg-gradient {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 260px;
  background: linear-gradient(180deg, #ff1438 0%, #ff6b6b 100%);
  z-index: 0;
}

/* 顶部导航 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: transparent;
}

.nav-back {
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
}

.back-icon {
  font-size: 28px;
  font-weight: 300;
}

.nav-title {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.nav-right {
  display: flex;
  align-items: center;
}

.rules-btn {
  background: rgba(0, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 20px;
  backdrop-filter: blur(8px);
}

/* 加载中 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px;
  position: relative;
  z-index: 10;
}

/* 内容区 */
.content {
  position: relative;
  z-index: 10;
  padding: 16px;
}

/* 商品卡片 */
.product-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  gap: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.target-badge {
  display: inline-block;
  background: rgba(255, 20, 56, 0.1);
  color: #ff1438;
  font-size: 10px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 20px;
  width: fit-content;
}

.product-name {
  font-size: 16px;
  font-weight: bold;
  color: #181012;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.original-price {
  font-size: 12px;
  color: #999;
  font-style: italic;
}

.hot-info {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #ff1438;
  font-size: 12px;
  font-weight: bold;
}

.product-image {
  width: 112px;
  height: 112px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 【2026-01-26】商品卡片点击效果 */
.product-card.clickable {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.product-card.clickable:active {
  transform: scale(0.98);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.view-detail-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  text-align: center;
  padding: 16px 0 6px;
}

/* 进度卡片 */
.progress-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}

.celebration-icon {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 48px;
  opacity: 0.2;
  transform: rotate(12deg);
}

.remaining-text {
  font-size: 36px;
  font-weight: 800;
  color: #ff1438;
  text-align: center;
  letter-spacing: -2px;
  margin-bottom: 8px;
}

.progress-tip {
  font-size: 14px;
  color: #666;
  text-align: center;
  margin-bottom: 24px;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.progress-label {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  letter-spacing: 1px;
}

.progress-percent {
  font-size: 24px;
  font-weight: 900;
  color: #ff1438;
  line-height: 1;
}

.progress-bar-wrapper {
  position: relative;
}

.progress-bar {
  height: 24px;
  background: #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #f5f5f5;
}

.progress-fill {
  height: 100%;
  background: #ff1438;
  border-radius: 10px;
  position: relative;
  transition: width 0.5s ease;
  box-shadow: 0 0 15px rgba(255, 20, 56, 0.4);
}

.progress-stripes {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.2) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.2) 75%,
    transparent 75%,
    transparent
  );
  background-size: 20px 20px;
}

.progress-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.helper-avatars {
  display: flex;
  margin-left: 8px;
}

.helper-avatars .avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff1438, #ff6b6b);
  border: 2px solid #fff;
  margin-left: -8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
  font-weight: bold;
}

.helper-tip {
  font-size: 12px;
  font-weight: bold;
  color: #ff1438;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* 倒计时 */
.countdown-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
  text-align: center;
}

.countdown-label {
  font-size: 12px;
  font-weight: bold;
  color: #999;
  letter-spacing: 2px;
  margin-bottom: 16px;
}

.countdown-blocks {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
}

.time-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.time-value {
  width: 48px;
  height: 48px;
  background: #1a1a1a;
  border-radius: 12px;
  color: #fff;
  font-size: 20px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.time-block.seconds .time-value {
  background: #ff1438;
}

.time-label {
  font-size: 10px;
  font-weight: bold;
  color: #999;
}

.time-sep {
  font-size: 24px;
  font-weight: bold;
  color: #ccc;
  margin-top: -20px;
}

/* 帮砍记录 */
.cuts-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.cuts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.cuts-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cuts-icon {
  font-size: 18px;
}

.view-all {
  font-size: 12px;
  font-weight: bold;
  color: #ff1438;
  cursor: pointer;
}

.cuts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9f9f9;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
}

.cut-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cut-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff1438, #ff6b6b);
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: bold;
  font-size: 14px;
}

.cut-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cut-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.cut-time {
  font-size: 10px;
  color: #999;
}

.cut-right {
  text-align: right;
}

.cut-amount {
  display: block;
  font-size: 14px;
  font-weight: 900;
  color: #ff1438;
}

.cut-tag {
  font-size: 10px;
  color: #999;
}

.view-more-btn {
  width: 100%;
  padding: 12px;
  background: #f9f9f9;
  border: none;
  border-radius: 12px;
  color: #999;
  font-size: 12px;
  cursor: pointer;
  margin-top: 12px;
}

/* 门店信息 */
.store-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.store-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 12px;
}

.store-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.store-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.store-address {
  font-size: 13px;
  color: #666;
}

.pickup-date {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #eee;
}

.pickup-date .date-icon {
  font-size: 14px;
}

.pickup-date .date-label {
  font-size: 13px;
  color: #666;
}

.pickup-date .date-value {
  font-size: 14px;
  font-weight: 600;
  color: #ff1438;
}

/* 底部操作栏 */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #f0f0f0;
  box-shadow: 0 -10px 20px rgba(0, 0, 0, 0.05);
  z-index: 50;
}

/* 【2026-01-23】新用户双倍提示 */
.new-user-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #FFF7E6 0%, #FFE7BA 100%);
  border-radius: 20px;
  margin-bottom: 12px;
}

.new-user-hint .hint-icon {
  font-size: 16px;
}

.new-user-hint .hint-text {
  font-size: 13px;
  font-weight: 600;
  color: #AD6800;
}

.new-user-hint .highlight {
  color: #ff1438;
  font-weight: 700;
}

.main-btn {
  width: 100%;
  height: 64px;
  background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
  border: none;
  border-radius: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
  transition: transform 0.1s;
}

.main-btn:active {
  transform: scale(0.98);
}

.main-btn.success {
  background: linear-gradient(180deg, #ff1438 0%, #ff6b6b 100%);
  box-shadow: 0 4px 15px rgba(255, 20, 56, 0.4);
}

.main-btn.success .btn-title,
.main-btn.success .btn-sub {
  color: #fff;
}

.btn-title {
  font-size: 18px;
  font-weight: 900;
  color: #6B3A00;
  font-style: italic;
  letter-spacing: -0.5px;
}

.btn-sub {
  font-size: 10px;
  font-weight: bold;
  color: rgba(107, 58, 0, 0.8);
  letter-spacing: 1px;
}

.action-icons {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 16px;
}

.action-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  opacity: 0.6;
  cursor: pointer;
}

.action-icon span:first-child {
  width: 32px;
  height: 32px;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.icon-label {
  font-size: 10px;
  font-weight: bold;
  color: #666;
}

/* 【2026-01-24简化】底部操作按钮区域 */
.action-buttons-simple {
  display: flex;
  gap: 12px;
  align-items: center;
}

.share-btn-large {
  flex: 1;
  height: 56px;
  background: linear-gradient(135deg, #ff1438 0%, #ff6b6b 100%);
  border: none;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(255, 20, 56, 0.3);
  transition: transform 0.1s;
}

.share-btn-large:active {
  transform: scale(0.98);
}

.share-btn-large .btn-icon {
  font-size: 20px;
}

.share-btn-large .btn-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  font-style: normal;
}

.cancel-btn-small {
  width: 72px;
  height: 56px;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 28px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.cancel-btn-small:active {
  background: #eee;
}

/* 【2026-01-24简化】分享弹窗 */
.share-popup-simple {
  width: 320px;
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  text-align: center;
  position: relative;
}

.close-btn-simple {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  line-height: 1;
}

.share-title-simple {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.gift-icon {
  font-size: 24px;
}

.qr-wrapper-large {
  background: linear-gradient(135deg, #fff5f5 0%, #fff0f0 100%);
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 20px;
  border: 2px dashed #ffccd5;
}

.qr-image-large {
  width: 180px;
  height: 180px;
  display: block;
  margin: 0 auto;
  border-radius: 8px;
}

.share-guide-smart {
  margin-bottom: 20px;
}

.share-guide-smart .guide-main {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.share-guide-smart .guide-sub {
  font-size: 14px;
  color: #666;
}

.copy-success-inline {
  background: #e6f7e6;
  color: #52c41a;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 16px;
}

.copy-btn-primary {
  width: 100%;
  height: 50px;
  background: linear-gradient(135deg, #ff1438 0%, #ff6b6b 100%);
  color: #fff;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 20, 56, 0.3);
  transition: transform 0.1s;
}

.copy-btn-primary:active {
  transform: scale(0.98);
}

/* 通用关闭按钮 */
.close-btn {
  font-size: 28px;
  color: #999;
  cursor: pointer;
  line-height: 1;
}

/* 【2026-01-23】免费标签 */
.free-tag {
  color: #ff1438 !important;
  font-weight: bold;
}

/* 【2026-01-23】不可代领提示 */
.pickup-warning {
  margin-top: 16px;
  padding: 12px;
  background: #fff8e6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.pickup-warning .warning-icon {
  flex-shrink: 0;
}

.pickup-warning .warning-text {
  font-size: 13px;
  color: #d48806;
  line-height: 1.5;
}

/* 【2026-01-23】二维码弹窗 */
.qrcode-popup {
  background: #fff;
  border-radius: 16px;
  width: 300px;
  max-width: 90vw;
}

.qrcode-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.qrcode-title {
  font-size: 17px;
  font-weight: bold;
  color: #333;
}

.qrcode-content {
  padding: 24px 20px;
  text-align: center;
}

.qrcode-box {
  width: 200px;
  height: 200px;
  margin: 0 auto 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.qrcode-box img {
  width: 100%;
  height: 100%;
}

.qrcode-tip {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.qrcode-url {
  font-size: 11px;
  color: #999;
  word-break: break-all;
  padding: 0 10px;
}

.qrcode-footer {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
}

.copy-btn {
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

/* 【2026-01-23】社交感二维码弹窗 */
.qrcode-popup-social {
  background: #fff;
  border-radius: 16px;
  width: 320px;
  max-width: 90vw;
  overflow: hidden;
}

.qr-social-header {
  background: linear-gradient(135deg, #ff1438 0%, #ff6b6b 100%);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.close-btn-white {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
}

.qr-product-img {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.qr-product-info {
  flex: 1;
}

.qr-product-name {
  font-size: 14px;
  color: #fff;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qr-product-price {
  font-size: 20px;
  font-weight: bold;
  color: #FFD700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.qr-social-body {
  padding: 20px;
  text-align: center;
  background: #fff;
}

.qr-invite-text {
  font-size: 16px;
  font-weight: bold;
  color: #ff1438;
  margin-bottom: 16px;
}

.qr-code-wrapper {
  width: 180px;
  height: 180px;
  margin: 0 auto 16px;
  padding: 10px;
  background: #fff;
  cursor: pointer;
  transition: transform 0.2s;
}

.qr-code-wrapper:active {
  transform: scale(0.98);
  border: 3px solid #ff1438;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(255, 20, 56, 0.2);
}

.qr-code-wrapper .qr-image {
  width: 100%;
  height: 100%;
}

.qr-scan-tip {
  font-size: 14px;
  color: #ff1438;
  font-weight: 600;
  margin-bottom: 4px;
}

.qr-scan-sub {
  font-size: 12px;
  color: #999;
}

.qr-social-footer {
  padding: 16px 20px 20px;
  display: flex;
  gap: 12px;
}

.qr-btn-copy {
  flex: 1;
  height: 44px;
  background: linear-gradient(135deg, #ff1438 0%, #ff6b6b 100%);
  border: none;
  border-radius: 22px;
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.qr-btn-wechat {
  flex: 1;
  height: 44px;
  background: #07C160;
  border: none;
  border-radius: 22px;
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.qr-btn-wechat .wechat-icon {
  font-size: 18px;
}

/* 【2026-01-24】复制成功内联提示 */
.copy-success-tip {
  background: linear-gradient(135deg, #52C41A 0%, #389E0D 100%);
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  text-align: center;
  padding: 10px 16px;
  margin: 0 20px 12px;
  border-radius: 8px;
  animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 【2026-01-23】规则弹窗 */
.rules-popup {
  background: #fff;
  border-radius: 16px;
  width: 340px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.rules-title {
  font-size: 17px;
  font-weight: bold;
  color: #333;
}

.rules-content {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
}

.rule-section {
  margin-bottom: 20px;
}

.rule-section:last-child {
  margin-bottom: 0;
}

.rule-section h4 {
  font-size: 15px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.rule-section p {
  font-size: 13px;
  color: #666;
  line-height: 1.8;
  margin: 0;
}

.rule-section .warning-text {
  color: #d48806;
  font-weight: bold;
}

.rule-section.important-notice {
  background: #FFF1F0;
  border: 1px solid #FFCCC7;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.rule-section.important-notice h4 {
  color: #CF1322;
  margin-bottom: 8px;
}

.rule-section.important-notice .warning-text {
  color: #CF1322;
}

.rules-footer {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.confirm-btn {
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

/* 【2026-01-23】砍价成功后的操作区域 */
.success-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #F6FFED 0%, #D9F7BE 100%);
  border-radius: 20px;
  margin-bottom: 12px;
}

.success-hint .hint-icon {
  font-size: 18px;
}

.success-hint .hint-text {
  font-size: 13px;
  font-weight: 600;
  color: #389E0D;
}

.success-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.main-btn.cart-btn {
  background: linear-gradient(180deg, #52C41A 0%, #389E0D 100%);
  box-shadow: 0 4px 15px rgba(82, 196, 26, 0.4);
}

.main-btn.cart-btn .btn-title,
.main-btn.cart-btn .btn-sub {
  color: #fff;
}

.main-btn.cart-btn:disabled {
  opacity: 0.7;
}

</style>
