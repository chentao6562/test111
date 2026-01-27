/**
 * 库存常量定义
 * Phase 2 Task 2.2
 */

// 库存状态枚举
export const STOCK_STATUS = {
  NORMAL: 'NORMAL', // 正常
  WARNING: 'WARNING', // 预警
  OUT_OF_STOCK: 'OUT_OF_STOCK', // 缺货
} as const;

export type StockStatus = (typeof STOCK_STATUS)[keyof typeof STOCK_STATUS];

// 库存变动类型
export const STOCK_LOG_TYPE = {
  IN: 'IN', // 入库
  OUT: 'OUT', // 出库
  ADJUST: 'ADJUST', // 调整
} as const;

export type StockLogType = (typeof STOCK_LOG_TYPE)[keyof typeof STOCK_LOG_TYPE];

/**
 * 获取库存状态
 */
export function getStockStatus(stock: number, minStock: number): StockStatus {
  if (stock <= 0) return STOCK_STATUS.OUT_OF_STOCK;
  if (stock <= minStock) return STOCK_STATUS.WARNING;
  return STOCK_STATUS.NORMAL;
}
