<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import { get, post, getImageUrl, getOptimizedImageUrl, getJpegFallbackUrl } from '../api'
import { useCartStore } from '../stores/cart'
import { useUserStore } from '../stores/user'
import { shareProduct } from '../utils/share'
import { preloadVideo, clearPreloadCache } from '../utils/videoPreload'
// 【2026-01-29修复】统一使用价格工具函数，禁止直接使用 retailPrice || agentPrice
import { getDisplayPrice as getPriceUtil, getOriginalPrice as getOriginalPriceUtil, shouldShowOriginalPrice } from '../utils/priceUtils'
import Hls from 'hls.js'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()

// 收藏状态
const isCollected = ref(false)

// XSS过滤函数 - 移除危险的HTML标签和属性
const sanitizeHtml = (html: string): string => {
  if (!html) return ''

  // 创建临时DOM元素解析HTML
  const temp = document.createElement('div')
  temp.innerHTML = html

  // 移除所有script标签
  const scripts = temp.querySelectorAll('script')
  scripts.forEach(s => s.remove())

  // 移除所有iframe标签
  const iframes = temp.querySelectorAll('iframe')
  iframes.forEach(f => f.remove())

  // 移除所有事件属性 (onclick, onerror等)
  const allElements = temp.querySelectorAll('*')
  allElements.forEach(el => {
    const attrs = Array.from(el.attributes)
    attrs.forEach(attr => {
      if (attr.name.startsWith('on') || attr.value.includes('javascript:')) {
        el.removeAttribute(attr.name)
      }
    })
  })

  // 移除style标签
  const styles = temp.querySelectorAll('style')
  styles.forEach(s => s.remove())

  return temp.innerHTML
}

// 安全的商品详情HTML
const safeProductDetail = computed(() => {
  if (!product.value?.detail) return ''
  return sanitizeHtml(product.value.detail)
})

const product = ref<any>(null)
const quantity = ref(1)
const loading = ref(true)
const currentImageIndex = ref(0)

// 【2026-01-23 视频轮播相关】
const currentMediaIndex = ref(0)  // 媒体索引（视频+图片）
const videoRef = ref<HTMLVideoElement>()
const isVideoPlaying = ref(false)
const videoBuffering = ref(false)  // 视频缓冲状态
const hlsInstance = ref<Hls | null>(null)  // HLS播放器实例
const currentQuality = ref('自动')  // 当前画质
// 【自定义控制条】
const showControls = ref(true)  // 控制条显示状态
const controlsTimer = ref<number | null>(null)  // 控制条自动隐藏定时器
const videoCurrentTime = ref(0)  // 当前播放时间
const videoDurationSec = ref(0)  // 视频总时长

// 是否有视频
const hasVideo = computed(() => !!product.value?.videoUrl)

// 获取视频URL（处理HLS和普通MP4）
const videoUrl = computed(() => {
  if (!product.value?.videoUrl) return ''
  return getImageUrl(product.value.videoUrl)
})

// 是否是HLS格式
const isHlsVideo = computed(() => videoUrl.value.endsWith('.m3u8'))

// 初始化HLS播放器
const initHlsPlayer = () => {
  const video = videoRef.value
  const url = videoUrl.value
  if (!video || !url) return

  // 清理之前的HLS实例
  if (hlsInstance.value) {
    hlsInstance.value.destroy()
    hlsInstance.value = null
  }

  // 检查是否是HLS格式
  if (url.endsWith('.m3u8')) {
    if (Hls.isSupported()) {
      // 使用hls.js播放 - 秒开优化配置
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        // 【秒开优化】带宽估计从500k提升到2M，避免初始用低画质
        abrEwmaDefaultEstimate: 2000000,
        abrBandWidthFactor: 0.8,
        abrBandWidthUpFactor: 0.8,
        // 【秒开优化】缓冲区从30秒缩小到5秒，加快启动
        maxBufferLength: 5,
        maxMaxBufferLength: 15,
        // 【秒开优化】从最低质量快速启动，然后自动升档
        startLevel: 0,
        // 分片加载超时
        fragLoadingTimeOut: 20000,
      })

      hls.loadSource(url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS清单解析完成，可用画质:', hls.levels.map(l => `${l.height}p`).join(', '))
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level]
        if (level) {
          currentQuality.value = `${level.height}p`
          console.log(`画质切换到 ${currentQuality.value}`)
        }
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('HLS致命错误:', data.type, data.details)
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('网络错误，尝试恢复...')
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('媒体错误，尝试恢复...')
              hls.recoverMediaError()
              break
            default:
              console.error('无法恢复的错误，销毁HLS实例')
              hls.destroy()
              break
          }
        }
      })

      hlsInstance.value = hls
      console.log('HLS播放器初始化完成')
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // iOS Safari原生支持HLS
      video.src = url
      console.log('使用Safari原生HLS支持')
    } else {
      console.warn('当前浏览器不支持HLS')
      // 降级：尝试直接播放（可能失败）
      video.src = url
    }
  } else {
    // 普通MP4直接播放
    video.src = url
    console.log('使用普通MP4播放')
  }
}

// 是否当前显示视频（视频在第一位）
const isCurrentVideo = computed(() => hasVideo.value && currentMediaIndex.value === 0)

// 视频封面（优先使用上传的封面，否则使用第一张商品图）
const videoThumbnail = computed(() => {
  if (product.value?.videoThumbnail) return getImageUrl(product.value.videoThumbnail)
  const imgs = images.value
  if (imgs.length > 0) return getOptimizedImageUrl(imgs[0], 'large')
  return ''
})

// 切换视频播放/暂停
const toggleVideoPlay = () => {
  if (!videoRef.value) {
    console.warn('视频元素未找到')
    return
  }
  if (isVideoPlaying.value) {
    videoRef.value.pause()
  } else {
    // play() 返回 Promise，需要处理可能的错误
    const playPromise = videoRef.value.play()
    if (playPromise !== undefined) {
      playPromise.catch((error: Error) => {
        console.error('视频播放失败:', error.message)
        // 如果是自动播放被阻止，提示用户
        if (error.name === 'NotAllowedError') {
          console.log('请点击视频手动播放')
        }
      })
    }
  }
}

// 预加载图片
const preloadImage = (url: string) => {
  const img = new Image()
  img.src = url
}

// 预加载相邻轮播图片
const preloadAdjacentImages = (currentIndex: number) => {
  if (images.value.length <= 1) return
  const imgIndex = hasVideo.value ? currentIndex - 1 : currentIndex
  const nextIdx = (imgIndex + 1) % images.value.length
  const prevIdx = (imgIndex - 1 + images.value.length) % images.value.length

  // 使用requestIdleCallback避免阻塞主线程
  const doPreload = () => {
    if (images.value[nextIdx]) preloadImage(getOptimizedImageUrl(images.value[nextIdx], 'medium'))
    if (images.value[prevIdx]) preloadImage(getOptimizedImageUrl(images.value[prevIdx], 'medium'))
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(doPreload)
  } else {
    setTimeout(doPreload, 100)
  }
}

