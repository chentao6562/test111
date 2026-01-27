<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { get, post } from '../api'
import { useUserStore } from '../stores/user'
import WelcomeGuide from '../components/WelcomeGuide.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 表单数据
const phone = ref('')
const code = ref('')
const inviteCode = ref('')
const agreed = ref(false)
const isNewUser = ref(false) // 是否为新用户注册模式
const isLoading = ref(false) // 登录Loading状态，防止重复点击

// 公司配置（Logo和名称）
const companyConfig = ref({
  companyName: '蒙庆烟花·炮多多',
  companyLogo: ''
})

// 【2026-01-22】欢迎弹窗控制
const showWelcomeGuide = ref(false)

// 验证码倒计时
const countdown = ref(0)
let countdownTimer: number | null = null

// 加载公司配置
const loadCompanyConfig = async () => {
  try {
    const res = await get<{ companyName: string; companyLogo: string }>('/config')
    if (res.data) {
      if (res.data.companyName) {
        companyConfig.value.companyName = res.data.companyName
      }
      if (res.data.companyLogo) {
        companyConfig.value.companyLogo = res.data.companyLogo
      }
    }
  } catch (err) {
    // 加载失败使用默认值
    console.log('加载公司配置失败，使用默认值')
  }
}

// 页面初始化：自动填充URL中的邀请码
onMounted(() => {
  const urlInviteCode = route.query.inviteCode as string
  if (urlInviteCode) {
    inviteCode.value = urlInviteCode.toUpperCase().trim()
    isNewUser.value = true // 有邀请码自动切换到注册模式
  }
  // 加载公司配置
  loadCompanyConfig()
})

// 组件销毁时清理定时器，防止内存泄漏
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})

// 计算属性
const canSendCode = computed(() => {
  return /^1[3-9]\d{9}$/.test(phone.value) && countdown.value === 0
})

const canLogin = computed(() => {
  return /^1[3-9]\d{9}$/.test(phone.value) && /^\d{6}$/.test(code.value) && agreed.value
})

// 发送验证码
const sendCode = async () => {
  if (!canSendCode.value) return

  try {
    await post('/auth/send-code', { phone: phone.value })
    Toast({ message: '验证码已发送', theme: 'success' })
    startCountdown()
  } catch (err) {
    // 错误已在拦截器处理
  }
}

