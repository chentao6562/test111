<template>
  <view class="page">
    <view class="login-header">
      <view class="logo">
        <text>库</text>
      </view>
      <text class="title">蒙庆库管端</text>
      <text class="subtitle">仓库管理员登录</text>
    </view>

    <view class="login-form">
      <view class="input-group">
        <text class="input-label">手机号</text>
        <input
          v-model="phone"
          type="number"
          placeholder="请输入手机号"
          maxlength="11"
          class="input"
        />
      </view>
      <view class="input-group">
        <text class="input-label">验证码</text>
        <view class="code-input">
          <input
            v-model="code"
            type="number"
            placeholder="请输入验证码"
            maxlength="6"
            class="input"
          />
          <view
            :class="['code-btn', { disabled: countdown > 0 }]"
            @tap="sendCode"
          >
            <text>{{ countdown > 0 ? `${countdown}s` : '获取验证码' }}</text>
          </view>
        </view>
      </view>
      <button class="login-btn" @tap="handleLogin">登录</button>
    </view>

    <view class="tips">
      <text>仅限仓库管理员使用</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useEmployeeStore } from '@/stores/employee'
import { post } from '@/utils/request'

const employeeStore = useEmployeeStore()

const phone = ref('')
const code = ref('')
const countdown = ref(0)

let timer: number | null = null

const sendCode = async () => {
  if (countdown.value > 0) return
  if (!phone.value || phone.value.length !== 11) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }

  try {
    await post('/auth/send-code', { phone: phone.value, type: 'employee' })
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    countdown.value = 60
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && timer) {
        clearInterval(timer)
        timer = null
      }
    }, 1000) as unknown as number
  } catch (e) {
    console.error('发送验证码失败', e)
  }
}

const handleLogin = async () => {
  if (!phone.value || phone.value.length !== 11) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (!code.value || code.value.length !== 6) {
    uni.showToast({ title: '请输入6位验证码', icon: 'none' })
    return
  }

  try {
    uni.showLoading({ title: '登录中...' })
    const res = await post('/auth/employee/login', {
      phone: phone.value,
      code: code.value,
    })

    if (res.data) {
      employeeStore.setToken(res.data.token)
      employeeStore.setEmployeeInfo({
        id: res.data.employee.id,
        name: res.data.employee.name,
        phone: res.data.employee.phone,
        role: res.data.employee.role,
      })
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        uni.redirectTo({ url: '/pages/index/index' })
      }, 1500)
    }
  } catch (e) {
    console.error('登录失败', e)
  } finally {
    uni.hideLoading()
  }
}
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background: #fff;
  padding: 0 40rpx;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0 80rpx;

  .logo {
    width: 160rpx;
    height: 160rpx;
    border-radius: 32rpx;
    background: linear-gradient(135deg, #1e88e5, #1565c0);
    display: flex;
    align-items: center;
    justify-content: center;

    text {
      font-size: 72rpx;
      font-weight: bold;
      color: #fff;
    }
  }

  .title {
    font-size: 48rpx;
    font-weight: bold;
    color: #333;
    margin-top: 30rpx;
  }

  .subtitle {
    font-size: 28rpx;
    color: #999;
    margin-top: 12rpx;
  }
}

.login-form {
  .input-group {
    margin-bottom: 30rpx;

    .input-label {
      font-size: 28rpx;
      color: #333;
      font-weight: 500;
      margin-bottom: 16rpx;
      display: block;
    }

    .input {
      width: 100%;
      height: 96rpx;
      padding: 0 30rpx;
      background: #f5f5f5;
      border-radius: 16rpx;
      font-size: 28rpx;
    }

    .code-input {
      display: flex;
      gap: 20rpx;

      .input {
        flex: 1;
      }

      .code-btn {
        width: 200rpx;
        height: 96rpx;
        background: #1e88e5;
        border-radius: 16rpx;
        display: flex;
        align-items: center;
        justify-content: center;

        text {
          font-size: 26rpx;
          color: #fff;
          font-weight: bold;
        }

        &.disabled {
          background: #ccc;
        }
      }
    }
  }

  .login-btn {
    height: 96rpx;
    background: linear-gradient(135deg, #1e88e5, #1565c0);
    border-radius: 48rpx;
    font-size: 32rpx;
    font-weight: bold;
    color: #fff;
    margin-top: 40rpx;
  }
}

.tips {
  margin-top: 60rpx;
  text-align: center;

  text {
    font-size: 24rpx;
    color: #999;
  }
}
</style>
