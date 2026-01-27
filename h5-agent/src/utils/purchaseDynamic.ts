/**
 * 购买动态模拟生成工具
 * 用于前端模拟显示"XX刚刚预约了此商品"的热销效果
 */

export interface PurchaseDynamic {
  phone: string       // 脱敏手机号 139****8888
  city: string        // 城市
  productName: string // 商品名称（截断）
  time: string        // 时间文案
}

export interface Product {
  id: number
  name: string
  [key: string]: any
}

// 城市池（内蒙古为主，覆盖主要市场）
const cities = [
  '呼和浩特', '包头', '赤峰', '鄂尔多斯', '通辽', '乌海',
  '呼伦贝尔', '巴彦淖尔', '乌兰察布', '兴安盟', '锡林郭勒',
  '阿拉善', '满洲里', '二连浩特', '霍林郭勒'
]

// 手机号前缀池
const phonePrefix = ['138', '139', '150', '151', '152', '155', '158', '159', '186', '188']

// 时间文案
const timeTexts = ['刚刚', '1分钟前', '2分钟前', '3分钟前', '5分钟前', '8分钟前', '10分钟前']

/**
 * 生成脱敏手机号
 */
export const generatePhone = (): string => {
  const prefix = phonePrefix[Math.floor(Math.random() * phonePrefix.length)]
  const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${prefix}****${suffix}`
}

/**
 * 随机选择城市
 */
export const randomCity = (): string => {
  return cities[Math.floor(Math.random() * cities.length)] || '呼和浩特'
}

/**
 * 随机选择时间文案
 */
export const randomTime = (): string => {
  return timeTexts[Math.floor(Math.random() * timeTexts.length)] || '刚刚'
}

/**
 * 截断商品名称
 */
export const truncateProductName = (name: string, maxLength: number = 12): string => {
  if (!name) return '热销商品'
  if (name.length <= maxLength) return name
  return name.slice(0, maxLength) + '...'
}

/**
 * 生成一条购买动态
 */
export const generateDynamic = (products: Product[]): PurchaseDynamic => {
  if (!products || products.length === 0) {
    return {
      phone: generatePhone(),
      city: randomCity(),
      productName: '热销烟花',
      time: randomTime()
    }
  }

  const product = products[Math.floor(Math.random() * products.length)]
  return {
    phone: generatePhone(),
    city: randomCity(),
    productName: truncateProductName(product?.name || '热销烟花'),
    time: randomTime()
  }
}

/**
 * 生成多条购买动态（用于初始化）
 */
export const generateMultipleDynamics = (products: Product[], count: number = 5): PurchaseDynamic[] => {
  const dynamics: PurchaseDynamic[] = []
  for (let i = 0; i < count; i++) {
    dynamics.push(generateDynamic(products))
  }
  return dynamics
}

/**
 * 动态显示管理器
 * 自动循环显示购买动态
 */
export class DynamicDisplayManager {
  private products: Product[] = []
  private dynamics: PurchaseDynamic[] = []
  private currentIndex: number = 0
  private timer: number | null = null
  private onUpdate: ((dynamic: PurchaseDynamic) => void) | null = null
  private onShow: (() => void) | null = null
  private onHide: (() => void) | null = null

  constructor(options?: {
    onUpdate?: (dynamic: PurchaseDynamic) => void
    onShow?: () => void
    onHide?: () => void
  }) {
    if (options) {
      this.onUpdate = options.onUpdate || null
      this.onShow = options.onShow || null
      this.onHide = options.onHide || null
    }
  }

  /**
   * 设置商品列表
   */
  setProducts(products: Product[]) {
    this.products = products
    this.dynamics = generateMultipleDynamics(products, 10)
  }

  /**
   * 开始自动显示
   * @param showDuration 显示时长（毫秒）
   * @param intervalMin 最小间隔（毫秒）
   * @param intervalMax 最大间隔（毫秒）
   */
  start(showDuration: number = 3000, intervalMin: number = 8000, intervalMax: number = 15000) {
    this.stop()

    const showNext = () => {
      // 获取当前动态
      const dynamic = this.dynamics[this.currentIndex]
      if (!dynamic) return

      // 触发更新回调
      if (this.onUpdate) {
        this.onUpdate(dynamic)
      }

      // 显示
      if (this.onShow) {
        this.onShow()
      }

      // 隐藏定时器
      setTimeout(() => {
        if (this.onHide) {
          this.onHide()
        }
      }, showDuration)

      // 更新索引，循环使用
      this.currentIndex = (this.currentIndex + 1) % this.dynamics.length

      // 每隔一段时间生成新的动态补充
      if (this.currentIndex === 0) {
        this.dynamics = generateMultipleDynamics(this.products, 10)
      }

      // 设置下一次显示
      const nextInterval = Math.floor(Math.random() * (intervalMax - intervalMin)) + intervalMin
      this.timer = window.setTimeout(showNext, nextInterval)
    }

    // 首次延迟显示（页面加载后3秒开始）
    this.timer = window.setTimeout(showNext, 3000)
  }

  /**
   * 停止自动显示
   */
  stop() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  /**
   * 手动触发一次显示
   */
  showOnce(): PurchaseDynamic {
    const dynamic = generateDynamic(this.products)
    if (this.onUpdate) {
      this.onUpdate(dynamic)
    }
    return dynamic
  }
}

/**
 * 格式化动态文案
 */
export const formatDynamicText = (dynamic: PurchaseDynamic): string => {
  return `${dynamic.phone}（${dynamic.city}）${dynamic.time}预约了 ${dynamic.productName}`
}

/**
 * 格式化简短动态文案（用于狭窄空间）
 */
export const formatShortDynamicText = (dynamic: PurchaseDynamic): string => {
  return `${dynamic.city}用户${dynamic.time}预约了此商品`
}
