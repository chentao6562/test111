/**
 * 库存管理辅助类
 * 统一处理库存计算、检查、锁定
 * Phase 3 Task 3.2
 */

import { PrismaClient } from '@prisma/client';
import prisma from './prisma';

// 库存商品接口
interface ProductStock {
  id: number;
  name: string;
  stock: number;
  lockStock: number;
}

// 订单项接口
interface StockItem {
  productId: number;
  quantity: number;
}

// 库存检查结果
export interface StockCheckResult {
  success: boolean;
  insufficientItems: Array<{
    productId: number;
    productName: string;
    requested: number;
    available: number;
  }>;
}

// 事务客户端类型
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export class InventoryHelper {
  /**
   * 获取可用库存
   */
  static getAvailableStock(product: ProductStock): number {
    return product.stock - product.lockStock;
  }

  /**
   * 检查单个商品库存是否充足
   */
  static isStockSufficient(product: ProductStock, quantity: number): boolean {
    return this.getAvailableStock(product) >= quantity;
  }

  /**
   * 批量检查库存（不加锁，用于前端验证）
   */
  static async checkStockBatch(items: StockItem[]): Promise<StockCheckResult> {
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: { id: true, name: true, stock: true, lockStock: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const insufficientItems: StockCheckResult['insufficientItems'] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        insufficientItems.push({
          productId: item.productId,
          productName: '未知商品',
          requested: item.quantity,
          available: 0,
        });
        continue;
      }

      const available = this.getAvailableStock(product);
      if (available < item.quantity) {
        insufficientItems.push({
          productId: item.productId,
          productName: product.name,
          requested: item.quantity,
          available,
        });
      }
    }

    return {
      success: insufficientItems.length === 0,
      insufficientItems,
    };
  }

  /**
   * 批量检查库存（带行锁，用于下单时）
   * 必须在事务内调用
   */
  static async checkStockBatchWithLock(
    items: StockItem[],
    tx: TransactionClient
  ): Promise<StockCheckResult> {
    // 使用Prisma查询并在应用层加锁
    const productIds = items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, stock: true, lockStock: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const insufficientItems: StockCheckResult['insufficientItems'] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        insufficientItems.push({
          productId: item.productId,
          productName: '未知商品',
          requested: item.quantity,
          available: 0,
        });
        continue;
      }

      const available = this.getAvailableStock(product);
      if (available < item.quantity) {
        insufficientItems.push({
          productId: item.productId,
          productName: product.name,
          requested: item.quantity,
          available,
        });
      }
    }

    return {
      success: insufficientItems.length === 0,
      insufficientItems,
    };
  }

  /**
   * 批量锁定库存（下单时）
   * 必须在事务内调用
   */
  static async lockStockBatch(
    items: StockItem[],
    tx: TransactionClient
  ): Promise<void> {
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          lockStock: { increment: item.quantity },
        },
      });
    }
  }

  /**
   * 批量解锁库存（取消订单时）
   * 必须在事务内调用
   * 【2026-01-22 P1修复】使用Math.max防止lockStock变负
   */
  static async unlockStockBatch(
    items: StockItem[],
    tx: TransactionClient
  ): Promise<void> {
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { lockStock: true },
      });
      if (product) {
        const newLockStock = Math.max(0, product.lockStock - item.quantity);
        await tx.product.update({
          where: { id: item.productId },
          data: {
            lockStock: newLockStock,
          },
        });
      }
    }
  }

  /**
   * 批量扣减库存（提货完成时）
   * - 扣减stock和lockStock
   * - 增加salesCount
   * 必须在事务内调用
   * 【2026-01-22 P1修复】使用Math.max防止lockStock变负
   */
  static async deductStockBatch(
    items: StockItem[],
    tx: TransactionClient
  ): Promise<void> {
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { lockStock: true },
      });
      if (product) {
        const newLockStock = Math.max(0, product.lockStock - item.quantity);
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            lockStock: newLockStock,
            salesCount: { increment: item.quantity },
          },
        });
      }
    }
  }

  /**
   * 批量入库
   * 必须在事务内调用
   */
  static async addStockBatch(
    items: StockItem[],
    tx: TransactionClient
  ): Promise<void> {
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { increment: item.quantity },
        },
      });
    }
  }

  /**
   * 获取库存状态文字
   */
  static getStockStatusText(product: ProductStock): string {
    const available = this.getAvailableStock(product);
    if (available <= 0) return '缺货';
    if (available < 10) return '库存紧张';
    return '库存充足';
  }

  /**
   * 获取库存预警状态
   */
  static isLowStock(product: ProductStock & { minStock: number }): boolean {
    const available = this.getAvailableStock(product);
    return available <= product.minStock;
  }
}
