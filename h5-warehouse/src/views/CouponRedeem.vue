<template>
  <div class="coupon-redeem-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <h2 class="page-title">代金券核销</h2>
      <div class="header-right"></div>
    </div>

    <!-- 输入区域 -->
    <div class="input-section">
      <div class="input-card">
        <div class="input-title">请输入代金券码</div>
        <div class="input-row">
          <t-input
            v-model="couponCode"
            placeholder="请输入或扫描券码"
            clearable
            size="large"
            @enter="handleVerify"
          />
          <t-button
            theme="primary"
            size="large"
            :loading="verifying"
            @click="handleVerify"
          >
            验证
          </t-button>
        </div>
        <div class="input-tip">推销员出示代金券，输入券码进行验证</div>
      </div>
    </div>

    <!-- 验证结果 -->
    <div v-if="couponInfo" class="result-section">
      <div class="result-card">
        <div class="result-header">
          <t-icon name="check-circle" size="48px" class="success-icon" />
          <span class="result-title">验证通过</span>
        </div>

        <div class="coupon-info">
          <div class="coupon-amount">
            <span class="amount-symbol">¥</span>
            <span class="amount-value">{{ couponInfo.amount }}</span>
          </div>
          <div class="coupon-code">券码：{{ couponInfo.code }}</div>
        </div>

        <div class="info-list">
          <div class="info-item">
            <span class="info-label">持有人</span>
            <span class="info-value">{{ couponInfo.agentName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">手机号</span>
            <span class="info-value">{{ formatPhone(couponInfo.agentPhone) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">券来源</span>
            <span class="info-value">{{ couponInfo.sourceDesc || '营销活动' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">有效期至</span>
            <span class="info-value">{{ formatDate(couponInfo.expiredAt) }}</span>
          </div>
        </div>

        <div class="action-buttons">
          <t-button
            theme="primary"
            size="large"
            block
            :loading="redeeming"
            @click="handleRedeem"
          >
            确认核销
          </t-button>
          <t-button
            theme="default"
            size="large"
            block
            @click="handleCancel"
          >
            取消
          </t-button>
        </div>
      </div>
    </div>

    <!-- 核销成功 -->
    <div v-if="redeemSuccess" class="success-section">
      <div class="success-card">
        <t-icon name="check-circle" size="64px" class="big-success-icon" />
        <div class="success-title">核销成功</div>
        <div class="success-amount">已抵扣 ¥{{ redeemResult?.amount }}</div>
        <t-button
          theme="primary"
          size="large"
          block
          @click="handleReset"
        >
          继续核销
        </t-button>
      </div>
    </div>

    <!-- 使用说明 -->
    <div class="tips-section">
      <div class="tips-title">使用说明</div>
      <div class="tips-content">
        <p>1. 代金券仅限推销员本人使用</p>
        <p>2. 核销前请核实推销员身份</p>
        <p>3. 代金券可抵扣烟花购买金额</p>
        <p>4. 代金券一旦核销无法撤回</p>
        <p>5. 过期代金券无法使用</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import { verifyCoupon, redeemCoupon, type CouponVerifyResult, type CouponRedeemResult } from '@/api/coupon'

const router = useRouter()

// 状态
const couponCode = ref('')
const verifying = ref(false)
const couponInfo = ref<CouponVerifyResult | null>(null)
const redeeming = ref(false)
const redeemSuccess = ref(false)
const redeemResult = ref<CouponRedeemResult | null>(null)

// 返回
function goBack() {
  router.back()
}

// 格式化手机号
function formatPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 验证代金券
async function handleVerify() {
  if (!couponCode.value.trim()) {
    Toast({ message: '请输入券码', theme: 'warning' })
    return
  }

  verifying.value = true
  couponInfo.value = null
  redeemSuccess.value = false

  try {
    const result = await verifyCoupon(couponCode.value.trim().toUpperCase())
    couponInfo.value = result
  } catch (error: any) {
    Toast({ message: error.message || '验证失败', theme: 'error' })
  } finally {
    verifying.value = false
  }
}

// 取消
function handleCancel() {
  couponInfo.value = null
  couponCode.value = ''
}

// 核销代金券
async function handleRedeem() {
  if (!couponInfo.value) return

  Dialog.confirm({
    title: '确认核销',
    content: `确定核销该代金券吗？\n券码：${couponInfo.value.code}\n面额：¥${couponInfo.value.amount}`,
    confirmBtn: '确认核销',
    cancelBtn: '取消',
    onConfirm: async () => {
      redeeming.value = true
      try {
        const result = await redeemCoupon(couponInfo.value!.code)
        redeemResult.value = result
        redeemSuccess.value = true
        couponInfo.value = null
        Toast({ message: '核销成功', theme: 'success' })
      } catch (error: any) {
        Toast({ message: error.message || '核销失败', theme: 'error' })
      } finally {
        redeeming.value = false
      }
    }
  })
}

// 重置继续核销
function handleReset() {
  couponCode.value = ''
  couponInfo.value = null
  redeemSuccess.value = false
  redeemResult.value = null
}
</script>

<style scoped>
.coupon-redeem-page {
  min-height: 100vh;
  background-color: var(--bg-page);
  padding-bottom: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, var(--primary) 0%, #1890ff 100%);
  padding: 12px 16px;
  color: white;
}

.header-left,
.header-right {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-title {
  font-size: 17px;
  font-weight: 500;
  margin: 0;
}

.input-section {
  padding: 16px 12px;
}

.input-card {
  background-color: var(--bg-white);
  border-radius: 12px;
  padding: 20px 16px;
}

.input-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.input-row {
  display: flex;
  gap: 12px;
}

.input-row :deep(.t-input) {
  flex: 1;
}

.input-tip {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 12px;
}

.result-section {
  padding: 0 12px;
}

.result-card {
  background-color: var(--bg-white);
  border-radius: 12px;
  padding: 24px 16px;
}

.result-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.success-icon {
  color: #4CAF50;
  margin-bottom: 8px;
}

.result-title {
  font-size: 18px;
  font-weight: 500;
  color: #4CAF50;
}

.coupon-info {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, rgba(229, 57, 53, 0.1) 0%, rgba(255, 111, 97, 0.1) 100%);
  border-radius: 12px;
  margin-bottom: 20px;
}

.coupon-amount {
  color: #E53935;
  margin-bottom: 8px;
}

.amount-symbol {
  font-size: 18px;
  font-weight: 500;
}

.amount-value {
  font-size: 42px;
  font-weight: 600;
}

.coupon-code {
  font-size: 14px;
  color: var(--text-secondary);
}

.info-list {
  border-top: 1px solid var(--border-color);
  padding-top: 16px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  font-size: 14px;
}

.info-label {
  color: var(--text-tertiary);
}

.info-value {
  color: var(--text-primary);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.success-section {
  padding: 0 12px;
}

.success-card {
  background-color: var(--bg-white);
  border-radius: 12px;
  padding: 40px 16px;
  text-align: center;
}

.big-success-icon {
  color: #4CAF50;
  margin-bottom: 16px;
}

.success-title {
  font-size: 20px;
  font-weight: 600;
  color: #4CAF50;
  margin-bottom: 8px;
}

.success-amount {
  font-size: 24px;
  font-weight: 600;
  color: #E53935;
  margin-bottom: 24px;
}

.tips-section {
  padding: 16px 12px;
}

.tips-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.tips-content {
  background-color: var(--bg-white);
  border-radius: 12px;
  padding: 16px;
}

.tips-content p {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
  padding: 6px 0;
  line-height: 1.5;
}
</style>
