<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import { get, post, getImageUrl } from '../api'
import { multiply, add } from '../utils/decimal'
import { getDisplayPrice } from '../utils/priceUtils'
import { useCartStore } from '../stores/cart'
import { useUserStore } from '../stores/user'
import { getRegionTree, convertToRegionOptions, getRegionFullName, type Region, type RegionCascaderOption } from '../api/region'
import { getNearbyGroupBuys, type NearbyGroupBuyItem } from '../api/groupBuy'

const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()

// 访客模式相关
const isGuestMode = computed(() => userStore.isGuestMode)
const salespersonId = computed(() => userStore.currentSalespersonId)

// 【2026-01-26】特价商品检测
const hasSpecialPriceItems = ref(false)

interface CartItem {
  id: number
  productId: number
  quantity: number
  // 【2026-01-29修复】添加砍价商品字段
  isBargainItem?: boolean
  bargainId?: number | null
  bargainCode?: string | null
  bargainPrice?: number | null
  product: {
    id: number
    name: string
    images: string[]
    agentPrice: number
  }
}

// 【2026-01-20 秒杀系统】秒杀相关类型
interface FlashSaleItem {
  id: number
  flashSaleItemId: number
  productId: number
  productName: string
  productImage: string | null
  flashPrice: number
  originalPrice: number
  flashStock: number
  soldCount: number
  limitPerUser: number
  remainingStock: number
}

interface FlashSaleActivity {
  id: number
  name: string
  minOrderAmount: number
  startTime: string
  endTime: string
  bannerImage?: string
}

// 秒杀活动数据
const flashSaleActivity = ref<FlashSaleActivity | null>(null)
const flashSaleItems = ref<FlashSaleItem[]>([])
const selectedFlashItems = ref<Map<number, number>>(new Map()) // flashSaleItemId -> quantity

const cartItems = ref<CartItem[]>([])
const loading = ref(true)
const submitting = ref(false)
const remark = ref('')

// 【2026-01-22 营销优化】周进度奖励提醒
interface WeeklyProgress {
  completedOrders: number
  completedAmount: number
  salesReward: number
}
const weeklyProgress = ref<WeeklyProgress | null>(null)

// 联系人信息
const contactName = ref('')
const contactPhone = ref('')

// 预计提货日期
const pickupDate = ref('')
const minDate = ref('')
const maxDate = ref('')

// 【2026-01-21 顺路拼团】区域选择相关
const regionOptions = ref<RegionCascaderOption[]>([])
const regionTree = ref<Region[]>([])
const selectedRegion = ref<number[]>([]) // [区县ID, 乡镇ID]
const showRegionPicker = ref(false)
const nearbyGroupBuys = ref<NearbyGroupBuyItem[]>([])
const loadingNearby = ref(false)

// 获取选中的区域ID（乡镇/街道级）
const selectedRegionId = computed(() => {
  if (selectedRegion.value.length === 2) {
    // 【2026-01-26修复】确保返回数字类型
    const id = selectedRegion.value[1]
    return typeof id === 'string' ? parseInt(id, 10) : id
  }
  return null
})

// 获取选中的区域名称（用于显示）
const selectedRegionName = computed(() => {
  console.log('[Checkout] Computing regionName, id:', selectedRegionId.value, 'treeLen:', regionTree.value.length)
  if (selectedRegionId.value && regionTree.value.length > 0) {
    const name = getRegionFullName(selectedRegionId.value, regionTree.value)
    console.log('[Checkout] Got regionName:', name)
    return name
  }
  return ''
})

// 初始化日期选择范围
const initDateRange = () => {
  const today = new Date()
  // 最小日期：明天
  const min = new Date(today)
  min.setDate(min.getDate() + 1)
  minDate.value = formatDateForPicker(min)
  // 最大日期：7天后
  const max = new Date(today)
  max.setDate(max.getDate() + 7)
  maxDate.value = formatDateForPicker(max)
}

// 【2026-01-21 顺路拼团】加载区域数据
const loadRegionData = async () => {
  try {
    const res = await getRegionTree()
    if (res.data) {
      regionTree.value = res.data
      regionOptions.value = convertToRegionOptions(res.data)
    }
  } catch (err) {
    console.error('加载区域数据失败:', err)
  }
}

// 【2026-01-25修复】区域选择事件 - 使用pick事件，选择第二级时自动关闭
const onRegionPick = (context: { value: string | number; label: string; index: number; level: number }) => {
  console.log('Region pick:', context.value, 'level:', context.level)
  // level=0 是第一级（区县），level=1 是第二级（乡镇/街道）
  // 选择完第二级后自动关闭弹窗
  if (context.level === 1) {
    // 延迟关闭，让用户看到选择效果
    setTimeout(() => {
      showRegionPicker.value = false
    }, 200)
  }
}

// 【2026-01-26修复】区域选择变更事件 - 确保选择后正确触发相关操作
const onRegionChange = (value: number[]) => {
  console.log('Region change:', value, 'regionTree length:', regionTree.value.length)
  // 选择完成后加载附近拼团
  if (value.length === 2 && pickupDate.value) {
    loadNearbyGroupBuys()
  }
}

// 清除区域选择
const clearRegion = () => {
  selectedRegion.value = []
  nearbyGroupBuys.value = []
}

// 【2026-01-21 顺路拼团】加载附近拼团
const loadNearbyGroupBuys = async () => {
  if (!selectedRegionId.value || !pickupDate.value) {
    nearbyGroupBuys.value = []
    return
  }
  loadingNearby.value = true
  try {
    const list = await getNearbyGroupBuys(selectedRegionId.value, pickupDate.value)
    nearbyGroupBuys.value = list
  } catch (err) {
    console.error('加载附近拼团失败:', err)
  } finally {
    loadingNearby.value = false
  }
}

// 【2026-01-21 顺路拼团】查看拼团详情
const viewGroupBuy = (code: string) => {
  router.push(`/group-buy/${code}`)
}

