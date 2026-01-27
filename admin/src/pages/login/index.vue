<template>
  <div class="login-page">
    <!-- 背景层 -->
    <div class="background-layer">
      <div class="bg-pattern"></div>
      <div class="bg-overlay"></div>
    </div>

    <!-- 主内容 -->
    <div class="main-content">
      <!-- 登录卡片 -->
      <div class="login-card">
        <!-- 头部 -->
        <div class="card-header">
          <div class="logo-box">
            <img v-if="settings.companyLogo" :src="settings.companyLogo" alt="Logo" class="company-logo" />
            <svg v-else viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="default-logo">
              <path d="M16 4C16 4 10 10 10 16C10 20 12.5 23 16 24C19.5 23 22 20 22 16C22 10 16 4 16 4Z" fill="white"/>
              <path d="M16 10C16 10 13 13 13 17C13 19 14.5 21 16 22C17.5 21 19 19 19 17C19 13 16 10 16 10Z" fill="#e53734"/>
            </svg>
          </div>
          <h1 class="title">{{ settings.companyName || '蒙庆烟花' }}管理后台</h1>
          <p class="subtitle">MENGQING FIREWORKS MANAGEMENT</p>
        </div>

        <!-- 表单 -->
        <form class="login-form" @submit.prevent="handleSubmit">
          <!-- 手机号输入框 -->
          <div class="form-item">
            <label class="form-label">手机号</label>
            <div class="input-wrapper" :class="{ focused: focusedField === 'phone' }">
              <input
                v-model="formData.phone"
                type="tel"
                maxlength="11"
                placeholder="请输入手机号"
                class="form-input"
                @focus="focusedField = 'phone'"
                @blur="focusedField = ''"
              />
              <div class="input-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- 验证码 -->
          <div class="form-item">
            <label class="form-label">验证码</label>
            <div class="code-row">
              <div class="input-wrapper code-input-wrapper" :class="{ focused: focusedField === 'code' }">
                <input
                  v-model="formData.code"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="请输入验证码"
                  class="form-input"
                  @focus="focusedField = 'code'"
                  @blur="focusedField = ''"
                />
              </div>
              <button
                type="button"
                class="send-code-btn"
                :disabled="!canSendCode || sendingCode"
                @click="handleSendCode"
              >
                {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
              </button>
            </div>
          </div>

          <!-- 记住手机号 -->
          <div class="form-extras">
            <label class="remember-me">
              <input v-model="rememberMe" type="checkbox" class="checkbox" />
              <span class="checkbox-custom"></span>
              <span class="checkbox-label">记住手机号</span>
            </label>
          </div>

          <!-- 登录按钮 -->
          <button type="submit" class="login-btn" :disabled="loading || !canLogin">
            <span v-if="loading" class="loading-spinner"></span>
            <span>{{ loading ? '登录中...' : '登 录' }}</span>
          </button>
        </form>
      </div>

      <!-- 页脚 -->
      <footer class="footer">
        <p>© 2024 MENGQING FIREWORKS. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { useUserStore } from '@/stores/user'
import { getPublicConfig } from '@/api/settings'
import { sendCode, phoneLogin } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 系统设置（Logo、公司名称）
const settings = ref({
  companyName: '',
  companyLogo: '',
})

// 加载系统设置
async function loadSettings() {
  try {
    const res = await getPublicConfig()
    if (res.code === 0 && res.data) {
      settings.value.companyName = res.data.companyName || ''
      settings.value.companyLogo = res.data.companyLogo || ''
      // 更新页面标题
      const companyName = settings.value.companyName || '蒙庆烟花'
      document.title = `登录 - ${companyName}管理后台`
    }
  } catch (error) {
    console.error('加载系统设置失败:', error)
  }
}

// 表单数据
const formData = reactive({
  phone: '',
  code: '',
})

// 状态
const loading = ref(false)
const focusedField = ref('')
const rememberMe = ref(false)
const countdown = ref(0)
const sendingCode = ref(false)
let countdownTimer: number | null = null

// 手机号格式验证
const isValidPhone = computed(() => /^1[3-9]\d{9}$/.test(formData.phone))

// 是否可以发送验证码
const canSendCode = computed(() => isValidPhone.value && countdown.value === 0)

// 是否可以登录
const canLogin = computed(() =>
  isValidPhone.value && /^\d{6}$/.test(formData.code)
)

// 发送验证码
async function handleSendCode() {
  if (!canSendCode.value || sendingCode.value) return

  sendingCode.value = true
  try {
    await sendCode({ phone: formData.phone })
    MessagePlugin.success('验证码已发送')
    startCountdown()
  } catch (error: any) {
    // 错误在拦截器中处理
  } finally {
    sendingCode.value = false
  }
}

// 开始倒计时
function startCountdown() {
  countdown.value = 60
  countdownTimer = window.setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }
  }, 1000)
}

