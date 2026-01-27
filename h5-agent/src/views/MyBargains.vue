<script setup lang="ts">
/**
 * 我的砍价列表页面
 * @since 2026-01-22
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { getOptimizedImageUrl } from '../api'
import {
  getMyBargains,
  BargainStatus,
  BargainStatusLabels,
  BargainStatusColors,
  formatCountdown,
  type MyBargainItem
} from '../api/bargain'

const router = useRouter()

// 数据
const loading = ref(true)
const list = ref<MyBargainItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(true)
const refreshing = ref(false)

// 当前筛选状态
const currentStatus = ref<string>('')

// 【2026-01-23】状态标签精简为3个
const statusTabs = [
  { value: '', label: '全部' },
  { value: BargainStatus.BARGAINING, label: '砍价中' },
  { value: 'SUCCESS_OR_ORDERED', label: '已砍成' },  // 合并SUCCESS和ORDERED
]

// 加载列表
const loadList = async (reset = false) => {
  if (reset) {
    page.value = 1
    list.value = []
    hasMore.value = true
  }

  if (!hasMore.value && !reset) return

  loading.value = page.value === 1
  try {
    // 【2026-01-23】处理合并状态查询
    let statusParam: any = currentStatus.value || undefined
    if (currentStatus.value === 'SUCCESS_OR_ORDERED') {
      // 已砍成包含SUCCESS和ORDERED，需要获取全部后过滤
      statusParam = undefined
    }

    const result = await getMyBargains({
      page: page.value,
      pageSize: pageSize.value,
      status: statusParam
    })

    // 【2026-01-23】客户端过滤已砍成状态
    let filteredList = result.list
    if (currentStatus.value === 'SUCCESS_OR_ORDERED') {
      filteredList = result.list.filter(item =>
        item.status === BargainStatus.SUCCESS || item.status === BargainStatus.ORDERED
      )
    }

    if (reset) {
      list.value = filteredList
    } else {
      list.value.push(...filteredList)
    }

    // 【2026-01-23】对于合并状态，重新计算total
    total.value = currentStatus.value === 'SUCCESS_OR_ORDERED'
      ? list.value.length + (result.list.length - filteredList.length > 0 ? result.total - result.list.length : 0)
      : result.total
    hasMore.value = list.value.length < result.total
    page.value++
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 下拉刷新
const onRefresh = async () => {
  refreshing.value = true
  await loadList(true)
}

// 加载更多
const onLoadMore = () => {
  if (hasMore.value && !loading.value) {
    loadList()
  }
}

// 切换状态
const onStatusChange = (status: string) => {
  currentStatus.value = status
  loadList(true)
}

// 跳转详情
const goDetail = (code: string) => {
  router.push(`/bargain/${code}`)
}

// 返回
const goBack = () => {
  router.back()
}

// 发起新砍价
const goCreate = () => {
  router.push('/bargain-products')
}

onMounted(() => {
  loadList(true)
})
</script>

<template>
  <div class="my-bargains-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">我的砍价</div>
      <div class="nav-right" @click="goCreate">
        <t-icon name="add" size="20px" />
      </div>
    </div>

    <!-- 状态筛选 -->
    <div class="status-tabs">
      <div
        v-for="tab in statusTabs"
        :key="tab.value"
        :class="['tab-item', { active: currentStatus === tab.value }]"
        @click="onStatusChange(tab.value)"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- 列表内容 -->
    <t-pull-down-refresh v-model="refreshing" @refresh="onRefresh">
      <!-- 加载中 -->
      <div class="loading-wrap" v-if="loading && list.length === 0">
        <t-loading theme="circular" size="48px" />
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else-if="!loading && list.length === 0">
        <t-icon name="shop" size="64px" />
        <p>暂无砍价记录</p>
        <t-button theme="primary" size="small" @click="goCreate">
          去发起砍价
        </t-button>
      </div>

      <!-- 列表 -->
      <div class="bargain-list" v-else>
        <div
          v-for="item in list"
          :key="item.id"
          class="bargain-card"
          @click="goDetail(item.code)"
        >
          <div class="card-header">
            <span class="bargain-code">{{ item.code }}</span>
            <span
              class="status-tag"
              :style="{ backgroundColor: BargainStatusColors[item.status] }"
            >
              {{ BargainStatusLabels[item.status] }}
            </span>
          </div>

          <div class="card-body">
            <div class="product-image">
              <img :src="getOptimizedImageUrl(item.productImage, 'small')" alt="" />
            </div>
            <div class="product-info">
              <div class="product-name">{{ item.productName }}</div>
              <div class="price-row">
                <span class="current-price">¥{{ item.currentPrice.toFixed(2) }}</span>
                <span class="original-price">¥{{ item.originalPrice.toFixed(2) }}</span>
              </div>
              <div class="progress-row">
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{ width: `${item.progressPercent}%` }"
                  ></div>
                </div>
                <span class="progress-text">{{ item.progressPercent }}%</span>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="cut-info">
              已砍 {{ item.cutCount }} 刀
            </div>
            <div class="expire-info" v-if="item.status === BargainStatus.BARGAINING">
              <t-icon name="time" size="14px" />
              {{ formatCountdown(item.expireAt) }}
            </div>
            <div class="date-info" v-else>
              {{ item.createdAt.substring(0, 10) }}
            </div>
          </div>
        </div>

        <!-- 加载更多 -->
        <div class="load-more" v-if="hasMore" @click="onLoadMore">
          <t-loading v-if="loading" theme="circular" size="24px" />
          <span v-else>加载更多</span>
        </div>
        <div class="no-more" v-else>
          没有更多了
        </div>
      </div>
    </t-pull-down-refresh>
  </div>
</template>

<style scoped>
.my-bargains-page {
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
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.nav-back,
.nav-right {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.status-tabs {
  position: fixed;
  top: 44px;
  left: 0;
  right: 0;
  height: 44px;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 0 8px;
  z-index: 99;
  border-bottom: 1px solid #f0f0f0;
}

.tab-item {
  flex: 1;
  text-align: center;
  font-size: 14px;
  color: #666;
  padding: 10px 0;
  position: relative;
}

.tab-item.active {
  color: #E53935;
  font-weight: 500;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 2px;
  background: #E53935;
  border-radius: 1px;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px;
  margin-top: 88px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #999;
  margin-top: 88px;
}

.empty-state p {
  margin: 12px 0 16px;
  font-size: 14px;
}

.bargain-list {
  padding: 12px;
  padding-top: 100px;
}

.bargain-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.bargain-code {
  font-size: 12px;
  color: #999;
}

.status-tag {
  font-size: 11px;
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
}

.card-body {
  display: flex;
  gap: 12px;
}

.product-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.product-name {
  font-size: 14px;
  color: #333;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.current-price {
  font-size: 16px;
  font-weight: 600;
  color: #E53935;
}

.original-price {
  font-size: 12px;
  color: #999;
  text-decoration: line-through;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #E53935, #ff6f61);
  border-radius: 3px;
}

.progress-text {
  font-size: 12px;
  color: #E53935;
  width: 40px;
  text-align: right;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.cut-info {
  font-size: 12px;
  color: #666;
}

.expire-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #E53935;
}

.date-info {
  font-size: 12px;
  color: #999;
}

.load-more {
  text-align: center;
  padding: 16px;
  font-size: 14px;
  color: #666;
}

.no-more {
  text-align: center;
  padding: 16px;
  font-size: 13px;
  color: #999;
}
</style>
