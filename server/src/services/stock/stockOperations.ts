/**
 * 库存操作服务
 * 负责：入库、出库、调整、预警设置
 * Phase 2 Task 2.2
 */

import prisma from '../../utils/prisma';
import { STOCK_LOG_TYPE, getStockStatus } from './stockConstants';

/**
 * 入库参数
 */
export interface StockInParams {
  productId: number;
  quantity: number;
  remark?: string;
  operatorId?: number;
  operatorName?: string;
}

/**
 * 入库操作
 */
export async function stockIn(params: StockInParams) {
  const { productId, quantity, remark, operatorId, operatorName } = params;

  if (quantity <= 0) {
    throw new Error('入库数量必须大于0');
  }

  // 获取当前库存
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error('商品不存在');
  }

  const beforeStock = product.stock;
  const afterStock = beforeStock + quantity;

  // 使用事务更新库存和创建日志
  const [updatedProduct, stockLog] = await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { stock: afterStock },
    }),
    prisma.stockLog.create({
      data: {
        productId,
        type: STOCK_LOG_TYPE.IN,
        quantity,
        beforeStock,
        afterStock,
        operatorId,
        operatorName,
        remark: remark || '入库操作',
      },
    }),
  ]);

  return {
    product: {
      id: updatedProduct.id,
      name: updatedProduct.name,
      stock: updatedProduct.stock,
    },
    stockLog,
  };
}

/**
 * 库存调整参数
 */
export interface StockAdjustParams {
  productId: number;
  adjustQuantity: number; // 正数增加，负数减少
  reason: string;
  operatorId?: number;
  operatorName?: string;
}

/**
 * 库存调整
 */
export async function stockAdjust(params: StockAdjustParams) {
  const { productId, adjustQuantity, reason, operatorId, operatorName } = params;

  if (adjustQuantity === 0) {
    throw new Error('调整数量不能为0');
  }

  // 获取当前库存
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error('商品不存在');
  }

  const beforeStock = product.stock;
  const afterStock = beforeStock + adjustQuantity;

  if (afterStock < 0) {
    throw new Error('调整后库存不能为负数');
  }

  // 使用事务更新库存和创建日志
  const [updatedProduct, stockLog] = await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { stock: afterStock },
    }),
    prisma.stockLog.create({
      data: {
        productId,
        type: STOCK_LOG_TYPE.ADJUST,
        quantity: adjustQuantity,
        beforeStock,
        afterStock,
        operatorId,
        operatorName,
        remark: reason || '库存调整',
      },
    }),
  ]);

  return {
    product: {
      id: updatedProduct.id,
      name: updatedProduct.name,
      stock: updatedProduct.stock,
    },
    stockLog,
  };
}

/**
 * 出库操作（内部使用，订单发货时调用）
 */
export async function stockOut(
  productId: number,
  quantity: number,
  orderId: number,
  operatorId?: number,
  operatorName?: string
) {
  if (quantity <= 0) {
    throw new Error('出库数量必须大于0');
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error('商品不存在');
  }

  const beforeStock = product.stock;
  const afterStock = beforeStock - quantity;

  if (afterStock < 0) {
    throw new Error('库存不足');
  }

  const [updatedProduct, stockLog] = await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { stock: afterStock },
    }),
    prisma.stockLog.create({
      data: {
        productId,
        type: STOCK_LOG_TYPE.OUT,
        quantity: -quantity,
        beforeStock,
        afterStock,
        orderId,
        operatorId,
        operatorName,
        remark: `订单出库 #${orderId}`,
      },
    }),
  ]);

  return { updatedProduct, stockLog };
}

/**
 * 设置预警值
 */
export async function setStockWarning(productId: number, minStock: number) {
  if (minStock < 0) {
    throw new Error('预警值不能为负数');
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error('商品不存在');
  }

  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: { minStock },
  });

  return {
    id: updatedProduct.id,
    name: updatedProduct.name,
    minStock: updatedProduct.minStock,
    status: getStockStatus(updatedProduct.stock, updatedProduct.minStock),
  };
}
