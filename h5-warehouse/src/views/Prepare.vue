<template>
  <div class="prepare-list-page">
    <!-- 【2026-01-20】顶部导航栏，支持返回主页 -->
    <div class="nav-bar">
      <div class="nav-left" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">备货管理</div>
      <div class="nav-right"></div>
    </div>

    <!-- 顶部Tab【2026-01-19】待备货改为显示已确认+待备货+备货中，支持提前备货 -->
    <div class="tabs-container">
      <t-tabs v-model="activeTab" @change="onTabChange">
        <t-tab-panel :value="'prepare'" label="待备货" />
        <t-tab-panel :value="9" label="待提货" />
      </t-tabs>
    </div>

    <!-- 列表内容 -->
    <div class="list-container">
      <t-pull-down-refresh v-model="refreshing" @refresh="onRefresh">
        <div v-if="loading && !refreshing" class="loading-container">
          <t-loading size="40px" />
          <span>加载中...</span>
        </div>

        <template v-else-if="list.length > 0">
          <div
            v-for="item in list"
            :key="item.id"
            class="reservation-card"
            @click="goToDetail(item)"
          >
            <div class="card-header">
              <span class="reservation-no">{{ item.reservationNo }}</span>
              <t-tag
                :theme="getTagTheme(item.status)"
                size="small"
              >
                {{ getStatusLabel(item.status) }}
              </t-tag>
            </div>
            <!-- 【2026-01-19】提货日期提示：明天提货的高亮提示 -->
            <div v-if="isPickupTomorrow(item.pickupDate)" class="urgent-tip">
              ⚠️ 明天提货，请尽快完成备货！
            </div>

            <div class="card-body">
              <div class="info-row">
                <t-icon name="user" size="16px" />
                <span>{{ item.customerName }}</span>
                <span class="phone" @click.stop="callCustomer(item.customerPhone)">
                  {{ item.customerPhone }}
                  <t-icon name="call" size="14px" />
                </span>
              </div>
              <div class="info-row">
                <t-icon name="calendar" size="16px" />
                <span>提货日期：{{ formatDate(item.pickupDate) }}</span>
              </div>
              <div class="info-row">
                <t-icon name="shop" size="16px" />
                <span>商品数量：{{ getItemCount(item) }}件</span>
                <span class="amount">{{ formatPrice(item.totalAmount) }}</span>
              </div>

              <!-- 备货中显示进度 -->
              <div v-if="item.status === 8" class="progress-row">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: getProgress(item) + '%' }"></div>
                </div>
                <span class="progress-text">{{ getProgress(item) }}%</span>
              </div>

              <!-- 待提货显示提货码 -->
              <div v-if="item.status === 9 && item.pickupCode" class="pickup-code-row">
                <span class="code-label">提货码：</span>
                <span class="code-value">{{ item.pickupCode }}</span>
                <t-button size="small" variant="text" @click.stop="copyCode(item.pickupCode)">
                  复制
                </t-button>
              </div>
            </div>

            <div class="card-footer">
              <!-- 【2026-01-19】已确认(2)和待备货(7)都可以开始备货 -->
              <t-button
                v-if="item.status === 2 || item.status === 7"
                theme="primary"
                size="small"
                @click.stop="goToDetail(item)"
              >
                {{ isPickupTomorrow(item.pickupDate) ? '立即备货' : '开始备货' }}
              </t-button>
              <t-button
                v-else-if="item.status === 8"
                theme="primary"
                size="small"
                @click.stop="goToDetail(item)"
              >
                继续备货
              </t-button>
              <t-button
                v-else-if="item.status === 9"
                theme="primary"
                size="small"
                @click.stop="goToPickup(item)"
              >
                去核销
              </t-button>
            </div>
          </div>
        </template>

        <t-empty v-else description="暂无数据" />
      </t-pull-down-refresh>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import {
  getPendingPrepareList,
  getPreparingList,
  getReservationList,
  ReservationStatus,
  type Reservation
} from '@/api/reservation'
import { formatPrice, formatDate } from '@/utils/format'
import { vibrate } from '@/utils/bridge'

const router = useRouter()
const route = useRoute()

// 【2026-01-19】简化Tab：待备货(包含2,7,8) 和 待提货(9)
const activeTab = ref<'prepare' | 9>('prepare')
const loading = ref(true)
const refreshing = ref(false)
const list = ref<Reservation[]>([])

onMounted(() => {
  // 从URL参数获取初始Tab
  const tab = route.query.tab
  if (tab === '9') {
    activeTab.value = 9
  }
  loadList()
})

watch(activeTab, () => {
  loadList()
})

