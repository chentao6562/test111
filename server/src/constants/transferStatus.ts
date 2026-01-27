/**
 * 移库任务状态常量
 * 集中管理所有移库任务状态相关的常量和验证逻辑
 */

// 移库任务状态枚举
export const TRANSFER_STATUS = {
  PENDING: 'pending',       // 待接单（原PENDING改为小写以保持一致性）
  ACCEPTED: 'accepted',     // 已接单
  COMPLETED: 'completed',   // 已完成
  CANCELLED: 'cancelled',   // 已取消
} as const;

export type TransferStatus = typeof TRANSFER_STATUS[keyof typeof TRANSFER_STATUS];

// 兼容旧代码的大写状态（逐步废弃）
export const TRANSFER_STATUS_LEGACY = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

// 移库任务状态中文标签
export const TRANSFER_STATUS_LABELS: Record<string, string> = {
  [TRANSFER_STATUS.PENDING]: '待接单',
  [TRANSFER_STATUS.ACCEPTED]: '已接单',
  [TRANSFER_STATUS.COMPLETED]: '已完成',
  [TRANSFER_STATUS.CANCELLED]: '已取消',
  // 兼容大写
  'PENDING': '待接单',
  'ACCEPTED': '已接单',
  'COMPLETED': '已完成',
  'CANCELLED': '已取消',
};

// 可接单的任务状态
export const ACCEPTABLE_TRANSFER_STATUSES = [
  TRANSFER_STATUS.PENDING,
  'PENDING', // 兼容
];

// 可完成的任务状态
export const COMPLETABLE_TRANSFER_STATUSES = [
  TRANSFER_STATUS.ACCEPTED,
  'ACCEPTED', // 兼容
];

// 可取消的任务状态
export const CANCELABLE_TRANSFER_STATUSES = [
  TRANSFER_STATUS.PENDING,
  TRANSFER_STATUS.ACCEPTED,
  'PENDING',
  'ACCEPTED',
];

// 终态任务状态
export const FINAL_TRANSFER_STATUSES = [
  TRANSFER_STATUS.COMPLETED,
  TRANSFER_STATUS.CANCELLED,
  'COMPLETED',
  'CANCELLED',
];

// === 状态验证函数 ===

/**
 * 检查任务是否可以接单
 */
export function canAcceptTransfer(status: string): boolean {
  return ACCEPTABLE_TRANSFER_STATUSES.includes(status as any);
}

/**
 * 检查任务是否可以完成
 */
export function canCompleteTransfer(status: string): boolean {
  return COMPLETABLE_TRANSFER_STATUSES.includes(status as any);
}

/**
 * 检查任务是否可以取消
 */
export function canCancelTransfer(status: string): boolean {
  return CANCELABLE_TRANSFER_STATUSES.includes(status as any);
}

/**
 * 检查任务是否处于终态
 */
export function isTransferFinal(status: string): boolean {
  return FINAL_TRANSFER_STATUSES.includes(status as any);
}

/**
 * 获取任务状态标签
 */
export function getTransferStatusLabel(status: string): string {
  return TRANSFER_STATUS_LABELS[status] || '未知状态';
}

/**
 * 标准化状态（大写转小写）
 */
export function normalizeTransferStatus(status: string): TransferStatus {
  const upperStatus = status.toUpperCase();
  switch (upperStatus) {
    case 'PENDING':
      return TRANSFER_STATUS.PENDING;
    case 'ACCEPTED':
      return TRANSFER_STATUS.ACCEPTED;
    case 'COMPLETED':
      return TRANSFER_STATUS.COMPLETED;
    case 'CANCELLED':
      return TRANSFER_STATUS.CANCELLED;
    default:
      return status as TransferStatus;
  }
}
