<template>
  <view class="page">
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">供应商名称</text>
        <input
          v-model="form.supplierName"
          placeholder="请输入供应商名称"
          class="form-input"
        />
      </view>
      <view class="form-item">
        <text class="form-label">备注</text>
        <input
          v-model="form.remark"
          placeholder="选填"
          class="form-input"
        />
      </view>
    </view>

    <view class="goods-section">
      <view class="section-header">
        <text class="section-title">入库商品</text>
        <view class="add-btn" @tap="showProductPicker = true">
          <text>+ 添加商品</text>
        </view>
      </view>

      <view v-if="!form.items.length" class="empty">
        <text>请添加入库商品</text>
      </view>

      <view
        v-for="(item, index) in form.items"
        :key="index"
        class="goods-item"
      >
        <view class="goods-header">
          <text class="goods-name">{{ item.productName }}</text>
          <text class="remove-btn" @tap="removeItem(index)">删除</text>
        </view>
        <view class="goods-inputs">
          <view class="input-group">
            <text class="input-label">数量</text>
            <input
              v-model.number="item.quantity"
              type="number"
              placeholder="0"
              class="input"
            />
          </view>
          <view class="input-group">
            <text class="input-label">成本价</text>
            <input
              v-model="item.costPrice"
              type="digit"
              placeholder="0.00"
              class="input"
            />
          </view>
        </view>
      </view>
    </view>

    <view class="summary-section" v-if="form.items.length">
      <view class="summary-row">
        <text>商品数量</text>
        <text>{{ totalQuantity }}件</text>
      </view>
      <view class="summary-row total">
        <text>总金额</text>
        <text class="amount">¥{{ totalAmount }}</text>
      </view>
    </view>

    <view class="action-bar">
      <button class="submit-btn" @tap="submitInbound">提交入库单</button>
    </view>

    <!-- 商品选择弹窗 -->
    <view v-if="showProductPicker" class="picker-modal">
      <view class="picker-content">
        <view class="picker-header">
          <text class="picker-title">选择商品</text>
          <text class="picker-close" @tap="showProductPicker = false">关闭</text>
        </view>
        <view class="product-list">
          <view
            v-for="product in productList"
            :key="product.id"
            class="product-item"
            @tap="addProduct(product)"
          >
            <image :src="product.cover" mode="aspectFill" class="product-image" />
            <view class="product-info">
              <text class="product-name">{{ product.name }}</text>
              <text class="product-stock">当前库存: {{ product.stock }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { get, post } from '@/utils/request'

interface InboundItem {
  productId: number
  productName: string
  quantity: number
  costPrice: string
}

interface Product {
  id: number
  name: string
  cover: string
  stock: number
}

const form = ref({
  supplierName: '',
  remark: '',
  items: [] as InboundItem[],
})

const showProductPicker = ref(false)
const productList = ref<Product[]>([])

const totalQuantity = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
})

const totalAmount = computed(() => {
  const amount = form.value.items.reduce((sum, item) => {
    const price = parseFloat(item.costPrice) || 0
    const qty = item.quantity || 0
    return sum + price * qty
  }, 0)
  return amount.toFixed(2)
})

const fetchProducts = async () => {
  try {
    const res = await get('/warehouse/stock/list', { pageSize: 100 })
    if (res.data?.list) {
      productList.value = res.data.list.map((item: any) => ({
        id: item.id,
        name: item.name,
        cover: item.cover || 'https://via.placeholder.com/80',
        stock: item.stock,
      }))
    }
  } catch (e) {
    console.error('获取商品列表失败', e)
  }
}

const addProduct = (product: Product) => {
  // 检查是否已添加
  const exists = form.value.items.find((item) => item.productId === product.id)
  if (exists) {
    uni.showToast({ title: '该商品已添加', icon: 'none' })
    return
  }

  form.value.items.push({
    productId: product.id,
    productName: product.name,
    quantity: 1,
    costPrice: '',
  })
  showProductPicker.value = false
}

const removeItem = (index: number) => {
  form.value.items.splice(index, 1)
}

