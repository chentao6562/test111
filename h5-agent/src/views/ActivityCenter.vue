<script setup lang="ts">
/**
 * 活动中心页面
 * 【2026-01-24 重构】统一横幅列表格式
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)

// 初始化加载
const loadData = async () => {
  loading.value = true
  await new Promise(resolve => setTimeout(resolve, 100))
  loading.value = false
}

// 跳转页面
const goTo = (path: string) => {
  router.push(path)
}

// 返回
const handleBack = () => {
  router.back()
}

onMounted(() => {
  if (!userStore.isLoggedIn) {
    router.replace('/login?redirect=/activity-center')
    return
  }
  loadData()
})
</script>

<template>
  <div class="activity-center-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="handleBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">活动中心</div>
      <div class="nav-right"></div>
    </div>

    <div class="content" v-if="!loading">
      <!-- 免费拿 -->
      <div class="activity-banner free-take" @click="goTo('/bargain-products')">
        <div class="banner-icon">🎁</div>
        <div class="banner-content">
          <div class="banner-title">免费拿</div>
          <div class="banner-desc">邀请好友帮砍，0元拿好货</div>
        </div>
        <div class="banner-tag hot">HOT</div>
        <t-icon name="chevron-right" class="banner-arrow" />
      </div>

      <!-- 限时秒杀 -->
      <div class="activity-banner flash-sale" @click="goTo('/flash-sale')">
        <div class="banner-icon">⚡</div>
        <div class="banner-content">
          <div class="banner-title">限时秒杀</div>
          <div class="banner-desc">限时特价，手慢无</div>
        </div>
        <div class="banner-tag sale">进行中</div>
        <t-icon name="chevron-right" class="banner-arrow" />
      </div>

      <!-- 拼团到店 -->
      <div class="activity-banner group-buy" @click="goTo('/my-group-buys')">
        <div class="banner-icon">👥</div>
        <div class="banner-content">
          <div class="banner-title">拼团到店</div>
          <div class="banner-desc">组团享优惠，人多更便宜</div>
        </div>
        <div class="banner-tag group">3人团</div>
        <t-icon name="chevron-right" class="banner-arrow" />
      </div>

      <!-- 预约满额送好礼 -->
      <div class="activity-banner gift" @click="goTo('/gift-activity')">
        <div class="banner-icon">🎀</div>
        <div class="banner-content">
          <div class="banner-title">预约满额送好礼</div>
          <div class="banner-desc">满100送小手持烟花，更多档位等你解锁</div>
        </div>
        <t-icon name="chevron-right" class="banner-arrow" />
      </div>

      <!-- 大转盘（敬请期待） -->
      <div class="activity-banner spin-wheel disabled">
        <div class="banner-icon">🎡</div>
        <div class="banner-content">
          <div class="banner-title">大转盘</div>
          <div class="banner-desc">抽奖赢代金券</div>
        </div>
        <div class="banner-tag coming">敬请期待</div>
      </div>

      <!-- 领券中心 -->
      <div class="activity-banner coupon" @click="goTo('/coupon-center')">
        <div class="banner-icon">🧧</div>
        <div class="banner-content">
          <div class="banner-title">领券中心</div>
          <div class="banner-desc">完成任务领代金券，到店消费可抵扣</div>
        </div>
        <t-icon name="chevron-right" class="banner-arrow" />
      </div>

      <!-- 推销员盈利 -->
      <div class="activity-banner agent" @click="goTo('/agent-recruit')">
        <div class="banner-icon">💰</div>
        <div class="banner-content">
          <div class="banner-title">推销员盈利</div>
          <div class="banner-desc">加入推销员，分享赚佣金</div>
        </div>
        <t-icon name="chevron-right" class="banner-arrow" />
      </div>

      <!-- 我的记录 -->
      <div class="section-header">我的记录</div>
      <div class="quick-grid">
        <div class="quick-item" @click="goTo('/my-bargains')">
          <t-icon name="discount" class="quick-icon bargain" />
          <span>我的砍价</span>
        </div>
        <div class="quick-item" @click="goTo('/profit-records')">
          <t-icon name="money-circle" class="quick-icon profit" />
          <span>收益明细</span>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <div class="loading-state" v-else>
      <t-loading />
      <div class="loading-text">加载中...</div>
    </div>
  </div>
</template>

<style scoped>
.activity-center-page {
  min-height: 100vh;
  background: #f5f5f5;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-back {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

.nav-right {
  width: 44px;
}

.content {
  padding: 12px;
}

/* 统一横幅样式 */
.activity-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: transform 0.2s;
}

