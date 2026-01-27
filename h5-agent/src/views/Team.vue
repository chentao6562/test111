<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { get } from '../api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

// 是否是一级推销员（可以给下级发券）
const isLevel1 = computed(() => userStore.userInfo?.type === 'LEVEL1')

interface TeamMember {
  id: number
  name: string
  phone: string
  level: string // 后端返回的是level (LV.1, LV.2等)
  levelType: string // 后端返回的是levelType (LEVEL1, LEVEL2等)
  status: string
  joinDate: string // 后端返回的是joinDate
  monthlyPerformance: number // 后端返回的是monthlyPerformance
  type?: string // 兼容字段
  createdAt?: string // 兼容字段
  orderCount?: number // 兼容字段
  totalAmount?: number // 兼容字段
}

interface TeamSummary {
  directCount: number
  indirectCount: number
  totalCount: number
  monthlyNewCount: number
}

const summary = ref<TeamSummary | null>(null)
const members = ref<TeamMember[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const finished = ref(false)
const page = ref(1)
const pageSize = 20

// 筛选类型
const filterType = ref<'all' | 'direct' | 'indirect'>('all')
const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '直属', value: 'direct' },
  { label: '间接', value: 'indirect' }
]

// 用户类型映射
const typeMap: Record<string, string> = {
  LEVEL1: '一级推销员',
  LEVEL2: '二级推销员',
  LEVEL3: '三级推销员',
  WHOLESALE: '普通用户'
}

// 加载汇总数据
// 【2026-01-19修复】后端已返回完整字段
const loadSummary = async () => {
  try {
    const res = await get<any>('/commission/team-stats')
    // 后端返回: { directCount, indirectCount, monthlyNewCount, teamMemberCount, ... }
    summary.value = {
      directCount: res.data?.directCount || res.data?.teamMemberCount || 0,
      indirectCount: res.data?.indirectCount || 0,
      totalCount: (res.data?.directCount || 0) + (res.data?.indirectCount || 0),
      monthlyNewCount: res.data?.monthlyNewCount || 0
    }
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
  }
}

