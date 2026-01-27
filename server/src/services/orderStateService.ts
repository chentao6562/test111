/**
 * 订单状态服务
 * 集中处理订单状态的验证和转换逻辑
 *
 * 消除重复：多处重复的订单状态验证代码
 */

import {
  ORDER_STATUS,
  OrderStatus,
  canCancel,
  canAccept,
  canCompletePrepare,
  isFinalStatus,
  canWarehousePickup,
  canLogisticsPickup,
  canTransferHandover,
  getStatusLabel,
  getNextSelfPickupStatus,
  getNextLockStockStatus,
  SELF_PICKUP_FLOW,
  LOCK_STOCK_FLOW,
} from '../constants/orderStatus';

// 订单基本信息接口（用于状态验证）
export interface OrderStateInfo {
  id: number;
  status: string;
  needTransfer: boolean;
  agentId?: number;
  warehouseVerifiedAt?: Date | null;
  logisticsVerifiedAt?: Date | null;
}

// 状态验证结果
export interface StateValidationResult {
  valid: boolean;
  error?: string;
  currentStatus: string;
  currentLabel: string;
}

// 状态转换结果
export interface StateTransitionResult {
  success: boolean;
  error?: string;
  fromStatus: string;
  toStatus: string;
  fromLabel: string;
  toLabel: string;
}

/**
 * 验证订单是否可以取消
 */
export function validateCancel(order: OrderStateInfo): StateValidationResult {
  const currentLabel = getStatusLabel(order.status);

  if (!canCancel(order.status)) {
    return {
      valid: false,
      error: `订单当前状态为"${currentLabel}"，无法取消`,
      currentStatus: order.status,
      currentLabel,
    };
  }

  return {
    valid: true,
    currentStatus: order.status,
    currentLabel,
  };
}

/**
 * 验证订单是否可以接单
 */
export function validateAccept(order: OrderStateInfo): StateValidationResult {
  const currentLabel = getStatusLabel(order.status);

  if (!canAccept(order.status)) {
    return {
      valid: false,
      error: `订单当前状态为"${currentLabel}"，无法接单`,
      currentStatus: order.status,
      currentLabel,
    };
  }

  return {
    valid: true,
    currentStatus: order.status,
    currentLabel,
  };
}

/**
 * 验证订单是否可以完成备货
 */
export function validateCompletePrepare(order: OrderStateInfo): StateValidationResult {
  const currentLabel = getStatusLabel(order.status);

  if (!canCompletePrepare(order.status)) {
    return {
      valid: false,
      error: `订单当前状态为"${currentLabel}"，无法完成备货`,
      currentStatus: order.status,
      currentLabel,
    };
  }

  return {
    valid: true,
    currentStatus: order.status,
    currentLabel,
  };
}

/**
 * 验证订单是否可以被库管提货核销（自提模式）
 */
export function validateWarehousePickup(order: OrderStateInfo): StateValidationResult {
  const currentLabel = getStatusLabel(order.status);

  if (!canWarehousePickup(order.status, order.needTransfer)) {
    if (order.needTransfer) {
      return {
        valid: false,
        error: '锁货订单需由货管核销，库管只能进行移库交接',
        currentStatus: order.status,
        currentLabel,
      };
    }
    return {
      valid: false,
      error: `订单当前状态为"${currentLabel}"，无法提货核销`,
      currentStatus: order.status,
      currentLabel,
    };
  }

  return {
    valid: true,
    currentStatus: order.status,
    currentLabel,
  };
}

/**
 * 验证订单是否可以被货管提货核销（锁货模式）
 */
export function validateLogisticsPickup(order: OrderStateInfo): StateValidationResult {
  const currentLabel = getStatusLabel(order.status);

  if (!canLogisticsPickup(order.status, order.needTransfer)) {
    if (!order.needTransfer) {
      return {
        valid: false,
        error: '自提订单需由库管核销',
        currentStatus: order.status,
        currentLabel,
      };
    }
    return {
      valid: false,
      error: `订单当前状态为"${currentLabel}"，无法提货核销`,
      currentStatus: order.status,
      currentLabel,
    };
  }

  return {
    valid: true,
    currentStatus: order.status,
    currentLabel,
  };
}

/**
 * 验证订单是否可以进行移库交接
 */
export function validateTransferHandover(order: OrderStateInfo): StateValidationResult {
  const currentLabel = getStatusLabel(order.status);

  if (!canTransferHandover(order.status, order.needTransfer)) {
    if (!order.needTransfer) {
      return {
        valid: false,
        error: '自提订单无需移库',
        currentStatus: order.status,
        currentLabel,
      };
    }
    return {
      valid: false,
      error: `订单当前状态为"${currentLabel}"，无法进行移库交接`,
      currentStatus: order.status,
      currentLabel,
    };
  }

  return {
    valid: true,
    currentStatus: order.status,
    currentLabel,
  };
}

/**
 * 验证订单所有权（代理商）
 */
export function validateOwnership(order: OrderStateInfo, agentId: number): StateValidationResult {
  const currentLabel = getStatusLabel(order.status);

  if (order.agentId !== agentId) {
    return {
      valid: false,
      error: '无权操作此订单',
      currentStatus: order.status,
      currentLabel,
    };
  }

  return {
    valid: true,
    currentStatus: order.status,
    currentLabel,
  };
}

/**
 * 获取下一个状态
 */
export function getNextStatus(order: OrderStateInfo): OrderStatus | null {
  if (order.needTransfer) {
    return getNextLockStockStatus(order.status);
  }
  return getNextSelfPickupStatus(order.status);
}

/**
 * 计算备货完成后的下一状态
 * 【财务流程调整】锁货订单直接进入待移库（不再有待付锁货费状态）
 */
export function getStatusAfterPrepare(needTransfer: boolean): OrderStatus {
  if (needTransfer) {
    return ORDER_STATUS.PENDING_TRANSFER;
  }
  return ORDER_STATUS.PENDING_PICKUP;
}

/**
 * 计算接单后的下一状态
 */
export function getStatusAfterAccept(): OrderStatus {
  return ORDER_STATUS.PREPARING;
}

/**
 * 计算提货完成后的状态
 */
export function getStatusAfterPickup(): OrderStatus {
  return ORDER_STATUS.COMPLETED;
}

/**
 * 计算取消后的状态
 */
export function getStatusAfterCancel(): OrderStatus {
  return ORDER_STATUS.CANCELLED;
}

/**
 * 获取完整的状态流程
 */
export function getStatusFlow(needTransfer: boolean): OrderStatus[] {
  return needTransfer ? LOCK_STOCK_FLOW : SELF_PICKUP_FLOW;
}

/**
 * 检查状态是否在流程中
 */
export function isStatusInFlow(status: string, needTransfer: boolean): boolean {
  const flow = getStatusFlow(needTransfer);
  return flow.includes(status as OrderStatus);
}

/**
 * 获取当前状态在流程中的位置（用于进度显示）
 */
export function getStatusProgress(status: string, needTransfer: boolean): { current: number; total: number; percentage: number } {
  const flow = getStatusFlow(needTransfer);
  const currentIndex = flow.indexOf(status as OrderStatus);

  if (currentIndex === -1) {
    return { current: 0, total: flow.length, percentage: 0 };
  }

  const total = flow.length - 1; // 不算cancelled
  const percentage = Math.round((currentIndex / total) * 100);

  return {
    current: currentIndex + 1,
    total: total + 1,
    percentage: Math.min(percentage, 100),
  };
}

// 导出常量供其他模块使用
export { ORDER_STATUS, getStatusLabel, isFinalStatus };
