<script setup lang="ts">
/**
 * 砍价商品列表页面 - 拼多多风格重构
 * @since 2026-01-22
 * @updated 2026-01-23 UI重构为拼多多风格
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { getOptimizedImageUrl } from '../api'
import {
  getBargainConfig,
  getBargainProducts,
  createBargain,
  getEligibility,
  type BargainConfig,
  type BargainProductItem,
  type ThresholdCheckResult
} from '../api/bargain'
import { DialogPlugin } from 'tdesign-mobile-vue'
import { useUserStore } from '../stores/user'
import { get } from '../api'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 【2026-01-22】获取type参数，支持免费拿模式
const isFreeMode = computed(() => route.query.type === 'free')
const pageTitle = computed(() => isFreeMode.value ? '免费拿' : '分享领免单')

// 数据
const loading = ref(true)
const config = ref<BargainConfig | null>(null)
const products = ref<BargainProductItem[]>([])
// 【2026-01-23】门槛状态
const threshold = ref<ThresholdCheckResult | null>(null)
const thresholdLoading = ref(false)
// 【2026-01-22】根据模式筛选商品
const filteredProducts = computed(() => {
  if (isFreeMode.value) {
    // 免费拿模式：只显示底价为0的商品
    return products.value.filter(p => p.floorPrice === 0)
  }
  return products.value
})
const stores = ref<any[]>([])
const defaultStoreId = ref<number | null>(null)
const creating = ref(false)

// 【2026-01-24】活动说明弹窗
const showActivityRules = ref(false)

// 【2026-01-26】今日成功免单榜数据（真实感模拟）
const winnersData = ref([
  { name: '张*明', avatar: '张', time: '刚刚', product: '欢乐宝盒' },
  { name: '李*华', avatar: '李', time: '2分钟前', product: '马年大礼包' },
  { name: '王*芳', avatar: '王', time: '5分钟前', product: '加特林礼盒' },
  { name: '赵*伟', avatar: '赵', time: '8分钟前', product: '欢乐宝盒' },
  { name: '刘*娜', avatar: '刘', time: '12分钟前', product: '烟花套餐' },
  { name: '陈*强', avatar: '陈', time: '15分钟前', product: '新年礼包' },
])
const currentWinnerIndex = ref(0)

// 【2026-01-26】轮播显示获奖者
const visibleWinners = computed(() => {
  const winners = []
  for (let i = 0; i < 4; i++) {
    const index = (currentWinnerIndex.value + i) % winnersData.value.length
    winners.push(winnersData.value[index])
  }
  return winners
})

// 今日成功人数（动态增加真实感）
const todayWinCount = computed(() => {
  const baseCount = 156 + Math.floor(Math.random() * 20)
  return baseCount
})

// 【2026-01-23】选择提货日期弹窗
const showDateDialog = ref(false)
const pendingProductId = ref<number | null>(null)
const pendingProduct = ref<BargainProductItem | null>(null)
const selectedPickupDate = ref('')

// 【2026-01-23】第一刀转盘抽奖弹窗
const showFirstCutWheel = ref(false)
const firstCutSpinning = ref(false)
const firstCutAmount = ref(0)
const firstCutCode = ref('')
const firstCutRotation = ref(0)

// 转盘固定金额显示（仅用于展示，实际金额由后端计算）
const wheelAmounts = ref(['10', '20', '30', '15', '25', '35', '18', '28'])
const targetSegmentIndex = ref(0) // 目标落点索引

// 生成可选日期列表（从明天开始，7天内）
const availableDates = computed(() => {
  const dates: { label: string; value: string }[] = []
  const today = new Date()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const value = date.toISOString().split('T')[0] as string
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekDay = weekDays[date.getDay()] || '周日'
    let label = `${month}月${day}日 ${weekDay}`
    if (i === 1) label += '（明天）'
    if (i === 2) label += '（后天）'
    dates.push({ label, value })
  }
  return dates
})

// 加载砍价配置
const loadConfig = async () => {
  try {
    config.value = await getBargainConfig()
  } catch {
    Toast({ message: '加载配置失败', theme: 'error' })
  }
}

// 加载砍价商品
// 【2026-01-26修复】不传configId，让后端返回所有活动的商品
const loadProducts = async () => {
  loading.value = true
  try {
    // 不传configId，获取所有活动配置的商品
    products.value = await getBargainProducts()
  } catch {
    Toast({ message: '加载商品失败', theme: 'error' })
  } finally {
    loading.value = false
  }
}

// 加载门店列表（获取默认门店ID）
const loadStores = async () => {
  try {
    const res = await get<any[]>('/warehouses')
    stores.value = res.data || []
    if (stores.value.length > 0) {
      defaultStoreId.value = stores.value[0].id
    }
  } catch {
    // 忽略
  }
}

// 【2026-01-23】加载采购单门槛状态
const loadThreshold = async () => {
  if (!userStore.isLoggedIn || !config.value?.activeConfig) return

  thresholdLoading.value = true
  try {
    threshold.value = await getEligibility(config.value.activeConfig.id)
  } catch (error) {
    console.error('[砍价] 获取门槛状态失败:', error)
    // 门槛获取失败时不阻止用户操作
    threshold.value = null
  } finally {
    thresholdLoading.value = false
  }
}

// 点击商品发起砍价
const onStartBargain = async (product: BargainProductItem) => {
  if (!userStore.isLoggedIn) {
    Toast({ message: '请先登录', theme: 'warning' })
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }

  if (!product.available) {
    Toast({ message: '该商品暂时无法参与砍价', theme: 'warning' })
    return
  }

  // 【2026-01-23】检查门槛状态
  if (threshold.value && threshold.value.requiredAmount > 0 && !threshold.value.eligible) {
    Toast({ message: `采购单需满¥${threshold.value.requiredAmount}才能参与活动`, theme: 'warning' })
    return
  }

  // 显示日期选择弹窗
  pendingProductId.value = product.productId
  pendingProduct.value = product
  selectedPickupDate.value = availableDates.value[0]?.value || ''
  showDateDialog.value = true
}

// 确认发起砍价
const confirmStartBargain = async () => {
  // 【2026-01-27修复】使用商品所属的configId而非默认第一个活动
  const productConfigId = pendingProduct.value?.configId || config.value?.activeConfig?.id
  if (!pendingProductId.value || !defaultStoreId.value || !productConfigId || !selectedPickupDate.value) {
    Toast({ message: '请选择提货日期', theme: 'warning' })
    return
  }

  creating.value = true
  try {
    const result = await createBargain({
      productId: pendingProductId.value,
      configId: productConfigId, // 【2026-01-27修复】使用商品对应的活动ID
      storeId: defaultStoreId.value,
      pickupDate: selectedPickupDate.value,
      quantity: 1
    })

    showDateDialog.value = false

    // 【2026-01-23】显示第一刀转盘动画
    firstCutAmount.value = result.firstCutAmount || 0
    firstCutCode.value = result.code
    showFirstCutWheel.value = true

    // 延迟启动转盘动画
    setTimeout(() => {
      startFirstCutSpin()
    }, 300)
  } catch (error: any) {
    // 【2026-01-23】处理已有进行中砍价的情况
    const existingCode = error?.response?.data?.data?.existingCode
    const thresholdInfo = error?.response?.data?.data?.thresholdInfo
    const errorCode = error?.response?.data?.code

    if (existingCode) {
      showDateDialog.value = false
      // 显示对话框询问是否跳转到已有砍价
      const dialog = DialogPlugin.confirm({
        title: '提示',
        content: '您有一个砍价活动正在进行中，是否查看？',
        confirmBtn: '查看砍价',
        cancelBtn: '稍后再说',
        onConfirm: () => {
          dialog.destroy()
          router.push(`/bargain/${existingCode}`)
        },
        onCancel: () => {
          dialog.destroy()
        }
      })
    } else if (errorCode === 40003 && thresholdInfo) {
      // 【2026-01-23】门槛不满足
      showDateDialog.value = false
      Toast({
        message: `采购单需满¥${thresholdInfo.requiredAmount}，当前¥${thresholdInfo.currentCartAmount}，还差¥${thresholdInfo.difference}`,
        theme: 'warning'
      })
      // 刷新门槛状态
      await loadThreshold()
    } else {
      Toast({ message: error.message || '发起失败', theme: 'error' })
    }
  } finally {
    creating.value = false
  }
}

// 【2026-01-23】转盘样式（使用computed避免CSS覆盖问题）
const wheelBgStyle = computed(() => {
  return {
    transform: `rotate(${firstCutRotation.value}deg)`,
    transition: firstCutSpinning.value ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
  }
})

// 【2026-01-23】生成"幸运感"转盘金额（简化版）
// 核心逻辑：
// 1. 实际金额固定放在index=0位置
// 2. 其他位置放比实际金额小的"陪跑金额"
// 3. 转盘旋转后指针对准index=0，用户看到最大金额
const generateLuckyWheelAmounts = (actualAmount: number): string[] => {
  const displayAmounts: string[] = []

  for (let i = 0; i < 8; i++) {
    if (i === 0) {
      // index=0位置：放实际金额（精确到两位小数）
      displayAmounts.push(actualAmount.toFixed(2))
    } else {
      // 其他位置：生成比实际金额小的随机整数
      const ratio = 0.15 + Math.random() * 0.6 // 15%~75%
      const decoyAmount = Math.max(1, Math.floor(actualAmount * ratio))
      displayAmounts.push(String(decoyAmount))
    }
  }

  return displayAmounts
}

// 【2026-01-23】启动第一刀转盘动画（简化版）
const startFirstCutSpin = () => {
  // 生成"幸运感"转盘金额
  // 实际金额固定在index=0，其他位置是陪跑金额
  wheelAmounts.value = generateLuckyWheelAmounts(firstCutAmount.value)
  targetSegmentIndex.value = 0 // 目标永远是index=0

  // 转盘角度计算（简化版）：
  // - 指针固定在12点钟方向（CSS坐标270度，即-90度）
  // - 分区在模板中的角度 = index * 45 + 22.5（相对于3点钟方向）
  // - index=0的分区在22.5度位置
  // - 要让index=0对准12点钟（270度），转盘需要旋转: 270 - 22.5 = 247.5度
  // - 加上多圈旋转制造动画效果
  const rotations = 5 + Math.floor(Math.random() * 3) // 5-7圈
  const angleToTop = 247.5 // index=0对准指针的角度
  const finalAngle = rotations * 360 + angleToTop

  console.log('[转盘] 实际金额:', firstCutAmount.value.toFixed(2), '旋转角度:', finalAngle)

  // 开始动画
  firstCutSpinning.value = true
  // 使用 requestAnimationFrame 确保过渡生效
  requestAnimationFrame(() => {
    firstCutRotation.value = finalAngle
  })

  // 动画结束后显示结果
  setTimeout(() => {
    firstCutSpinning.value = false
  }, 3500)
}

// 【2026-01-23】转盘结果确认后跳转
const onFirstCutComplete = () => {
  showFirstCutWheel.value = false
  router.push(`/bargain/${firstCutCode.value}`)
}

// 返回
const goBack = () => {
  router.back()
}

// 格式化价格
const formatPrice = (price: number) => {
  return price.toFixed(2)
}

// 计算库存进度
const getStockProgress = (product: BargainProductItem) => {
  if (!product.bargainStock) return 50
  const remaining = product.bargainStock - product.soldCount
  return Math.min(100, Math.max(5, 100 - (remaining / product.bargainStock) * 100))
}

// 获取库存状态文字
const getStockText = (product: BargainProductItem) => {
  const remaining = product.bargainStock - product.soldCount
  if (remaining <= 5) return '即将抢光'
  return `仅剩 ${remaining} 件`
}

// 【2026-01-26】榜单轮播定时器
let winnersTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await loadConfig()
  await Promise.all([loadProducts(), loadStores()])
  // 加载门槛状态
  await loadThreshold()

  // 【2026-01-26】启动榜单轮播
  winnersTimer = setInterval(() => {
    currentWinnerIndex.value = (currentWinnerIndex.value + 1) % winnersData.value.length
  }, 3000)
})

onUnmounted(() => {
  // 清理定时器
  if (winnersTimer) {
    clearInterval(winnersTimer)
    winnersTimer = null
  }
})
</script>

<template>
  <div class="bargain-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">
        <span class="back-icon">‹</span>
      </div>
      <div class="nav-title">{{ pageTitle }}</div>
      <div class="nav-right" @click="showActivityRules = true">
        <span class="help-icon">?</span>
      </div>
    </div>

    <!-- 【2026-01-26】Hero区域 - 红色主视觉 -->
    <div class="hero-section">
      <div class="hero-decorations">
        <div class="deco-circle deco-1"></div>
        <div class="deco-circle deco-2"></div>
      </div>
      <div class="hero-content">
        <h1 class="hero-title">{{ isFreeMode ? '免费拿好货' : '分享领免单' }}</h1>
        <div class="hero-subtitle">过年烟花不要钱 · 邀请好友助力</div>
        <div class="social-proof">
          <div class="proof-bubble">
            <span>{{ winnersData[currentWinnerIndex]?.name || '用户' }}刚刚{{ winnersData[currentWinnerIndex]?.product || '商品' }}砍价成功</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 【2026-01-26】今日成功免单榜 -->
    <div class="winners-section">
      <div class="winners-card">
        <div class="winners-header">
          <span class="winners-title"><span class="trophy-icon">🏆</span> 今日成功免单榜</span>
          <span class="winners-count">已有{{ todayWinCount }}人成功</span>
        </div>
        <div class="winners-scroll-container">
          <div class="winners-scroll">
            <div class="winner-item" v-for="(winner, index) in visibleWinners" :key="index">
              <div class="winner-avatar">{{ winner?.avatar || '🎉' }}</div>
              <div class="winner-info">{{ winner?.name || '用户' }} · {{ winner?.time || '刚刚' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 精选爆款标题 -->
    <div class="section-header">
      <h2 class="section-title">
        <span class="title-bar"></span>
        精选爆款 0元拿
      </h2>
      <span class="view-all" @click="router.push('/my-bargains')">我的砍价 ></span>
    </div>

    <!-- 加载中 -->
    <div class="loading-wrap" v-if="loading">
      <t-loading theme="circular" size="48px" />
    </div>

    <!-- 商品列表 -->
    <div class="products-list" v-else-if="filteredProducts.length > 0">
      <div
        v-for="(product, index) in filteredProducts"
        :key="product.id"
        :class="['product-card', { disabled: !product.available }]"
        @click="onStartBargain(product)"
      >
        <!-- 热销标签 -->
        <div class="hot-tag" v-if="index === 0">热销榜NO.1</div>

        <div class="product-image">
          <img :src="getOptimizedImageUrl(product.productImage, 'medium')" alt="" />
          <!-- 【2026-01-23】视频标识 -->
          <div class="video-badge" v-if="product.videoUrl">
            <span class="material-symbols-outlined">play_circle</span>
          </div>
        </div>

        <div class="product-info">
          <div class="info-top">
            <h3 class="product-name">{{ product.productName }}</h3>
            <p class="sold-count">{{ product.soldCount || 0 }}人已免费拿</p>
          </div>

          <div class="info-bottom">
            <!-- 价格 -->
            <div class="price-row">
              <span class="floor-price">¥{{ product.floorPrice === 0 ? '0' : formatPrice(product.floorPrice) }}</span>
              <span class="original-price">¥{{ formatPrice(product.originalPrice) }}</span>
            </div>

            <!-- 进度条和按钮 -->
            <div class="action-row">
              <div class="progress-section">
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{ width: `${getStockProgress(product)}%` }"
                  ></div>
                </div>
                <span class="stock-text" :class="{ urgent: (product.bargainStock - product.soldCount) <= 5 }">
                  {{ getStockText(product) }}
                </span>
              </div>
              <button class="action-btn" :disabled="!product.available">
                {{ product.floorPrice === 0 ? '0元拿' : '0元参与' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else-if="!loading">
      <span class="empty-icon">📦</span>
      <p>暂无活动商品</p>
    </div>

    <!-- 悬浮分享按钮 -->
    <div class="float-btn" @click="router.push('/my-bargains')">
      <span>📋</span>
    </div>

    <!-- 【2026-01-23】第一刀转盘抽奖弹窗 -->
    <div class="first-cut-overlay" v-if="showFirstCutWheel" @click.self="!firstCutSpinning && onFirstCutComplete()">
      <div class="first-cut-popup">
        <!-- 顶部装饰 -->
        <div class="popup-header">
          <div class="header-decorations">
            <span class="star star-1">⭐</span>
            <span class="star star-2">✨</span>
            <span class="star star-3">🎉</span>
          </div>
          <h2 class="popup-title">恭喜！首次助力</h2>
        </div>

        <!-- 转盘区域 -->
        <div class="wheel-area">
          <div class="wheel-container">
            <!-- 转盘背景 -->
            <div
              class="wheel-bg"
              :style="wheelBgStyle"
            >
              <div class="wheel-segment" v-for="(amount, index) in wheelAmounts" :key="index" :style="{ transform: `rotate(${index * 45 + 22.5}deg)` }">
                <span class="segment-text">¥{{ amount }}</span>
              </div>
            </div>

            <!-- 中心指针 -->
            <div class="wheel-center">
              <div class="center-pointer">▼</div>
              <div class="center-circle">
                <span v-if="firstCutSpinning">进行中</span>
                <span v-else>成功啦</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 结果展示 -->
        <div class="cut-result" :class="{ show: !firstCutSpinning }">
          <div class="result-label">恭喜砍掉</div>
          <div class="result-amount">
            <span class="currency">¥</span>
            <span class="number">{{ firstCutAmount.toFixed(2) }}</span>
          </div>
          <div class="result-tip">邀请好友继续助力，更快拿免费！</div>
        </div>

        <!-- 操作按钮 -->
        <div class="popup-actions">
          <button
            class="action-btn primary"
            :disabled="firstCutSpinning"
            @click="onFirstCutComplete"
          >
            {{ firstCutSpinning ? '进行中...' : '邀请好友继续助力' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 【2026-01-24】活动说明弹窗 -->
    <t-popup v-model="showActivityRules" placement="center">
      <div class="rules-popup">
        <div class="rules-header">
          <span class="rules-title">活动说明</span>
          <span class="close-btn" @click="showActivityRules = false">×</span>
        </div>
        <div class="rules-content">
          <div class="rule-section">
            <h4>一、活动流程</h4>
            <p>1. 选择商品，确认提货日期</p>
            <p>2. 分享给好友，邀请助力</p>
            <p>3. 进度达标后，到店免费领取</p>
          </div>
          <div class="rule-section">
            <h4>二、参与规则</h4>
            <p>1. 每人同一时间限参与1个活动</p>
            <p>2. 每个商品每人限领1件</p>
            <p>3. 活动成功后需在24小时内确认</p>
            <p>4. 本活动商品需本人凭手机号到店领取，不可代领</p>
          </div>
          <div class="rule-section">
            <h4>三、免责声明</h4>
            <p>1. 本活动由蒙庆烟花主办，最终解释权归主办方所有</p>
            <p>2. 禁止使用任何技术手段影响活动公平性</p>
            <p>3. 如发现违规行为，主办方有权取消资格</p>
            <p>4. 活动商品数量有限，领完即止</p>
          </div>
          <div class="rule-section">
            <h4>四、联系方式</h4>
            <p>客服电话：13190531439 / 15849390600</p>
          </div>
        </div>
        <div class="rules-footer">
          <button class="confirm-btn" @click="showActivityRules = false">我知道了</button>
        </div>
      </div>
    </t-popup>

    <!-- 选择提货日期弹窗 -->
    <t-popup v-model="showDateDialog" placement="bottom">
      <div class="date-dialog">
        <div class="dialog-header">
          <span class="dialog-title">选择提货日期</span>
          <span class="close-btn" @click="showDateDialog = false">×</span>
        </div>

        <!-- 商品信息预览 -->
        <div class="product-preview" v-if="pendingProduct">
          <img :src="getOptimizedImageUrl(pendingProduct.productImage, 'small')" class="preview-image" />
          <div class="preview-info">
            <div class="preview-name">{{ pendingProduct.productName }}</div>
            <div class="preview-price">
              <span class="label">目标价</span>
              <span class="value" :class="{ free: pendingProduct.floorPrice === 0 }">
                {{ pendingProduct.floorPrice === 0 ? '免费' : '¥' + formatPrice(pendingProduct.floorPrice) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 日期选择列表 -->
        <div class="date-list">
          <div
            v-for="date in availableDates"
            :key="date.value"
            :class="['date-item', { active: selectedPickupDate === date.value }]"
            @click="selectedPickupDate = date.value"
          >
            <span class="date-label">{{ date.label }}</span>
            <span class="check-icon" v-if="selectedPickupDate === date.value">✓</span>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="confirm-btn" :disabled="creating" @click="confirmStartBargain">
            {{ creating ? '发起中...' : '确认，开始邀请好友' }}
          </button>
        </div>
      </div>
    </t-popup>
  </div>
</template>

<style scoped>
.bargain-page {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 80px;
}

/* 顶部导航 - 简洁白色风格 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
}

/* 简洁标题区域 */
.simple-header {
  padding: 32px 16px;
  text-align: center;
  background: #fff;
}

