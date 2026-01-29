<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { get, getOptimizedImageUrl } from '../api'
import { useCartStore } from '../stores/cart'
import { useUserStore } from '../stores/user'
// 【2026-01-26】统一价格工具函数，禁止直接使用 retailPrice || agentPrice
import { getDisplayPrice, getDiscount as calcDiscount } from '../utils/priceUtils'

// 定义组件名称，用于keep-alive缓存
defineOptions({
  name: 'Home'
})

const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()

// 推销员ID（用于获取推销员定价）
const salespersonId = computed(() => userStore.currentSalespersonId)

// 数据
const banners = ref<any[]>([])
const categories = ref<any[]>([])
const notices = ref<any[]>([])
const currentNoticeIndex = ref(0)
const products = ref<any[]>([])
const currentCategoryId = ref<number | null>(null)
const hotDeals = ref<any[]>([]) // 今日爆款
const companyLogo = ref('') // 公司Logo
const companyName = ref('蒙庆烟花') // 公司名称

// 秒杀活动状态
const flashSaleStatus = ref<'active' | 'upcoming' | 'none'>('none')
const flashSaleActivity = ref<any>(null)

// 【2026-01-21 拼团到店】拼团活动状态
const groupBuyEnabled = ref(false)
const groupBuyConfig = ref<any>(null)

// 【2026-01-21 限时锁价】锁价活动状态
const priceLockEnabled = ref(false)
const priceLockConfig = ref<any>(null)

// 【2026-01-22 活动中心入口】代金券和周进度统计
const couponStats = ref({ unused: 0, totalAmount: 0 })
const weeklyProgress = ref<any>(null)

// 分页
const page = ref(1)
const pageSize = 10
const hasMore = ref(true)
const loading = ref(false)

// 搜索
const searchKeyword = ref('')
const showSearchPanel = ref(false)
const searchHistory = ref<string[]>([])
const hotSearchTags = ['组合烟花', '冷烟花', '儿童专用', '新春特惠', '爆款']

// 加载搜索历史
const loadSearchHistory = () => {
  try {
    const history = localStorage.getItem('search_history')
    if (history) {
      searchHistory.value = JSON.parse(history).slice(0, 8)
    }
  } catch {}
}

// 保存搜索历史
const saveSearchHistory = (keyword: string) => {
  if (!keyword.trim()) return
  const history = [keyword, ...searchHistory.value.filter(k => k !== keyword)].slice(0, 8)
  searchHistory.value = history
  localStorage.setItem('search_history', JSON.stringify(history))
}

// 清除搜索历史
const clearSearchHistory = () => {
  searchHistory.value = []
  localStorage.removeItem('search_history')
}

// 执行搜索
const doSearch = (keyword?: string) => {
  const kw = keyword || searchKeyword.value
  if (kw.trim()) {
    saveSearchHistory(kw.trim())
    searchKeyword.value = kw.trim()
  }
  showSearchPanel.value = false
  loadProducts(true)
}

// 点击热门标签搜索
const searchByTag = (tag: string) => {
  searchKeyword.value = tag
  doSearch(tag)
}

// 点击历史记录搜索
const searchByHistory = (keyword: string) => {
  searchKeyword.value = keyword
  doSearch(keyword)
}

// 新年倒计时
const countdown = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 })
let countdownTimer: number | null = null


// 春节日期配置
const springFestivalDates: Record<number, [number, number]> = {
  2025: [0, 29],
  2026: [1, 17],
  2027: [1, 6],
  2028: [0, 26],
  2029: [1, 13],
  2030: [1, 3],
}

const getNextSpringFestival = (): Date => {
  const now = new Date()
  const currentYear = now.getFullYear()
  if (springFestivalDates[currentYear]) {
    const [month, day] = springFestivalDates[currentYear]
    const cny = new Date(currentYear, month, day, 0, 0, 0)
    if (cny > now) return cny
  }
  const nextYear = currentYear + 1
  if (springFestivalDates[nextYear]) {
    const [month, day] = springFestivalDates[nextYear]
    return new Date(nextYear, month, day, 0, 0, 0)
  }
  return new Date(nextYear, 1, 1, 0, 0, 0)
}

const calculateCountdown = () => {
  const now = new Date()
  const cny = getNextSpringFestival()
  const diff = cny.getTime() - now.getTime()
  if (diff <= 0) {
    countdown.value = { days: 0, hours: 0, minutes: 0, seconds: 0 }
    return
  }
  countdown.value = {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000)
  }
}

const startCountdown = () => {
  calculateCountdown()
  countdownTimer = window.setInterval(calculateCountdown, 1000)
}

// 加载Banner
const loadBanners = async () => {
  try {
    const res = await get<any[]>('/h5/banners')
    banners.value = res.data || []
  } catch {}
}

// 加载系统配置（Logo等）- 从后端API动态获取
const loadConfigs = async () => {
  try {
    const res = await get<{ companyName: string; companyLogo: string }>('/config')
    if (res.data) {
      companyLogo.value = res.data.companyLogo || ''
      companyName.value = res.data.companyName || '蒙庆烟花'
    }
  } catch (err) {
    console.error('加载公司配置失败:', err)
    // 失败时使用默认值
    companyName.value = '蒙庆烟花'
  }
}

// 加载分类
const loadCategories = async () => {
  try {
    const res = await get<any[]>('/categories')
    categories.value = res.data || []
  } catch {}
}

// 公告轮播定时器
let noticeTimer: number | null = null

// 加载公告
const loadNotices = async () => {
  try {
    const res = await get<any[]>('/h5/notices')
    notices.value = res.data || []
    if (notices.value.length > 1 && !noticeTimer) {
      noticeTimer = window.setInterval(() => {
        currentNoticeIndex.value = (currentNoticeIndex.value + 1) % notices.value.length
      }, 3000)
    }
  } catch {}
}