// 监听轮播切换
const onMediaChange = (current: number | { current: number }) => {
  // TDesign Swiper change 事件可能返回对象或数字
  const index = typeof current === 'number' ? current : current.current
  currentMediaIndex.value = index
  // 切换时更新图片索引（排除视频）
  if (hasVideo.value) {
    currentImageIndex.value = Math.max(0, index - 1)
  } else {
    currentImageIndex.value = index
  }
  // 离开视频时暂停播放
  if (index !== 0 && videoRef.value) {
    videoRef.value.pause()
  }
  // 预加载相邻图片
  preloadAdjacentImages(index)
}

// 视频播放事件
const onVideoPlay = () => {
  isVideoPlaying.value = true
  videoBuffering.value = false
  // 播放时自动隐藏控制条（3秒后）
  startControlsHideTimer()
}
const onVideoPause = () => {
  isVideoPlaying.value = false
  // 暂停时显示控制条
  showControls.value = true
  clearControlsTimer()
}
const onVideoEnded = () => {
  isVideoPlaying.value = false
  showControls.value = true
  clearControlsTimer()
}
const onVideoWaiting = () => { videoBuffering.value = true }
const onVideoCanPlay = () => { videoBuffering.value = false }

// 视频时间更新
const onVideoTimeUpdate = () => {
  if (videoRef.value) {
    videoCurrentTime.value = videoRef.value.currentTime
    videoDurationSec.value = videoRef.value.duration || 0
  }
}

// 控制条自动隐藏
const startControlsHideTimer = () => {
  clearControlsTimer()
  controlsTimer.value = window.setTimeout(() => {
    if (isVideoPlaying.value) {
      showControls.value = false
    }
  }, 3000) // 3秒后隐藏
}

const clearControlsTimer = () => {
  if (controlsTimer.value) {
    clearTimeout(controlsTimer.value)
    controlsTimer.value = null
  }
}

// 点击视频区域切换控制条显示
const onVideoAreaClick = () => {
  if (isVideoPlaying.value) {
    showControls.value = !showControls.value
    if (showControls.value) {
      startControlsHideTimer()
    }
  } else {
    toggleVideoPlay()
  }
}

// 进度条拖动
const onProgressChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const time = parseFloat(input.value)
  if (videoRef.value && !isNaN(time)) {
    videoRef.value.currentTime = time
    videoCurrentTime.value = time
  }
}

// 格式化时间 mm:ss
const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 格式化视频时长
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 秒杀模式相关
const isFlashSale = computed(() => route.query.flashSale === '1')
const flashPrice = computed(() => parseFloat(route.query.flashPrice as string) || 0)
const flashSaleItemId = computed(() => parseInt(route.query.flashSaleItemId as string) || 0)
const flashStock = computed(() => parseInt(route.query.flashStock as string) || 0)
const flashLimitPerUser = computed(() => parseInt(route.query.limitPerUser as string) || 0)

// 商品图片列表
const images = computed(() => {
  return product.value?.images || []
})

// 可购买库存（秒杀模式使用秒杀库存）
const availableStock = computed(() => {
  if (!product.value) return 0
  // 秒杀模式使用秒杀专属库存
  if (isFlashSale.value) {
    return flashStock.value
  }
  return product.value.stock - (product.value.lockStock || 0)
})

// 实际显示价格（秒杀模式使用秒杀价）
// 【2026-01-29修复】使用统一价格工具函数，优先级：displayPrice > agentPrice > retailPrice
const displayPrice = computed(() => {
  if (!product.value) return 0
  if (isFlashSale.value) {
    return flashPrice.value
  }
  return getPriceUtil(product.value)
})

// 原价（用于划线价显示）
// 【2026-01-29修复】使用统一价格工具函数
const originalPrice = computed(() => {
  if (!product.value) return 0
  return getOriginalPriceUtil(product.value)
})

// 省钱金额
const savedAmount = computed(() => {
  if (!product.value) return 0
  return Math.max(0, originalPrice.value - displayPrice.value)
})

// 价格整数部分
const priceInteger = computed(() => {
  if (!product.value) return '0'
  return Math.floor(displayPrice.value).toString()
})

// 价格小数部分
const priceDecimal = computed(() => {
  if (!product.value) return '00'
  const price = displayPrice.value
  const decimal = (price % 1).toFixed(2).substring(2)
  return decimal
})

// 折扣率计算
const discountRate = computed(() => {
  if (!product.value) return 0
  const retail = originalPrice.value
  const agent = displayPrice.value
  if (retail <= 0) return 0
  return Math.round((agent / retail) * 10)
})

// 模拟评价数据
const mockReviews = [
  { name: '王', content: '烟花效果很棒，孩子们都很喜欢，明年还会来！', time: '3天前' },
  { name: '李', content: '质量很好，比超市便宜，门店服务态度也很好', time: '5天前' },
  { name: '张', content: '春节必备，种类齐全，推荐购买', time: '1周前' }
]

// 评价数量（基于销量模拟）
const reviewCount = computed(() => {
  const sales = product.value?.salesCount || 100
  return sales + 47
})

// 推销员信息
const salespersonInfo = computed(() => {
  // 从URL参数或用户信息获取推销员
  const salespersonId = userStore.currentSalespersonId || route.query.s
  if (salespersonId) {
    return {
      id: salespersonId,
      name: '蒙庆推销员',
      serviceCount: 100,
      avatar: ''
    }
  }
  return null
})

// 切换收藏
const toggleCollect = () => {
  isCollected.value = !isCollected.value
  Toast({ message: isCollected.value ? '已收藏' : '取消收藏', theme: 'success' })
}

// 【2026-01-27修复】拨打电话或复制号码
const callOrCopyPhone = async (phone: string) => {
  const telLink = document.createElement('a')
  telLink.href = `tel:${phone}`
  telLink.click()
  try {
    await navigator.clipboard.writeText(phone)
    Toast({ message: `电话 ${phone} 已复制`, theme: 'success' })
  } catch {
    Toast({ message: `客服电话: ${phone}` })
  }
}

// 跳转门店
const goShop = () => {
  Dialog.confirm({
    title: '门店信息',
    content: '地址：呼和浩特市和林格尔县盛乐镇姑子板村华门世家1号门面房\n\n客服电话：13190531439',
    confirmBtn: '拨打/复制电话',
    cancelBtn: '关闭',
    onConfirm: () => {
      callOrCopyPhone('13190531439')
    }
  })
}

// 商品标签
const productTags = computed(() => {
  if (!product.value) return []
  const tags: { text: string, type: string }[] = []

  // 热销：销量超过100
  const sales = product.value.salesCount || 0
  if (sales >= 100) {
    tags.push({ text: '热销', type: 'hot' })
  }

  // 新品：可以根据创建时间判断（30天内）
  // 由于没有创建时间字段，暂时跳过

  // 限量/紧张：库存少
  if (availableStock.value > 0 && availableStock.value <= 10) {
    tags.push({ text: '限量', type: 'limited' })
  }

  return tags
})

