<template>
  <view class="page">
    <view class="scan-area">
      <view class="camera-box" @tap="startScan">
        <view class="scan-icon">
          <text>扫</text>
        </view>
        <text class="scan-tip">点击扫描提货码</text>
      </view>
    </view>

    <view class="divider">
      <view class="line"></view>
      <text>或</text>
      <view class="line"></view>
    </view>

    <view class="manual-input">
      <text class="input-title">手动输入提货码</text>
      <view class="input-box">
        <input
          v-model="pickupCode"
          type="number"
          placeholder="请输入6位提货码"
          maxlength="6"
          class="code-input"
        />
        <button class="search-btn" @tap="searchOrder">查询</button>
      </view>
    </view>

    <view class="history-section" v-if="recentCodes.length">
      <text class="section-title">最近核销</text>
      <view class="history-list">
        <view
          v-for="item in recentCodes"
          :key="item.code"
          class="history-item"
          @tap="pickupCode = item.code"
        >
          <text class="code">{{ item.code }}</text>
          <text class="time">{{ item.time }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get } from '@/utils/request'

const pickupCode = ref('')
const recentCodes = ref<{ code: string; time: string }[]>([])

const startScan = () => {
  uni.scanCode({
    onlyFromCamera: true,
    scanType: ['barCode', 'qrCode'],
    success: (res) => {
      const code = res.result
      if (/^\d{6}$/.test(code)) {
        pickupCode.value = code
        searchOrder()
      } else {
        uni.showToast({ title: '无效的提货码', icon: 'none' })
      }
    },
    fail: () => {
      uni.showToast({ title: '扫码取消', icon: 'none' })
    },
  })
}

const searchOrder = async () => {
  if (!pickupCode.value || pickupCode.value.length !== 6) {
    uni.showToast({ title: '请输入6位提货码', icon: 'none' })
    return
  }

  try {
    uni.showLoading({ title: '查询中...' })
    const res = await get(`/warehouse/order/verify/${pickupCode.value}`)
    uni.hideLoading()

    if (res.data) {
      // 保存到最近记录
      saveToRecent(pickupCode.value)
      // 跳转到结果页
      uni.navigateTo({
        url: `/pages/scan/result?orderId=${res.data.id}&code=${pickupCode.value}`,
      })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('查询订单失败', e)
  }
}

const saveToRecent = (code: string) => {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  const newItem = { code, time }
  const filtered = recentCodes.value.filter((item) => item.code !== code)
  recentCodes.value = [newItem, ...filtered].slice(0, 5)
  uni.setStorageSync('recent_pickup_codes', recentCodes.value)
}

onMounted(() => {
  try {
    const stored = uni.getStorageSync('recent_pickup_codes')
    if (stored) {
      recentCodes.value = stored
    }
  } catch (e) {
    console.error('读取历史记录失败', e)
  }
})
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
}

.scan-area {
  background: #fff;
  border-radius: 20rpx;
  padding: 60rpx;
  display: flex;
  justify-content: center;

  .camera-box {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .scan-icon {
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #4caf50, #388e3c);
    display: flex;
    align-items: center;
    justify-content: center;

    text {
      font-size: 80rpx;
      font-weight: bold;
      color: #fff;
    }
  }

  .scan-tip {
    font-size: 28rpx;
    color: #666;
    margin-top: 30rpx;
  }
}

.divider {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin: 40rpx 0;

  .line {
    flex: 1;
    height: 1rpx;
    background: #ddd;
  }

  text {
    font-size: 26rpx;
    color: #999;
  }
}

.manual-input {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;

  .input-title {
    font-size: 28rpx;
    color: #333;
    font-weight: 500;
    display: block;
    margin-bottom: 20rpx;
  }

  .input-box {
    display: flex;
    gap: 20rpx;

    .code-input {
      flex: 1;
      height: 88rpx;
      background: #f5f5f5;
      border-radius: 12rpx;
      padding: 0 24rpx;
      font-size: 32rpx;
      letter-spacing: 8rpx;
      text-align: center;
    }

    .search-btn {
      width: 160rpx;
      height: 88rpx;
      background: #1e88e5;
      border-radius: 12rpx;
      font-size: 28rpx;
      font-weight: bold;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

.history-section {
  margin-top: 30rpx;

  .section-title {
    font-size: 28rpx;
    color: #666;
    display: block;
    margin-bottom: 16rpx;
  }

  .history-list {
    background: #fff;
    border-radius: 16rpx;
    overflow: hidden;
  }

  .history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 30rpx;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }

    .code {
      font-size: 32rpx;
      font-weight: bold;
      color: #1e88e5;
      letter-spacing: 4rpx;
    }

    .time {
      font-size: 24rpx;
      color: #999;
    }
  }
}
</style>