// 加载商品列表
const loadProducts = async (options?: boolean | { sortBy?: string; order?: string }) => {
  if (loading.value) return
  const refresh = typeof options === 'boolean' ? options : true
  const extraParams = typeof options === 'object' ? options : {}
  if (!refresh && !hasMore.value) return

  loading.value = true
  if (refresh) {
    page.value = 1
    hasMore.value = true
  }

  try {
    const params: any = {
      page: page.value,
      pageSize,
      keyword: searchKeyword.value || undefined,
      categoryId: currentCategoryId.value || undefined,
      ...extraParams
    }

    let list: any[] = []

    // 【2026-01-20修复】推销员自己浏览时显示拿货价，客户访问时显示零售价
    if (userStore.isSelfBrowsing) {
      // 推销员自己浏览：调用 /products 获取拿货价
      const res = await get<any>('/products', params)
      list = res.data.list || []
    } else if (salespersonId.value) {
      // 访客模式：调用 /shop/products 获取推销员设置的零售价
      const res = await get<any>('/shop/products', { ...params, s: salespersonId.value })
      list = (res.data.list || []).map((p: any) => ({
        ...p,
        agentPrice: p.price,
        retailPrice: p.originalPrice
      }))
    } else {
      // 未登录且无推销员ID
      const res = await get<any>('/products', params)
      list = res.data.list || []
    }

    if (refresh) {
      products.value = list
    } else {
      products.value = [...products.value, ...list]
    }
    hasMore.value = list.length >= pageSize
    page.value++
  } catch {} finally {
    loading.value = false
  }
}

// 加载更多
const loadMore = () => {
  if (!loading.value && hasMore.value) {
    loadProducts(false)
  }
}

// 搜索防抖
let searchTimer: number | null = null
const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    loadProducts(true)
  }, 500)
}

// 跳转商品详情
const goProduct = (id: number) => {
  router.push(`/product/${id}`)
}

// 【2026-01-26】跳转推荐项（支持商品和套餐）
const goItem = (item: any) => {
  if (item.isPackage) {
    router.push(`/packages/${item.id}`)
  } else {
    router.push(`/product/${item.id}`)
  }
}

// 获取商品图片（兼容数组和JSON字符串格式）
const getProductImage = (product: any) => {
  if (!product || !product.images) return '/placeholder.png'
  let images = product.images
  // 如果是JSON字符串，先解析
  if (typeof images === 'string') {
    try {
      images = JSON.parse(images)
    } catch {
      // 如果解析失败，可能本身就是URL字符串
      return getOptimizedImageUrl(images, 'small')
    }
  }
  // 如果是数组，取第一张
  if (Array.isArray(images) && images.length > 0) {
    return getOptimizedImageUrl(images[0], 'small')
  }
  return '/placeholder.png'
}

// 获取Banner图片URL（完整路径）
const getBannerImageUrl = (imageUrl: string) => {
  if (!imageUrl) return '/placeholder.png'
  // 如果已经是完整URL，直接返回
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  // 使用相对路径，让nginx处理（兼容生产和测试环境）
  return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
}

// 图片加载失败处理
const handleImageError = (e: Event) => {
  const target = e.target as HTMLImageElement
  target.src = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23f5f5f5"/%3E%3C/svg%3E'
}

// 跳转到购物车
const goCart = () => {
  router.push('/cart')
}

// 【2026-01-25】加载重点推荐商品（2x2网格展示4个）
// 【2026-01-26】支持套餐显示在推荐区域
const loadHotDeals = async () => {
  try {
    const hotItems: any[] = []

    // 1. 获取推荐商品
    // 【2026-01-27修复】确保提取displayPrice字段，使用统一价格逻辑
    // 【2026-01-27修复】传递推销员ID，确保客户访问时看到推销员设置的价格
    try {
      const params: any = { type: 'HOT' }
      if (salespersonId.value) {
        params.s = salespersonId.value
      }
      const res = await get<any>('/recommends', params)
      const recommends = res.data || []
      recommends.slice(0, 2).forEach((item: any) => {
        let images: string[] = []
        if (item.product?.images) {
          try {
            images = typeof item.product.images === 'string'
              ? JSON.parse(item.product.images)
              : item.product.images
          } catch {
            images = []
          }
        }
        hotItems.push({
          id: item.productId || item.product?.id,
          name: item.product?.name || item.title,
          images: images,
          // 【2026-01-29修复】直接使用后端返回的价格字段，由getDisplayPrice函数处理降级逻辑
          // 禁止使用 || 拼接，避免 displayPrice=0 时被错误降级
          displayPrice: item.product?.displayPrice,
          agentPrice: item.product?.agentPrice,
          retailPrice: item.product?.retailPrice,
          badge: item.badge,
          isPackage: false
        })
      })
    } catch {}

    // 2. 获取推荐套餐（取前2个活跃套餐）
    try {
      const pkgRes = await get<any>('/packages', { pageSize: 2, positioning: 'HOT' })
      const packages = pkgRes.data?.list || []
      packages.forEach((pkg: any) => {
        let images: string[] = []
        if (pkg.images) {
          images = Array.isArray(pkg.images) ? pkg.images : (typeof pkg.images === 'string' ? JSON.parse(pkg.images) : [])
        }
        // 【2026-01-27】如果套餐没有主图，从商品列表中提取第一张图片
        if (images.length === 0 && pkg.items && pkg.items.length > 0) {
          for (const item of pkg.items) {
            const productImg = item.product?.images?.[0]
            if (productImg) {
              images = [productImg]
              break
            }
          }
        }
        // 【2026-01-27修复】统一价格逻辑，与PackageDetail.vue保持一致
        // displayPrice由后端根据用户身份计算：推销员看拿货价，客户看零售价
        hotItems.push({
          id: pkg.id,
          name: pkg.name,
          images: images,
          agentPrice: pkg.displayPrice || pkg.myRetailPrice || pkg.masterRetailPrice,
          retailPrice: pkg.masterRetailPrice,
          badge: '套餐',
          isPackage: true
        })
      })
    } catch {}

    // 3. 如果还不够4个，补充更多推荐商品
    if (hotItems.length < 4) {
      try {
        const res = await get<any>('/products', {
          page: 1,
          pageSize: 4 - hotItems.length,
          sortBy: 'salesCount',
          order: 'desc'
        })
        const products = res.data?.list || []
        products.forEach((p: any) => {
          if (!hotItems.find(h => !h.isPackage && h.id === p.id)) {
            hotItems.push({
              ...p,
              isPackage: false
            })
          }
        })
      } catch {}
    }

    hotDeals.value = hotItems.slice(0, 4)
  } catch {
    // 降级：使用通用商品接口
    try {
      const res = await get<any>('/products', {
        page: 1,
        pageSize: 4,
        sortBy: 'salesCount',
        order: 'desc'
      })
      hotDeals.value = (res.data?.list || []).map((p: any) => ({ ...p, isPackage: false }))
    } catch {}
  }
}