// 加载商品详情
// 【2026-01-20修复】推销员自己浏览显示拿货价，客户访问显示零售价
const loadProduct = async () => {
  const id = route.params.id
  loading.value = true
  try {
    // 获取当前推销员ID
    const salespersonId = userStore.currentSalespersonId

    let res: any
    // 【2026-01-20修复】推销员自己浏览时显示拿货价
    if (userStore.isSelfBrowsing) {
      // 推销员自己浏览：调用 /products 获取拿货价
      res = await get<any>(`/products/${id}`)
      product.value = res.data
    } else if (salespersonId) {
      // 访客模式：调用 /shop/products 获取推销员设置的零售价
      res = await get<any>(`/shop/products/${id}`, { s: salespersonId })
      // 转换字段名以兼容页面显示
      product.value = {
        ...res.data,
        agentPrice: res.data.price,           // 推销员定价
        retailPrice: res.data.originalPrice   // 原价
      }
    } else {
      // 无推销员ID：调用products接口（后端根据token返回价格）
      res = await get<any>(`/products/${id}`)
      product.value = res.data
    }
  } catch {
    Toast({ message: '商品不存在', theme: 'error' })
    // 【2026-01-28修复】加载失败跳转首页，避免back()返回错误页面
    router.replace('/')
  } finally {
    loading.value = false
  }
}


// 数量变化
const onQuantityChange = (val: number) => {
  if (val < 1) {
    quantity.value = 1
    return
  }
  if (val > availableStock.value) {
    quantity.value = availableStock.value
    Toast({ message: `最多可预约${availableStock.value}件`, theme: 'warning' })
    return
  }
  quantity.value = val
}

// 添加到购物车
const addToCart = async () => {
  if (!product.value) return
  if (availableStock.value < 1) {
    Toast({ message: '该商品已售罄，暂无库存', theme: 'warning' })
    return
  }
  // 检查添加数量是否超过库存
  if (quantity.value > availableStock.value) {
    Toast({ message: `库存不足，当前仅剩 ${availableStock.value} 件`, theme: 'warning' })
    return
  }
  // 秒杀模式检查限购数量
  if (isFlashSale.value && flashLimitPerUser.value > 0 && quantity.value > flashLimitPerUser.value) {
    Toast({ message: `限购${flashLimitPerUser.value}件`, theme: 'warning' })
    return
  }

  try {
    // 秒杀模式添加秒杀标记
    const cartData: any = { productId: product.value.id, quantity: quantity.value }
    if (isFlashSale.value) {
      cartData.isFlashSale = true
      cartData.flashSaleItemId = flashSaleItemId.value
      cartData.flashPrice = flashPrice.value
    }
    await post('/cart', cartData)
    cartStore.fetchCount()
    Toast({ message: '已加入采购单', theme: 'success' })
  } catch {}
}

// 立即购买 - 直接跳转到购物车，如果商品不在购物车则先添加
const buyNow = async () => {
  if (!product.value) return
  if (availableStock.value < 1) {
    Toast({ message: '该商品已售罄，暂无库存', theme: 'warning' })
    return
  }
  // 检查添加数量是否超过库存
  if (quantity.value > availableStock.value) {
    Toast({ message: `库存不足，当前仅剩 ${availableStock.value} 件`, theme: 'warning' })
    return
  }
  // 秒杀模式检查限购数量
  if (isFlashSale.value && flashLimitPerUser.value > 0 && quantity.value > flashLimitPerUser.value) {
    Toast({ message: `限购${flashLimitPerUser.value}件`, theme: 'warning' })
    return
  }

  try {
    // 检查购物车中是否已有该商品
    const cartRes = await get<any>('/cart')
    const cartItems = cartRes.data?.items || cartRes.data || []
    const existingItem = cartItems.find((item: any) => item.productId === product.value.id)

    if (!existingItem) {
      // 购物车中没有该商品，先添加
      const cartData: any = { productId: product.value.id, quantity: quantity.value }
      if (isFlashSale.value) {
        cartData.isFlashSale = true
        cartData.flashSaleItemId = flashSaleItemId.value
        cartData.flashPrice = flashPrice.value
      }
      await post('/cart', cartData)
      cartStore.fetchCount()
    }
    // 如果已经在购物车中，直接跳转
    router.push('/cart')
  } catch {
    // 出错时也尝试跳转
    router.push('/cart')
  }
}

// 图片加载失败处理
const handleImageError = (e: Event) => {
  const target = e.target as HTMLImageElement
  target.src = '/placeholder.png'
}

// 返回
const goBack = () => {
  router.back()
}

// 去购物车
const goCart = () => {
  router.push('/cart')
}

// 联系客服
const contactService = () => {
  Dialog.confirm({
    title: '联系客服',
    content: '客服电话：13190531439',
    confirmBtn: '拨打/复制电话',
    cancelBtn: '取消',
    onConfirm: () => {
      callOrCopyPhone('13190531439')
    }
  })
}

// 分享商品
const handleShare = async () => {
  if (!product.value) {
    Toast.error('商品信息不存在')
    return
  }
  await shareProduct(product.value)
}

// 结构化卖点（从sellingPoints字段或智能生成）
const sellingPoints = computed(() => {
  if (!product.value) return []
  if (product.value.sellingPoints && Array.isArray(product.value.sellingPoints)) {
    return product.value.sellingPoints
  }

  // 根据分类智能生成默认卖点
  const categoryName = product.value.category?.name || ''
  const pointsMap: Record<string, Array<{icon: string, title: string, desc: string}>> = {
    '组合烟花': [
      { icon: '⏱️', title: '持续燃放', desc: '60-120秒超长表演' },
      { icon: '🎨', title: '多彩效果', desc: '红黄蓝绿多色变幻' },
      { icon: '🔊', title: '震撼音效', desc: '噼啪声响喜庆热闹' }
    ],
    '喷花类': [
      { icon: '💫', title: '安全喷射', desc: '无飞火花安全可靠' },
      { icon: '✨', title: '绚丽火花', desc: '金色银色火树银花' },
      { icon: '⏱️', title: '时长适中', desc: '30-60秒持续燃放' }
    ],
    '儿童安全类': [
      { icon: '🛡️', title: '安全认证', desc: '通过儿童安全检测' },
      { icon: '👶', title: '小手可握', desc: '适合5岁以上儿童' },
      { icon: '🎉', title: '趣味十足', desc: '五彩缤纷欢乐无限' }
    ],
    '旋转升空类': [
      { icon: '🚀', title: '高空绽放', desc: '升空高度可达20米' },
      { icon: '🌀', title: '旋转效果', desc: '螺旋上升美轮美奂' },
      { icon: '⭐', title: '绚烂夺目', desc: '璀璨光芒照亮夜空' }
    ],
    '礼花弹': [
      { icon: '💥', title: '爆发力强', desc: '震撼视觉冲击' },
      { icon: '🎆', title: '大面积覆盖', desc: '绽放直径超10米' },
      { icon: '🏆', title: '专业级别', desc: '庆典活动首选' }
    ],
    '造型烟花': [
      { icon: '🎨', title: '创意造型', desc: '独特设计吸睛' },
      { icon: '📸', title: '适合拍照', desc: '社交分享神器' },
      { icon: '🎁', title: '送礼佳品', desc: '精美包装有面子' }
    ]
  }

  return pointsMap[categoryName] || [
    { icon: '✅', title: '品质保证', desc: '正规厂家生产' },
    { icon: '🏷️', title: '价格实惠', desc: '厂家直供省中间商' },
    { icon: '📦', title: '安全包装', desc: '专业防护运输无忧' }
  ]
})