// 【2026-01-21 顺路拼团】格式化拼团剩余时间
const formatGroupBuyExpire = (expireAt: string): string => {
  const expire = new Date(expireAt).getTime()
  const now = Date.now()
  const diff = expire - now
  if (diff <= 0) return '即将过期'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours > 24) {
    return `剩${Math.floor(hours / 24)}天`
  }
  return `剩${hours}小时`
}

// 格式化日期为 YYYY-MM-DD
const formatDateForPicker = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 格式化显示日期
const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekDay = weekDays[date.getDay()]
  return `${month}月${day}日 ${weekDay}`
}

// 正价商品总价（用于判断秒杀门槛）- 使用精确计算
// 【2026-01-26】使用统一价格工具函数
const normalOrderAmount = computed(() => {
  const prices = cartItems.value.map(item =>
    multiply(getDisplayPrice(item.product), item.quantity)
  )
  return add(...prices)
})

// 【2026-01-20 秒杀系统】秒杀商品总价
const flashSaleTotalAmount = computed(() => {
  let total = 0
  selectedFlashItems.value.forEach((qty, itemId) => {
    const item = flashSaleItems.value.find(f => f.flashSaleItemId === itemId)
    if (item) {
      total = add(total, multiply(item.flashPrice, qty))
    }
  })
  return total
})

// 预约总价（正价 + 秒杀）
const totalPrice = computed(() => {
  return add(normalOrderAmount.value, flashSaleTotalAmount.value)
})

// 商品数量（正价商品）
const totalQuantity = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
})

// 【2026-01-20 秒杀系统】是否满足秒杀门槛
const canAddFlashSale = computed(() => {
  if (!flashSaleActivity.value) return false
  return normalOrderAmount.value >= flashSaleActivity.value.minOrderAmount
})

// 距离门槛的差额
const flashSaleShortfall = computed(() => {
  if (!flashSaleActivity.value) return 0
  const diff = flashSaleActivity.value.minOrderAmount - normalOrderAmount.value
  return diff > 0 ? diff : 0
})

// 获取商品图片
const getProductImage = (product: any) => {
  if (!product || !product.images) return ''
  try {
    if (Array.isArray(product.images)) {
      return product.images[0] ? getImageUrl(product.images[0]) : ''
    }
    if (typeof product.images === 'string') {
      if (product.images.startsWith('[')) {
        const images = JSON.parse(product.images)
        return images[0] ? getImageUrl(images[0]) : ''
      }
      if (product.images.includes(',')) {
        const firstImage = product.images.split(',')[0].trim()
        return firstImage ? getImageUrl(firstImage) : ''
      }
      return getImageUrl(product.images)
    }
    return ''
  } catch {
    if (typeof product.images === 'string') {
      const firstImage = product.images.split(',')[0].trim()
      return firstImage ? getImageUrl(firstImage) : ''
    }
    return ''
  }
}

// 【2026-01-20 秒杀系统】加载秒杀活动
const loadFlashSaleActivity = async () => {
  try {
    const res = await get<{
      hasActivity: boolean
      activity?: FlashSaleActivity
      items: FlashSaleItem[]
    }>('/h5/flash-sale/current')

    if (res.data?.hasActivity && res.data.activity) {
      flashSaleActivity.value = res.data.activity
      flashSaleItems.value = res.data.items || []
    }
  } catch (err) {
    console.error('加载秒杀活动失败:', err)
  }
}

// 【2026-01-20 秒杀系统】增加秒杀商品数量
const addFlashItem = (item: FlashSaleItem) => {
  if (!canAddFlashSale.value) {
    Toast({ message: `正价商品满¥${flashSaleActivity.value?.minOrderAmount}才能加购`, theme: 'warning' })
    return
  }

  const currentQty = selectedFlashItems.value.get(item.flashSaleItemId) || 0

  // 检查限购
  if (item.limitPerUser > 0 && currentQty >= item.limitPerUser) {
    Toast({ message: `该商品限购${item.limitPerUser}件`, theme: 'warning' })
    return
  }

  // 检查库存
  if (currentQty >= item.remainingStock) {
    Toast({ message: '库存不足', theme: 'warning' })
    return
  }

  selectedFlashItems.value.set(item.flashSaleItemId, currentQty + 1)
}

// 【2026-01-20 秒杀系统】减少秒杀商品数量
const reduceFlashItem = (item: FlashSaleItem) => {
  const currentQty = selectedFlashItems.value.get(item.flashSaleItemId) || 0
  if (currentQty <= 0) return

  if (currentQty === 1) {
    selectedFlashItems.value.delete(item.flashSaleItemId)
  } else {
    selectedFlashItems.value.set(item.flashSaleItemId, currentQty - 1)
  }
}

// 【2026-01-20 秒杀系统】获取秒杀商品已选数量
const getFlashItemQty = (itemId: number) => {
  return selectedFlashItems.value.get(itemId) || 0
}

// 【2026-01-20 秒杀系统】监听正价商品金额变化，不满足门槛时清空秒杀选择
watch(normalOrderAmount, (newVal) => {
  if (flashSaleActivity.value && newVal < flashSaleActivity.value.minOrderAmount) {
    if (selectedFlashItems.value.size > 0) {
      selectedFlashItems.value.clear()
      Toast({ message: '正价商品不足门槛，已清空秒杀商品', theme: 'warning' })
    }
  }
})