async function loadList() {
  try {
    loading.value = true
    if (activeTab.value === 'prepare') {
      // 【2026-01-19】待备货Tab：查询已确认(2) + 待备货(7) + 备货中(8)
      const result = await getReservationList({ statuses: '2,7,8' })
      list.value = result.list
    } else {
      // 待提货状态
      const result = await getReservationList({ status: 9 })
      list.value = result.list
    }
  } catch (error: any) {
    console.error('加载列表失败:', error)
    Toast.error(error.message || '加载失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function onTabChange() {
  loadList()
}

function onRefresh() {
  loadList()
}

function getStatusLabel(status: number): string {
  const labels: Record<number, string> = {
    2: '已确认',
    [ReservationStatus.PENDING_PREPARE]: '待备货',
    [ReservationStatus.PREPARING]: '备货中',
    [ReservationStatus.PENDING_PICKUP]: '待提货'
  }
  return labels[status] || '未知'
}

// 【2026-01-19】获取状态标签主题
function getTagTheme(status: number): 'warning' | 'primary' | 'success' | 'default' {
  const themes: Record<number, 'warning' | 'primary' | 'success' | 'default'> = {
    2: 'success',    // 已确认
    7: 'warning',    // 待备货
    8: 'primary',    // 备货中
    9: 'success',    // 待提货
  }
  return themes[status] || 'default'
}

// 【2026-01-19】判断是否明天提货
function isPickupTomorrow(pickupDate: string): boolean {
  if (!pickupDate) return false
  const pickup = new Date(pickupDate)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  // 比较年月日
  return pickup.getFullYear() === tomorrow.getFullYear() &&
    pickup.getMonth() === tomorrow.getMonth() &&
    pickup.getDate() === tomorrow.getDate()
}

function getItemCount(item: Reservation): number {
  return item.items?.reduce((sum, i) => sum + i.quantity, 0) || 0
}

function getProgress(item: Reservation): number {
  if (!item.items || item.items.length === 0) return 0
  const total = item.items.reduce((sum, i) => sum + i.quantity, 0)
  const prepared = item.items.filter(i => i.prepared).reduce((sum, i) => sum + i.quantity, 0)
  return total > 0 ? Math.round((prepared / total) * 100) : 0
}

function callCustomer(phone: string) {
  vibrate(150)
  window.location.href = `tel:${phone}`
}

function goToDetail(item: Reservation) {
  router.push(`/prepare/${item.id}`)
}

function goToPickup(item: Reservation) {
  if (item.pickupCode) {
    router.push(`/pickup-reservation?code=${item.pickupCode}`)
  } else {
    router.push(`/pickup-reservation?phone=${item.customerPhone}`)
  }
}

function copyCode(code: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code)
    Toast.success('提货码已复制')
  } else {
    const input = document.createElement('input')
    input.value = code
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    Toast.success('提货码已复制')
  }
}

// 【2026-01-20】返回主页
function goBack() {
  router.push('/workbench')
}
</script>

<style scoped>
.prepare-list-page {
  min-height: 100vh;
  background-color: var(--bg-page);
  display: flex;
  flex-direction: column;
}

/* 【2026-01-20】导航栏样式 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  background-color: var(--bg-white);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-left,
.nav-right {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.nav-left:active {
  opacity: 0.7;
}

.nav-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.tabs-container {
  background-color: var(--bg-white);
  position: sticky;
  top: 44px;  /* 【2026-01-20】导航栏高度 */
  z-index: 10;
}

.list-container {
  flex: 1;
  padding: 12px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
  color: var(--text-tertiary);
}

.reservation-card {
  background-color: var(--bg-white);
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.reservation-no {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.card-body {
  padding: 12px 16px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .phone {
  margin-left: auto;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-row .amount {
  margin-left: auto;
  color: var(--primary);
  font-weight: 500;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);
}

.progress-bar {
  flex: 1;
  height: 8px;
  background-color: var(--bg-page);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196F3, #4CAF50);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: var(--primary);
  font-weight: 500;
  min-width: 36px;
}

.pickup-code-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  background-color: #e8f5e9;
  border-radius: 6px;
}

.code-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.code-value {
  font-size: 16px;
  font-weight: bold;
  color: #4CAF50;
  letter-spacing: 2px;
  flex: 1;
}

.card-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
}

/* 【2026-01-19】紧急提示样式 */
.urgent-tip {
  padding: 8px 16px;
  background-color: #fff3e0;
  color: #e65100;
  font-size: 13px;
  font-weight: 500;
  border-bottom: 1px solid var(--border-color);
}
</style>