// 使用场景
const usageScenes = computed(() => {
  if (!product.value) return []
  if (product.value.usageScenes && Array.isArray(product.value.usageScenes)) {
    return product.value.usageScenes
  }

  // 默认场景标签
  return [
    { icon: '🎊', name: '春节团圆' },
    { icon: '🎂', name: '生日派对' },
    { icon: '💒', name: '婚礼庆典' },
    { icon: '🏠', name: '乔迁开业' }
  ]
})

onMounted(() => {
  loadProduct().then(() => {
    // 延迟初始化HLS播放器（等待DOM渲染）
    if (product.value?.videoUrl) {
      // 【秒开优化】立即预加载视频清单和首分片
      const url = getImageUrl(product.value.videoUrl)
      if (url.endsWith('.m3u8')) {
        preloadVideo(url)
      }
      setTimeout(initHlsPlayer, 200)
    }
  })
})

onUnmounted(() => {
  // 清理HLS实例
  if (hlsInstance.value) {
    hlsInstance.value.destroy()
    hlsInstance.value = null
  }
  // 清理视频预加载缓存
  clearPreloadCache()
  // 清理控制条定时器
  clearControlsTimer()
})

// 监听视频URL变化，重新初始化播放器
watch(videoUrl, (newUrl) => {
  if (newUrl && videoRef.value) {
    // 延迟初始化确保DOM已更新
    setTimeout(initHlsPlayer, 100)
  }
})
</script>

