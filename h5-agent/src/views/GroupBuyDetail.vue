<script setup lang="ts">
/**
 * 拼团详情页面
 * @since 2026-01-21
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import {
  getGroupBuyDetail,
  getGroupBuyConfig,
  quitGroupBuy,
  GroupBuyStatus,
  GroupBuyStatusLabels,
  GroupBuyStatusColors,
  type GroupBuyDetail,
  type GroupBuyConfig
} from '../api/groupBuy'
import { useUserStore } from '../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 拼团码
const groupCode = computed(() => route.params.code as string)

// 数据
const loading = ref(true)
const config = ref<GroupBuyConfig | null>(null)
const detail = ref<GroupBuyDetail | null>(null)
const quitting = ref(false)

// 当前用户手机号
const currentUserPhone = computed(() => userStore.userInfo?.phone || '')

// 是否是当前用户参与的拼团（发起人或成员）
const isParticipant = computed(() => {
  if (!detail.value || !currentUserPhone.value) return false
  return detail.value.members.some(m =>
    m.customerPhone.replace(/\*+/g, '') === currentUserPhone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1$2') ||
    m.customerPhone === currentUserPhone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  )
})

// 是否是发起人
const isInitiator = computed(() => {
  if (!detail.value || !currentUserPhone.value) return false
  const maskedPhone = currentUserPhone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  return detail.value.initiatorPhone === maskedPhone
})

// 获取当前用户的成员信息
const currentMember = computed(() => {
  if (!detail.value || !currentUserPhone.value) return null
  const maskedPhone = currentUserPhone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  return detail.value.members.find(m => m.customerPhone === maskedPhone) || null
})

// 是否可以退出（组队中状态且是参与者且未退出）
const canQuit = computed(() => {
  if (!detail.value || detail.value.status !== GroupBuyStatus.FORMING) return false
  if (!currentMember.value) return false
  return currentMember.value.status === 'JOINED'
})

// 【2026-01-25】多档位赠品阶梯
const giftTiers = computed(() => {
  if (!detail.value?.giftTiers || detail.value.giftTiers.length === 0) return []
  return detail.value.giftTiers
})

// 是否有多档位赠品
const hasMultiTiers = computed(() => giftTiers.value.length > 0)

// 获取当前达成的最高档位
const currentTier = computed(() => {
  if (!detail.value || giftTiers.value.length === 0) return null
  const tiers = [...giftTiers.value].sort((a, b) => b.count - a.count)
  for (const tier of tiers) {
    if (detail.value.currentCount >= tier.count) {
      return tier
    }
  }
  return null
})

// 获取下一个可达成的档位
const nextTier = computed(() => {
  if (!detail.value || giftTiers.value.length === 0) return null
  const tiers = [...giftTiers.value].sort((a, b) => a.count - b.count)
  for (const tier of tiers) {
    if (detail.value.currentCount < tier.count) {
      return tier
    }
  }
  return null
})

// 最高档位人数（用于显示空位）
const maxTierCount = computed(() => {
  if (giftTiers.value.length === 0) return detail.value?.requiredCount || 3
  return Math.max(...giftTiers.value.map(t => t.count))
})

// 倒计时
const remainingTime = ref('')
const countdownTimer = ref<number | null>(null)

// 加载配置
const loadConfig = async () => {
  try {
    config.value = await getGroupBuyConfig()
  } catch {
    // 忽略配置加载失败
  }
}

// 加载拼团详情
const loadDetail = async () => {
  if (!groupCode.value) {
    Toast({ message: '拼团码无效', theme: 'error' })
    router.back()
    return
  }

  loading.value = true
  try {
    const data = await getGroupBuyDetail(groupCode.value)
    if (data) {
      detail.value = data
      startCountdown()
    } else {
      Toast({ message: '拼团不存在', theme: 'error' })
      router.back()
    }
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
  } finally {
    loading.value = false
  }
}

// 开始倒计时
const startCountdown = () => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
  }

  const updateCountdown = () => {
    if (!detail.value || detail.value.status !== GroupBuyStatus.FORMING) {
      remainingTime.value = ''
      return
    }

    const expireAt = new Date(detail.value.expireAt).getTime()
    const now = Date.now()
    const diff = expireAt - now

    if (diff <= 0) {
      remainingTime.value = '已过期'
      // 重新加载获取最新状态
      loadDetail()
      return
    }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    remainingTime.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  updateCountdown()
  countdownTimer.value = window.setInterval(updateCountdown, 1000)
}

// 退出/取消拼团
const onQuitGroupBuy = async () => {
  if (!detail.value || quitting.value) return

  const actionText = isInitiator.value ? '取消拼团' : '退出拼团'
  const confirmText = isInitiator.value
    ? '取消后该拼团将解散，其他成员也将被移出。确定取消吗？'
    : '退出后您将无法再次加入此拼团。确定退出吗？'

  Dialog.confirm({
    title: actionText,
    content: confirmText,
    confirmBtn: { content: '确定', theme: 'danger' },
    cancelBtn: '再想想',
    onConfirm: async () => {
      quitting.value = true
      try {
        // 需要传递reservationId，但前端没有，需要后端通过手机号查找
        // 这里传0，后端会根据手机号和拼团码查找
        await quitGroupBuy(groupCode.value, 0)
        Toast({ message: `${actionText}成功`, theme: 'success' })
        // 刷新页面数据
        await loadDetail()
      } catch (error: any) {
        Toast({ message: error.message || `${actionText}失败`, theme: 'error' })
      } finally {
        quitting.value = false
      }
    }
  })
}

// 去预约（陌生人加入拼团的入口）
const goToReserve = () => {
  // 跳转到首页开始预约，并在URL中带上拼团码供后续使用
  router.push({
    path: '/',
    query: {
      joinGroupCode: groupCode.value,
      pickupDate: detail.value?.pickupDate
    }
  })
}

// 分享拼团
const shareGroupBuy = async () => {
  const shareUrl = `${window.location.origin}/group-buy/${groupCode.value}`

  // 尝试使用Web Share API
  if (navigator.share) {
    try {
      await navigator.share({
        title: `邀请你加入拼团`,
        text: `${detail.value?.initiatorName}发起了${detail.value?.requiredCount}人拼团，成团后每人获得${detail.value?.bonusGiftName || '精美赠品'}，快来加入！`,
        url: shareUrl,
      })
    } catch {
      // 用户取消分享
    }
  } else {
    // 复制链接
    try {
      await navigator.clipboard.writeText(shareUrl)
      Toast({ message: '链接已复制，快去分享给好友吧', theme: 'success' })
    } catch {
      Dialog.alert({
        title: '分享链接',
        content: shareUrl,
        confirmBtn: '我知道了',
      })
    }
  }
}

// 返回
const goBack = () => {
  router.back()
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

// 获取成员状态样式
const getMemberStatusClass = (status: string) => {
  return {
    'status-joined': status === 'JOINED',
    'status-picked': status === 'PICKED_UP',
    'status-quit': status === 'QUIT',
  }
}

// 获取成员状态文本
const getMemberStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'JOINED': '已加入',
    'PICKED_UP': '已提货',
    'QUIT': '已退出',
  }
  return statusMap[status] || status
}

onMounted(() => {
  loadConfig()
  loadDetail()
})

onUnmounted(() => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
  }
})
</script>

<template>
  <div class="group-buy-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">拼团详情</div>
      <div class="nav-right"></div>
    </div>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="48px" />
    </div>

    <!-- 拼团详情 -->
    <template v-else-if="detail">
      <!-- 状态卡片 -->
      <div class="status-card" :style="{ backgroundColor: GroupBuyStatusColors[detail.status] }">
        <div class="status-icon">
          <t-icon :name="detail.status === 'FORMING' ? 'user-add' : detail.status === 'FULL' ? 'check-circle' : 'info-circle'" size="48px" />
        </div>
        <div class="status-text">{{ GroupBuyStatusLabels[detail.status] }}</div>
        <div class="countdown" v-if="detail.status === GroupBuyStatus.FORMING && remainingTime">
          剩余 {{ remainingTime }}
        </div>
      </div>

      <!-- 拼团进度 -->
      <div class="progress-card">
        <div class="progress-header">
          <span class="progress-title">拼团进度</span>
          <span class="progress-count">{{ detail.currentCount }}/{{ hasMultiTiers ? maxTierCount : detail.requiredCount }}人</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${(detail.currentCount / (hasMultiTiers ? maxTierCount : detail.requiredCount)) * 100}%` }"
          ></div>
        </div>
        <!-- 多档位提示 -->
        <template v-if="hasMultiTiers && detail.status === GroupBuyStatus.FORMING">
          <div class="progress-tip" v-if="currentTier">
            ✓ 已达成{{ currentTier.count }}人档位
            <span v-if="nextTier">，再邀{{ nextTier.count - detail.currentCount }}人升级赠品</span>
          </div>
          <div class="progress-tip" v-else-if="nextTier">
            还差 {{ nextTier.count - detail.currentCount }} 人达成{{ nextTier.count }}人档位
          </div>
        </template>
        <!-- 单档位提示（兼容旧数据） -->
        <template v-else>
          <div class="progress-tip" v-if="detail.status === GroupBuyStatus.FORMING">
            还差 {{ detail.requiredCount - detail.currentCount }} 人成团
          </div>
          <div class="progress-tip success" v-else-if="detail.status === GroupBuyStatus.FULL || detail.status === GroupBuyStatus.COMPLETED">
            已成团，到店提货时领取赠品
          </div>
        </template>
      </div>

      <!-- 【2026-01-25】多档位赠品阶梯 -->
      <div class="gift-tiers-card" v-if="hasMultiTiers">
        <div class="card-title">🎁 拼团赠品阶梯（人越多赠品越好）</div>
        <div class="tier-list">
          <div
            v-for="tier in giftTiers"
            :key="tier.count"
            :class="['tier-item', { active: detail.currentCount >= tier.count, current: currentTier?.count === tier.count }]"
          >
            <div class="tier-badge">
              <span class="tier-count">{{ tier.count }}人</span>
              <span class="tier-status" v-if="detail.currentCount >= tier.count">✓</span>
            </div>
            <div class="tier-gifts">
              <div class="gift-row member">
                <span class="gift-label">团员</span>
                <span class="gift-value">{{ tier.memberGifts.join(' + ') }}</span>
              </div>
              <div class="gift-row leader">
                <span class="gift-label">团长</span>
                <span class="gift-value">{{ tier.leaderGift }}×{{ tier.leaderCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 单一赠品（兼容旧数据） -->
      <div class="gift-card" v-else-if="detail.bonusGiftName">
        <div class="gift-icon">
          <t-icon name="gift" size="32px" />
        </div>
        <div class="gift-info">
          <div class="gift-title">成团赠品</div>
          <div class="gift-name">{{ detail.bonusGiftName }}</div>
        </div>
      </div>

      <!-- 成员列表 -->
      <div class="members-card">
        <div class="card-title">拼团成员</div>
        <div class="members-list">
          <div
            v-for="(member, index) in detail.members"
            :key="member.id"
            :class="['member-item', getMemberStatusClass(member.status)]"
          >
            <div class="member-avatar">
              {{ index === 0 ? '团长' : index + 1 }}
            </div>
            <div class="member-info">
              <div class="member-name">{{ member.customerName }}</div>
              <div class="member-phone">{{ member.customerPhone }}</div>
              <div class="member-time">{{ formatTime(member.joinedAt) }} 加入</div>
            </div>
            <div class="member-status">{{ getMemberStatusText(member.status) }}</div>
          </div>

          <!-- 空位（扩展到最高档位人数） -->
          <div
            v-for="i in Math.max(0, (hasMultiTiers ? maxTierCount : detail.requiredCount) - detail.members.length)"
            :key="'empty-' + i"
            class="member-item empty"
          >
            <div class="member-avatar">?</div>
            <div class="member-info">
              <div class="member-name">等待加入...</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 区域与提货信息 -->
      <div class="location-card">
        <div class="card-title">顺路拼团信息</div>
        <div class="location-info">
          <div class="info-row" v-if="detail.regionName">
            <t-icon name="location" size="16px" class="info-icon" />
            <span class="info-label">出发区域：</span>
            <span class="info-value highlight">{{ detail.regionName }}</span>
          </div>
          <div class="info-row">
            <t-icon name="calendar" size="16px" class="info-icon" />
            <span class="info-label">提货日期：</span>
            <span class="info-value highlight">{{ formatDate(detail.pickupDate) }}</span>
          </div>
        </div>
      </div>

      <!-- 门店信息 -->
      <div class="store-card">
        <div class="card-title">提货门店</div>
        <div class="store-info">
          <div class="store-name">{{ detail.storeName }}</div>
          <div class="store-address">{{ detail.storeAddress }}</div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-bar" v-if="detail.status === GroupBuyStatus.FORMING">
        <!-- 已参与拼团的用户：分享+退出 -->
        <template v-if="isParticipant">
          <div class="action-buttons">
            <t-button theme="primary" size="large" @click="shareGroupBuy">
              <t-icon name="share" /> 邀请好友
            </t-button>
            <t-button
              v-if="canQuit"
              theme="default"
              size="large"
              :loading="quitting"
              @click="onQuitGroupBuy"
            >
              {{ isInitiator ? '取消拼团' : '退出拼团' }}
            </t-button>
          </div>
        </template>
        <!-- 未参与拼团的用户：加入提示 -->
        <template v-else>
          <div class="join-hint-card">
            <div class="join-hint-content">
              <t-icon name="info-circle" size="20px" class="join-hint-icon" />
              <div class="join-hint-text">
                <p class="join-hint-title">想要加入这个拼团？</p>
                <p class="join-hint-desc">先去预约商品，确认后即可加入拼团</p>
              </div>
            </div>
            <t-button theme="primary" size="large" block @click="goToReserve">
              <t-icon name="add" /> 去预约加入
            </t-button>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.group-buy-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 100px;
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

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px;
}

.status-card {
  margin-top: 44px;
  padding: 32px 20px;
  text-align: center;
  color: #fff;
}

.status-icon {
  margin-bottom: 12px;
}

.status-text {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.countdown {
  font-size: 14px;
  opacity: 0.9;
}

.progress-card {
  margin: 12px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.progress-count {
  font-size: 14px;
  color: #E53935;
  font-weight: 500;
}

.progress-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #E53935, #ff6f61);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-tip {
  margin-top: 12px;
  font-size: 13px;
  color: #666;
  text-align: center;
}

.progress-tip.success {
  color: #4CAF50;
}

.gift-card {
  margin: 12px;
  padding: 20px;
  background: linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.gift-icon {
  width: 56px;
  height: 56px;
  background: #E53935;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.gift-title {
  font-size: 13px;
  color: #8c6d00;
  margin-bottom: 4px;
}

.gift-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

/* 【2026-01-25】多档位赠品阶梯样式 */
.gift-tiers-card {
  margin: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%);
  border-radius: 12px;
}