// 开始倒计时
const startCountdown = () => {
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

// 点击登录按钮（包含禁用状态提示）
const handleLoginClick = () => {
  if (!canLogin.value) {
    // 提供具体的错误提示
    if (!phone.value || !/^1[3-9]\d{9}$/.test(phone.value)) {
      Toast({ message: '请输入正确的手机号', theme: 'warning' })
    } else if (!code.value || !/^\d{6}$/.test(code.value)) {
      Toast({ message: '请输入6位验证码', theme: 'warning' })
    } else if (!agreed.value) {
      Toast({ message: '请先同意服务协议和隐私政策', theme: 'warning' })
    }
    return
  }
  login()
}

// 登录
const login = async () => {
  // 防止重复点击
  if (isLoading.value) return
  isLoading.value = true

  try {
    const params: any = {
      phone: phone.value,
      code: code.value
    }
    if (inviteCode.value) {
      params.inviteCode = inviteCode.value
    }

    const res = await post<{ token: string; userInfo: any; warning?: string }>('/auth/phone-login', params)

    userStore.setLogin(res.data.token, res.data.userInfo)

    // 等待响应式系统更新完成，确保token已存储
    await nextTick()

    // 【2026-01-22修复】验证登录状态已生效
    if (!userStore.token || !userStore.userInfo) {
      console.error('[登录] 状态保存异常，token或userInfo为空')
      Toast({ message: '登录状态保存失败，请重试', theme: 'error' })
      return
    }

    // 【2026-01-22修复】等待token完全生效，避免跳转后的API请求返回401
    // 这个延迟确保：1.localStorage已同步 2.后续请求能正确携带token
    await new Promise(resolve => setTimeout(resolve, 100))

    // 检查是否有警告信息（如邀请码无效）
    if (res.data.warning) {
      Toast({ message: res.data.warning, theme: 'warning' })
    } else {
      Toast({ message: '登录成功', theme: 'success' })
    }

    // 【2026-01-22】新用户首次登录显示欢迎弹窗
    const isFirstLogin = !localStorage.getItem('welcome_guide_shown')
    const isAgent = res.data.userInfo?.type === 'LEVEL1' || res.data.userInfo?.type === 'LEVEL2'

    if (isNewUser.value && isFirstLogin && isAgent) {
      // 显示欢迎弹窗，不立即跳转
      showWelcomeGuide.value = true
      return
    }

    // 跳转到之前的页面或首页
    const redirect = route.query.redirect as string
    router.replace(redirect || '/')
  } catch (err) {
    // 错误已在拦截器处理
  } finally {
    isLoading.value = false
  }
}

// 关闭
const goBack = () => {
  router.back()
}

// 【2026-01-22】欢迎弹窗关闭
const handleWelcomeClose = () => {
  showWelcomeGuide.value = false
  // 【2026-01-28修复】标记欢迎弹窗已显示，避免每次登录都显示
  localStorage.setItem('welcome_guide_shown', 'true')
  // 跳转到之前的页面或首页
  const redirect = route.query.redirect as string
  router.replace(redirect || '/')
}
</script>

<template>
  <div class="login-page">
    <!-- 顶部导航 -->
    <div class="nav-header">
      <div class="nav-back" @click="goBack">
        <t-icon name="close" size="24px" />
      </div>
      <span class="nav-hint">呼市实体店预约</span>
      <div class="nav-placeholder"></div>
    </div>

    <div class="login-content">
      <!-- 品牌区域 -->
      <div class="brand-section">
        <div class="brand-row">
          <div class="logo-circle">
            <img src="/logo.png" alt="Logo" class="logo-img" onerror="this.style.display='none'" />
          </div>
          <h1 class="brand-name">蒙庆烟花 <span class="brand-sub">炮多多</span></h1>
        </div>
        <div class="brand-tags">
          <span class="tag">批发价</span>
          <span class="tag">正规店</span>
          <span class="tag highlight">买贵包赔</span>
        </div>
      </div>

      <!-- 活动入口 -->
      <div class="activity-banner" @click="router.push('/free-fireworks')">
        <span>🎆 过年烟花免费拿 ›</span>
      </div>

      <!-- 登录表单卡片 -->
      <div class="login-card">
        <!-- 背景图案 -->
        <div class="card-pattern"></div>

        <div class="card-content">
          <!-- 登录/注册切换 -->
          <div class="mode-tabs">
            <div
              class="mode-tab"
              :class="{ active: !isNewUser }"
              @click="isNewUser = false"
            >
              登录
            </div>
            <div
              class="mode-tab"
              :class="{ active: isNewUser }"
              @click="isNewUser = true"
            >
              注册
            </div>
          </div>


          <div class="form-fields">
            <!-- 手机号输入 -->
            <div class="form-item">
              <div class="input-wrapper">
                <input
                  v-model="phone"
                  type="tel"
                  maxlength="11"
                  class="form-input"
                  placeholder="请输入手机号"
                />
              </div>
            </div>

            <!-- 验证码输入 + 发送按钮 -->
            <div class="form-item">
              <div class="code-row">
                <input
                  v-model="code"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  class="form-input code-input"
                  placeholder="请输入验证码"
                />
                <span
                  class="send-code-btn"
                  :class="{ disabled: !canSendCode }"
                  @click="sendCode"
                >
                  {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                </span>
              </div>
            </div>

            <!-- 邀请码输入（新用户注册时显示） -->
            <div class="form-item" v-if="isNewUser">
              <label class="form-label">邀请码（选填）</label>
              <div class="input-wrapper">
                <t-icon name="gift" size="20px" class="input-icon" />
                <input
                  v-model="inviteCode"
                  type="text"
                  maxlength="10"
                  class="form-input"
                  placeholder="有邀请码请填写"
                />
              </div>
              <div class="invite-hint">
                <span class="hint-item">
                  <t-icon name="check-circle" size="14px" class="hint-icon success" />
                  有邀请码：成为推销员，享受分润
                </span>
                <span class="hint-item">
                  <t-icon name="money-circle" size="14px" class="hint-icon gold" />
                  填写邀请码，邀请人也可获得¥15奖励
                </span>
                <span class="hint-item invite-link" @click="router.push('/agent-recruit')">
                  <t-icon name="info-circle" size="14px" class="hint-icon info" />
                  还没有邀请码？了解推销员收益 →
                </span>
              </div>
            </div>

            <!-- 协议 -->
            <div class="agreement">
              <t-checkbox v-model="agreed" />
              <span class="agreement-text">
                我已阅读并同意
                <a href="javascript:;" class="link">《服务协议》</a>
                和
                <a href="javascript:;" class="link">《隐私政策》</a>
              </span>
            </div>

            <!-- 登录/注册按钮 -->
            <button
              class="login-btn"
              :class="{ disabled: !canLogin || isLoading }"
              @click="handleLoginClick"
            >
              <template v-if="isLoading">
                <t-icon name="loading" size="20px" class="loading-icon" />
                处理中...
              </template>
              <template v-else>
                {{ isNewUser ? '立即注册' : '立即登录' }}
              </template>
            </button>
            <!-- 登录按钮禁用提示 -->
            <p class="login-hint" v-if="!canLogin">
              <span v-if="!phone || !/^1[3-9]\d{9}$/.test(phone)">请输入正确的手机号</span>
              <span v-else-if="!code || !/^\d{6}$/.test(code)">请输入6位验证码</span>
              <span v-else-if="!agreed">请勾选同意服务协议</span>
            </p>
          </div>

        </div>
      </div>

      <!-- 底部信息 -->
      <div class="footer-section">
        <!-- 【2026-01-22】信任背书 -->
        <div class="trust-footer">
          <div class="trust-item">
            <t-icon name="verified" size="14px" />
            <span>正品保障</span>
          </div>
          <div class="trust-divider">|</div>
          <div class="trust-item">
            <t-icon name="time" size="14px" />
            <span>到店付款</span>
          </div>
          <div class="trust-divider">|</div>
          <div class="trust-item">
            <t-icon name="service" size="14px" />
            <span>专属服务</span>
          </div>
        </div>

        <div class="contact-info">
          <p class="contact-title">客服电话</p>
          <p class="contact-phone">13190531439 / 15849390600</p>
        </div>
        <p class="copyright">© 2024 蒙庆烟花 版权所有</p>
      </div>
    </div>

    <!-- 装饰背景 -->
    <div class="bg-decoration bg-top"></div>
    <div class="bg-decoration bg-bottom"></div>

    <!-- 【2026-01-22】新用户欢迎弹窗 -->
    <WelcomeGuide
      :visible="showWelcomeGuide"
      @close="handleWelcomeClose"
    />
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--bg-light);
  position: relative;
  overflow: hidden;
}

.nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: transparent;
  position: relative;
  z-index: 10;
}

.nav-back, .nav-placeholder {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
}

.nav-hint {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.login-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 20px;
}

/* 品牌区域 - 居中 */
.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 10px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.logo-circle {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.brand-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.brand-sub {
  font-weight: 600;
  color: var(--primary);
}

.brand-tags {
  display: flex;
  gap: 6px;
}

.brand-tags .tag {
  font-size: 11px;
  padding: 3px 10px;
  background: linear-gradient(135deg, #FF4D6D 0%, #EF062D 100%);
  color: #fff;
  border-radius: 12px;
  font-weight: 500;
}

.brand-tags .tag.highlight {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #8B4513;
}

/* 活动入口 */
.activity-banner {
  width: 100%;
  max-width: 480px;
  text-align: center;
  padding: 10px;
  background: linear-gradient(135deg, #FF4D6D 0%, #EF062D 100%);
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

/* 登录卡片 */
.login-card {
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  padding: 16px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(230, 219, 220, 0.5);
}

.card-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(var(--primary) 0.5px, transparent 0.5px);
  background-size: 24px 24px;
  opacity: 0.03;
  pointer-events: none;
}

.card-content {
  position: relative;
  z-index: 1;
}

/* 登录/注册切换Tab */
.mode-tabs {
  display: flex;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 14px;
}

.mode-tab {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.mode-tab.active {
  background: #fff;
  color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.form-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.form-subtitle {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 24px;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-item {
  display: flex;
  flex-direction: column;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.form-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 15px;
  color: var(--text-primary);
  background: #fff;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(233, 12, 31, 0.1);
}

.form-input::placeholder {
  color: var(--text-placeholder);
}

/* 验证码行 */
.code-row {
  display: flex;
  gap: 10px;
}

.code-input {
  flex: 1;
}

.send-code-btn {
  flex-shrink: 0;
  padding: 0 16px;
  height: 48px;
  line-height: 48px;
  background: var(--primary);
  color: #fff;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.send-code-btn.disabled {
  background: #ccc;
  cursor: not-allowed;
}

.send-code-link {
  font-size: 12px;
  color: var(--primary);
  font-weight: 500;
  cursor: pointer;
}

.send-code-link.disabled {
  color: var(--text-muted);
  cursor: not-allowed;
}

.agreement {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 4px;
}

.agreement-text {
  flex: 1;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.link {
  color: var(--primary);
  text-decoration: none;
}

/* 邀请码提示 */
.invite-hint {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.hint-icon {
  flex-shrink: 0;
}

.hint-icon.success {
  color: #52c41a;
}

.hint-icon.info {
  color: #1890ff;
}

.hint-icon.gold {
  color: #faad14;
}

/* 邀请链接可点击 */
.hint-item.invite-link {
  cursor: pointer;
  color: var(--primary);
}

.hint-item.invite-link:hover {
  text-decoration: underline;
}

/* 【2026-01-22】砍价活动横幅 */
.bonus-banner {
  width: 100%;
  max-width: 480px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #FF4D6D 0%, #EF062D 100%);
  border-radius: 12px;
  margin-bottom: 16px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(239, 6, 45, 0.25);
  transition: transform 0.2s, box-shadow 0.2s;
}

.bonus-banner:active {
  transform: scale(0.98);
  box-shadow: 0 2px 6px rgba(239, 6, 45, 0.2);
}

.bonus-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bonus-icon .t-icon {
  color: #fff;
}

.bonus-content {
  flex: 1;
}

.bonus-title {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 2px;
}

.bonus-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

.bonus-arrow {
  color: rgba(255, 255, 255, 0.7);
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 56px;
  background: linear-gradient(135deg, #FF4D6D 0%, #EF062D 100%);
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(233, 12, 31, 0.3);
  transition: all 0.2s;
  margin-top: 8px;
}

.login-btn:active {
  transform: scale(0.98);
}

.login-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: linear-gradient(135deg, #ccc 0%, #aaa 100%);
}

.login-btn .loading-icon {
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 登录提示 */
.login-hint {
  text-align: center;
  color: #EF062D;
  font-size: 12px;
  margin-top: 8px;
}

/* 【2026-01-22】信任背书 */
.trust-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  margin-bottom: 8px;
}

.trust-footer .trust-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #52c41a;
}

.trust-footer .trust-item .t-icon {
  color: #52c41a;
}

.trust-footer .trust-divider {
  color: #ddd;
  font-size: 10px;
}

/* 底部区域 */
.footer-section {
  padding: 32px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.contact-info {
  text-align: center;
}

.contact-title {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.contact-phone {
  font-size: 14px;
  color: var(--primary);
  font-weight: 500;
}

.copyright {
  font-size: 10px;
  color: #ccc;
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
