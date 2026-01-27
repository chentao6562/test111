<script setup lang="ts">
/**
 * 预约详情页面
 * 【2026-01-16 预约模式升级】
 * 【2026-01-17】新增核销二维码和备货进度显示
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import {
  getReservationDetail,
  cancelReservation,
  ReservationStatus,
  StatusLabels,
  StatusColors,
  type Reservation
} from '../api/reservation'
import {
  getGroupBuyConfig,
  createGroupBuy,
  type GroupBuyConfig
} from '../api/groupBuy'
import { getOptimizedImageUrl } from '../api'
import { formatPrice, formatDate } from '../utils/format'
import QRCode from '../components/QRCode.vue'

defineOptions({
  name: 'ReservationDetail'
})

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const detail = ref<Reservation | null>(null)
const cancelling = ref(false)

// 【2026-01-21 顺路拼团】拼团相关
const groupBuyConfig = ref<GroupBuyConfig | null>(null)
const creatingGroupBuy = ref(false)
// 【2026-01-25】拼团人数选择
const showTierSelector = ref(false)
const selectedTierCount = ref(3)

// 是否可以取消
const canCancel = computed(() => {
  return detail.value?.status === ReservationStatus.PENDING
})

// 【2026-01-21 顺路拼团】是否可以发起拼团
const canStartGroupBuy = computed(() => {
  if (!detail.value || !groupBuyConfig.value) return false
  // 检查拼团功能是否开启
  if (!groupBuyConfig.value.enabled) return false
  // 检查是否有活动配置
  if (!groupBuyConfig.value.activeConfig) return false
  // 检查预约状态（已确认及之后的状态可以发起）
  if (detail.value.status < ReservationStatus.CONFIRMED) return false
  // 检查预约是否已完成/取消/过期
  const status = detail.value.status
  if (status === ReservationStatus.COMPLETED || status === ReservationStatus.CANCELLED || status === ReservationStatus.EXPIRED) return false
  // 检查金额是否满足
  if (detail.value.totalAmount < groupBuyConfig.value.minAmount) return false
  // 检查是否已参与拼团（通过groupBuyCode判断）
  if ((detail.value as any).groupBuyCode) return false
  return true
})

// 【2026-01-21 顺路拼团】是否已参与拼团
const isInGroupBuy = computed(() => {
  return !!(detail.value as any)?.groupBuyCode
})

// 【2026-01-21 顺路拼团】获取参与的拼团码
const groupBuyCode = computed(() => {
  return (detail.value as any)?.groupBuyCode || ''
})

// 状态说明
const statusDesc = computed(() => {
  if (!detail.value) return ''
  const status = detail.value.status
  switch (status) {
    case ReservationStatus.PENDING:
      return '您的预约已提交，门店将在30分钟内电话确认'
    case ReservationStatus.CALLING:
      return '门店正在联系您，请注意接听电话'
    case ReservationStatus.CONFIRMED:
      return '预约已确认，请在提货日期前往门店付款提货'
    case ReservationStatus.COMPLETED:
      return '感谢您的惠顾，欢迎下次光临'
    case ReservationStatus.CANCELLED:
      return '预约已取消'
    case ReservationStatus.EXPIRED:
      return '预约已过期，如需购买请重新预约'
    case ReservationStatus.CALL_FAILED:
      return '电话确认失败，请确保手机畅通后重新预约'
    case ReservationStatus.PENDING_PREPARE:
      return '门店正在准备您的商品，请耐心等待'
    case ReservationStatus.PREPARING:
      return '门店正在备货中，稍后会通知您提货'
    case ReservationStatus.PENDING_PICKUP:
      return '商品已备好，请凭二维码到店提货'
    default:
      return ''
  }
})

// 【2026-01-17】是否显示核销二维码
const showQRCode = computed(() => {
  if (!detail.value) return false
  const status = detail.value.status
  // 已确认(2)、待备货(7)、备货中(8)、待提货(9) 状态显示二维码
  const qrCodeStatuses = [
    ReservationStatus.CONFIRMED,
    ReservationStatus.PENDING_PREPARE,
    ReservationStatus.PREPARING,
    ReservationStatus.PENDING_PICKUP
  ] as const
  return (qrCodeStatuses as readonly number[]).includes(status)
})

// 【2026-01-17】二维码内容
const qrCodeContent = computed(() => {
  if (!detail.value) return ''
  return `MQYH:${detail.value.reservationNo}`
})

// 加载详情
const loadDetail = async () => {
  const id = Number(route.params.id)
  if (!id) {
    Toast({ message: '参数错误', theme: 'error' })
    router.back()
    return
  }

  loading.value = true
  try {
    const res = await getReservationDetail(id)
    detail.value = res.data
  } catch (error) {
    console.error('加载预约详情失败:', error)
    Toast({ message: '加载失败', theme: 'error' })
  } finally {
    loading.value = false
  }
}

// 取消预约
// 【2026-01-17修复】需要传递phone参数验证身份
const onCancel = () => {
  if (!canCancel.value || !detail.value) return

  Dialog.confirm({
    title: '取消预约',
    content: '确定要取消此预约吗？',
    confirmBtn: '确定取消',
    cancelBtn: '再想想',
    onConfirm: async () => {
      cancelling.value = true
      try {
        await cancelReservation(detail.value!.id, detail.value!.customerPhone)
        Toast({ message: '已取消预约', theme: 'success' })
        loadDetail()
      } catch (error) {
        console.error('取消预约失败:', error)
      } finally {
        cancelling.value = false
      }
    }
  })
}

// 拨打电话
const callStore = () => {
  if (!detail.value?.store?.contactPhone) return
  window.location.href = `tel:${detail.value.store.contactPhone}`
}

// 【2026-01-21 顺路拼团】加载拼团配置
const loadGroupBuyConfig = async () => {
  try {
    groupBuyConfig.value = await getGroupBuyConfig()
  } catch (error) {
    console.error('加载拼团配置失败:', error)
  }
}

// 【2026-01-21 顺路拼团】发起拼团
// 【2026-01-25】支持选择拼团人数
const onStartGroupBuy = async () => {
  if (!detail.value || creatingGroupBuy.value) return

  // 检查是否有多档位配置
  const tiers = groupBuyConfig.value?.tiers
  if (tiers && tiers.length > 1) {
    // 有多档位，显示选择弹窗
    const firstTier = tiers[0]
    selectedTierCount.value = firstTier?.count ?? 3  // 默认选择第一个档位
    showTierSelector.value = true
  } else {
    // 无多档位，直接使用默认人数发起
    confirmStartGroupBuy()
  }
}

// 【2026-01-25】确认发起拼团
const confirmStartGroupBuy = async () => {
  if (!detail.value || creatingGroupBuy.value) return

  creatingGroupBuy.value = true
  try {
    // 有多档位时传入选择的人数
    const tiers = groupBuyConfig.value?.tiers
    const requiredCount = (tiers && tiers.length > 1) ? selectedTierCount.value : undefined
    const result = await createGroupBuy(detail.value.id, requiredCount)
    Toast({ message: '拼团发起成功', theme: 'success' })
    showTierSelector.value = false
    // 跳转到拼团详情页
    router.push(`/group-buy/${result.code}`)
  } catch (error: any) {
    Toast({ message: error.message || '发起拼团失败', theme: 'error' })
  } finally {
    creatingGroupBuy.value = false
  }
}

// 【2026-01-21 顺路拼团】查看拼团详情
const viewGroupBuy = () => {
  if (groupBuyCode.value) {
    router.push(`/group-buy/${groupBuyCode.value}`)
  }
}

// 返回
const goBack = () => {
  router.back()
}

onMounted(() => {
  loadDetail()
  loadGroupBuyConfig()  // 【2026-01-21 顺路拼团】加载拼团配置
})
</script>

<template>
  <div class="detail-page">
    <!-- 顶部导航 -->
    <nav class="nav-bar">
      <div class="nav-back" @click="goBack">
        <span class="material-symbols-outlined">arrow_back</span>
      </div>
      <h2 class="nav-title">预约详情</h2>
      <div class="nav-placeholder"></div>
    </nav>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="40px" />
    </div>

    <template v-else-if="detail">
      <!-- 状态卡片 -->
      <div class="status-card" :style="{ backgroundColor: StatusColors[detail.status] }">
        <div class="status-icon">
          <span class="material-symbols-outlined" v-if="detail.status === ReservationStatus.PENDING">hourglass_empty</span>
          <span class="material-symbols-outlined" v-else-if="detail.status === ReservationStatus.CALLING">phone_in_talk</span>
          <span class="material-symbols-outlined" v-else-if="detail.status === ReservationStatus.CONFIRMED">check_circle</span>
          <span class="material-symbols-outlined" v-else-if="detail.status === ReservationStatus.COMPLETED">verified</span>
          <span class="material-symbols-outlined" v-else>info</span>
        </div>
        <div class="status-content">
          <h3 class="status-title">{{ StatusLabels[detail.status] }}</h3>
          <p class="status-desc">{{ statusDesc }}</p>
        </div>
      </div>

      <!-- 【2026-01-17】核销二维码卡片 -->
      <div class="section qrcode-section" v-if="showQRCode">
        <div class="section-header">
          <span class="material-symbols-outlined">qr_code_2</span>
          <span class="section-title">到店核销码</span>
        </div>
        <div class="qrcode-content">
          <QRCode :content="qrCodeContent" :size="200" />
          <div class="qrcode-info">
            <p class="reservation-no">预约号：{{ detail.reservationNo }}</p>
            <!-- 【2026-01-19】显示提货码 -->
            <p class="pickup-code" v-if="detail.pickupCode">
              提货码：<span class="code-value">{{ detail.pickupCode }}</span>
            </p>
            <p class="qrcode-tip">到店后出示此二维码，门店扫码即可核销</p>
          </div>
        </div>
      </div>

      <!-- 【2026-01-17】备货进度卡片 -->
      <div class="section prepare-section" v-if="detail.status >= ReservationStatus.PENDING_PREPARE && detail.status <= ReservationStatus.PENDING_PICKUP">
        <div class="section-header">
          <span class="material-symbols-outlined">local_shipping</span>
          <span class="section-title">备货进度</span>
        </div>
        <div class="prepare-steps">
          <div class="step" :class="{ active: detail.status >= ReservationStatus.PENDING_PREPARE }">
            <div class="step-icon">1</div>
            <div class="step-text">待备货</div>
          </div>
          <div class="step-line" :class="{ active: detail.status >= ReservationStatus.PREPARING }"></div>
          <div class="step" :class="{ active: detail.status >= ReservationStatus.PREPARING }">
            <div class="step-icon">2</div>
            <div class="step-text">备货中</div>
          </div>
          <div class="step-line" :class="{ active: detail.status >= ReservationStatus.PENDING_PICKUP }"></div>
          <div class="step" :class="{ active: detail.status >= ReservationStatus.PENDING_PICKUP }">
            <div class="step-icon">3</div>
            <div class="step-text">待提货</div>
          </div>
        </div>
      </div>

      <!-- 门店信息 -->
      <div class="section store-section" v-if="detail.store">
        <div class="section-header">
          <span class="material-symbols-outlined">store</span>
          <span class="section-title">提货门店</span>
        </div>
        <div class="store-info">
          <p class="store-name">{{ detail.store.name }}</p>
          <p class="store-address">{{ detail.store.address }}</p>
          <div class="store-phone" @click="callStore">
            <span class="material-symbols-outlined">phone</span>
            <span>{{ detail.store.contactPhone }}</span>
          </div>
        </div>
      </div>

      <!-- 预约信息 -->
      <div class="section info-section">
        <div class="section-header">
          <span class="material-symbols-outlined">receipt_long</span>
          <span class="section-title">预约信息</span>
        </div>
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">预约号</span>
            <span class="info-value">{{ detail.reservationNo }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">提货人</span>
            <span class="info-value">{{ detail.customerName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">联系电话</span>
            <span class="info-value">{{ detail.customerPhone }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">提货日期</span>
            <span class="info-value">{{ formatDate(detail.pickupDate) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">预约时间</span>
            <span class="info-value">{{ formatDate(detail.createdAt, true) }}</span>
          </div>
        </div>
      </div>

      <!-- 商品列表 -->
      <div class="section products-section">
        <div class="section-header">
          <span class="material-symbols-outlined">inventory_2</span>
          <span class="section-title">预约商品</span>
        </div>
        <div class="product-list">
          <div class="product-item" v-for="item in detail.items" :key="item.productId">
            <div class="product-image">
              <img :src="getOptimizedImageUrl(item.productImage, 'small')" :alt="item.productName" />
              <!-- 【2026-01-25修复】秒杀/砍价商品标记 -->
              <span class="flash-badge" v-if="item.isFlashSale">秒杀</span>
              <span class="bargain-badge" v-if="item.isBargain">砍价</span>
            </div>
            <div class="product-info">
              <p class="product-name">{{ item.productName }}</p>
              <div class="product-price-row">
                <span class="product-price" :class="{ 'flash-price': item.isFlashSale, 'bargain-price': item.isBargain }">{{ formatPrice(item.price) }}</span>
                <span class="product-qty">x{{ item.quantity }}</span>
              </div>
            </div>
            <div class="product-subtotal">
              {{ formatPrice(item.subtotal) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 赠品信息 -->
      <div class="section gift-section" v-if="detail.giftName">
        <div class="section-header">
          <span class="material-symbols-outlined">redeem</span>
          <span class="section-title">预约赠品</span>
        </div>
        <div class="gift-content">
          <div class="gift-info">
            <span class="gift-icon">🎁</span>
            <span class="gift-name">{{ detail.giftName }}</span>
          </div>
          <span class="gift-status" :class="{ delivered: detail.giftDelivered }">
            {{ detail.giftDelivered ? '已发放' : '待发放' }}
          </span>
        </div>
        <p class="gift-tip">赠品将在您到店提货时一并发放</p>
        <div class="gift-notice">
          <p class="gift-notice-item">⚠️ 取消预约后，赠品资格失效</p>
          <p class="gift-notice-item">⚠️ 未提走预约产品，秒杀商品不生效</p>
        </div>
      </div>

      <!-- 【2026-01-21 顺路拼团】拼团入口卡片 -->
      <div class="section group-buy-section" v-if="canStartGroupBuy || isInGroupBuy">
        <div class="section-header">
          <span class="material-symbols-outlined">group_add</span>
          <span class="section-title">顺路拼团</span>
        </div>

        <!-- 已参与拼团 -->
        <div class="group-buy-status" v-if="isInGroupBuy" @click="viewGroupBuy">
          <div class="group-buy-info">
            <div class="group-buy-badge joined">
              <span class="material-symbols-outlined">check_circle</span>
              已参与拼团
            </div>
            <p class="group-buy-code">拼团码：{{ groupBuyCode }}</p>
          </div>
          <div class="group-buy-action">
            <span>查看详情</span>
            <span class="material-symbols-outlined">chevron_right</span>
          </div>
        </div>

        <!-- 可发起拼团 -->
        <div class="group-buy-invite" v-else-if="canStartGroupBuy">
          <div class="group-buy-promo">
            <div class="promo-icon">
              <span class="material-symbols-outlined">diversity_3</span>
            </div>
            <div class="promo-content">
              <h4 class="promo-title">多档位拼团 享丰厚赠品</h4>
              <p class="promo-desc" v-if="groupBuyConfig?.tiers?.length">
                可选 {{ groupBuyConfig.tiers.map(t => t.count + '人团').join(' / ') }}，人数越多赠品越丰厚
              </p>
              <p class="promo-desc" v-else>
                邀请好友一起到店，成团后每人获赠 {{ groupBuyConfig?.bonusGiftName || '精美礼品' }}
              </p>
            </div>
          </div>
          <button
            class="start-group-btn"
            :disabled="creatingGroupBuy"
            @click="onStartGroupBuy"
          >
            <span class="material-symbols-outlined">group_add</span>
            {{ creatingGroupBuy ? '发起中...' : '选择档位发起拼团' }}
          </button>
        </div>
      </div>

      <!-- 金额信息 -->
      <div class="section amount-section">
        <div class="amount-row total">
          <span class="amount-label">应付金额（到店付款）</span>
          <span class="amount-value">{{ formatPrice(detail.totalAmount) }}</span>
        </div>
      </div>

      <!-- 温馨提示 -->
      <div class="notice-card">
        <div class="notice-header">
          <span class="material-symbols-outlined">info</span>
          <span>温馨提示</span>
        </div>
        <ul class="notice-list">
          <li>本预约仅作为到店意向登记，不构成任何形式的线上交易</li>
          <li>实际购买需到店完成，以店内实际交易为准</li>
          <li>请在提货日期前往门店，携带手机号验证身份</li>
          <li>如需更改提货时间，请提前联系门店</li>
        </ul>
      </div>

      <!-- 底部操作栏 -->
      <div class="bottom-bar" v-if="canCancel">
        <button class="cancel-btn" :disabled="cancelling" @click="onCancel">
          {{ cancelling ? '取消中...' : '取消预约' }}
        </button>
      </div>
    </template>

    <!-- 【2026-01-25】拼团人数选择弹窗 -->
    <t-popup v-model="showTierSelector" placement="bottom">
      <div class="tier-selector">
        <div class="tier-header">
          <span class="tier-title">选择拼团人数</span>
          <span class="tier-close" @click="showTierSelector = false">
            <span class="material-symbols-outlined">close</span>
          </span>
        </div>
        <div class="tier-options">
          <div
            v-for="tier in groupBuyConfig?.tiers"
            :key="tier.count"
            class="tier-option"
            :class="{ active: selectedTierCount === tier.count }"
            @click="selectedTierCount = tier.count"
          >
            <div class="tier-main">
              <div class="tier-count">{{ tier.count }}人团</div>
              <div class="tier-gifts">
                <div class="tier-gift-item">
                  <span class="gift-label">🎁 团员赠品:</span>
                  <span class="gift-value">{{ tier.memberGifts?.join('、') || '精美礼品' }}</span>
                </div>
                <div class="tier-gift-item" v-if="tier.leaderGift">
                  <span class="gift-label">👑 团长奖励:</span>
                  <span class="gift-value">{{ tier.leaderGift }}×{{ tier.leaderCount || 1 }}</span>
                </div>
              </div>
            </div>
            <span class="tier-check" v-if="selectedTierCount === tier.count">
              <span class="material-symbols-outlined">check_circle</span>
            </span>
          </div>
        </div>
        <div class="tier-actions">
          <button
            class="tier-confirm-btn"
            :disabled="creatingGroupBuy"
            @click="confirmStartGroupBuy"
          >
            {{ creatingGroupBuy ? '发起中...' : `发起${selectedTierCount}人拼团` }}
          </button>
        </div>
      </div>
    </t-popup>
  </div>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: #f5f5f5;
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

/* 加载中 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

/* 状态卡片 */
.status-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 20px;
  color: white;
}