// 加载已选商品
const loadSelectedItems = async () => {
  loading.value = true
  try {
    // 访客模式使用本地购物车
    if (isGuestMode.value) {
      const guestItems = cartStore.guestCartItems
      cartItems.value = guestItems.map((item, index) => ({
        id: index,
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: item.productId,
          name: item.productName,
          images: item.productImage ? [item.productImage] : [],
          agentPrice: item.price
        }
      }))
      // 【2026-01-26】检查访客购物车是否有特价商品
      hasSpecialPriceItems.value = guestItems.some(item => (item as any).isSpecialPrice)

      if (cartItems.value.length === 0) {
        Toast({ message: '请先选择商品', theme: 'warning' })
        // 【2026-01-28修复】购物车为空时跳转到首页，避免back()返回错误页面
        router.replace('/')
        return
      }
    } else {
      // 【2026-01-20修复】推销员自己结算时不传s参数，获取拿货价
      // 只有访客模式（扫码访问其他推销员的链接）才传s参数获取零售价
      const params: any = { selected: true }
      if (salespersonId.value && !userStore.isSelfBrowsing) {
        params.s = salespersonId.value
      }
      // 【2026-01-26】获取购物车原始数据（selected=true时返回数组格式）
      const cartRes = await get<any>('/cart', params)
      const rawItems = Array.isArray(cartRes.data) ? cartRes.data : (cartRes.data?.list || [])
      hasSpecialPriceItems.value = rawItems.some((item: any) => item.isSpecialPrice)

      // 转换为 CartItem 格式（selected=true时返回的数据已经包含product嵌套结构）
      // 【2026-01-29修复】保留砍价商品信息
      cartItems.value = rawItems.filter((item: any) => item.quantity > 0).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        // 【2026-01-29修复】砍价商品字段
        isBargainItem: item.isBargainItem || false,
        bargainId: item.bargainId || null,
        bargainCode: item.bargainCode || null,
        bargainPrice: item.bargainPrice || null,
        product: item.product || {
          id: item.productId,
          name: item.name,
          images: item.image ? [item.image] : [],
          agentPrice: item.price
        }
      }))

      if (cartItems.value.length === 0) {
        Toast({ message: '请先选择商品', theme: 'warning' })
        // 【2026-01-28修复】购物车为空时跳转到首页，避免back()返回错误页面
        router.replace('/')
        return
      }
    }

    // 【2026-01-20 秒杀系统】加载秒杀活动（特价商品不显示秒杀区）
    if (!hasSpecialPriceItems.value) {
      await loadFlashSaleActivity()
    }
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
    router.back()
  } finally {
    loading.value = false
  }
}

// 提交预约
const submitReservation = async () => {
  if (cartItems.value.length === 0) {
    Toast({ message: '请先选择商品', theme: 'warning' })
    return
  }

  const name = contactName.value?.trim() || ''
  const phone = contactPhone.value?.trim() || ''

  if (!name) {
    Toast({ message: '请填写联系人姓名', theme: 'warning' })
    return
  }

  if (!phone) {
    Toast({ message: '请填写手机号码', theme: 'warning' })
    return
  }

  if (!/^1[3-9]\d{9}$/.test(phone)) {
    Toast({ message: '请填写有效的手机号码（11位）', theme: 'warning' })
    return
  }

  if (!pickupDate.value) {
    Toast({ message: '请选择预计提货日期', theme: 'warning' })
    return
  }

  submitting.value = true
  try {
    // 【2026-01-29修复】提取砍价商品，构建 bargainItems 数组
    const bargainItems: Array<{ bargainCode: string }> = cartItems.value
      .filter(item => item.isBargainItem && item.bargainCode)
      .map(item => ({ bargainCode: item.bargainCode! }))

    // 【2026-01-29修复】普通商品（排除砍价商品）
    const items = cartItems.value
      .filter(item => !item.isBargainItem)
      .map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }))

    // 【2026-01-20 秒杀系统】构建秒杀商品列表
    const flashItems: Array<{ flashSaleItemId: number; quantity: number }> = []
    selectedFlashItems.value.forEach((qty, itemId) => {
      if (qty > 0) {
        flashItems.push({ flashSaleItemId: itemId, quantity: qty })
      }
    })

    let resData: { id?: number; reservationId?: number; reservationNo: string }

    // 访客模式使用shop API
    if (isGuestMode.value && salespersonId.value) {
      const res = await post<{ id: number; reservationNo: string }>('/shop/reservations', {
        items: items.length > 0 ? items : undefined,  // 【2026-01-29修复】可能没有普通商品
        bargainItems: bargainItems.length > 0 ? bargainItems : undefined,  // 【2026-01-29修复】砍价商品
        flashSaleItems: flashItems.length > 0 ? flashItems : undefined,  // 【2026-01-20】秒杀商品
        customerName: name,
        customerPhone: phone,
        pickupDate: pickupDate.value,
        salespersonId: salespersonId.value,
        remark: remark.value?.trim() || undefined,
        regionId: selectedRegionId.value || undefined,  // 【2026-01-21 顺路拼团】区域ID
        regionName: selectedRegionName.value || undefined  // 区域名称
      })
      resData = res.data

      // 清空访客购物车
      cartStore.clearGuestCart()
    } else {
      const res = await post<{ id: number; reservationNo: string }>('/reservations', {
        items: items.length > 0 ? items : undefined,  // 【2026-01-29修复】可能没有普通商品
        bargainItems: bargainItems.length > 0 ? bargainItems : undefined,  // 【2026-01-29修复】砍价商品
        flashSaleItems: flashItems.length > 0 ? flashItems : undefined,  // 【2026-01-20】秒杀商品
        customerName: name,
        customerPhone: phone,
        pickupDate: pickupDate.value,
        storeId: 1,  // 系统目前只有一个门店
        remark: remark.value?.trim() || undefined,
        salespersonId: salespersonId.value || undefined,  // 【2026-01-19修复】传递扫码绑定的推销员ID
        regionId: selectedRegionId.value || undefined,  // 【2026-01-21 顺路拼团】区域ID
        regionName: selectedRegionName.value || undefined  // 区域名称
      })
      resData = res.data

      try {
        const ids = cartItems.value.map(i => i.id)
        if (ids.length > 0) {
          await post('/cart/batch-delete', { ids })
        }
      } catch {}

      cartStore.fetchCount()
    }

    Dialog.confirm({
      title: '预约成功',
      content: `预约号: ${resData.reservationNo}\n门店将在30分钟内电话确认\n请保持电话畅通`,
      confirmBtn: isGuestMode.value ? '返回首页' : '查看预约',
      cancelBtn: '继续浏览',
      onConfirm: () => {
        if (isGuestMode.value) {
          router.replace('/')
        } else {
          // 【2026-01-19修复】兼容两种返回格式：id 或 reservationId
          const reservationId = resData.id || resData.reservationId
          router.replace(`/reservations/${reservationId}`)
        }
      },
      onCancel: () => {
        router.replace('/')
      }
    })
  } catch (err: any) {
    Toast({ message: err.message || '预约失败', theme: 'error' })
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  router.back()
}

