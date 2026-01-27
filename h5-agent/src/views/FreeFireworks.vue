<script setup lang="ts">
/**
 * 过年烟花免费拿 - 活动介绍页
 * @since 2026-01-24
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 成功用户滚动数据
const surnames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡']
const products = ['加特林烟花', '仙女棒礼盒', '烟花大礼包', '孔雀开屏', '彩色喷泉', '小蜜蜂烟花']
const successUsersIndex = ref(0)
let scrollTimer: number | null = null

// 生成虚拟成功用户
const successUsers = computed(() => {
  const users: { id: number; name: string; product: string; time: string }[] = []
  for (let i = 0; i < 20; i++) {
    const surname = surnames[Math.floor(Math.random() * surnames.length)] || '张'
    const product = products[i % products.length] || '烟花礼盒'
    const minutes = Math.floor(Math.random() * 30) + 1
    users.push({
      id: i + 1,
      name: `${surname}**`,
      product,
      time: `${minutes}分钟前`
    })
  }
  return users
})

// 当前显示的用户
const currentUser = computed((): { id: number; name: string; product: string; time: string } => {
  const users = successUsers.value
  if (users.length === 0) return { id: 0, name: '', product: '', time: '' }
  return users[successUsersIndex.value % users.length] || { id: 0, name: '', product: '', time: '' }
})

// 开始滚动
const startScroll = () => {
  scrollTimer = window.setInterval(() => {
    successUsersIndex.value++
  }, 3000)
}

// 停止滚动
const stopScroll = () => {
  if (scrollTimer) {
    clearInterval(scrollTimer)
    scrollTimer = null
  }
}

// 进入砍价商品列表
const goToBargain = () => {
  router.push('/bargain-products?type=free')
}

// 返回
const goBack = () => {
  router.back()
}

onMounted(() => {
  startScroll()
})

onUnmounted(() => {
  stopScroll()
})
</script>

<template>
  <div class="free-fireworks-page">
    <!-- 顶部导航 -->
    <div class="nav-header">
      <div class="nav-back" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <h2 class="nav-title">过年烟花免费拿</h2>
      <div class="nav-placeholder"></div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 顶部Banner -->
      <div class="hero-section">
        <div class="hero-bg"></div>
        <div class="hero-content">
          <div class="hero-badge">限时活动</div>
          <h1 class="hero-title">
            <span class="title-line">过年烟花</span>
            <span class="title-highlight">免费拿</span>
          </h1>
          <p class="hero-subtitle">邀请好友砍价，爆款烟花0元带回家</p>
        </div>
        <!-- 装饰烟花 -->
        <div class="firework-decoration firework-1"></div>
        <div class="firework-decoration firework-2"></div>
        <div class="firework-decoration firework-3"></div>
      </div>

      <!-- 成功用户滚动 -->
      <div class="success-ticker">
        <div class="ticker-icon">
          <t-icon name="sound" size="16px" />
        </div>
        <div class="ticker-content">
          <transition name="slide-up" mode="out-in">
            <span :key="successUsersIndex" class="ticker-text">
              恭喜 <span class="user-name">{{ currentUser?.name }}</span>
              免费领取了 <span class="product-name">{{ currentUser?.product }}</span>
            </span>
          </transition>
        </div>
      </div>

      <!-- 活动规则 -->
      <div class="rules-section">
        <div class="section-header">
          <div class="section-line"></div>
          <h2 class="section-title">参与方式</h2>
          <div class="section-line"></div>
        </div>

        <div class="rules-steps">
          <div class="step-item">
            <div class="step-number">1</div>
            <div class="step-icon">
              <t-icon name="browse" size="28px" />
            </div>
            <div class="step-info">
              <div class="step-title">选择商品</div>
              <div class="step-desc">挑选心仪的烟花</div>
            </div>
          </div>
          <div class="step-arrow">
            <t-icon name="chevron-right" size="20px" />
          </div>
          <div class="step-item">
            <div class="step-number">2</div>
            <div class="step-icon">
              <t-icon name="share" size="28px" />
            </div>
            <div class="step-info">
              <div class="step-title">邀请砍价</div>
              <div class="step-desc">分享给好友帮砍</div>
            </div>
          </div>
          <div class="step-arrow">
            <t-icon name="chevron-right" size="20px" />
          </div>
          <div class="step-item">
            <div class="step-number">3</div>
            <div class="step-icon">
              <t-icon name="gift" size="28px" />
            </div>
            <div class="step-info">
              <div class="step-title">免费领取</div>
              <div class="step-desc">砍到0元到店提货</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 活动亮点 -->
      <div class="highlights-section">
        <div class="highlight-item">
          <div class="highlight-icon">
            <t-icon name="money-circle" size="24px" />
          </div>
          <div class="highlight-text">
            <div class="highlight-title">真正0元</div>
            <div class="highlight-desc">砍到底价免费拿</div>
          </div>
        </div>
        <div class="highlight-item">
          <div class="highlight-icon">
            <t-icon name="time" size="24px" />
          </div>
          <div class="highlight-text">
            <div class="highlight-title">限时活动</div>
            <div class="highlight-desc">春节期间专享</div>
          </div>
        </div>
        <div class="highlight-item">
          <div class="highlight-icon">
            <t-icon name="verified" size="24px" />
          </div>
          <div class="highlight-text">
            <div class="highlight-title">正品保障</div>
            <div class="highlight-desc">实体店铺自提</div>
          </div>
        </div>
      </div>

      <!-- 活动说明 -->
      <div class="notice-section">
        <div class="notice-title">
          <t-icon name="info-circle" size="16px" />
          <span>活动说明</span>
        </div>
        <ul class="notice-list">
          <li>活动时间：2026年春节期间</li>
          <li>每人限参与3次砍价活动</li>
          <li>砍价成功后需到店提货</li>
          <li>本活动最终解释权归蒙庆烟花所有</li>
        </ul>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="bottom-action">
      <button class="action-btn" @click="goToBargain">
        <span class="btn-text">立即参与</span>
        <span class="btn-sub">选择商品开始砍价</span>
      </button>
    </div>

    <!-- 背景装饰 -->
    <div class="bg-decoration bg-top"></div>
    <div class="bg-decoration bg-bottom"></div>
  </div>
</template>

<style scoped>
.free-fireworks-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF5F5 0%, #FFF 30%);
  position: relative;
  overflow: hidden;
  padding-bottom: 100px;
}

/* 导航栏 */
.nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: transparent;
  position: relative;
  z-index: 10;
}