const submitInbound = async () => {
  if (!form.value.supplierName) {
    uni.showToast({ title: '请输入供应商名称', icon: 'none' })
    return
  }
  if (!form.value.items.length) {
    uni.showToast({ title: '请添加入库商品', icon: 'none' })
    return
  }

  // 验证商品数据
  for (const item of form.value.items) {
    if (!item.quantity || item.quantity <= 0) {
      uni.showToast({ title: '请输入正确的商品数量', icon: 'none' })
      return
    }
    if (!item.costPrice || parseFloat(item.costPrice) <= 0) {
      uni.showToast({ title: '请输入正确的成本价', icon: 'none' })
      return
    }
  }

  try {
    uni.showLoading({ title: '提交中...' })
    await post('/warehouse/inbound', {
      supplierName: form.value.supplierName,
      remark: form.value.remark,
      items: form.value.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        costPrice: parseFloat(item.costPrice),
      })),
    })
    uni.hideLoading()
    uni.showToast({ title: '入库单已创建', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (e) {
    uni.hideLoading()
    console.error('创建入库单失败', e)
  }
}

onMounted(() => {
  fetchProducts()
})
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 150rpx;
}

.form-section {
  background: #fff;
  padding: 20rpx 30rpx;
  margin-bottom: 20rpx;

  .form-item {
    padding: 20rpx 0;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }

    .form-label {
      font-size: 28rpx;
      color: #333;
      display: block;
      margin-bottom: 16rpx;
    }

    .form-input {
      height: 72rpx;
      background: #f5f5f5;
      border-radius: 12rpx;
      padding: 0 24rpx;
      font-size: 28rpx;
    }
  }
}

.goods-section {
  background: #fff;
  padding: 20rpx 30rpx;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 20rpx;

    .section-title {
      font-size: 30rpx;
      font-weight: bold;
      color: #333;
    }

    .add-btn {
      padding: 12rpx 24rpx;
      background: #1e88e5;
      border-radius: 24rpx;

      text {
        font-size: 26rpx;
        color: #fff;
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

  .goods-item {
    background: #f9f9f9;
    border-radius: 12rpx;
    padding: 20rpx;
    margin-bottom: 16rpx;

    .goods-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16rpx;

      .goods-name {
        font-size: 28rpx;
        color: #333;
        font-weight: 500;
      }

      .remove-btn {
        font-size: 26rpx;
        color: #f44336;
      }
    }

    .goods-inputs {
      display: flex;
      gap: 20rpx;

      .input-group {
        flex: 1;

        .input-label {
          font-size: 24rpx;
          color: #999;
          display: block;
          margin-bottom: 8rpx;
        }

        .input {
          height: 64rpx;
          background: #fff;
          border-radius: 8rpx;
          padding: 0 16rpx;
          font-size: 28rpx;
          text-align: center;
        }
      }
    }
  }
}

.summary-section {
  background: #fff;
  margin: 20rpx 0;
  padding: 20rpx 30rpx;

  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 12rpx 0;
    font-size: 28rpx;
    color: #666;

    &.total {
      border-top: 1rpx solid #f5f5f5;
      padding-top: 20rpx;
      margin-top: 10rpx;

      .amount {
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

  .submit-btn {
    height: 96rpx;
    background: linear-gradient(135deg, #1e88e5, #1565c0);
    border-radius: 48rpx;
    font-size: 32rpx;
    font-weight: bold;
    color: #fff;
  }
}

.picker-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;

  .picker-content {
    width: 100%;
    max-height: 70vh;
    background: #fff;
    border-radius: 32rpx 32rpx 0 0;
    padding: 30rpx;

    .picker-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20rpx;
      border-bottom: 1rpx solid #f5f5f5;

      .picker-title {
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
      }

      .picker-close {
        font-size: 28rpx;
        color: #999;
      }
    }

    .product-list {
      max-height: 60vh;
      overflow-y: auto;
      padding-top: 20rpx;

      .product-item {
        display: flex;
        align-items: center;
        padding: 20rpx 0;
        border-bottom: 1rpx solid #f5f5f5;

        .product-image {
          width: 100rpx;
          height: 100rpx;
          border-radius: 12rpx;
          background: #f5f5f5;
        }

        .product-info {
          flex: 1;
          margin-left: 20rpx;

          .product-name {
            font-size: 28rpx;
            color: #333;
            display: block;
          }

          .product-stock {
            font-size: 24rpx;
            color: #999;
            margin-top: 8rpx;
          }
        }
      }
    }
  }
}
</style>
