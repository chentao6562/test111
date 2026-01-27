/**
 * 支付状态服务
 * 集中处理支付状态的计算和验证逻辑
 *
 * 消除重复：pickupQRService中多次重复的支付状态计算逻辑
 */

import { Decimal } from '@prisma/client/runtime/library';

// 支付状态类型（2026-01-11简化：取消定金，统一全款）
export type PaymentStatus = 'unpaid' | 'full_paid';

// 支付状态标签
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: '未付款',
  full_paid: '已付款',
};

// 支付状态提示（用于提货时显示）
export const PAYMENT_STATUS_HINTS: Record<PaymentStatus, string> = {
  unpaid: '订单未付款',
  full_paid: '款项已付清',
};

// 订单支付信息接口
export interface OrderPaymentInfo {
  paidAmount: number | Decimal;
  totalAmount: number | Decimal;
  depositAmount?: number | Decimal | null;
  depositPaid?: boolean | null;
  fullPaid?: boolean | null;
}

// 支付状态结果接口
export interface PaymentStatusResult {
  status: PaymentStatus;
  label: string;
  hint: string;
  isPaid: boolean;
  isFullPaid: boolean;
  isDepositPaid: boolean;
  paidAmount: number;
  totalAmount: number;
  remainingAmount: number;
  depositAmount: number;
}

/**
 * 计算支付状态
 * 【2026-01-11简化】取消定金，统一为全款支付
 * @param order 订单支付信息
 * @returns 支付状态结果
 */
export function calculatePaymentStatus(order: OrderPaymentInfo): PaymentStatusResult {
  const paidAmount = Number(order.paidAmount || 0);
  const totalAmount = Number(order.totalAmount || 0);
  const depositAmount = Number(order.depositAmount || 0);

  // 如果有明确的支付状态字段，优先使用
  if (order.fullPaid === true) {
    return buildResult('full_paid', paidAmount, totalAmount, depositAmount);
  }

  // 基于金额计算：已付金额 >= 总金额 视为已付款
  if (paidAmount >= totalAmount && totalAmount > 0) {
    return buildResult('full_paid', paidAmount, totalAmount, depositAmount);
  }

  // 其他情况均为未付款
  return buildResult('unpaid', paidAmount, totalAmount, depositAmount);
}

/**
 * 构建支付状态结果
 */
function buildResult(
  status: PaymentStatus,
  paidAmount: number,
  totalAmount: number,
  depositAmount: number
): PaymentStatusResult {
  return {
    status,
    label: PAYMENT_STATUS_LABELS[status],
    hint: PAYMENT_STATUS_HINTS[status],
    isPaid: status !== 'unpaid',
    isFullPaid: status === 'full_paid',
    isDepositPaid: status === 'full_paid', // 【2026-01-11简化】取消定金后，只有全款才算已付
    paidAmount,
    totalAmount,
    remainingAmount: Math.max(0, totalAmount - paidAmount),
    depositAmount,
  };
}

/**
 * 检查是否需要收取款项
 */
export function needsPaymentCollection(order: OrderPaymentInfo): boolean {
  const status = calculatePaymentStatus(order);
  return !status.isFullPaid;
}

/**
 * 获取待收金额
 */
export function getRemainingAmount(order: OrderPaymentInfo): number {
  const status = calculatePaymentStatus(order);
  return status.remainingAmount;
}

/**
 * 检查是否满足提货条件
 * 【2026-01-11简化】所有订单必须全款才能提货
 */
export function canPickup(order: OrderPaymentInfo, needTransfer: boolean): boolean {
  const status = calculatePaymentStatus(order);
  // 统一要求：必须全款才能提货
  return status.isFullPaid;
}

/**
 * 计算新的支付状态字段（用于updatePayment）
 */
export function calculatePaymentFields(
  currentPaidAmount: number,
  addAmount: number,
  totalAmount: number,
  depositAmount: number
): { depositPaid: boolean; fullPaid: boolean; newPaidAmount: number } {
  const newPaidAmount = currentPaidAmount + addAmount;
  const depositPaid = depositAmount > 0
    ? newPaidAmount >= depositAmount
    : newPaidAmount > 0;
  const fullPaid = newPaidAmount >= totalAmount;

  return {
    depositPaid,
    fullPaid,
    newPaidAmount,
  };
}

/**
 * 格式化支付信息用于显示
 * 【2026-01-11简化】只显示已付款/未付款
 */
export function formatPaymentInfo(order: OrderPaymentInfo): string {
  const status = calculatePaymentStatus(order);

  if (status.isFullPaid) {
    return `已付款 ¥${status.paidAmount.toFixed(2)}`;
  }

  return `未付款，应收 ¥${status.totalAmount.toFixed(2)}`;
}
