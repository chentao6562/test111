<script setup lang="ts">
/**
 * 套餐定价页面
 * 【2026-01-25】推销员设置套餐零售价和给下级的价格
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { getOptimizedImageUrl } from '../../api'
import { getPackageDetail, setPackagePrice, type Package } from '../../api/package'
import { useUserStore } from '../../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const saving = ref(false)
const pkg = ref<Package | null>(null)

// 表单数据
const form = ref({
  retailPrice: 0,
  subPrice: 0
})

// 获取套餐ID
const packageId = computed(() => Number(route.params.id))

// 是否是一级推销员（可以设置给下级的价）
const isLevel1 = computed(() => userStore.userInfo?.type === 'LEVEL1')

// 我的拿货价（确保返回数字类型）
const myCostPrice = computed(() => {
  const price = pkg.value?.myCostPrice
  if (!price) return 0
  return typeof price === 'string' ? parseFloat(price) : price
})

// 建议零售价（确保返回数字类型）
const suggestedPrice = computed(() => {
  const price = pkg.value?.suggestedPrice || pkg.value?.masterRetailPrice
  if (!price) return 0
  return typeof price === 'string' ? parseFloat(price) : price
})

// 预估利润
const estimatedProfit = computed(() => {
  if (!pkg.value) return 0
  const retail = form.value.retailPrice || 0
  const cost = myCostPrice.value || 0
  return retail - cost
})

// 预估利润率
const estimatedMargin = computed(() => {
  if (!form.value.retailPrice || form.value.retailPrice <= 0) return 0
  return (estimatedProfit.value / form.value.retailPrice) * 100
})

// 下级预估利润（一级专用）
const subEstimatedProfit = computed(() => {
  if (!isLevel1.value || !pkg.value) return 0
  const retail = form.value.retailPrice || 0
  const subPrice = form.value.subPrice || 0
  return retail - subPrice
})

// 加载套餐详情
const loadDetail = async () => {
  loading.value = true
  try {
    const res = await getPackageDetail(packageId.value)
    pkg.value = res.data
    // 初始化表单
    form.value.retailPrice = res.data.myRetailPrice || suggestedPrice.value
    form.value.subPrice = res.data.mySubPrice || 0
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
    router.back()
  } finally {
    loading.value = false
  }
}

// 使用建议价格
const useSuggested = () => {
  form.value.retailPrice = suggestedPrice.value
  if (isLevel1.value && myCostPrice.value) {
    // 给下级的价设为拿货价和零售价的中间值
    form.value.subPrice = Math.round((myCostPrice.value + suggestedPrice.value) / 2)
  }
}

// 保存定价
const handleSave = async () => {
  // 验证零售价
  if (!form.value.retailPrice || form.value.retailPrice <= 0) {
    Toast({ message: '请设置零售价', theme: 'warning' })
    return
  }
  if (form.value.retailPrice < myCostPrice.value) {
    Toast({ message: '零售价不能低于拿货价', theme: 'warning' })
    return
  }

  // 一级推销员验证给下级的价
  if (isLevel1.value) {
    if (!form.value.subPrice || form.value.subPrice <= 0) {
      Toast({ message: '请设置"给下级的价"，否则您的下级无法销售此套餐', theme: 'warning' })
      return
    }
    if (form.value.subPrice < myCostPrice.value) {
      Toast({ message: '给下级的价不能低于您的拿货价', theme: 'warning' })
      return
    }
    if (form.value.subPrice > form.value.retailPrice) {
      Toast({ message: '给下级的价不能高于您的零售价', theme: 'warning' })
      return
    }
  }

  saving.value = true
  try {
    await setPackagePrice(packageId.value, {
      retailPrice: form.value.retailPrice,
      subPrice: isLevel1.value ? form.value.subPrice : undefined
    })
    Toast({ message: '保存成功', theme: 'success' })
    router.back()
  } catch (err: any) {
    Toast({ message: err.message || '保存失败', theme: 'error' })
  } finally {
    saving.value = false
  }
}

// 格式化价格（兼容字符串和数字类型）
const formatPrice = (price: number | string | undefined | null): string => {
  if (price === undefined || price === null) return '-'
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(numPrice)) return '-'
  return `¥${numPrice.toFixed(2)}`
}

// 获取套餐图片
const getPackageImage = (): string => {
  if (pkg.value?.images && pkg.value.images.length > 0) {
    return getOptimizedImageUrl(pkg.value.images[0], 'small')
  }
  return '/placeholder.png'
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div class="package-price-page">
    <t-loading v-if="loading" size="40px" text="加载中..." class="page-loading" />

    <template v-else-if="pkg">
      <!-- 套餐信息卡片 -->
      <div class="package-card">
        <img :src="getPackageImage()" class="pkg-image" :alt="pkg.name" />
        <div class="pkg-info">
          <div class="pkg-name">{{ pkg.name }}</div>
          <div class="price-info">
            <span class="label">拿货价</span>
            <span class="value">{{ formatPrice(myCostPrice) }}</span>
          </div>
          <div class="price-info">
            <span class="label">建议零售价</span>
            <span class="value">{{ formatPrice(suggestedPrice) }}</span>
          </div>
        </div>
      </div>

      <!-- 定价表单 -->
      <div class="form-section">
        <div class="form-title">设置您的售价</div>

        <!-- 零售价 -->
        <div class="form-item">
          <div class="item-label">
            我的零售价
            <span class="required">*</span>
          </div>
          <div class="item-input">
            <span class="prefix">¥</span>
            <input
              v-model.number="form.retailPrice"
              type="number"
              placeholder="请输入零售价"
              :min="myCostPrice"
            />
          </div>
          <div class="item-hint">
            最低不能低于拿货价 {{ formatPrice(myCostPrice) }}
          </div>
        </div>

        <!-- 给下级的价（一级专用） -->
        <div class="form-item" v-if="isLevel1">
          <div class="item-label">
            给下级的价
            <span class="required">*</span>
          </div>
          <div class="item-input">
            <span class="prefix">¥</span>
            <input
              v-model.number="form.subPrice"
              type="number"
              placeholder="请输入给下级的价"
              :min="myCostPrice"
              :max="form.retailPrice"
            />
          </div>
          <div class="item-hint">
            范围：{{ formatPrice(myCostPrice) }} ~ {{ formatPrice(form.retailPrice || 0) }}
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="quick-actions">
          <t-button variant="outline" size="small" @click="useSuggested">
            使用建议价格
          </t-button>
        </div>
      </div>

      <!-- 利润预估 -->
      <div class="profit-section">
        <div class="section-title">利润预估</div>

        <div class="profit-row">
          <span class="label">您的利润</span>
          <span class="value" :class="{ negative: estimatedProfit < 0 }">
            {{ formatPrice(estimatedProfit) }}
          </span>
        </div>
        <div class="profit-row">
          <span class="label">您的利润率</span>
          <span class="value">{{ estimatedMargin.toFixed(1) }}%</span>
        </div>

        <template v-if="isLevel1">
          <div class="divider"></div>
          <div class="profit-row">
            <span class="label">您给下级的利润空间</span>
            <span class="value" :class="{ negative: subEstimatedProfit < 0 }">
              {{ formatPrice(subEstimatedProfit) }}
            </span>
          </div>
        </template>
      </div>

      <!-- 提示信息 -->
      <div class="tips-section">
        <div class="tips-title">温馨提示</div>
        <div class="tips-content">
          <p>1. 设置合理的价格可以提高成交率</p>
          <p>2. 建议参考平台的建议零售价</p>
          <p v-if="isLevel1">3. 设置给下级的价后，您的下级才能销售此套餐</p>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="bottom-bar">
        <t-button
          theme="primary"
          block
          :loading="saving"
          @click="handleSave"
        >
          保存定价
        </t-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.package-price-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

.page-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

/* 套餐卡片 */
.package-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #fff;
  margin-bottom: 10px;
}

