import prisma from '../utils/prisma';

/**
 * 获取代理商的购物车列表
 * 【2026-01-19修复】修复价格显示逻辑
 * - 如果有扫码绑定的推销员ID(salespersonId)：显示该推销员设置的零售价
 * - 否则，推销员看到的是上级给的拿货价：
 *   - 一级推销员：看到供货价（总代理给的拿货价）
 *   - 二级推销员：看到上级设置的subPrice（一级给的拿货价），未设置用供货价
 *   - WHOLESALE用户：看到商品默认零售价
 */
export async function getCartItems(agentId: number, salespersonId?: number) {
  const items = await prisma.cartItem.findMany({
    where: { agentId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          images: true,
          retailPrice: true,
          agentPrice: true,
          wholesalePrice: true,
          supplyPrice: true,  // 【2026-01-19】添加供货价字段
          stock: true,
          lockStock: true,
          status: true,
          unit: true,
          specs: true,
          isSpecialPrice: true,  // 【2026-01-26】特价商品标识
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 获取代理商类型和上级ID以确定价格
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { type: true, parentId: true },
  });

  const productIds = items.map(item => item.productId);

  // 【2026-01-19修复】如果有扫码绑定的推销员ID，查询该推销员的零售价
  let salespersonPriceMap: Map<number, number | null> = new Map();
  if (salespersonId && productIds.length > 0) {
    const salespersonPrices = await prisma.agentPrice.findMany({
      where: {
        agentId: salespersonId,
        productId: { in: productIds },
      },
      select: { productId: true, retailPrice: true },
    });
    for (const sp of salespersonPrices) {
      salespersonPriceMap.set(sp.productId, sp.retailPrice ? Number(sp.retailPrice) : null);
    }
  }

  // 【2026-01-19修复】只查询上级设置的subPrice（二级推销员用来确定自己的拿货价）
  let parentSubPriceMap: Map<number, number | null> = new Map();

  // 【2026-01-19修复】只有二级推销员且没有扫码绑定时才需要查询上级的subPrice
  if (!salespersonId && agent?.type === 'LEVEL2' && agent.parentId && productIds.length > 0) {
    const parentPrices = await prisma.agentPrice.findMany({
      where: {
        agentId: agent.parentId,
        productId: { in: productIds },
      },
      select: { productId: true, subPrice: true },
    });
    for (const pp of parentPrices) {
      parentSubPriceMap.set(pp.productId, pp.subPrice ? Number(pp.subPrice) : null);
    }
  }

  // 【2026-01-29修复】查询砍价商品的bargainCode，用于预约时传递
  const bargainIds = items
    .filter(item => item.isBargainItem && item.bargainId)
    .map(item => item.bargainId!);

  let bargainCodeMap = new Map<number, string>();
  if (bargainIds.length > 0) {
    const bargains = await prisma.bargain.findMany({
      where: { id: { in: bargainIds } },
      select: { id: true, code: true },
    });
    for (const b of bargains) {
      bargainCodeMap.set(b.id, b.code);
    }
  }

  return items.map((item) => {
    const product = item.product;

    // 安全解析图片JSON，兼容非JSON格式的旧数据
    let images: string[] = [];
    if (product.images) {
      try {
        const parsed = JSON.parse(product.images);
        images = Array.isArray(parsed) ? parsed : [product.images];
      } catch {
        const cleaned = product.images.replace(/^\[|\]$/g, '').trim();
        images = cleaned ? [cleaned] : [];
      }
    }

    // 计算可用库存
    const availableStock = product.stock - product.lockStock;

    // 【2026-01-23】砍价商品使用砍价后的价格
    if ((item as any).isBargainItem && (item as any).bargainPrice !== null) {
      const bargainPrice = Number((item as any).bargainPrice);
      const bargainId = (item as any).bargainId;

      return {
        id: item.id,
        productId: item.productId,
        name: product.name,
        image: images[0] || '',
        price: bargainPrice,
        originalPrice: Number(product.retailPrice),
        quantity: item.quantity,
        selected: item.selected,
        stock: availableStock,
        status: product.status,
        unit: product.unit,
        specs: product.specs,
        // 【2026-01-23】砍价商品标识
        isBargainItem: true,
        bargainId: bargainId,
        // 【2026-01-29修复】添加砍价码用于预约时传递
        bargainCode: bargainId ? bargainCodeMap.get(bargainId) || null : null,
        // 【2026-01-26】特价商品标识
        isSpecialPrice: product.isSpecialPrice || false,
      };
    }

    // 【2026-01-19修复】价格优先级：
    // 1. 有扫码绑定的推销员：使用推销员设置的零售价
    // 2. 否则根据登录用户类型决定
    let price: number = Number(product.retailPrice);

    if (salespersonId) {
      // 有扫码绑定的推销员，使用该推销员设置的零售价
      const spPrice = salespersonPriceMap.get(item.productId);
      price = spPrice ?? Number(product.retailPrice);
    } else if (agent?.type === 'LEVEL1') {
      // 一级推销员：看到供货价（总代理给的拿货价）
      price = Number(product.supplyPrice || product.agentPrice);
    } else if (agent?.type === 'LEVEL2') {
      // 二级推销员：看到上级设置的subPrice（一级给的拿货价），未设置用供货价
      const parentSubPrice = parentSubPriceMap.get(item.productId);
      price = parentSubPrice ?? Number(product.supplyPrice || product.agentPrice);
    }
    // WHOLESALE用户：使用商品默认零售价（已在初始化时设置）

    return {
      id: item.id,
      productId: item.productId,
      name: product.name,
      image: images[0] || '',
      price: Number(price),
      originalPrice: Number(product.retailPrice),
      quantity: item.quantity,
      selected: item.selected,
      stock: availableStock,
      status: product.status,
      unit: product.unit,
      specs: product.specs,
      // 【2026-01-23】普通商品标识
      isBargainItem: false,
      bargainId: null,
      bargainCode: null,  // 【2026-01-29修复】保持数据结构一致
      // 【2026-01-26】特价商品标识
      isSpecialPrice: product.isSpecialPrice || false,
    };
  });
}

/**
 * 获取购物车商品数量
 */
export async function getCartCount(agentId: number) {
  const res = await prisma.cartItem.aggregate({
    where: { agentId },
    _sum: { quantity: true },
  });
  return res._sum.quantity ?? 0;
}

/**
 * 添加商品到购物车
 */
export async function addToCart(
  agentId: number,
  productId: number,
  quantity: number = 1
) {
  // 【2026-01-18 修复】先验证agent是否存在，防止外键约束失败
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, status: true },
  });

  if (!agent) {
    throw new Error('用户不存在，请重新登录');
  }

  if (agent.status !== 'ACTIVE') {
    throw new Error('账号已被禁用，请联系客服');
  }

  // 检查商品是否存在且上架
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error('商品不存在');
  }

  if (product.status !== 'ACTIVE') {
    throw new Error('商品已下架');
  }

  // 检查库存
  const availableStock = product.stock - product.lockStock;
  if (availableStock < quantity) {
    throw new Error('库存不足');
  }

  // 查找已存在的普通购物车项（非砍价商品）
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      agentId,
      productId,
      isBargainItem: false,
    },
  });

  let cartItem;
  if (existingItem) {
    // 已存在，增加数量
    cartItem = await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: { increment: quantity } },
    });
  } else {
    // 不存在，创建新的
    cartItem = await prisma.cartItem.create({
      data: {
        agentId,
        productId,
        quantity,
        selected: true,
        isBargainItem: false,
      },
    });
  }

  // 检查更新后的数量是否超过库存
  if (cartItem.quantity > availableStock) {
    // 回滚到最大可用库存
    await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity: availableStock },
    });
    throw new Error(`库存不足，已添加最大可购数量${availableStock}件`);
  }

  return cartItem;
}