// 加载秒杀活动状态
const loadFlashSaleStatus = async () => {
  try {
    const res = await get<any>('/h5/flash-sale/current')
    if (res.data && res.data.activity) {
      flashSaleActivity.value = res.data.activity
      const now = new Date()
      const startTime = new Date(res.data.activity.startTime)
      const endTime = new Date(res.data.activity.endTime)

      if (now >= startTime && now <= endTime) {
        flashSaleStatus.value = 'active' // 进行中
      } else if (now < startTime) {
        flashSaleStatus.value = 'upcoming' // 即将开始
      } else {
        flashSaleStatus.value = 'none'
      }
    } else {
      flashSaleStatus.value = 'none'
      flashSaleActivity.value = null
    }
  } catch {
    flashSaleStatus.value = 'none'
  }
}

// 计算秒杀入口标签文本
const flashSaleTagText = computed(() => {
  switch (flashSaleStatus.value) {
    case 'active': return '进行中'
    case 'upcoming': return '即将开始'
    default: return '敬请期待'
  }
})

// 【2026-01-21 拼团到店】加载拼团配置
const loadGroupBuyConfig = async () => {
  try {
    const res = await get<any>('/group-buy/config')
    if (res.data) {
      groupBuyEnabled.value = res.data.enabled === true
      groupBuyConfig.value = res.data
    }
  } catch {
    groupBuyEnabled.value = false
  }
}

// 【2026-01-21 限时锁价】加载锁价配置
const loadPriceLockConfig = async () => {
  try {
    const res = await get<any>('/price-lock/config')
    if (res.data) {
      priceLockEnabled.value = res.data.enabled === true
      priceLockConfig.value = res.data
    }
  } catch {
    priceLockEnabled.value = false
  }
}

// 【2026-01-22 活动中心入口】加载代金券统计
const loadCouponStats = async () => {
  if (!userStore.isLoggedIn) return
  try {
    const res = await get<any>('/coupons/stats')
    if (res.code === 0 && res.data) {
      couponStats.value = {
        unused: res.data.unused || 0,
        totalAmount: res.data.unusedAmount || 0
      }
    }
  } catch {
    // 静默失败
  }
}

// 【2026-01-22 活动中心入口】加载周进度
const loadWeeklyProgress = async () => {
  if (!userStore.isLoggedIn) return
  try {
    const res = await get<any>('/weekly/progress')
    if (res.code === 0) {
      weeklyProgress.value = res.data
    }
  } catch {
    // 静默失败
  }
}

// 初始化
onMounted(async () => {
  startCountdown()
  loadSearchHistory()

  // 公共数据加载（不需要登录）
  await Promise.all([
    loadBanners(),
    loadCategories(),
    loadNotices(),
    loadHotDeals(),
    loadConfigs(),
    loadFlashSaleStatus(),
    loadGroupBuyConfig(), // 【2026-01-21 拼团到店】
    loadPriceLockConfig() // 【2026-01-21 限时锁价】
  ])

  loadProducts(true)

  // 【2026-01-22修复】认证数据延迟加载，避免登录跳转时的竞态条件
  // 使用setTimeout确保在事件循环的下一轮执行，此时登录状态已完全稳定
  setTimeout(() => {
    if (userStore.isLoggedIn) {
      loadCouponStats()
      loadWeeklyProgress()
    }
    cartStore.fetchCount()
    cartStore.startAutoRefresh()
  }, 50)
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (noticeTimer) {
    clearInterval(noticeTimer)
    noticeTimer = null
  }
  cartStore.stopAutoRefresh()
})

// 购物车数量
const cartCount = computed(() => cartStore.count)

// 【2026-01-26】使用统一价格工具函数计算折扣
// 注意：getDiscount 已从 priceUtils 导入为 calcDiscount，这里重新导出为 getDiscount 保持模板兼容
const getDiscount = calcDiscount

</script>

