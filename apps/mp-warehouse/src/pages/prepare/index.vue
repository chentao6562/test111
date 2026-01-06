<template>
  <view class="page">
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab', { active: currentTab === tab.value }]"
        @tap="switchTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
        <text v-if="tab.count" class="badge">{{ tab.count }}</text>
      </view>
    </view>

    <view class="list-section">
      <view v-if="!orderList.length && !loading" class="empty">
        <text>暂无备货任务</text>
      </view>

      <view
        v-for="order in orderList"
        :key="order.id"
        class="order-item"
      >
        <view class="order-header">
          <text class="order-no">{{ order.orderNo }}</text>
          <text :class="['status', order.statusClass]">{{ order.statusText }}</text>
        </view>

        <view class="goods-list">
          <view v-for="item in order.items.slice(0, 2)" :key="item.id" class="goods-item">
            <image :src="item.productImage" mode="aspectFill" class="goods-image" />
            <view class="goods-info">
              <text class="goods-name">{{ item.productName }}</text>
              <text class="goods-qty">x{{ item.quantity }}</text>
            </view>
          </view>
          <view v-if="order.items.length > 2" class="more-goods">
            <text>共{{ order.items.length }}件商品</text>
          </view>
        </view>

        <view class="order-footer">
          <view class="customer-info">
            <text>{{ order.contactName }}</text>
            <text class="phone">{{ order.contactPhone }}</text>
          </view>
          <view v-if="order.status === 1" class="action-btn" @tap="startPrepare(order.id)">
            <text>开始备货</text>
          </view>
          <view v-else-if="order.status === 2" class="action-btn complete" @tap="completePrepare(order.id)">
            <text>完成备货</text>
          </view>
        </view>
      </view>
    </view>

    <view class="loading" v-if="loading">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get, post } from '@/utils/request'

interface OrderItem {
  id: number
  productName: string
  productImage: string
  quantity: number
}

interface PrepareOrder {
  id: number
  orderNo: string
  status: number
  statusText: string
  statusClass: string
  contactName: string
  contactPhone: string
  items: OrderItem[]
}

const tabs = ref([
  { label: '待备货', value: 1, count: 0 },
  { label: '备货中', value: 2, count: 0 },
  { label: '已完成', value: 3, count: 0 },
])

const currentTab = ref(1)
const loading = ref(false)
const orderList = ref<PrepareOrder[]>([])

const statusMap: Record<number, { text: string; class: string }> = {
  1: { text: '待备货', class: 'pending' },
  2: { text: '备货中', class: 'preparing' },
  3: { text: '待提货', class: 'ready' },
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await get('/warehouse/prepare/list', { status: currentTab.value })
    if (res.data?.list) {
      orderList.value = res.data.list.map((order: any) => ({
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        statusText: statusMap[order.status]?.text || '未知',
        statusClass: statusMap[order.status]?.class || '',
        contactName: order.contactName,
        contactPhone: order.contactPhone,
        items: (order.items || []).map((item: any) => ({
          id: item.id,
          productName: item.productName,
          productImage: item.productImage || 'https://via.placeholder.com/80',
          quantity: item.quantity,
        })),
      }))
    }
    // 更新tab计数
    if (res.data?.counts) {
      tabs.value[0].count = res.data.counts.pending || 0
      tabs.value[1].count = res.data.counts.preparing || 0
      tabs.value[2].count = res.data.counts.ready || 0
    }
  } catch (e) {
    console.error('获取备货列表失败', e)
  } finally {
    loading.value = false
  }
}

const switchTab = (value: number) => {
  currentTab.value = value
  fetchOrders()
}

const startPrepare = async (orderId: number) => {
  try {
    uni.showLoading({ title: '处理中...' })
    await post(`/warehouse/prepare/${orderId}`, { action: 'start' })
    uni.hideLoading()
    uni.showToast({ title: '已开始备货', icon: 'success' })
    fetchOrders()
  } catch (e) {
    uni.hideLoading()
    console.error('开始备货失败', e)
  }
}

const completePrepare = async (orderId: number) => {
  uni.showModal({
    title: '确认',
    content: '确定该订单已完成备货？',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' })
          await post(`/warehouse/prepare/${orderId}`, { action: 'complete' })
          uni.hideLoading()
          uni.showToast({ title: '备货完成', icon: 'success' })
          fetchOrders()
        } catch (e) {
          uni.hideLoading()
          console.error('完成备货失败', e)
        }
      }
    },
  })
}

onMounted(() => {
  fetchOrders()
})
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.tabs {
  display: flex;
  background: #fff;
  padding: 0 20rpx;

  .tab {
    flex: 1;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    text {
      font-size: 28rpx;
      color: #666;
    }

    .badge {
      position: absolute;
      top: 16rpx;
      right: 20rpx;
      min-width: 32rpx;
      height: 32rpx;
      background: #f44336;
      border-radius: 16rpx;
      font-size: 20rpx;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 8rpx;
    }

    &.active {
      text {
        color: #1e88e5;
        font-weight: bold;
      }

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 60rpx;
        height: 4rpx;
        background: #1e88e5;
        border-radius: 2rpx;
      }
    }
  }
}

.list-section {
  padding: 20rpx;

  .order-item {
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;

    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16rpx;
      border-bottom: 1rpx solid #f5f5f5;

      .order-no {
        font-size: 26rpx;
        color: #666;
      }

      .status {
        font-size: 24rpx;
        padding: 6rpx 16rpx;
        border-radius: 8rpx;

        &.pending {
          background: #fff3e0;
          color: #ff9800;
        }

        &.preparing {
          background: #e3f2fd;
          color: #1e88e5;
        }

        &.ready {
          background: #e8f5e9;
          color: #4caf50;
        }
      }
    }

    .goods-list {
      padding: 16rpx 0;
    }

    .goods-item {
      display: flex;
      align-items: center;
      padding: 12rpx 0;

      .goods-image {
        width: 80rpx;
        height: 80rpx;
        border-radius: 8rpx;
        background: #f5f5f5;
      }

      .goods-info {
        flex: 1;
        display: flex;
        justify-content: space-between;
        margin-left: 16rpx;

        .goods-name {
          font-size: 28rpx;
          color: #333;
        }

        .goods-qty {
          font-size: 26rpx;
          color: #999;
        }
      }
    }

    .more-goods {
      padding: 12rpx 0;
      text-align: center;

      text {
        font-size: 24rpx;
        color: #999;
      }
    }

    .order-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16rpx;
      border-top: 1rpx solid #f5f5f5;

      .customer-info {
        display: flex;
        gap: 16rpx;

        text {
          font-size: 26rpx;
          color: #333;
        }

        .phone {
          color: #666;
        }
      }

      .action-btn {
        padding: 12rpx 32rpx;
        background: #ff9800;
        border-radius: 24rpx;

        text {
          font-size: 26rpx;
          color: #fff;
          font-weight: 500;
        }

        &.complete {
          background: #4caf50;
        }
      }
    }
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
