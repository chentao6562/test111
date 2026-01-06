<template>
  <view class="page">
    <view class="profile-header">
      <view class="avatar">
        <text>{{ employeeStore.employeeInfo?.name?.[0] || '库' }}</text>
      </view>
      <view class="profile-info">
        <text class="name">{{ employeeStore.employeeInfo?.name || '库管员' }}</text>
        <text class="role">仓库管理员</text>
      </view>
    </view>

    <view class="menu-section">
      <view class="menu-item" @tap="goTo('/pages/index/index')">
        <view class="menu-icon home">
          <text>首</text>
        </view>
        <text class="menu-text">返回工作台</text>
        <text class="menu-arrow">></text>
      </view>

      <view class="menu-item" @tap="goTo('/pages/scan/index')">
        <view class="menu-icon scan">
          <text>扫</text>
        </view>
        <text class="menu-text">扫码核销</text>
        <text class="menu-arrow">></text>
      </view>

      <view class="menu-item" @tap="goTo('/pages/stock/index')">
        <view class="menu-icon stock">
          <text>库</text>
        </view>
        <text class="menu-text">库存管理</text>
        <text class="menu-arrow">></text>
      </view>

      <view class="menu-item" @tap="goTo('/pages/inbound/index')">
        <view class="menu-icon inbound">
          <text>入</text>
        </view>
        <text class="menu-text">入库记录</text>
        <text class="menu-arrow">></text>
      </view>

      <view class="menu-item" @tap="goTo('/pages/prepare/index')">
        <view class="menu-icon prepare">
          <text>备</text>
        </view>
        <text class="menu-text">备货任务</text>
        <text class="menu-arrow">></text>
      </view>
    </view>

    <view class="menu-section">
      <view class="menu-item" @tap="clearCache">
        <view class="menu-icon cache">
          <text>清</text>
        </view>
        <text class="menu-text">清除缓存</text>
        <text class="menu-arrow">></text>
      </view>

      <view class="menu-item" @tap="showAbout">
        <view class="menu-icon about">
          <text>关</text>
        </view>
        <text class="menu-text">关于</text>
        <text class="menu-arrow">></text>
      </view>
    </view>

    <view class="logout-section">
      <button class="logout-btn" @tap="handleLogout">退出登录</button>
    </view>

    <view class="version">
      <text>蒙庆库管端 v1.0.0</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useEmployeeStore } from '@/stores/employee'

const employeeStore = useEmployeeStore()

const goTo = (url: string) => {
  uni.navigateTo({ url })
}

const clearCache = () => {
  uni.showModal({
    title: '确认',
    content: '确定要清除本地缓存吗？',
    success: (res) => {
      if (res.confirm) {
        try {
          uni.clearStorageSync()
          employeeStore.initFromStorage()
          uni.showToast({ title: '缓存已清除', icon: 'success' })
        } catch (e) {
          uni.showToast({ title: '清除失败', icon: 'none' })
        }
      }
    },
  })
}

const showAbout = () => {
  uni.showModal({
    title: '关于',
    content: '蒙庆烟花库管端\n版本：1.0.0\n用于仓库管理员进行库存管理、订单核销等操作',
    showCancel: false,
  })
}

const handleLogout = () => {
  uni.showModal({
    title: '确认',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        employeeStore.clearEmployee()
        uni.redirectTo({ url: '/pages/login/index' })
      }
    },
  })
}
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.profile-header {
  background: linear-gradient(135deg, #1e88e5, #1565c0);
  padding: 60rpx 30rpx;
  display: flex;
  align-items: center;

  .avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;

    text {
      font-size: 48rpx;
      font-weight: bold;
      color: #fff;
    }
  }

  .profile-info {
    margin-left: 24rpx;
    display: flex;
    flex-direction: column;

    .name {
      font-size: 36rpx;
      font-weight: bold;
      color: #fff;
    }

    .role {
      font-size: 26rpx;
      color: rgba(255, 255, 255, 0.8);
      margin-top: 8rpx;
    }
  }
}

.menu-section {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  overflow: hidden;

  .menu-item {
    display: flex;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }

    .menu-icon {
      width: 60rpx;
      height: 60rpx;
      border-radius: 12rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      text {
        font-size: 28rpx;
        font-weight: bold;
        color: #fff;
      }

      &.home {
        background: linear-gradient(135deg, #1e88e5, #1565c0);
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
      &.cache {
        background: linear-gradient(135deg, #607d8b, #455a64);
      }
      &.about {
        background: linear-gradient(135deg, #795548, #5d4037);
      }
    }

    .menu-text {
      flex: 1;
      font-size: 28rpx;
      color: #333;
      margin-left: 20rpx;
    }

    .menu-arrow {
      font-size: 28rpx;
      color: #ccc;
    }
  }
}

.logout-section {
  padding: 40rpx 30rpx;

  .logout-btn {
    height: 88rpx;
    background: #fff;
    border: 2rpx solid #f44336;
    border-radius: 44rpx;
    font-size: 30rpx;
    color: #f44336;
  }
}

.version {
  text-align: center;
  padding: 30rpx;

  text {
    font-size: 24rpx;
    color: #999;
  }
}
</style>