<template>
  <div class="home-page">
    <!-- 1. 顶部导航栏（拼多多风格） -->
    <header class="pdd-header">
      <div class="pdd-header-content">
        <div class="pdd-brand">
          <img v-if="companyLogo" :src="getBannerImageUrl(companyLogo)" class="pdd-brand-logo" alt="Logo" />
          <span v-else class="pdd-brand-text">{{ companyName }}</span>
        </div>
        <div class="pdd-search-box" @click="showSearchPanel = true">
          <span class="material-symbols-outlined">search</span>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索春节爆款/品牌"
            @input="onSearchInput"
            @focus="showSearchPanel = true"
            @keyup.enter="doSearch()"
          />
        </div>
        <button class="pdd-cart-btn" @click="goCart">
          <span class="material-symbols-outlined">shopping_cart</span>
          <span v-if="cartCount > 0" class="pdd-cart-badge">{{ cartCount > 99 ? '99+' : cartCount }}</span>
        </button>
      </div>
    </header>

    <main class="main-content">
      <!-- 拼多多风格功能入口（2026-01-22调整顺序：活动中心优先） -->
      <section class="pdd-quick-entries">
        <!-- 【2026-01-23】免费拿入口（主力活动） -->
        <div class="entry-item" @click="router.push('/bargain-products')">
          <div class="entry-icon free-take">
            <span class="zero-yuan-icon">0元</span>
          </div>
          <span class="entry-title">免费拿</span>
          <span class="entry-tag tag-hot">HOT</span>
        </div>
        <div class="entry-item" @click="router.push('/flash-sale')">
          <div class="entry-icon flash-sale">
            <span class="material-symbols-outlined">bolt</span>
          </div>
          <span class="entry-title">限时秒杀</span>
          <span class="entry-tag" :class="{ 'tag-active': flashSaleStatus === 'active', 'tag-upcoming': flashSaleStatus === 'upcoming' }">{{ flashSaleTagText }}</span>
        </div>
        <div class="entry-item" @click="router.push('/coupons')">
          <div class="entry-icon coupon">
            <span class="material-symbols-outlined">confirmation_number</span>
          </div>
          <span class="entry-title">代金券</span>
          <span class="entry-tag tag-coupon" v-if="couponStats.unused > 0">¥{{ couponStats.totalAmount }}</span>
          <span class="entry-tag" v-else>领券</span>
        </div>
        <!-- 【2026-01-25 套餐功能】套餐专区入口 -->
        <div class="entry-item" @click="router.push('/packages')">
          <div class="entry-icon package">
            <span class="material-symbols-outlined">inventory_2</span>
          </div>
          <span class="entry-title">套餐专区</span>
          <span class="entry-tag tag-package">省更多</span>
        </div>
        <!-- 【2026-01-21 拼团到店】拼团入口 -->
        <div class="entry-item" v-if="groupBuyEnabled" @click="router.push('/my-group-buys')">
          <div class="entry-icon group-buy">
            <span class="material-symbols-outlined">group_add</span>
          </div>
          <span class="entry-title">拼团到店</span>
          <span class="entry-tag tag-group">{{ groupBuyConfig?.requiredCount || 3 }}人团</span>
        </div>
        <!-- 【2026-01-21 限时锁价】锁价入口 -->
        <div class="entry-item" v-if="priceLockEnabled" @click="router.push('/my-price-locks')">
          <div class="entry-icon price-lock">
            <span class="material-symbols-outlined">lock_clock</span>
          </div>
          <span class="entry-title">限时锁价</span>
          <span class="entry-tag tag-lock">{{ priceLockConfig?.lockHours || 24 }}h</span>
        </div>
        <div class="entry-item" @click="router.push('/agent-recruit')">
          <div class="entry-icon reward">
            <span class="material-symbols-outlined">emoji_events</span>
          </div>
          <span class="entry-title">推销员盈利</span>
          <span class="entry-tag">赚钱</span>
        </div>
      </section>

      <!-- 活动中心入口横幅（简洁版） -->
      <section class="pdd-subsidy-section">
        <div class="pdd-subsidy-bar" @click="router.push('/activity-center')">
          <span class="material-symbols-outlined subsidy-icon">celebration</span>
          <span class="subsidy-text">活动中心</span>
          <span class="subsidy-desc">批发价、正规店，买贵包赔</span>
          <span class="material-symbols-outlined subsidy-arrow">chevron_right</span>
        </div>
      </section>

      <!-- 【2026-01-25】重点推荐区域（2x2大图网格） -->
      <div class="featured-section">
        <div class="featured-grid" v-if="hotDeals.length > 0">
          <div
            v-for="deal in hotDeals.slice(0, 4)"
            :key="deal.id"
            class="featured-item"
            @click="goItem(deal)"
          >
            <div class="featured-image">
              <img :src="getProductImage(deal)" @error="handleImageError" :alt="deal.name" />
              <span v-if="deal.badge" class="featured-badge">{{ deal.badge }}</span>
            </div>
            <div class="featured-info">
              <div class="featured-price">
                <span class="symbol">¥</span>
                <span class="value">{{ getDisplayPrice(deal) }}</span>
              </div>
              <div class="featured-name">{{ deal.name }}</div>
            </div>
          </div>
        </div>
        <div v-else class="featured-empty">加载中...</div>
      </div>

      <!-- 全部商品（紧凑网格，一屏4个） -->
      <section class="pdd-products-section">
        <div class="pdd-products-grid">
          <div
            v-for="product in products"
            :key="product.id"
            class="pdd-product-card"
            @click="goProduct(product.id)"
          >
            <!-- 商品图片 -->
            <div class="pdd-card-img">
              <img :src="getProductImage(product)" @error="handleImageError" :alt="product.name" />
              <span v-if="getDiscount(product) >= 20" class="pdd-discount-badge">省{{ getDiscount(product) }}%</span>
              <!-- 【2026-01-23】视频标识 -->
              <div class="pdd-video-badge" v-if="product.videoUrl">
                <span class="material-symbols-outlined">play_circle</span>
              </div>
            </div>
            <!-- 商品信息 -->
            <div class="pdd-card-info">
              <h3 class="pdd-card-name">{{ product.name }}</h3>
              <!-- 营销标签行 -->
              <div class="pdd-card-tags">
                <span class="pdd-tag hot" v-if="product.salesCount >= 50">好评率超99%</span>
                <span class="pdd-tag sales">已预约{{ (product.salesCount || 50) + 50 }}+件</span>
              </div>
              <!-- 价格行 -->
              <div class="pdd-card-price">
                <span class="price-symbol">¥</span>
                <span class="price-num">{{ getDisplayPrice(product) }}</span>
                <span class="price-sold">全店已拼{{ (product.salesCount || 50) * 10 }}+件</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 加载更多 -->
        <div class="pdd-load-more">
          <span v-if="loading" class="loading-text">加载中...</span>
          <span v-else-if="!hasMore" class="no-more">--- 我是有底线的 ---</span>
          <button v-else class="load-more-btn" @click="loadMore">点击加载更多</button>
        </div>
      </section>

      <!-- 【2026-01-22 卖点展示】平台4大优势展示 - 放在页面底部 -->
      <section class="platform-advantages bottom-fixed">
        <div class="advantage-item" @click="router.push('/gift-activity')">
          <span class="adv-icon">🛡️</span>
          <div class="adv-text">
            <span class="adv-title">零风险预约</span>
            <span class="adv-desc">免费预约 到店付款</span>
          </div>
        </div>
        <div class="advantage-item" @click="router.push('/gift-activity')">
          <span class="adv-icon">🎁</span>
          <div class="adv-text">
            <span class="adv-title">预约有礼</span>
            <span class="adv-desc">满200送好礼</span>
          </div>
        </div>
        <div class="advantage-item">
          <span class="adv-icon">📞</span>
          <div class="adv-text">
            <span class="adv-title">30分钟确认</span>
            <span class="adv-desc">专属电话服务</span>
          </div>
        </div>
        <div class="advantage-item">
          <span class="adv-icon">🏭</span>
          <div class="adv-text">
            <span class="adv-title">品类最全</span>
            <span class="adv-desc">500+品类一站购齐</span>
          </div>
        </div>
      </section>
    </main>

    <!-- 底部安全区 -->
    <div class="safe-bottom"></div>

    <!-- 搜索面板 -->
    <div v-if="showSearchPanel" class="search-panel-overlay" @click="showSearchPanel = false">
      <div class="search-panel" @click.stop>
        <!-- 搜索输入框 -->
        <div class="search-panel-header">
          <div class="search-input-wrap">
            <span class="material-symbols-outlined">search</span>
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索商品名称/品牌"
              @keyup.enter="doSearch()"
              autofocus
            />
            <span
              v-if="searchKeyword"
              class="material-symbols-outlined clear-btn"
              @click="searchKeyword = ''"
            >close</span>
          </div>
          <button class="search-btn" @click="doSearch()">搜索</button>
          <button class="cancel-btn" @click="showSearchPanel = false">取消</button>
        </div>

        <!-- 热门搜索 -->
        <div class="search-section">
          <div class="section-label">
            <span class="material-symbols-outlined">local_fire_department</span>
            热门搜索
          </div>
          <div class="search-tags">
            <span
              v-for="tag in hotSearchTags"
              :key="tag"
              class="search-tag"
              @click="searchByTag(tag)"
            >{{ tag }}</span>
          </div>
        </div>

        <!-- 搜索历史 -->
        <div class="search-section" v-if="searchHistory.length > 0">
          <div class="section-label">
            <span class="material-symbols-outlined">history</span>
            搜索历史
            <span class="clear-history" @click="clearSearchHistory">
              <span class="material-symbols-outlined">delete</span>
              清空
            </span>
          </div>
          <div class="history-list">
            <div
              v-for="keyword in searchHistory"
              :key="keyword"
              class="history-item"
              @click="searchByHistory(keyword)"
            >
              <span class="material-symbols-outlined">schedule</span>
              <span class="history-text">{{ keyword }}</span>
              <span class="material-symbols-outlined arrow">chevron_right</span>
            </div>
          </div>
        </div>

        <!-- 快捷分类入口 -->
        <div class="search-section">
          <div class="section-label">
            <span class="material-symbols-outlined">category</span>
            快捷分类
          </div>
          <div class="quick-categories">
            <div class="quick-category" @click="searchByTag('组合烟花')">
              <span class="material-symbols-outlined">celebration</span>
              <span>组合烟花</span>
            </div>
            <div class="quick-category" @click="searchByTag('冷烟花')">
              <span class="material-symbols-outlined">brightness_5</span>
              <span>冷烟花</span>
            </div>
            <div class="quick-category" @click="searchByTag('儿童')">
              <span class="material-symbols-outlined">mood</span>
              <span>儿童类</span>
            </div>
            <div class="quick-category" @click="searchByTag('手持')">
              <span class="material-symbols-outlined">stars</span>
              <span>手持类</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========== 拼多多风格基础变量 ========== */