// 提交登录
async function handleSubmit() {
  // 表单验证
  if (!formData.phone.trim()) {
    MessagePlugin.warning('请输入手机号')
    return
  }
  if (!isValidPhone.value) {
    MessagePlugin.warning('请输入正确的手机号')
    return
  }
  if (!formData.code.trim()) {
    MessagePlugin.warning('请输入验证码')
    return
  }
  if (!/^\d{6}$/.test(formData.code)) {
    MessagePlugin.warning('请输入6位验证码')
    return
  }

  loading.value = true

  try {
    const res = await phoneLogin({
      phone: formData.phone.trim(),
      code: formData.code,
    })

    // 保存登录状态
    userStore.token = res.data.token
    userStore.userInfo = res.data.user
    localStorage.setItem('admin_token', res.data.token)
    localStorage.setItem('admin_user', JSON.stringify(res.data.user))

    // 保存记住手机号
    if (rememberMe.value) {
      localStorage.setItem('remembered_phone', formData.phone)
    } else {
      localStorage.removeItem('remembered_phone')
    }

    MessagePlugin.success('登录成功')

    // 跳转到目标页面
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (error: any) {
    // 错误已在request拦截器中处理
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(() => {
  // 加载系统设置
  loadSettings()

  // 读取记住的手机号
  const remembered = localStorage.getItem('remembered_phone')
  if (remembered) {
    formData.phone = remembered
    rememberMe.value = true
  }
})

// 清理定时器
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #4a2020 0%, #2d1515 50%, #1a0a0a 100%);
}

/* 背景层 */
.background-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.bg-pattern {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(229, 55, 52, 0.25) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(229, 55, 52, 0.2) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(229, 55, 52, 0.1) 0%, transparent 70%);
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: rgba(40, 20, 20, 0.6);
  background-image: radial-gradient(circle at 50% 50%, rgba(229, 55, 52, 0.15) 0%, rgba(40, 20, 20, 0) 70%);
}

/* 主内容 */
.main-content {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 48px 16px;
}

/* 登录卡片 */
.login-card {
  width: 100%;
  max-width: 520px;
  background: rgba(70, 40, 40, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
  padding: 32px 48px;
}

@media (max-width: 600px) {
  .login-card {
    padding: 24px;
  }
}

/* 卡片头部 */
.card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40px;
}

.logo-box {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: linear-gradient(135deg, #e53734 0%, #8a1c1a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(229, 55, 52, 0.15);
  margin-bottom: 24px;
  overflow: hidden;
}

.logo-box .company-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-box .default-logo {
  width: 40px;
  height: 40px;
}

.title {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  text-align: center;
  letter-spacing: -0.5px;
  margin: 0;
}

.subtitle {
  font-size: 14px;
  font-weight: 500;
  color: #c79594;
  margin-top: 8px;
  letter-spacing: 1px;
  opacity: 0.8;
}

/* 表单 */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  padding-bottom: 8px;
  padding-left: 4px;
}

.input-wrapper {
  display: flex;
  align-items: stretch;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.input-wrapper.focused {
  box-shadow: 0 0 0 2px rgba(229, 55, 52, 0.5);
}

.form-input {
  flex: 1;
  min-width: 0;
  height: 56px;
  background: #5a3535;
  border: none;
  padding: 0 16px;
  color: #fff;
  font-size: 16px;
  outline: none;
}

.form-input::placeholder {
  color: rgba(212, 168, 167, 0.7);
}

.input-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  background: #5a3535;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  color: #d4a8a7;
  transition: color 0.2s;
}

.input-wrapper.focused .input-icon {
  color: #fff;
}

/* 验证码行布局 */
.code-row {
  display: flex;
  gap: 12px;
}

.code-input-wrapper {
  flex: 1;
}

.send-code-btn {
  flex-shrink: 0;
  min-width: 120px;
  height: 56px;
  background: #e53734;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.send-code-btn:hover:not(:disabled) {
  background: #c02e2b;
}

.send-code-btn:disabled {
  background: #5a3535;
  color: #d4a8a7;
  cursor: not-allowed;
}

/* 额外选项 */
.form-extras {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  padding: 0 4px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox {
  display: none;
}

.checkbox-custom {
  width: 16px;
  height: 16px;
  border: 1px solid #c79594;
  border-radius: 4px;
  background: transparent;
  position: relative;
  transition: all 0.2s;
}

.checkbox:checked + .checkbox-custom {
  background: #e53734;
  border-color: #e53734;
}

.checkbox:checked + .checkbox-custom::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-label {
  font-size: 14px;
  color: #c79594;
  transition: color 0.2s;
}

.remember-me:hover .checkbox-label {
  color: #fff;
}

/* 登录按钮 */
.login-btn {
  margin-top: 16px;
  width: 100%;
  height: 48px;
  background: #e53734;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(229, 55, 52, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.login-btn:hover:not(:disabled) {
  background: #c02e2b;
}

.login-btn:active:not(:disabled) {
  transform: scale(0.99);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 页脚 */
.footer {
  margin-top: 48px;
  text-align: center;
}

.footer p {
  font-size: 12px;
  color: rgba(212, 168, 167, 0.7);
  letter-spacing: 1px;
}
</style>