.tier-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tier-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  border: 2px solid #eee;
  opacity: 0.7;
  transition: all 0.3s ease;
}

.tier-item.active {
  opacity: 1;
  border-color: #4CAF50;
  background: #f1f8e9;
}

.tier-item.current {
  border-color: #E53935;
  box-shadow: 0 2px 8px rgba(229, 57, 53, 0.2);
}

.tier-badge {
  min-width: 50px;
  text-align: center;
  position: relative;
}

.tier-count {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #E53935;
  background: #ffebee;
  padding: 4px 8px;
  border-radius: 12px;
}

.tier-item.active .tier-count {
  background: #e8f5e9;
  color: #4CAF50;
}

.tier-status {
  position: absolute;
  top: -6px;
  right: -6px;
  font-size: 12px;
  color: #4CAF50;
}

.tier-gifts {
  flex: 1;
}

.gift-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  line-height: 1.6;
}

.gift-label {
  color: #999;
  min-width: 32px;
}

.gift-value {
  color: #333;
  font-weight: 500;
}

.gift-row.leader .gift-value {
  color: #E53935;
}

.members-card {
  margin: 12px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
}

.card-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 16px;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

.member-item.empty {
  opacity: 0.5;
  border: 1px dashed #ddd;
  background: #fff;
}

