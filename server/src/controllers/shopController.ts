/**
 * 客户商城控制器
 * 【2026-01-17 新增】支持推销员专属链接，客户扫码浏览商品并预约
 */

import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { success, error, validationError } from '../utils/response';
import { parsePagination, parseId } from '../utils/controllerHelper';
import { createReservation } from '../services/reservation/reservationService';

/**
 * 获取推销员公开信息
 * GET /api/shop/salesperson/:id
 */
export async function getSalespersonInfo(req: Request, res: Response) {
  try {
    const salespersonId = parseId(req.params.id, '推销员ID');

    const agent = await prisma.agent.findUnique({
      where: { id: salespersonId },
      select: {
        id: true,
        name: true,
        phone: true,  // 【2026-01-23】添加phone用于联系推销员
        avatar: true,
        type: true,
        status: true,
        inviteCode: true,
        parentId: true,  // 【2026-01-19】添加parentId用于WHOLESALE处理
      },
    });

    if (!agent) {
      error(res, '推销员不存在', 404);
      return;
    }

    if (agent.status !== 'ACTIVE') {
      error(res, '推销员已停用', 400);
      return;
    }

    // 【2026-01-19修复】处理WHOLESALE用户：返回其上级信息
    let effectiveAgent = agent;
    if (agent.type === 'WHOLESALE') {
      if (agent.parentId) {
        // 有上级：返回上级信息
        const parent = await prisma.agent.findUnique({
          where: { id: agent.parentId },
          select: {
            id: true,
            name: true,
            phone: true,  // 【2026-01-23】添加phone用于联系推销员
            avatar: true,
            type: true,
            status: true,
          },
        });

        if (!parent || parent.status !== 'ACTIVE') {
          error(res, '您的开发者账号已停用', 400);
          return;
        }

        effectiveAgent = parent as typeof agent;
      } else {
        // 无上级：返回总代理信息
        const master = await prisma.agent.findFirst({
          where: { isMaster: true },
          select: {
            id: true,
            name: true,
            phone: true,  // 【2026-01-23】添加phone用于联系推销员
            avatar: true,
            type: true,
            status: true,
          },
        });

        if (master) {
          effectiveAgent = master as typeof agent;
        } else {
          error(res, '无效的推销员', 400);
          return;
        }
      }
    }

    // 只有一级和二级推销员可以分享（总代理isMaster也可以）
    if (!['LEVEL1', 'LEVEL2'].includes(effectiveAgent.type)) {
      error(res, '无效的推销员', 400);
      return;
    }

    success(res, {
      id: effectiveAgent.id,
      name: effectiveAgent.name,
      phone: effectiveAgent.phone,  // 【2026-01-23】返回推销员手机号用于联系
      avatar: effectiveAgent.avatar,
      type: effectiveAgent.type,
      typeLabel: effectiveAgent.type === 'LEVEL1' ? '一级推销员' : '二级推销员',
    });
  } catch (err: any) {
    console.error('[ShopController] getSalespersonInfo error:', err);
    if (err.message.includes('无效的')) {
      error(res, err.message, 400);
      return;
    }
    error(res, '获取推销员信息失败', 500);
  }
}

/**
 * 获取推销员商品列表（带推销员定价）
 * GET /api/shop/products?s=推销员ID
 */