// 加载团队成员
const loadMembers = async (refresh = false) => {
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
    const params: any = {
      page: page.value,
      pageSize
    }
    // 【2026-01-19修复】使用relation参数筛选
    if (filterType.value !== 'all') {
      params.relation = filterType.value // direct 或 indirect
    }

    const res = await get<{ list: TeamMember[]; total: number }>('/commission/team-members', params)
    const list = res.data.list || []

    if (refresh) {
      members.value = list
    } else {
      members.value.push(...list)
    }

    if (list.length < pageSize) {
      finished.value = true
    }
  } catch {
    Toast({ message: '加载成员失败', theme: 'error' })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 加载更多
const loadMore = () => {
  if (loadingMore.value || finished.value) return
  page.value++
  loadMembers()
}

// 切换筛选
const onFilterChange = (value: 'all' | 'direct' | 'indirect') => {
  filterType.value = value
  loadMembers(true)
}

// 格式化时间
const formatDate = (timeStr: string) => {
  const date = new Date(timeStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 隐藏手机号中间4位
const hidePhone = (phone: string) => {
  if (!phone || phone.length < 11) return phone
  return phone.slice(0, 3) + '****' + phone.slice(7)
}

// 返回
const goBack = () => {
  router.back()
}

onMounted(() => {
  loadSummary()
  loadMembers()
})
</script>

<template>
  <div class="team-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">我的团队</div>
      <div class="nav-placeholder"></div>
    </div>

    <!-- 汇总卡片 -->
    <div class="summary-card">
      <div class="summary-loading" v-if="!summary">
        <t-loading theme="circular" size="32px" />
      </div>
      <template v-else>
        <div class="summary-stats">
          <div class="stat-item">
            <div class="stat-value">{{ summary.directCount }}</div>
            <div class="stat-label">直属成员</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ summary.indirectCount }}</div>
            <div class="stat-label">间接成员</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ summary.totalCount }}</div>
            <div class="stat-label">团队总数</div>
          </div>
          <div class="stat-item highlight">
            <div class="stat-value">+{{ summary.monthlyNewCount }}</div>
            <div class="stat-label">本月新增</div>
          </div>
        </div>
      </template>
    </div>

    <!-- 【2026-01-21】团队返券入口（仅一级推销员显示）-->
    <div class="action-card" v-if="isLevel1">
      <div class="action-item" @click="router.push('/team-grant')">
        <div class="action-icon">🎫</div>
        <div class="action-info">
          <div class="action-title">团队返券</div>
          <div class="action-desc">给下级发放代金券，激励团队</div>
        </div>
        <t-icon name="chevron-right" size="20px" class="action-arrow" />
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div
        class="filter-item"
        :class="{ active: filterType === option.value }"
        v-for="option in filterOptions"
        :key="option.value"
        @click="onFilterChange(option.value as any)"
      >
        {{ option.label }}
      </div>
    </div>

    <!-- 成员列表 -->
    <div class="members-section">
      <!-- 加载中 -->
      <div class="loading-wrap" v-if="loading">
        <t-loading theme="circular" size="32px" />
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else-if="members.length === 0">
        <t-icon name="usergroup" size="48px" class="empty-icon" />
        <p>暂无团队成员</p>
        <p class="empty-tip">邀请好友加入您的团队</p>
      </div>

      <!-- 成员列表 -->
      <div class="members-list" v-else>
        <div class="member-item" v-for="member in members" :key="member.id">
          <div class="member-avatar">
            <t-icon name="user" size="24px" />
          </div>
          <div class="member-info">
            <div class="member-header">
              <span class="member-name">{{ member.name }}</span>
              <span class="member-type">{{ typeMap[member.levelType] || member.levelType }}</span>
            </div>
            <div class="member-phone">{{ hidePhone(member.phone) }}</div>
            <div class="member-stats">
              <span>等级: {{ member.level }}</span>
              <span>本月业绩: ¥{{ (member.monthlyPerformance || 0).toFixed(0) }}</span>
              <span>加入: {{ formatDate(member.joinDate) }}</span>
            </div>
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
.team-page {
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
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  z-index: 100;
  border-bottom: 1px solid #eee;
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
  margin: 56px 12px 12px;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
}

.summary-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
}

.summary-stats {
  display: flex;
}

/* 【2026-01-21】团队返券入口 */
.action-card {
  margin: 0 12px 12px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.action-item {
  display: flex;
  align-items: center;
  padding: 16px;
  cursor: pointer;
}

.action-item:active {
  background: #f5f5f5;
}

.action-icon {
  font-size: 28px;
  margin-right: 12px;
}

.action-info {
  flex: 1;
}

.action-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.action-desc {
  font-size: 13px;
  color: #999;
}

.action-arrow {
  color: #ccc;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-item .stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.stat-item .stat-label {
  font-size: 12px;
  color: #999;
}

.stat-item.highlight .stat-value {
  color: #E53935;
}

.filter-bar {
  display: flex;
  margin: 0 12px 12px;
  background: #fff;
  border-radius: 8px;
  padding: 4px;
}

.filter-item {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  font-size: 13px;
  color: #666;
  border-radius: 6px;
  transition: all 0.2s;
}

.filter-item.active {
  background: #E53935;
  color: #fff;
}

.members-section {
  margin: 0 12px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
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

.empty-tip {
  font-size: 12px;
  margin-top: 8px;
}

.members-list {
  padding: 0 16px;
}

.member-item {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #f5f5f5;
}

.member-item:last-child {
  border-bottom: none;
}

.member-avatar {
  width: 48px;
  height: 48px;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.member-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.member-type {
  font-size: 11px;
  color: #E53935;
  background: #fff5f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.member-phone {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.member-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.load-more {
  text-align: center;
  padding: 16px;
  color: #999;
  font-size: 13px;
}
</style>
