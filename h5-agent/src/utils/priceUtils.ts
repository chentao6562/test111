/**
 * 价格工具函数
 *
 * ========================================
 * ⚠️ 警告：此文件包含核心价格逻辑
 * 修改前必须理解业务规则！
 * ========================================
 *
 * 业务规则：
 * 1. 推销员自己浏览（isSelfBrowsing=true）→ 显示拿货价
 * 2. 客户访问（isSelfBrowsing=false）→ 显示推销员设置的零售价
 *
 * 价格字段说明：
 * - displayPrice: 后端已计算好的显示价格（优先使用）
 * - agentPrice: 推销员价格（可能是拿货价或零售价，取决于API已做好区分）
 * - retailPrice: 商品零售价（原价）
 * - price: /shop/products 返回的推销员定价（客户看到的价格）
 *
 * API返回价格规则：
 * - /products: agentPrice = supplyPrice（拿货价），retailPrice = 零售价
 * - /shop/products: price = 推销员定价，originalPrice = 零售价
 * - /recommends: agentPrice = 根据token返回（推销员看拿货价，客户看零售价）
 * - /packages: displayPrice = 根据token返回
 *
 * 创建时间：2026-01-26
 * 目的：统一价格获取逻辑，防止多模型协作时被误改
 */

/**
 * 获取商品显示价格
 *
 * 统一入口，所有页面都应该使用此函数显示价格
 * 优先级：displayPrice > agentPrice > retailPrice
 *
 * @param product 商品对象（可以是任何包含价格字段的对象）
 * @returns 应该显示的价格数字
 *
 * @example
 * // 在模板中使用
 * <span>{{ getDisplayPrice(product) }}</span>
 *
 * // 在脚本中使用
 * const price = getDisplayPrice(product)
 */
export function getDisplayPrice(product: any): number {
  if (!product) return 0

  // 1. 优先使用后端计算好的 displayPrice（套餐、推荐商品等已设置）
  if (product.displayPrice !== undefined && product.displayPrice !== null) {
    return Number(product.displayPrice)
  }

  // 2. 其次使用 agentPrice（商品列表、推荐商品API已根据用户类型设置正确值）
  if (product.agentPrice !== undefined && product.agentPrice !== null) {
    return Number(product.agentPrice)
  }

  // 3. 最后使用 retailPrice 作为兜底
  return Number(product.retailPrice || product.price || 0)
}

/**
 * 获取商品原价（划线价）
 *
 * 用于显示折扣对比，一般是商品的零售价
 *
 * @param product 商品对象
 * @returns 原价数字
 *
 * @example
 * <span class="original-price">¥{{ getOriginalPrice(product) }}</span>
 */
export function getOriginalPrice(product: any): number {
  if (!product) return 0
  // 优先使用 originalPrice（/shop/products 返回），其次 retailPrice
  return Number(product.originalPrice || product.retailPrice || 0)
}

/**
 * 计算折扣百分比
 *
 * @param product 商品对象
 * @returns 折扣百分比（0-100），0表示无折扣
 *
 * @example
 * <span v-if="getDiscount(product) > 0">省{{ getDiscount(product) }}%</span>
 */
export function getDiscount(product: any): number {
  const display = getDisplayPrice(product)
  const original = getOriginalPrice(product)
  if (!original || original <= display) return 0
  return Math.round((1 - display / original) * 100)
}

/**
 * 格式化价格显示
 *
 * @param price 价格数字
 * @param decimals 小数位数，默认2位
 * @returns 格式化后的价格字符串
 *
 * @example
 * formatPrice(99.5) // "99.50"
 * formatPrice(99.5, 0) // "100"
 */
export function formatPrice(price: number | undefined | null, decimals: number = 2): string {
  if (price === undefined || price === null) return '0.00'
  return Number(price).toFixed(decimals)
}

/**
 * 判断是否显示原价（有折扣时才显示）
 *
 * @param product 商品对象
 * @returns 是否应该显示原价
 *
 * @example
 * <span v-if="shouldShowOriginalPrice(product)" class="original">
 *   ¥{{ getOriginalPrice(product) }}
 * </span>
 */
export function shouldShowOriginalPrice(product: any): boolean {
  const display = getDisplayPrice(product)
  const original = getOriginalPrice(product)
  return original > display
}