export async function getProducts(req: Request, res: Response) {
  try {
    const salespersonId = req.query.s ? parseInt(req.query.s as string, 10) : null;
    const { categoryId, keyword, sort } = req.query;
    const { page, pageSize } = parsePagination(req.query as any);

    // 验证推销员
    let salesperson: any = null;
    let level1AgentId: number | null = null;

    if (salespersonId) {
      salesperson = await prisma.agent.findUnique({
        where: { id: salespersonId },
        select: {
          id: true,
          type: true,
          status: true,
          parentId: true,
          isMaster: true,  // 【2026-01-19】添加isMaster用于验证
        },
      });

      if (!salesperson || salesperson.status !== 'ACTIVE') {
        error(res, '推销员不存在或已停用', 400);
        return;
      }

      // 【2026-01-19修复】处理WHOLESALE用户：使用其上级的定价
      if (salesperson.type === 'WHOLESALE') {
        if (salesperson.parentId) {
          // 有上级：查找上级信息并使用上级的定价
          const parent = await prisma.agent.findUnique({
            where: { id: salesperson.parentId },
            select: { id: true, type: true, status: true, parentId: true, isMaster: true },
          });

          if (!parent || parent.status !== 'ACTIVE') {
            error(res, '您的开发者账号已停用', 400);
            return;
          }

          // 用上级替换当前推销员
          salesperson = parent;
        } else {
          // 无上级的普通用户：查找总代理
          const master = await prisma.agent.findFirst({
            where: { isMaster: true },
            select: { id: true, type: true, status: true, parentId: true, isMaster: true },
          });

          if (master) {
            salesperson = master;
          } else {
            // 没有总代理，使用商品默认价格
            salesperson = null;
          }
        }
      }

      // 再次验证：只有推销员和总代理可以有分享链接
      if (salesperson && !['LEVEL1', 'LEVEL2'].includes(salesperson.type) && !salesperson.isMaster) {
        error(res, '无效的推销员', 400);
        return;
      }

      // 确定一级推销员ID（用于获取价格）
      if (salesperson?.type === 'LEVEL1') {
        level1AgentId = salesperson.id;
      } else if (salesperson?.type === 'LEVEL2') {
        level1AgentId = salesperson.parentId;
      }
    }

    // 构建查询条件
    const where: any = { status: 'ACTIVE' };
    if (categoryId) {
      where.categoryId = parseInt(categoryId as string, 10);
    }
    if (keyword) {
      where.OR = [
        { name: { contains: keyword as string } },
        { description: { contains: keyword as string } },
      ];
    }

    // 排序
    let orderBy: any[] = [{ sort: 'asc' }, { id: 'desc' }];
    if (sort === 'sales') {
      orderBy = [{ salesCount: 'desc' }, { id: 'desc' }];
    } else if (sort === 'price_asc') {
      orderBy = [{ retailPrice: 'asc' }, { id: 'desc' }];
    } else if (sort === 'price_desc') {
      orderBy = [{ retailPrice: 'desc' }, { id: 'desc' }];
    }

    // 查询商品
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: { select: { id: true, name: true } },
        },
      }),
    ]);

    // 获取推销员定价
    // 【2026-01-19修复】使用可能被替换后的salesperson.id而非原始salespersonId
    let agentPrices: Map<number, { retailPrice: number | null; subPrice: number | null }> = new Map();
    const effectiveSalespersonId = salesperson?.id || salespersonId;
    if (effectiveSalespersonId) {
      const prices = await prisma.agentPrice.findMany({
        where: { agentId: effectiveSalespersonId },
        select: { productId: true, retailPrice: true, subPrice: true },
      });
      for (const p of prices) {
        agentPrices.set(p.productId, {
          retailPrice: p.retailPrice ? Number(p.retailPrice) : null,
          subPrice: p.subPrice ? Number(p.subPrice) : null,
        });
      }
    }

    // 如果是二级推销员，获取一级的subPrice（用于判断是否可销售和默认零售价）
    let level1SubPrices: Map<number, number> = new Map();
    if (salesperson?.type === 'LEVEL2' && level1AgentId) {
      const l1Prices = await prisma.agentPrice.findMany({
        where: { agentId: level1AgentId },
        select: { productId: true, subPrice: true },
      });
      for (const p of l1Prices) {
        if (p.subPrice) {
          level1SubPrices.set(p.productId, Number(p.subPrice));
        }
      }
    }

    // 处理商品数据
    const processedProducts = products.map((product) => {
      // 解析图片
      let images: string[] = [];
      if (product.images) {
        try {
          const parsed = JSON.parse(product.images);
          images = Array.isArray(parsed) ? parsed : [product.images];
        } catch {
          images = product.images ? [product.images] : [];
        }
      }

      // 计算显示价格
      let displayPrice = Number(product.retailPrice);
      let originalPrice = Number(product.retailPrice);
      let canSell = true;

      if (salespersonId) {
        const agentPrice = agentPrices.get(product.id);

        if (salesperson.type === 'LEVEL1') {
          // 一级推销员：使用自己设置的零售价
          displayPrice = agentPrice?.retailPrice ?? Number(product.retailPrice);
        } else if (salesperson.type === 'LEVEL2') {
          // 【2026-01-20】二级推销员价格逻辑：
          // 1. 优先使用自己设置的retailPrice
          // 2. 否则使用上级给的subPrice（上级给二级的拿货价作为默认零售价）
          // 3. 最后使用商品默认零售价
          const l1SubPrice = level1SubPrices.get(product.id);
          if (!l1SubPrice || l1SubPrice <= 0) {
            // 一级未设置subPrice或为0，二级不能销售此商品
            canSell = false;
            displayPrice = Number(product.retailPrice);
          } else {
            // 优先使用自己的零售价，否则使用上级给的subPrice
            displayPrice = agentPrice?.retailPrice ?? l1SubPrice;
          }
        }
      }

      return {
        id: product.id,
        name: product.name,
        images,
        categoryId: product.categoryId,
        categoryName: product.category.name,
        displayPrice: displayPrice, // 【2026-01-27修复】前端期望displayPrice字段
        retailPrice: Number(product.retailPrice), // 【2026-01-27】添加原价字段用于推广海报
        originalPrice,
        unit: product.unit,
        salesCount: product.salesCount,
        stock: product.stock - product.lockStock, // 可用库存
        canSell,
      };
    });

    // 【2026-01-22 BUG修复】过滤掉无法销售的商品，提升用户体验
    // 二级推销员看不到一级未设置subPrice的商品
    const sellableProducts = processedProducts.filter(p => p.canSell);
    const filteredCount = processedProducts.length - sellableProducts.length;
    if (filteredCount > 0) {
      console.log(`[ShopController] 为推销员${salespersonId}过滤了${filteredCount}个无法销售的商品`);
    }

    success(res, {
      list: sellableProducts,
      total: total - filteredCount,
      page,
      pageSize,
      totalPages: Math.ceil((total - filteredCount) / pageSize),
    });
  } catch (err: any) {
    console.error('[ShopController] getProducts error:', err);
    error(res, '获取商品列表失败', 500);
  }
}

