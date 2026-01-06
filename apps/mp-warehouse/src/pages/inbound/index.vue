<template>
  <view class="page">
    <view class="header-actions">
      <button class="create-btn" @tap="goToCreate">
        <text>+ 新建入库</text>
      </button>
    </view>

    <view class="list-section">
      <view v-if="!inboundList.length && !loading" class="empty">
        <text>暂无入库记录</text>
      </view>

      <view
        v-for="item in inboundList"
        :key="item.id"
        class="inbound-item"
      >
        <view class="item-header">
          <text class="inbound-no">{{ item.purchaseNo }}</text>
          <text :class="['status', item.status]">
            {{ item.status === 'pending' ? '待确认' : '已入库' }}
          </text>
        </view>

        <view class="item-content">
          <view class="info-row">
            <text class="label">供应商</text>
            <text class="value">{{ item.supplierName }}</text>
          </view>
          <view class="info-row">
            <text class="label">商品数量</text>
            <text class="value">{{ item.totalQuantity }}件</text>
          </view>
          <view class="info-row">
            <text class="label">总金额</text>
            <text class="value amount">¥{{ item.totalAmount }}</text>
          </view>
        </view>

        <view class="item-footer">
          <text class="time">{{ item.createdAt }}</text>
          <view v-if="item.status === 'pending'" class="action-btn" @tap="confirmInbound(item.id)">
            <text>确认入库</text>
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

interface InboundItem {
  id: number
  purchaseNo: string
  supplierName: string
  totalQuantity: number
  totalAmount: string
  status: string
  createdAt: string
}

const loading = ref(false)
const inboundList = ref<InboundItem[]>([])

const fetchInboundList = async () => {
  loading.value = true
  try {
    const res = await get('/warehouse/inbound/list')
    if (res.data?.list) {
      inboundList.value = res.data.list.map((item: any) => ({
        id: item.id,
        purchaseNo: item.purchaseNo,
        supplierName: item.supplierName || '未知供应商',
        totalQuantity: item.totalQuantity,
        totalAmount: item.totalAmount,
        status: item.status,
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '',
      }))
    }
  } catch (e) {
    console.error('获取入库列表失败', e)
  } finally {
    loading.value = false
  }
}

const goToCreate = () => {
  uni.navigateTo({ url: '/pages/inbound/create' })
}

const confirmInbound = async (id: number) => {
  uni.showModal({
    title: '确认入库',
    content: '确定该入库单已完成入库操作？',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' })
          await post(`/warehouse/inbound/${id}/confirm`)
          uni.hideLoading()
          uni.showToast({ title: '入库成功', icon: 'success' })
          fetchInboundList()
        } catch (e) {
          uni.hideLoading()
          console.error('确认入库失败', e)
        }
      }
    },
  })
}

onMounted(() => {
  fetchInboundList()
})
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
}

.header-actions {
  margin-bottom: 20rpx;

  .create-btn {
    height: 88rpx;
    background: linear-gradient(135deg, #1e88e5, #1565c0);
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    text {
      font-size: 30rpx;
      font-weight: bold;
      color: #fff;
    }
  }
}

.list-section {
  .inbound-item {
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16rpx;
      border-bottom: 1rpx solid #f5f5f5;

      .inbound-no {
        font-size: 28rpx;
        color: #333;
        font-weight: 500;
      }

      .status {
        font-size: 24rpx;
        padding: 6rpx 16rpx;
        border-radius: 8rpx;

        &.pending {
          background: #fff3e0;
          color: #ff9800;
        }

        &.completed {
          background: #e8f5e9;
          color: #4caf50;
        }
      }
    }

    .item-content {
      padding: 16rpx 0;

      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 8rpx 0;

        .label {
          font-size: 26rpx;
          color: #999;
        }

        .value {
          font-size: 26rpx;
          color: #333;

          &.amount {
            color: #e53734;
            font-weight: bold;
          }
        }
      }
    }

    .item-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16rpx;
      border-top: 1rpx solid #f5f5f5;

      .time {
        font-size: 24rpx;
        color: #999;
      }

      .action-btn {
        padding: 12rpx 32rpx;
        background: #1e88e5;
        border-radius: 24rpx;

        text {
          font-size: 26rpx;
          color: #fff;
          font-weight: 500;
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