.home-page {
  --pdd-red: #F40;
  --pdd-orange: #FF5722;
  --pdd-pink: #FFE8E8;
  --text: #333;
  --text-light: #666;
  --text-muted: #999;
  --bg: #f5f5f5;
  --white: #fff;

  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 80px;
}

/* ========== 拼多多风格顶部导航 ========== */
.pdd-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: white;
  padding: 8px 12px;
  padding-top: calc(8px + env(safe-area-inset-top));
}

.pdd-header-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pdd-brand {
  flex-shrink: 0;
}

.pdd-brand-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
  border-radius: 4px;
}

.pdd-brand-text {
  font-size: 16px;
  font-weight: 800;
  color: var(--pdd-red);
}

.pdd-search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f5f5f5;
  border-radius: 18px;
  padding: 8px 12px;
}

.pdd-search-box .material-symbols-outlined {
  font-size: 20px;
  color: #999;
}

.pdd-search-box input {
  flex: 1;
  border: none;
  background: none;
  font-size: 14px;
  outline: none;
}

.pdd-search-box input::placeholder {
  color: #ccc;
}

.pdd-cart-btn {
  position: relative;
  padding: 6px;
  background: none;
  border: none;
  cursor: pointer;
}

.pdd-cart-btn .material-symbols-outlined {
  font-size: 24px;
  color: #333;
}

