/**
 * 价格计算工具类
 * 统一处理商品价格、订单金额计算
 * Phase 3 Task 3.1
 */

import { Decimal } from '@prisma/client/runtime/library';
import prisma from './prisma';
import type { AgentType } from '../constants/agentTypes';

// 商品价格信息接口
interface ProductPriceInfo {
  id: number;
  retailPrice: Decimal;
  agentPrice: Decimal;
  wholesalePrice: Decimal;
}

// 订单项接口
interface OrderItemInput {
  productId: number;
  quantity: number;
}

export class PriceHelper {
  /**
   * 根据代理商类型获取商品价格
   * 【2026-01-17】移除LEVEL3，系统只保留LEVEL1和LEVEL2
   */
  static getProductPrice(product: ProductPriceInfo, agentType: AgentType): Decimal {
    switch (agentType) {
      case 'WHOLESALE':
        return product.wholesalePrice;
      case 'LEVEL1':
      case 'LEVEL2':
        return product.agentPrice;
      default:
        return product.retailPrice;
    }
  }

  /**
   * 计算商品小计
   */
  static calculateSubtotal(price: Decimal, quantity: number): Decimal {
    return price.mul(quantity);
  }

  /**
   * 计算订单总额
   * @param items 订单商品列表
   * @param agentType 代理商类型
   * @returns 订单总额
   */
  static async calculateOrderTotal(
    items: OrderItemInput[],
    agentType: AgentType
  ): Promise<Decimal> {
    // 查询所有商品信息
    const products = await prisma.product.findMany({
      where: {
        id: { in: items.map((item) => item.productId) },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        retailPrice: true,
        agentPrice: true,
        wholesalePrice: true,
      },
    });

    // 构建商品ID到价格的映射
    const productMap = new Map(products.map((p) => [p.id, p]));

    // 计算总额
    let total = new Decimal(0);
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`商品ID ${item.productId} 不存在或已下架`);
      }

      const price = this.getProductPrice(product, agentType);
      const subtotal = this.calculateSubtotal(price, item.quantity);
      total = total.add(subtotal);
    }

    return total;
  }

  /**
   * 批量计算商品价格（用于购物车等场景）
   */
  static async calculateItemPrices(
    items: OrderItemInput[],
    agentType: AgentType
  ): Promise<Array<{ productId: number; price: Decimal; subtotal: Decimal }>> {
    const products = await prisma.product.findMany({
      where: {
        id: { in: items.map((item) => item.productId) },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        retailPrice: true,
        agentPrice: true,
        wholesalePrice: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`商品ID ${item.productId} 不存在或已下架`);
      }

      const price = this.getProductPrice(product, agentType);
      const subtotal = this.calculateSubtotal(price, item.quantity);

      return {
        productId: item.productId,
        price,
        subtotal,
      };
    });
  }

  /**
   * 格式化价格为字符串（保留2位小数）
   */
  static formatPrice(price: Decimal): string {
    return price.toFixed(2);
  }

  /**
   * 解析价格字符串为Decimal
   */
  static parsePrice(priceStr: string | number): Decimal {
    return new Decimal(priceStr);
  }
}
