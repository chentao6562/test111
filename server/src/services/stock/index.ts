/**
 * 库存服务模块入口
 * 保持向后兼容，re-export所有函数
 * Phase 2 Task 2.2
 */

// 导出常量和类型
export { STOCK_STATUS, STOCK_LOG_TYPE, getStockStatus } from './stockConstants';
export type { StockStatus, StockLogType } from './stockConstants';

// 导出查询函数
export {
  getStockList,
  getStockStatistics,
  getStockDetail,
  getStockLogs,
  getAllStockLogs,
  findProductByCode,
  inventoryCheck,
} from './stockQuery';
export type { StockListParams, InventoryCheckParams } from './stockQuery';

// 导出操作函数
export { stockIn, stockAdjust, stockOut, setStockWarning } from './stockOperations';
export type { StockInParams, StockAdjustParams } from './stockOperations';

// 导出锁定函数
export {
  deductStockBatch,
  lockStockBatch,
  unlockStockBatch,
  settleStockOnPayment,
} from './stockLocking';
export type {
  OrderItemForStock,
  StockOperationResult,
  DeductStockOptions,
} from './stockLocking';

// 导出校验函数
export {
  checkStockAvailability,
  getAvailableStock,
  getAvailableStockBatch,
  isStockSufficient,
} from './stockValidation';
export type { InsufficientItem, StockAvailabilityResult } from './stockValidation';

// 默认导出（保持向后兼容）
import { STOCK_STATUS, STOCK_LOG_TYPE, getStockStatus } from './stockConstants';
import {
  getStockList,
  getStockStatistics,
  getStockDetail,
  getStockLogs,
  getAllStockLogs,
  findProductByCode,
  inventoryCheck,
} from './stockQuery';
import { stockIn, stockAdjust, stockOut, setStockWarning } from './stockOperations';
import {
  deductStockBatch,
  lockStockBatch,
  unlockStockBatch,
  settleStockOnPayment,
} from './stockLocking';
import {
  checkStockAvailability,
  getAvailableStock,
  getAvailableStockBatch,
  isStockSufficient,
} from './stockValidation';

export default {
  // 常量
  STOCK_STATUS,
  STOCK_LOG_TYPE,
  getStockStatus,
  // 查询
  getStockList,
  getStockStatistics,
  getStockDetail,
  getStockLogs,
  getAllStockLogs,
  findProductByCode,
  inventoryCheck,
  // 操作
  stockIn,
  stockAdjust,
  stockOut,
  setStockWarning,
  // 锁定
  deductStockBatch,
  lockStockBatch,
  unlockStockBatch,
  settleStockOnPayment,
  // 校验
  checkStockAvailability,
  getAvailableStock,
  getAvailableStockBatch,
  isStockSufficient,
};
