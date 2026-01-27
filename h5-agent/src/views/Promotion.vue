<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { get } from '../api'
import { useUserStore } from '../stores/user'
import QRCodeComponent from '../components/QRCode.vue'
import { createBrandedQRCode, downloadImage } from '../utils/share'

const router = useRouter()
const userStore = useUserStore()

// 二维码相关
const qrCodeRef = ref<InstanceType<typeof QRCodeComponent>>()
const qrCodeImageUrl = ref('')

interface PromotionData {
  inviteCode: string
  inviteUrl?: string // 前端自行生成
  customerUrl?: string // 客户扫码链接
  invitedCount: number // 后端返回的字段名
  totalIncome: number // 后端返回的字段名
  tier: string // 后端返回的字段名 (LEVEL1, LEVEL2等)
  totalInvites?: number // 兼容字段
  monthlyInvites?: number // 兼容字段
  directInvites?: number // 兼容字段
  indirectInvites?: number // 兼容字段
  totalCommission?: number // 兼容字段
  monthlyCommission?: number // 兼容字段
}

const promotionData = ref<PromotionData | null>(null)
const loading = ref(true)

// 获取用户ID用于生成客户链接
const userId = computed(() => userStore.userInfo?.id)

const loadPromotionData = async () => {
  loading.value = true
  try {
    const res = await get<any>('/commission/promotion')
    const data = res.data
    // 生成邀请链接（用于邀请下级推销员）
    const baseUrl = window.location.origin
    data.inviteUrl = `${baseUrl}/login?inviteCode=${data.inviteCode}`
    // 生成客户扫码链接（用于客户浏览商品）
    data.customerUrl = `${baseUrl}/?s=${userId.value}`
    // 映射字段以兼容模板【2026-01-17 使用后端返回的monthInvited字段】
    data.totalInvites = data.invitedCount
    data.monthlyInvites = data.monthInvited || 0
    data.directInvites = data.invitedCount
    // 【2026-01-19修复】间接成员需要额外查询，暂时从团队统计获取
    data.indirectInvites = 0
    // 尝试从团队统计获取间接成员数
    try {
      const teamRes = await get<any>('/commission/team-stats')
      data.indirectInvites = teamRes.data?.indirectCount || 0
    } catch {
      // 获取失败则保持为0
    }
    promotionData.value = data
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
  } finally {
    loading.value = false
  }
}

const copyInviteCode = async () => {
  if (!promotionData.value?.inviteCode) return
  try {
    await navigator.clipboard.writeText(promotionData.value.inviteCode)
    Toast({ message: '邀请码已复制', theme: 'success' })
  } catch {
    const input = document.createElement('input')
    input.value = promotionData.value.inviteCode
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    Toast({ message: '邀请码已复制', theme: 'success' })
  }
}

const copyInviteUrl = async () => {
  if (!promotionData.value?.inviteUrl) return
  try {
    await navigator.clipboard.writeText(promotionData.value.inviteUrl)
    Toast({ message: '邀请链接已复制', theme: 'success' })
  } catch {
    const input = document.createElement('input')
    input.value = promotionData.value.inviteUrl
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    Toast({ message: '邀请链接已复制', theme: 'success' })
  }
}

const shareInvite = async () => {
  if (!promotionData.value) return
  const shareData = {
    title: '蒙庆烟花推销员邀请',
    text: `邀请您成为蒙庆烟花推销员，邀请码: ${promotionData.value.inviteCode}`,
    url: promotionData.value.inviteUrl
  }
  if (navigator.share) {
    try {
      await navigator.share(shareData)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        copyInviteUrl()
      }
    }
  } else {
    copyInviteUrl()
  }
}

// 【2026-01-17 新增】复制客户专属链接
const copyCustomerUrl = async () => {
  if (!promotionData.value?.customerUrl) return
  try {
    await navigator.clipboard.writeText(promotionData.value.customerUrl)
    Toast({ message: '客户链接已复制', theme: 'success' })
  } catch {
    const input = document.createElement('input')
    input.value = promotionData.value.customerUrl
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    Toast({ message: '客户链接已复制', theme: 'success' })
  }
}

// 【2026-01-17 新增】分享客户专属链接
const shareCustomerUrl = async () => {
  if (!promotionData.value) return
  const shareData = {
    title: '蒙庆烟花专属优惠',
    text: '点击链接查看烟花商品，享受专属优惠价格！',
    url: promotionData.value.customerUrl
  }
  if (navigator.share) {
    try {
      await navigator.share(shareData)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        copyCustomerUrl()
      }
    }
  } else {
    copyCustomerUrl()
  }
}

