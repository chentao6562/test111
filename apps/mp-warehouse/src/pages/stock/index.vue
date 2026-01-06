<template>
  <view class="page">
    <view class="search-bar">
      <input
        v-model="keyword"
        placeholder="搜索商品名称"
        class="search-input"
        @confirm="searchStock"
      />
      <view class="filter-btn" @tap="showFilter = true">
        <text>筛选</text>
      </view>
    </view>

    <view class="filter-tags">
      <view
        :class="['tag', { active: warningOnly }]"
        @tap="toggleWarning"
      >
        <text>库存预警</text>
      </view>
    </view>

    <view class="stock-list">
      <view
        v-for="item in stockList"
        :key="item.id"
        class="stock-item"
        @tap="goToDetail(item.id)"
      >
        <image :src="item.cover" mode="aspectFill" class="stock-image" />
        <view class="stock-info">
          <text class="stock-name">{{ item.name }}</text>
          <view class="stock-data">
            <view class="data-item">
              <text class="data-label">库存</text>
              <text :class="['data-value', { warning: item.stock <= item.warningStock }]">
                {{ item.stock }}{{ item.unit }}
              </text>
            </view>
            <view class="data-item">
              <text class="data-label">可用</text>
              <text class="data-value">{{ item.availableStock }}{{ item.unit }}</text>
            </view>
            <view class="data-item">
              <text class="data-label">锁定</text>
              <text class="data-value lock">{{ item.lockStock }}{{ item.unit }}</text>
            </view>
          </view>
        </view>
        <view class="arrow">></view>
      </view>

      <view v-if="!stockList.length && !loading" class="empty">
        <text>暂无库存数据</text>
      </view>
    </view>

    <view class="loading" v-if="loading">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get } from '@/utils/request'

interface StockItem {
  id: number
  name: string
  cover: string
  stock: number
  lockStock: number
  warningStock: number
  availableStock: number
  unit: string
}

const keyword = ref('')
const warningOnly = ref(false)
const showFilter = ref(false)
const loading = ref(false)
const stockList = ref<StockItem[]>([])
const page = ref(1)
const hasMore = ref(true)

const fetchStockList = async (reset = false) => {
  if (loading.value) return
  if (reset) {
    page.value = 1
    hasMore.value = true
  }
  if (!hasMore.value) return

  loading.value = true
  try {
    const res = await get('/warehouse/stock/list', {
      page: page.value,
      pageSize: 20,
      keyword: keyword.value || undefined,
      warning: warningOnly.value ? 1 : undefined,
    })

    if (res.data?.list) {
      const list = res.data.list.map((item: any) => ({
        id: item.id,
        name: item.name,
        cover: item.cover || 'https://via.placeholder.com/100',
        stock: item.stock,
        lockStock: item.lockStock || 0,
        warningStock: item.warningStock || 10,
        availableStock: item.availableStock || item.stock - (item.lockStock || 0),
        unit: item.unit || '件',
      }))

      if (reset) {
        stockList.value = list
      } else {
        stockList.value.push(...list)
      }

      hasMore.value = list.length >= 20
      page.value++
    }
  } catch (e) {
    console.error('获取库存列表失败', e)
  } finally {
    loading.value = false
  }
}

const searchStock = () => {
  fetchStockList(true)
}

const toggleWarning = () => {
  warningOnly.value = !warningOnly.value
  fetchStockList(true)
}

const goToDetail = (id: number) => {
  uni.navigateTo({ url: `/pages/stock/detail?id=${id}` })
}

onMounted(() => {
  fetchStockList(true)
})
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.search-bar {
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  background: #fff;

  .search-input {
    flex: 1;
    height: 72rpx;
    background: #f5f5f5;
    border-radius: 36rpx;
    padding: 0 30rpx;
    font-size: 28rpx;
  }

  .filter-btn {
    height: 72rpx;
    padding: 0 30rpx;
    background: #1e88e5;
    border-radius: 36rpx;
    display: flex;
    align-items: center;

    text {
      font-size: 28rpx;
      color: #fff;
    }
  }
}

.filter-tags {
  padding: 0 20rpx 20rpx;
  background: #fff;
  display: flex;
  gap: 16rpx;

  .tag {
    padding: 12rpx 24rpx;
    background: #f5f5f5;
    border-radius: 20rpx;

    text {
      font-size: 24rpx;
      color: #666;
    }

    &.active {
      background: #fff3e0;

      text {
        color: #ff9800;
      }
    }
  }
}

.stock-list {
  padding: 20rpx;
}

.stock-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;

  .stock-image {
    width: 120rpx;
    height: 120rpx;
    border-radius: 12rpx;
    background: #f5f5f5;
  }

  .stock-info {
    flex: 1;
    margin-left: 20rpx;

    .stock-name {
      font-size: 28rpx;
      color: #333;
      font-weight: 500;
      display: block;
      margin-bottom: 16rpx;
    }

    .stock-data {
      display: flex;
      gap: 30rpx;
    }

    .data-item {
      display: flex;
      flex-direction: column;

      .data-label {
        font-size: 22rpx;
        color: #999;
      }

      .data-value {
        font-size: 28rpx;
        color: #333;
        font-weight: bold;
        margin-top: 4rpx;

        &.warning {
          color: #ff9800;
        }

        &.lock {
          color: #f44336;
        }
      }
    }
  }

  .arrow {
    font-size: 28rpx;
    color: #ccc;
  }
}

.empty {
  padding: 100rpx;
  text-align: center;

  text {
    font-size: 28rpx;
    color: #999;
  }
}

.loading {
  padding: 40rpx;
  text-align: center;

  text {
    font-size: 26rpx;
    color: #999;
  }
}
</style>