.pdd-cart-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: var(--pdd-red);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

/* ========== 拼多多风格NO.1推荐卡片 ========== */
.pdd-recommend-section {
  padding: 12px;
  background: white;
}

.pdd-top-card {
  display: flex;
  gap: 12px;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFF 100%);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(244, 64, 0, 0.1);
}

.top-card-img {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  background: #f5f5f5;
}

.top-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.top-rank-badge {
  position: absolute;
  top: 0;
  left: 0;
  background: linear-gradient(135deg, var(--pdd-red), #FF6B6B);
  color: white;
  font-size: 10px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 8px 0 8px 0;
}

.top-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.top-card-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 拼多多风格：红色背景卖点条 */
.top-card-slogan-bar {
  display: inline-flex;
  align-items: center;
  background: linear-gradient(135deg, #FF4D4F 0%, #FF7875 100%);
  border-radius: 4px;
  padding: 4px 10px;
  margin: 2px 0;
}

.top-card-slogan-bar .slogan-text {
  font-size: 11px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
}

.top-card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.pdd-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.pdd-tag.hot {
  background: rgba(244, 64, 0, 0.1);
  color: var(--pdd-red);
}

.pdd-tag.sales {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
}

.pdd-tag.discount {
  background: rgba(250, 173, 20, 0.1);
  color: #d48806;
}

.top-card-price {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-top: auto;
}

.top-card-price .price-symbol {
  font-size: 14px;
  font-weight: 700;
  color: var(--pdd-red);
}

.top-card-price .price-num {
  font-size: 24px;
  font-weight: 900;
  color: var(--pdd-red);
  line-height: 1;
}

.top-card-price .price-unit {
  font-size: 12px;
  color: var(--pdd-red);
  opacity: 0.7;
}

.top-card-price .price-original {
  font-size: 12px;
  color: #999;
  text-decoration: line-through;
  margin-left: 8px;
}

/* ========== 拼多多风格今日爆款 ========== */
.pdd-hot-section {
  background: white;
  padding: 12px 0;
  margin-bottom: 8px;
  border-bottom: 8px solid #f5f5f5;
  min-height: 220px;
}

.pdd-hot-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #999;
  font-size: 13px;
}

.pdd-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 12px;
}

.section-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
}

