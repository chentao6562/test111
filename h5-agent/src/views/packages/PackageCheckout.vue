<script setup lang="ts">
/**
 * 套餐预约结算页面
 * 【2026-01-26】新增套餐预约功能
 */
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import { getImageUrl } from '../../api'
import { getPackageDetail, reservePackage, type Package } from '../../api/package'
import { useUserStore } from '../../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 套餐数据
const pkg = ref<Package | null>(null)
const loading = ref(true)
const submitting = ref(false)

// 访客模式
const isGuestMode = computed(() => userStore.isGuestMode)

// 表单数据
const contactName = ref('')
const contactPhone = ref('')
const pickupDate = ref('')
const remark = ref('')

// 日期范围
const minDate = ref('')
const maxDate = ref('')

// 初始化日期范围
const initDateRange = () => {
  const today = new Date()
  // 最小日期：明天
  const min = new Date(today)
  min.setDate(min.getDate() + 1)
  minDate.value = formatDateForPicker(min)
  // 最大日期：7天后
  const max = new Date(today)
  max.setDate(max.getDate() + 7)
  maxDate.value = formatDateForPicker(max)
}

// 格式化日期
const formatDateForPicker = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 格式化显示日期
const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekDay = weekDays[date.getDay()]
  return `${month}月${day}日 ${weekDay}`
}

// 格式化价格
const formatPrice = (price: number | string | undefined | null): string => {
  if (price === undefined || price === null) return '0.00'
  const num = typeof price === 'string' ? parseFloat(price) : price
  return isNaN(num) ? '0.00' : num.toFixed(2)
}

// 【2026-01-27】获取套餐展示图片（主图或从商品提取）
const getPackageDisplayImage = (): string => {
  if (!pkg.value) return '/placeholder.png'

  // 1. 如果有主图，使用主图
  const images = pkg.value.images
  if (images && images.length > 0 && images[0]) {
    return getImageUrl(images[0])
  }

  // 2. 从商品列表提取第一张图片
  if (pkg.value.items && pkg.value.items.length > 0) {
    for (const item of pkg.value.items) {
      const img = item.product?.images?.[0]
      if (img) return getImageUrl(img)
    }
  }

  return '/placeholder.png'
}

// 计算展示价格
const displayPrice = computed(() => {
  if (!pkg.value) return 0
  return pkg.value.displayPrice || Number(pkg.value.supplyPrice) || 0
})

// 加载套餐详情
const loadPackageDetail = async () => {
  loading.value = true
  try {
    const id = Number(route.params.id)
    if (isNaN(id)) {
      Toast({ message: '套餐ID无效', theme: 'error' })
      router.back()
      return
    }

    const res = await getPackageDetail(id)
    if (res.code === 0 && res.data) {
      pkg.value = res.data
    } else {
      Toast({ message: res.message || '获取套餐信息失败', theme: 'error' })
      router.back()
    }
  } catch (err: any) {
    Toast({ message: err.message || '加载失败', theme: 'error' })
    router.back()
  } finally {
    loading.value = false
  }
}

// 提交预约
const submitReservation = async () => {
  if (!pkg.value) return

  const name = contactName.value?.trim() || ''
  const phone = contactPhone.value?.trim() || ''

  if (!name) {
    Toast({ message: '请填写联系人姓名', theme: 'warning' })
    return
  }

  if (!phone) {
    Toast({ message: '请填写手机号码', theme: 'warning' })
    return
  }

  if (!/^1[3-9]\d{9}$/.test(phone)) {
    Toast({ message: '请填写有效的手机号码（11位）', theme: 'warning' })
    return
  }

  if (!pickupDate.value) {
    Toast({ message: '请选择预计提货日期', theme: 'warning' })
    return
  }

  submitting.value = true
  try {
    const res = await reservePackage(pkg.value.id, {
      customerName: name,
      customerPhone: phone,
      pickupDate: pickupDate.value,
      remark: remark.value?.trim() || undefined
    })

    if (res.code === 0 && res.data) {
      Dialog.confirm({
        title: '预约成功',
        content: `预约号: ${res.data.reservationNo}\n门店将在30分钟内电话确认\n请保持电话畅通`,
        confirmBtn: isGuestMode.value ? '返回首页' : '查看预约',
        cancelBtn: '继续浏览',
        onConfirm: () => {
          if (isGuestMode.value) {
            router.replace('/')
          } else {
            router.replace(`/reservations/${res.data!.reservationId}`)
          }
        },
        onCancel: () => {
          router.replace('/packages')
        }
      })
    } else {
      Toast({ message: res.message || '预约失败', theme: 'error' })
    }
  } catch (err: any) {
    Toast({ message: err.message || '预约失败，请稍后重试', theme: 'error' })
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  initDateRange()
  loadPackageDetail()
})
</script>