<template>
  <div class="product-detail-page">
    <!-- 顶部沉浸式导航 -->
    <nav class="nav-bar-immersive">
      <button class="nav-back" @click="goBack">
        <span class="material-symbols-outlined">arrow_back_ios</span>
      </button>
      <div class="nav-actions">
        <button class="nav-btn share-btn" @click="handleShare" title="分享商品">
          <span class="material-symbols-outlined">share</span>
        </button>
        <button class="nav-btn" @click="goCart">
          <span class="material-symbols-outlined">shopping_cart</span>
          <span class="cart-badge" v-if="cartStore.count > 0">{{ cartStore.count > 99 ? '99+' : cartStore.count }}</span>
        </button>
      </div>
    </nav>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="40px" />
    </div>

    <template v-else-if="product">
      <!-- 【2026-01-23 改造】商品媒体轮播 - 视频+图片混合 -->
      <div class="pdd-image-section">
        <t-swiper
          :current="currentMediaIndex"
          @change="onMediaChange"
          :autoplay="false"
          class="pdd-swiper"
        >
          <!-- 视频项（如果有视频，放在第一位） -->
          <t-swiper-item v-if="hasVideo" key="video">
            <div class="video-slide" @click="onVideoAreaClick">
              <video
                ref="videoRef"
                :poster="videoThumbnail"
                class="slide-video"
                playsinline
                webkit-playsinline
                x5-playsinline
                x5-video-player-type="h5"
                preload="metadata"
                @play="onVideoPlay"
                @pause="onVideoPause"
                @ended="onVideoEnded"
                @waiting="onVideoWaiting"
                @canplay="onVideoCanPlay"
                @timeupdate="onVideoTimeUpdate"
                @playing="videoBuffering = false"
                @error="(e: Event) => console.error('视频加载错误:', e)"
                @loadeddata="() => console.log('视频数据已加载')"
              >
                您的浏览器不支持视频播放
              </video>
              <!-- 播放按钮遮罩（未播放时显示） -->
              <div class="video-play-overlay" v-if="!isVideoPlaying">
                <div class="play-btn">
                  <span class="material-symbols-outlined">play_arrow</span>
                </div>
              </div>
              <!-- 自定义控制条（播放时显示，3秒后自动隐藏） -->
              <div class="video-controls" :class="{ 'controls-visible': showControls && isVideoPlaying }" @click.stop @touchstart.stop @touchmove.stop>
                <!-- 进度条容器（扩大触摸区域） -->
                <div class="progress-wrapper" @click.stop @touchstart.stop>
                  <input
                    type="range"
                    class="video-progress"
                    :value="videoCurrentTime"
                    :max="videoDurationSec || 100"
                    min="0"
                    step="0.1"
                    @input="onProgressChange"
                    @change="onProgressChange"
                  />
                </div>
                <div class="controls-row">
                  <!-- 播放/暂停按钮 -->
                  <button class="control-btn" @click.stop="toggleVideoPlay">
                    <span class="material-symbols-outlined">{{ isVideoPlaying ? 'pause' : 'play_arrow' }}</span>
                  </button>
                  <!-- 时间显示 -->
                  <span class="time-display">{{ formatTime(videoCurrentTime) }} / {{ formatTime(videoDurationSec) }}</span>
                  <!-- HLS画质标签 -->
                  <span class="quality-tag" v-if="isHlsVideo && currentQuality !== '自动'">{{ currentQuality }}</span>
                </div>
              </div>
              <!-- 视频时长标签（未播放时显示） -->
              <div class="video-duration-badge" v-if="product.videoDuration && !isVideoPlaying">
                {{ formatDuration(product.videoDuration) }}
              </div>
              <!-- 视频缓冲加载状态 -->
              <div class="video-buffering" v-if="videoBuffering">
                <t-loading theme="circular" size="40px" />
                <span>加载中...</span>
              </div>
            </div>
          </t-swiper-item>

          <!-- 图片项 - 响应式srcset优化 -->
          <t-swiper-item v-for="(img, index) in images" :key="'img-' + index">
            <picture>
              <source
                :srcset="`${getOptimizedImageUrl(img, 'small')} 150w, ${getOptimizedImageUrl(img, 'medium')} 375w, ${getOptimizedImageUrl(img, 'large')} 750w`"
                sizes="100vw"
                type="image/webp"
              />
              <img
                :src="getJpegFallbackUrl(img, 'medium')"
                :srcset="`${getJpegFallbackUrl(img, 'small')} 150w, ${getJpegFallbackUrl(img, 'medium')} 375w, ${getJpegFallbackUrl(img, 'large')} 750w`"
                sizes="100vw"
                class="pdd-product-image"
                :loading="Number(index) <= 1 ? 'eager' : 'lazy'"
                :fetchpriority="Number(index) === 0 && !hasVideo ? 'high' : 'auto'"
                @error="handleImageError"
                alt="商品图片"
              />
            </picture>
          </t-swiper-item>
        </t-swiper>

        <!-- 媒体计数器（显示视频图标或图片序号） -->
        <div class="pdd-media-counter">
          <template v-if="isCurrentVideo">
            <span class="material-symbols-outlined video-indicator">videocam</span>
            <span>视频</span>
          </template>
          <template v-else>
            {{ hasVideo ? currentMediaIndex : currentMediaIndex + 1 }}/{{ images.length }}
          </template>
        </div>
      </div>

      <!-- 秒杀专属头部横幅 -->
      <div class="flash-sale-banner" v-if="isFlashSale">
        <div class="flash-sale-header">
          <span class="flash-icon">⚡</span>
          <span class="flash-title">限时秒杀</span>
          <span class="flash-tag">特价直降</span>
        </div>
        <div class="flash-sale-limit" v-if="flashLimitPerUser > 0">
          限购{{ flashLimitPerUser }}件/人
        </div>
      </div>

      <!-- 拼多多风格促销信息条 -->
      <div class="pdd-promo-banner" v-if="!isFlashSale">
        <span class="promo-icon">✓</span>
        <span class="promo-highlight">先预约后付款</span>
        <span class="promo-desc">| 到店确认后再付款，预约免费</span>
        <span class="material-symbols-outlined promo-arrow">chevron_right</span>
      </div>

      <!-- 拼多多风格价格区域 -->
      <div class="pdd-price-section" :class="{ 'flash-sale-price': isFlashSale }">
        <div class="pdd-price-main">
          <span class="pdd-currency">¥</span>
          <span class="pdd-price-integer">{{ priceInteger }}</span>
          <span class="pdd-price-decimal">.{{ priceDecimal }}</span>
          <span class="pdd-price-meta">已预约 {{ product.salesCount || 100 }}+ 件</span>
        </div>
        <div class="pdd-price-compare">
          <!-- 【2026-01-29修复】使用统一价格工具函数判断是否显示原价 -->
          <span class="pdd-original-price" v-if="shouldShowOriginalPrice(product)">¥{{ originalPrice }}</span>
          <span class="pdd-save-tag" v-if="savedAmount > 10">
            省¥{{ savedAmount.toFixed(0) }}
          </span>
        </div>
        <div class="pdd-promo-tags">
          <span class="pdd-tag red" v-if="discountRate > 0 && discountRate < 10">{{ discountRate }}折</span>
          <span class="pdd-tag orange">门店自提</span>
          <span class="pdd-tag green" v-if="availableStock > 0 && availableStock <= 20">仅剩{{ availableStock }}件</span>
        </div>
      </div>

      <!-- 商品标题区 -->
      <div class="pdd-title-section">
        <div class="pdd-title-main">
          <span class="pdd-title-tag" v-if="productTags.some(t => t.type === 'hot')">热销</span>
          <span class="pdd-title-tag special-price-tag" v-if="product.isSpecialPrice">特价</span>
          <h1 class="pdd-product-name">{{ product.name }}</h1>
        </div>
        <p class="pdd-product-desc" v-if="product.description">{{ product.description }}</p>
      </div>

      <!-- 【2026-01-22 卖点展示】一句话核心卖点 -->
      <div class="main-slogan-section" v-if="product.slogan">
        <div class="slogan-content">
          <span class="slogan-icon">💡</span>
          <span class="slogan-text">{{ product.slogan }}</span>
        </div>
      </div>

      <!-- 【2026-01-22 卖点展示】服务承诺条 -->
      <div class="service-commitments">
        <div class="commitment-item">
          <span class="material-symbols-outlined">verified</span>
          <span>正品保障</span>
        </div>
        <div class="commitment-item">
          <span class="material-symbols-outlined">schedule</span>
          <span>30分钟确认</span>
        </div>
        <div class="commitment-item">
          <span class="material-symbols-outlined">payments</span>
          <span>到店付款</span>
        </div>
        <div class="commitment-item">
          <span class="material-symbols-outlined">redeem</span>
          <span>满额赠礼</span>
        </div>
      </div>

      <!-- 推销员信息卡（替代拼单区） -->
      <div class="pdd-salesperson-card" v-if="salespersonInfo">
        <div class="sp-avatar">
          <span class="material-symbols-outlined">person</span>
          <span class="sp-badge">推荐</span>
        </div>
        <div class="sp-info">
          <div class="sp-name">{{ salespersonInfo.name }} 为您服务</div>
          <div class="sp-stats">
            <span>已服务 {{ salespersonInfo.serviceCount }}+ 客户</span>
            <span class="sp-divider">|</span>
            <span>好评率 99%</span>
          </div>
        </div>
        <button class="sp-contact-btn" @click="contactService">
          <span class="material-symbols-outlined">chat</span>
          联系
        </button>
      </div>



      <!-- 购买数量 -->
      <div class="quantity-card">
        <div class="quantity-label">购买数量</div>
        <t-stepper
          :value="quantity"
          :min="1"
          :max="availableStock"
          @change="onQuantityChange"
          theme="filled"
        />
      </div>

      <!-- 产品参数 -->
      <div class="specs-card" v-if="product.category">
        <div class="specs-pattern"></div>
        <div class="specs-content">
          <h3 class="specs-title">产品参数</h3>
          <div class="specs-list">
            <div class="specs-item">
              <span class="specs-label">商品分类</span>
              <span class="specs-value">{{ product.category?.name }}</span>
            </div>
            <div class="specs-item" v-if="product.unit">
              <span class="specs-label">销售单位</span>
              <span class="specs-value">{{ product.unit }}</span>
            </div>
            <div class="specs-item" v-if="product.unitConversion && product.unitConversion > 1">
              <span class="specs-label">进货规格</span>
              <span class="specs-value highlight">1{{ product.purchaseUnit }} = {{ product.unitConversion }}{{ product.unit }}</span>
            </div>
            <div class="specs-item">
              <span class="specs-label">商品编号</span>
              <span class="specs-value">{{ product.id }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 拼多多风格用户评价模块 -->
      <div class="pdd-review-section">
        <div class="pdd-review-header">
          <div class="pdd-review-title">
            <span>商品评价</span>
            <span class="review-count">({{ reviewCount }})</span>
          </div>
          <div class="pdd-review-rate">好评率 <span class="rate-num">99%</span></div>
          <div class="pdd-review-more">查看全部 <span class="material-symbols-outlined">chevron_right</span></div>
        </div>
        <div class="pdd-review-list">
          <div class="pdd-review-item" v-for="(review, index) in mockReviews" :key="index">
            <div class="review-user">
              <span class="review-avatar">{{ review.name }}</span>
              <span class="review-name">{{ review.name }}***</span>
              <span class="review-time">{{ review.time }}</span>
            </div>
            <div class="review-content">{{ review.content }}</div>
          </div>
        </div>
      </div>

      <!-- 结构化卖点展示 -->
      <div class="selling-points-card">
        <div class="sp-header">
          <span class="sp-icon">💡</span>
          <h3 class="sp-title">核心卖点</h3>
        </div>
        <div class="sp-list">
          <div class="sp-item" v-for="(point, index) in sellingPoints" :key="index">
            <div class="sp-item-icon">{{ point.icon }}</div>
            <div class="sp-item-content">
              <h4>{{ point.title }}</h4>
              <p>{{ point.desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 使用场景模块（新增） -->
      <div class="usage-scenes-card">
        <div class="scenes-header">
          <span class="scenes-icon">🎯</span>
          <h3 class="scenes-title">适用场景</h3>
        </div>
        <div class="scenes-tags">
          <span class="scene-tag" v-for="(scene, index) in usageScenes" :key="index">
            <span class="scene-tag-icon">{{ scene.icon }}</span>
            <span>{{ scene.name }}</span>
          </span>
        </div>
      </div>

      <!-- 商品卖点（保留原有文字描述） -->
      <div class="highlights-card" v-if="product.description">
        <div class="highlights-header">
          <span class="material-symbols-outlined">emoji_objects</span>
          <h3 class="highlights-title">商品描述</h3>
        </div>
        <div class="highlights-content">
          <p class="highlights-text">{{ product.description }}</p>
        </div>
      </div>

      <!-- 商品详情 -->
      <div class="detail-card" v-if="product.detail">
        <div class="detail-header">商品详情</div>
        <div class="detail-content" v-html="safeProductDetail"></div>
      </div>

      <!-- 拼多多风格底部操作栏 -->
      <div class="pdd-bottom-bar">
        <div class="pdd-bar-icons">
          <button class="pdd-icon-btn" @click="goShop">
            <span class="material-symbols-outlined">storefront</span>
            <span class="icon-label">门店</span>
          </button>
          <button class="pdd-icon-btn" @click="contactService">
            <span class="material-symbols-outlined">headset_mic</span>
            <span class="icon-label">客服</span>
          </button>
          <button class="pdd-icon-btn" :class="{ collected: isCollected }" @click="toggleCollect">
            <span class="material-symbols-outlined">{{ isCollected ? 'favorite' : 'favorite_border' }}</span>
            <span class="icon-label">收藏</span>
          </button>
        </div>
        <div class="pdd-bar-buttons">
          <button class="pdd-btn-cart" @click="addToCart" :disabled="availableStock < 1">
            加入心愿单
          </button>
          <button class="pdd-btn-buy" @click="buyNow" :disabled="availableStock < 1">
            立即预约
          </button>
        </div>
      </div>
    </template>

  </div>
</template>

<style scoped>
.product-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: calc(70px + env(safe-area-inset-bottom));
}

/* ========== 拼多多风格沉浸式导航栏 ========== */
.nav-bar-immersive {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
  background: transparent;
}

.nav-bar-immersive .nav-back {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

.nav-bar-immersive .nav-back .material-symbols-outlined {
  font-size: 20px;
  color: white;
}

.nav-bar-immersive .nav-actions {
  display: flex;
  gap: 8px;
}

.nav-bar-immersive .nav-btn {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

.nav-bar-immersive .nav-btn .material-symbols-outlined {
  font-size: 20px;
  color: white;
}

.nav-bar-immersive .cart-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  background: #F40;
  color: white;
  font-size: 10px;
  font-weight: 700;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

/* ========== 拼多多风格图片区域 ========== */
.pdd-image-section {
  position: relative;
  width: 100%;
  background: #f5f5f5;
}

.pdd-swiper {
  width: 100%;
  height: 100vw;
}

.pdd-swiper :deep(.t-swiper) {
  height: 100vw !important;
}

.pdd-swiper :deep(.t-swiper__container) {
  height: 100vw !important;
}

.pdd-swiper :deep(.t-swiper-item) {
  height: 100vw !important;
}

.pdd-product-image {
  width: 100%;
  height: 100vw;
  object-fit: cover;
  display: block;
}

.pdd-image-counter {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

/* ========== 【2026-01-23】视频轮播样式 ========== */
.video-slide {
  position: relative;
  width: 100%;
  height: 100vw;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 播放按钮遮罩 */
.video-play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.play-btn {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;
}

.play-btn:active {
  transform: scale(0.95);
}

.play-btn .material-symbols-outlined {
  font-size: 40px;
  color: #F40;
  margin-left: 4px; /* 视觉居中调整 */
}

/* 暂停点击区域 */
.video-pause-area {
  position: absolute;
  inset: 0;
  cursor: pointer;
}

/* 视频时长标签 */
.video-duration-badge {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 视频缓冲加载状态 */
.video-buffering {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  gap: 12px;
  font-size: 14px;
  z-index: 10;
}

/* HLS画质标签 */
.video-quality-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.7);
  color: #52c41a;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 5;
}

/* 自定义视频控制条 */
.video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: 20px 12px 12px;
  opacity: 0;
  transform: translateY(100%);
  transition: opacity 0.3s ease, transform 0.3s ease;
  z-index: 15;
}

.video-controls.controls-visible {
  opacity: 1;
  transform: translateY(0);
}

/* 进度条容器（扩大触摸区域） */
.progress-wrapper {
  padding: 12px 0;
  margin: -12px 0 4px;
  cursor: pointer;
  touch-action: none;
  position: relative;
}

/* 进度条 */
.video-progress {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  touch-action: none;
  margin: 0;
  display: block;
}

.video-progress::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  margin-top: -6px;
}

.video-progress::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.video-progress::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.3);
}

.video-progress::-moz-range-track {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.3);
}

