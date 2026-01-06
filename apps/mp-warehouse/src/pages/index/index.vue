<template>
  <view class="page">
    <view class="header">
      <view class="welcome">
        <text class="name">{{ employeeStore.employeeInfo?.name || '库管员' }}</text>
        <text class="role">仓库管理员</text>
      </view>
      <view class="date">{{ today }}</view>
    </view>

    <view class="stats-section">
      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-value">{{ stats.pendingOrders }}</text>
          <text class="stat-label">待核销</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats.preparingOrders }}</text>
          <text class="stat-label">待备货</text>
        </view>
        <view class="stat-card warning">
          <text class="stat-value">{{ stats.warningStock }}</text>
          <text class="stat-label">库存预警</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats.todayInbound }}</text>
          <text class="stat-label">今日入库</text>
        </view>
      </view>
    </view>

    <view class="quick-actions">
      <view class="section-title">快捷操作</view>
      <view class="action-grid">
        <view class="action-item" @tap="goTo('/pages/scan/index')">
          <view class="action-icon scan">
            <text>扫</text>
          </view>
          <text class="action-text">扫码核销</text>
        </view>
        <view class="action-item" @tap="goTo('/pages/stock/index')">
          <view class="action-icon stock">
            <text>库</text>
          </view>
          <text class="action-text">库存查询</text>
        </view>
        <view class="action-item" @tap="goTo('/pages/inbound/create')">
          <view class="action-icon inbound">
            <text>入</text>
          </view>
          <text class="action-text">入库登记</text>
        </view>
        <view class="action-item" @tap="goTo('/pages/prepare/index')">
          <view class="action-icon prepare">
            <text>备</text>
          </view>
          <text class="action-text">备货任务</text>
        </view>
      </view>
    </view>

    <view class="menu-section">
      <view class="section-title">功能菜单</view>
      <view class="menu-list">
        <view class="menu-item" @tap="goTo('/pages/inbound/index')">
          <text class="menu-text">入库记录</text>
          <text class="menu-arrow">></text>
        </view>
        <view class="menu-item" @tap="goTo('/pages/mine/index')">
          <text class="menu-text">个人中心</text>
          <text class="menu-arrow">></text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useEmployeeStore } from '@/stores/employee'
import { get } from '@/utils/request'

const employeeStore = useEmployeeStore()

const stats = ref({
  pendingOrders: 0,
  preparingOrders: 0,
  warningStock: 0,
  todayInbound: 0,
})

const today = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

const fetchDashboard = async () => {
  try {
    const res = await get('/warehouse/dashboard')
    if (res.data) {
      stats.value = {
        pendingOrders: res.data.pendingOrders || 0,
        preparingOrders: res.data.preparingOrders || 0,
        warningStock: res.data.warningStock || 0,
        todayInbound: res.data.todayInbound || 0,
      }
    }
  } catch (e) {
    console.error('获取统计失败', e)
  }
}

const goTo = (url: string) => {
  uni.navigateTo({ url })
}

const checkLogin = () => {
  if (!employeeStore.isLoggedIn()) {
    uni.redirectTo({ url: '/pages/login/index' })
    return false
  }
  return true
}

onMounted(() => {
  if (checkLogin()) {
    fetchDashboard()
  }
})
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: linear-gradient(135deg, #1e88e5, #1565c0);
  padding: 40rpx 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .welcome {
    display: flex;
    flex-direction: column;

    .name {
      font-size: 36rpx;
      font-weight: bold;
      color: #fff;
    }

    .role {
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.8);
      margin-top: 8rpx;
    }
  }

  .date {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.9);
  }
}

.stats-section {
  margin: -20rpx 20rpx 20rpx;
  position: relative;
  z-index: 1;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.stat-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);

  .stat-value {
    display: block;
    font-size: 40rpx;
    font-weight: bold;
    color: #1e88e5;
  }

  .stat-label {
    display: block;
    font-size: 22rpx;
    color: #999;
    margin-top: 8rpx;
  }

  &.warning .stat-value {
    color: #ff9800;
  }
}

.quick-actions {
  padding: 30rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx 0;

  .action-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;

    text {
      font-size: 32rpx;
      font-weight: bold;
      color: #fff;
    }

    &.scan {
      background: linear-gradient(135deg, #4caf50, #388e3c);
    }
    &.stock {
      background: linear-gradient(135deg, #2196f3, #1976d2);
    }
    &.inbound {
      background: linear-gradient(135deg, #ff9800, #f57c00);
    }
    &.prepare {
      background: linear-gradient(135deg, #9c27b0, #7b1fa2);
    }
  }

  .action-text {
    font-size: 24rpx;
    color: #666;
    margin-top: 16rpx;
  }
}

.menu-section {
  padding: 0 30rpx 30rpx;
}

.menu-list {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }

  .menu-text {
    font-size: 28rpx;
    color: #333;
  }

  .menu-arrow {
    font-size: 28rpx;
    color: #ccc;
  }
}
</style>
