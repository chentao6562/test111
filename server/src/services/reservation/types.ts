/**
 * 预约服务类型定义
 * 【2026-01-16 预约模式升级】
 */

// 预约状态
export enum ReservationStatus {
  PENDING = 0,           // 待确认
  CALLING = 1,           // 确认中
  CONFIRMED = 2,         // 已确认
  COMPLETED = 3,         // 已完成
  CANCELLED = 4,         // 已取消
  EXPIRED = 5,           // 已过期
  CALL_FAILED = 6,       // 确认失败
  PENDING_PREPARE = 7,   // 待备货（提货前一天）
  PREPARING = 8,         // 备货中
  PENDING_PICKUP = 9,    // 待提货（备货完成）
}

// 预约状态标签
export const ReservationStatusLabels: Record<number, string> = {
  [ReservationStatus.PENDING]: '待确认',
  [ReservationStatus.CALLING]: '确认中',
  [ReservationStatus.CONFIRMED]: '已确认',
  [ReservationStatus.COMPLETED]: '已完成',
  [ReservationStatus.CANCELLED]: '已取消',
  [ReservationStatus.EXPIRED]: '已过期',
  [ReservationStatus.CALL_FAILED]: '确认失败',
  [ReservationStatus.PENDING_PREPARE]: '待备货',
  [ReservationStatus.PREPARING]: '备货中',
  [ReservationStatus.PENDING_PICKUP]: '待提货',
};

// 客户风险等级
export enum CustomerRiskLevel {
  NORMAL = 0,      // 正常
  HAS_RECORD = 1,  // 有记录（1次爽约）
  HIGH_RISK = 2,   // 高风险（2次爽约）
  BLACKLIST = 3,   // 黑名单（3次及以上）
}

// 奖励类型
export enum RewardType {
  ACTIVATION = 1,    // 激活奖励
  TEAM_REWARD = 2,   // 团队奖励
  UPGRADE_COMP = 3,  // 升级补偿
}

// 合规提示文案（烟花爆竹销售合规要求）
export const COMPLIANCE_NOTICE = {
  // 页面顶部法规提示
  header: '根据国家法规，烟花爆竹购买需在具有合法资质的实体店内完成。本平台仅提供产品信息展示，不进行任何线上交易或预售。最终购买以店内实际交易为准。',
  // 预约说明
  description: '预约仅为确定订货意向的单方面邀约，需到店现场确认后方可生效。',
  // 预约成功提示
  successTip: '您的到店意向已登记，门店将在30分钟内致电确认。请注意接听电话。到店后需现场确认并完成交易。',
  // 免责声明
  disclaimer: '本预约仅作为到店意向登记，不构成任何形式的线上交易。实际购买需到店完成，以店内实际交易为准。',
  // 价格说明
  priceNote: '页面所示价格仅供参考，实际成交价格以店内为准。',
  // 赠品说明
  giftNote: '到店礼品以实际到店核验为准，赠完即止。',
};

// 创建预约的商品项
export interface ReservationItemInput {
  productId: number;
  quantity: number;
  price: number;         // 参考价格（实际以店内为准）
  productName?: string;
  productImage?: string;
}

// 【2026-01-20 秒杀系统】秒杀商品输入
export interface FlashSaleItemInput {
  flashSaleItemId: number;
  quantity: number;
}

// 【2026-01-23 砍价系统】砍价商品输入
export interface BargainItemInput {
  bargainCode: string;    // 砍价码
}

// 创建预约请求
export interface CreateReservationInput {
  customerName: string;
  customerPhone: string;
  pickupDate: string;    // YYYY-MM-DD
  items?: ReservationItemInput[];          // 【2026-01-29修复】改为可选，支持只有砍价商品的预约
  flashSaleItems?: FlashSaleItemInput[];   // 【2026-01-20 秒杀系统】秒杀商品列表
  bargainItems?: BargainItemInput[];       // 【2026-01-23 砍价系统】砍价商品列表
  salespersonId?: number;
  storeId: number;
  remark?: string;
  regionId?: number;     // 【2026-01-21 顺路拼团】区域ID
  regionName?: string;   // 区域名称
}

// 预约响应
export interface ReservationResult {
  success: boolean;
  message: string;
  data?: any;
}

// 赠品信息
export interface GiftInfo {
  giftTierId: number;
  giftName: string;
  giftItems: string[];
  minAmount: number;
}

// 预约详情
export interface ReservationDetail {
  id: number;
  reservationNo: string;
  customerName: string;
  customerPhone: string;
  pickupDate: Date;
  totalAmount: number;
  status: number;
  statusLabel: string;
  giftName?: string;
  giftDelivered: boolean;
  pickupCode?: string;       // 提货码
  preparedAt?: Date;         // 备货完成时间
  items: {
    productId: number;
    productName: string;
    productImage?: string;
    quantity: number;
    price: number;
    subtotal: number;
    prepared?: boolean;      // 是否已备货
    isFlashSale?: boolean;   // 【2026-01-25】秒杀商品标记
    isBargain?: boolean;     // 【2026-01-25】砍价商品标记
    // 【2026-01-28】套餐商品支持
    isPackage?: boolean;     // 是否为套餐
    packageId?: number;      // 套餐ID
    packageName?: string;    // 套餐名称
    packageItems?: string;   // 套餐内商品JSON字符串
  }[];
  store: {
    id: number;
    name: string;
    address: string;
    contactPhone: string;
  };
  salesperson?: {
    id: number;
    name: string;
    phone: string;
  };
  callCount: number;
  confirmedAt?: Date;
  completedAt?: Date;
  paymentMethod?: string;  // 【2026-01-20】支付方式
  createdAt: Date;
  groupBuyCode?: string;   // 【2026-01-21 顺路拼团】拼团码
}

// 备货进度
export interface PrepareProgress {
  reservationId: number;
  totalItems: number;
  preparedItems: number;
  progressPercent: number;
  isComplete: boolean;
}

// 备货结果
export interface PrepareResult {
  success: boolean;
  message: string;
  pickupCode?: string;
  issueId?: number;  // 【2026-01-17】问题上报返回的问题ID
}

// 【2026-01-17】备货问题类型
export type PrepareIssueType = 'STOCK_SHORTAGE' | 'PRODUCT_DAMAGED' | 'PRODUCT_NOT_FOUND' | 'OTHER';

// 【2026-01-17】备货问题状态
export type PrepareIssueStatus = 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'CLOSED';

// 【2026-01-17】备货问题记录
export interface PrepareIssueRecord {
  id: number;
  reservationId: number;
  itemId?: number;
  issueType: PrepareIssueType;
  description?: string;
  status: PrepareIssueStatus;
  reportedBy: number;
  reportedName?: string;
  resolvedBy?: number;
  resolvedName?: string;
  resolvedAt?: Date;
  resolution?: string;
  createdAt: Date;
}
