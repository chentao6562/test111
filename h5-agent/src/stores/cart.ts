import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get } from '../api'
import { useUserStore } from './user'

// 自动刷新定时器
let refreshTimer: number | null = null

// 访客购物车本地存储键
const GUEST_CART_KEY = 'h5_guest_cart'

// 购物车商品项
export interface CartItem {
  productId: number
  productName: string
  productImage: string
  price: number
  quantity: number
  stock: number
  canSell: boolean
  // 秒杀商品相关字段（可选）
  isFlashSale?: boolean
  flashSaleItemId?: number
}

export const useCartStore = defineStore('cart', () => {
  const count = ref(0)

  // 访客购物车（本地存储）
  const guestCartItems = ref<CartItem[]>([])

  // 加载访客购物车
  function loadGuestCart() {
    try {
      const str = localStorage.getItem(GUEST_CART_KEY)
      if (str) {
        guestCartItems.value = JSON.parse(str)
        count.value = guestCartItems.value.reduce((sum, item) => sum + item.quantity, 0)
      }
    } catch {
      guestCartItems.value = []
    }
  }

  // 保存访客购物车
  function saveGuestCart() {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestCartItems.value))
    count.value = guestCartItems.value.reduce((sum, item) => sum + item.quantity, 0)
  }

  // 添加商品到访客购物车
  // 【2026-01-23 BUG修复】按 (productId, isFlashSale) 联合去重，避免秒杀和正价互相覆盖
  function addToGuestCart(item: CartItem) {
    const existing = guestCartItems.value.find(i =>
      i.productId === item.productId &&
      Boolean(i.isFlashSale) === Boolean(item.isFlashSale)
    )
    if (existing) {
      existing.quantity += item.quantity
      existing.price = item.price // 更新价格
    } else {
      guestCartItems.value.push({ ...item })
    }
    saveGuestCart()
  }

  // 更新访客购物车商品数量
  // 【2026-01-23 BUG修复】支持区分秒杀和正价商品
  function updateGuestCartQuantity(productId: number, quantity: number, isFlashSale?: boolean) {
    const item = guestCartItems.value.find(i =>
      i.productId === productId &&
      Boolean(i.isFlashSale) === Boolean(isFlashSale)
    )
    if (item) {
      if (quantity <= 0) {
        removeFromGuestCart(productId, isFlashSale)
      } else {
        item.quantity = quantity
        saveGuestCart()
      }
    }
  }

  // 从访客购物车移除商品
  // 【2026-01-23 BUG修复】支持区分秒杀和正价商品
  function removeFromGuestCart(productId: number, isFlashSale?: boolean) {
    const index = guestCartItems.value.findIndex(i =>
      i.productId === productId &&
      Boolean(i.isFlashSale) === Boolean(isFlashSale)
    )
    if (index > -1) {
      guestCartItems.value.splice(index, 1)
      saveGuestCart()
    }
  }

  // 清空访客购物车
  function clearGuestCart() {
    guestCartItems.value = []
    localStorage.removeItem(GUEST_CART_KEY)
    count.value = 0
  }

  // 访客购物车总金额
  const guestCartTotal = computed(() => {
    return guestCartItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  })

  async function fetchCount() {
    const userStore = useUserStore()
    // 未登录或访客模式使用本地购物车
    if (!userStore.isLoggedIn || userStore.isGuestMode) {
      loadGuestCart()
      return
    }
    try {
      const res = await get<{ count: number }>('/cart/count')
      count.value = res.data.count
    } catch {
      count.value = 0
    }
  }

  function setCount(newCount: number) {
    count.value = newCount
  }

  function increment() {
    count.value++
  }

  function decrement() {
    if (count.value > 0) {
      count.value--
    }
  }

  // 启动自动刷新（每30秒）
  // 注意：只在登录状态下才真正轮询API，未登录时fetchCount内部会使用本地购物车
  function startAutoRefresh() {
    if (!refreshTimer) {
      refreshTimer = window.setInterval(fetchCount, 30000)
    }
  }

  // 停止自动刷新
  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  // 初始化时加载访客购物车
  loadGuestCart()

  return {
    count,
    fetchCount,
    setCount,
    increment,
    decrement,
    startAutoRefresh,
    stopAutoRefresh,
    // 访客购物车
    guestCartItems,
    guestCartTotal,
    loadGuestCart,
    addToGuestCart,
    updateGuestCartQuantity,
    removeFromGuestCart,
    clearGuestCart
  }
})