.member-item.status-picked {
  background: #e8f5e9;
}

.member-item.status-quit {
  opacity: 0.5;
  background: #f5f5f5;
}

.member-avatar {
  width: 40px;
  height: 40px;
  background: #E53935;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
}

.member-item.empty .member-avatar {
  background: #ddd;
}

.member-info {
  flex: 1;
}

.member-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.member-phone {
  font-size: 12px;
  color: #666;
}

.member-time {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.member-status {
  font-size: 12px;
  color: #4CAF50;
  font-weight: 500;
}

.member-item.status-quit .member-status {
  color: #999;
}

.location-card {
  margin: 12px;
  padding: 20px;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-radius: 12px;
}

.location-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-icon {
  color: #1976D2;
}

.info-label {
  font-size: 14px;
  color: #666;
}

.info-value {
  font-size: 14px;
  color: #333;
}

.info-value.highlight {
  font-weight: 600;
  color: #1976D2;
}

.store-card {
  margin: 12px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
}

.store-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  font-size: 13px;
  color: #E53935;
  font-weight: 500;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.action-buttons .t-button {
  flex: 1;
}

/* 加入提示卡片 */
.join-hint-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.join-hint-content {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: #fff7e6;
  border-radius: 8px;
}

.join-hint-icon {
  color: #FF9800;
  flex-shrink: 0;
  margin-top: 2px;
}

.join-hint-text {
  flex: 1;
}

.join-hint-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.join-hint-desc {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}
</style>