/**
 * 更新购物车商品数量
 */
export async function updateCartItem(
  agentId: number,
  cartItemId: number,
  quantity: number
) {
  // 验证购物车项归属
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { product: true },
  });

  if (!cartItem || cartItem.agentId !== agentId) {
    throw new Error('购物车商品不存在');
  }

  // 检查库存
  const availableStock = cartItem.product.stock - cartItem.product.lockStock;
  if (quantity > availableStock) {
    throw new Error('库存不足');
  }

  if (quantity <= 0) {
    // 数量为0则删除
    await prisma.cartItem.delete({
      where: { id: cartItemId },
    });
    return null;
  }

  const updated = await prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity },
  });

  return updated;
}

/**
 * 删除购物车商品
 */
export async function removeFromCart(agentId: number, cartItemId: number) {
  // 验证购物车项归属
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
  });

  if (!cartItem || cartItem.agentId !== agentId) {
    throw new Error('购物车商品不存在');
  }

  await prisma.cartItem.delete({
    where: { id: cartItemId },
  });

  return true;
}

/**
 * 批量删除购物车商品
 */
export async function batchRemoveFromCart(agentId: number, cartItemIds: number[]) {
  const result = await prisma.cartItem.deleteMany({
    where: {
      id: { in: cartItemIds },
      agentId,
    },
  });

  return result.count;
}

