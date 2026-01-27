<script setup lang="ts">
import { ref, onMounted, onActivated, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { get, put, del, post, getImageUrl } from '../api'
import { useCartStore } from '../stores/cart'
import { useUserStore } from '../stores/user'
import { multiply, add, subtract } from '../utils/decimal'

// 定义组件名称，用于keep-alive缓存
defineOptions({
  name: 'Cart'
})

const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()

// 访客模式相关
const isGuestMode = computed(() => userStore.isGuestMode)
// 【2026-01-19修复】扫码绑定的推销员ID
const salespersonId = computed(() => userStore.currentSalespersonId)

// 后端返回的购物车项格式（扁平结构）
interface CartItem {
  id: number
  productId: number
  quantity: number
  selected: boolean
  name: string
  image: string
  price: number
  originalPrice: number
  stock: number
  status: string
  unit: string
  specs: string | null
  // 【2026-01-23 BUG修复】支持区分秒杀和正价商品
  isFlashSale?: boolean
  // 【2026-01-26】特价商品标识
  isSpecialPrice?: boolean
}

const cartItems = ref<CartItem[]>([])
const loading = ref(true)
const isEditing = ref(false)

// 获取商品图片
const getProductImage = (item: CartItem) => {
  if (!item || !item.image) {
    return ''
  }
  return getImageUrl(item.image)
}

// 可用库存
const getAvailableStock = (item: CartItem) => {
  return item.stock || 0
}

// 是否全选
const isAllSelected = computed(() => {
  return cartItems.value.length > 0 && cartItems.value.every(item => item.selected)
})

// 已选商品
const selectedItems = computed(() => {
  return cartItems.value.filter(item => item.selected)
})

// 已选商品数量
const selectedCount = computed(() => {
  return selectedItems.value.reduce((sum, item) => sum + item.quantity, 0)
})

// 已选商品总价（使用精确计算）
const totalPrice = computed(() => {
  const prices = selectedItems.value.map(item =>
    multiply(item.price || 0, item.quantity)
  )
  return add(...prices)
})

// 优惠金额（示例）- 使用精确计算
const discountAmount = computed(() => {
  const discounts = selectedItems.value.map(item => {
    const original = multiply(item.originalPrice || item.price || 0, item.quantity)
    const actual = multiply(item.price || 0, item.quantity)
    return subtract(original, actual)
  })
  return add(...discounts)
})

// 【2026-01-26】是否包含特价商品
const hasSpecialPriceItems = computed(() => {
  return selectedItems.value.some(item => item.isSpecialPrice)
})

// 加载购物车
const loadCart = async () => {
  loading.value = true
  try {
    // 访客模式使用本地购物车
    if (isGuestMode.value) {
      cartItems.value = cartStore.guestCartItems.map((item, index) => ({
        id: index,
        productId: item.productId,
        quantity: item.quantity,
        selected: true, // 访客模式默认全选
        name: item.productName,
        image: item.productImage,
        price: item.price,
        originalPrice: item.price,
        stock: item.stock,
        status: 'ACTIVE',
        unit: '',
        specs: null,
        // 【2026-01-23 BUG修复】保留秒杀标记
        isFlashSale: item.isFlashSale
      }))
    } else {
      // 【2026-01-20修复】推销员自己浏览时不传s参数，获取拿货价
      // 只有访客模式（扫码访问其他推销员的链接）才传s参数获取零售价
      const params: any = {}
      if (salespersonId.value && !userStore.isSelfBrowsing) {
        params.s = salespersonId.value
      }
      const res = await get<{ list: CartItem[], summary: any }>('/cart', params)
      cartItems.value = res.data?.list || []
      // 【BUG修复】统计商品总数量，而非购物车项目数
      const totalQuantity = cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
      cartStore.setCount(totalQuantity)
    }
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
  } finally {
    loading.value = false
  }
}

// 切换选中
const toggleSelect = async (item: CartItem) => {
  // 访客模式默认全选，不允许取消选中
  if (isGuestMode.value) {
    return
  }
  try {
    await put(`/cart/${item.id}`, { selected: !item.selected })
    item.selected = !item.selected
  } catch {}
}

// 全选/取消全选
const toggleSelectAll = async () => {
  // 访客模式默认全选
  if (isGuestMode.value) {
    return
  }
  const newValue = !isAllSelected.value
  try {
    await Promise.all(
      cartItems.value.map(item =>
        put(`/cart/${item.id}`, { selected: newValue })
      )
    )
    cartItems.value.forEach(item => item.selected = newValue)
  } catch {}
}

// 更新数量
// 【2026-01-19修复】数量减到0时自动删除商品
const updateQuantity = async (item: CartItem, quantity: number) => {
  const availableStock = getAvailableStock(item)

  // 数量减到0时，自动删除该商品
  if (quantity <= 0) {
    await deleteItem(item)
    return
  }

  if (quantity > availableStock) {
    quantity = availableStock
    Toast({ message: `最多可预约${availableStock}件`, theme: 'warning' })
  }

  try {
    // 访客模式使用本地购物车
    if (isGuestMode.value) {
      // 【2026-01-23 BUG修复】传递isFlashSale参数区分秒杀和正价
      cartStore.updateGuestCartQuantity(item.productId, quantity, item.isFlashSale)
      item.quantity = quantity
    } else {
      const oldQuantity = item.quantity
      await put(`/cart/${item.id}`, { quantity })
      item.quantity = quantity
      // 【BUG修复】更新购物车总数量
      const diff = quantity - oldQuantity
      cartStore.setCount(cartStore.count + diff)
    }
  } catch {}
}

// 删除单项
// 【2026-01-19修复】添加错误提示，避免删除失败时无反馈
const deleteItem = async (item: CartItem) => {
  try {
    // 访客模式使用本地购物车
    if (isGuestMode.value) {
      // 【2026-01-23 BUG修复】传递isFlashSale参数区分秒杀和正价
      cartStore.removeFromGuestCart(item.productId, item.isFlashSale)
      const index = cartItems.value.findIndex(i =>
        i.productId === item.productId &&
        Boolean(i.isFlashSale) === Boolean(item.isFlashSale)
      )
      if (index > -1) {
        cartItems.value.splice(index, 1)
      }
      Toast({ message: '已删除', theme: 'success' })
    } else {
      await del(`/cart/${item.id}`)
      const index = cartItems.value.findIndex(i => i.id === item.id)
      if (index > -1) {
        // 【BUG修复】删除时减少对应数量，而非减1
        cartStore.setCount(cartStore.count - item.quantity)
        cartItems.value.splice(index, 1)
      }
      Toast({ message: '已删除', theme: 'success' })
    }
  } catch (err: any) {
    Toast({ message: err.message || '删除失败，请重试', theme: 'error' })
  }
}

// 批量删除
// 【2026-01-19修复】添加错误提示，避免删除失败时无反馈
const deleteSelected = async () => {
  const ids = selectedItems.value.map(item => item.id)
  if (ids.length === 0) {
    Toast({ message: '请先选择商品', theme: 'warning' })
    return
  }

  try {
    // 访客模式使用本地购物车
    if (isGuestMode.value) {
      // 【2026-01-23 BUG修复】传递isFlashSale参数区分秒杀和正价
      selectedItems.value.forEach(item => {
        cartStore.removeFromGuestCart(item.productId, item.isFlashSale)
      })
      cartItems.value = cartItems.value.filter(item => !item.selected)
      Toast({ message: '删除成功', theme: 'success' })
      isEditing.value = false
    } else {
      // 【BUG修复】计算要删除的商品总数量
      const deleteQuantity = selectedItems.value.reduce((sum, item) => sum + item.quantity, 0)
      await post('/cart/batch-delete', { ids })
      cartItems.value = cartItems.value.filter(item => !ids.includes(item.id))
      cartStore.setCount(cartStore.count - deleteQuantity)
      Toast({ message: '删除成功', theme: 'success' })
      isEditing.value = false
    }
  } catch (err: any) {
    Toast({ message: err.message || '删除失败，请重试', theme: 'error' })
  }
}

// 去结算
const goCheckout = () => {
  if (selectedItems.value.length === 0) {
    Toast({ message: '请选择商品', theme: 'warning' })
    return
  }
  router.push('/checkout')
}

// 继续逛逛
const goShopping = () => {
  router.push('/')
}

// 查看商品详情
const goProductDetail = (productId: number) => {
  router.push(`/product/${productId}`)
}

onMounted(() => {
  loadCart()
})

// 页面激活时刷新数据（从其他页面返回时）
onActivated(() => {
  loadCart()
})
</script>

<template>
  <div class="cart-page">
    <!-- 顶部导航 -->
    <nav class="nav-bar">
      <div class="nav-placeholder"></div>
      <h2 class="nav-title">购物车 ({{ cartItems.length }})</h2>
      <div class="nav-edit" @click="isEditing = !isEditing">
        {{ isEditing ? '完成' : '管理' }}
      </div>
    </nav>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="40px" />
    </div>

    <!-- 空购物车 -->
    <div class="empty-cart" v-else-if="cartItems.length === 0">
      <span class="material-symbols-outlined empty-icon">shopping_cart</span>
      <p class="empty-title">购物车是空的</p>
      <p class="empty-subtitle">快去挑选心仪的商品吧</p>
      <button class="shop-btn" @click="goShopping">
        去选购
        <span class="material-symbols-outlined">arrow_forward</span>
      </button>
    </div>

    <template v-else>
      <!-- 【2026-01-22 卖点展示】信任背书横幅 -->
      <div class="trust-banner">
        <div class="trust-item">
          <span class="trust-icon">🛡️</span>
          <span>免费预约 零风险</span>
        </div>
        <span class="trust-divider">|</span>
        <div class="trust-item">
          <span class="trust-icon">🎁</span>
          <span>满额送好礼</span>
        </div>
        <span class="trust-divider">|</span>
        <div class="trust-item">
          <span class="trust-icon">📦</span>
          <span>门店自提</span>
        </div>
      </div>

      <!-- 促销横幅 -->
      <div class="promo-banner">
        <div class="promo-icon">
          <span class="material-symbols-outlined">celebration</span>
        </div>
        <div class="promo-content">
          <p class="promo-title">新春特惠</p>
          <p class="promo-subtitle">全场商品享代理专属价</p>
        </div>
        <span class="material-symbols-outlined promo-arrow">chevron_right</span>
      </div>

      <!-- 购物车列表 -->
      <div class="cart-list">
        <!-- 店铺分组 -->
        <div class="store-group">
          <div class="store-header">
            <span class="material-symbols-outlined store-icon">storefront</span>
            <span class="store-name">蒙庆烟花专营</span>
          </div>

          <!-- 商品列表 -->
          <div
            class="cart-item"
            v-for="item in cartItems"
            :key="item.id"
          >
            <!-- 选择框 -->
            <div class="item-checkbox" @click="toggleSelect(item)">
              <div :class="['checkbox', { checked: item.selected }]">
                <span class="material-symbols-outlined" v-if="item.selected">check</span>
              </div>
            </div>

            <!-- 商品图片 -->
            <div class="item-image" @click="goProductDetail(item.productId)">
              <img :src="getProductImage(item)" :alt="item.name" />
            </div>

            <!-- 商品信息 -->
            <div class="item-content">
              <h4 class="item-name" @click="goProductDetail(item.productId)">
                {{ item.name || '商品信息缺失' }}
              </h4>
              <div class="item-tags">
                <span class="item-tag special-price-tag" v-if="item.isSpecialPrice">特价</span>
                <span class="item-tag" v-if="item.specs">{{ item.specs }}</span>
                <span class="item-tag" v-if="item.unit">{{ item.unit }}</span>
              </div>
              <div class="item-footer">
                <div class="item-price">
                  <span class="price-symbol">¥</span>
                  <span class="price-value">{{ (item.price || 0).toFixed(2) }}</span>
                </div>
                <div class="quantity-stepper">
                  <button
                    class="stepper-btn"
                    @click="updateQuantity(item, item.quantity - 1)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                  <span class="stepper-value">{{ item.quantity }}</span>
                  <button
                    class="stepper-btn"
                    @click="updateQuantity(item, item.quantity + 1)"
                    :disabled="item.quantity >= getAvailableStock(item)"
                  >
                    <span class="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 删除按钮(编辑模式) -->
            <div class="item-delete" v-if="isEditing" @click="deleteItem(item)">
              <span class="material-symbols-outlined">delete</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <footer class="bottom-bar">
        <div class="bar-content">
          <!-- 全选 -->
          <div class="select-all" @click="toggleSelectAll">
            <div :class="['checkbox', { checked: isAllSelected }]">
              <span class="material-symbols-outlined" v-if="isAllSelected">check</span>
            </div>
            <span class="select-text">全选</span>
          </div>

          <!-- 正常模式 -->
          <template v-if="!isEditing">
            <div class="total-section">
              <div class="total-line">
                <span class="total-label">合计:</span>
                <span class="total-price">
                  <span class="price-symbol">¥</span>
                  <span class="price-value">{{ (totalPrice || 0).toFixed(2) }}</span>
                </span>
              </div>
              <div class="discount-line" v-if="discountAmount > 0">
                <span>已优惠 ¥{{ discountAmount.toFixed(2) }}</span>
              </div>
              <div class="special-price-notice" v-if="hasSpecialPriceItems">
                <span class="material-symbols-outlined">info</span>
                含特价商品，不参与秒杀/拼团/赠品
              </div>
            </div>
            <button
              class="checkout-btn"
              :class="{ disabled: selectedItems.length === 0 }"
              @click="goCheckout"
            >
              去预约 ({{ selectedCount }})
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          </template>

          <!-- 编辑模式 -->
          <template v-else>
            <div class="edit-actions">
              <button
                class="delete-btn"
                :class="{ disabled: selectedItems.length === 0 }"
                @click="deleteSelected"
              >
                <span class="material-symbols-outlined">delete</span>
                删除 ({{ selectedItems.length }})
              </button>
            </div>
          </template>
        </div>
      </footer>
    </template>
  </div>
</template>

<style scoped>
/* Material Symbols */
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

.cart-page {
  min-height: 100vh;
  background: var(--bg-page, #FDF6F7);
  padding-bottom: 100px;
}

/* 顶部导航 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.nav-placeholder {
  width: 48px;
}

.nav-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary, #181111);
  letter-spacing: -0.02em;
}

.nav-edit {
  font-size: 14px;
  font-weight: 500;
  color: var(--primary, #EF062D);
  padding: 4px 12px;
  cursor: pointer;
}

/* 加载中 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

/* 空购物车 */
.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 80px;
  color: #ddd;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #181111);
  margin-bottom: 8px;
}

.empty-subtitle {
  font-size: 14px;
  color: var(--text-secondary, #666);
  margin-bottom: 24px;
}

.shop-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #EF062D 0%, #FF4D6D 100%);
  color: #fff;
  border: none;
  border-radius: 9999px;
  padding: 12px 32px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(233, 12, 31, 0.3);
}

.shop-btn .material-symbols-outlined {
  font-size: 18px;
}

/* 促销横幅 */
.promo-banner {
  margin: 16px;
  background: linear-gradient(135deg, #FDFCF0 0%, #F5E6AD 100%);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(225, 177, 44, 0.2);
}

.promo-icon {
  width: 36px;
  height: 36px;
  background: var(--gold, #E1B12C);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.promo-icon .material-symbols-outlined {
  color: #fff;
  font-size: 20px;
}

.promo-content {
  flex: 1;
}

.promo-title {
  font-size: 14px;
  font-weight: 700;
  color: #846414;
}

.promo-subtitle {
  font-size: 12px;
  color: rgba(132, 100, 20, 0.7);
  margin-top: 2px;
}

.promo-arrow {
  color: var(--gold, #E1B12C);
}

/* 购物车列表 */
.cart-list {
  padding: 0 16px 16px;
}

/* 店铺分组 */
.store-group {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.store-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.store-icon {
  font-size: 20px;
  color: var(--primary, #EF062D);
}

.store-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #181111);
}

/* 商品项 */
.cart-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
}

.cart-item:last-child {
  border-bottom: none;
}

/* 选择框 */
.item-checkbox {
  padding-top: 24px;
}

.checkbox {
  width: 22px;
  height: 22px;
  border: 2px solid #ddd;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  cursor: pointer;
}

.checkbox.checked {
  background: var(--primary, #EF062D);
  border-color: var(--primary, #EF062D);
}

.checkbox .material-symbols-outlined {
  font-size: 14px;
  color: #fff;
  font-variation-settings: 'wght' 600;
}

/* 商品图片 */
.item-image {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f5f5f5;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 商品内容 */
.item-content {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #181111);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
  cursor: pointer;
}

.item-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.item-tag {
  font-size: 11px;
  color: var(--text-secondary, #666);
  background: #f5f5f5;
  padding: 3px 8px;
  border-radius: 4px;
}

/* 【2026-01-26】特价商品标签 */
.item-tag.special-price-tag {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  color: #fff;
  font-weight: 500;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-price {
  color: var(--primary, #EF062D);
  font-weight: 700;
}

.price-symbol {
  font-size: 12px;
}

.price-value {
  font-size: 16px;
  letter-spacing: -0.02em;
}

/* 数量步进器 */
.quantity-stepper {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 2px;
}

.stepper-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: #fff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-primary, #181111);
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stepper-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.stepper-btn:not(:disabled):active {
  background: rgba(0, 0, 0, 0.1);
}

.stepper-btn .material-symbols-outlined {
  font-size: 18px;
}

.stepper-value {
  min-width: 32px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #181111);
}

/* 删除按钮 - 编辑模式下突出显示 */
.item-delete {
  padding: 8px;
  cursor: pointer;
  background: #fee2e2;
  border-radius: 10px;
  margin-top: 20px;
  transition: all 0.2s;
}

.item-delete .material-symbols-outlined {
  font-size: 22px;
  color: var(--primary, #EF062D);
  transition: transform 0.2s;
}

.item-delete:active {
  background: #fecaca;
  transform: scale(0.95);
}

.item-delete:active .material-symbols-outlined {
  transform: scale(1.1);
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 50px;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  z-index: 100;
}

.bar-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 全选 */
.select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.select-text {
  font-size: 14px;
  color: var(--text-secondary, #666);
}

/* 合计 */
.total-section {
  flex: 1;
  text-align: right;
}

.total-line {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 4px;
}

.total-label {
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.total-price {
  color: var(--primary, #EF062D);
  font-weight: 800;
}

.total-price .price-symbol {
  font-size: 12px;
}

.total-price .price-value {
  font-size: 20px;
  letter-spacing: -0.02em;
}

.discount-line {
  font-size: 11px;
  color: var(--gold, #E1B12C);
  margin-top: 2px;
}

/* 【2026-01-26】特价商品提示 */
.special-price-notice {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #ff6b6b;
  margin-top: 2px;
}

.special-price-notice .material-symbols-outlined {
  font-size: 14px;
}

/* 结算按钮 */
.checkout-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, #EF062D 0%, #FF4D6D 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(233, 12, 31, 0.3);
  transition: all 0.2s;
}

.checkout-btn:active {
  transform: scale(0.98);
}

.checkout-btn.disabled {
  background: #ddd;
  color: #999;
  box-shadow: none;
  cursor: not-allowed;
}

.checkout-btn .material-symbols-outlined {
  font-size: 18px;
}

/* 编辑模式 */
.edit-actions {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.delete-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  color: var(--primary, #EF062D);
  border: 1px solid var(--primary, #EF062D);
  border-radius: 12px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-btn:active {
  background: rgba(233, 12, 31, 0.05);
}

.delete-btn.disabled {
  border-color: #ddd;
  color: #999;
  cursor: not-allowed;
}

.delete-btn .material-symbols-outlined {
  font-size: 18px;
}

/* ========== 【2026-01-22】信任背书横幅 ========== */
.trust-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 12px 16px 0;
  padding: 12px 16px;
  background: linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 100%);
  border-radius: 10px;
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.trust-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #2E7D32;
}

.trust-icon {
  font-size: 14px;
}

.trust-divider {
  font-size: 12px;
  color: rgba(76, 175, 80, 0.4);
}
</style>