.status-icon .material-symbols-outlined {
  font-size: 48px;
}

.status-content {
  flex: 1;
}

.status-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
}

.status-desc {
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.5;
}

/* 通用区块 */
.section {
  background: white;
  margin: 12px 16px;
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid #f5f5f5;
}

.section-header .material-symbols-outlined {
  font-size: 20px;
  color: #EF062D;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

/* 门店信息 */
.store-info {
  padding: 16px;
}

.store-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.store-address {
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
  line-height: 1.5;
}

.store-phone {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f5f5f5;
  border-radius: 20px;
  font-size: 14px;
  color: #EF062D;
  cursor: pointer;
}

.store-phone .material-symbols-outlined {
  font-size: 18px;
}

/* 预约信息 */
.info-list {
  padding: 12px 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f9f9f9;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: #999;
}

.info-value {
  font-size: 14px;
  color: #333;
}

/* 商品列表 */
.product-list {
  padding: 12px 16px;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f9f9f9;
}

.product-item:last-child {
  border-bottom: none;
}

.product-image {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f5f5f5;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 【2026-01-25新增】秒杀标记 */
.flash-badge {
  position: absolute;
  top: 0;
  left: 0;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%);
  padding: 2px 6px;
  border-radius: 0 0 6px 0;
}

/* 【2026-01-25新增】砍价标记 */
.bargain-badge {
  position: absolute;
  top: 0;
  left: 0;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  padding: 2px 6px;
  border-radius: 0 0 6px 0;
}

/* 【2026-01-25新增】秒杀价格颜色 */
.product-price.flash-price {
  color: #ff6b00;
}

/* 【2026-01-25新增】砍价价格颜色 */
.product-price.bargain-price {
  color: #52c41a;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-price-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-price {
  font-size: 14px;
  color: #EF062D;
  font-weight: 600;
}

.product-qty {
  font-size: 12px;
  color: #999;
}

.product-subtotal {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

/* 赠品信息 */
.gift-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
}

.gift-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gift-icon {
  font-size: 24px;
}

.gift-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.gift-status {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
  background: #FFF3E0;
  color: #FF9800;
}

.gift-status.delivered {
  background: #E8F5E9;
  color: #4CAF50;
}

.gift-tip {
  font-size: 12px;
  color: #999;
  padding: 0 16px 12px;
}

/* 【2026-01-25】赠品注意事项 */
.gift-notice {
  margin: 0 16px 16px;
  padding: 10px 12px;
  background: #FFF7E6;
  border-radius: 8px;
  border: 1px solid rgba(250, 173, 20, 0.3);
}

.gift-notice-item {
  font-size: 12px;
  color: #AD6800;
  line-height: 1.8;
  margin: 0;
}

/* 金额信息 */
.amount-section {
  padding: 16px;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.amount-row.total .amount-label {
  font-size: 14px;
  color: #333;
}

.amount-row.total .amount-value {
  font-size: 22px;
  font-weight: 700;
  color: #EF062D;
}

/* 温馨提示 */
.notice-card {
  margin: 12px 16px;
  padding: 16px;
  background: #FFF8E1;
  border-radius: 12px;
}

.notice-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #FF8F00;
  margin-bottom: 12px;
}

.notice-header .material-symbols-outlined {
  font-size: 18px;
}

.notice-list {
  padding-left: 18px;
  margin: 0;
}

.notice-list li {
  font-size: 12px;
  color: #666;
  line-height: 1.8;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: white;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.cancel-btn {
  width: 100%;
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #999;
  background: #f5f5f5;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.cancel-btn:disabled {
  opacity: 0.6;
}

/* 【2026-01-17】二维码样式 */
.qrcode-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  background: linear-gradient(135deg, #fff5f5 0%, #fff 50%, #f5f5ff 100%);
}

.qrcode-info {
  text-align: center;
  margin-top: 16px;
}

.reservation-no {
  font-size: 14px;
  color: #333;
  font-weight: 600;
  margin-bottom: 8px;
}

.qrcode-tip {
  font-size: 12px;
  color: #999;
}

/* 【2026-01-19】提货码样式 */
.pickup-code {
  font-size: 16px;
  color: #333;
  margin: 12px 0;
  padding: 12px 20px;
  background: linear-gradient(135deg, #fff5f5 0%, #ffebee 100%);
  border-radius: 8px;
  border: 1px dashed #EF062D;
}

.pickup-code .code-value {
  font-size: 24px;
  font-weight: 700;
  color: #EF062D;
  letter-spacing: 2px;
}

/* 【2026-01-17】备货进度样式 */
.prepare-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e0e0e0;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.step.active .step-icon {
  background: #EF062D;
  color: white;
}

.step-text {
  font-size: 12px;
  color: #999;
  transition: color 0.3s ease;
}

.step.active .step-text {
  color: #333;
  font-weight: 500;
}

.step-line {
  width: 40px;
  height: 2px;
  background: #e0e0e0;
  margin: 0 8px;
  margin-bottom: 24px;
  transition: background 0.3s ease;
}

.step-line.active {
  background: #EF062D;
}

/* 【2026-01-21 顺路拼团】拼团卡片样式 */
.group-buy-section .section-header .material-symbols-outlined {
  color: #4CAF50;
}

.group-buy-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  cursor: pointer;
}

.group-buy-info {
  flex: 1;
}

.group-buy-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}

.group-buy-badge.joined {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

.group-buy-badge .material-symbols-outlined {
  font-size: 16px;
}

.group-buy-code {
  font-size: 13px;
  color: #666;
}

.group-buy-action {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #4CAF50;
}

.group-buy-action .material-symbols-outlined {
  font-size: 20px;
}

.group-buy-invite {
  padding: 16px;
}

.group-buy-promo {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(76, 175, 80, 0.02) 100%);
  border-radius: 12px;
  margin-bottom: 16px;
}

.promo-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(76, 175, 80, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.promo-icon .material-symbols-outlined {
  font-size: 28px;
  color: #4CAF50;
}

.promo-content {
  flex: 1;
}

.promo-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}

.promo-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.start-group-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.start-group-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.start-group-btn:disabled {
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}

.start-group-btn .material-symbols-outlined {
  font-size: 20px;
}

/* 【2026-01-25】拼团人数选择弹窗 */
.tier-selector {
  background: white;
  border-radius: 16px 16px 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.tier-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.tier-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.tier-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.tier-close .material-symbols-outlined {
  font-size: 24px;
  color: #999;
}

.tier-options {
  padding: 16px 20px;
}

.tier-option {
  display: flex;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tier-option:last-child {
  margin-bottom: 0;
}

.tier-option.active {
  border-color: #4CAF50;
  background: rgba(76, 175, 80, 0.05);
}

.tier-main {
  flex: 1;
}

.tier-count {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.tier-gifts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tier-gift-item {
  font-size: 13px;
  line-height: 1.4;
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.gift-label {
  color: #999;
  white-space: nowrap;
}

.gift-value {
  color: #333;
  font-weight: 500;
}

.tier-check {
  margin-left: 12px;
}

.tier-check .material-symbols-outlined {
  font-size: 24px;
  color: #4CAF50;
}

.tier-actions {
  padding: 16px 20px 24px;
}

.tier-confirm-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tier-confirm-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.tier-confirm-btn:disabled {
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}
</style>
