<script setup lang="ts">
/**
 * 领券中心页面
 * 【2026-01-19 活动系统增强】展示可领取的代金券活动，支持一键领取
 * 【2026-01-23 功能整合】整合新人任务、本周任务进度、即时奖励规则
 */
import { ref, onMounted, nextTick, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import { get, post } from '../api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

// 活动类型
interface CouponActivity {
  id: number
  name: string
  couponAmount: number
  totalCount: number
  issuedCount: number
  limitPerUser: number
  startTime: string
  endTime: string
  expiredAt: string
  status: string
  claimedCount: number
  canClaim: boolean
  remainingStock: number
}

// 周进度数据
interface WeeklyProgress {
  weekStart: string
  weekEnd: string
  completedOrders: number
  completedAmount: number
  approvedShares: number
  newRecruits: number
  salesBonusPaid: boolean
  shareBonusPaid: boolean
  recruitBonusPaid: boolean
  salesReward: number
  shareReward: number
  recruitReward: number
  totalReward: number
}

// 新人任务状态
interface NewbieTasks {
  isNewUser: boolean
  tasks: {
    register: { completed: boolean; amount: number; paidAt: string | null }
    firstShare: { completed: boolean; amount: number; paidAt: string | null }
    firstReservation: { completed: boolean; amount: number; paidAt: string | null }
    firstComplete: { completed: boolean; amount: number; paidAt: string | null }
  }
  progress: { completed: number; total: number; percent: number }
  amount: { earned: number; total: number; remaining: number }
}

// 数据
const activities = ref<CouponActivity[]>([])
const loading = ref(true)
const claimingId = ref<number | null>(null)
const progress = ref<WeeklyProgress | null>(null)
const newbieTasks = ref<NewbieTasks | null>(null)
const rulesExpanded = ref(false)

// 代金券统计
const couponStats = ref({
  unused: 0,
  totalAmount: 0,
})

// 周期倒计时
const countdown = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 })
let countdownTimer: number | null = null

// 加载活动列表
const loadActivities = async () => {
  try {
    const res = await get<CouponActivity[]>('/h5/coupon-activities')
    if (res.data) {
      activities.value = res.data
    }
  } catch (error: any) {
    console.error('加载活动列表失败:', error)
  }
}

// 加载周进度
const loadWeeklyProgress = async () => {
  try {
    const res = await get('/weekly/progress')
    if (res.code === 0) {
      progress.value = res.data
    }
  } catch (err) {
    console.error('加载周进度失败:', err)
  }
}

// 加载代金券统计
const loadCouponStats = async () => {
  try {
    const res = await get('/coupons/stats')
    if (res.code === 0) {
      couponStats.value = {
        unused: res.data.unused || 0,
        totalAmount: res.data.unusedAmount || 0,
      }
    }
  } catch (err) {
    console.error('加载代金券统计失败:', err)
  }
}

// 加载新人任务状态
const loadNewbieTasks = async () => {
  try {
    const res = await get<NewbieTasks>('/weekly/newbie-tasks')
    if (res.code === 0) {
      newbieTasks.value = res.data
    }
  } catch (err) {
    console.error('加载新人任务失败:', err)
  }
}

// 计算周期倒计时
const calculateCountdown = () => {
  if (!progress.value?.weekEnd) return

  const now = new Date()
  // 下周一凌晨0点结算
  const weekEnd = new Date(progress.value.weekEnd)
  weekEnd.setDate(weekEnd.getDate() + 1)
  weekEnd.setHours(0, 0, 0, 0)

  const diff = weekEnd.getTime() - now.getTime()
  if (diff <= 0) {
    countdown.value = { days: 0, hours: 0, minutes: 0, seconds: 0 }
    return
  }

  countdown.value = {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000)
  }
}

// 开始倒计时
const startCountdown = () => {
  calculateCountdown()
  countdownTimer = window.setInterval(calculateCountdown, 1000)
}

