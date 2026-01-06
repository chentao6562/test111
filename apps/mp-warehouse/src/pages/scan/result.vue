<template>
  <view class="page">
    <view class="status-header" :class="order.status">
      <view class="status-icon">
        <text>{{ order.pickedAt ? '已' : '待' }}</text>
      </view>
      <text class="status-text">{{ order.pickedAt ? '已核销' : '待核销' }}</text>
      <text class="pickup-code">提货码: {{ pickupCode }}</text>
    </view>

    <view class="order-info">
      <view class="info-header">
        <text class="order-no">订单号: {{ order.orderNo }}</text>
        <text class="order-time">{{ order.createdAt }}</text>
      </view>

      <view class="customer-info">
        <text class="label">联系人</text>
        <text class="value">{{ order.contactName }} {{ order.contactPhone }}</text>
      </view>
    </view>

    <view class="goods-section">
      <view class="section-title">商品清单</view>
      <view class="goods-list">
        <view v-for="item in order.items" :key="item.id" class="goods-item">
          <image :src="item.productImage" mode="aspectFill" class="goods-image" />
          <view class="goods-info">
            <text class="goods-name">{{ item.productName }}</text>
            <view class="goods-bottom">
              <text class="goods-price">¥{{ item.price }}</text>
              <text class="goods-qty">x{{ item.quantity }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="amount-section">
      <view class="amount-item">
        <text>商品金额</text>
        <text>¥{{ order.totalAmount }}</text>
      </view>
      <view class="amount-item" v-if="order.vipFee > 0">
        <text>VIP锁货费</text>
        <text>¥{{ order.vipFee }}</text>
      </view>
      <view class="amount-item total">
        <text>实付金额</text>
        <text class="pay-amount">¥{{ order.payAmount }}</text>
      </view>
    </view>

    <view class="action-bar" v-if="!order.pickedAt">
      <button class="confirm-btn" @tap="confirmPickup">确认核销</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get, post } from '@/utils/request'

interface OrderDetail {
  id: number
  orderNo: string
  status: number
  totalAmount: string
  vipFee: string
  payAmount: string
  contactName: string
  contactPhone: string
  createdAt: string
  pickedAt: string | null
  items: {
    id: number
    productName: string
    productImage: string
    price: string
    quantity: number
  }[]
}

const pickupCode = ref('')
const orderId = ref(0)
const order = ref<OrderDetail>({
  id: 0,
  orderNo: '',
  status: 0,
  totalAmount: '0.00',
  vipFee: '0.00',
  payAmount: '0.00',
  contactName: '',
  contactPhone: '',
  createdAt: '',
  pickedAt: null,
  items: [],
})

const fetchOrderDetail = async () => {
  try {
    const res = await get(`/warehouse/order/verify/${pickupCode.value}`)
    if (res.data) {
      order.value = {
        id: res.data.id,
        orderNo: res.data.orderNo,
        status: res.data.status,
        totalAmount: res.data.totalAmount,
        vipFee: res.data.vipFee || '0.00',
        payAmount: res.data.payAmount,
        contactName: res.data.contactName,
        contactPhone: res.data.contactPhone,
        createdAt: res.data.createdAt ? new Date(res.data.createdAt).toLocaleString('zh-CN') : '',
        pickedAt: res.data.pickedAt,
        items: res.data.items || [],
      }
    }
  } catch (e) {
    console.error('获取订单详情失败', e)
    uni.showToast({ title: '订单不存在', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  }
}

const confirmPickup = async () => {
  uni.showModal({
    title: '确认核销',
    content: '确定该订单已完成提货？',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' })
          await post(`/warehouse/order/pickup/${order.value.id}`)
          uni.hideLoading()
          uni.showToast({ title: '核销成功', icon: 'success' })
          order.value.pickedAt = new Date().toISOString()
        } catch (e) {
          uni.hideLoading()
          console.error('核销失败', e)
        }
      }
    },
  })
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  pickupCode.value = currentPage?.options?.code || ''
  orderId.value = Number(currentPage?.options?.orderId) || 0

  if (pickupCode.value) {
    fetchOrderDetail()
  } else {
    uni.showToast({ title: '参数错误', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  }
})
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 150rpx;
}

.status-header {
  background: linear-gradient(135deg, #4caf50, #388e3c);
  padding: 60rpx 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;

  &.picked {
    background: linear-gradient(135deg, #9e9e9e, #757575);
  }

  .status-icon {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;

    text {
      font-size: 48rpx;
      font-weight: bold;
      color: #fff;
    }
  }

  .status-text {
    font-size: 36rpx;
    font-weight: bold;
    color: #fff;
    margin-top: 20rpx;
  }

  .pickup-code {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.9);
    margin-top: 12rpx;
  }
}

.order-info {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 30rpx;

  .info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid #f5f5f5;

    .order-no {
      font-size: 26rpx;
      color: #666;
    }

    .order-time {
      font-size: 24rpx;
      color: #999;
    }
  }

  .customer-info {
    display: flex;
    justify-content: space-between;
    padding-top: 20rpx;

    .label {
      font-size: 28rpx;
      color: #666;
    }

    .value {
      font-size: 28rpx;
      color: #333;
      font-weight: 500;
    }
  }
}

.goods-section {
  margin: 20rpx;

  .section-title {
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 16rpx;
  }

  .goods-list {
    background: #fff;
    border-radius: 16rpx;
    padding: 20rpx;
  }

  .goods-item {
    display: flex;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }
  }

  .goods-image {
    width: 140rpx;
    height: 140rpx;
    border-radius: 12rpx;
    background: #f5f5f5;
  }

  .goods-info {
    flex: 1;
    margin-left: 20rpx;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .goods-name {
    font-size: 28rpx;
    color: #333;
  }

  .goods-bottom {
    display: flex;
    justify-content: space-between;
  }

  .goods-price {
    font-size: 28rpx;
    color: #e53734;
    font-weight: bold;
  }

  .goods-qty {
    font-size: 26rpx;
    color: #999;
  }
}

.amount-section {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 20rpx 30rpx;

  .amount-item {
    display: flex;
    justify-content: space-between;
    padding: 16rpx 0;
    font-size: 28rpx;
    color: #666;

    &.total {
      border-top: 1rpx solid #f5f5f5;
      margin-top: 10rpx;
      padding-top: 20rpx;

      .pay-amount {
        font-size: 36rpx;
        font-weight: bold;
        color: #e53734;
      }
    }
  }
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  background: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.08);

  .confirm-btn {
    height: 96rpx;
    background: linear-gradient(135deg, #4caf50, #388e3c);
    border-radius: 48rpx;
    font-size: 32rpx;
    font-weight: bold;
    color: #fff;
  }
}
</style>