.nav-back {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
}

.nav-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  flex: 1;
  text-align: center;
}

.nav-placeholder {
  width: 40px;
}

/* 主内容 */
.main-content {
  padding: 0 16px;
}

/* 顶部Hero区域 */
.hero-section {
  position: relative;
  padding: 32px 24px;
  margin-bottom: 16px;
  border-radius: 20px;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #FF4D6D 0%, #EF062D 50%, #C41230 100%);
  z-index: 0;
}

.hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
}

.hero-badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12px;
}

.hero-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
}

.title-line {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.title-highlight {
  font-size: 36px;
  font-weight: 900;
  color: #FFD700;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.hero-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

/* 烟花装饰 */
.firework-decoration {
  position: absolute;
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, #FFD700 0%, transparent 70%);
  border-radius: 50%;
  opacity: 0.6;
  animation: twinkle 2s infinite;
}

.firework-1 {
  top: 10px;
  right: 20px;
  animation-delay: 0s;
}

.firework-2 {
  bottom: 20px;
  left: 10px;
  width: 40px;
  height: 40px;
  animation-delay: 0.5s;
}

.firework-3 {
  top: 50%;
  right: 10px;
  width: 30px;
  height: 30px;
  animation-delay: 1s;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.2); }
}

/* 成功用户滚动 */
.success-ticker {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #FFF7E6;
  border-radius: 24px;
  margin-bottom: 20px;
}

.ticker-icon {
  color: #FAAD14;
  flex-shrink: 0;
}

.ticker-content {
  flex: 1;
  overflow: hidden;
  height: 20px;
}

.ticker-text {
  display: block;
  font-size: 13px;
  color: #8C5A00;
  white-space: nowrap;
}

.user-name, .product-name {
  font-weight: 600;
  color: #D46B08;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 活动规则 */
.rules-section {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.section-line {
  width: 30px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #EF062D);
}

.section-line:last-child {
  background: linear-gradient(90deg, #EF062D, transparent);
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.rules-steps {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
}

.step-number {
  position: absolute;
  top: -8px;
  right: calc(50% - 32px);
  width: 18px;
  height: 18px;
  background: #EF062D;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.step-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFE8E8 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #EF062D;
  margin-bottom: 8px;
}

.step-info {
  text-align: center;
}

.step-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.step-desc {
  font-size: 11px;
  color: var(--text-muted);
}

.step-arrow {
  color: #ddd;
  padding-top: 16px;
}

/* 活动亮点 */
.highlights-section {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.highlight-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.highlight-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #FFF7E6 0%, #FFE7BA 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #D46B08;
}

.highlight-text {
  text-align: center;
}

.highlight-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.highlight-desc {
  font-size: 11px;
  color: var(--text-muted);
}

/* 活动说明 */
.notice-section {
  background: #FAFAFA;
  border-radius: 12px;
  padding: 16px;
}

.notice-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.notice-list {
  margin: 0;
  padding-left: 16px;
}

.notice-list li {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.8;
}

/* 底部按钮 */
.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.action-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #FF4D6D 0%, #EF062D 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(239, 6, 45, 0.3);
  transition: transform 0.2s;
}

.action-btn:active {
  transform: scale(0.98);
}

.btn-text {
  display: block;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
}

.btn-sub {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

/* 背景装饰 */
.bg-decoration {
  position: fixed;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0.1;
}

.bg-top {
  top: 0;
  right: 0;
  background: var(--primary);
  filter: blur(60px);
}

.bg-bottom {
  bottom: 0;
  left: 0;
  background: var(--gold);
  filter: blur(60px);
}
</style>
