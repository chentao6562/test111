<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from './stores/user'
import { useCartStore } from './stores/cart'
import OfflineNotice from './components/OfflineNotice.vue'
import BgmPlayer from './components/BgmPlayer.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

// 底部TabBar配置 - 使用Material Icons名称
const tabList = [
  { value: '/', icon: 'home', label: '首页' },
  { value: '/category', icon: 'grid_view', label: '分类' },
  { value: '/cart', icon: 'favorite', label: '心愿单' },
  { value: '/my', icon: 'person', label: '我的' }
]

// 当前选中的tab
const currentTab = computed(() => {
  const path = route.path
  const tab = tabList.find(t => t.value === path)
  return tab ? tab.value : ''
})

// 是否显示TabBar
// 【2026-01-19修复】允许登录用户和访客模式都显示TabBar
// 【2026-01-24修复】添加砍价商品页面也显示TabBar
const showTabBar = computed(() => {
  const showPaths = ['/', '/category', '/cart', '/my', '/bargain-products']
  return showPaths.includes(route.path) && (userStore.isLoggedIn || userStore.isGuestMode)
})

// 切换Tab
const onTabChange = (value: string) => {
  router.push(value)
}

const syncCartCount = () => {
  if (userStore.isLoggedIn) {
    cartStore.fetchCount()
    cartStore.startAutoRefresh()
  } else {
    cartStore.stopAutoRefresh()
    cartStore.setCount(0)
  }
}

onMounted(() => {
  syncCartCount()
})

watch(
  () => userStore.isLoggedIn,
  () => {
    syncCartCount()
  }
)

onUnmounted(() => {
  cartStore.stopAutoRefresh()
})
</script>

<template>
  <div class="app-container">
    <!-- 离线状态提示 -->
    <OfflineNotice />

    <!-- 【2026-01-28】BGM背景音乐播放器 -->
    <BgmPlayer />

    <!-- 页面内容 -->
    <router-view v-slot="{ Component }">
      <keep-alive :include="['Home', 'Category', 'Cart', 'My']">
        <component :is="Component" />
      </keep-alive>
    </router-view>

    <!-- 【2026-01-27】滚动公告条 - 仅在首页显示 -->
    <div class="notice-marquee" v-if="route.path === '/'">
      <div class="notice-icon">
        <span class="material-symbols-outlined">campaign</span>
      </div>
      <div class="notice-scroll-wrapper">
        <div class="notice-scroll-content">
          <span>🎁 持核销码到店 在核销处领取价值迷你加特林一根 </span>
          <span>🎁 持核销码到店 在核销处领取价值迷你加特林一根 </span>
        </div>
      </div>
    </div>

    <!-- 自定义喜庆风格TabBar -->
    <div class="festive-tabbar" v-if="showTabBar">
      <!-- 装饰图案背景 -->
      <div class="tabbar-pattern"></div>

      <!-- TabBar内容 -->
      <div class="tabbar-content">
        <div
          v-for="item in tabList"
          :key="item.value"
          :class="['tab-item', { active: currentTab === item.value }]"
          @click="onTabChange(item.value)"
        >
          <div class="tab-icon-wrap">
            <span class="material-symbols-outlined">{{ item.icon }}</span>
            <!-- 心愿单徽章 -->
            <span class="tab-badge" v-if="item.value === '/cart' && cartStore.count > 0">
              {{ cartStore.count > 99 ? '99+' : cartStore.count }}
            </span>
          </div>
          <span class="tab-label">{{ item.label }}</span>
          <!-- 选中指示条 -->
          <div class="tab-indicator" v-if="currentTab === item.value"></div>
        </div>
      </div>

      <!-- 底部安全区域 -->
      <div class="tabbar-safe-area"></div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  background-color: var(--bg-page, #FDF6F7);
  padding-bottom: 110px; /* 为TabBar + 公告条留出空间 */
}

/* ========== 喜庆风格TabBar ========== */
.festive-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: linear-gradient(180deg, #C41230 0%, #9A0E26 100%);
  border-radius: 20px 20px 0 0;
  overflow: hidden;
  box-shadow: 0 -4px 24px rgba(196, 18, 48, 0.5);
}

/* 金色点状装饰图案 */
.tabbar-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 2px 2px, rgba(255, 215, 0, 0.2) 1px, transparent 0);
  background-size: 16px 16px;
  pointer-events: none;
  opacity: 0.6;
}

/* TabBar主体内容 */
.tabbar-content {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 6px 8px 4px;
  position: relative;
  z-index: 1;
}

/* 单个Tab项 */
.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 4px 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  border-radius: 10px;
}

.tab-item:active {
  transform: scale(0.95);
}

/* 选中状态背景 */
.tab-item.active {
  background: rgba(255, 255, 255, 0.15);
}

/* 图标容器 */
.tab-icon-wrap {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 图标样式 */
.tab-item .material-symbols-outlined {
  font-size: 22px;
  color: rgba(255, 255, 255, 0.65);
  transition: all 0.3s ease;
}

/* 选中态图标 - 金色发光 */
.tab-item.active .material-symbols-outlined {
  color: #FFD700;
  font-variation-settings: 'FILL' 1;
  text-shadow: 0 0 16px rgba(255, 215, 0, 0.8);
  filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.6));
}

/* 文字标签 */
.tab-label {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.65);
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
}

/* 选中态文字 */
.tab-item.active .tab-label {
  color: #FFD700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}

/* 徽章样式 */
.tab-badge {
  position: absolute;
  top: -6px;
  right: -10px;
  min-width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #9A0E26;
  font-size: 10px;
  font-weight: 800;
  padding: 0 5px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border: 2px solid #9A0E26;
}

/* 选中指示条 */
.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: linear-gradient(90deg, #FFD700, #FFA500);
  border-radius: 2px;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
}

/* 底部安全区域 */
.tabbar-safe-area {
  height: env(safe-area-inset-bottom, 0);
  background: #9A0E26;
}

/* ========== 【2026-01-27】滚动公告条 ========== */
.notice-marquee {
  position: fixed;
  bottom: 70px;
  left: 0;
  right: 0;
  z-index: 999;
  background: linear-gradient(90deg, #FFF1E6 0%, #FFEDDB 100%);
  border-top: 1px solid rgba(196, 18, 48, 0.15);
  display: flex;
  align-items: center;
  padding: 8px 12px;
  overflow: hidden;
}

.notice-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #C41230, #9A0E26);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  box-shadow: 0 2px 4px rgba(196, 18, 48, 0.3);
}

.notice-icon .material-symbols-outlined {
  font-size: 14px;
  color: #FFD700;
}

.notice-scroll-wrapper {
  flex: 1;
  overflow: hidden;
}

.notice-scroll-content {
  display: flex;
  white-space: nowrap;
  animation: noticeMarquee 12s linear infinite;
}

.notice-scroll-content span {
  font-size: 13px;
  font-weight: 600;
  color: #C41230;
  padding-right: 80px;
}

@keyframes noticeMarquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
</style>