<template>
  <div class="checkout-page">
    <!-- 顶部导航 -->
    <nav class="nav-bar">
      <div class="nav-back" @click="goBack">
        <span class="material-symbols-outlined">arrow_back_ios_new</span>
      </div>
      <h2 class="nav-title">套餐预约</h2>
      <div class="nav-placeholder"></div>
    </nav>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="40px" />
    </div>

    <main class="page-content" v-else-if="pkg">
      <!-- 预约流程说明 -->
      <div class="booking-flow-section">
        <div class="flow-title">预约流程</div>
        <div class="flow-steps">
          <div class="flow-step">
            <div class="step-num">1</div>
            <div class="step-content">
              <div class="step-title">提交预约</div>
              <div class="step-desc">免费，无需付款</div>
            </div>
          </div>
          <div class="flow-arrow">→</div>
          <div class="flow-step">
            <div class="step-num">2</div>
            <div class="step-content">
              <div class="step-title">电话确认</div>
              <div class="step-desc">30分钟内回电</div>
            </div>
          </div>
          <div class="flow-arrow">→</div>
          <div class="flow-step">
            <div class="step-num">3</div>
            <div class="step-content">
              <div class="step-title">到店提货</div>
              <div class="step-desc">付款+领赠品</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 套餐信息卡片 -->
      <section class="bento-card package-card">
        <div class="package-header">
          <div class="package-img-wrap">
            <img :src="getPackageDisplayImage()" class="package-img" />
          </div>
          <div class="package-info">
            <h3 class="package-name">{{ pkg.name }}</h3>
            <div class="package-price-row">
              <span class="package-price">¥{{ formatPrice(displayPrice) }}</span>
              <span class="package-original" v-if="pkg.originalPrice && pkg.originalPrice > displayPrice">
                原价¥{{ formatPrice(pkg.originalPrice) }}
              </span>
            </div>
            <div class="package-saved" v-if="pkg.savedAmount && pkg.savedAmount > 0">
              套餐优惠 ¥{{ formatPrice(pkg.savedAmount) }}
            </div>
          </div>
        </div>

        <!-- 套餐商品列表 -->
        <div class="package-items">
          <div class="items-title">套餐包含（{{ pkg.items.length }}件商品）</div>
          <div class="items-list">
            <div v-for="item in pkg.items" :key="item.id" class="item-row">
              <span class="item-name">{{ item.product?.name || item.productName }}</span>
              <span class="item-qty">x{{ item.quantity }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 联系人信息卡片 -->
      <section class="bento-card contact-card">
        <div class="contact-card-header">
          <div class="contact-icon-wrap">
            <span class="material-symbols-outlined">person</span>
          </div>
          <span class="contact-card-title">联系人信息</span>
          <span class="required-badge">必填</span>
        </div>
        <div class="contact-form">
          <div class="form-row">
            <label class="form-label">
              <span class="material-symbols-outlined label-icon">badge</span>
              姓名
            </label>
            <input
              v-model="contactName"
              class="form-input"
              placeholder="请输入您的姓名"
              maxlength="20"
            />
          </div>
          <div class="form-row">
            <label class="form-label">
              <span class="material-symbols-outlined label-icon">call</span>
              电话
            </label>
            <input
              v-model="contactPhone"
              class="form-input"
              placeholder="请输入手机号码"
              type="tel"
              maxlength="11"
            />
          </div>
        </div>
        <div class="contact-tip">
          <span class="material-symbols-outlined tip-icon">info</span>
          <span>到店提货时请出示手机号进行核验</span>
        </div>
      </section>

      <!-- 预计提货日期选择 -->
      <section class="bento-card pickup-date-card">
        <div class="date-card-inner">
          <div class="date-icon-wrap">
            <span class="material-symbols-outlined date-icon">calendar_month</span>
          </div>
          <div class="date-content">
            <div class="date-label">
              <span>预计提货日期</span>
              <span class="required-mark">*</span>
            </div>
            <label class="date-input-wrap">
              <input
                type="date"
                v-model="pickupDate"
                :min="minDate"
                :max="maxDate"
                class="date-input"
              />
              <div class="date-display">
                <span v-if="pickupDate" class="date-value">{{ formatDisplayDate(pickupDate) }}</span>
                <span v-else class="date-placeholder">请选择提货日期</span>
                <span class="material-symbols-outlined date-arrow">chevron_right</span>
              </div>
            </label>
          </div>
        </div>
        <p class="date-hint">请选择您计划到店提货的日期，方便我们提前备货</p>
      </section>

      <!-- 费用明细 -->
      <section class="fee-section bento-card">
        <h3 class="fee-title">费用明细</h3>
        <div class="fee-list">
          <div class="fee-row">
            <span class="fee-label">套餐价格</span>
            <span class="fee-value">¥{{ formatPrice(displayPrice) }}</span>
          </div>
          <div class="fee-row" v-if="pkg.savedAmount && pkg.savedAmount > 0">
            <span class="fee-label">套餐优惠</span>
            <span class="fee-value discount">-¥{{ formatPrice(pkg.savedAmount) }}</span>
          </div>
          <div class="fee-divider"></div>
          <div class="fee-row fee-total">
            <span class="fee-label">到店应付</span>
            <span class="fee-value total-price">¥{{ formatPrice(displayPrice) }}</span>
          </div>
          <p class="fee-note">* 线上预约免费，到店付款提货</p>
        </div>
      </section>

      <!-- 备注 -->
      <section class="remark-section bento-card">
        <div class="remark-header">
          <span class="material-symbols-outlined remark-icon">edit_note</span>
          <span class="remark-title">备注（选填）</span>
        </div>
        <textarea
          v-model="remark"
          class="remark-input"
          placeholder="如有特殊要求请在此说明"
          maxlength="200"
          rows="2"
        ></textarea>
      </section>
    </main>

    <!-- 底部操作栏 -->
    <footer class="bottom-bar" v-if="!loading && pkg">
      <div class="bar-left">
        <span class="pay-label">到店应付</span>
        <div class="pay-amount">
          <span class="pay-symbol">¥</span>
          <span class="pay-price">{{ formatPrice(displayPrice) }}</span>
        </div>
      </div>
      <button
        class="submit-btn"
        :class="{ loading: submitting }"
        :disabled="submitting"
        @click="submitReservation"
      >
        <span v-if="!submitting">立即预约</span>
        <span v-else>提交中...</span>
        <span class="material-symbols-outlined btn-arrow" v-if="!submitting">arrow_forward</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400&display=swap');

.checkout-page {
  min-height: 100vh;
  background: #fafaf9;
  font-family: 'Manrope', 'Noto Sans SC', sans-serif;
  -webkit-tap-highlight-color: transparent;
}

/* 顶部导航 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(250, 250, 249, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-back,
.nav-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.nav-back:hover {
  background: rgba(0, 0, 0, 0.05);
}

.nav-back .material-symbols-outlined {
  font-size: 24px;
  color: #181111;
}

.nav-title {
  font-size: 18px;
  font-weight: 700;
  color: #181111;
  letter-spacing: -0.015em;
}

/* 加载状态 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

/* 页面内容 */
.page-content {
  padding: 16px;
  padding-bottom: 140px;
}

/* 通用卡片样式 */
.bento-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
}

