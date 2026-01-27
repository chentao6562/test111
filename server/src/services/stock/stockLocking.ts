/**
 * 库存锁定服务
 * 负责：批量锁定、解锁、扣减库存
 * Phase 2 Task 2.2
 */

import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { STOCK_LOG_TYPE } from './stockConstants';

/**
 * 订单商品项接口
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
 * 提货出库选项
 */
export interface DeductStockOptions {
  operatorId?: number; // 操作人ID（库管/货管）
  remark?: string; // 备注
  updateSalesCount?: boolean; // 是否更新销量（默认true）
  releaseLockStock?: boolean; // 是否同时释放锁定库存（默认true）
}

/**
 * 批量扣减库存（提货完成时调用）
 * 【P2重构】统一的库存扣减函数，替代pickupQRService中的重复代码
 *
 * @param items 订单商品列表
 * @param orderId 订单ID
 * @param tx 事务客户端（必须在事务中调用）
 * @param options 可选配置
 */
export async function deductStockBatch(
  items: OrderItemForStock[],
  orderId: number,
  tx: Prisma.TransactionClient,
  options?: DeductStockOptions
): Promise<StockOperationResult> {
  const {
    operatorId,
    remark = `订单提货扣减 - 订单ID: ${orderId}`,
    updateSalesCount = true,
    releaseLockStock = true,
  } = options || {};

  const updatedProducts: number[] = [];
  const failedProducts: { productId: number; reason: string }[] = [];

  try {
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        failedProducts.push({
          productId: item.productId,
          reason: '商品不存在',
        });
        continue;
      }

      const beforeStock = product.stock;
      const afterStock = beforeStock - item.quantity;

      // 检查库存是否充足
      if (afterStock < 0) {
        failedProducts.push({
          productId: item.productId,
          reason: `库存不足，当前库存: ${beforeStock}`,
        });
        continue;
      }

      // 构建更新数据
      const updateData: Prisma.ProductUpdateInput = {
        stock: afterStock,
      };

      // 同时释放锁定库存
      // 【2026-01-22 P1修复】使用Math.max防止lockStock变负
      if (releaseLockStock) {
        const newLockStock = Math.max(0, product.lockStock - item.quantity);
        updateData.lockStock = newLockStock;
      }

      // 更新销量
      if (updateSalesCount) {
        updateData.salesCount = { increment: item.quantity };
      }

      // 扣减库存
      await tx.product.update({
        where: { id: item.productId },
        data: updateData,
      });

      // 记录库存日志
      await tx.stockLog.create({
        data: {
          productId: item.productId,
          type: STOCK_LOG_TYPE.OUT,
          quantity: -item.quantity,
          beforeStock,
          afterStock,
          orderId,
          operatorId,
          remark,
        },
      });

      updatedProducts.push(item.productId);
    }

    if (failedProducts.length > 0) {
      return {
        success: false,
        error: '部分商品库存扣减失败',
        updatedProducts,
        failedProducts,
      };
    }

    return { success: true, updatedProducts };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || '库存扣减失败',
      updatedProducts,
      failedProducts,
    };
  }
}

/**
 * 锁定库存（下单时调用）
 * 【P0修复】使用行级锁防止并发超卖
 * @param items 订单商品列表
 * @param orderId 订单ID
 * @param tx 事务客户端（必须在事务中调用以确保行级锁有效）
 */
export async function lockStockBatch(
  items: OrderItemForStock[],
  orderId: number,
  tx?: Prisma.TransactionClient
): Promise<StockOperationResult> {
  const client = tx || prisma;
  const updatedProducts: number[] = [];
  const failedProducts: { productId: number; reason: string }[] = [];

  try {
    for (const item of items) {
      // 【P0修复】使用 FOR UPDATE 加行级锁，防止并发读取导致超卖
      // 注意：必须在事务中调用才能生效
      const products = await client.$queryRaw<
        { id: number; stock: number; lockStock: number; name: string }[]
      >`SELECT id, stock, lockStock, name FROM products WHERE id = ${item.productId} FOR UPDATE`;

      if (!products || products.length === 0) {
        failedProducts.push({
          productId: item.productId,
          reason: '商品不存在',
        });
        continue;
      }

      const product = products[0];
      const availableStock = product.stock - product.lockStock;

      if (availableStock < item.quantity) {
        failedProducts.push({
          productId: item.productId,
          reason: `可用库存不足，可用: ${availableStock}，需要: ${item.quantity}`,
        });
        continue;
      }

      // 增加锁定库存（此时行已被锁定，不会有并发问题）
      await client.product.update({
        where: { id: item.productId },
        data: {
          lockStock: { increment: item.quantity },
        },
      });

      updatedProducts.push(item.productId);
    }

    if (failedProducts.length > 0) {
      return {
        success: false,
        error: '部分商品库存锁定失败',
        updatedProducts,
        failedProducts,
      };
    }

    return { success: true, updatedProducts };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || '库存锁定失败',
      updatedProducts,
      failedProducts,
    };
  }
}

/**
 * 释放锁定库存（取消订单时调用）
 * @param items 订单商品列表
 * @param orderId 订单ID
 * @param tx 事务客户端
 */
export async function unlockStockBatch(
  items: OrderItemForStock[],
  orderId: number,
  tx?: Prisma.TransactionClient
): Promise<StockOperationResult> {
  const client = tx || prisma;
  const updatedProducts: number[] = [];
  const failedProducts: { productId: number; reason: string }[] = [];

  try {
    for (const item of items) {
      const product = await client.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        failedProducts.push({
          productId: item.productId,
          reason: '商品不存在',
        });
        continue;
      }

      // 减少锁定库存
      const newLockStock = Math.max(0, product.lockStock - item.quantity);
      await client.product.update({
        where: { id: item.productId },
        data: { lockStock: newLockStock },
      });

      updatedProducts.push(item.productId);
    }

    if (failedProducts.length > 0) {
      return {
        success: false,
        error: '部分商品库存释放失败',
        updatedProducts,
        failedProducts,
      };
    }

    return { success: true, updatedProducts };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || '库存释放失败',
      updatedProducts,
      failedProducts,
    };
  }
}

/**
 * 支付成功后处理库存（扣减实际库存 + 释放锁定库存）
 * @param items 订单商品列表
 * @param orderId 订单ID
 * @param tx 事务客户端
 */
export async function settleStockOnPayment(
  items: OrderItemForStock[],
  orderId: number,
  tx?: Prisma.TransactionClient
): Promise<StockOperationResult> {
  const client = tx || prisma;
  const updatedProducts: number[] = [];

  try {
    for (const item of items) {
      const product = await client.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) continue;

      const beforeStock = product.stock;
      const afterStock = beforeStock - item.quantity;

      // 扣减实际库存，同时减少锁定库存
      // 【2026-01-22 P1修复】使用Math.max防止lockStock变负
      const newLockStock = Math.max(0, product.lockStock - item.quantity);
      await client.product.update({
        where: { id: item.productId },
        data: {
          stock: afterStock,
          lockStock: newLockStock,
        },
      });

      // 记录库存日志
      await client.stockLog.create({
        data: {
          productId: item.productId,
          type: STOCK_LOG_TYPE.OUT,
          quantity: -item.quantity,
          beforeStock,
          afterStock,
          orderId,
          remark: `订单支付扣减库存 - 订单ID: ${orderId}`,
        },
      });

      updatedProducts.push(item.productId);
    }

    return { success: true, updatedProducts };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || '库存结算失败',
      updatedProducts,
    };
  }
}
