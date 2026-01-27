<script setup lang="ts">
import { ref, computed, onActivated, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import { useUserStore } from '../stores/user'
import { get, post } from '../api'

// 定义组件名称，用于keep-alive缓存
defineOptions({
  name: 'My'
})

const router = useRouter()
const userStore = useUserStore()

// 直接使用store中的响应式userInfo（computed自动响应变化）
const userInfo = computed(() => userStore.userInfo)
const loading = ref(false)

// 用户类型映射（只有推销员才显示角色标签）
const typeMap: Record<string, string> = {
  LEVEL1: '一级推销员',
  LEVEL2: '二级推销员',
  LEVEL3: '三级推销员'
  // WHOLESALE 类型不显示标签，直接显示用户名
}

// 用户类型显示（普通用户/批发商不显示类型标签）
const typeText = computed(() => {
  if (!userInfo.value) return ''
  // 批发商和普通用户不显示类型标签
  if (userInfo.value.type === 'WHOLESALE' || !userInfo.value.type) return ''
  return typeMap[userInfo.value.type] || ''
})

// 是否是批发商
const isWholesale = computed(() => userInfo.value?.type === 'WHOLESALE')

// 是否是代理商（有分润权限）
const isAgent = computed(() => ['LEVEL1', 'LEVEL2', 'LEVEL3'].includes(userInfo.value?.type || ''))

// 显示名称（处理"批发商XXXX"格式）
const displayName = computed(() => {
  if (!userInfo.value?.name) return ''
  const name = userInfo.value.name
  // 如果名称是"批发商XXXX"格式，则只显示手机号后4位
  if (name.startsWith('批发商')) {
    return userInfo.value.phone?.slice(-4) || name.replace('批发商', '')
  }
  return name
})

// 申请代理弹窗
const showApplyDialog = ref(false)
const applyInviteCode = ref('')
const applyLoading = ref(false)

// 预约快捷入口【2026-01-16 预约模式升级】
const orderShortcuts = ref([
  { icon: 'hourglass_empty', label: '待确认', route: '/reservations?status=0', badge: 0 },
  { icon: 'check_circle', label: '已确认', route: '/reservations?status=2', badge: 0 },
  { icon: 'verified', label: '已完成', route: '/reservations?status=3', badge: 0 },
  { icon: 'receipt_long', label: '全部', route: '/reservations', badge: 0 }
])

// 【2026-01-22 营销优化】代金券统计
interface CouponStats {
  total: number
  unused: number
  used: number
  expired: number
  totalAmount: number
  unusedAmount: number
}
const couponStats = ref<CouponStats>({
  total: 0, unused: 0, used: 0, expired: 0, totalAmount: 0, unusedAmount: 0
})

// 加载代金券统计
const loadCouponStats = async () => {
  try {
    const res = await get<CouponStats>('/coupons/stats')
    if (res.code === 0 && res.data) {
      couponStats.value = res.data
    }
  } catch {}
}

const loadOrderCounts = async () => {
  try {
    // 【2026-01-17修复】需要传递phone参数
    if (!userInfo.value?.phone) return

    // 加载预约状态数量
    const res = await get<{
      pending: number
      confirmed: number
      completed: number
      total?: number
    }>('/reservations/counts', { phone: userInfo.value.phone })
    const counts = res.data
    for (const item of orderShortcuts.value) {
      if (item.route.includes('status=0')) item.badge = counts.pending || 0
      else if (item.route.includes('status=2')) item.badge = counts.confirmed || 0
      else if (item.route.includes('status=3')) item.badge = counts.completed || 0
    }
  } catch {}
}

// 服务菜单【2026-01-20 新增活动中心入口和客户预约入口】
const serviceMenus = [
  { icon: 'celebration', label: '活动中心', route: '/activity-center', color: 'danger' },
  { icon: 'groups', label: '客户预约', route: '/customer-orders', color: 'primary' },
  { icon: 'gift', label: '我的代金券', route: '/coupons', color: 'primary' },
  { icon: 'currency_exchange', label: '分润中心', route: '/commission', color: 'primary' },
  { icon: 'share', label: '推广中心', route: '/promotion', color: 'primary' },
  { icon: 'group', label: '我的团队', route: '/team', color: 'primary' },
  { icon: 'sell', label: '定价管理', route: '/pricing', color: 'primary' }
]

// 其他菜单
const otherMenus = [
  { icon: 'location_on', label: '提货地址', action: 'address', color: 'gray' },
  { icon: 'support_agent', label: '联系客服', action: 'contact', color: 'gray' },
  { icon: 'info', label: '关于我们', action: 'about', color: 'gray' }
]

// 点击菜单
const onMenuClick = (route: string) => {
  router.push(route)
}

// 点击订单快捷入口
const onOrderClick = (route: string) => {
  router.push(route)
}

// 查看全部预约【2026-01-16】
const goAllOrders = () => {
  router.push('/reservations')
}

// 复制邀请码（兼容多种环境）
const copyInviteCode = async () => {
  if (!userInfo.value?.inviteCode) return
  const text = userInfo.value.inviteCode

  try {
    // 优先使用现代Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      Toast({ message: '邀请码已复制', theme: 'success' })
      return
    }

    // 降级方案：使用隐藏的textarea
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '-9999px'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()

    const success = document.execCommand('copy')
    document.body.removeChild(textarea)

    if (success) {
      Toast({ message: '邀请码已复制', theme: 'success' })
    } else {
      Toast({ message: '复制失败，请手动复制: ' + text, theme: 'warning' })
    }
  } catch {
    Toast({ message: '复制失败，请手动复制: ' + text, theme: 'warning' })
  }
}

