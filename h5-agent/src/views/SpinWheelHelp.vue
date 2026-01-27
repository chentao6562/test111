<template>
  <div class="help-page">
    <!-- 背景装饰 -->
    <div class="bg-decorations">
      <span class="coin coin-1">🪙</span>
      <span class="coin coin-2">💰</span>
      <span class="star star-1">⭐</span>
      <span class="star star-2">✨</span>
    </div>

    <!-- 未助力：显示助力表单 -->
    <div class="modal-container" v-if="!helpSuccess">
      <!-- 红包头部 -->
      <div class="envelope-header">
        <div class="header-decorations">
          <span class="deco deco-1">⭐</span>
          <span class="deco deco-2">❤️</span>
          <span class="deco deco-3">○</span>
        </div>

        <!-- 用户头像 -->
        <div class="user-avatar-wrapper">
          <div class="avatar-circle">
            <span class="avatar-text">{{ detail?.participation.name?.charAt(0) || '用' }}</span>
          </div>
        </div>

        <h2 class="header-title">帮TA助力赢取提现资格</h2>
        <p class="header-subtitle">{{ detail?.participation.name || '好友' }}的账户已累计</p>

        <!-- 金额显示 -->
        <div class="amount-display">
          <span class="currency">¥</span>
          <span class="amount-value">{{ formatAmount(detail?.participation.totalAmount || 0) }}</span>
        </div>

        <!-- 进度条 -->
        <div class="progress-wrapper">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${detail?.participation.progressPercent || 0}%` }"
            ></div>
          </div>
          <span class="progress-text">{{ detail?.participation.progressPercent?.toFixed(1) || 0 }}%</span>
        </div>
      </div>

      <!-- 表单区域 -->
      <div class="form-section">
        <div class="form-card">
          <h3 class="form-title">输入手机号帮TA助力</h3>

          <!-- 手机号输入 -->
          <div class="input-group">
            <input
              v-model="form.phone"
              type="tel"
              placeholder="请输入您的手机号"
              maxlength="11"
              class="input-field"
            />
          </div>

          <!-- 验证码输入 -->
          <div class="input-group code-group">
            <input
              v-model="form.code"
              type="text"
              placeholder="请输入验证码"
              maxlength="6"
              class="input-field code-input"
            />
            <button
              class="code-btn"
              :class="{ disabled: countdown > 0 }"
              :disabled="countdown > 0"
              @click="sendCode"
            >
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </button>
          </div>

          <!-- 昵称输入（选填） -->
          <div class="input-group">
            <input
              v-model="form.name"
              type="text"
              placeholder="您的昵称（选填）"
              class="input-field"
            />
          </div>

          <!-- 提交按钮 -->
          <button
            class="submit-btn"
            :class="{ loading: submitting }"
            :disabled="submitting"
            @click="submitHelp"
          >
            <span v-if="submitting">助力中...</span>
            <span v-else>立即助力</span>
          </button>
        </div>

        <!-- 助力记录 -->
        <div class="records-card" v-if="detail && detail.helpRecords.length > 0">
          <div class="records-header">
            <span class="records-title">助力记录</span>
            <span class="records-count">{{ detail.helpRecords.length }}人已助力</span>
          </div>
          <div class="records-list">
            <div
              class="record-item"
              v-for="record in detail.helpRecords.slice(0, 5)"
              :key="record.id"
            >
              <div class="record-left">
                <span class="record-phone">{{ maskPhone(record.helperPhone) }}</span>
                <span class="new-badge" v-if="record.isNewUser">新用户</span>
              </div>
              <span class="record-amount">+¥{{ record.helpAmount.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 助力成功弹窗 -->
    <div class="success-modal" v-else>
      <div class="success-card">
        <!-- 红包头部 -->
        <div class="success-header">
          <div class="header-decorations">
            <span class="deco deco-1">⭐</span>
            <span class="deco deco-2">❤️</span>
            <span class="deco deco-3">○</span>
          </div>

          <!-- 成功图标 -->
          <div class="success-icon">
            <span>🎁</span>
          </div>

          <h2 class="success-title">助力成功！</h2>
          <p class="success-subtitle">你帮好友获得了</p>

          <!-- 助力金额 -->
          <div class="help-amount">
            <span class="currency">¥</span>
            <span class="amount-value">{{ helpResult?.helpAmount?.toFixed(2) || '0.00' }}</span>
          </div>
        </div>

        <!-- 福利提示 -->
        <div class="benefit-section">
          <div class="benefit-card">
            <div class="benefit-badge">限时福利</div>
            <div class="benefit-content">
              <p class="benefit-title">
                你也获得了<span class="highlight">1次</span>0元拿的机会！
              </p>
              <p class="benefit-sub">
                <span>👥</span>
                今日已有超过1万人成功参与
              </p>
            </div>
          </div>

          <!-- 参与按钮 -->
          <button class="join-btn" @click="goToSpin">
            <span>我也要0元领</span>
            <span class="arrow">→</span>
          </button>

          <!-- 返回首页 -->
          <button class="back-btn" @click="goHome">
            返回首页
          </button>
        </div>
      </div>
    </div>

    <!-- 活动信息 -->
    <div class="activity-footer" v-if="detail">
      <p class="activity-name">{{ detail.config.name }}</p>
      <p class="activity-time">活动截止：{{ formatEndTime(detail.config.endTime) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-mobile-vue'
import {
  getShareDetail,
  sendHelpCode,
  doHelp,
  type ShareDetail,
  type HelpResult,
} from '@/api/spinWheel'

const route = useRoute()
const router = useRouter()

// 状态
const detail = ref<ShareDetail | null>(null)
const helpSuccess = ref(false)
const helpResult = ref<HelpResult | null>(null)
const submitting = ref(false)
const countdown = ref(0)

// 表单
const form = reactive({
  phone: '',
  code: '',
  name: '',
})

// 参与码
const participationCode = route.params.code as string

// 加载详情
onMounted(async () => {
  if (!participationCode) {
    MessagePlugin.error('无效的链接')
    return
  }

  try {
    detail.value = await getShareDetail(participationCode)
    if (!detail.value) {
      MessagePlugin.error('活动不存在或已结束')
    }
  } catch (error) {
    MessagePlugin.error('加载失败')
  }
})

// 发送验证码
async function sendCode() {
  if (!form.phone || form.phone.length !== 11) {
    MessagePlugin.warning('请输入正确的手机号')
    return
  }

  try {
    await sendHelpCode(form.phone)
    MessagePlugin.success('验证码已发送')

    // 开始倒计时
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (error) {
    MessagePlugin.error('发送失败，请重试')
  }
}

// 提交助力
async function submitHelp() {
  if (!form.phone || form.phone.length !== 11) {
    MessagePlugin.warning('请输入正确的手机号')
    return
  }
  if (!form.code) {
    MessagePlugin.warning('请输入验证码')
    return
  }

  submitting.value = true

  try {
    const result = await doHelp({
      participationCode,
      helperPhone: form.phone,
      helperName: form.name || undefined,
      verifyCode: form.code,
    })

    if (result.success) {
      helpSuccess.value = true
      helpResult.value = result
      MessagePlugin.success(result.message || '助力成功')
    } else {
      MessagePlugin.error(result.message || '助力失败')
    }
  } catch (error) {
    MessagePlugin.error('助力失败，请重试')
  } finally {
    submitting.value = false
  }
}

// 去参与
function goToSpin() {
  router.push('/spin-wheel')
}

// 返回首页
function goHome() {
  router.push('/')
}

// 格式化金额
function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

// 隐藏手机号中间四位
function maskPhone(phone: string): string {
  if (!phone || phone.length < 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 格式化结束时间
function formatEndTime(endTime: string): string {
  const date = new Date(endTime)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.help-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #E02E24 0%, #FF4D4D 40%, #f5f5f5 40%);
  padding-bottom: 80px;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.bg-decorations {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40%;
  pointer-events: none;
}

.coin, .star {
  position: absolute;
  opacity: 0.3;
  font-size: 24px;
}

.coin-1 { top: 10%; left: 10%; }
.coin-2 { top: 15%; right: 15%; }
.star-1 { top: 25%; left: 20%; font-size: 16px; }
.star-2 { top: 8%; right: 25%; font-size: 20px; }

/* 弹窗容器 */
.modal-container {
  padding: 20px 16px;
}

/* 红包头部 */
.envelope-header {
  background: linear-gradient(180deg, #FF4D4D 0%, #E02E24 100%);
  border-radius: 24px 24px 0 0;
  padding: 30px 20px 40px;
  text-align: center;
  position: relative;
  color: #fff;
}

.header-decorations {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.deco {
  position: absolute;
  opacity: 0.4;
}

.deco-1 { top: 15px; left: 30px; font-size: 16px; color: #FFD700; }
.deco-2 { top: 30px; right: 25px; font-size: 14px; }
.deco-3 { bottom: 50px; left: 15px; font-size: 12px; }

.user-avatar-wrapper {
  margin-bottom: 16px;
}

.avatar-circle {
  width: 70px;
  height: 70px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  overflow: hidden;
}

.avatar-circle img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-text {
  font-size: 28px;
  font-weight: bold;
}

.header-title {
  font-size: 22px;
  font-weight: 900;
  margin-bottom: 8px;
}

.header-subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 12px;
}

.amount-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 16px;
}

.amount-display .currency {
  font-size: 24px;
  font-weight: bold;
}

.amount-display .amount-value {
  font-size: 52px;
  font-weight: 900;
  line-height: 1;
}

.progress-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.progress-bar {
  width: 160px;
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FFD700, #FFA500);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  font-weight: bold;
}

/* 表单区域 */
.form-section {
  margin-top: -20px;
}

.form-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.form-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.input-group {
  margin-bottom: 14px;
}

.input-field {
  width: 100%;
  height: 48px;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 0 16px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.input-field:focus {
  border-color: #E02E24;
}

.code-group {
  display: flex;
  gap: 10px;
}

.code-input {
  flex: 1;
}

.code-btn {
  flex-shrink: 0;
  padding: 0 16px;
  height: 48px;
  background: #fff;
  border: 1px solid #E02E24;
  border-radius: 8px;
  color: #E02E24;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.code-btn.disabled {
  border-color: #ccc;
  color: #999;
  cursor: not-allowed;
}

.submit-btn {
  width: 100%;
  height: 50px;
  background: linear-gradient(180deg, #FF5F5F 0%, #E02E24 100%);
  border: none;
  border-radius: 25px;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 10px;
  box-shadow: 0 4px 15px rgba(224, 46, 36, 0.4);
}

.submit-btn.loading {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 助力记录 */
.records-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin-top: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.records-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.records-count {
  font-size: 12px;
  color: #999;
}

.records-list {
  max-height: 200px;
  overflow-y: auto;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.record-item:last-child {
  border-bottom: none;
}

.record-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.record-phone {
  color: #333;
  font-size: 14px;
}

.new-badge {
  background: #E02E24;
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
}

.record-amount {
  color: #E02E24;
  font-weight: bold;
  font-size: 14px;
}

/* 助力成功弹窗 */
.success-modal {
  padding: 60px 20px 20px;
}

.success-card {
  background: #fff;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.success-header {
  background: linear-gradient(180deg, #FF4D4D 0%, #E02E24 100%);
  padding: 40px 20px;
  text-align: center;
  position: relative;
  color: #fff;
}

.success-icon {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  backdrop-filter: blur(4px);
}

.success-title {
  font-size: 28px;
  font-weight: 900;
  margin-bottom: 8px;
}

.success-subtitle {
  font-size: 15px;
  opacity: 0.95;
  margin-bottom: 8px;
}

.help-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
}

.help-amount .currency {
  font-size: 24px;
  font-weight: bold;
}

.help-amount .amount-value {
  font-size: 56px;
  font-weight: 900;
  line-height: 1;
}

/* 福利区域 */
.benefit-section {
  padding: 24px 20px;
}

.benefit-card {
  background: #FFF8F8;
  border: 1px solid rgba(224, 46, 36, 0.1);
  border-radius: 16px;
  padding: 20px 16px 16px;
  position: relative;
  text-align: center;
  margin-bottom: 20px;
}

.benefit-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #E02E24;
  color: #fff;
  font-size: 11px;
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 20px;
  white-space: nowrap;
}

.benefit-title {
  font-size: 17px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.benefit-title .highlight {
  color: #E02E24;
}

.benefit-sub {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.join-btn {
  width: 100%;
  height: 56px;
  background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
  border: none;
  border-radius: 28px;
  color: #6B3A00;
  font-size: 20px;
  font-weight: 900;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.5);
  margin-bottom: 12px;
}

.join-btn:active {
  transform: scale(0.98);
}

.arrow {
  font-size: 24px;
}

.back-btn {
  width: 100%;
  background: none;
  border: none;
  color: #999;
  font-size: 14px;
  cursor: pointer;
  padding: 8px;
}

/* 活动信息 */
.activity-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px 20px;
  text-align: center;
  border-top: 1px solid #eee;
}

.activity-name {
  font-size: 14px;
  color: #666;
  margin-bottom: 2px;
}

.activity-time {
  font-size: 12px;
  color: #999;
}
</style>