// 【2026-01-21 顺路拼团】监听提货日期变化，自动加载附近拼团
watch(pickupDate, (newDate) => {
  if (newDate && selectedRegionId.value) {
    loadNearbyGroupBuys()
  }
})

// 【2026-01-22 营销优化】加载周进度
const loadWeeklyProgress = async () => {
  if (!userStore.isLoggedIn || isGuestMode.value) return
  try {
    const res = await get<WeeklyProgress>('/weekly/progress')
    if (res.code === 0) {
      weeklyProgress.value = res.data
    }
  } catch (err) {
    // 静默失败
  }
}

// 【2026-01-22 营销优化】计算周销售奖励提示
const weeklyRewardTip = computed(() => {
  if (!weeklyProgress.value || isGuestMode.value) return null
  const orders = weeklyProgress.value.completedOrders
  // 判断距离下一个奖励门槛
  if (orders < 3) {
    return { current: orders, target: 3, reward: 30, remaining: 3 - orders }
  } else if (orders < 5) {
    return { current: orders, target: 5, reward: 80, remaining: 5 - orders }
  } else if (orders < 10) {
    return { current: orders, target: 10, reward: 200, remaining: 10 - orders }
  }
  return null // 已达最高档
})

// 【2026-01-22 卖点展示】计算当前可获得的赠品
const eligibleGift = computed(() => {
  const amount = totalPrice.value
  // 赠品档位（从高到低判断）
  if (amount >= 1000) {
    return { name: '超级棒棒糖1个', threshold: 1000 }
  } else if (amount >= 600) {
    return { name: '迷你加特林1个', threshold: 600 }
  } else if (amount >= 400) {
    return { name: '精彩四变色1盒', threshold: 400 }
  } else if (amount >= 200) {
    return { name: '18寸仙女棒1盒', threshold: 200 }
  }
  return null
})

onMounted(() => {
  initDateRange()
  loadSelectedItems()
  loadRegionData()  // 【2026-01-21 顺路拼团】加载区域数据
  loadWeeklyProgress()  // 【2026-01-22 营销优化】加载周进度
})
</script>

