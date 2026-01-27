<script setup lang="ts">
/**
 * 我的发圈列表页面
 * 【2026-01-20】
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { get } from '../api/index'

const router = useRouter()

// 数据
interface Share {
  id: number
  imageUrl: string
  shareType: string
  status: string
  bonusPaid: boolean
  rejectReason?: string
  createdAt: string
  reviewedAt?: string
}

const shares = ref<Share[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const finished = ref(false)
const page = ref(1)
const pageSize = 20

// 当前Tab
const activeTab = ref('')
const tabs = [
  { value: '', label: '全部' },
  { value: 'PENDING', label: '待审核' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已驳回' },
]

// 加载发圈列表
const loadShares = async (refresh = false) => {
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
    const res = await get('/shares', {
      status: activeTab.value || undefined,
      page: page.value,
      pageSize
    })

    if (res.code === 0) {
      const list = res.data.list || []
      if (refresh) {
        shares.value = list
      } else {
        shares.value.push(...list)
      }
      if (list.length < pageSize) {
        finished.value = true
      }
    }
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 切换Tab
const onTabChange = (value: string) => {
  activeTab.value = value
  loadShares(true)
}

// 加载更多
const loadMore = () => {
  if (loadingMore.value || finished.value) return
  page.value++
  loadShares()
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  return `${month}月${day}日 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// 获取状态信息
const getStatusInfo = (status: string) => {
  switch (status) {
    case 'PENDING':
      return { label: '待审核', theme: 'warning', color: '#f59e0b' }
    case 'APPROVED':
      return { label: '已通过', theme: 'success', color: '#22c55e' }
    case 'REJECTED':
      return { label: '已驳回', theme: 'danger', color: '#ef4444' }
    default:
      return { label: '未知', theme: 'default', color: '#9ca3af' }
  }
}

// 获取类型标签
const getTypeLabel = (type: string) => {
  return type === 'XIAOHONGSHU' ? '小红书' : '朋友圈'
}

// 去上传
const goUpload = () => {
  router.push('/share-upload')
}

// 返回
const handleBack = () => {
  router.back()
}

// 预览图片
const previewImage = ref('')
const showPreview = ref(false)
const handlePreview = (url: string) => {
  previewImage.value = url
  showPreview.value = true
}

onMounted(() => {
  loadShares(true)
})
</script>

<template>
  <div class="my-shares-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="handleBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">我的发圈</div>
      <div class="nav-right" @click="goUpload">
        <t-icon name="add" size="24px" />
      </div>
    </div>

    <!-- 状态Tab -->
    <div class="tab-bar">
      <div
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: activeTab === tab.value }"
        @click="onTabChange(tab.value)"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content">
      <!-- 加载中 -->
      <div class="loading-state" v-if="loading">
        <t-loading />
        <div class="loading-text">加载中...</div>
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else-if="shares.length === 0">
        <img src="https://tdesign.gtimg.com/mobile/demos/example2.png" class="empty-image" />
        <div class="empty-text">暂无发圈记录</div>
        <t-button theme="primary" size="small" @click="goUpload">去发圈</t-button>
      </div>

      <!-- 发圈列表 -->
      <div class="share-list" v-else>
        <div
          v-for="share in shares"
          :key="share.id"
          class="share-item"
        >
          <div class="share-header">
            <div class="share-type">
              <span class="type-icon" :class="share.shareType.toLowerCase()">
                <t-icon :name="share.shareType === 'XIAOHONGSHU' ? 'logo-xiaohongshu' : 'logo-wechat'" />
              </span>
              <span class="type-text">{{ getTypeLabel(share.shareType) }}</span>
            </div>
            <div
              class="share-status"
              :style="{ color: getStatusInfo(share.status).color }"
            >
              {{ getStatusInfo(share.status).label }}
            </div>
          </div>

          <div class="share-image" @click="handlePreview(share.imageUrl)">
            <img :src="share.imageUrl" />
          </div>

          <div class="share-footer">
            <div class="share-time">{{ formatDate(share.createdAt) }}</div>
            <div class="share-bonus" v-if="share.bonusPaid">
              <t-icon name="gift" />
              <span>已获得首发圈奖励</span>
            </div>
          </div>

          <!-- 驳回原因 -->
          <div class="reject-reason" v-if="share.status === 'REJECTED' && share.rejectReason">
            <t-icon name="info-circle" />
            <span>驳回原因：{{ share.rejectReason }}</span>
          </div>
        </div>

        <!-- 加载更多 -->
        <div class="load-more" v-if="!finished" @click="loadMore">
          <t-loading v-if="loadingMore" size="small" />
          <span v-else>加载更多</span>
        </div>

        <div class="list-end" v-if="finished && shares.length > 0">
          没有更多了
        </div>
      </div>
    </div>

    <!-- 图片预览 -->
    <t-image-viewer v-model="showPreview" :images="[previewImage]" />

    <!-- 底部悬浮按钮 -->
    <div class="float-btn" @click="goUpload">
      <t-icon name="add" />
      <span>发圈打卡</span>
    </div>
  </div>
</template>

<style scoped>
.my-shares-page {
  min-height: 100vh;
  background: var(--td-bg-color-page);
  padding-bottom: 80px;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
}

.nav-back {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.nav-right {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  cursor: pointer;
}

/* Tab栏 */
.tab-bar {
  display: flex;
  background: #fff;
  padding: 0 16px;
  border-bottom: 1px solid var(--td-border-color);
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 14px;
  color: var(--td-text-color-secondary);
  position: relative;
  cursor: pointer;
}

.tab-item.active {
  color: var(--td-brand-color);
  font-weight: 500;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: var(--td-brand-color);
  border-radius: 2px;
}

/* 内容区域 */
.content {
  padding: 16px;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.loading-text {
  font-size: 14px;
  color: var(--td-text-color-placeholder);
  margin-top: 12px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.empty-image {
  width: 120px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  color: var(--td-text-color-placeholder);
  margin-bottom: 16px;
}

/* 发圈列表 */
.share-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.share-item {
  background: #fff;
  border-radius: 12px;
  padding: 12px;
}

.share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.share-type {
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #fff;
}

.type-icon.moments {
  background: #07c160;
}

.type-icon.xiaohongshu {
  background: #fe2c55;
}

.type-text {
  font-size: 13px;
  color: var(--td-text-color-secondary);
}

.share-status {
  font-size: 13px;
  font-weight: 500;
}

.share-image {
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.share-image img {
  width: 100%;
  display: block;
}

.share-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.share-time {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.share-bonus {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #f59e0b;
}

.reject-reason {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 10px 12px;
  background: #fef2f2;
  border-radius: 8px;
  margin-top: 12px;
  font-size: 12px;
  color: #dc2626;
}

.reject-reason .t-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 16px;
  font-size: 14px;
  color: var(--td-text-color-secondary);
  cursor: pointer;
}

.list-end {
  text-align: center;
  padding: 16px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

/* 悬浮按钮 */
.float-btn {
  position: fixed;
  bottom: 24px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  background: var(--td-brand-color);
  color: #fff;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  z-index: 100;
}

.float-btn:active {
  transform: scale(0.95);
}
</style>
