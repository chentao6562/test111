/**
 * 砍价活动系统类型定义
 * @module services/bargain/types
 * @since 2026-01-22
 */

// ============ 状态枚举 ============

/**
 * 砍价活动状态
 */
export const BargainStatus = {
  BARGAINING: 'BARGAINING',   // 砍价中
  SUCCESS: 'SUCCESS',         // 砍价成功（达到底价）
  ORDERED: 'ORDERED',         // 已下单
  EXPIRED: 'EXPIRED',         // 已过期
  CANCELLED: 'CANCELLED',     // 已取消
} as const;

export type BargainStatusType = typeof BargainStatus[keyof typeof BargainStatus];

/**
 * 黑名单类型
 */
export const BlacklistType = {
  PHONE: 'PHONE',     // 手机号
  IP: 'IP',           // IP地址
  DEVICE: 'DEVICE',   // 设备ID
} as const;

export type BlacklistTypeValue = typeof BlacklistType[keyof typeof BlacklistType];

/**
 * 成本承担类型
 */
export const CostBearerType = {
  PLATFORM: 'PLATFORM',   // 平台（总代理）承担全部
  SHARED: 'SHARED',       // 按比例分摊
  AGENT: 'AGENT',         // 推销员承担全部
} as const;

export type CostBearerTypeValue = typeof CostBearerType[keyof typeof CostBearerType];

// ============ 请求类型 ============

/**
 * 发起砍价请求
 */
export interface CreateBargainRequest {
  phone: string;                // 发起人手机号
  name?: string;                // 发起人姓名
  productId: number;            // 商品ID
  configId: number;             // 活动配置ID
  storeId: number;              // 门店ID
  pickupDate?: string;          // 提货日期 YYYY-MM-DD
  quantity?: number;            // 数量（默认1）
  salespersonId?: number;       // 推销员ID（从分享链接继承）
  agentId?: number;             // 【2026-01-23】用户ID，用于采购单门槛检查
}

/**
 * 帮砍请求
 */
export interface HelpCutRequest {
  bargainCode: string;          // 砍价码
  helperPhone: string;          // 帮砍人手机号
  helperName?: string;          // 帮砍人姓名
  verifyCode: string;           // 短信验证码
  ipAddress?: string;           // IP地址（风控用）
  deviceId?: string;            // 设备ID（风控用）
}

/**
 * 砍价下单请求
 */
export interface BargainOrderRequest {
  bargainCode: string;          // 砍价码
  customerName: string;         // 客户姓名
  customerPhone: string;        // 客户手机号
  pickupDate: string;           // 提货日期 YYYY-MM-DD
  storeId: number;              // 门店ID
}

// ============ 响应类型 ============

/**
 * 砍价活动配置响应
 */
export interface BargainConfigResponse {
  enabled: boolean;
  activeConfig: {
    id: number;
    name: string;
    startTime: string | null;
    endTime: string | null;
    bargainHours: number;
    minBargainCount: number;
    maxBargainCount: number;
    newUserBonus: number;
    costBearerType: string;
  } | null;
  // 【2026-01-27】支持多活动：返回所有有效活动配置
  activeConfigs?: {
    id: number;
    name: string;
    startTime: string | null;
    endTime: string | null;
  }[];
}

/**
 * 砍价商品信息
 */
export interface BargainProductItem {
  id: number;
  configId?: number;            // 【2026-01-26】活动配置ID
  configName?: string;          // 【2026-01-26】活动名称
  productId: number;
  productName: string;
  productImage: string;
  originalPrice: number;        // 原价
  floorPrice: number;           // 底价
  maxDiscount: number;          // 最大优惠金额
  bargainStock: number;         // 砍价库存
  soldCount: number;            // 已售数量
  limitPerUser: number;         // 每人限购
  available: boolean;           // 是否可参与
}

/**
 * 砍价详情响应
 */