<template>
  <div class="checkout-page">
    <!-- 顶部导航 -->
    <nav class="nav-bar">
      <div class="nav-back" @click="goBack">
        <span class="material-symbols-outlined">arrow_back_ios_new</span>
      </div>
      <h2 class="nav-title">确认预约</h2>
      <div class="nav-placeholder"></div>
    </nav>

    <!-- 【2026-01-22 营销优化】周销售奖励提示（推销员登录时显示） -->
    <div class="weekly-reward-tip" v-if="!loading && weeklyRewardTip && !isGuestMode">
      <div class="reward-tip-icon">
        <span class="material-symbols-outlined">celebration</span>
      </div>
      <div class="reward-tip-content">
        <div class="reward-tip-text">
          本周已完成 <span class="highlight">{{ weeklyRewardTip.current }}</span> 单，
          再完成 <span class="highlight">{{ weeklyRewardTip.remaining }}</span> 单可获得
          <span class="reward-amount">¥{{ weeklyRewardTip.reward }}</span> 代金券奖励！
        </div>
        <div class="reward-tip-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: (weeklyRewardTip.current / weeklyRewardTip.target * 100) + '%' }"></div>
          </div>
          <span class="progress-text">{{ weeklyRewardTip.current }}/{{ weeklyRewardTip.target }}</span>
        </div>
      </div>
    </div>

    <!-- 【2026-01-22 卖点展示】预约流程说明 -->
    <div class="booking-flow-section" v-if="!loading">
      <div class="flow-title">预约流程</div>
      <div class="flow-steps">
        <div class="flow-step">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">提交预约</div>
            <div class="step-desc">免费，无需付款</div>
          </div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">
          <div class="step-num">2</div>
          <div class="step-content">
            <div class="step-title">电话确认</div>
            <div class="step-desc">30分钟内回电</div>
          </div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">
          <div class="step-num">3</div>
          <div class="step-content">
            <div class="step-title">到店提货</div>
            <div class="step-desc">付款+领赠品</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 【2026-01-22 卖点展示】赠品预览提示 - 【2026-01-26】特价商品不显示赠品 -->
    <div class="gift-preview-section" v-if="!loading && eligibleGift && !hasSpecialPriceItems">
      <div class="gift-preview-card">
        <div class="gift-icon">🎁</div>
        <div class="gift-info">
          <div class="gift-title">本单可获赠</div>
          <div class="gift-name">{{ eligibleGift.name }}</div>
        </div>
        <div class="gift-badge">预约专属</div>
      </div>
    </div>

    <!-- 预约说明 -->
    <div class="notice-section" v-if="!loading">
      <div class="notice-card">
        <div class="notice-header">
          <span class="material-symbols-outlined">info</span>
          <span class="notice-title">预约说明</span>
        </div>
        <div class="notice-content">
          <p class="notice-item">📞 提交后门店会电话联系您确认，请保持电话畅通</p>
          <p class="notice-item">⏰ 确认后请在7天内到店提货，届时可领取预约赠品</p>
          <p class="notice-item">⚠️ 仅限线上预约客户享受赠品，直接到店无赠品</p>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="40px" />
    </div>

    <main class="page-content" v-else>
      <!-- 联系人信息卡片 -->
      <section class="bento-card contact-card">
        <div class="contact-card-header">
          <div class="contact-icon-wrap">
            <span class="material-symbols-outlined">person</span>
          </div>
          <span class="contact-card-title">联系人信息</span>
          <span class="required-badge">必填</span>
        </div>
        <div class="contact-form">
          <div class="form-row">
            <label class="form-label">
              <span class="material-symbols-outlined label-icon">badge</span>
              姓名
            </label>
            <input
              v-model="contactName"
              class="form-input"
              placeholder="请输入您的姓名"
              maxlength="20"
            />
          </div>
          <div class="form-row">
            <label class="form-label">
              <span class="material-symbols-outlined label-icon">call</span>
              电话
            </label>
            <input
              v-model="contactPhone"
              class="form-input"
              placeholder="请输入手机号码"
              type="tel"
              maxlength="11"
            />
          </div>
        </div>
        <div class="contact-tip">
          <span class="material-symbols-outlined tip-icon">info</span>
          <span>到店提货时请出示手机号进行核验</span>
        </div>
      </section>

      <!-- 预计提货日期选择 -->
      <section class="bento-card pickup-date-card">
        <div class="date-card-inner">
          <div class="date-icon-wrap">
            <span class="material-symbols-outlined date-icon">calendar_month</span>
          </div>
          <div class="date-content">
            <div class="date-label">
              <span>预计提货日期</span>
              <span class="required-mark">*</span>
            </div>
            <label class="date-input-wrap">
              <input
                type="date"
                v-model="pickupDate"
                :min="minDate"
                :max="maxDate"
                class="date-input"
              />
              <div class="date-display">
                <span v-if="pickupDate" class="date-value">{{ formatDisplayDate(pickupDate) }}</span>
                <span v-else class="date-placeholder">请选择提货日期</span>
                <span class="material-symbols-outlined date-arrow">chevron_right</span>
              </div>
            </label>
          </div>
        </div>
        <p class="date-hint">请选择您计划到店提货的日期，方便我们提前备货</p>
        <p class="date-hint stock-notice">如部分商品库存售罄可能调换为同价位其他商家产品</p>
      </section>

      <!-- 【2026-01-21 顺路拼团】区域选择（选填） -->
      <section class="bento-card region-card" v-if="regionOptions.length > 0">
        <div class="region-card-inner" @click="showRegionPicker = true">
          <div class="region-icon-wrap">
            <span class="material-symbols-outlined region-icon">location_on</span>
          </div>
          <div class="region-content">
            <div class="region-label">
              <span>您的位置</span>
              <span class="optional-badge">选填</span>
            </div>
            <div class="region-display">
              <span v-if="selectedRegionName" class="region-value">{{ selectedRegionName }}</span>
              <span v-else class="region-placeholder">选择区域参与顺路拼团</span>
              <span class="material-symbols-outlined region-arrow">chevron_right</span>
            </div>
          </div>
          <button v-if="selectedRegionName" class="region-clear-btn" @click.stop="clearRegion">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <p class="region-hint">填写后可匹配同区域客户顺路拼团，一起到店提货</p>
      </section>

      <!-- 【2026-01-26修复】区域选择弹窗 - @pick自动关闭，@change触发数据加载 -->
      <t-cascader
        v-model="selectedRegion"
        v-model:visible="showRegionPicker"
        :options="regionOptions"
        :keys="{ value: 'value', label: 'label', children: 'children' }"
        title="选择区域"
        value-type="full"
        @pick="onRegionPick"
        @change="onRegionChange"
      />

      <!-- 【2026-01-21 顺路拼团】附近拼团列表 -->
      <section class="nearby-groups-section" v-if="selectedRegionName && pickupDate && (nearbyGroupBuys.length > 0 || loadingNearby)">
        <div class="section-header">
          <h3 class="section-title">
            <span class="material-symbols-outlined">diversity_3</span>
            附近正在拼团
          </h3>
          <span class="section-subtitle" v-if="!loadingNearby">{{ nearbyGroupBuys.length }}个拼团</span>
        </div>

        <!-- 加载中 -->
        <div class="nearby-loading" v-if="loadingNearby">
          <t-loading theme="circular" size="24px" />
          <span>查找附近拼团...</span>
        </div>

        <!-- 拼团列表 -->
        <div class="nearby-groups-list" v-else>
          <div
            v-for="group in nearbyGroupBuys"
            :key="group.id"
            class="nearby-group-card"
            @click="viewGroupBuy(group.code)"
          >
            <div class="group-card-header">
              <div class="group-initiator">
                <span class="material-symbols-outlined">person</span>
                {{ group.initiatorName }} 发起
              </div>
              <div class="group-expire">{{ formatGroupBuyExpire(group.expireAt) }}</div>
            </div>
            <div class="group-card-body">
              <div class="group-progress">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: `${(group.currentCount / group.requiredCount) * 100}%` }"></div>
                </div>
                <span class="progress-text">{{ group.currentCount }}/{{ group.requiredCount }}人</span>
              </div>
              <div class="group-gift" v-if="group.bonusGiftName">
                <span class="material-symbols-outlined">redeem</span>
                成团送：{{ group.bonusGiftName }}
              </div>
            </div>
            <div class="group-card-footer">
              <span class="group-store">{{ group.storeName }}</span>
              <span class="join-btn">去加入 →</span>
            </div>
          </div>
        </div>

        <p class="nearby-tip">预约确认后可加入上方拼团，一起到店享额外赠品</p>
      </section>

      <!-- 商品预览 -->
      <section class="products-section">
        <div class="section-header">
          <h3 class="section-title">预约商品</h3>
          <span class="section-count">共 {{ totalQuantity }} 件</span>
        </div>
        <div class="bento-card products-card">
          <div
            v-for="(item, index) in cartItems"
            :key="item.id"
            class="product-item"
            :class="{ 'has-border': index < cartItems.length - 1 }"
          >
            <div class="product-img-wrap">
              <img :src="getProductImage(item.product)" class="product-img" />
            </div>
            <div class="product-info">
              <div class="product-top">
                <h4 class="product-name">{{ item.product.name }}</h4>
              </div>
              <div class="product-bottom">
                <span class="product-price">¥{{ getDisplayPrice(item.product).toFixed(2) }}</span>
                <span class="product-quantity">x{{ item.quantity }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 【2026-01-20 秒杀系统】秒杀加购区 - 【2026-01-26】特价商品不显示秒杀 -->
      <section class="flash-sale-section" v-if="flashSaleActivity && flashSaleItems.length > 0 && !hasSpecialPriceItems">
        <div class="section-header">
          <div class="flash-title-wrap">
            <span class="flash-icon">⚡</span>
            <h3 class="section-title">限时秒杀加购</h3>
          </div>
          <span class="flash-threshold" v-if="canAddFlashSale">可加购</span>
          <span class="flash-threshold not-eligible" v-else>再买¥{{ flashSaleShortfall.toFixed(0) }}</span>
        </div>

        <!-- 未满足门槛提示 -->
        <div class="flash-threshold-tip" v-if="!canAddFlashSale">
          <span class="material-symbols-outlined tip-icon">info</span>
          <span>正价商品满¥{{ flashSaleActivity.minOrderAmount }}可加购秒杀商品</span>
        </div>

        <!-- 秒杀商品列表 -->
        <div class="bento-card flash-products-card" :class="{ disabled: !canAddFlashSale }">
          <div
            v-for="(item, index) in flashSaleItems"
            :key="item.flashSaleItemId"
            class="flash-product-item"
            :class="{ 'has-border': index < flashSaleItems.length - 1 }"
          >
            <div class="flash-product-img-wrap">
              <img :src="item.productImage ? getImageUrl(item.productImage) : ''" class="flash-product-img" />
              <span class="flash-badge">秒杀</span>
            </div>
            <div class="flash-product-info">
              <h4 class="flash-product-name">{{ item.productName }}</h4>
              <div class="flash-price-row">
                <span class="flash-price">¥{{ item.flashPrice.toFixed(2) }}</span>
                <span class="flash-original-price">¥{{ item.originalPrice.toFixed(2) }}</span>
              </div>
              <div class="flash-meta">
                <span class="flash-stock" v-if="item.remainingStock <= 10">仅剩{{ item.remainingStock }}件</span>
                <span class="flash-limit" v-if="item.limitPerUser > 0">限购{{ item.limitPerUser }}件</span>
              </div>
            </div>
            <div class="flash-stepper">
              <button
                class="stepper-btn minus"
                :disabled="!canAddFlashSale || getFlashItemQty(item.flashSaleItemId) === 0"
                @click="reduceFlashItem(item)"
              >-</button>
              <span class="stepper-value">{{ getFlashItemQty(item.flashSaleItemId) }}</span>
              <button
                class="stepper-btn plus"
                :disabled="!canAddFlashSale || item.remainingStock <= 0 || (item.limitPerUser > 0 && getFlashItemQty(item.flashSaleItemId) >= item.limitPerUser)"
                @click="addFlashItem(item)"
              >+</button>
            </div>
          </div>
        </div>
      </section>

      <!-- 费用明细 -->
      <section class="fee-section bento-card">
        <h3 class="fee-title">费用明细</h3>
        <div class="fee-list">
          <div class="fee-row">
            <span class="fee-label">正价商品</span>
            <span class="fee-value">¥{{ normalOrderAmount.toFixed(2) }}</span>
          </div>
          <div class="fee-row" v-if="flashSaleTotalAmount > 0">
            <span class="fee-label">秒杀加购</span>
            <span class="fee-value flash-value">¥{{ flashSaleTotalAmount.toFixed(2) }}</span>
          </div>
          <div class="fee-divider"></div>
          <div class="fee-row fee-total">
            <span class="fee-label">到店应付</span>
            <span class="fee-value total-price">¥{{ totalPrice.toFixed(2) }}</span>
          </div>
          <p class="fee-note">* 线上预约免费，到店付款提货</p>
        </div>
      </section>

      <!-- 备注 -->
      <section class="remark-section bento-card">
        <div class="remark-header">
          <span class="material-symbols-outlined remark-icon">edit_note</span>
          <span class="remark-title">备注（选填）</span>
        </div>
        <textarea
          v-model="remark"
          class="remark-input"
          placeholder="如有特殊要求请在此说明"
          maxlength="200"
          rows="2"
        ></textarea>
      </section>
    </main>

    <!-- 底部操作栏 -->
    <footer class="bottom-bar" v-if="!loading">
      <div class="bar-left">
        <span class="pay-label">到店应付</span>
        <div class="pay-amount">
          <span class="pay-symbol">¥</span>
          <span class="pay-price">{{ totalPrice.toFixed(2) }}</span>
        </div>
      </div>
      <button
        class="submit-btn"
        :class="{ loading: submitting }"
        :disabled="submitting"
        @click="submitReservation"
      >
        <span v-if="!submitting">立即预约</span>
        <span v-else>提交中...</span>
        <span class="material-symbols-outlined btn-arrow" v-if="!submitting">arrow_forward</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400&display=swap');

.checkout-page {
  min-height: 100vh;
  background: #fafaf9;
  font-family: 'Manrope', 'Noto Sans SC', sans-serif;
  -webkit-tap-highlight-color: transparent;
}

/* 顶部导航 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(250, 250, 249, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-back,
.nav-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.nav-back:hover {
  background: rgba(0, 0, 0, 0.05);
}

.nav-back .material-symbols-outlined {
  font-size: 24px;
  color: #181111;
}

.nav-title {
  font-size: 18px;
  font-weight: 700;
  color: #181111;
  letter-spacing: -0.015em;
}

/* 预约说明 */
.notice-section {
  padding: 16px;
}

.notice-card {
  background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.notice-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(76, 175, 80, 0.3);
}

.notice-header .material-symbols-outlined {
  font-size: 20px;
  color: #4caf50;
}

.notice-title {
  font-size: 15px;
  font-weight: 700;
  color: #2e7d32;
}

.notice-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notice-item {
  font-size: 13px;
  line-height: 1.6;
  color: #555;
  margin: 0;
}

/* 加载状态 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

/* 页面内容 */
.page-content {
  padding: 0 16px 140px;
}

/* 通用卡片样式 */
.bento-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
}

