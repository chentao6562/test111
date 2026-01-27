/**
 * 锁价功能类型定义
 * @module services/priceLock/types
 * @since 2026-01-21
 */

// 锁价状态枚举
export const PriceLockStatus = {
  ACTIVE: 'ACTIVE',     // 生效中
  USED: 'USED',         // 已使用
  EXPIRED: 'EXPIRED',   // 已过期
} as const;

export type PriceLockStatusType = typeof PriceLockStatus[keyof typeof PriceLockStatus];

// 锁定商品项
export interface LockedItem {
  productId: number;
  productName: string;
  lockedPrice: number;      // 锁定价格
  originalPrice: number;    // 原价（展示用，实际同锁定价）
  quantity: number;
  unit: string;
}

// 创建锁价请求
export interface CreatePriceLockRequest {
  customerPhone: string;
  customerName?: string;
  salespersonId?: number;
  items: LockedItem[];
}

// 锁价详情响应
export interface PriceLockDetailResponse {
  id: number;
  code: string;
  customerPhone: string;
  customerName: string | null;
  lockedItems: LockedItem[];
  totalAmount: number;
  status: PriceLockStatusType;
  expireAt: string;
  remainingSeconds: number;
  createdAt: string;
}

// 验证锁价结果
export interface ValidatePriceLockResult {
  valid: boolean;
  message?: string;
  priceLock?: {
    id: number;
    code: string;
    lockedItems: LockedItem[];
    totalAmount: number;
    expireAt: string;
  };
}

// 锁价配置响应
export interface PriceLockConfigResponse {
  enabled: boolean;
  lockHours: number;
  minAmount: number | null;
  activeConfig: {
    id: number;
    name: string;
    lockHours: number;
    minAmount: number | null;
    startTime: string | null;
    endTime: string | null;
  } | null;
}