/**
 * 清空购物车
 */
export async function clearCart(agentId: number) {
  await prisma.cartItem.deleteMany({
    where: { agentId },
  });

  return true;
}

/**
 * 更新选中状态
 */
export async function updateSelection(
  agentId: number,
  cartItemId: number,
  selected: boolean
) {
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
  });

  if (!cartItem || cartItem.agentId !== agentId) {
    throw new Error('购物车商品不存在');
  }

  const updated = await prisma.cartItem.update({
    where: { id: cartItemId },
    data: { selected },
  });

  return updated;
}

/**
 * 全选/取消全选
 */
export async function selectAll(agentId: number, selected: boolean) {
  await prisma.cartItem.updateMany({
    where: { agentId },
    data: { selected },
  });

  return true;
}

/**
 * 获取选中商品的统计
 * 【2026-01-19修复】修复价格显示逻辑 - 推销员看到的是上级给的拿货价
 * - 一级推销员：看到供货价（总代理给的拿货价）
 * - 二级推销员：看到上级设置的subPrice（一级给的拿货价），未设置用供货价
 */
export async function getSelectedSummary(agentId: number) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { type: true, parentId: true },
  });

  const items = await prisma.cartItem.findMany({
    where: { agentId, selected: true },
    include: {
      product: {
        select: {
          id: true,
          retailPrice: true,
          agentPrice: true,
          wholesalePrice: true,
          supplyPrice: true,  // 【2026-01-19】添加供货价字段
        },
      },
    },
  });

  // 【2026-01-19修复】只查询上级设置的subPrice（二级推销员用来确定自己的拿货价）
  let parentSubPriceMap: Map<number, number | null> = new Map();

  const productIds = items.map(item => item.productId);

  // 【2026-01-19修复】只有二级推销员需要查询上级的subPrice
  if (agent?.type === 'LEVEL2' && agent.parentId && productIds.length > 0) {
    const parentPrices = await prisma.agentPrice.findMany({
      where: {
        agentId: agent.parentId,
        productId: { in: productIds },
      },
      select: { productId: true, subPrice: true },
    });
    for (const pp of parentPrices) {
      parentSubPriceMap.set(pp.productId, pp.subPrice ? Number(pp.subPrice) : null);
    }
  }

  let totalPrice = 0;
  let totalOriginalPrice = 0;
  let totalQuantity = 0;

  items.forEach((item) => {
    // 【2026-01-19修复】推销员看到的是上级给的拿货价
    // 普通用户(WHOLESALE)使用零售价，不再有批发价概念
    let price: number = Number(item.product.retailPrice);
    if (agent?.type === 'LEVEL1') {
      // 一级推销员：看到供货价（总代理给的拿货价）
      price = Number(item.product.supplyPrice || item.product.agentPrice);
    } else if (agent?.type === 'LEVEL2') {
      // 二级推销员：看到上级设置的subPrice（一级给的拿货价），未设置用供货价
      const parentSubPrice = parentSubPriceMap.get(item.productId);
      price = parentSubPrice ?? Number(item.product.supplyPrice || item.product.agentPrice);
    }

    totalPrice += price * item.quantity;
    totalOriginalPrice += Number(item.product.retailPrice) * item.quantity;
    totalQuantity += item.quantity;
  });

  return {
    totalPrice: totalPrice.toFixed(2),
    totalOriginalPrice: totalOriginalPrice.toFixed(2),
    discountAmount: (totalOriginalPrice - totalPrice).toFixed(2),
    totalQuantity,
    itemCount: items.length,
  };
}

export default {
  getCartItems,
  getCartCount,
  addToCart,
  updateCartItem,
  removeFromCart,
  batchRemoveFromCart,
  clearCart,
  updateSelection,
  selectAll,
  getSelectedSummary,
};
