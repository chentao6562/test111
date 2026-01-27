<script setup lang="ts">
/**
 * 团队返券页面
 * 【2026-01-21】
 * 一级推销员给二级推销员发放代金券
 */
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import { get, post } from '../api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

// 下级列表
interface Level2Item {
  id: number
  name: string
  phone: string
  couponCount: number
  couponAmount: number
}

const level2List = ref<Level2Item[]>([])
const loading = ref(true)

// 发券对话框
const grantDialogVisible = ref(false)
const grantLoading = ref(false)
const selectedLevel2 = ref<Level2Item | null>(null)
const grantForm = ref({
  amount: 10,
  remark: ''
})

// 用户余额
const balance = computed(() => Number(userStore.userInfo?.balance || 0))

// 是否是一级推销员
const isLevel1 = computed(() => userStore.userInfo?.type === 'LEVEL1')

// 加载下级列表
const loadLevel2List = async () => {
  loading.value = true
  try {
    const res = await get<Level2Item[]>('/promotion/coupon/level2-list')
    if (res.data) {
      level2List.value = res.data
    }
  } catch (error: any) {
    Toast({ message: error.message || '加载失败', theme: 'error' })
  } finally {
    loading.value = false
  }
}

// 打开发券对话框
const openGrantDialog = (item: Level2Item) => {
  selectedLevel2.value = item
  grantForm.value = { amount: 10, remark: '' }
  grantDialogVisible.value = true
}