// 查看提货地址
const showPickupAddress = () => {
  Dialog.alert({
    title: '提货地址',
    content: '呼和浩特市和林格尔县盛乐镇姑子板村华门世家1号门面房',
    confirmBtn: '知道了'
  })
}

// 联系客服
const contactService = () => {
  Dialog.alert({
    title: '联系客服',
    content: '客服电话：13190531439 / 15849390600',
    confirmBtn: '知道了'
  })
}

// 关于我们
const showAbout = () => {
  Dialog.alert({
    title: '关于我们',
    content: '蒙庆烟花预约系统 v2.0\n内蒙古蒙庆烟花爆竹有限公司',
    confirmBtn: '知道了'
  })
}

// 处理其他菜单点击
const handleOtherMenu = (action: string) => {
  switch (action) {
    case 'address':
      showPickupAddress()
      break
    case 'contact':
      contactService()
      break
    case 'about':
      showAbout()
      break
  }
}

// 打开申请代理弹窗
const openApplyDialog = () => {
  applyInviteCode.value = ''
  showApplyDialog.value = true
}

// 提交申请代理
const submitApply = async () => {
  if (!applyInviteCode.value.trim()) {
    Toast({ message: '请输入邀请码', theme: 'warning' })
    return
  }

  applyLoading.value = true
  try {
    const res = await post<{ userInfo: any }>('/auth/apply-agent', {
      inviteCode: applyInviteCode.value.toUpperCase()
    })

    // 更新用户信息
    if (res.data.userInfo) {
      userStore.userInfo = res.data.userInfo
      localStorage.setItem('h5_agent_user', JSON.stringify(res.data.userInfo))
    }

    Toast({ message: '申请成功！您已成为推销员', theme: 'success' })
    showApplyDialog.value = false
  } catch (err: any) {
    // 错误已在拦截器处理
  } finally {
    applyLoading.value = false
  }
}

// 退出登录
const logout = () => {
  Dialog.confirm({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    confirmBtn: '确定',
    cancelBtn: '取消',
    onConfirm: () => {
      userStore.clearLogin()
      router.replace('/login')
    }
  })
}