/* 联系人信息卡片 */
.contact-card {
  padding: 16px;
}

.contact-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.contact-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(233, 12, 31, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.contact-icon-wrap .material-symbols-outlined {
  font-size: 18px;
  color: #EF062D;
}

.contact-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #181111;
  flex: 1;
}

.required-badge {
  font-size: 10px;
  font-weight: 700;
  color: #EF062D;
  background: rgba(233, 12, 31, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  width: 70px;
  flex-shrink: 0;
}

.label-icon {
  font-size: 18px;
  color: #9ca3af;
}

.form-input {
  flex: 1;
  height: 44px;
  padding: 0 14px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background: #fafaf9;
  font-size: 15px;
  font-weight: 500;
  color: #181111;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: #EF062D;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(233, 12, 31, 0.1);
}

.form-input::placeholder {
  color: #bbb;
  font-weight: 400;
}

.contact-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding: 10px 12px;
  background: rgba(233, 12, 31, 0.05);
  border-radius: 8px;
  font-size: 12px;
  color: #8a6064;
}

.tip-icon {
  font-size: 16px;
  color: #EF062D;
}

/* 提货日期卡片 */
.pickup-date-card {
  padding: 16px;
}

.date-card-inner {
  display: flex;
  align-items: center;
  gap: 16px;
}