// 【2026-01-17 新增】二维码生成完成回调
const onQRCodeReady = () => {
  if (qrCodeRef.value?.canvas) {
    qrCodeImageUrl.value = createBrandedQRCode(qrCodeRef.value.canvas, '蒙庆烟花·专属优惠')
  }
}

// 【2026-01-17 新增】保存二维码到本地
const saveQRCode = () => {
  if (!qrCodeImageUrl.value) {
    Toast({ message: '二维码生成中，请稍候', theme: 'warning' })
    return
  }
  const success = downloadImage(qrCodeImageUrl.value, `蒙庆烟花推广码-${userId.value}.png`)
  if (success) {
    Toast({ message: '二维码已保存', theme: 'success' })
  } else {
    Toast({ message: '保存失败，请长按图片保存', theme: 'error' })
  }
}

const goBack = () => router.back()

onMounted(() => loadPromotionData())
</script>

<template>
  <div class="promotion-page">
    <div class="nav-bar">
      <div class="nav-back" @click="goBack"><t-icon name="chevron-left" size="24px" /></div>
      <div class="nav-title">推广中心</div>
      <div class="nav-placeholder"></div>
    </div>
    <div class="loading-wrap" v-if="loading"><t-loading theme="circular" size="40px" /></div>
    <template v-else-if="promotionData">
      <!-- 客户专属链接卡片（放在最前面） -->
      <div class="customer-card">
        <div class="customer-header">
          <t-icon name="shop" size="32px" />
          <div class="customer-title">我的推广二维码</div>
          <div class="customer-subtitle">客户扫码即可浏览商品并预约，业绩计入您的账户</div>
        </div>

        <!-- 二维码展示区域 -->
        <div class="qrcode-section">
          <div class="qrcode-wrapper">
            <!-- 显示带品牌的二维码图片（支持长按保存） -->
            <img
              v-if="qrCodeImageUrl"
              :src="qrCodeImageUrl"
              class="qrcode-img"
              alt="推广二维码"
            />
            <!-- 首次加载使用canvas生成 -->
            <QRCodeComponent
              v-show="!qrCodeImageUrl"
              ref="qrCodeRef"
              :content="promotionData.customerUrl || ''"
              :size="180"
              @ready="onQRCodeReady"
            />
          </div>
          <div class="qrcode-brand">蒙庆烟花·专属优惠</div>
          <div class="qrcode-tip-text">扫一扫，享专属价格</div>
        </div>

        <!-- 二维码操作按钮 -->
        <div class="customer-actions">
          <t-button theme="primary" variant="outline" block size="medium" @click="saveQRCode"><t-icon name="download" />保存二维码</t-button>
          <t-button theme="primary" block size="medium" @click="shareCustomerUrl"><t-icon name="share" />分享给客户</t-button>
        </div>

        <!-- 链接复制区域（折叠显示） -->
        <div class="customer-url-wrap">
          <div class="url-row">
            <div class="url-label">专属链接</div>
            <t-button size="small" variant="text" @click="copyCustomerUrl"><t-icon name="file-copy" size="14px" />复制</t-button>
          </div>
          <div class="url-preview">{{ promotionData.customerUrl }}</div>
        </div>

        <div class="customer-tip">
          <t-icon name="info-circle" size="14px" />
          <span>客户通过此链接预约，将使用您设置的零售价，利润自动结算到您的账户</span>
        </div>
      </div>

      <!-- 邀请推销员卡片 -->
      <div class="invite-card">
        <div class="invite-header">
          <t-icon name="user-add" size="32px" />
          <div class="invite-title">邀请好友成为推销员</div>
          <div class="invite-subtitle">共享优质货源，共创财富未来</div>
        </div>
        <div class="invite-code-wrap">
          <div class="code-label">我的邀请码</div>
          <div class="code-value">{{ promotionData.inviteCode }}</div>
          <t-button theme="primary" size="small" shape="round" @click="copyInviteCode"><t-icon name="file-copy" />复制邀请码</t-button>
        </div>
        <div class="invite-actions">
          <t-button theme="primary" variant="outline" block size="medium" @click="copyInviteUrl"><t-icon name="link" />复制邀请链接</t-button>
          <t-button theme="primary" block size="medium" @click="shareInvite"><t-icon name="share" />分享邀请</t-button>
        </div>
      </div>
      <div class="stats-section">
        <div class="section-title">推广数据</div>
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-value">{{ promotionData.totalInvites }}</div><div class="stat-label">累计邀请</div></div>
          <div class="stat-card"><div class="stat-value highlight">+{{ promotionData.monthlyInvites }}</div><div class="stat-label">本月邀请</div></div>
          <div class="stat-card"><div class="stat-value">{{ promotionData.directInvites }}</div><div class="stat-label">直属成员</div></div>
          <div class="stat-card"><div class="stat-value">{{ promotionData.indirectInvites }}</div><div class="stat-label">间接成员</div></div>
        </div>
      </div>
      <!-- 【2026-01-17 新增】邀请记录入口 -->
      <div class="action-section" @click="router.push('/invite-records')">
        <div class="action-left">
          <t-icon name="usergroup" size="20px" />
          <span>邀请记录</span>
        </div>
        <t-icon name="chevron-right" size="20px" class="action-arrow" />
      </div>
      <!-- 【2026-01-17 新增】推广资料入口 -->
      <div class="action-section" @click="router.push('/promotion-material')">
        <div class="action-left">
          <t-icon name="image" size="20px" />
          <span>推广资料</span>
        </div>
        <div class="action-right">
          <span class="action-desc">海报/文案/素材</span>
          <t-icon name="chevron-right" size="20px" class="action-arrow" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.promotion-page { min-height: 100vh; background: #f5f5f5; padding-bottom: 80px; }
.action-section { background: #fff; margin: 12px; border-radius: 12px; padding: 16px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
.action-left { display: flex; align-items: center; gap: 12px; font-size: 15px; color: #333; }
.action-right { display: flex; align-items: center; gap: 8px; }
.action-desc { font-size: 12px; color: #999; }
.action-arrow { color: #ccc; }
.nav-bar { position: fixed; top: 0; left: 0; right: 0; height: 44px; background: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; z-index: 100; border-bottom: 1px solid #eee; }
.nav-back, .nav-placeholder { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 16px; font-weight: 500; }
.loading-wrap { display: flex; align-items: center; justify-content: center; height: 300px; margin-top: 44px; }
/* 客户专属链接卡片 */
.customer-card { background: linear-gradient(135deg, #2196F3 0%, #64B5F6 100%); margin: 56px 12px 12px; padding: 24px; border-radius: 16px; color: #fff; }
.customer-header { text-align: center; margin-bottom: 20px; }
.customer-title { font-size: 18px; font-weight: 600; margin: 8px 0; }
.customer-subtitle { font-size: 13px; opacity: 0.9; line-height: 1.5; }
/* 二维码展示区域 */
.qrcode-section { display: flex; flex-direction: column; align-items: center; padding: 20px 0; background: rgba(255, 255, 255, 0.1); border-radius: 12px; margin-bottom: 16px; }
.qrcode-wrapper { background: #fff; padding: 12px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
.qrcode-img { width: 228px; height: auto; display: block; border-radius: 8px; }
.qrcode-brand { margin-top: 16px; font-size: 16px; font-weight: 600; color: #fff; }
.qrcode-tip-text { margin-top: 4px; font-size: 12px; color: rgba(255, 255, 255, 0.8); }
/* 链接复制区域 */
.customer-url-wrap { background: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; }
.url-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.url-label { font-size: 12px; opacity: 0.8; }
.url-preview { font-size: 12px; word-break: break-all; line-height: 1.4; background: rgba(0, 0, 0, 0.1); padding: 8px 10px; border-radius: 6px; opacity: 0.9; }
.customer-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.customer-tip { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; opacity: 0.85; line-height: 1.5; background: rgba(255, 255, 255, 0.1); padding: 12px; border-radius: 8px; }
/* 邀请推销员卡片 */
.invite-card { background: linear-gradient(135deg, #E53935 0%, #ff6f61 100%); margin: 12px; padding: 24px; border-radius: 16px; color: #fff; }
.invite-header { text-align: center; margin-bottom: 24px; }
.invite-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.invite-subtitle { font-size: 13px; opacity: 0.9; }
.invite-code-wrap { background: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 16px; }
.code-label { font-size: 13px; opacity: 0.8; margin-bottom: 8px; }
.code-value { font-size: 32px; font-weight: 600; letter-spacing: 4px; margin-bottom: 16px; }
.invite-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.stats-section { background: #fff; margin: 0 12px 12px; border-radius: 12px; padding: 16px; }
.section-title { font-size: 15px; font-weight: 500; color: #333; margin-bottom: 16px; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.stat-card { background: #f5f5f5; border-radius: 8px; padding: 16px; text-align: center; }
.stat-value { font-size: 24px; font-weight: 600; color: #333; margin-bottom: 4px; }
.stat-value.highlight { color: #E53935; }
.stat-label { font-size: 12px; color: #999; }
</style>