.simple-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.nav-back, .nav-right {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.back-icon {
  font-size: 28px;
  font-weight: 300;
  color: #333;
}

.help-icon {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.nav-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

/* Hero区域 */
.hero-section {
  background: #ff1438;
  padding: 16px 16px 40px;
  position: relative;
  overflow: hidden;
}

.hero-decorations {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.deco-1 {
  width: 120px;
  height: 120px;
  top: -60px;
  right: -40px;
}

.deco-2 {
  width: 100px;
  height: 100px;
  bottom: -50px;
  left: -30px;
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 20px 0;
}

.hero-title {
  font-size: 36px;
  font-weight: 900;
  color: #fff;
  letter-spacing: -2px;
  margin-bottom: 12px;
  font-style: italic;
}

.hero-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.1);
  display: inline-block;
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.social-proof {
  margin-top: 20px;
}

.proof-bubble {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  color: #fff;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

/* 今日成功免单榜 */
.winners-section {
  margin: -24px 16px 0;
  position: relative;
  z-index: 10;
}

.winners-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.winners-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.winners-title {
  font-size: 13px;
  font-weight: bold;
  color: #ff1438;
  display: flex;
  align-items: center;
  gap: 4px;
}

.trophy-icon {
  font-size: 14px;
}

.winners-count {
  font-size: 10px;
  color: #999;
}

/* 【2026-01-23】免单榜滚动容器 */
.winners-scroll-container {
  overflow: hidden;
  height: 80px;
}

.winners-scroll {
  display: flex;
  gap: 16px;
  padding: 8px 0;
  transition: transform 0.5s ease;
}

.winners-scroll::-webkit-scrollbar {
  display: none;
}

/* 滚动动画 */
.scroll-fade-enter-active,
.scroll-fade-leave-active {
  transition: all 0.5s ease;
}

.scroll-fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.scroll-fade-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.winner-item {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 64px;
}

.winner-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff1438, #ff6b8a);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  border: 2px solid rgba(255, 20, 56, 0.2);
}

.winner-info {
  font-size: 10px;
  color: #666;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

/* 精选爆款标题 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 16px 12px;
}

.section-title {
  font-size: 20px;
  font-weight: bold;
  color: #181012;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-bar {
  width: 4px;
  height: 24px;
  background: #ff1438;
  border-radius: 2px;
}

.view-all {
  font-size: 14px;
  font-weight: bold;
  color: #ff1438;
  cursor: pointer;
}

/* 加载中 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

/* 商品列表 */
.products-list {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid #f0f0f0;
  display: flex;
  gap: 16px;
  padding: 12px;
  position: relative;
  cursor: pointer;
}

.product-card:active {
  transform: scale(0.99);
}

.product-card.disabled {
  opacity: 0.6;
}

.hot-tag {
  position: absolute;
  top: 0;
  left: 0;
  background: #ff1438;
  color: #fff;
  font-size: 10px;
  font-weight: bold;
  padding: 4px 10px;
  border-radius: 0 0 12px 0;
  z-index: 5;
}

.product-image {
  position: relative;
  width: 128px;
  height: 128px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f5f5f5;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 【2026-01-23】视频标识 */
.product-image .video-badge {
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

.product-image .video-badge .material-symbols-outlined {
  font-size: 14px;
  color: white;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4px 0;
}

.info-top {
  margin-bottom: 8px;
}

.product-name {
  font-size: 14px;
  font-weight: bold;
  color: #181012;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 4px;
}

.sold-count {
  font-size: 10px;
  color: #999;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.floor-price {
  font-size: 22px;
  font-weight: bold;
  color: #ff1438;
  font-style: italic;
}

.original-price {
  font-size: 10px;
  color: #999;
  text-decoration: line-through;
}

.action-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.progress-section {
  flex: 1;
  margin-right: 12px;
}

.progress-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff9800, #ff1438);
  border-radius: 3px;
  transition: width 0.3s;
}

.stock-text {
  font-size: 9px;
  color: #ff9800;
  font-weight: 500;
}

.stock-text.urgent {
  color: #ff1438;
  font-weight: bold;
}

.action-btn {
  flex-shrink: 0;
  background: #ff1438;
  color: #fff;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 20, 56, 0.3);
}

.action-btn:disabled {
  opacity: 0.5;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #999;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state p {
  font-size: 14px;
}

/* 悬浮按钮 */
.float-btn {
  position: fixed;
  bottom: 100px;
  right: 16px;
  width: 48px;
  height: 48px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  z-index: 50;
  border: 1px solid #f0f0f0;
}

/* 日期选择弹窗 */
.date-dialog {
  background: #fff;
  border-radius: 16px 16px 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.dialog-title {
  font-size: 17px;
  font-weight: bold;
  color: #333;
}

.close-btn {
  font-size: 28px;
  color: #999;
  cursor: pointer;
  line-height: 1;
}

.product-preview {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: #f9f9f9;
}

.preview-image {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
}

.preview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.preview-name {
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-price {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.preview-price .label {
  font-size: 12px;
  color: #999;
}

.preview-price .value {
  font-size: 20px;
  font-weight: bold;
  color: #ff1438;
}

.preview-price .value.free {
  color: #52C41A;
}

.date-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
  max-height: 300px;
}

.date-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 12px;
  margin-bottom: 8px;
  background: #f9f9f9;
  cursor: pointer;
}

.date-item:active {
  opacity: 0.9;
}

.date-item.active {
  background: #fff5f5;
  border: 1px solid #ff1438;
}

.date-label {
  font-size: 15px;
  color: #333;
}

.check-icon {
  color: #ff1438;
  font-weight: bold;
  font-size: 18px;
}

.dialog-footer {
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}

.confirm-btn {
  width: 100%;
  height: 50px;
  background: linear-gradient(135deg, #ff1438 0%, #ff6b8a 100%);
  border: none;
  border-radius: 25px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(255, 20, 56, 0.3);
}

.confirm-btn:disabled {
  opacity: 0.6;
}

/* 【2026-01-23】第一刀转盘弹窗样式 */
.first-cut-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.first-cut-popup {
  background: linear-gradient(180deg, #FF4B4B 0%, #FF1438 100%);
  border-radius: 24px;
  padding: 24px;
  width: 100%;
  max-width: 340px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.popup-header {
  position: relative;
  margin-bottom: 20px;
}

.header-decorations {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.header-decorations .star {
  position: absolute;
  font-size: 20px;
  animation: twinkle 1.5s ease-in-out infinite;
}

.star-1 { top: -10px; left: 10%; animation-delay: 0s; }
.star-2 { top: -5px; right: 15%; animation-delay: 0.5s; }
.star-3 { top: 5px; left: 50%; animation-delay: 1s; }

@keyframes twinkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.popup-title {
  color: #fff;
  font-size: 22px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 转盘区域 */
.wheel-area {
  padding: 20px 0;
}

.wheel-container {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  position: relative;
}

.wheel-bg {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: conic-gradient(
    #FFD700 0deg 45deg,
    #FFA500 45deg 90deg,
    #FFD700 90deg 135deg,
    #FFA500 135deg 180deg,
    #FFD700 180deg 225deg,
    #FFA500 225deg 270deg,
    #FFD700 270deg 315deg,
    #FFA500 315deg 360deg
  );
  border: 6px solid #fff;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  /* transition由JS computed style动态控制 */
}

/* 转盘动画现在由JS computed style控制，不再使用CSS class */

.wheel-segment {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50%;
  height: 2px;
  transform-origin: left center;
}

.segment-text {
  position: absolute;
  right: 20px;
  top: -10px;
  font-size: 12px;
  font-weight: bold;
  color: #8B4513;
}

.wheel-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.center-pointer {
  position: absolute;
  top: -35px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 24px;
  color: #FF1438;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.center-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(180deg, #FF6B6B 0%, #FF1438 100%);
  border: 4px solid #FFD700;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

/* 结果展示 */
.cut-result {
  margin: 20px 0;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s ease;
}

.cut-result.show {
  opacity: 1;
  transform: translateY(0);
}

.result-label {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 8px;
}

.result-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  color: #FFD700;
}

.result-amount .currency {
  font-size: 24px;
  font-weight: bold;
}

.result-amount .number {
  font-size: 48px;
  font-weight: 900;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.result-tip {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8px;
}

/* 操作按钮 */
.popup-actions {
  margin-top: 20px;
}

.popup-actions .action-btn {
  width: 100%;
  height: 50px;
  border: none;
  border-radius: 25px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
}

.popup-actions .action-btn.primary {
  background: linear-gradient(90deg, #FFD700 0%, #FFA500 100%);
  color: #8B4513;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
}

.popup-actions .action-btn:disabled {
  opacity: 0.7;
}

/* 【2026-01-23】采购单门槛卡片样式 */
.threshold-section {
  margin: 16px 16px 0;
}

.threshold-card {
  background: linear-gradient(135deg, #FFF5F0 0%, #FFEBE5 100%);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 107, 107, 0.2);
}

.threshold-card.eligible {
  background: linear-gradient(135deg, #F0FFF4 0%, #E5FFE9 100%);
  border-color: rgba(82, 196, 26, 0.2);
}

.threshold-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.threshold-icon {
  font-size: 20px;
}

.threshold-title {
  font-size: 15px;
  font-weight: bold;
  color: #ff1438;
}

.threshold-card.eligible .threshold-title {
  color: #52C41A;
}

.threshold-content {
  padding: 4px 0;
}

.threshold-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.threshold-desc .amount {
  font-size: 18px;
  font-weight: bold;
  color: #ff1438;
}

.threshold-progress {
  margin-bottom: 16px;
}

.progress-track {
  height: 8px;
  background: rgba(255, 20, 56, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.threshold-progress .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff9800, #ff1438);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

.progress-labels .diff {
  color: #ff1438;
  font-weight: 500;
}

.go-shopping-btn {
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, #ff1438 0%, #ff6b8a 100%);
  border: none;
  border-radius: 22px;
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 20, 56, 0.25);
}

.go-shopping-btn:active {
  transform: scale(0.98);
}

.go-shopping-btn .arrow {
  font-size: 18px;
}

.eligible-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(82, 196, 26, 0.1);
  border-radius: 12px;
  margin-bottom: 8px;
}

.eligible-badge .check-icon {
  width: 24px;
  height: 24px;
  background: #52C41A;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}

.eligible-badge .text {
  font-size: 15px;
  font-weight: bold;
  color: #52C41A;
}

.eligible-tip {
  font-size: 12px;
  color: #999;
  text-align: center;
}

/* 【2026-01-24】活动说明弹窗 */
.rules-popup {
  background: #fff;
  border-radius: 16px;
  width: 340px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.rules-title {
  font-size: 17px;
  font-weight: bold;
  color: #333;
}

.rules-content {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
}

.rule-section {
  margin-bottom: 20px;
}

.rule-section:last-child {
  margin-bottom: 0;
}

.rule-section h4 {
  font-size: 15px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.rule-section p {
  font-size: 13px;
  color: #666;
  line-height: 1.8;
  margin: 0;
}

.rules-footer {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.rules-footer .confirm-btn {
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, #ff1438 0%, #ff6b6b 100%);
  border: none;
  border-radius: 22px;
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
}
</style>