/* 预约流程说明 */
.booking-flow-section {
  margin-bottom: 16px;
}

.flow-title {
  font-size: 14px;
  font-weight: 700;
  color: #181111;
  margin-bottom: 12px;
  text-align: center;
}

.flow-steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
  background: white;
  border-radius: 12px;
  padding: 16px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #EF062D 0%, #FF4D6D 100%);
  color: white;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-content {
  text-align: center;
}

.step-title {
  font-size: 13px;
  font-weight: 600;
  color: #181111;
  margin-bottom: 2px;
}

.step-desc {
  font-size: 11px;
  color: #52c41a;
}

.flow-arrow {
  font-size: 16px;
  color: #d9d9d9;
  padding-top: 6px;
}

/* 套餐信息卡片 */
.package-card {
  padding: 16px;
}

.package-header {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.package-img-wrap {
  width: 100px;
  height: 100px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f3f4f6;
}

.package-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.package-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.package-name {
  font-size: 16px;
  font-weight: 700;
  color: #181111;
  line-height: 1.4;
  margin-bottom: 8px;
}

.package-price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.package-price {
  font-size: 22px;
  font-weight: 800;
  color: #EF062D;
}

.package-original {
  font-size: 13px;
  color: #9ca3af;
  text-decoration: line-through;
}

.package-saved {
  font-size: 12px;
  color: #ff6b00;
  font-weight: 500;
}

/* 套餐商品列表 */
.package-items {
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
  padding-top: 14px;
}

.items-title {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 10px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.item-name {
  color: #333;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 12px;
}

.item-qty {
  color: #9ca3af;
  flex-shrink: 0;
}

/* 联系人信息卡片 */
.contact-card {
  padding: 16px;
}

.contact-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.contact-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(233, 12, 31, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.contact-icon-wrap .material-symbols-outlined {
  font-size: 18px;
  color: #EF062D;
}

.contact-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #181111;
  flex: 1;
}

.required-badge {
  font-size: 10px;
  font-weight: 700;
  color: #EF062D;
  background: rgba(233, 12, 31, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  width: 70px;
  flex-shrink: 0;
}

.label-icon {
  font-size: 18px;
  color: #9ca3af;
}

.form-input {
  flex: 1;
  height: 44px;
  padding: 0 14px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background: #fafaf9;
  font-size: 15px;
  font-weight: 500;
  color: #181111;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: #EF062D;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(233, 12, 31, 0.1);
}

.form-input::placeholder {
  color: #bbb;
  font-weight: 400;
}

.contact-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding: 10px 12px;
  background: rgba(233, 12, 31, 0.05);
  border-radius: 8px;
  font-size: 12px;
  color: #8a6064;
}

.tip-icon {
  font-size: 16px;
  color: #EF062D;
}

/* 提货日期卡片 */
.pickup-date-card {
  padding: 16px;
}

.date-card-inner {
  display: flex;
  align-items: center;
  gap: 16px;
}

.date-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(233, 12, 31, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.date-icon {
  font-size: 24px;
  color: #EF062D;
}

.date-content {
  flex: 1;
}

.date-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #181111;
  margin-bottom: 8px;
}

.required-mark {
  color: #EF062D;
  font-weight: 700;
}

.date-input-wrap {
  display: block;
  position: relative;
  cursor: pointer;
}

.date-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 1;
  cursor: pointer;
  z-index: 10;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  background: transparent;
  color: transparent;
  caret-color: transparent;
}

.date-input::-webkit-calendar-picker-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: auto;
  height: auto;
  color: transparent;
  background: transparent;
  cursor: pointer;
}

