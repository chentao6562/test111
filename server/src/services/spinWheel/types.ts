/**
 * 现金大转盘裂变系统类型定义
 * @module services/spinWheel/types
 * @since 2026-01-23
 */

// ============ 抽奖类型枚举 ============

/**
 * 抽奖类型
 */
export const SpinType = {
  FREE: 'FREE',           // 免费抽奖
  SHARE: 'SHARE',         // 分享获得
  HELP: 'HELP',           // 助力获得
} as const;

export type SpinTypeValue = typeof SpinType[keyof typeof SpinType];

/**
 * 兑换状态
 */
export const RedeemStatus = {
  PENDING: 'PENDING',     // 处理中
  SUCCESS: 'SUCCESS',     // 成功
  FAILED: 'FAILED',       // 失败
} as const;

export type RedeemStatusValue = typeof RedeemStatus[keyof typeof RedeemStatus];

/**
 * 黑名单类型
 */
export const BlacklistType = {
  PHONE: 'PHONE',         // 手机号
  IP: 'IP',               // IP地址
  DEVICE: 'DEVICE',       // 设备ID
} as const;

export type BlacklistTypeValue = typeof BlacklistType[keyof typeof BlacklistType];

// ============ 奖池配置 ============

/**
 * 奖池项目配置
 */
export interface PrizePoolItem {
  name: string;           // 奖品名称（显示在转盘上）
  amount: number;         // 金额
  weight: number;         // 权重（用于普通抽奖）
  color?: string;         // 转盘格子颜色
}

// ============ 请求类型 ============

/**
 * 加入活动请求
 */
export interface JoinSpinWheelRequest {
  phone: string;
  name?: string;
  configId: number;
  salespersonId?: number;
}

/**
 * 抽奖请求
 */
export interface SpinRequest {
  phone: string;
  configId: number;
}

/**
 * 助力请求
 */
export interface HelpSpinRequest {
  participationCode: string;    // 参与码
  helperPhone: string;
  helperName?: string;
  verifyCode: string;
  ipAddress?: string;
  deviceId?: string;
}

/**
 * 兑换请求
 */
export interface RedeemRequest {
  phone: string;
  configId: number;
  amount: number;               // 兑换金额
}

// ============ 响应类型 ============

/**
 * 活动配置响应
 */
export interface SpinWheelConfigResponse {
  enabled: boolean;
  config: {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
    prizePool: PrizePoolItem[];
    redeemThreshold: number;
    freeSpinCount: number;
    shareSpinCount: number;
    maxDailyHelp: number;
    newUserHelpMin: number;
    newUserHelpMax: number;
    oldUserHelpMin: number;
    oldUserHelpMax: number;
  } | null;
}

/**
 * 用户参与信息响应
 */
export interface ParticipationResponse {
  id: number;
  code: string;
  phone: string;
  name: string | null;
  totalAmount: number;          // 累计碎片金额
  redeemedAmount: number;       // 已兑换金额
  availableAmount: number;      // 可用金额（totalAmount - redeemedAmount - expiredAmount）
  todaySpinCount: number;       // 今日抽奖次数
  todayHelpCount: number;       // 今日被助力次数
  remainingSpins: number;       // 剩余抽奖次数
  canRedeem: boolean;           // 是否可兑换（>=门槛）
  redeemThreshold: number;      // 兑换门槛
  progressPercent: number;      // 进度百分比
  shareBonus: boolean;          // 今日是否已获得分享奖励
  configId: number;
  createdAt: string;
}

/**
 * 抽奖结果响应
 */
export interface SpinResultResponse {
  success: boolean;
  prizeName?: string;
  prizeAmount?: number;
  totalAmount?: number;         // 抽奖后的累计金额
  remainingSpins?: number;      // 剩余抽奖次数
  prizeIndex?: number;          // 中奖的奖品索引（用于转盘动画）
  message?: string;
}

/**
 * 助力结果响应
 */
export interface HelpResultResponse {
  success: boolean;
  helpAmount?: number;          // 助力金额
  isNewUser?: boolean;          // 是否新用户
  message?: string;
}

/**
 * 兑换结果响应
 */
export interface RedeemResultResponse {
  success: boolean;
  redeemAmount?: number;
  couponCode?: string;          // 代金券码
  message?: string;
}

/**
 * 抽奖记录项
 */
export interface SpinRecordItem {
  id: number;
  prizeName: string;
  prizeAmount: number;
  spinType: SpinTypeValue;
  isExpired: boolean;
  createdAt: string;
}

/**
 * 助力记录项
 */
export interface HelpRecordItem {
  id: number;
  helperPhone: string;          // 脱敏后的手机号
  helperName: string | null;
  helpAmount: number;
  isNewUser: boolean;
  createdAt: string;
}

/**
 * 分享页详情响应
 */
export interface ShareDetailResponse {
  participation: {
    code: string;
    phone: string;              // 脱敏后的手机号
    name: string | null;
    totalAmount: number;
    progressPercent: number;
  };
  config: {
    name: string;
    endTime: string;
  };
  helpRecords: HelpRecordItem[];
}

// ============ 算法相关 ============

/**
 * 抽奖算法上下文
 */
export interface SpinAlgorithmContext {
  spinCount: number;            // 用户已抽奖次数
  totalAmount: number;          // 累计金额
  redeemThreshold: number;      // 兑换门槛
  prizePool: PrizePoolItem[];   // 奖池配置
}

/**
 * 抽奖算法结果
 */
export interface SpinAlgorithmResult {
  prizeName: string;
  prizeAmount: number;
  prizeIndex: number;           // 奖品在转盘上的位置
}

// ============ 滚动播报 ============

/**
 * 滚动播报项
 */
export interface DynamicNotice {
  phone: string;                // 脱敏手机号
  action: 'spin' | 'redeem';    // 动作类型
  amount: number;               // 金额
  timestamp: number;            // 时间戳
}
