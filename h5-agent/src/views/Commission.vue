<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import { get, post } from '../api'

const router = useRouter()

// 【2026-01-17 预约模式适配】更新接口类型
interface CommissionSummary {
  withdrawableAmount: number
  totalIncome: number
  monthlyIncome: number
  settlingAmount: number
}

interface CommissionRecord {
  id: number
  type: string
  amount: number
  status: string
  createdAt: string
  reservationNo: string
  customerName: string
  totalAmount: number
  remark: string
}

const summary = ref<CommissionSummary | null>(null)
const records = ref<CommissionRecord[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const finished = ref(false)
const page = ref(1)
const pageSize = 20

// 【2026-01-17 预约模式适配】利润类型映射
const typeMap: Record<string, string> = {
  PROFIT: '销售利润',
  REWARD: '奖励收益',
  WITHDRAW: '提现'
}

// 状态映射
const statusMap: Record<string, { text: string; color: string }> = {
  settled: { text: '已结算', color: '#52c41a' },
  pending: { text: '待结算', color: '#faad14' }
}

// 加载汇总数据
const loadSummary = async () => {
  try {
    const res = await get<CommissionSummary>('/commission/center')
    summary.value = res.data
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
  }
}

// 加载分润记录
const loadRecords = async (refresh = false) => {
  if (refresh) {
    page.value = 1
    finished.value = false
  }

  if (page.value === 1) {
    loading.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const res = await get<{ list: CommissionRecord[]; total: number }>('/commission/records', {
      page: page.value,
      pageSize
    })
    const list = res.data.list || []

    if (refresh) {
      records.value = list
    } else {
      records.value.push(...list)
    }

    if (list.length < pageSize) {
      finished.value = true
    }
  } catch {
    Toast({ message: '加载记录失败', theme: 'error' })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 加载更多
const loadMore = () => {
  if (loadingMore.value || finished.value) return
  page.value++
  loadRecords()
}

// 【2026-01-29】提现按钮点击处理（支持禁用状态提示）
const handleWithdrawClick = () => {
  if (!summary.value || summary.value.withdrawableAmount < 100) {
    Toast({ message: '最低提现金额100元，当前余额不足', theme: 'warning' })
    return
  }
  applyWithdraw()
}

// 申请提现【2026-01-17 预约模式适配】
const applyWithdraw = () => {
  if (!summary.value || summary.value.withdrawableAmount < 100) {
    Toast({ message: '可提现金额不足100元', theme: 'warning' })
    return
  }

  Dialog.confirm({
    title: '申请提现',
    content: `当前可提现金额: ¥${(summary.value?.withdrawableAmount || 0).toFixed(2)}，确定申请提现吗？`,
    confirmBtn: '确定',
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        await post('/commission/withdraw', { amount: Number(summary.value!.withdrawableAmount) })
        Toast({ message: '提现申请已提交，请等待审核', theme: 'success' })
        loadSummary()
      } catch (err: any) {
        Toast({ message: err.message || '提现申请失败', theme: 'error' })
      }
    }
  })
}

// 格式化时间
const formatTime = (timeStr: string) => {
  const date = new Date(timeStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 返回
const goBack = () => {
  router.back()
}

// 【2026-01-29】跳转分润详情
const goToDetail = (recordId: number) => {
  router.push(`/commission/${recordId}`)
}

onMounted(() => {
  loadSummary()
  loadRecords()
})
</script>

<template>
  <div class="commission-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">分润中心</div>
      <div class="nav-placeholder"></div>
    </div>

    <!-- 汇总卡片 -->
    <div class="summary-card">
      <div class="summary-loading" v-if="!summary">
        <t-loading theme="circular" size="32px" />
      </div>
      <template v-else>
        <div class="summary-main">
          <div class="main-label">可提现金额(元)</div>
          <div class="main-value">{{ (summary?.withdrawableAmount || 0).toFixed(2) }}</div>
          <t-button
            theme="primary"
            size="small"
            shape="round"
            :class="{ 'btn-disabled': summary.withdrawableAmount < 100 }"
            @click="handleWithdrawClick"
          >
            申请提现
          </t-button>
        </div>

        <div class="summary-stats">
          <div class="stat-item">
            <div class="stat-value">{{ (summary?.totalIncome || 0).toFixed(2) }}</div>
            <div class="stat-label">累计收益</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ (summary?.monthlyIncome || 0).toFixed(2) }}</div>
            <div class="stat-label">本月收益</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ (summary?.settlingAmount || 0).toFixed(2) }}</div>
            <div class="stat-label">待结算</div>
          </div>
        </div>
      </template>
    </div>

    <!-- 提现说明 -->
    <div class="notice-card">
      <t-icon name="info-circle" size="16px" />
      <span>预约核销即时结算，满100元可申请提现</span>
    </div>

    <!-- 分润记录 -->
    <div class="records-section">
      <div class="section-title">分润记录</div>

      <!-- 加载中 -->
      <div class="loading-wrap" v-if="loading">
        <t-loading theme="circular" size="32px" />
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else-if="records.length === 0">
        <t-icon name="file" size="48px" class="empty-icon" />
        <p>暂无分润记录</p>
      </div>

      <!-- 记录列表【2026-01-17 预约模式适配】【2026-01-29 增加点击跳转详情】 -->
      <div class="records-list" v-else>
        <div class="record-item" v-for="record in records" :key="record.id" @click="goToDetail(record.id)">
          <div class="record-left">
            <div class="record-type">
              {{ typeMap[record.type] || record.type }}
            </div>
            <div class="record-info">
              <span>预约号 {{ record.reservationNo }}</span>
              <span v-if="record.customerName !== '-'">客户 {{ record.customerName }}</span>
            </div>
            <div class="record-time">{{ formatTime(record.createdAt) }}</div>
          </div>
          <div class="record-right">
            <div class="record-amount">+{{ (record.amount || 0).toFixed(2) }}</div>
            <div
              class="record-status"
              :style="{ color: statusMap[record.status]?.color }"
            >
              {{ statusMap[record.status]?.text || record.status }}
            </div>
            <t-icon name="chevron-right" size="16px" class="record-arrow" />
          </div>
        </div>

        <!-- 加载更多 -->
        <div class="load-more">
          <t-loading v-if="loadingMore" theme="circular" size="24px" />
          <span v-else-if="!finished" @click="loadMore">加载更多</span>
          <span v-else>没有更多了</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.commission-page {
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
  background: linear-gradient(135deg, #E53935 0%, #ff6f61 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  z-index: 100;
  color: #fff;
}

.nav-back, .nav-placeholder {
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

.summary-card {
  background: linear-gradient(135deg, #E53935 0%, #ff6f61 100%);
  margin: 0;
  padding: 60px 20px 24px;
  color: #fff;
}

.summary-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
}

.summary-main {
  text-align: center;
  margin-bottom: 24px;
}

.main-label {
  font-size: 13px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.main-value {
  font-size: 36px;
  font-weight: 600;
  margin-bottom: 16px;
}

/* 【2026-01-29】禁用按钮样式（保持可点击但显示提示） */
.btn-disabled {
  opacity: 0.6 !important;
}

.summary-stats {
  display: flex;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 16px;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-item .stat-value {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.stat-item .stat-label {
  font-size: 12px;
  opacity: 0.8;
}

.notice-card {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px;
  padding: 12px 16px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  font-size: 13px;
  color: #8c6d00;
}

.records-section {
  margin: 12px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.section-title {
  padding: 16px;
  font-size: 15px;
  font-weight: 500;
  color: #333;
  border-bottom: 1px solid #f5f5f5;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #999;
}

.empty-icon {
  color: #ccc;
  margin-bottom: 12px;
}

.records-list {
  padding: 0 16px;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background-color 0.2s;
}

.record-item:active {
  background-color: #f9f9f9;
}

.record-item:last-child {
  border-bottom: none;
}

.record-type {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  margin-bottom: 6px;
}

.record-info {
  font-size: 12px;
  color: #999;
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
}

.record-time {
  font-size: 12px;
  color: #ccc;
}

.record-right {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.record-arrow {
  color: #ccc;
  margin-top: 4px;
}

.record-amount {
  font-size: 16px;
  color: #E53935;
  font-weight: 600;
  margin-bottom: 4px;
}

.record-status {
  font-size: 12px;
}

.load-more {
  text-align: center;
  padding: 16px;
  color: #999;
  font-size: 13px;
}
</style>