/**
 * 获取商品详情（带推销员定价）
 * GET /api/shop/products/:id?s=推销员ID
 */
export async function getProductDetail(req: Request, res: Response) {
  try {
    const productId = parseId(req.params.id, '商品ID');
    const salespersonId = req.query.s ? parseInt(req.query.s as string, 10) : null;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    if (!product || product.status !== 'ACTIVE') {
      error(res, '商品不存在或已下架', 404);
      return;
    }

    // 验证推销员并获取定价
    let displayPrice = Number(product.retailPrice);
    let canSell = true;
    let salesperson: any = null;

    if (salespersonId) {
      salesperson = await prisma.agent.findUnique({
        where: { id: salespersonId },
        select: { id: true, type: true, status: true, parentId: true },
      });

      if (salesperson && salesperson.status === 'ACTIVE' && ['LEVEL1', 'LEVEL2'].includes(salesperson.type)) {
        // 获取推销员定价
        const agentPrice = await prisma.agentPrice.findUnique({
          where: {
            agentId_productId: {
              agentId: salespersonId,
              productId: productId,
            },
          },
        });

        if (salesperson.type === 'LEVEL1') {
          displayPrice = agentPrice?.retailPrice ? Number(agentPrice.retailPrice) : Number(product.retailPrice);
        } else if (salesperson.type === 'LEVEL2') {
          // 【2026-01-20】二级推销员价格逻辑
          // 二级未设置价格时，使用上级给的subPrice作为默认零售价
          if (salesperson.parentId) {
            const l1Price = await prisma.agentPrice.findUnique({
              where: {
                agentId_productId: {
                  agentId: salesperson.parentId,
                  productId: productId,
                },
              },
            });
            const l1SubPrice = l1Price?.subPrice ? Number(l1Price.subPrice) : 0;
            if (!l1SubPrice || l1SubPrice <= 0) {
              // 一级未设置subPrice或为0，二级不能销售
              canSell = false;
              displayPrice = Number(product.retailPrice);
            } else {
              // 优先使用自己的零售价，否则使用上级给的subPrice
              displayPrice = agentPrice?.retailPrice
                ? Number(agentPrice.retailPrice)
                : l1SubPrice;
            }
          } else {
            displayPrice = Number(product.retailPrice);
          }
        }
      }
    }

    // 解析图片
    let images: string[] = [];
    if (product.images) {
      try {
        const parsed = JSON.parse(product.images);
        images = Array.isArray(parsed) ? parsed : [product.images];
      } catch {
        images = product.images ? [product.images] : [];
      }
    }

    // 解析规格
    let specs = null;
    if (product.specs) {
      try {
        specs = JSON.parse(product.specs);
      } catch {
        specs = null;
      }
    }

    success(res, {
      id: product.id,
      name: product.name,
      description: product.description,
      images,
      categoryId: product.categoryId,
      categoryName: product.category.name,
      price: displayPrice,
      originalPrice: Number(product.retailPrice),
      unit: product.unit,
      specs,
      salesCount: product.salesCount,
      stock: product.stock - product.lockStock,
      canSell,
    });
  } catch (err: any) {
    console.error('[ShopController] getProductDetail error:', err);
    if (err.message.includes('无效的')) {
      error(res, err.message, 400);
      return;
    }
    error(res, '获取商品详情失败', 500);
  }
}