/* 控制按钮行 */
.controls-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn .material-symbols-outlined {
  font-size: 28px;
}

.time-display {
  color: white;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.quality-tag {
  margin-left: auto;
  background: rgba(82, 196, 26, 0.9);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

/* 媒体计数器（替代原图片计数器） */
.pdd-media-counter {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  backdrop-filter: blur(4px);
}

.pdd-media-counter .video-indicator {
  font-size: 14px;
}

/* ========== 拼多多风格促销信息条 ========== */
.pdd-promo-banner {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #FFF7E6 0%, #FFFBE6 100%);
  border-bottom: 1px solid rgba(250, 140, 22, 0.2);
}

.promo-icon {
  font-size: 14px;
  color: #52c41a;
  margin-right: 6px;
}

.promo-highlight {
  color: #FA8C16;
  font-weight: 700;
  font-size: 13px;
}

.promo-desc {
  color: #666;
  font-size: 13px;
  flex: 1;
}

.promo-arrow {
  font-size: 18px;
  color: #999;
}

/* ========== 拼多多风格价格区域 ========== */
.pdd-price-section {
  padding: 16px;
  background: linear-gradient(180deg, #FFF1F0 0%, #FFFFFF 100%);
}

.pdd-price-main {
  display: flex;
  align-items: baseline;
}

.pdd-currency {
  font-size: 18px;
  font-weight: 700;
  color: #F40;
}

.pdd-price-integer {
  font-size: 36px;
  font-weight: 800;
  color: #F40;
  line-height: 1;
  letter-spacing: -2px;
}

.pdd-price-decimal {
  font-size: 18px;
  font-weight: 700;
  color: #F40;
}

.pdd-price-meta {
  margin-left: 12px;
  font-size: 12px;
  color: #999;
}

.pdd-price-compare {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.pdd-original-price {
  font-size: 14px;
  color: #999;
  text-decoration: line-through;
}

.pdd-save-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: linear-gradient(135deg, #52C41A, #73D13D);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}

.pdd-promo-tags {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.pdd-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
}

.pdd-tag.red {
  background: #FFF1F0;
  color: #F40;
  border: 1px solid #FFCCC7;
}

.pdd-tag.orange {
  background: #FFF7E6;
  color: #FA8C16;
  border: 1px solid #FFE7BA;
}

.pdd-tag.green {
  background: #F6FFED;
  color: #52C41A;
  border: 1px solid #B7EB8F;
}

/* ========== 商品标题区 ========== */
.pdd-title-section {
  padding: 12px 16px;
  background: white;
  border-bottom: none;
}

/* ========== 【2026-01-22】一句话核心卖点 ========== */
.main-slogan-section {
  padding: 0 16px 12px;
  background: white;
}

.slogan-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #FFF7E6 0%, #FFE7BA 100%);
  border-radius: 10px;
  border: 1px solid rgba(250, 173, 20, 0.3);
}

.slogan-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.slogan-text {
  font-size: 14px;
  font-weight: 600;
  color: #D46B08;
  line-height: 1.4;
}

/* ========== 【2026-01-22】服务承诺条 ========== */
.service-commitments {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border-bottom: 8px solid #f5f5f5;
}

.service-commitments .commitment-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #52c41a;
  font-weight: 500;
}

.service-commitments .commitment-item .material-symbols-outlined {
  font-size: 14px;
  color: #52c41a;
}

.pdd-title-main {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.pdd-title-tag {
  flex-shrink: 0;
  display: inline-block;
  padding: 2px 6px;
  background: #F40;
  color: white;
  font-size: 10px;
  font-weight: 700;
  border-radius: 2px;
  margin-top: 4px;
}

/* 【2026-01-26】特价商品标签 */
.pdd-title-tag.special-price-tag {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
}

.pdd-product-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.5;
  margin: 0;
}

.pdd-product-desc {
  font-size: 13px;
  color: #999;
  margin: 8px 0 0;
  line-height: 1.5;
}


/* ========== 推销员信息卡 ========== */
.pdd-salesperson-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  margin-bottom: 8px;
  border-bottom: 8px solid #f5f5f5;
}

.sp-avatar {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFE0E0, #FFEAE6);
  border-radius: 50%;
  margin-right: 12px;
}

.sp-avatar .material-symbols-outlined {
  font-size: 28px;
  color: #F40;
}

.sp-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: #F40;
  color: white;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 4px;
  border-radius: 4px;
}

.sp-info {
  flex: 1;
}

.sp-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.sp-stats {
  font-size: 12px;
  color: #999;
}

.sp-divider {
  margin: 0 6px;
}

.sp-contact-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #F40, #E02020);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.sp-contact-btn .material-symbols-outlined {
  font-size: 16px;
}

