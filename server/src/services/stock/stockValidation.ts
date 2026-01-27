/**
 * 库存校验服务
 * 负责：库存检查、可用库存查询
 * Phase 2 Task 2.2
 */

import prisma from '../../utils/prisma';
import { OrderItemForStock } from './stockLocking';

/**
 * 库存不足商品信息
 */
export interface InsufficientItem {
  productId: number;
  productName: string;
  required: number;
  available: number;
}

/**
 * 库存检查结果
 */
export interface StockAvailabilityResult {
  available: boolean;
  insufficientItems: InsufficientItem[];
}

/**
 * 检查库存是否充足
 */
export async function checkStockAvailability(
  items: OrderItemForStock[]
): Promise<StockAvailabilityResult> {
  const insufficientItems: InsufficientItem[] = [];

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { id: true, name: true, stock: true, lockStock: true },
    });

    if (!product) {
      insufficientItems.push({
        productId: item.productId,
        productName: item.productName || '未知商品',
        required: item.quantity,
        available: 0,
      });
      continue;
    }

    const availableStock = product.stock - product.lockStock;
    if (availableStock < item.quantity) {
      insufficientItems.push({
        productId: item.productId,
        productName: product.name,
        required: item.quantity,
        available: availableStock,
      });
    }
  }

  return {
    available: insufficientItems.length === 0,
    insufficientItems,
  };
}

/**
 * 获取商品可用库存
 */
export async function getAvailableStock(productId: number): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true, lockStock: true },
  });

  if (!product) {
    return 0;
  }

  return Math.max(0, product.stock - product.lockStock);
}

/**
 * 批量获取商品可用库存
 */
export async function getAvailableStockBatch(
  productIds: number[]
): Promise<Map<number, number>> {
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, stock: true, lockStock: true },
  });

  const result = new Map<number, number>();
  products.forEach((product) => {
    result.set(product.id, Math.max(0, product.stock - product.lockStock));
  });

  return result;
}

/**
 * 检查单个商品库存是否充足
 */
export async function isStockSufficient(
  productId: number,
  quantity: number
): Promise<boolean> {
  const availableStock = await getAvailableStock(productId);
  return availableStock >= quantity;
}