export interface BargainDetailResponse {
  id: number;
  code: string;
  initiatorPhone: string;       // 脱敏后的手机号
  initiatorName: string | null;
  productId: number;
  productName: string;
  productImage: string;
  originalPrice: number;
  floorPrice: number;
  currentPrice: number;
  totalCut: number;
  cutCount: number;
  quantity: number;
  status: BargainStatusType;
  reachedFloor: boolean;
  storeId: number;
  storeName: string;
  storeAddress: string;
  pickupDate: string | null;    // 提货日期
  expireAt: string;
  createdAt: string;
  // 计算字段
  remainingCut: number;         // 还需砍多少
  progressPercent: number;      // 进度百分比
  // 帮砍记录
  cuts: BargainCutInfo[];
}

/**
 * 帮砍记录信息
 */
export interface BargainCutInfo {
  id: number;
  helperPhone: string;          // 脱敏后的手机号
  helperName: string | null;
  cutAmount: number;
  isNewUser: boolean;
  createdAt: string;
}

/**
 * 帮砍结果
 */
export interface HelpCutResult {
  success: boolean;
  cutAmount?: number;           // 砍掉的金额
  currentPrice?: number;        // 砍后价格
  isNewUser?: boolean;          // 是否新用户
  reachedFloor?: boolean;       // 是否达到底价
  message?: string;
  helperBargainCode?: string;   // 【2026-01-23】帮砍者获得的砍价码（拉新机制）
}

/**
 * 我的砍价列表项
 */
export interface MyBargainItem {
  id: number;
  code: string;
  productName: string;
  productImage: string;
  originalPrice: number;
  currentPrice: number;
  floorPrice: number;
  cutCount: number;
  status: BargainStatusType;
  reachedFloor: boolean;
  expireAt: string;
  createdAt: string;
  progressPercent: number;
}

/**
 * 砍价下单结果
 */
export interface BargainOrderResult {
  success: boolean;
  reservationId?: number;
  reservationNo?: string;
  message?: string;
}

// ============ 风控相关 ============

/**
 * 风控检查结果
 */
export interface RiskCheckResult {
  passed: boolean;
  riskLevel: number;            // 0=正常 1=警告 2=拒绝
  reason?: string;
}

/**
 * 添加黑名单请求
 */
export interface AddBlacklistRequest {
  type: BlacklistTypeValue;
  value: string;
  reason?: string;
  expireHours?: number;         // null表示永久
  operatorId: number;
}

// ============ 管理后台相关 ============

/**
 * 创建砍价活动配置请求
 */
export interface CreateBargainConfigRequest {
  name: string;
  startTime: string;
  endTime: string;
  bargainHours?: number;
  minBargainCount?: number;
  maxBargainCount?: number;
  newUserBonus?: number;
  costBearerType?: CostBearerTypeValue;
  agentBearRatio?: number;
  minCartAmount?: number;  // 【2026-01-23】采购单门槛金额
  items: {
    productId: number;
    originalPrice: number;
    floorPrice: number;
    bargainStock?: number;
    limitPerUser?: number;
    sort?: number;
  }[];
  createdBy: number;
}

/**
 * 砍价统计
 */
export interface BargainStats {
  totalBargains: number;        // 总砍价数
  bargainingCount: number;      // 砍价中
  successCount: number;         // 砍价成功
  orderedCount: number;         // 已下单
  expiredCount: number;         // 已过期
  cancelledCount: number;       // 已取消
  totalCutAmount: number;       // 总砍价金额
  platformCost: number;         // 平台承担成本
  agentCost: number;            // 推销员承担成本
}

/**
 * 管理后台砍价列表项
 */
export interface AdminBargainItem {
  id: number;
  code: string;
  initiatorPhone: string;
  initiatorName: string | null;
  productId: number;
  productName: string;
  originalPrice: number;
  floorPrice: number;
  currentPrice: number;
  totalCut: number;
  cutCount: number;
  status: BargainStatusType;
  reachedFloor: boolean;
  salespersonId: number | null;
  salespersonName: string | null;
  reservationNo: string | null;
  expireAt: string;
  createdAt: string;
}

// ============ 利润计算相关 ============

/**
 * 砍价利润分配
 */
export interface BargainProfitDistribution {
  masterProfit: number;         // 总代理利润
  level1Profit: number;         // 一级推销员利润
  level2Profit: number;         // 二级推销员利润
  platformCost: number;         // 平台承担的砍价成本
  agentCost: number;            // 推销员承担的砍价成本
}