/* ========== 拼多多风格评价模块 ========== */
.pdd-review-section {
  margin: 8px 0;
  background: white;
}

.pdd-review-header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.pdd-review-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.pdd-review-title .review-count {
  font-size: 13px;
  color: #999;
  font-weight: 400;
}

.pdd-review-rate {
  margin-left: 16px;
  font-size: 13px;
  color: #666;
}

.pdd-review-rate .rate-num {
  color: #F40;
  font-weight: 600;
}

.pdd-review-more {
  margin-left: auto;
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #999;
}

.pdd-review-more .material-symbols-outlined {
  font-size: 16px;
}

.pdd-review-list {
  padding: 0 16px 16px;
}

.pdd-review-item {
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.pdd-review-item:last-child {
  border-bottom: none;
}

.review-user {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.review-avatar {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFE0E0, #FFEAE6);
  color: #F40;
  font-size: 12px;
  font-weight: 600;
  border-radius: 50%;
}

.review-name {
  font-size: 13px;
  color: #333;
}

.review-time {
  font-size: 12px;
  color: #999;
  margin-left: auto;
}

.review-content {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}

/* ========== 拼多多风格底部操作栏 ========== */
.pdd-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  background: white;
  border-top: 1px solid #f0f0f0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.pdd-bar-icons {
  display: flex;
  gap: 16px;
}

.pdd-icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
}

.pdd-icon-btn .material-symbols-outlined {
  font-size: 22px;
  color: #666;
}

.pdd-icon-btn.collected .material-symbols-outlined {
  color: #F40;
  font-variation-settings: 'FILL' 1;
}

.pdd-icon-btn .icon-label {
  font-size: 10px;
  color: #666;
}

.pdd-bar-buttons {
  flex: 1;
  display: flex;
  gap: 8px;
  margin-left: 16px;
}