.activity-banner:active:not(.disabled) {
  transform: scale(0.99);
}

.activity-banner.disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.banner-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.banner-content {
  flex: 1;
  min-width: 0;
}

.banner-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

.banner-desc {
  font-size: 12px;
  opacity: 0.8;
}

.banner-arrow {
  font-size: 18px;
  opacity: 0.6;
  flex-shrink: 0;
}

.banner-tag {
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  flex-shrink: 0;
}

/* 免费拿 - 红色 */
.activity-banner.free-take {
  background: linear-gradient(135deg, #FFE4E1 0%, #FFCCCB 100%);
  border: 1px solid rgba(255, 107, 107, 0.2);
}
.activity-banner.free-take .banner-title { color: #C62828; }
.activity-banner.free-take .banner-desc { color: #E53935; }
.activity-banner.free-take .banner-arrow { color: #E53935; }
.banner-tag.hot {
  background: linear-gradient(135deg, #FF4D4F 0%, #F5222D 100%);
  color: #fff;
}

/* 限时秒杀 - 橙色 */
.activity-banner.flash-sale {
  background: linear-gradient(135deg, #FFF7E6 0%, #FFE7BA 100%);
  border: 1px solid rgba(250, 140, 22, 0.2);
}
.activity-banner.flash-sale .banner-title { color: #AD6800; }
.activity-banner.flash-sale .banner-desc { color: #D48806; }
.activity-banner.flash-sale .banner-arrow { color: #D48806; }
.banner-tag.sale {
  background: linear-gradient(135deg, #52C41A 0%, #389E0D 100%);
  color: #fff;
}

/* 拼团到店 - 蓝色 */
.activity-banner.group-buy {
  background: linear-gradient(135deg, #E6F7FF 0%, #BAE7FF 100%);
  border: 1px solid rgba(24, 144, 255, 0.2);
}
.activity-banner.group-buy .banner-title { color: #096DD9; }
.activity-banner.group-buy .banner-desc { color: #1890FF; }
.activity-banner.group-buy .banner-arrow { color: #1890FF; }
.banner-tag.group {
  background: linear-gradient(135deg, #1890FF 0%, #096DD9 100%);
  color: #fff;
}

/* 满赠好礼 - 金色 */
.activity-banner.gift {
  background: linear-gradient(135deg, #FFFBE6 0%, #FFF1B8 100%);
  border: 1px solid rgba(250, 173, 20, 0.3);
}
.activity-banner.gift .banner-title { color: #AD6800; }
.activity-banner.gift .banner-desc { color: #D48806; }
.activity-banner.gift .banner-arrow { color: #D48806; }

/* 大转盘 - 灰色（敬请期待） */
.activity-banner.spin-wheel {
  background: linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%);
  border: 1px solid rgba(0, 0, 0, 0.06);
}
.activity-banner.spin-wheel .banner-title { color: #8C8C8C; }
.activity-banner.spin-wheel .banner-desc { color: #BFBFBF; }
.banner-tag.coming {
  background: #D9D9D9;
  color: #8C8C8C;
}

/* 领券中心 - 红色 */
.activity-banner.coupon {
  background: linear-gradient(135deg, #FFF0F0 0%, #FFE4E4 100%);
  border: 1px solid rgba(229, 57, 53, 0.15);
}
.activity-banner.coupon .banner-title { color: #C62828; }
.activity-banner.coupon .banner-desc { color: #E53935; }
.activity-banner.coupon .banner-arrow { color: #E53935; }

/* 推销员盈利 - 绿色 */
.activity-banner.agent {
  background: linear-gradient(135deg, #F0FFF0 0%, #D9F7BE 100%);
  border: 1px solid rgba(82, 196, 26, 0.2);
}
.activity-banner.agent .banner-title { color: #389E0D; }
.activity-banner.agent .banner-desc { color: #52C41A; }
.activity-banner.agent .banner-arrow { color: #52C41A; }

/* 我的记录 */
.section-header {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 16px 0 10px 4px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.quick-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.quick-item:active {
  opacity: 0.8;
}

.quick-icon {
  font-size: 22px;
}

.quick-icon.bargain {
  color: #FF6B6B;
}

.quick-icon.profit {
  color: #52C41A;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
}

.loading-text {
  font-size: 14px;
  color: #999;
  margin-top: 12px;
}
</style>