.date-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(233, 12, 31, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.date-icon {
  font-size: 24px;
  color: #EF062D;
}

.date-content {
  flex: 1;
}

.date-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #181111;
  margin-bottom: 8px;
}

.required-mark {
  color: #EF062D;
  font-weight: 700;
}

.date-input-wrap {
  display: block;
  position: relative;
  cursor: pointer;
}

.date-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 1;
  cursor: pointer;
  z-index: 10;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  background: transparent;
  color: transparent;
  caret-color: transparent;
}

.date-input::-webkit-calendar-picker-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: auto;
  height: auto;
  color: transparent;
  background: transparent;
  cursor: pointer;
}

.date-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fafaf9;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  pointer-events: none;
}

.date-value {
  font-size: 16px;
  font-weight: 700;
  color: #EF062D;
}

.date-placeholder {
  font-size: 14px;
  color: #9ca3af;
}

.date-arrow {
  font-size: 20px;
  color: #9ca3af;
}

.date-hint {
  margin-top: 12px;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
}

/* 【2026-01-21 顺路拼团】区域选择卡片 */
.region-card {
  padding: 16px;
}

.region-card-inner {
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
}

.region-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(76, 175, 80, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.region-icon {
  font-size: 24px;
  color: #4caf50;
}

.region-content {
  flex: 1;
  min-width: 0;
}

.region-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #181111;
  margin-bottom: 6px;
}

.optional-badge {
  font-size: 10px;
  font-weight: 500;
  color: #9ca3af;
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
}

.region-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #fafaf9;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
}

.region-value {
  font-size: 14px;
  font-weight: 600;
  color: #4caf50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.region-placeholder {
  font-size: 13px;
  color: #9ca3af;
}

.region-arrow {
  font-size: 18px;
  color: #9ca3af;
  flex-shrink: 0;
}

.region-clear-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.region-clear-btn .material-symbols-outlined {
  font-size: 16px;
  color: #9ca3af;
}

.region-hint {
  margin-top: 12px;
  font-size: 12px;
  color: #4caf50;
  line-height: 1.5;
}


/* 【2026-01-21 顺路拼团】附近拼团列表 */
.nearby-groups-section {
  margin-bottom: 16px;
}

.nearby-groups-section .section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 4px;
}

.nearby-groups-section .section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 700;
  color: #4caf50;
}

.nearby-groups-section .section-title .material-symbols-outlined {
  font-size: 20px;
}

.section-subtitle {
  font-size: 12px;
  color: #9ca3af;
}

.nearby-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  font-size: 13px;
  color: #9ca3af;
}

.nearby-groups-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nearby-group-card {
  background: white;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s;
}

.nearby-group-card:active {
  transform: scale(0.98);
}

.group-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.group-initiator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.group-initiator .material-symbols-outlined {
  font-size: 16px;
  color: #9ca3af;
}

.group-expire {
  font-size: 12px;
  color: #ff9800;
  font-weight: 500;
}

.group-card-body {
  margin-bottom: 12px;
}

.group-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.group-progress .progress-bar {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.group-progress .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #66bb6a);
  border-radius: 3px;
}

.group-progress .progress-text {
  font-size: 13px;
  font-weight: 600;
  color: #4caf50;
  min-width: 50px;
  text-align: right;
}

.group-gift {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #8c6d00;
  background: #fffbe6;
  padding: 6px 10px;
  border-radius: 6px;
}

.group-gift .material-symbols-outlined {
  font-size: 14px;
}

.group-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
}

.group-store {
  font-size: 12px;
  color: #9ca3af;
}

.join-btn {
  font-size: 13px;
  font-weight: 600;
  color: #4caf50;
}

.nearby-tip {
  margin-top: 10px;
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  line-height: 1.5;
}

/* 商品预览区 */
.products-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 4px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #181111;
}

.section-count {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

.products-card {
  overflow: hidden;
}

.product-item {
  display: flex;
  gap: 16px;
  padding: 16px;
}

.product-item.has-border {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.product-img-wrap {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  background: #f3f4f6;
  overflow: hidden;
  flex-shrink: 0;
}

.product-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-name {
  font-size: 14px;
  font-weight: 600;
  color: #181111;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.product-price {
  font-size: 16px;
  font-weight: 700;
  color: #EF062D;
}

.product-quantity {
  font-size: 13px;
  color: #9ca3af;
}

/* 费用明细 */
.fee-section {
  padding: 20px;
}

.fee-title {
  font-size: 12px;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 16px;
}

.fee-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fee-label {
  font-size: 14px;
  color: #6b7280;
}

.fee-value {
  font-size: 14px;
  font-weight: 500;
  color: #181111;
}

.fee-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.05);
  margin: 4px 0;
}

.fee-total .fee-label {
  font-size: 16px;
  font-weight: 700;
  color: #181111;
}

.total-price {
  font-size: 22px;
  font-weight: 800;
  color: #EF062D;
}

.fee-note {
  font-size: 12px;
  color: #4caf50;
  margin-top: 8px;
}