.pkg-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.pkg-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.pkg-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.price-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.price-info .label {
  font-size: 13px;
  color: #999;
}

.price-info .value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

/* 表单区域 */
.form-section {
  background: #fff;
  padding: 16px;
  margin-bottom: 10px;
}

.form-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.form-item {
  margin-bottom: 20px;
}

.item-label {
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
}

.required {
  color: #ff5500;
  margin-left: 4px;
}

.item-input {
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0 12px;
  height: 44px;
}

.item-input .prefix {
  font-size: 16px;
  color: #999;
  margin-right: 4px;
}

.item-input input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  color: #333;
}

.item-input input::placeholder {
  color: #ccc;
}

.item-hint {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
}

/* 快捷操作 */
.quick-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

/* 利润预估 */
.profit-section {
  background: #fff;
  padding: 16px;
  margin-bottom: 10px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.profit-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.profit-row .label {
  font-size: 14px;
  color: #666;
}

.profit-row .value {
  font-size: 16px;
  font-weight: 600;
  color: #00b578;
}

.profit-row .value.negative {
  color: #ff5500;
}

.divider {
  height: 1px;
  background: #eee;
  margin: 12px 0;
}

/* 提示信息 */
.tips-section {
  background: #fff;
  padding: 16px;
  margin-bottom: 10px;
}

.tips-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.tips-content {
  font-size: 13px;
  color: #999;
  line-height: 1.8;
}

.tips-content p {
  margin: 0;
}

/* 底部按钮 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.bottom-bar .t-button {
  height: 44px;
  background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%);
  border: none;
}
</style>