/**
 * 访客模式创建预约
 * POST /api/shop/reservations
 */
export async function createGuestReservation(req: Request, res: Response) {
  try {
    const { customerName, customerPhone, pickupDate, items, flashSaleItems, bargainItems, salespersonId, storeId, regionId, regionName } = req.body;

    // 参数验证
    if (!customerName || typeof customerName !== 'string' || customerName.trim().length === 0) {
      validationError(res, '请输入姓名');
      return;
    }
    if (!customerPhone || !/^1[3-9]\d{9}$/.test(customerPhone)) {
      validationError(res, '请输入正确的手机号');
      return;
    }
    if (!pickupDate) {
      validationError(res, '请选择提货日期');
      return;
    }
    // 【2026-01-29修复】至少需要一种商品（普通商品、秒杀商品或砍价商品）
    const hasItems = Array.isArray(items) && items.length > 0;
    const hasFlashSaleItems = Array.isArray(flashSaleItems) && flashSaleItems.length > 0;
    const hasBargainItems = Array.isArray(bargainItems) && bargainItems.length > 0;

    if (!hasItems && !hasFlashSaleItems && !hasBargainItems) {
      validationError(res, '请选择商品');
      return;
    }
    if (!salespersonId) {
      validationError(res, '推销员信息缺失');
      return;
    }

    // 验证推销员
    const salesperson = await prisma.agent.findUnique({
      where: { id: salespersonId },
      select: { id: true, type: true, status: true, parentId: true },
    });

    if (!salesperson || salesperson.status !== 'ACTIVE') {
      validationError(res, '推销员不存在或已停用');
      return;
    }

    if (!['LEVEL1', 'LEVEL2'].includes(salesperson.type)) {
      validationError(res, '无效的推销员');
      return;
    }

    // 获取门店（如果未指定，使用默认门店）
    let targetStoreId = storeId;
    if (!targetStoreId) {
      const defaultStore = await prisma.warehouse.findFirst({
        where: { isDefault: true, status: 'ACTIVE' },
      });
      if (!defaultStore) {
        const anyStore = await prisma.warehouse.findFirst({
          where: { status: 'ACTIVE' },
        });
        if (!anyStore) {
          validationError(res, '暂无可用门店');
          return;
        }
        targetStoreId = anyStore.id;
      } else {
        targetStoreId = defaultStore.id;
      }
    }

    // 【2026-01-29修复】只有普通商品时才进行商品验证和定价处理
    let reservationItems: any[] = [];
    if (hasItems) {
      // 获取推销员定价，构建完整的items
      const productIds = items.map((item: any) => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds }, status: 'ACTIVE' },
      });

      if (products.length !== productIds.length) {
        validationError(res, '部分商品不存在或已下架');
        return;
      }

      // 获取推销员定价
      const agentPrices = await prisma.agentPrice.findMany({
        where: { agentId: salespersonId, productId: { in: productIds } },
      });
      const priceMap = new Map(agentPrices.map(p => [p.productId, p]));

      // 如果是二级，获取一级的subPrice
      let level1Prices: Map<number, number> = new Map();
      if (salesperson.type === 'LEVEL2' && salesperson.parentId) {
        const l1Prices = await prisma.agentPrice.findMany({
          where: { agentId: salesperson.parentId, productId: { in: productIds } },
        });
        for (const p of l1Prices) {
          if (p.subPrice) {
            level1Prices.set(p.productId, Number(p.subPrice));
          }
        }

        // 检查所有商品是否都有subPrice
        for (const item of items) {
          if (!level1Prices.has(item.productId)) {
            const product = products.find(p => p.id === item.productId);
            validationError(res, `商品"${product?.name}"暂不可购买`);
            return;
          }
        }
      }

      // 构建预约商品
      reservationItems = items.map((item: any) => {
        const product = products.find(p => p.id === item.productId)!;
        const agentPrice = priceMap.get(item.productId);
        const price = agentPrice?.retailPrice ? Number(agentPrice.retailPrice) : Number(product.retailPrice);

        return {
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          price,
        };
      });
    }

    // 调用预约服务
    // 【2026-01-20 秒杀系统】支持秒杀商品
    // 【2026-01-21 顺路拼团】支持区域信息
    // 【2026-01-29修复】支持砍价商品
    const result = await createReservation({
      customerName: customerName.trim(),
      customerPhone,
      pickupDate,
      items: reservationItems.length > 0 ? reservationItems : undefined,  // 【2026-01-29修复】items改为可选
      flashSaleItems: flashSaleItems || undefined,  // 传递秒杀商品
      bargainItems: bargainItems || undefined,      // 【2026-01-29修复】传递砍价商品
      salespersonId,
      storeId: targetStoreId,
      regionId: regionId || undefined,      // 【2026-01-21 顺路拼团】区域ID
      regionName: regionName || undefined,  // 区域名称
    });

    if (result.success) {
      success(res, result.data, result.message);
    } else {
      validationError(res, result.message);
    }
  } catch (err: any) {
    console.error('[ShopController] createGuestReservation error:', err);
    error(res, '创建预约失败，请稍后重试', 500);
  }
}

