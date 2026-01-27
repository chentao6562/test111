<script setup lang="ts">
/**
 * 邀请记录页面
 * 【2026-01-17 新增】展示推销员邀请的下级列表
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { get } from '../api'

const router = useRouter()

interface InviteRecord {
  id: number
  name: string
  phone: string
  type: string
  typeLabel: string
  reservationCount: number
  contribution: number
  createdAt: string
}

const records = ref<InviteRecord[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const finished = ref(false)
const page = ref(1)
const pageSize = 20
const total = ref(0)

// 加载邀请记录
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
    const res = await get<{ list: InviteRecord[]; total: number }>('/commission/invite-records', {
      page: page.value,
      pageSize
    })
    const list = res.data.list || []
    total.value = res.data.total || 0

    if (refresh) {
      records.value = list
    } else {
      records.value.push(...list)
    }

    if (list.length < pageSize) {
      finished.value = true
    }
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
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

// 格式化时间
const formatDate = (timeStr: string) => {
  const date = new Date(timeStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 返回
const goBack = () => {
  router.back()
}

onMounted(() => {
  loadRecords()
})
</script>

<template>
  <div class="invite-records-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">邀请记录</div>
      <div class="nav-placeholder"></div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-card" v-if="!loading">
      <div class="stats-value">{{ total }}</div>
      <div class="stats-label">累计邀请人数</div>
    </div>

    <!-- 列表内容 -->
    <div class="list-content">
      <!-- 加载中 -->
      <div class="loading-wrap" v-if="loading">
        <t-loading theme="circular" size="32px" />
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else-if="records.length === 0">
        <t-icon name="user-add" size="48px" class="empty-icon" />
        <p>暂无邀请记录</p>
        <p class="empty-tip">分享邀请码邀请好友加入</p>
      </div>

      <!-- 记录列表 -->
      <div class="records-list" v-else>
        <div class="record-item" v-for="record in records" :key="record.id">
          <div class="record-avatar">
            <t-icon name="user" size="24px" />
          </div>
          <div class="record-info">
            <div class="record-header">
              <span class="record-name">{{ record.name }}</span>
              <span class="record-type">{{ record.typeLabel }}</span>
            </div>
            <div class="record-phone">{{ record.phone }}</div>
            <div class="record-stats">
              <span>预约数: {{ record.reservationCount }}</span>
              <span>贡献: ¥{{ (record.contribution || 0).toFixed(2) }}</span>
            </div>
            <div class="record-time">加入时间: {{ formatDate(record.createdAt) }}</div>
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
.invite-records-page {
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

.stats-card {
  margin: 56px 12px 12px;
  background: linear-gradient(135deg, #E53935 0%, #ff6f61 100%);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  color: #fff;
}

.stats-value {
  font-size: 36px;
  font-weight: 600;
  margin-bottom: 8px;
}

.stats-label {
  font-size: 14px;
  opacity: 0.9;
}

.list-content {
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

.records-list {
  padding: 0 16px;
}

.record-item {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #f5f5f5;
}

.record-item:last-child {
  border-bottom: none;
}

.record-avatar {
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

.record-info {
  flex: 1;
  min-width: 0;
}

.record-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.record-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.record-type {
  font-size: 11px;
  color: #E53935;
  background: #fff5f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.record-phone {
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}

.record-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.record-time {
  font-size: 11px;
  color: #ccc;
}

.load-more {
  text-align: center;
  padding: 16px;
  color: #999;
  font-size: 13px;
}
</style>