// 刷新用户信息（检测类型变更等）
const refreshUserData = async () => {
  if (!userStore.isLoggedIn) return

  try {
    // 刷新用户信息，检查是否有变更
    const hasChanged = await userStore.refreshUserInfo()
    if (hasChanged) {
      // 用户类型发生变化，显示提示
      Toast({ message: '您的账号信息已更新', theme: 'success' })
    }
  } catch {
    // 忽略刷新错误
  }
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    loadOrderCounts()
    // 【2026-01-26修复】只有推销员才加载代金券统计，普通用户调用会报错
    if (isAgent.value) {
      loadCouponStats()
    }
    refreshUserData() // 页面加载时刷新用户信息
  }
})

onActivated(() => {
  if (userStore.isLoggedIn) {
    loadOrderCounts()
    // 【2026-01-26修复】只有推销员才加载代金券统计，普通用户调用会报错
    if (isAgent.value) {
      loadCouponStats()
    }
    refreshUserData() // 页面激活时刷新用户信息
  }
})
</script>

<template>
  <div class="my-page">
    <!-- 顶部导航栏 -->
    <nav class="nav-bar">
      <div class="nav-icon">
        <span class="material-symbols-outlined">settings</span>
      </div>
      <h2 class="nav-title">个人中心</h2>
      <div class="nav-icon">
        <span class="material-symbols-outlined">chat_bubble</span>
      </div>
    </nav>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="32px" />
    </div>

    <!-- 未登录状态 -->
    <div class="login-prompt-section" v-else-if="!userInfo">
      <div class="profile-header guest">
        <div class="profile-pattern">
          <span class="material-symbols-outlined">filter_vintage</span>
        </div>
        <div class="profile-content" @click="router.push('/login?force=1')">
          <div class="avatar-wrap">
            <div class="avatar guest-avatar">
              <span class="material-symbols-outlined">person</span>
            </div>
          </div>
          <div class="user-info">
            <p class="user-name">点击登录</p>
            <p class="user-hint">登录后查看更多功能</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 已登录状态 -->
    <template v-else>
      <!-- 用户头部 -->
      <div class="profile-header">
        <div class="profile-pattern">
          <span class="material-symbols-outlined">filter_vintage</span>
        </div>
        <div class="profile-content">
          <div class="avatar-wrap">
            <div class="avatar">
              <span class="material-symbols-outlined">person</span>
            </div>
            <div class="verified-badge">
              <span class="material-symbols-outlined">verified</span>
            </div>
          </div>
          <div class="user-info">
            <div class="name-row">
              <p class="user-name">{{ displayName }}</p>
              <span class="user-badge" v-if="typeText">{{ typeText }}</span>
            </div>
            <div class="invite-row" @click="copyInviteCode" v-if="userInfo.inviteCode">
              <span class="material-symbols-outlined">stars</span>
              <p class="invite-text">邀请码: {{ userInfo.inviteCode }}</p>
              <span class="material-symbols-outlined copy-icon">content_copy</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 统计卡片 - 代理商显示分润信息 -->
      <div class="stats-card" v-if="isAgent">
        <div class="stat-item">
          <p class="stat-value">¥{{ Number(userInfo.balance || 0).toFixed(2) }}</p>
          <p class="stat-label">账户余额</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <p class="stat-value">¥{{ Number(userInfo.totalCommission || 0).toFixed(2) }}</p>
          <p class="stat-label">累计分润</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item action">
          <button class="checkin-btn" @click="router.push('/commission')">
            查看
          </button>
        </div>
      </div>

      <!-- 批发商升级提示卡片 -->
      <div class="upgrade-card" v-if="isWholesale">
        <div class="upgrade-content">
          <div class="upgrade-icon">
            <span class="material-symbols-outlined">trending_up</span>
          </div>
          <div class="upgrade-text">
            <p class="upgrade-title">升级成为推销员</p>
            <p class="upgrade-desc">享受更低进货价 + 分润收益</p>
          </div>
        </div>
        <button class="upgrade-btn" @click="openApplyDialog">
          立即申请
        </button>
      </div>

      <!-- 【2026-01-22 营销优化】活动入口卡片 -->
      <div class="activity-entry-card" v-if="isAgent" @click="router.push('/activity-center')">
        <div class="activity-entry-left">
          <div class="activity-icon-wrap">
            <span class="material-symbols-outlined">celebration</span>
          </div>
          <div class="activity-entry-info">
            <p class="activity-entry-title">活动中心</p>
            <p class="activity-entry-desc">完成任务赚取代金券奖励</p>
          </div>
        </div>
        <div class="activity-entry-right">
          <div class="coupon-stat" v-if="couponStats.unused > 0">
            <span class="coupon-count">{{ couponStats.unused }}张</span>
            <span class="coupon-amount">¥{{ couponStats.unusedAmount }}</span>
          </div>
          <span class="material-symbols-outlined entry-arrow">chevron_right</span>
        </div>
      </div>
    </template>

    <!-- 我的预约【2026-01-16】 -->
    <div class="section order-section">
      <div class="section-header">
        <h3 class="section-title">我的预约</h3>
        <div class="view-all" @click="goAllOrders">
          <span>查看全部</span>
          <span class="material-symbols-outlined">chevron_right</span>
        </div>
      </div>
      <div class="order-grid">
        <div
          class="order-item"
          v-for="item in orderShortcuts"
          :key="item.label"
          @click="onOrderClick(item.route)"
        >
          <div class="order-icon-wrap">
            <span class="material-symbols-outlined">{{ item.icon }}</span>
            <span class="order-badge" v-if="item.badge > 0">{{ item.badge }}</span>
          </div>
          <p class="order-label">{{ item.label }}</p>
        </div>
      </div>
    </div>

    <!-- 我的服务 - 仅代理商可见 -->
    <div class="section service-section" v-if="isAgent">
      <div class="menu-group">
        <div
          class="menu-item"
          v-for="item in serviceMenus"
          :key="item.label"
          @click="onMenuClick(item.route)"
        >
          <span class="material-symbols-outlined menu-icon primary">{{ item.icon }}</span>
          <span class="menu-label">{{ item.label }}</span>
          <span class="material-symbols-outlined menu-arrow">chevron_right</span>
        </div>
      </div>
    </div>

    <!-- 批发商专属菜单 -->
    <div class="section service-section" v-if="isWholesale">
      <div class="menu-group">
        <div class="menu-item" @click="openApplyDialog">
          <span class="material-symbols-outlined menu-icon gold">workspace_premium</span>
          <span class="menu-label">申请成为推销员</span>
          <span class="menu-tag">享分润</span>
          <span class="material-symbols-outlined menu-arrow">chevron_right</span>
        </div>
      </div>
    </div>

    <!-- 其他服务 -->
    <div class="section other-section">
      <div class="menu-group">
        <div
          class="menu-item"
          v-for="item in otherMenus"
          :key="item.label"
          @click="handleOtherMenu(item.action)"
        >
          <span class="material-symbols-outlined menu-icon gray">{{ item.icon }}</span>
          <span class="menu-label">{{ item.label }}</span>
          <span class="material-symbols-outlined menu-arrow">chevron_right</span>
        </div>
      </div>
    </div>

    <!-- 退出登录 -->
    <div class="logout-section" v-if="userInfo">
      <button class="logout-btn" @click="logout">退出登录</button>
      <p class="version">Version 2.0 - CNY Edition</p>
    </div>

    <!-- 申请代理弹窗 -->
    <div class="apply-overlay" v-if="showApplyDialog" @click.self="showApplyDialog = false">
      <div class="apply-dialog">
        <div class="apply-header">
          <span class="material-symbols-outlined apply-close" @click="showApplyDialog = false">close</span>
          <h3 class="apply-title">申请成为推销员</h3>
        </div>

        <div class="apply-benefits">
          <div class="benefit-item">
            <span class="material-symbols-outlined">payments</span>
            <span>更低进货价</span>
          </div>
          <div class="benefit-item">
            <span class="material-symbols-outlined">trending_up</span>
            <span>享受分润收益</span>
          </div>
          <div class="benefit-item">
            <span class="material-symbols-outlined">group_add</span>
            <span>发展下级代理</span>
          </div>
        </div>

        <div class="apply-form">
          <label class="apply-label">请输入推销员邀请码</label>
          <input
            v-model="applyInviteCode"
            type="text"
            class="apply-input"
            placeholder="请输入邀请码"
            maxlength="10"
          />
          <p class="apply-hint">邀请码可向现有推销员索取</p>
        </div>

        <button
          class="apply-submit"
          :class="{ loading: applyLoading }"
          :disabled="applyLoading"
          @click="submitApply"
        >
          {{ applyLoading ? '提交中...' : '提交申请' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-page {
  min-height: 100vh;
  background: var(--bg-page, #FDF6F7);
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}

/* 导航栏 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.nav-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon .material-symbols-outlined {
  font-size: 24px;
  color: var(--text-primary, #181111);
}

.nav-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary, #181111);
  flex: 1;
  text-align: center;
}

/* 加载中 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

/* 用户头部 */
.profile-header {
  position: relative;
  padding: 24px 16px 80px;
  background: linear-gradient(135deg, #EF062D 0%, #C11010 100%);
  overflow: hidden;
}

.profile-header.guest {
  padding-bottom: 40px;
}

.profile-pattern {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.1;
  pointer-events: none;
}

.profile-pattern .material-symbols-outlined {
  font-size: 300px;
  color: white;
}

.profile-content {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-wrap {
  position: relative;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid var(--gold, #E1B12C);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.avatar .material-symbols-outlined {
  font-size: 36px;
  color: white;
}

.guest-avatar {
  border-color: rgba(255, 255, 255, 0.3);
}

.verified-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 24px;
  height: 24px;
  background: var(--gold, #E1B12C);
  border-radius: 50%;
  border: 2px solid #EF062D;
  display: flex;
  align-items: center;
  justify-content: center;
}

.verified-badge .material-symbols-outlined {
  font-size: 12px;
  color: white;
}

.user-info {
  flex: 1;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-size: 20px;
  font-weight: 700;
  color: white;
}

.user-hint {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4px;
}

.user-badge {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.invite-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.invite-row .material-symbols-outlined {
  font-size: 14px;
  color: var(--gold, #E1B12C);
}

.invite-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.copy-icon {
  font-size: 14px !important;
  color: rgba(255, 255, 255, 0.6) !important;
}

/* 统计卡片 */
.stats-card {
  margin: -48px 16px 0;
  position: relative;
  z-index: 20;
  background: white;
  border-radius: 16px;
  padding: 20px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 8px 24px rgba(233, 12, 31, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-item.action {
  flex: 0.8;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary, #EF062D);
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: #f0f0f0;
}

.checkin-btn {
  background: linear-gradient(135deg, #f3d490 0%, #E1B12C 100%);
  color: white;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 20px;
  border-radius: 9999px;
  border: none;
  box-shadow: 0 2px 8px rgba(225, 177, 44, 0.3);
}

/* 区块样式 */
.section {
  margin: 16px;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.order-section {
  margin-top: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #181111);
}

.view-all {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  color: #999;
}

.view-all .material-symbols-outlined {
  font-size: 16px;
}

/* 订单网格 */
.order-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 8px 16px 20px;
}

.order-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  cursor: pointer;
  transition: all 0.2s;
}

.order-item:active {
  transform: scale(0.95);
  opacity: 0.7;
}

.order-icon-wrap {
  position: relative;
}

.order-icon-wrap .material-symbols-outlined {
  font-size: 26px;
  color: #555;
}

.order-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  min-width: 16px;
  height: 16px;
  background: var(--primary, #EF062D);
  color: white;
  font-size: 10px;
  font-weight: 700;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.order-label {
  font-size: 12px;
  color: #666;
}

/* 菜单组 */
.menu-group {
  padding: 8px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  cursor: pointer;
  transition: background 0.2s;
  border-radius: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background: #f5f5f5;
}

.menu-icon {
  font-size: 22px;
}

.menu-icon.primary {
  color: var(--primary, #EF062D);
}

.menu-icon.gray {
  color: #999;
}

.menu-label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #181111);
}

.menu-arrow {
  font-size: 20px;
  color: #ccc;
}

/* 退出登录 */
.logout-section {
  padding: 32px 16px;
}

.logout-btn {
  width: 100%;
  background: white;
  color: #999;
  font-size: 14px;
  font-weight: 700;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:active {
  background: #f5f5f5;
}

.version {
  text-align: center;
  font-size: 10px;
  color: #ccc;
  margin-top: 24px;
  text-transform: uppercase;
  letter-spacing: 2px;
}

/* 未登录状态 */
.login-prompt-section .profile-content {
  cursor: pointer;
}

/* 批发商升级卡片 */
.upgrade-card {
  margin: -48px 16px 0;
  position: relative;
  z-index: 20;
  background: linear-gradient(135deg, #f3d490 0%, #E1B12C 100%);
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 8px 24px rgba(225, 177, 44, 0.3);
}

.upgrade-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.upgrade-icon {
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upgrade-icon .material-symbols-outlined {
  font-size: 24px;
  color: #1a1a1a;
}

.upgrade-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.upgrade-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
}

.upgrade-desc {
  font-size: 12px;
  color: rgba(26, 26, 26, 0.7);
}

.upgrade-btn {
  background: #1a1a1a;
  color: #E1B12C;
  font-size: 12px;
  font-weight: 700;
  padding: 10px 16px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
}

/* 菜单标签 */
.menu-tag {
  background: linear-gradient(135deg, #f3d490 0%, #E1B12C 100%);
  color: #1a1a1a;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  margin-right: 4px;
}

.menu-icon.gold {
  color: #E1B12C;
}

/* 申请代理弹窗 */
.apply-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.apply-dialog {
  width: 100%;
  max-width: 500px;
  background: white;
  border-radius: 24px 24px 0 0;
  padding: 24px;
  padding-bottom: calc(24px + 80px + env(safe-area-inset-bottom));
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.apply-header {
  position: relative;
  text-align: center;
  margin-bottom: 20px;
}

.apply-close {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 24px;
  color: #999;
  cursor: pointer;
}

.apply-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary, #181111);
}

.apply-benefits {
  display: flex;
  justify-content: space-around;
  padding: 16px;
  background: linear-gradient(135deg, rgba(243, 212, 144, 0.2) 0%, rgba(225, 177, 44, 0.2) 100%);
  border-radius: 12px;
  margin-bottom: 24px;
}

.benefit-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.benefit-item .material-symbols-outlined {
  font-size: 24px;
  color: #E1B12C;
}

.benefit-item span:last-child {
  font-size: 12px;
  color: #666;
}

.apply-form {
  margin-bottom: 24px;
}

.apply-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #181111);
  margin-bottom: 8px;
}

.apply-input {
  width: 100%;
  height: 52px;
  padding: 0 16px;
  font-size: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  outline: none;
  transition: border-color 0.2s;
  text-transform: uppercase;
}

.apply-input:focus {
  border-color: #E1B12C;
}

.apply-hint {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.apply-submit {
  width: 100%;
  height: 52px;
  background: linear-gradient(135deg, #f3d490 0%, #E1B12C 100%);
  color: #1a1a1a;
  font-size: 16px;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.apply-submit:active {
  transform: scale(0.98);
}

.apply-submit.loading {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 【2026-01-22 营销优化】活动入口卡片 */
.activity-entry-card {
  margin: 12px 16px 0;
  position: relative;
  z-index: 15;
  background: linear-gradient(135deg, #FF4D6D 0%, #EF062D 100%);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(239, 6, 45, 0.25);
  transition: transform 0.2s, box-shadow 0.2s;
}

.activity-entry-card:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(239, 6, 45, 0.2);
}

.activity-entry-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.activity-icon-wrap {
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-icon-wrap .material-symbols-outlined {
  font-size: 24px;
  color: #fff;
}

.activity-entry-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.activity-entry-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.activity-entry-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.activity-entry-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.coupon-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.coupon-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.coupon-amount {
  font-size: 18px;
  font-weight: 800;
  color: #fff;
}

.entry-arrow {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.7);
}
</style>