.date-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fafaf9;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  pointer-events: none;
}

.date-value {
  font-size: 16px;
  font-weight: 700;
  color: #EF062D;
}

.date-placeholder {
  font-size: 14px;
  color: #9ca3af;
}

.date-arrow {
  font-size: 20px;
  color: #9ca3af;
}

.date-hint {
  margin-top: 12px;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
}

/* 费用明细 */
.fee-section {
  padding: 20px;
}

.fee-title {
  font-size: 12px;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 16px;
}

.fee-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fee-label {
  font-size: 14px;
  color: #6b7280;
}

.fee-value {
  font-size: 14px;
  font-weight: 500;
  color: #181111;
}

.fee-value.discount {
  color: #ff6b00;
}

.fee-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.05);
  margin: 4px 0;
}

.fee-total .fee-label {
  font-size: 16px;
  font-weight: 700;
  color: #181111;
}

.total-price {
  font-size: 22px;
  font-weight: 800;
  color: #EF062D;
}

.fee-note {
  font-size: 12px;
  color: #4caf50;
  margin-top: 8px;
}

/* 备注 */
.remark-section {
  padding: 16px;
}

.remark-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.remark-icon {
  font-size: 20px;
  color: #9ca3af;
}

.remark-title {
  font-size: 14px;
  font-weight: 600;
  color: #181111;
}

.remark-input {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  background: #fafaf9;
  font-size: 14px;
  color: #181111;
  resize: none;
  outline: none;
}

.remark-input:focus {
  border-color: #EF062D;
}

.remark-input::placeholder {
  color: #9ca3af;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding: 16px 24px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 8px));
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bar-left {
  display: flex;
  flex-direction: column;
}

.pay-label {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

.pay-amount {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.pay-symbol {
  font-size: 14px;
  font-weight: 700;
  color: #EF062D;
}

.pay-price {
  font-size: 24px;
  font-weight: 800;
  color: #EF062D;
  letter-spacing: -0.02em;
}

/* 提交按钮 */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 36px;
  background: linear-gradient(135deg, #EF062D 0%, #FF4D6D 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(233, 12, 31, 0.3);
  transition: all 0.2s;
}

.submit-btn:active {
  transform: scale(0.98);
}

.submit-btn.loading {
  opacity: 0.7;
  pointer-events: none;
}

.submit-btn:disabled {
  background: #ccc;
  box-shadow: none;
}

.btn-arrow {
  font-size: 18px;
}
</style>
