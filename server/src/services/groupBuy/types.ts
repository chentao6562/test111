/**
 * 拼团功能类型定义
 * @module services/groupBuy/types
 * @since 2026-01-21
 */

// 拼团状态枚举
export const GroupBuyStatus = {
  FORMING: 'FORMING',     // 组队中
  FULL: 'FULL',           // 已满员
  COMPLETED: 'COMPLETED', // 已完成
  EXPIRED: 'EXPIRED',     // 已过期
  CANCELLED: 'CANCELLED', // 已取消
} as const;

export type GroupBuyStatusType = typeof GroupBuyStatus[keyof typeof GroupBuyStatus];

// 拼团成员状态枚举
export const GroupBuyMemberStatus = {
  JOINED: 'JOINED',       // 已加入
  PICKED_UP: 'PICKED_UP', // 已提货
  QUIT: 'QUIT',           // 已退出
} as const;

export type GroupBuyMemberStatusType = typeof GroupBuyMemberStatus[keyof typeof GroupBuyMemberStatus];

// 创建拼团请求
export interface CreateGroupBuyRequest {
  reservationId: number;
  requiredCount?: number;  // 【2026-01-25】用户选择的成团人数（可选，默认使用活动配置）
}

// 加入拼团请求
export interface JoinGroupBuyRequest {
  reservationId: number;
  groupCode: string;
}

// 拼团详情响应
export interface GroupBuyDetailResponse {
  id: number;
  code: string;
  initiatorName: string;
  initiatorPhone: string;
  requiredCount: number;
  currentCount: number;
  bonusGiftName: string | null;
  pickupDate: string;
  storeName: string;
  storeAddress: string;
  regionName: string | null;  // 【2026-01-21】区域名称（顺路拼团）
  status: GroupBuyStatusType;
  expireAt: string;
  members: GroupBuyMemberInfo[];
  giftTiers?: TierGiftConfig[];  // 【2026-01-25】多档位赠品阶梯
}

// 拼团成员信息
export interface GroupBuyMemberInfo {
  id: number;
  customerName: string;
  customerPhone: string;
  status: GroupBuyMemberStatusType;
  joinedAt: string;
  pickedUpAt: string | null;
  bonusGiftDelivered: boolean;
}

// 我的拼团列表项
export interface MyGroupBuyItem {
  id: number;
  code: string;
  requiredCount: number;
  currentCount: number;
  bonusGiftName: string | null;
  pickupDate: string;
  status: GroupBuyStatusType;
  isInitiator: boolean;
  expireAt: string;
  regionName?: string | null; // 【2026-01-26】区域名称
}

// 拼团配置响应
export interface GroupBuyConfigResponse {
  enabled: boolean;
  requiredCount: number;
  minAmount: number;
  formingHours: number;
  bonusGiftName: string | null;
  activeConfig: {
    id: number;
    name: string;
    requiredCount: number;
    minAmount: number;
    bonusGiftName: string | null;
    startTime: string | null;
    endTime: string | null;
  } | null;
  tiers?: TierGiftConfig[];  // 【2026-01-25】可选的人数档位列表
}

// 【2026-01-25 多档位拼团赠品】
export interface TierGiftConfig {
  count: number;            // 成团人数档位 3/5/10
  memberGifts: string[];    // 团员赠品列表
  memberGiftCost: number;   // 团员赠品成本
  leaderGift: string;       // 团长奖励
  leaderCount: number;      // 团长奖励数量
  leaderGiftCost: number;   // 团长奖励成本
}

// 多档位赠品配置JSON结构
export interface MultiTierGiftsConfig {
  tiers: TierGiftConfig[];
}