.section-tag {
  background: rgba(244, 64, 0, 0.1);
  color: var(--pdd-red);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.view-more {
  display: flex;
  align-items: center;
  color: var(--pdd-red);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.view-more .material-symbols-outlined {
  font-size: 16px;
}

.pdd-hot-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 12px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.pdd-hot-scroll::-webkit-scrollbar {
  display: none;
}

.pdd-hot-card {
  flex-shrink: 0;
  width: 140px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  scroll-snap-align: start;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
}

.pdd-hot-card:active {
  transform: scale(0.98);
}

.pdd-hot-card .hot-card-img {
  position: relative;
  height: 140px;
  overflow: hidden;
  background: #f5f5f5;
}

.pdd-hot-card .hot-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pdd-hot-card .hot-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  background: var(--pdd-red);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 拼多多风格：彩色背景卖点条 */
.pdd-hot-card .hot-card-slogan-bar {
  padding: 6px 8px;
  margin: 0;
}

.pdd-hot-card .hot-card-slogan-bar .slogan-text {
  font-size: 11px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.pdd-hot-card .hot-card-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  padding: 4px 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pdd-hot-card .hot-card-price {
  padding: 0 8px;
  display: flex;
  align-items: baseline;
}

.pdd-hot-card .price-symbol {
  font-size: 12px;
  font-weight: 700;
  color: var(--pdd-red);
}

.pdd-hot-card .price-num {
  font-size: 18px;
  font-weight: 900;
  color: var(--pdd-red);
}

.pdd-hot-card .price-unit {
  font-size: 10px;
  color: var(--pdd-red);
  opacity: 0.7;
}

.pdd-hot-card .hot-card-meta {
  padding: 4px 8px 8px;
}

.pdd-hot-card .retail-price {
  font-size: 10px;
  color: #999;
  text-decoration: line-through;
}

/* ========== 紧凑商品网格（一屏4个） ========== */
.pdd-products-section {
  padding: 4px;
}

.pdd-products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}

.pdd-product-card {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
}

.pdd-product-card:active {
  transform: scale(0.98);
}

.pdd-card-img {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: #f5f5f5;
}

.pdd-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pdd-discount-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: linear-gradient(135deg, #52C41A, #73D13D);
  color: white;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
}

/* 【2026-01-23】视频标识 */
.pdd-video-badge {
  position: absolute;
  bottom: 6px;
  left: 6px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.pdd-video-badge .material-symbols-outlined {
  font-size: 14px;
  color: white;
}

.pdd-card-info {
  padding: 6px;
}

.pdd-card-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.3;
  height: 32px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin: 0 0 4px;
}

.pdd-card-tags {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.pdd-card-tags .pdd-tag {
  font-size: 9px;
  font-weight: 500;
  padding: 1px 3px;
  border-radius: 2px;
}

.pdd-card-tags .pdd-tag.hot {
  background: rgba(244, 64, 0, 0.1);
  color: var(--pdd-red);
}

.pdd-card-tags .pdd-tag.sales {
  background: rgba(244, 64, 0, 0.08);
  color: var(--pdd-red);
}

.pdd-card-price {
  display: flex;
  align-items: baseline;
}

.pdd-card-price .price-symbol {
  font-size: 10px;
  font-weight: 700;
  color: var(--pdd-red);
}

.pdd-card-price .price-num {
  font-size: 16px;
  font-weight: 900;
  color: var(--pdd-red);
  line-height: 1;
}

.pdd-card-price .price-sold {
  font-size: 9px;
  color: #999;
  margin-left: auto;
}

/* ========== 加载更多 ========== */
.pdd-load-more {
  text-align: center;
  padding: 16px 0;
}

.loading-text {
  color: var(--pdd-red);
  font-size: 13px;
}

.no-more {
  color: #ccc;
  font-size: 12px;
}

.load-more-btn {
  background: white;
  color: var(--pdd-red);
  border: 1px solid var(--pdd-red);
  border-radius: 20px;
  padding: 10px 30px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.load-more-btn:active {
  background: rgba(244, 64, 0, 0.05);
}

/* 底部安全区 */
.safe-bottom {
  height: 20px;
}

/* Material Icons */
.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
}

/* 搜索面板 */
.search-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.search-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: var(--white);
  border-radius: 0 0 20px 20px;
  padding: 16px;
  padding-top: max(16px, env(safe-area-inset-top));
  max-height: 80vh;
  overflow-y: auto;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.search-panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 24px;
  padding: 10px 16px;
  gap: 8px;
}

.search-input-wrap .material-symbols-outlined {
  font-size: 22px;
  color: #999;
}

.search-input-wrap input {
  flex: 1;
  border: none;
  background: none;
  font-size: 15px;
  outline: none;
}

.search-input-wrap .clear-btn {
  font-size: 18px;
  color: #999;
  cursor: pointer;
}

.search-btn {
  background: var(--primary);
  color: var(--white);
  border: none;
  border-radius: 20px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
}

.cancel-btn {
  background: none;
  border: none;
  color: var(--text-light);
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}

.search-section {
  margin-bottom: 24px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;
}

.section-label .material-symbols-outlined {
  font-size: 18px;
  color: var(--primary);
}

.clear-history {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #999;
  cursor: pointer;
}

.clear-history .material-symbols-outlined {
  font-size: 14px;
  color: #999;
}

.search-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.search-tag {
  background: linear-gradient(135deg, rgba(239, 6, 45, 0.08), rgba(239, 6, 45, 0.12));
  color: var(--primary);
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid rgba(239, 6, 45, 0.1);
}

.search-tag:active {
  transform: scale(0.95);
  background: var(--primary);
  color: var(--white);
}

.history-list {
  background: #f8f8f8;
  border-radius: 12px;
  overflow: hidden;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.history-item:last-child {
  border-bottom: none;
}

.history-item:active {
  background: rgba(0, 0, 0, 0.05);
}

.history-item .material-symbols-outlined {
  font-size: 18px;
  color: #999;
}

.history-item .history-text {
  flex: 1;
  font-size: 14px;
  color: var(--text);
}

.history-item .arrow {
  font-size: 18px;
  color: #ccc;
}

.quick-categories {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.quick-category {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: linear-gradient(145deg, #fafafa, #f0f0f0);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-category:active {
  transform: scale(0.95);
  background: linear-gradient(145deg, #ffe8eb, #ffccd3);
}

.quick-category .material-symbols-outlined {
  font-size: 28px;
  color: var(--primary);
  font-variation-settings: 'FILL' 1;
}

.quick-category span:last-child {
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
}

/* ========== 拼多多风格功能入口 ========== */
.pdd-quick-entries {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 12px 10px;
  background: white;
  border-bottom: 8px solid #f5f5f5;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.pdd-quick-entries::-webkit-scrollbar {
  display: none;
}

.pdd-quick-entries .entry-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
  cursor: pointer;
  min-width: 60px;
  flex-shrink: 0;
}

.pdd-quick-entries .entry-item:active {
  transform: scale(0.95);
}

.pdd-quick-entries .entry-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pdd-quick-entries .entry-icon .material-symbols-outlined {
  font-size: 20px;
  color: white;
}

.pdd-quick-entries .entry-icon.flash-sale {
  background: linear-gradient(135deg, #FF6B6B, #EF062D);
}

.pdd-quick-entries .entry-icon.gift {
  background: linear-gradient(135deg, #FFD700, #FFA500);
}

.pdd-quick-entries .entry-icon.reward {
  background: linear-gradient(135deg, #52C41A, #73D13D);
}

.pdd-quick-entries .entry-icon.coupon {
  background: linear-gradient(135deg, #FF85C0, #EB2F96);
}

/* 【2026-01-25 套餐功能】套餐入口样式 */
.pdd-quick-entries .entry-icon.package {
  background: linear-gradient(135deg, #FF9500, #FF6B00);
}

.pdd-quick-entries .entry-tag.tag-package {
  background: linear-gradient(135deg, #FF9500, #FF6B00);
}

/* 【2026-01-23】免费拿入口样式（主力活动） */
.pdd-quick-entries .entry-icon.free-take {
  background: linear-gradient(135deg, #FF6B6B, #EE5A5A);
  animation: freeTakePulse 2s ease-in-out infinite;
}

.pdd-quick-entries .entry-icon.free-take .zero-yuan-icon {
  font-size: 16px;
  font-weight: 800;
  color: white;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

@keyframes freeTakePulse {
  0%, 100% { box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3); }
  50% { box-shadow: 0 2px 16px rgba(255, 107, 107, 0.5); }
}

.pdd-quick-entries .entry-tag.tag-hot {
  background: linear-gradient(135deg, #FF4D4F, #F5222D);
  animation: hotShine 2s ease-in-out infinite;
}

@keyframes hotShine {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

/* 代金券入口角标增强 */
.pdd-quick-entries .entry-tag.tag-coupon {
  background: linear-gradient(135deg, #52C41A, #73D13D);
}

/* 【2026-01-21 拼团到店】拼团入口样式 */
.pdd-quick-entries .entry-icon.group-buy {
  background: linear-gradient(135deg, #1890FF, #40A9FF);
}

.pdd-quick-entries .entry-tag.tag-group {
  background: linear-gradient(135deg, #1890FF, #40A9FF);
}

/* 【2026-01-21 限时锁价】锁价入口样式 */
.pdd-quick-entries .entry-icon.price-lock {
  background: linear-gradient(135deg, #FA8C16, #FFC53D);
}

.pdd-quick-entries .entry-tag.tag-lock {
  background: linear-gradient(135deg, #FA8C16, #FFC53D);
}

.pdd-quick-entries .entry-title {
  font-size: 11px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.pdd-quick-entries .entry-tag {
  position: absolute;
  top: -2px;
  right: -6px;
  font-size: 9px;
  background: #EF062D;
  color: white;
  padding: 2px 5px;
  border-radius: 8px;
  font-weight: 600;
  white-space: nowrap;
}

/* 秒杀入口标签动态样式 */
.pdd-quick-entries .entry-tag.tag-active {
  background: linear-gradient(135deg, #FF4D4F, #FF7875);
  animation: tagPulse 1.5s ease-in-out infinite;
}

.pdd-quick-entries .entry-tag.tag-upcoming {
  background: linear-gradient(135deg, #FAAD14, #FFC53D);
}

@keyframes tagPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* ========== 拼多多风格百万补贴条 ========== */
.pdd-subsidy-section {
  padding: 0 12px;
  margin-bottom: 12px;
}

.pdd-subsidy-bar {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  background: linear-gradient(135deg, #FF5722 0%, #FF9800 100%);
  border-radius: 10px;
  color: white;
  cursor: pointer;
  gap: 10px;
}

.pdd-subsidy-bar:active {
  transform: scale(0.99);
}

.pdd-subsidy-bar .subsidy-icon {
  font-size: 22px;
}

.pdd-subsidy-bar .subsidy-text {
  font-size: 15px;
  font-weight: 700;
}

.pdd-subsidy-bar .subsidy-desc {
  flex: 1;
  font-size: 12px;
  opacity: 0.9;
}

.pdd-subsidy-bar .subsidy-arrow {
  font-size: 20px;
  opacity: 0.8;
}

/* ========== 【2026-01-25】重点推荐区域（2x2大图网格） ========== */
.featured-section {
  background: #fff;
  padding: 16px 12px;
  margin-bottom: 10px;
}

.featured-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}

.featured-title {
  font-size: 18px;
  font-weight: 800;
  color: #333;
}

.featured-subtitle {
  font-size: 12px;
  color: #999;
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.featured-item {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.2s;
}

.featured-item:active {
  transform: scale(0.98);
}

.featured-image {
  position: relative;
  width: 100%;
  height: 120px;
  overflow: hidden;
  background: #f5f5f5;
}

.featured-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.featured-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 10px;
  background: linear-gradient(135deg, #ff6b00, #ff9500);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(255, 107, 0, 0.3);
}

.featured-info {
  padding: 6px 8px 8px;
}

.featured-price {
  color: #F40;
  margin-bottom: 4px;
  display: flex;
  align-items: baseline;
}

.featured-price .symbol {
  font-size: 12px;
  font-weight: 600;
}

.featured-price .value {
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
}

.featured-name {
  font-size: 13px;
  color: #333;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.featured-empty {
  text-align: center;
  padding: 40px 0;
  color: #999;
  font-size: 14px;
}

/* ========== 【2026-01-22】平台4大优势展示 ========== */
.platform-advantages {
  display: flex;
  gap: 8px;
  padding: 0 12px 12px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.platform-advantages::-webkit-scrollbar {
  display: none;
}

.platform-advantages .advantage-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #FFFBF5 0%, #FFF7E6 100%);
  border-radius: 10px;
  border: 1px solid rgba(250, 173, 20, 0.2);
  min-width: fit-content;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.platform-advantages .advantage-item:active {
  transform: scale(0.98);
}

.platform-advantages .adv-icon {
  font-size: 24px;
  line-height: 1;
}

.platform-advantages .adv-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.platform-advantages .adv-title {
  font-size: 13px;
  font-weight: 700;
  color: #D46B08;
}

.platform-advantages .adv-desc {
  font-size: 10px;
  color: #AD6800;
  white-space: nowrap;
}

/* ========== 拼多多风格商品卡片销量显示 ========== */
.product-sold-count {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  margin-bottom: 8px;
}

/* ========== 横向滚动商品区域（拼多多风格：图片+价格） ========== */
.hot-scroll-wrapper {
  background: #f5f5f5;
  padding: 8px 0;
}

.hot-scroll-container {
  display: flex;
  gap: 8px;
  padding: 0 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.hot-scroll-container::-webkit-scrollbar {
  display: none;
}

.hot-scroll-item {
  flex-shrink: 0;
  width: 90px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  scroll-snap-align: start;
  cursor: pointer;
}

.hot-scroll-item:active {
  transform: scale(0.98);
}

.hot-item-img {
  width: 90px;
  height: 90px;
  overflow: hidden;
  background: #f5f5f5;
}

.hot-item-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hot-item-price {
  padding: 6px 4px;
  display: flex;
  align-items: baseline;
  justify-content: center;
}

.hot-item-price .symbol {
  font-size: 12px;
  font-weight: 700;
  color: #F40;
}

.hot-item-price .num {
  font-size: 16px;
  font-weight: 900;
  color: #F40;
}

.hot-scroll-empty {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 20px;
  width: 100%;
}
</style>
