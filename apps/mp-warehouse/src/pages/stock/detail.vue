<template>
  <view class="page">
    <view class="product-header">
      <image :src="product.cover" mode="aspectFill" class="product-image" />
      <view class="product-info">
        <text class="product-name">{{ product.name }}</text>
        <text class="product-price">¥{{ product.price }}</text>
      </view>
    </view>

    <view class="stock-card">
      <view class="stock-row">
        <view class="stock-item">
          <text class="item-value" :class="{ warning: product.stock <= product.warningStock }">
            {{ product.stock }}
          </text>
          <text class="item-label">当前库存</text>
        </view>
        <view class="stock-item">
          <text class="item-value">{{ product.availableStock }}</text>
          <text class="item-label">可用库存</text>
        </view>
        <view class="stock-item">
          <text class="item-value lock">{{ product.lockStock }}</text>
          <text class="item-label">锁定库存</text>
        </view>
      </view>
      <view class="warning-row">
        <text class="warning-label">预警阈值: {{ product.warningStock }}{{ product.unit }}</text>
        <text v-if="product.stock <= product.warningStock" class="warning-text">库存不足!</text>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">库存流水</text>
      </view>
      <view class="log-list">
        <view v-if="!logs.length" class="empty">
          <text>暂无库存流水</text>
        </view>
        <view v-else v-for="log in logs" :key="log.id" class="log-item">
          <view class="log-left">
            <text class="log-type" :class="log.type">
              {{ log.type === 'in' ? '入库' : log.type === 'out' ? '出库' : '调整' }}
            </text>
            <text class="log-reason">{{ log.reason }}</text>
          </view>
          <view class="log-right">
            <text class="log-qty" :class="{ plus: log.quantity > 0 }">
              {{ log.quantity > 0 ? '+' : '' }}{{ log.quantity }}
            </text>
            <text class="log-time">{{ log.createdAt }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get } from '@/utils/request'

interface ProductDetail {
  id: number
  name: string
  cover: string
  price: string
  stock: number
  lockStock: number
  warningStock: number
  availableStock: number
  unit: string
}

interface StockLog {
  id: number
  type: string
  quantity: number
  reason: string
  createdAt: string
}

const product = ref<ProductDetail>({
  id: 0,
  name: '',
  cover: '',
  price: '0.00',
  stock: 0,
  lockStock: 0,
  warningStock: 10,
  availableStock: 0,
  unit: '件',
})

const logs = ref<StockLog[]>([])

const fetchStockDetail = async (id: number) => {
  try {
    const res = await get(`/warehouse/stock/${id}`)
    if (res.data) {
      product.value = {
        id: res.data.id,
        name: res.data.name,
        cover: res.data.cover || 'https://via.placeholder.com/200',
        price: res.data.price || '0.00',
        stock: res.data.stock,
        lockStock: res.data.lockStock || 0,
        warningStock: res.data.warningStock || 10,
        availableStock: res.data.availableStock || res.data.stock - (res.data.lockStock || 0),
        unit: res.data.unit || '件',
      }

      if (res.data.recentLogs) {
        logs.value = res.data.recentLogs.map((log: any) => ({
          id: log.id,
          type: log.type,
          quantity: log.quantity,
          reason: log.reason || getReasonText(log.reason),
          createdAt: log.createdAt ? new Date(log.createdAt).toLocaleString('zh-CN') : '',
        }))
      }
    }
  } catch (e) {
    console.error('获取库存详情失败', e)
    uni.showToast({ title: '获取失败', icon: 'none' })
  }
}

const getReasonText = (reason: string) => {
  const reasonMap: Record<string, string> = {
    purchase: '采购入库',
    sale: '销售出库',
    adjust: '库存调整',
    return: '退货入库',
  }
  return reasonMap[reason] || reason
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const id = Number(currentPage?.options?.id)
  if (id) {
    fetchStockDetail(id)
  } else {
    uni.showToast({ title: '参数错误', icon: 'none' })
  }
})
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.product-header {
  display: flex;
  background: #fff;
  padding: 30rpx;

  .product-image {
    width: 180rpx;
    height: 180rpx;
    border-radius: 16rpx;
    background: #f5f5f5;
  }

  .product-info {
    flex: 1;
    margin-left: 24rpx;
    display: flex;
    flex-direction: column;
    justify-content: center;

    .product-name {
      font-size: 32rpx;
      color: #333;
      font-weight: bold;
    }

    .product-price {
      font-size: 36rpx;
      color: #e53734;
      font-weight: bold;
      margin-top: 16rpx;
    }
  }
}

.stock-card {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 30rpx;

  .stock-row {
    display: flex;
    justify-content: space-around;
  }

  .stock-item {
    display: flex;
    flex-direction: column;
    align-items: center;

    .item-value {
      font-size: 48rpx;
      font-weight: bold;
      color: #1e88e5;

      &.warning {
        color: #ff9800;
      }

      &.lock {
        color: #f44336;
      }
    }

    .item-label {
      font-size: 24rpx;
      color: #999;
      margin-top: 8rpx;
    }
  }

  .warning-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 24rpx;
    padding-top: 24rpx;
    border-top: 1rpx solid #f5f5f5;

    .warning-label {
      font-size: 26rpx;
      color: #666;
    }

    .warning-text {
      font-size: 26rpx;
      color: #ff9800;
      font-weight: bold;
    }
  }
}

.section {
  margin: 20rpx;

  .section-header {
    margin-bottom: 16rpx;
  }

  .section-title {
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
  }

  .log-list {
    background: #fff;
    border-radius: 16rpx;
    overflow: hidden;
  }

  .log-item {
    display: flex;
    justify-content: space-between;
    padding: 24rpx 30rpx;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }

    .log-left {
      display: flex;
      align-items: center;
      gap: 16rpx;

      .log-type {
        padding: 6rpx 16rpx;
        border-radius: 8rpx;
        font-size: 22rpx;
        font-weight: bold;

        &.in {
          background: #e8f5e9;
          color: #4caf50;
        }

        &.out {
          background: #ffebee;
          color: #f44336;
        }

        &.adjust {
          background: #fff3e0;
          color: #ff9800;
        }
      }

      .log-reason {
        font-size: 28rpx;
        color: #333;
      }
    }

    .log-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;

      .log-qty {
        font-size: 28rpx;
        font-weight: bold;
        color: #f44336;

        &.plus {
          color: #4caf50;
        }
      }

      .log-time {
        font-size: 22rpx;
        color: #999;
        margin-top: 4rpx;
      }
    }
  }

  .empty {
    padding: 60rpx;
    text-align: center;

    text {
      font-size: 28rpx;
      color: #999;
    }
  }
}
</style>