// 提交发券
const submitGrant = async () => {
  if (!selectedLevel2.value) return

  if (!grantForm.value.amount || grantForm.value.amount <= 0) {
    Toast({ message: '请输入正确的金额', theme: 'warning' })
    return
  }

  if (grantForm.value.amount > balance.value) {
    Toast({ message: '余额不足', theme: 'warning' })
    return
  }

  grantLoading.value = true
  try {
    const res = await post<{ code: string }>('/promotion/coupon/grant', {
      level2Id: selectedLevel2.value.id,
      amount: grantForm.value.amount,
      remark: grantForm.value.remark
    })

    if (res.data) {
      const grantedName = selectedLevel2.value.name
      const grantedAmount = grantForm.value.amount
      const couponCode = res.data.code

      grantDialogVisible.value = false
      // 【2026-01-28修复】使用Promise.all等待刷新完成，避免竞态条件
      await Promise.all([loadLevel2List(), userStore.refreshUserInfo()])

      // 【2026-01-28修复】添加Dialog回调处理
      Dialog.confirm({
        title: '发放成功',
        content: `已向 ${grantedName} 发放 ¥${grantedAmount} 代金券\n券码: ${couponCode}`,
        confirmBtn: '继续发放',
        cancelBtn: '返回',
        onConfirm: () => {
          // 点击"继续发放" - 重新打开发券弹窗
          grantForm.value = { amount: 10, remark: '' }
          grantDialogVisible.value = true
        },
        onCancel: () => {
          // 点击"返回" - 保持在当前页面，不需要额外操作
        }
      })
    }
  } catch (error: any) {
    Toast({ message: error.message || '发放失败', theme: 'error' })
  } finally {
    grantLoading.value = false
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 格式化金额
const formatAmount = (val: number) => `¥${Number(val).toFixed(2)}`

onMounted(() => {
  if (!userStore.isLoggedIn) {
    Toast({ message: '请先登录', theme: 'warning' })
    router.replace('/login?redirect=/team-grant')
    return
  }

  if (!isLevel1.value) {
    Toast({ message: '仅一级推销员可使用此功能', theme: 'warning' })
    router.back()
    return
  }

  loadLevel2List()
})
</script>

<template>
  <div class="team-grant">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">团队返券</div>
      <div class="nav-right"></div>
    </div>

    <!-- 余额卡片 -->
    <div class="balance-card">
      <div class="balance-info">
        <div class="balance-label">当前余额</div>
        <div class="balance-value">{{ formatAmount(balance) }}</div>
      </div>
      <div class="balance-tip">
        <t-icon name="info-circle" size="14px" />
        <span>发放代金券将从您的余额中扣除</span>
      </div>
    </div>

    <!-- 下级列表 -->
    <div class="list-section">
      <div class="section-header">
        <span class="section-title">我的下级</span>
        <span class="section-count">共 {{ level2List.length }} 人</span>
      </div>

      <!-- 加载中 -->
      <div class="loading-wrap" v-if="loading">
        <t-loading theme="circular" size="32px" />
        <p>加载中...</p>
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else-if="level2List.length === 0">
        <t-icon name="user-circle" size="64px" class="empty-icon" />
        <p class="empty-title">暂无下级推销员</p>
        <p class="empty-desc">邀请好友加入，成为您的下级</p>
        <t-button theme="primary" size="small" @click="router.push('/promotion')">
          去邀请
        </t-button>
      </div>

      <!-- 列表 -->
      <div class="level2-list" v-else>
        <div
          v-for="item in level2List"
          :key="item.id"
          class="level2-item"
        >
          <div class="item-avatar">
            <t-icon name="user" size="24px" />
          </div>
          <div class="item-info">
            <div class="item-name">{{ item.name }}</div>
            <div class="item-phone">{{ item.phone }}</div>
            <div class="item-coupon" v-if="item.couponCount > 0">
              持有 {{ item.couponCount }} 张券，共 {{ formatAmount(item.couponAmount) }}
            </div>
          </div>
          <div class="item-action">
            <t-button theme="primary" size="small" @click="openGrantDialog(item)">
              发券
            </t-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 说明 -->
    <div class="rules-section">
      <div class="section-title">
        <t-icon name="info-circle" size="16px" />
        <span>使用说明</span>
      </div>
      <div class="rules-list">
        <div class="rule-item">1. 发放代金券将从您的账户余额中扣除</div>
        <div class="rule-item">2. 下级使用代金券核销时，从下级余额扣除</div>
        <div class="rule-item">3. 代金券有效期至2026年2月14日</div>
        <div class="rule-item">4. 每次发放金额不超过500元</div>
      </div>
    </div>

    <!-- 发券对话框 -->
    <t-popup v-model="grantDialogVisible" placement="bottom">
      <div class="grant-popup">
        <div class="popup-header">
          <span class="popup-title">发放代金券</span>
          <t-icon name="close" size="20px" @click="grantDialogVisible = false" />
        </div>

        <div class="popup-content" v-if="selectedLevel2">
          <div class="target-info">
            <div class="target-label">发放给</div>
            <div class="target-value">{{ selectedLevel2.name }} ({{ selectedLevel2.phone }})</div>
          </div>

          <div class="form-item">
            <label class="form-label">金额</label>
            <div class="amount-input">
              <span class="amount-prefix">¥</span>
              <input
                v-model.number="grantForm.amount"
                type="number"
                placeholder="请输入金额"
                :max="Math.min(500, balance)"
              />
            </div>
            <div class="form-tip">最多可发放 {{ formatAmount(Math.min(500, balance)) }}</div>
          </div>

          <div class="form-item">
            <label class="form-label">备注（选填）</label>
            <input
              v-model="grantForm.remark"
              type="text"
              placeholder="发放原因"
              maxlength="50"
              class="remark-input"
            />
          </div>
        </div>

        <div class="popup-footer">
          <t-button
            theme="primary"
            block
            :loading="grantLoading"
            :disabled="!grantForm.amount || grantForm.amount <= 0 || grantForm.amount > balance"
            @click="submitGrant"
          >
            确认发放 {{ grantForm.amount > 0 ? formatAmount(grantForm.amount) : '' }}
          </t-button>
        </div>
      </div>
    </t-popup>
  </div>
</template>

<style scoped>
.team-grant {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 20px;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  background: linear-gradient(135deg, #0052d9 0%, #4080ff 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  z-index: 100;
  color: #fff;
}

.nav-back {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  font-size: 16px;
  font-weight: 500;
}

.nav-right {
  width: 40px;
}

.balance-card {
  margin: 60px 12px 16px;
  padding: 20px;
  background: linear-gradient(135deg, #0052d9 0%, #4080ff 100%);
  border-radius: 12px;
  color: #fff;
}

.balance-info {
  margin-bottom: 12px;
}

.balance-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.balance-value {
  font-size: 32px;
  font-weight: 700;
}

.balance-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  opacity: 0.8;
}

.list-section {
  margin: 0 12px 16px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.section-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.section-count {
  font-size: 13px;
  color: #999;
}

.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #999;
}

.loading-wrap p {
  margin-top: 12px;
  font-size: 14px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  color: #ddd;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 13px;
  color: #999;
  margin-bottom: 16px;
}

.level2-list {
  padding: 0 16px;
}

.level2-item {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.level2-item:last-child {
  border-bottom: none;
}

.item-avatar {
  width: 48px;
  height: 48px;
  background: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  margin-right: 12px;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.item-phone {
  font-size: 13px;
  color: #999;
  margin-bottom: 4px;
}

.item-coupon {
  font-size: 12px;
  color: #0052d9;
}

.item-action {
  flex-shrink: 0;
  margin-left: 12px;
}

.rules-section {
  margin: 16px 12px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}

.rules-section .section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-item {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}

/* 发券弹窗 */
.grant-popup {
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.popup-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.target-info {
  background: #f5f5f5;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.target-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.target-value {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.form-item {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
}

.amount-input {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 0 16px;
}

.amount-prefix {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-right: 8px;
}

.amount-input input {
  flex: 1;
  border: none;
  background: none;
  font-size: 24px;
  font-weight: 600;
  color: #333;
  padding: 12px 0;
  outline: none;
}

.amount-input input::placeholder {
  color: #ccc;
  font-weight: normal;
}

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.remark-input {
  width: 100%;
  border: none;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 14px;
  outline: none;
}

.remark-input::placeholder {
  color: #ccc;
}

.popup-footer {
  margin-top: 20px;
}
</style>