/**
 * 获取分类列表
 * GET /api/shop/categories
 */
export async function getCategories(req: Request, res: Response) {
  try {
    const categories = await prisma.category.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        icon: true,
      },
    });

    success(res, categories);
  } catch (err: any) {
    console.error('[ShopController] getCategories error:', err);
    error(res, '获取分类列表失败', 500);
  }
}

/**
 * 获取赠品档位
 * GET /api/shop/gift-tiers
 */
export async function getGiftTiers(req: Request, res: Response) {
  try {
    const tiers = await prisma.giftTier.findMany({
      where: { isActive: true },
      orderBy: { minAmount: 'asc' },
      select: {
        id: true,
        minAmount: true,
        giftName: true,
        giftItems: true,
      },
    });

    success(res, tiers.map(t => ({
      ...t,
      minAmount: Number(t.minAmount),
    })));
  } catch (err: any) {
    console.error('[ShopController] getGiftTiers error:', err);
    error(res, '获取赠品档位失败', 500);
  }
}

/**
 * 获取门店列表
 * GET /api/shop/stores
 */
export async function getStores(req: Request, res: Response) {
  try {
    const stores = await prisma.warehouse.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ isDefault: 'desc' }, { sort: 'asc' }],
      select: {
        id: true,
        name: true,
        address: true,
        contactPhone: true,
        businessHours: true,
        isDefault: true,
      },
    });

    success(res, stores);
  } catch (err: any) {
    console.error('[ShopController] getStores error:', err);
    error(res, '获取门店列表失败', 500);
  }
}
