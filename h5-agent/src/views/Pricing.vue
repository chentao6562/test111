<script setup lang="ts">
/**
 * 定价管理页面
 * 【2026-01-17 新增】推销员设置商品零售价和给下级的价格
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import { get, post, getOptimizedImageUrl } from '../api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

interface PriceItem {
  productId: number
  productName: string
  productImage: string
  myCostPrice: number    // 我的拿货价（后端返回字段名）
  suggestedPrice: number // 建议零售价
  retailPrice: number | null   // 我的零售价
  subPrice: number | null      // 给下级的价（一级专用）
  editing: boolean
}

const loading = ref(true)
const saving = ref(false)
const priceList = ref<PriceItem[]>([])
const searchKeyword = ref('')

// 是否是一级推销员（可以设置给下级的价）
const isLevel1 = computed(() => userStore.userInfo?.type === 'LEVEL1')

// 过滤后的列表
const filteredList = computed(() => {
  if (!searchKeyword.value) return priceList.value
  const keyword = searchKeyword.value.toLowerCase()
  return priceList.value.filter(item =>
    item.productName.toLowerCase().includes(keyword)
  )
})

// 加载定价列表
const loadPrices = async () => {
  loading.value = true
  try {
    const res = await get<PriceItem[]>('/promotion/agent/prices')
    priceList.value = (res.data || []).map(item => ({
      ...item,
      editing: false
    }))
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
  } finally {
    loading.value = false
  }
}

// 开始编辑
const startEdit = (item: PriceItem) => {
  item.editing = true
}

// 取消编辑
const cancelEdit = (item: PriceItem) => {
  item.editing = false
  // 重新加载恢复原值
  loadPrices()
}

// 保存单个商品定价
const savePrice = async (item: PriceItem) => {
  // 验证零售价
  if (item.retailPrice === null || item.retailPrice === undefined) {
    Toast({ message: '请设置零售价', theme: 'warning' })
    return
  }
  if (item.retailPrice < item.myCostPrice) {
    Toast({ message: '零售价不能低于拿货价', theme: 'warning' })
    return
  }

  // 【2026-01-20修复】一级推销员必须设置给下级的价
  if (isLevel1.value) {
    if (item.subPrice === null || item.subPrice === undefined) {
      Toast({ message: '请设置"给下级的价"，否则您的下级无法销售此商品', theme: 'warning' })
      return
    }
    if (item.subPrice < item.myCostPrice) {
      Toast({ message: '给下级的价不能低于您的拿货价', theme: 'warning' })
      return
    }
    if (item.subPrice > item.retailPrice) {
      Toast({ message: '给下级的价不能高于您的零售价', theme: 'warning' })
      return
    }
  }

  saving.value = true
  try {
    await post('/promotion/agent/prices', {
      productId: item.productId,
      retailPrice: item.retailPrice,
      subPrice: isLevel1.value ? item.subPrice : undefined
    })
    Toast({ message: '保存成功', theme: 'success' })
    item.editing = false
  } catch (err: any) {
    Toast({ message: err.message || '保存失败', theme: 'error' })
  } finally {
    saving.value = false
  }
}

// 使用建议价格
const useSuggestedPrice = (item: PriceItem) => {
  item.retailPrice = item.suggestedPrice
  if (isLevel1.value) {
    // 给下级的价设为拿货价和零售价的中间值
    item.subPrice = Math.round((item.myCostPrice + item.suggestedPrice) / 2)
  }
}

// 批量设置为建议价
const batchSetSuggested = () => {
  Dialog.confirm({
    title: '批量设置',
    content: '确定将所有商品设置为建议零售价吗？',
    confirmBtn: '确定',
    cancelBtn: '取消',
    onConfirm: async () => {
      saving.value = true
      try {
        await post('/promotion/agent/prices/batch', { mode: 'suggested' })
        Toast({ message: '批量设置成功', theme: 'success' })
        loadPrices()
      } catch (err: any) {
        Toast({ message: err.message || '批量设置失败', theme: 'error' })
      } finally {
        saving.value = false
      }
    }
  })
}

// 格式化价格
const formatPrice = (price: number | null) => {
  if (price === null) return '-'
  return `¥${price.toFixed(2)}`
}

// 获取商品图片URL
const getProductImageUrl = (imageUrl: string) => {
  if (!imageUrl) return '/placeholder.png'
  // 使用优化的图片URL函数
  return getOptimizedImageUrl(imageUrl, 'small')
}

// 返回
const goBack = () => {
  router.back()
}

onMounted(() => {
  loadPrices()
})
</script>

<template>
  <div class="pricing-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">定价管理</div>
      <div class="nav-action" @click="batchSetSuggested">
        批量设置
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <t-icon name="search" size="20px" class="search-icon" />
      <input
        v-model="searchKeyword"
        type="text"
        placeholder="搜索商品"
        class="search-input"
      />
    </div>

    <!-- 提示信息 -->
    <div class="notice-card">
      <t-icon name="info-circle" size="16px" />
      <span v-if="isLevel1">设置零售价和给下级的拿货价（必填），下级销售您可获得差价利润</span>
      <span v-else>设置零售价，客户预约时按此价格计算</span>
    </div>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="40px" />
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else-if="filteredList.length === 0">
      <t-icon name="file" size="48px" class="empty-icon" />
      <p>暂无商品</p>
    </div>

    <!-- 商品列表 -->
    <div class="price-list" v-else>
      <div class="price-item" v-for="item in filteredList" :key="item.productId">
        <div class="item-header">
          <img :src="getProductImageUrl(item.productImage)" class="item-image" />
          <div class="item-info">
            <div class="item-name">{{ item.productName }}</div>
            <div class="item-prices">
              <span class="price-tag cost">拿货价: {{ formatPrice(item.myCostPrice) }}</span>
              <span class="price-tag suggest">建议: {{ formatPrice(item.suggestedPrice) }}</span>
            </div>
          </div>
        </div>

        <!-- 非编辑模式 -->
        <div class="item-body" v-if="!item.editing">
          <div class="price-row">
            <span class="price-label">我的零售价</span>
            <span class="price-value" :class="{ empty: item.retailPrice === null }">
              {{ formatPrice(item.retailPrice) }}
            </span>
          </div>
          <div class="price-row" v-if="isLevel1">
            <span class="price-label">给下级的价</span>
            <span class="price-value" :class="{ empty: item.subPrice === null }">
              {{ formatPrice(item.subPrice) }}
            </span>
          </div>
          <div class="item-actions">
            <t-button size="small" theme="primary" variant="outline" @click="startEdit(item)">
              编辑定价
            </t-button>
          </div>
        </div>

        <!-- 编辑模式 -->
        <div class="item-body editing" v-else>
          <div class="input-row">
            <label>零售价</label>
            <input
              v-model.number="item.retailPrice"
              type="number"
              placeholder="输入零售价"
              class="price-input"
            />
            <t-button size="small" variant="text" @click="useSuggestedPrice(item)">
              使用建议价
            </t-button>
          </div>
          <div class="input-row" v-if="isLevel1">
            <label>给下级的价<span class="required">*</span></label>
            <input
              v-model.number="item.subPrice"
              type="number"
              placeholder="必填，否则下级无法销售"
              class="price-input required-input"
            />
          </div>
          <div class="edit-actions">
            <t-button size="small" variant="outline" @click="cancelEdit(item)">取消</t-button>
            <t-button size="small" theme="primary" :loading="saving" @click="savePrice(item)">保存</t-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pricing-page {
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

.nav-back, .nav-action {
  width: 60px;
  height: 40px;
  display: flex;
  align-items: center;
}

.nav-action {
  justify-content: flex-end;
  font-size: 14px;
  color: #E53935;
}

.nav-title {
  font-size: 16px;
  font-weight: 500;
}

.search-bar {
  margin: 56px 12px 12px;
  background: #fff;
  border-radius: 8px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-icon {
  color: #999;
}

.search-input {
  flex: 1;
  height: 40px;
  border: none;
  outline: none;
  font-size: 14px;
}

.notice-card {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 12px 12px;
  padding: 12px 16px;
  background: #fff5f5;
  border: 1px solid #ffcdd2;
  border-radius: 8px;
  font-size: 13px;
  color: #c62828;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #999;
}

.empty-icon {
  color: #ccc;
  margin-bottom: 12px;
}

.price-list {
  padding: 0 12px;
}

.price-item {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
}

.item-header {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #f5f5f5;
}

.item-image {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  background: #f5f5f5;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-prices {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.price-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.price-tag.cost {
  background: #e3f2fd;
  color: #1565c0;
}

.price-tag.suggest {
  background: #fff3e0;
  color: #e65100;
}

.item-body {
  padding: 16px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.price-row:last-child {
  margin-bottom: 16px;
}

.price-label {
  font-size: 13px;
  color: #666;
}

.price-value {
  font-size: 16px;
  font-weight: 600;
  color: #E53935;
}

.price-value.empty {
  color: #ccc;
  font-weight: normal;
}

.item-actions {
  text-align: center;
}

.item-body.editing {
  background: #fafafa;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.input-row label {
  width: 80px;
  font-size: 13px;
  color: #666;
  flex-shrink: 0;
}

.price-input {
  flex: 1;
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 14px;
  outline: none;
}

.price-input:focus {
  border-color: #E53935;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

/* 【2026-01-20新增】必填标识样式 */
.required {
  color: #E53935;
  margin-left: 2px;
}

.required-input::placeholder {
  color: #E53935;
  opacity: 0.7;
}
</style>
