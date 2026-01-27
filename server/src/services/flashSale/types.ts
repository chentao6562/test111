/**
 * 秒杀系统类型定义
 * 【2026-01-20 秒杀系统】
 */

// 秒杀活动状态
export type FlashSaleStatus = 'DRAFT' | 'ACTIVE' | 'ENDED';

// 秒杀活动
export interface FlashSaleActivity {
  id: number;
  name: string;
  startTime: Date;
  endTime: Date;
  status: FlashSaleStatus;
  minOrderAmount: number;  // 加购门槛金额
  bannerImage?: string;
  description?: string;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  items?: FlashSaleItem[];
}

// 秒杀商品项
export interface FlashSaleItem {
  id: number;
  activityId: number;
  productId: number;
  flashPrice: number;
  flashStock: number;
  soldCount: number;
  limitPerUser: number;
  sort: number;
  // 关联商品信息
  product?: {
    id: number;
    name: string;
    images: string;
    retailPrice: number;
    suggestedPrice: number;
  };
}

// 前端提交的秒杀商品
export interface FlashSaleItemInput {
  flashSaleItemId: number;
  quantity: number;
}

// 验证结果中的商品信息
export interface ValidatedFlashSaleItem {
  flashSaleItemId: number;
  productId: number;
  productName: string;
  productImage: string | null;
  quantity: number;
  price: number;  // 秒杀价
}

// 秒杀验证结果
export interface FlashSaleValidationResult {
  success: boolean;
  message: string;
  activityId?: number;
  validatedItems: ValidatedFlashSaleItem[];
}

// H5端当前秒杀活动响应
export interface CurrentFlashSaleResponse {
  hasActivity: boolean;
  activity?: {
    id: number;
    name: string;
    minOrderAmount: number;
    startTime: Date;
    endTime: Date;
    bannerImage?: string;
    description?: string;
  };
  items: Array<{
    id: number;
    flashSaleItemId: number;
    productId: number;
    productName: string;
    productImage: string | null;
    flashPrice: number;
    originalPrice: number;
    flashStock: number;
    soldCount: number;
    limitPerUser: number;
    remainingStock: number;
  }>;
}

// 创建活动输入
export interface CreateActivityInput {
  name: string;
  startTime: Date;
  endTime: Date;
  minOrderAmount: number;
  bannerImage?: string;
  description?: string;
  createdBy: number;
}

// 更新活动输入
export interface UpdateActivityInput {
  name?: string;
  startTime?: Date;
  endTime?: Date;
  minOrderAmount?: number;
  bannerImage?: string;
  description?: string;
}

// 添加秒杀商品输入
export interface AddFlashSaleItemInput {
  productId: number;
  flashPrice: number;
  flashStock: number;
  limitPerUser?: number;
  sort?: number;
}

// 更新秒杀商品输入
export interface UpdateFlashSaleItemInput {
  flashPrice?: number;
  flashStock?: number;
  limitPerUser?: number;
  sort?: number;
}