// 领取代金券
const claimCoupon = async (activity: CouponActivity) => {
  if (claimingId.value) return
  if (!activity.canClaim) {
    if (activity.claimedCount >= activity.limitPerUser) {
      Toast({ message: '您已达到领取上限', theme: 'warning' })
    } else if (activity.remainingStock <= 0) {
      Toast({ message: '代金券已领完', theme: 'warning' })
    }
    return
  }

  claimingId.value = activity.id
  try {
    const res = await post<{ code: string }>(`/h5/coupon-activities/${activity.id}/claim`)
    if (res.data) {
      Dialog.confirm({
        title: '领取成功',
        content: `恭喜您获得 ¥${activity.couponAmount} 代金券\n券码: ${res.data.code}`,
        confirmBtn: '查看我的代金券',
        cancelBtn: '继续领取',
        onConfirm: () => {
          router.push('/coupons')
        }
      })
      // 刷新列表
      loadActivities()
      loadCouponStats()
    }
  } catch (error: any) {
    Toast({ message: error.message || '领取失败', theme: 'error' })
  } finally {
    claimingId.value = null
  }
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 格式化时间范围
const formatTimeRange = (start: string, end: string) => {
  return `${formatDate(start)} - ${formatDate(end)}`
}

// 计算周销售进度
const salesProgress = computed(() => {
  if (!progress.value) return { current: 0, target: 3, percent: 0, reward: 0 }
  const orders = progress.value.completedOrders
  let target = 3
  if (orders >= 10) {
    target = 10
  } else if (orders >= 5) {
    target = 10
  } else if (orders >= 3) {
    target = 5
  }
  return {
    current: orders,
    target,
    percent: Math.min((orders / target) * 100, 100),
    reward: progress.value.salesReward,
  }
})

// 计算发圈进度
const shareProgress = computed(() => {
  if (!progress.value) return { current: 0, target: 7, percent: 0, reward: 0 }
  const shares = progress.value.approvedShares
  return {
    current: shares,
    target: 7,
    percent: Math.min((shares / 7) * 100, 100),
    reward: progress.value.shareReward,
  }
})

// 计算拉新进度
const recruitProgress = computed(() => {
  if (!progress.value) return { current: 0, target: 3, percent: 0, reward: 0 }
  const recruits = progress.value.newRecruits
  return {
    current: recruits,
    target: 3,
    percent: Math.min((recruits / 3) * 100, 100),
    reward: progress.value.recruitReward,
  }
})

// 格式化周期
const formatWeekRange = computed(() => {
  if (!progress.value) return ''
  const start = new Date(progress.value.weekStart)
  const end = new Date(progress.value.weekEnd)
  return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`
})

// 计算新人任务是否有未完成
const hasUnfinishedNewbieTasks = computed(() => {
  if (!newbieTasks.value) return false
  const tasks = newbieTasks.value.tasks
  return !tasks.firstShare.completed || !tasks.firstReservation.completed || !tasks.firstComplete.completed
})

// 跳转页面
const goTo = (path: string) => {
  router.push(path)
}

// 返回
const goBack = () => {
  router.back()
}

// 初始化加载
const loadData = async () => {
  loading.value = true
  await Promise.all([
    loadActivities(),
    loadWeeklyProgress(),
    loadCouponStats(),
    loadNewbieTasks()
  ])
  loading.value = false
  // 加载完成后启动倒计时
  startCountdown()
}

onMounted(async () => {
  // 等待一个微任务周期，确保从登录页跳转过来时token已存储
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 50))

  // 检查登录状态
  if (!userStore.isLoggedIn) {
    Toast({ message: '请先登录', theme: 'warning' })
    router.replace('/login?redirect=/coupon-center')
    return
  }

  loadData()
})

// 清理倒计时
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})
</script>

<template>
  <div class="coupon-center">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">领券中心</div>
      <div class="nav-right" @click="router.push('/coupons')">
        我的券
      </div>
    </div>

    <!-- 顶部Banner -->
    <div class="banner">
      <div class="banner-content">
        <div class="banner-title">新春领券福利</div>
        <div class="banner-desc">完成任务领代金券，到店消费可抵扣</div>
      </div>
      <div class="banner-icon">🧧</div>
    </div>

    <div class="main-content" v-if="!loading">
      <!-- 新人任务卡片（有未完成任务时显示） -->
      <div class="newbie-card" v-if="hasUnfinishedNewbieTasks && newbieTasks">
        <div class="newbie-header">
          <div class="newbie-icon">
            <t-icon name="star-filled" />
          </div>
          <div class="newbie-title">新人专属任务</div>
          <div class="newbie-amount">共¥{{ newbieTasks.amount.total }}</div>
        </div>
        <div class="newbie-tasks">
          <div class="newbie-task" :class="{ completed: newbieTasks.tasks.register.completed }">
            <div class="task-check">
              <t-icon :name="newbieTasks.tasks.register.completed ? 'check-circle-filled' : 'circle'" />
            </div>
            <span class="task-label">注册成功</span>
            <span class="task-amount">+¥5</span>
          </div>
          <div class="newbie-task" :class="{ completed: newbieTasks.tasks.firstShare.completed }">
            <div class="task-check">
              <t-icon :name="newbieTasks.tasks.firstShare.completed ? 'check-circle-filled' : 'circle'" />
            </div>
            <span class="task-label">首次发圈</span>
            <span class="task-amount">+¥5</span>
            <span class="task-action-btn" v-if="!newbieTasks.tasks.firstShare.completed" @click="goTo('/share-upload')">去完成</span>
          </div>
          <div class="newbie-task" :class="{ completed: newbieTasks.tasks.firstReservation.completed }">
            <div class="task-check">
              <t-icon :name="newbieTasks.tasks.firstReservation.completed ? 'check-circle-filled' : 'circle'" />
            </div>
            <span class="task-label">首次有客户预约</span>
            <span class="task-amount">+¥10</span>
            <span class="task-action-btn" v-if="!newbieTasks.tasks.firstReservation.completed" @click="goTo('/promotion')">去推广</span>
          </div>
          <div class="newbie-task" :class="{ completed: newbieTasks.tasks.firstComplete.completed }">
            <div class="task-check">
              <t-icon :name="newbieTasks.tasks.firstComplete.completed ? 'check-circle-filled' : 'circle'" />
            </div>
            <span class="task-label">首单成交</span>
            <span class="task-amount">+¥20</span>
            <span class="task-status" v-if="!newbieTasks.tasks.firstComplete.completed">等待中</span>
          </div>
        </div>
        <div class="newbie-progress">
          已获得 <span class="earned">¥{{ newbieTasks.amount.earned }}</span>，还差 <span class="remaining">¥{{ newbieTasks.amount.remaining }}</span>
        </div>
      </div>

      <!-- 本周进度卡片 -->
      <div class="week-card" v-if="progress">
        <div class="week-header">
          <div class="week-title">本周任务进度</div>
          <div class="week-range">{{ formatWeekRange }}</div>
        </div>
        <!-- 周期倒计时 -->
        <div class="week-countdown">
          <t-icon name="time" />
          <span>距本周结算还剩 </span>
          <span class="countdown-value">{{ countdown.days }}</span>天
          <span class="countdown-value">{{ countdown.hours }}</span>时
          <span class="countdown-value">{{ countdown.minutes }}</span>分
          <span class="countdown-value">{{ countdown.seconds }}</span>秒
        </div>

        <!-- 周销售任务 -->
        <div class="task-item">
          <div class="task-header">
            <div class="task-info">
              <div class="task-icon sales">
                <t-icon name="chart-bar" />
              </div>
              <div class="task-name">周销售奖励</div>
            </div>
            <div class="task-reward" v-if="salesProgress.reward > 0">
              <span class="reward-amount">¥{{ salesProgress.reward }}</span>
              <t-tag v-if="progress?.salesBonusPaid" theme="success" size="small">已领取</t-tag>
            </div>
          </div>
          <div class="task-progress">
            <div class="progress-bar">
              <div class="progress-fill sales" :style="{ width: salesProgress.percent + '%' }" />
            </div>
            <div class="progress-text">{{ salesProgress.current }} / {{ salesProgress.target }} 单</div>
          </div>
          <div class="task-tiers">
            <span :class="{ active: (progress?.completedOrders ?? 0) >= 3 }">3单/¥30</span>
            <span :class="{ active: (progress?.completedOrders ?? 0) >= 5 }">5单/¥80</span>
            <span :class="{ active: (progress?.completedOrders ?? 0) >= 10 }">10单/¥200</span>
          </div>
        </div>

        <!-- 发圈全勤任务 -->
        <div class="task-item">
          <div class="task-header">
            <div class="task-info">
              <div class="task-icon share">
                <t-icon name="share" />
              </div>
              <div class="task-name">发圈全勤奖励</div>
            </div>
            <div class="task-reward" v-if="shareProgress.reward > 0">
              <span class="reward-amount">¥{{ shareProgress.reward }}</span>
              <t-tag v-if="progress?.shareBonusPaid" theme="success" size="small">已领取</t-tag>
            </div>
          </div>
          <div class="task-progress">
            <div class="progress-bar">
              <div class="progress-fill share" :style="{ width: shareProgress.percent + '%' }" />
            </div>
            <div class="progress-text">{{ shareProgress.current }} / 7 天</div>
          </div>
          <div class="task-action" @click="goTo('/share-upload')">
            去发圈打卡 <t-icon name="chevron-right" />
          </div>
        </div>

        <!-- 周拉新任务 -->
        <div class="task-item">
          <div class="task-header">
            <div class="task-info">
              <div class="task-icon recruit">
                <t-icon name="usergroup-add" />
              </div>
              <div class="task-name">周拉新奖励</div>
            </div>
            <div class="task-reward" v-if="recruitProgress.reward > 0">
              <span class="reward-amount">¥{{ recruitProgress.reward }}</span>
              <t-tag v-if="progress?.recruitBonusPaid" theme="success" size="small">已领取</t-tag>
            </div>
          </div>
          <div class="task-progress">
            <div class="progress-bar">
              <div class="progress-fill recruit" :style="{ width: recruitProgress.percent + '%' }" />
            </div>
            <div class="progress-text">{{ recruitProgress.current }} / 3 人</div>
          </div>
          <div class="task-action" @click="goTo('/promotion')">
            去邀请好友 <t-icon name="chevron-right" />
          </div>
        </div>

        <!-- 总奖励 -->
        <div class="total-reward" v-if="(progress?.totalReward ?? 0) > 0">
          <div class="total-label">本周可得奖励</div>
          <div class="total-amount">¥{{ progress?.totalReward ?? 0 }}</div>
        </div>
      </div>

      <!-- 快捷入口（2格） -->
      <div class="quick-entry">
        <div class="entry-grid-2">
          <div class="entry-item-h" @click="goTo('/coupons')">
            <div class="entry-icon-h coupon">
              <t-icon name="gift" />
            </div>
            <div class="entry-name-h">代金券</div>
            <div class="entry-value-h" v-if="couponStats.unused > 0">{{ couponStats.unused }}张</div>
          </div>

          <div class="entry-item-h" @click="goTo('/my-shares')">
            <div class="entry-icon-h share">
              <t-icon name="share" />
            </div>
            <div class="entry-name-h">我的发圈</div>
          </div>
        </div>
      </div>

      <!-- 活动列表 -->
      <div class="activities-section">
        <div class="section-title">
          <t-icon name="ticket" size="16px" />
          <span>代金券活动</span>
        </div>

        <!-- 空状态 -->
        <div class="empty-state" v-if="activities.length === 0">
          <t-icon name="gift" size="48px" class="empty-icon" />
          <p class="empty-title">暂无可领取的代金券</p>
          <p class="empty-desc">完成上方任务即可获得代金券奖励</p>
        </div>

        <!-- 活动卡片列表 -->
        <div class="activities-list" v-else>
          <div
            v-for="activity in activities"
            :key="activity.id"
            class="activity-card"
            :class="{ disabled: !activity.canClaim }"
          >
            <!-- 左侧金额 -->
            <div class="card-left">
              <div class="coupon-amount">
                <span class="symbol">¥</span>
                <span class="value">{{ activity.couponAmount }}</span>
              </div>
              <div class="limit-text">每人限领{{ activity.limitPerUser }}张</div>
            </div>

            <!-- 中间信息 -->
            <div class="card-center">
              <div class="activity-name">{{ activity.name }}</div>
              <div class="activity-time">
                <t-icon name="time" size="14px" />
                <span>{{ formatTimeRange(activity.startTime, activity.endTime) }}</span>
              </div>
              <div class="activity-stock">
                <span v-if="activity.remainingStock > 0">剩余 {{ activity.remainingStock }} 张</span>
                <span v-else class="sold-out">已领完</span>
              </div>
              <div class="expire-info">
                有效期至 {{ formatDate(activity.expiredAt) }}
              </div>
            </div>

            <!-- 右侧按钮 -->
            <div class="card-right">
              <button
                class="claim-btn"
                :class="{
                  loading: claimingId === activity.id,
                  disabled: !activity.canClaim
                }"
                @click="claimCoupon(activity)"
              >
                <template v-if="claimingId === activity.id">
                  <t-loading theme="circular" size="16px" />
                </template>
                <template v-else-if="activity.claimedCount >= activity.limitPerUser">
                  已领取
                </template>
                <template v-else-if="activity.remainingStock <= 0">
                  已领完
                </template>
                <template v-else>
                  立即领取
                </template>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 即时奖励说明（可折叠） -->
      <div class="reward-rules">
        <div class="rules-header" @click="rulesExpanded = !rulesExpanded">
          <div class="section-title-inline">
            <t-icon name="info-circle" size="16px" />
            <span>即时奖励规则</span>
          </div>
          <t-icon :name="rulesExpanded ? 'chevron-up' : 'chevron-down'" class="rules-toggle" />
        </div>
        <div class="rule-list" v-show="rulesExpanded">
          <div class="rule-item">
            <div class="rule-icon register">
              <t-icon name="user-add" />
            </div>
            <div class="rule-content">
              <div class="rule-name">注册奖励</div>
              <div class="rule-desc">新推销员注册即送5元代金券</div>
            </div>
          </div>
          <div class="rule-item">
            <div class="rule-icon reservation">
              <t-icon name="calendar" />
            </div>
            <div class="rule-content">
              <div class="rule-name">首预约奖励</div>
              <div class="rule-desc">首次有客户预约获得10元代金券</div>
            </div>
          </div>
          <div class="rule-item">
            <div class="rule-icon complete">
              <t-icon name="check-circle" />
            </div>
            <div class="rule-content">
              <div class="rule-name">首单成交奖励</div>
              <div class="rule-desc">首次有订单完成获得20元代金券</div>
            </div>
          </div>
          <div class="rule-item">
            <div class="rule-icon recruit">
              <t-icon name="usergroup-add" />
            </div>
            <div class="rule-content">
              <div class="rule-name">拉新奖励</div>
              <div class="rule-desc">邀请新推销员注册获得15元代金券</div>
            </div>
          </div>
          <div class="rule-item">
            <div class="rule-icon share">
              <t-icon name="share" />
            </div>
            <div class="rule-content">
              <div class="rule-name">首发圈奖励</div>
              <div class="rule-desc">首次发圈审核通过获得5元代金券</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="rules-section">
        <div class="section-title">
          <t-icon name="help-circle" size="16px" />
          <span>使用说明</span>
        </div>
        <div class="rules-list">
          <div class="rule-text">1. 代金券仅限本人到门店购买烟花时使用</div>
          <div class="rule-text">2. 每张代金券只能使用一次，不找零</div>
          <div class="rule-text">3. 代金券过期后自动作废</div>
          <div class="rule-text">4. 周期奖励每周一凌晨自动结算</div>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <div class="loading-wrap" v-else>
      <t-loading theme="circular" size="32px" />
      <p>加载中...</p>
    </div>
  </div>
</template>

<style scoped>
.coupon-center {
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
  background: linear-gradient(135deg, #E53935 0%, #ff6f61 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  z-index: 100;
  color: #fff;
}

.nav-back {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  font-size: 16px;
  font-weight: 500;
}

.nav-right {
  font-size: 14px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 14px;
}

.banner {
  background: linear-gradient(135deg, #E53935 0%, #ff6f61 100%);
  padding: 60px 20px 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.banner-content {
  color: #fff;
}

.banner-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.banner-desc {
  font-size: 14px;
  opacity: 0.9;
}

.banner-icon {
  font-size: 48px;
}

.main-content {
  margin-top: -20px;
  padding: 0 12px;
  position: relative;
}

/* 新人任务卡片 */
.newbie-card {
  background: linear-gradient(135deg, #FFF7E6 0%, #FFE7BA 100%);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid rgba(250, 173, 20, 0.3);
}

.newbie-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.newbie-icon {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #FAAD14 0%, #F5A623 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
}

.newbie-title {
  font-size: 15px;
  font-weight: 600;
  color: #AD6800;
  flex: 1;
}

.newbie-amount {
  font-size: 14px;
  font-weight: 600;
  color: #D46B08;
}

.newbie-tasks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.newbie-task {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
}

.newbie-task.completed {
  opacity: 0.6;
}

.task-check {
  font-size: 18px;
  color: #D46B08;
}

.newbie-task.completed .task-check {
  color: #52c41a;
}

.task-label {
  flex: 1;
  font-size: 13px;
  color: #333;
}

.task-amount {
  font-size: 14px;
  font-weight: 600;
  color: #D46B08;
}

.newbie-task.completed .task-amount {
  color: #52c41a;
}

.task-action-btn {
  font-size: 12px;
  color: #fff;
  background: linear-gradient(135deg, #FAAD14 0%, #F5A623 100%);
  padding: 4px 10px;
  border-radius: 12px;
  cursor: pointer;
}

.task-status {
  font-size: 11px;
  color: #999;
}

.newbie-progress {
  font-size: 12px;
  color: #AD6800;
  text-align: center;
}

.newbie-progress .earned {
  color: #52c41a;
  font-weight: 600;
}

.newbie-progress .remaining {
  color: #D46B08;
  font-weight: 600;
}

/* 周期倒计时 */
.week-countdown {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #FFF2E8 0%, #FFE7BA 100%);
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 12px;
  color: #AD6800;
}

.week-countdown .t-icon {
  font-size: 16px;
  color: #FA8C16;
}

.countdown-value {
  display: inline-block;
  min-width: 20px;
  text-align: center;
  font-weight: 700;
  color: #D46B08;
  background: rgba(250, 140, 22, 0.15);
  padding: 2px 4px;
  border-radius: 4px;
}

/* 本周进度卡片 */
.week-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.week-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.week-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.week-range {
  font-size: 12px;
  color: #999;
}

/* 任务项 */
.task-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.task-item:last-of-type {
  border-bottom: none;
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.task-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
}

.task-icon.sales {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.task-icon.share {
  background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
}

.task-icon.recruit {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.task-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.task-reward {
  display: flex;
  align-items: center;
  gap: 6px;
}

.reward-amount {
  font-size: 16px;
  font-weight: 600;
  color: #dc2626;
}

/* 进度条 */
.task-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-fill.sales {
  background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
}

.progress-fill.share {
  background: linear-gradient(90deg, #ec4899 0%, #be185d 100%);
}

.progress-fill.recruit {
  background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
}

.progress-text {
  font-size: 12px;
  color: #666;
  min-width: 60px;
  text-align: right;
}

/* 档位标签 */
.task-tiers {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #999;
}

.task-tiers span.active {
  color: #22c55e;
  font-weight: 500;
}

/* 任务操作 */
.task-action {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-size: 13px;
  color: #E53935;
  cursor: pointer;
}

/* 总奖励 */
.total-reward {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 8px;
  margin-top: 12px;
}

.total-label {
  font-size: 14px;
  color: #92400e;
}

.total-amount {
  font-size: 24px;
  font-weight: 700;
  color: #dc2626;
}

/* 快捷入口 */
.quick-entry {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.entry-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.entry-item-h {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  background: #f9f9f9;
  border-radius: 8px;
  cursor: pointer;
}

.entry-item-h:active {
  opacity: 0.8;
}

.entry-icon-h {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
}

.entry-icon-h.coupon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.entry-icon-h.share {
  background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
}

.entry-name-h {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  text-align: center;
}

.entry-value-h {
  font-size: 11px;
  color: #dc2626;
  font-weight: 600;
}

/* 活动列表区 */
.activities-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
}

.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  color: #999;
}

.loading-wrap p {
  margin-top: 12px;
  font-size: 14px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.empty-icon {
  color: #ddd;
  margin-bottom: 12px;
}

.empty-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.empty-desc {
  font-size: 12px;
  color: #999;
}

.activities-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-card {
  display: flex;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
}

.activity-card.disabled {
  opacity: 0.7;
}

.card-left {
  flex: 0 0 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 8px;
  background: linear-gradient(135deg, #E53935 0%, #ff6f61 100%);
  color: #fff;
}

.activity-card.disabled .card-left {
  background: linear-gradient(135deg, #999 0%, #bbb 100%);
}

.coupon-amount {
  display: flex;
  align-items: baseline;
}

.coupon-amount .symbol {
  font-size: 16px;
  font-weight: 500;
}

.coupon-amount .value {
  font-size: 32px;
  font-weight: 700;
}

.limit-text {
  font-size: 10px;
  margin-top: 4px;
  opacity: 0.9;
}

.card-center {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.activity-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.activity-stock {
  font-size: 12px;
  color: #E53935;
  margin-bottom: 4px;
}

.activity-stock .sold-out {
  color: #999;
}

.expire-info {
  font-size: 11px;
  color: #999;
}

.card-right {
  flex: 0 0 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.claim-btn {
  width: 100%;
  height: 36px;
  border: none;
  border-radius: 18px;
  background: linear-gradient(135deg, #E53935 0%, #ff6f61 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.claim-btn.loading,
.claim-btn.disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 即时奖励规则 */
.reward-rules {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.section-title-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.rules-toggle {
  color: #999;
  font-size: 18px;
  transition: transform 0.2s;
}

.rule-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rule-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
  flex-shrink: 0;
}

.rule-icon.register {
  background: #22c55e;
}

.rule-icon.reservation {
  background: #3b82f6;
}

.rule-icon.complete {
  background: #f59e0b;
}

.rule-icon.recruit {
  background: #8b5cf6;
}

.rule-icon.share {
  background: #ec4899;
}

.rule-content {
  flex: 1;
}

.rule-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.rule-desc {
  font-size: 12px;
  color: #666;
}

/* 使用说明 */
.rules-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-text {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}
</style>
