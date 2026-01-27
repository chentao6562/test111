/**
 * 订单状态常量
 *
 * 用于统一管理订单状态字符串，避免硬编码
 * Phase 1 Task 1.3
 */

// 订单状态枚举
export const ORDER_STATUS = {
  PENDING_CONFIRM: 'pending_confirm',
  PENDING_PAYMENT: 'pending_payment',
  PENDING_ACCEPT: 'pending_accept',
  PREPARING: 'preparing',
  PENDING_TRANSFER: 'pending_transfer',
  TRANSFERRING: 'transferring',
  PENDING_PICKUP: 'pending_pickup',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// 订单状态显示名称
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [ORDER_STATUS.PENDING_CONFIRM]: '待确认',
  [ORDER_STATUS.PENDING_PAYMENT]: '待付款',
  [ORDER_STATUS.PENDING_ACCEPT]: '待接单',
  [ORDER_STATUS.PREPARING]: '备货中',
  [ORDER_STATUS.PENDING_TRANSFER]: '待移库',
  [ORDER_STATUS.TRANSFERRING]: '移库中',
  [ORDER_STATUS.PENDING_PICKUP]: '待提货',
  [ORDER_STATUS.COMPLETED]: '已完成',
  [ORDER_STATUS.CANCELLED]: '已取消',
};

// 状态流转规则（状态机）
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [ORDER_STATUS.PENDING_CONFIRM]: [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PENDING_PAYMENT]: [ORDER_STATUS.PENDING_ACCEPT, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PENDING_ACCEPT]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]: [
    ORDER_STATUS.PENDING_TRANSFER,
    ORDER_STATUS.PENDING_PICKUP,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.PENDING_TRANSFER]: [ORDER_STATUS.TRANSFERRING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.TRANSFERRING]: [ORDER_STATUS.PENDING_PICKUP, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PENDING_PICKUP]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.COMPLETED]: [], // 终态，不可再转换
  [ORDER_STATUS.CANCELLED]: [], // 终态，不可再转换
};

// 可取消的订单状态
export const CANCELABLE_STATUSES: OrderStatus[] = [
  ORDER_STATUS.PENDING_CONFIRM,
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.PENDING_ACCEPT,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.PENDING_TRANSFER,
  ORDER_STATUS.TRANSFERRING,
  ORDER_STATUS.PENDING_PICKUP,
];

// 需要一级代理商确认的状态
export const NEEDS_CONFIRM_STATUSES: OrderStatus[] = [ORDER_STATUS.PENDING_CONFIRM];

// 已支付的订单状态（用于判断是否可退款）
export const PAID_STATUSES: OrderStatus[] = [
  ORDER_STATUS.PENDING_ACCEPT,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.PENDING_TRANSFER,
  ORDER_STATUS.TRANSFERRING,
  ORDER_STATUS.PENDING_PICKUP,
  ORDER_STATUS.COMPLETED,
];

/**
 * 验证状态流转是否合法
 */
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowedStatuses = ORDER_STATUS_TRANSITIONS[from];
  return allowedStatuses ? allowedStatuses.includes(to) : false;
}

/**
 * 检查订单是否可取消
 */
export function isCancelable(status: OrderStatus): boolean {
  return CANCELABLE_STATUSES.includes(status);
}

/**
 * 检查订单是否需要确认
 */
export function needsConfirm(status: OrderStatus): boolean {
  return NEEDS_CONFIRM_STATUSES.includes(status);
}

/**
 * 检查订单是否已支付
 */
export function isPaid(status: OrderStatus): boolean {
  return PAID_STATUSES.includes(status);
}

// 自提模式流程
export const SELF_PICKUP_FLOW: OrderStatus[] = [
  ORDER_STATUS.PENDING_CONFIRM,
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.PENDING_ACCEPT,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.PENDING_PICKUP,
  ORDER_STATUS.COMPLETED,
];

// 锁货模式流程
export const LOCK_STOCK_FLOW: OrderStatus[] = [
  ORDER_STATUS.PENDING_CONFIRM,
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.PENDING_ACCEPT,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.PENDING_TRANSFER,
  ORDER_STATUS.TRANSFERRING,
  ORDER_STATUS.PENDING_PICKUP,
  ORDER_STATUS.COMPLETED,
];

/**
 * 获取状态显示名称
 */
export function getStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] || status;
}

/**
 * 检查是否为终态
 */
export function isFinalStatus(status: string): boolean {
  return status === ORDER_STATUS.COMPLETED || status === ORDER_STATUS.CANCELLED;
}

/**
 * 检查订单是否可取消（别名，兼容旧代码）
 */
export function canCancel(status: string): boolean {
  return CANCELABLE_STATUSES.includes(status as OrderStatus);
}

/**
 * 检查订单是否可接单
 */
export function canAccept(status: string): boolean {
  return status === ORDER_STATUS.PENDING_ACCEPT;
}

/**
 * 检查订单是否可完成备货
 */
export function canCompletePrepare(status: string): boolean {
  return status === ORDER_STATUS.PREPARING;
}

/**
 * 检查订单是否可由库管提货核销（自提模式）
 */
export function canWarehousePickup(status: string, needTransfer: boolean): boolean {
  return status === ORDER_STATUS.PENDING_PICKUP && !needTransfer;
}

/**
 * 检查订单是否可由货管提货核销（锁货模式）
 * 【2026-01-13修改】允许TRANSFERRING状态直接扫码核销
 * 流程简化：货管抢单后直接扫客户提货码完成核销，无需先点"完成移库"
 */
export function canLogisticsPickup(status: string, needTransfer: boolean): boolean {
  return (status === ORDER_STATUS.PENDING_PICKUP || status === ORDER_STATUS.TRANSFERRING) && needTransfer;
}

/**
 * 检查订单是否可进行移库交接
 */
export function canTransferHandover(status: string, needTransfer: boolean): boolean {
  return status === ORDER_STATUS.TRANSFERRING && needTransfer;
}

/**
 * 获取下一个状态（自提模式）
 */
export function getNextSelfPickupStatus(status: string): OrderStatus | null {
  const flow = SELF_PICKUP_FLOW;
  const currentIndex = flow.indexOf(status as OrderStatus);
  if (currentIndex === -1 || currentIndex === flow.length - 1) {
    return null;
  }
  return flow[currentIndex + 1];
}

/**
 * 获取下一个状态（锁货模式）
 */
export function getNextLockStockStatus(status: string): OrderStatus | null {
  const flow = LOCK_STOCK_FLOW;
  const currentIndex = flow.indexOf(status as OrderStatus);
  if (currentIndex === -1 || currentIndex === flow.length - 1) {
    return null;
  }
  return flow[currentIndex + 1];
}
