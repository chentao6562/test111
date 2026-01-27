/**
 * 库存服务（兼容入口）
 *
 * 本文件已拆分为多个子模块，保留此文件以保持向后兼容
 * 新代码建议直接从 './stock' 导入
 *
 * 拆分结构：
 * - stock/stockConstants.ts   - 常量定义
 * - stock/stockQuery.ts       - 查询逻辑
 * - stock/stockOperations.ts  - 入库/出库/调整操作
 * - stock/stockLocking.ts     - 锁定/解锁/扣减批量操作
 * - stock/stockValidation.ts  - 库存校验
 *
 * Phase 2 Task 2.2
 */

// Re-export 所有内容
export {
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
} from './stock';

// 导出类型
export type {
  StockStatus,
  StockLogType,
  StockListParams,
  StockInParams,
  StockAdjustParams,
  OrderItemForStock,
  StockOperationResult,
  DeductStockOptions,
  InsufficientItem,
  StockAvailabilityResult,
  InventoryCheckParams,
} from './stock';

// 默认导出
export { default } from './stock';
