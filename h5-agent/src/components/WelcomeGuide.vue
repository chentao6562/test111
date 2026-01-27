<script setup lang="ts">
/**
 * 新用户欢迎引导弹窗
 * 【2026-01-22】
 * 显示注册奖励和新人任务引导
 */
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { get } from '../api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

interface NewbieTasks {
  isNewUser: boolean
  tasks: {
    register: { completed: boolean; amount: number }
    firstShare: { completed: boolean; amount: number }
    firstReservation: { completed: boolean; amount: number }
    firstComplete: { completed: boolean; amount: number }
  }
  progress: { completed: number; total: number }
  amount: { earned: number; total: number; remaining: number }
}

const newbieTasks = ref<NewbieTasks | null>(null)
const loading = ref(true)
const dataLoaded = ref(false)

// 加载新人任务状态
const loadNewbieTasks = async () => {
  if (dataLoaded.value) return // 避免重复加载
  if (!userStore.isLoggedIn) return // 未登录不调用API
  try {
    const res = await get<NewbieTasks>('/weekly/newbie-tasks')
    if (res.code === 0) {
      newbieTasks.value = res.data
      dataLoaded.value = true
    }
  } catch (err) {
    console.error('加载新人任务失败:', err)
  } finally {
    loading.value = false
  }
}

// 前往活动中心
const goActivityCenter = () => {
  emit('close')
  router.push('/activity-center')
}

// 关闭弹窗
const handleClose = () => {
  emit('close')
  // 标记已显示过欢迎弹窗
  localStorage.setItem('welcome_guide_shown', 'true')
}

// 【2026-01-22】只有当弹窗显示时才加载数据，避免未登录状态下调用API
watch(() => props.visible, (newVal) => {
  if (newVal && !dataLoaded.value) {
    loadNewbieTasks()
  }
}, { immediate: true })
</script>

<template>
  <t-popup
    :visible="visible"
    placement="center"
    @close="handleClose"
  >
    <div class="welcome-guide">
      <!-- 顶部装饰 -->
      <div class="guide-header">
        <div class="header-bg"></div>
        <div class="header-content">
          <div class="celebration-icon">
            <span class="material-symbols-outlined">celebration</span>
          </div>
          <h2 class="guide-title">欢迎加入蒙庆烟花！</h2>
        </div>
      </div>

      <!-- 主体内容 -->
      <div class="guide-body">
        <!-- 注册奖励提示 -->
        <div class="reward-highlight">
          <div class="reward-badge">
            <span class="reward-amount">¥5</span>
            <span class="reward-label">注册奖励</span>
          </div>
          <p class="reward-desc">代金券已发放至您的账户</p>
        </div>

        <!-- 新人任务列表 -->
        <div class="task-section" v-if="!loading && newbieTasks">
          <div class="task-header">
            <span class="task-title">完成以下任务可获得更多奖励</span>
            <span class="task-total">共¥{{ newbieTasks.amount.total }}</span>
          </div>

          <div class="task-list">
            <div class="task-item" :class="{ completed: newbieTasks.tasks.register.completed }">
              <div class="task-status">
                <span class="material-symbols-outlined" v-if="newbieTasks.tasks.register.completed">check_circle</span>
                <span class="task-index" v-else>1</span>
              </div>
              <div class="task-info">
                <span class="task-name">注册成功</span>
              </div>
              <div class="task-reward">+¥5</div>
            </div>

            <div class="task-item" :class="{ completed: newbieTasks.tasks.firstShare.completed }">
              <div class="task-status">
                <span class="material-symbols-outlined" v-if="newbieTasks.tasks.firstShare.completed">check_circle</span>
                <span class="task-index" v-else>2</span>
              </div>
              <div class="task-info">
                <span class="task-name">首次发圈</span>
              </div>
              <div class="task-reward">+¥5</div>
            </div>

            <div class="task-item" :class="{ completed: newbieTasks.tasks.firstReservation.completed }">
              <div class="task-status">
                <span class="material-symbols-outlined" v-if="newbieTasks.tasks.firstReservation.completed">check_circle</span>
                <span class="task-index" v-else>3</span>
              </div>
              <div class="task-info">
                <span class="task-name">首次有客户预约</span>
              </div>
              <div class="task-reward">+¥10</div>
            </div>

            <div class="task-item" :class="{ completed: newbieTasks.tasks.firstComplete.completed }">
              <div class="task-status">
                <span class="material-symbols-outlined" v-if="newbieTasks.tasks.firstComplete.completed">check_circle</span>
                <span class="task-index" v-else>4</span>
              </div>
              <div class="task-info">
                <span class="task-name">首单成交</span>
              </div>
              <div class="task-reward">+¥20</div>
            </div>
          </div>
        </div>

        <!-- 加载中 -->
        <div class="loading-state" v-else-if="loading">
          <t-loading size="small" />
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="guide-footer">
        <button class="primary-btn" @click="goActivityCenter">
          <span class="material-symbols-outlined">rocket_launch</span>
          查看任务中心
        </button>
        <button class="secondary-btn" @click="handleClose">
          稍后再看
        </button>
      </div>
    </div>
  </t-popup>
</template>

<style scoped>
.welcome-guide {
  width: 320px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}

/* 顶部装饰 */
.guide-header {
  position: relative;
  padding: 32px 24px 24px;
  background: linear-gradient(135deg, #FF4D6D 0%, #EF062D 100%);
  text-align: center;
}

.header-bg {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
}

.header-content {
  position: relative;
  z-index: 1;
}

.celebration-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.celebration-icon .material-symbols-outlined {
  font-size: 36px;
  color: #fff;
}

.guide-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

/* 主体内容 */
.guide-body {
  padding: 20px;
}

/* 奖励高亮 */
.reward-highlight {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #FFF7E6 0%, #FFE7BA 100%);
  border-radius: 12px;
  margin-bottom: 20px;
}

.reward-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  background: linear-gradient(135deg, #FAAD14 0%, #F5A623 100%);
  border-radius: 8px;
}

.reward-amount {
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}

.reward-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 2px;
}

.reward-desc {
  flex: 1;
  font-size: 14px;
  color: #AD6800;
  margin: 0;
}

/* 任务区域 */
.task-section {
  background: #f8f8f8;
  border-radius: 12px;
  padding: 16px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-title {
  font-size: 13px;
  color: #666;
}

.task-total {
  font-size: 14px;
  font-weight: 600;
  color: #EF062D;
}

/* 任务列表 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 8px;
}

.task-item.completed {
  opacity: 0.6;
}

.task-status {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-status .material-symbols-outlined {
  font-size: 20px;
  color: #52c41a;
}

.task-index {
  width: 20px;
  height: 20px;
  background: #EF062D;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-info {
  flex: 1;
}

.task-name {
  font-size: 13px;
  color: #333;
}

.task-reward {
  font-size: 14px;
  font-weight: 600;
  color: #EF062D;
}

.task-item.completed .task-reward {
  color: #52c41a;
}

/* 加载状态 */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 24px;
}

/* 底部按钮 */
.guide-footer {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #FF4D6D 0%, #EF062D 100%);
  border: none;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}

.primary-btn .material-symbols-outlined {
  font-size: 20px;
}

.primary-btn:active {
  transform: scale(0.98);
}

.secondary-btn {
  width: 100%;
  height: 40px;
  background: transparent;
  border: none;
  font-size: 14px;
  color: #999;
  cursor: pointer;
}

.secondary-btn:active {
  color: #666;
}

/* Material Icons */
.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
}
</style>
