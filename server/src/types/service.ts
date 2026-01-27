/**
 * 服务层类型定义
 *
 * 用于服务层函数参数和返回值的统一类型
 */

/**
 * 日期范围筛选
 */
export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

/**
 * 月份筛选
 */
export interface MonthFilter {
  year: number;
  month: number;
}

/**
 * 库存商品项（用于库存操作）
 */
export interface OrderItemForStock {
  productId: number;
  quantity: number;
  productName?: string;
}

/**
 * 库存操作结果
 */
export interface StockOperationResult {
  success: boolean;
  error?: string;
  updatedProducts?: number[];
  failedProducts?: { productId: number; reason: string }[];
}

/**
 * 订单支付信息（用于支付状态计算）
 */
export interface OrderPaymentInfo {
  totalAmount: number | string;
  paidAmount: number | string;
  lockFee?: number | string;
  transferFee?: number | string;
  depositPaid?: boolean;
  fullPaid?: boolean;
  needTransfer?: boolean;
}

/**
 * 支付状态结果
 */
export interface PaymentStatusResult {
  status: 'unpaid' | 'deposit' | 'full';
  statusText: string;
  statusColor: string;
  remainingAmount: number;
  canPickup: boolean;
  needCollectOnPickup: boolean;
}

/**
 * 订单状态信息
 */
export interface OrderStateInfo {
  status: string;
  needTransfer?: boolean;
  fullPaid?: boolean;
  agentId?: number;
}

/**
 * 状态验证结果
 */
export interface StateValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * 分润计算参数
 */
export interface CommissionCalculateParams {
  orderId: number;
  orderAmount: number;
  agentId: number;
  items?: OrderItemForStock[];
}

/**
 * 分润规则
 */
export interface CommissionRule {
  id: number;
  minAmount: number;
  maxAmount?: number;
  level1Rate: number;
  level2Rate: number;
  type: 'RATE' | 'PRICE_DIFF';
}

/**
 * 移库任务信息
 */
export interface TransferTaskInfo {
  id: number;
  orderId: number;
  logisticsId?: number;
  status: string;
  fee: number;
}

/**
 * 代理商基础信息
 */
export interface AgentBasicInfo {
  id: number;
  name: string;
  phone: string;
  type: string;
  parentId?: number;
}

/**
 * 团队统计信息
 */
export interface TeamStats {
  directCount: number;
  totalCount: number;
  level1Count: number;
  level2Count: number;
  level3Count: number;
  totalPerformance: number;
}

/**
 * 收入统计
 */
export interface IncomeStats {
  totalIncome: number;
  monthIncome: number;
  pendingIncome: number;
  completedTasks: number;
}

/**
 * 查询构建器选项
 */
export interface QueryBuilderOptions {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string | string[];
  dateRange?: DateRangeFilter;
  orderBy?: Record<string, 'asc' | 'desc'>;
}
