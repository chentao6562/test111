/**
 * 预约状态常量
 * 【2026-01-17 代码重构】统一各端的状态定义
 *
 * 注意：此文件为公共库，被多端引用
 * - h5-agent
 * - h5-warehouse
 * - miniprogram-agent
 * - admin
 */

// 预约状态枚举
export const ReservationStatus = {
  PENDING: 0,          // 待确认
  CALLING: 1,          // 确认中
  CONFIRMED: 2,        // 已确认
  COMPLETED: 3,        // 已完成
  CANCELLED: 4,        // 已取消
  EXPIRED: 5,          // 已过期
  CALL_FAILED: 6,      // 确认失败
  PENDING_PREPARE: 7,  // 待备货
  PREPARING: 8,        // 备货中
  PENDING_PICKUP: 9,   // 待提货
} as const;

export type ReservationStatusType = typeof ReservationStatus[keyof typeof ReservationStatus];

// 状态文本标签
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

// 状态颜色（用于UI展示）
export const ReservationStatusColors: Record<number, string> = {
  [ReservationStatus.PENDING]: '#E6A23C',        // 橙色
  [ReservationStatus.CALLING]: '#409EFF',        // 蓝色
  [ReservationStatus.CONFIRMED]: '#67C23A',      // 绿色
  [ReservationStatus.COMPLETED]: '#909399',      // 灰色
  [ReservationStatus.CANCELLED]: '#F56C6C',      // 红色
  [ReservationStatus.EXPIRED]: '#909399',        // 灰色
  [ReservationStatus.CALL_FAILED]: '#F56C6C',    // 红色
  [ReservationStatus.PENDING_PREPARE]: '#E6A23C', // 橙色
  [ReservationStatus.PREPARING]: '#409EFF',      // 蓝色
  [ReservationStatus.PENDING_PICKUP]: '#67C23A', // 绿色
};

// TDesign 主题颜色映射
export const ReservationStatusThemes: Record<number, 'warning' | 'primary' | 'success' | 'default' | 'danger'> = {
  [ReservationStatus.PENDING]: 'warning',
  [ReservationStatus.CALLING]: 'primary',
  [ReservationStatus.CONFIRMED]: 'success',
  [ReservationStatus.COMPLETED]: 'default',
  [ReservationStatus.CANCELLED]: 'danger',
  [ReservationStatus.EXPIRED]: 'default',
  [ReservationStatus.CALL_FAILED]: 'danger',
  [ReservationStatus.PENDING_PREPARE]: 'warning',
  [ReservationStatus.PREPARING]: 'primary',
  [ReservationStatus.PENDING_PICKUP]: 'success',
};

/**
 * 获取状态文本
 */
export function getStatusLabel(status: number): string {
  return ReservationStatusLabels[status] || '未知';
}

/**
 * 获取状态颜色
 */
export function getStatusColor(status: number): string {
  return ReservationStatusColors[status] || '#909399';
}

/**
 * 获取状态主题
 */
export function getStatusTheme(status: number): 'warning' | 'primary' | 'success' | 'default' | 'danger' {
  return ReservationStatusThemes[status] || 'default';
}

/**
 * 判断是否为待处理状态
 */
export function isPendingStatus(status: number): boolean {
  return status === ReservationStatus.PENDING || status === ReservationStatus.CALLING;
}

/**
 * 判断是否为可核销状态
 */
export function isPickupableStatus(status: number): boolean {
  return status === ReservationStatus.CONFIRMED || status === ReservationStatus.PENDING_PICKUP;
}

/**
 * 判断是否为终态
 */
export function isFinalStatus(status: number): boolean {
  return [
    ReservationStatus.COMPLETED,
    ReservationStatus.CANCELLED,
    ReservationStatus.EXPIRED,
    ReservationStatus.CALL_FAILED,
  ].includes(status);
}