.flash-value {
  color: #ff6b00;
  font-weight: 600;
}

/* 【2026-01-20 秒杀系统】秒杀加购区样式 */
.flash-sale-section {
  margin-bottom: 16px;
}

.flash-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.flash-icon {
  font-size: 18px;
}

.flash-threshold {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%);
  padding: 4px 10px;
  border-radius: 12px;
}

.flash-threshold.not-eligible {
  background: #9ca3af;
}

.flash-threshold-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(255, 107, 0, 0.08);
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #ff6b00;
}

.flash-threshold-tip .tip-icon {
  font-size: 18px;
}

.flash-products-card {
  overflow: hidden;
  transition: opacity 0.2s;
}

.flash-products-card.disabled {
  opacity: 0.6;
}

.flash-product-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}

.flash-product-item.has-border {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.flash-product-img-wrap {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  background: #f3f4f6;
  overflow: hidden;
  flex-shrink: 0;
}

.flash-product-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.flash-badge {
  position: absolute;
  top: 0;
  left: 0;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%);
  padding: 2px 6px;
  border-radius: 0 0 6px 0;
}

.flash-product-info {
  flex: 1;
  min-width: 0;
}

.flash-product-name {
  font-size: 14px;
  font-weight: 600;
  color: #181111;
  line-height: 1.3;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flash-price-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 4px;
}

.flash-price {
  font-size: 16px;
  font-weight: 700;
  color: #ff6b00;
}

.flash-original-price {
  font-size: 12px;
  color: #9ca3af;
  text-decoration: line-through;
}

.flash-meta {
  display: flex;
  gap: 8px;
}

.flash-stock,
.flash-limit {
  font-size: 11px;
  color: #9ca3af;
}

.flash-stock {
  color: #ef4444;
}

.flash-stepper {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.stepper-btn {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  background: #fff;
  font-size: 16px;
  font-weight: 600;
  color: #181111;
  cursor: pointer;
  transition: all 0.15s;
}

.stepper-btn:active:not(:disabled) {
  background: #f3f4f6;
}

.stepper-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stepper-btn.plus {
  background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%);
  border-color: transparent;
  color: #fff;
}

.stepper-value {
  min-width: 28px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #181111;
}

/* 备注 */
.remark-section {
  padding: 16px;
}

.remark-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.remark-icon {
  font-size: 20px;
  color: #9ca3af;
}

.remark-title {
  font-size: 14px;
  font-weight: 600;
  color: #181111;
}

.remark-input {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  background: #fafaf9;
  font-size: 14px;
  color: #181111;
  resize: none;
  outline: none;
}

.remark-input:focus {
  border-color: #EF062D;
}

.remark-input::placeholder {
  color: #9ca3af;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding: 16px 24px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 8px));
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bar-left {
  display: flex;
  flex-direction: column;
}

.pay-label {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

.pay-amount {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.pay-symbol {
  font-size: 14px;
  font-weight: 700;
  color: #EF062D;
}

.pay-price {
  font-size: 24px;
  font-weight: 800;
  color: #EF062D;
  letter-spacing: -0.02em;
}

/* 提交按钮 */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 36px;
  background: linear-gradient(135deg, #EF062D 0%, #FF4D6D 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(233, 12, 31, 0.3);
  transition: all 0.2s;
}

.submit-btn:active {
  transform: scale(0.98);
}

.submit-btn.loading {
  opacity: 0.7;
  pointer-events: none;
}

.submit-btn:disabled {
  background: #ccc;
  box-shadow: none;
}

.btn-arrow {
  font-size: 18px;
}

/* 【2026-01-22 营销优化】周销售奖励提示样式 */
.weekly-reward-tip {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 0 16px 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #FFF7E6 0%, #FFE7BA 100%);
  border-radius: 12px;
  border: 1px solid rgba(250, 173, 20, 0.3);
}

.reward-tip-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FAAD14 0%, #F5A623 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.reward-tip-icon .material-symbols-outlined {
  font-size: 20px;
  color: #fff;
}

.reward-tip-content {
  flex: 1;
  min-width: 0;
}

.reward-tip-text {
  font-size: 13px;
  line-height: 1.6;
  color: #614700;
  margin-bottom: 10px;
}

.reward-tip-text .highlight {
  font-weight: 700;
  color: #D48806;
}

.reward-tip-text .reward-amount {
  font-weight: 800;
  color: #EF062D;
  font-size: 15px;
}

.reward-tip-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(250, 173, 20, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FAAD14 0%, #F5A623 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #AD6800;
  flex-shrink: 0;
}

/* ========== 【2026-01-22】预约流程说明 ========== */
.booking-flow-section {
  padding: 16px;
  padding-bottom: 0;
}

.flow-title {
  font-size: 14px;
  font-weight: 700;
  color: #181111;
  margin-bottom: 12px;
  text-align: center;
}

.flow-steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
  background: white;
  border-radius: 12px;
  padding: 16px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #EF062D 0%, #FF4D6D 100%);
  color: white;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-content {
  text-align: center;
}

.step-title {
  font-size: 13px;
  font-weight: 600;
  color: #181111;
  margin-bottom: 2px;
}

.step-desc {
  font-size: 11px;
  color: #52c41a;
}

.flow-arrow {
  font-size: 16px;
  color: #d9d9d9;
  padding-top: 6px;
}

/* ========== 【2026-01-22】赠品预览提示 ========== */
.gift-preview-section {
  padding: 0 16px 16px;
}

.gift-preview-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #FFF7E6 0%, #FFE7BA 100%);
  border-radius: 12px;
  border: 1px solid rgba(250, 173, 20, 0.3);
}

.gift-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.gift-info {
  flex: 1;
}

.gift-title {
  font-size: 12px;
  color: #AD6800;
  margin-bottom: 2px;
}

.gift-name {
  font-size: 15px;
  font-weight: 700;
  color: #D46B08;
}

.gift-badge {
  font-size: 10px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #FAAD14 0%, #F5A623 100%);
  padding: 4px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}
</style>