.pdd-btn-cart {
  flex: 1;
  height: 44px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #5D4200;
  border: none;
  border-radius: 22px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.pdd-btn-buy {
  flex: 1;
  height: 44px;
  background: linear-gradient(135deg, #F40 0%, #E02020 100%);
  color: white;
  border: none;
  border-radius: 22px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.pdd-btn-cart:disabled,
.pdd-btn-buy:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pdd-btn-cart:active,
.pdd-btn-buy:active {
  transform: scale(0.98);
}

/* 保留旧的导航栏样式但不使用 */
.nav-bar {
  display: none;
}

.cart-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  background: #F40;
  color: white;
  font-size: 10px;
  font-weight: 700;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

/* 加载中 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

/* 图片区域 */
.image-section {
  position: relative;
  background: white;
}

.product-image {
  width: 100%;
  height: 375px;
  object-fit: cover;
}

.image-indicator {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 1px;
}

/* 商品视频区域 */
.product-video-section {
  margin: 16px 16px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.video-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.video-header .material-symbols-outlined {
  font-size: 20px;
  color: var(--primary, #EF062D);
}

.video-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #181111);
}

.video-player {
  width: 100%;
  border-radius: 8px;
  background: #000;
  max-height: 375px;
}

.video-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.video-tip .material-symbols-outlined {
  font-size: 16px;
  color: var(--text-secondary, #666);
}

/* 信息卡片 - 喜庆升级 */
.info-card {
  margin: -24px 16px 16px;
  position: relative;
  z-index: 10;
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 12px 40px rgba(239, 6, 45, 0.12);
  border: 1px solid rgba(239, 6, 45, 0.08);
  overflow: hidden;
}

/* 卡片装饰 */
.info-card::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 12px;
}

.price-symbol {
  font-size: 22px;
  font-weight: 700;
  color: var(--primary, #EF062D);
}

.price-value {
  font-size: 40px;
  font-weight: 900;
  color: var(--primary, #EF062D);
  letter-spacing: -2px;
  text-shadow: 0 2px 4px rgba(239, 6, 45, 0.2);
}

.price-original {
  margin-left: 8px;
  font-size: 14px;
  color: #999;
  text-decoration: line-through;
}

/* 省钱信息 */
.save-info {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 12px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  color: white;
  font-size: 12px;
  font-weight: 700;
  border-radius: 12px;
}

.save-info .material-symbols-outlined {
  font-size: 14px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 代理专享价标签 - 渐变样式 */
.tag.agent-tag {
  background: linear-gradient(135deg, #EF062D 0%, #ff4d6d 100%);
  color: white;
  padding: 5px 12px;
  border-radius: 6px;
}

.tag.agent-tag .material-symbols-outlined {
  font-size: 12px;
}

/* 热销标签 */
.tag.hot-tag.hot {
  background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%);
  color: white;
}

/* 限量标签 */
.tag.hot-tag.limited {
  background: linear-gradient(135deg, #722ed1 0%, #b37feb 100%);
  color: white;
}

.tag.primary {
  background: rgba(233, 12, 31, 0.1);
  color: var(--primary, #EF062D);
}

.tag.gold {
  background: rgba(212, 175, 55, 0.1);
  color: var(--gold, #D4AF37);
}

.product-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #181111);
  line-height: 1.4;
  margin-bottom: 8px;
}

.product-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

/* 服务卡片 */
.service-card {
  margin: 0 16px 16px;
  background: white;
  border-radius: 16px;
  padding: 16px 20px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.service-header {
  margin-bottom: 12px;
}

.service-title {
  font-size: 12px;
  font-weight: 700;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 2px;
}

/* 服务图标 - 横排布局 */
.service-icons {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.service-icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.service-icon-item .material-symbols-outlined {
  font-size: 22px;
  color: var(--primary, #EF062D);
}

.service-icon-item .service-text {
  font-size: 10px;
  color: #666;
  white-space: nowrap;
}

/* 库存状态行 */
.stock-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stock-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.stock-status .material-symbols-outlined {
  font-size: 16px;
}

.sales-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #999;
}

.sales-count .material-symbols-outlined {
  font-size: 16px;
  color: #52c41a;
}

.service-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--text-primary, #181111);
}

.service-item .material-symbols-outlined {
  font-size: 20px;
  color: var(--primary, #EF062D);
}

.service-item .divider {
  color: #ddd;
}

/* 数量卡片 */
.quantity-card {
  margin: 0 16px 16px;
  background: white;
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.quantity-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #181111);
}

/* 参数卡片 */
.specs-card {
  margin: 0 16px 16px;
  background: white;
  border-radius: 16px;
  padding: 16px 20px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.specs-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(var(--primary, #EF062D) 0.5px, transparent 0.5px);
  background-size: 24px 24px;
  opacity: 0.03;
  pointer-events: none;
}

/* 商品卖点卡片 */
.highlights-card {
  margin: 0 16px 16px;
  background: linear-gradient(135deg, #FFF9E6 0%, #FFF5F5 100%);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(239, 6, 45, 0.1);
  box-shadow: 0 2px 8px rgba(239, 6, 45, 0.08);
}

.highlights-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.highlights-header .material-symbols-outlined {
  font-size: 22px;
  color: var(--primary, #EF062D);
}

.highlights-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #181111);
  margin: 0;
}

.highlights-content {
  background: white;
  border-radius: 12px;
  padding: 16px;
  line-height: 1.8;
}

.highlights-text {
  font-size: 14px;
  color: var(--text-primary, #181111);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.specs-content {
  position: relative;
  z-index: 1;
}

.specs-title {
  font-size: 12px;
  font-weight: 700;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 16px;
}

.specs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.specs-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.specs-label {
  color: #999;
}

.specs-value {
  font-weight: 500;
  color: var(--text-primary, #181111);
}

.specs-value.highlight {
  color: var(--primary, #EF062D);
  font-weight: 600;
}

/* 详情卡片 */
.detail-card {
  margin: 0 16px 16px;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.detail-header {
  padding: 16px 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #181111);
  border-bottom: 1px solid #f5f5f5;
}

.detail-content {
  padding: 16px 20px;
  font-size: 14px;
  color: #666;
  line-height: 1.8;
}

.detail-content :deep(img) {
  max-width: 100%;
  height: auto;
}

/* 底部操作栏 - 喜庆升级 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, #FFFFFF 100%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(239, 6, 45, 0.1);
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 100;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.08);
}

.bar-icons {
  display: flex;
  gap: 16px;
}

.bar-icon-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  cursor: pointer;
}

.bar-icon-btn .material-symbols-outlined {
  font-size: 24px;
  color: #666;
}

.icon-label {
  font-size: 10px;
  color: #666;
}

.icon-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  background: var(--primary, #EF062D);
  color: white;
  font-size: 10px;
  font-weight: 700;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.bar-actions {
  flex: 1;
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  height: 52px;
  border: none;
  border-radius: 26px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:active {
  transform: scale(0.98);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.gold {
  background: linear-gradient(135deg, #FFD700 0%, #E1B12C 100%);
  color: #5D4200;
  box-shadow: 0 6px 20px rgba(225, 177, 44, 0.4);
}

.action-btn.primary {
  flex: 1.3;
  background: linear-gradient(135deg, #EF062D 0%, #9A0E26 100%);
  color: white;
  box-shadow: 0 6px 20px rgba(239, 6, 45, 0.4);
}

/* ========== 新增：价值主张卡片 ========== */
.value-headline-card {
  margin: 16px 16px 0;
  padding: 20px;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFF9E6 100%);
  border-radius: 16px;
  text-align: center;
  border: 1px solid rgba(239, 6, 45, 0.1);
}

.headline-tag {
  display: inline-block;
  padding: 6px 16px;
  background: linear-gradient(135deg, #EF062D 0%, #ff4d6d 100%);
  color: white;
  font-size: 12px;
  font-weight: 700;
  border-radius: 20px;
  margin-bottom: 12px;
}

.headline-text {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary, #181111);
  margin: 0 0 8px;
  line-height: 1.4;
}

.headline-subtext {
  font-size: 13px;
  color: #666;
  margin: 0;
}

/* ========== 新增：信任数据卡片 ========== */
.trust-data-card {
  margin: 16px 16px 0;
  padding: 16px 20px;
  background: white;
  border-radius: 16px;
  display: flex;
  justify-content: space-around;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.trust-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.trust-number {
  font-size: 22px;
  font-weight: 800;
  color: var(--primary, #EF062D);
}

.trust-label {
  font-size: 12px;
  color: #999;
}

/* ========== 新增：结构化卖点卡片 ========== */
.selling-points-card {
  margin: 16px 16px 0;
  padding: 20px;
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.sp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.sp-icon {
  font-size: 20px;
}

.sp-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #181111);
  margin: 0;
}

.sp-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sp-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #FAFAFA;
  border-radius: 12px;
}

.sp-item-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFF9E6 100%);
  border-radius: 10px;
  font-size: 20px;
  flex-shrink: 0;
}

.sp-item-content h4 {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #181111);
  margin: 0 0 4px;
}

.sp-item-content p {
  font-size: 12px;
  color: #666;
  margin: 0;
  line-height: 1.4;
}

/* ========== 新增：使用场景卡片 ========== */
.usage-scenes-card {
  margin: 16px 16px 0;
  padding: 20px;
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.scenes-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.scenes-icon {
  font-size: 20px;
}

.scenes-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #181111);
  margin: 0;
}

.scenes-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.scene-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFF9E6 100%);
  border-radius: 24px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #181111);
  border: 1px solid rgba(239, 6, 45, 0.1);
}

.scene-tag-icon {
  font-size: 16px;
}

/* ========== 秒杀专属样式 ========== */
.flash-sale-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #EF062D, #FF4D6D);
}

.flash-sale-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flash-sale-header .flash-icon {
  font-size: 20px;
}

.flash-sale-header .flash-title {
  font-size: 16px;
  font-weight: 800;
  color: white;
}

.flash-sale-header .flash-tag {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.flash-sale-limit {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
}

/* 秒杀价格样式增强 */
.pdd-price-section.flash-sale-price {
  background: linear-gradient(180deg, #FFF5F5, white);
}

.pdd-price-section.flash-sale-price .pdd-currency,
.pdd-price-section.flash-sale-price .pdd-price-integer,
.pdd-price-section.flash-sale-price .pdd-price-decimal {
  color: #EF062D;
}
</style>
