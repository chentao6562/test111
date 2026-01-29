/**
 * 套餐服务
 * 【2026-01-25】新增套餐功能
 */
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';

// 套餐查询参数
interface PackageQueryParams {
  page?: number;
  pageSize?: number;
  positioning?: string;  // ENTRY/HOT/PROFIT
  status?: string;
  keyword?: string;
  agentType?: string;
  agentId?: number;
}

// 创建套餐DTO
interface CreatePackageDto {
  code: string;
  name: string;
  positioning: string;
  description?: string;
  images: string;
  costPrice: number;
  supplyPrice: number;
  suggestedPrice?: number;
  masterRetailPrice: number;
  grossMargin?: number;
  sceneTags?: string;
  targetAudience?: string;
  stockStrategy?: string;
  sort?: number;
  status?: string;
  createdBy: number;
}

// 更新套餐DTO
interface UpdatePackageDto {
  name?: string;
  positioning?: string;
  description?: string | null;
  images?: string;
  costPrice?: number;
  supplyPrice?: number;
  suggestedPrice?: number | null;
  masterRetailPrice?: number;
  grossMargin?: number | null;
  sceneTags?: string | null;
  targetAudience?: string | null;
  stockStrategy?: string;
  sort?: number;
  status?: string;
}

// 套餐商品配置DTO
interface PackageItemDto {
  productId: number;
  quantity: number;
}

/**
 * 获取套餐列表
 */
export async function findAll(params: PackageQueryParams = {}) {
  let page = params.page ?? 1;
  let pageSize = params.pageSize ?? 10;

  if (typeof page !== 'number' || page < 1 || !Number.isInteger(page)) {
    page = 1;
  }
  if (typeof pageSize !== 'number' || pageSize < 1 || !Number.isInteger(pageSize)) {
    pageSize = 10;
  }
  if (pageSize > 100) {
    pageSize = 100;
  }

  const skip = (page - 1) * pageSize;

  const where: Prisma.ProductPackageWhereInput = {};

  // 筛选状态
  if (params.status) {
    where.status = params.status;
  } else {
    // 默认不显示已删除的
    where.status = { not: 'DELETED' };
  }

  // 筛选定位
  if (params.positioning) {
    where.positioning = params.positioning;
  }

  // 关键字搜索
  if (params.keyword) {
    where.OR = [
      { name: { contains: params.keyword } },
      { code: { contains: params.keyword } },
      { description: { contains: params.keyword } },
    ];
  }

  const [packages, total] = await Promise.all([
    prisma.productPackage.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                stock: true,
                lockStock: true,
                status: true,
              },
            },
          },
          orderBy: { sort: 'asc' },
        },
      },
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
    prisma.productPackage.count({ where }),
  ]);

  const { agentType, agentId } = params;

  // 获取推销员定价（如果有）
  let agentPriceMap = new Map<number, { retailPrice?: number; subPrice?: number }>();
  let parentSubPriceMap = new Map<number, number>();

  if (agentId && agentType) {
    const agentPrices = await prisma.packageAgentPrice.findMany({
      where: { agentId },
    });
    agentPrices.forEach(ap => {
      agentPriceMap.set(ap.packageId, {
        retailPrice: ap.retailPrice ? Number(ap.retailPrice) : undefined,
        subPrice: ap.subPrice ? Number(ap.subPrice) : undefined,
      });
    });

    // 二级推销员获取上级设置的价格
    if (agentType === 'LEVEL2') {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { parentId: true },
      });
      if (agent?.parentId) {
        const parentPrices = await prisma.packageAgentPrice.findMany({
          where: { agentId: agent.parentId },
        });
        parentPrices.forEach(pp => {
          if (pp.subPrice) {
            parentSubPriceMap.set(pp.packageId, Number(pp.subPrice));
          }
        });
      }
    }
  }

  // 处理每个套餐
  const processedPackages = packages.map(pkg => {
    // 计算可售库存（取各商品可售数量的最小值除以数量）
    let availableStock = Infinity;
    if (pkg.stockStrategy === 'COMPONENT') {
      for (const item of pkg.items) {
        const productAvailable = item.product.stock - (item.product as any).lockStock;
        const canMake = Math.floor(productAvailable / item.quantity);
        availableStock = Math.min(availableStock, canMake);
      }
      if (availableStock === Infinity) availableStock = 0;
    } else {
      availableStock = pkg.independentStock;
    }

    // 计算显示价格
    let displayPrice: number;
    let myRetailPrice: number | undefined;
    let mySubPrice: number | undefined;

    const agentPrice = agentPriceMap.get(pkg.id);
    myRetailPrice = agentPrice?.retailPrice;
    mySubPrice = agentPrice?.subPrice;

    if (agentType === 'LEVEL1') {
      // 一级推销员：看到供货价
      displayPrice = Number(pkg.supplyPrice);
    } else if (agentType === 'LEVEL2') {
      // 二级推销员：看到上级设置的subPrice，未设置用供货价
      const parentPrice = parentSubPriceMap.get(pkg.id);
      displayPrice = parentPrice ?? Number(pkg.supplyPrice);
    } else {
      // 普通用户：看到总代理零售价
      displayPrice = Number(pkg.masterRetailPrice);
    }

    // 解析图片
    let images: string[] = [];
    if (pkg.images) {
      try {
        const parsed = JSON.parse(pkg.images);
        images = Array.isArray(parsed) ? parsed : [pkg.images];
      } catch {
        images = [pkg.images];
      }
    }

    // 解析场景标签
    let sceneTags: string[] = [];
    if (pkg.sceneTags) {
      try {
        sceneTags = JSON.parse(pkg.sceneTags);
      } catch {
        sceneTags = [];
      }
    }

    // 计算单买总价（用于显示节省金额）
    let singleBuyTotal = 0;
    for (const item of pkg.items) {
      const itemPrice = item.snapshotRetailPrice ? Number(item.snapshotRetailPrice) : 0;
      singleBuyTotal += itemPrice * item.quantity;
    }

    // 【2026-01-26修复】处理商品项图片（与findById保持一致）
    const processedItems = pkg.items.map(item => {
      let productImages: string[] = [];
      if (item.product.images) {
        try {
          productImages = JSON.parse(item.product.images as string);
        } catch {
          productImages = [item.product.images as string];
        }
      }
      return {
        ...item,
        product: {
          ...item.product,
          images: productImages,
        },
      };
    });

    return {
      ...pkg,
      images,
      sceneTags,
      items: processedItems,
      availableStock,
      displayPrice,
      singleBuyTotal,
      savings: singleBuyTotal - Number(pkg.masterRetailPrice),
      myRetailPrice,
      mySubPrice,
      costPrice: agentType ? undefined : pkg.costPrice,
      supplyPrice: agentType === 'LEVEL1' || !agentType ? Number(pkg.supplyPrice) : undefined,
    };
  });

  return {
    list: processedPackages,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取套餐详情
 */
export async function findById(id: number, agentType?: string, agentId?: number) {
  const pkg = await prisma.productPackage.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              retailPrice: true,
              supplyPrice: true,
              costPrice: true,
              stock: true,
              lockStock: true,
              status: true,
              unit: true,
            },
          },
        },
        orderBy: { sort: 'asc' },
      },
    },
  });

  if (!pkg) {
    return null;
  }

  // 计算可售库存
  let availableStock = Infinity;
  if (pkg.stockStrategy === 'COMPONENT') {
    for (const item of pkg.items) {
      const productAvailable = item.product.stock - (item.product as any).lockStock;
      const canMake = Math.floor(productAvailable / item.quantity);
      availableStock = Math.min(availableStock, canMake);
    }
    if (availableStock === Infinity) availableStock = 0;
  } else {
    availableStock = pkg.independentStock;
  }

  // 获取推销员定价
  let myRetailPrice: number | undefined;
  let mySubPrice: number | undefined;
  let displayPrice = Number(pkg.masterRetailPrice);

  if (agentId) {
    const agentPrice = await prisma.packageAgentPrice.findUnique({
      where: { packageId_agentId: { packageId: id, agentId } },
    });
    if (agentPrice) {
      myRetailPrice = agentPrice.retailPrice ? Number(agentPrice.retailPrice) : undefined;
      mySubPrice = agentPrice.subPrice ? Number(agentPrice.subPrice) : undefined;
    }

    if (agentType === 'LEVEL1') {
      displayPrice = Number(pkg.supplyPrice);
    } else if (agentType === 'LEVEL2') {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { parentId: true },
      });
      if (agent?.parentId) {
        const parentPrice = await prisma.packageAgentPrice.findUnique({
          where: { packageId_agentId: { packageId: id, agentId: agent.parentId } },
        });
        if (parentPrice?.subPrice) {
          displayPrice = Number(parentPrice.subPrice);
        } else {
          displayPrice = Number(pkg.supplyPrice);
        }
      }
    }
  }

  // 解析图片
  let images: string[] = [];
  if (pkg.images) {
    try {
      images = JSON.parse(pkg.images);
    } catch {
      images = [pkg.images];
    }
  }

  // 解析场景标签
  let sceneTags: string[] = [];
  if (pkg.sceneTags) {
    try {
      sceneTags = JSON.parse(pkg.sceneTags);
    } catch {
      sceneTags = [];
    }
  }

  // 计算单买总价
  let singleBuyTotal = 0;
  for (const item of pkg.items) {
    const itemPrice = item.snapshotRetailPrice ? Number(item.snapshotRetailPrice) : Number(item.product.retailPrice);
    singleBuyTotal += itemPrice * item.quantity;
  }

  // 处理商品项图片
  const processedItems = pkg.items.map(item => {
    let productImages: string[] = [];
    if (item.product.images) {
      try {
        productImages = JSON.parse(item.product.images as string);
      } catch {
        productImages = [item.product.images as string];
      }
    }
    return {
      ...item,
      product: {
        ...item.product,
        images: productImages,
      },
    };
  });

  return {
    ...pkg,
    images,
    sceneTags,
    items: processedItems,
    availableStock,
    displayPrice,
    singleBuyTotal,
    savings: singleBuyTotal - Number(pkg.masterRetailPrice),
    myRetailPrice,
    mySubPrice,
    costPrice: agentType ? undefined : pkg.costPrice,
  };
}

/**
 * 创建套餐
 */
export async function create(data: CreatePackageDto) {
  // 检查编码是否已存在
  const existing = await prisma.productPackage.findUnique({
    where: { code: data.code },
  });
  if (existing) {
    throw new Error('套餐编码已存在');
  }

  return prisma.productPackage.create({
    data: {
      code: data.code,
      name: data.name,
      positioning: data.positioning,
      description: data.description,
      images: data.images,
      costPrice: data.costPrice,
      supplyPrice: data.supplyPrice,
      suggestedPrice: data.suggestedPrice,
      masterRetailPrice: data.masterRetailPrice,
      grossMargin: data.grossMargin,
      sceneTags: data.sceneTags,
      targetAudience: data.targetAudience,
      stockStrategy: data.stockStrategy || 'COMPONENT',
      sort: data.sort || 0,
      status: data.status || 'ACTIVE',
      createdBy: data.createdBy,
    },
  });
}

/**
 * 更新套餐
 */
export async function update(id: number, data: UpdatePackageDto) {
  const existing = await prisma.productPackage.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('套餐不存在');
  }

  return prisma.productPackage.update({
    where: { id },
    data,
  });
}

/**
 * 删除套餐（软删除）
 */
export async function deletePackage(id: number) {
  const existing = await prisma.productPackage.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('套餐不存在');
  }

  return prisma.productPackage.update({
    where: { id },
    data: { status: 'DELETED' },
  });
}

/**
 * 切换套餐状态
 */
export async function toggleStatus(id: number) {
  const existing = await prisma.productPackage.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('套餐不存在');
  }

  const newStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  return prisma.productPackage.update({
    where: { id },
    data: { status: newStatus },
  });
}

/**
 * 配置套餐商品
 */
export async function setPackageItems(packageId: number, items: PackageItemDto[]) {
  const pkg = await prisma.productPackage.findUnique({ where: { id: packageId } });
  if (!pkg) {
    throw new Error('套餐不存在');
  }

  // 验证商品是否存在
  const productIds = items.map(i => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, costPrice: true, supplyPrice: true, retailPrice: true },
  });

  if (products.length !== productIds.length) {
    throw new Error('部分商品不存在');
  }

  const productMap = new Map(products.map(p => [p.id, p]));

  // 使用事务删除旧的并创建新的
  return prisma.$transaction(async (tx) => {
    // 删除旧的商品配置
    await tx.packageItem.deleteMany({
      where: { packageId },
    });

    // 创建新的商品配置
    let totalCost = 0;
    let totalSupply = 0;
    let totalRetail = 0;

    const itemsToCreate = items.map((item, index) => {
      const product = productMap.get(item.productId)!;
      const costPrice = Number(product.costPrice || 0);
      const supplyPrice = Number(product.supplyPrice || 0);
      const retailPrice = Number(product.retailPrice);

      totalCost += costPrice * item.quantity;
      totalSupply += supplyPrice * item.quantity;
      totalRetail += retailPrice * item.quantity;

      return {
        packageId,
        productId: item.productId,
        quantity: item.quantity,
        snapshotCostPrice: product.costPrice,
        snapshotSupplyPrice: product.supplyPrice,
        snapshotRetailPrice: product.retailPrice,
        sort: index,
      };
    });

    await tx.packageItem.createMany({
      data: itemsToCreate,
    });

    // 计算毛利率
    const grossMargin = totalRetail > 0 ? ((totalRetail - totalCost) / totalRetail * 100) : 0;

    // 更新套餐的汇总成本（可选，根据需要）
    await tx.productPackage.update({
      where: { id: packageId },
      data: {
        // 如果需要自动更新成本，取消下面注释
        // costPrice: totalCost,
        grossMargin: Math.round(grossMargin * 100) / 100,
      },
    });

    return { success: true, itemCount: items.length };
  });
}

/**
 * 推销员设置套餐价格
 */
export async function setAgentPrice(
  packageId: number,
  agentId: number,
  retailPrice?: number,
  subPrice?: number
) {
  const pkg = await prisma.productPackage.findUnique({ where: { id: packageId } });
  if (!pkg) {
    throw new Error('套餐不存在');
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { type: true, parentId: true },
  });
  if (!agent) {
    throw new Error('推销员不存在');
  }

  // 验证价格约束
  const supplyPrice = Number(pkg.supplyPrice);

  if (retailPrice !== undefined && retailPrice < supplyPrice) {
    throw new Error(`零售价不能低于供货价 ${supplyPrice}`);
  }

  // 二级推销员需要检查上级设置的价格
  if (agent.type === 'LEVEL2' && agent.parentId) {
    const parentPrice = await prisma.packageAgentPrice.findUnique({
      where: { packageId_agentId: { packageId, agentId: agent.parentId } },
    });
    if (parentPrice?.subPrice) {
      const parentSubPrice = Number(parentPrice.subPrice);
      if (retailPrice !== undefined && retailPrice < parentSubPrice) {
        throw new Error(`零售价不能低于上级给你的价格 ${parentSubPrice}`);
      }
    }
  }

  // 一级推销员设置给二级的价格
  if (subPrice !== undefined && agent.type === 'LEVEL1') {
    if (subPrice < supplyPrice) {
      throw new Error(`给下级的价格不能低于供货价 ${supplyPrice}`);
    }
  }

  return prisma.packageAgentPrice.upsert({
    where: { packageId_agentId: { packageId, agentId } },
    update: {
      retailPrice,
      subPrice: agent.type === 'LEVEL1' ? subPrice : undefined,
    },
    create: {
      packageId,
      agentId,
      retailPrice,
      subPrice: agent.type === 'LEVEL1' ? subPrice : undefined,
    },
  });
}

/**
 * 检查套餐库存是否充足
 */
export async function checkStock(packageId: number, quantity: number): Promise<{ available: boolean; message?: string }> {
  const pkg = await prisma.productPackage.findUnique({
    where: { id: packageId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, stock: true, lockStock: true },
          },
        },
      },
    },
  });

  if (!pkg) {
    return { available: false, message: '套餐不存在' };
  }

  if (pkg.status !== 'ACTIVE') {
    return { available: false, message: '套餐已下架' };
  }

  if (pkg.stockStrategy === 'COMPONENT') {
    for (const item of pkg.items) {
      const needed = item.quantity * quantity;
      const available = item.product.stock - item.product.lockStock;
      if (available < needed) {
        return {
          available: false,
          message: `商品"${item.product.name}"库存不足，需要${needed}件，仅剩${available}件`
        };
      }
    }
  } else {
    if (pkg.independentStock < quantity) {
      return {
        available: false,
        message: `套餐库存不足，需要${quantity}件，仅剩${pkg.independentStock}件`
      };
    }
  }

  return { available: true };
}

/**
 * 获取套餐的商品明细用于预约
 */
export async function getPackageItemsForReservation(packageId: number) {
  const pkg = await prisma.productPackage.findUnique({
    where: { id: packageId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              retailPrice: true,
              supplyPrice: true,
              costPrice: true,
            },
          },
        },
        orderBy: { sort: 'asc' },
      },
    },
  });

  if (!pkg) {
    return null;
  }

  return {
    packageId: pkg.id,
    packageName: pkg.name,
    packageCode: pkg.code,
    items: pkg.items.map(item => ({
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      costPrice: item.snapshotCostPrice || item.product.costPrice,
      supplyPrice: item.snapshotSupplyPrice || item.product.supplyPrice,
      retailPrice: item.snapshotRetailPrice || item.product.retailPrice,
    })),
  };
}

/**
 * 【2026-01-26】创建套餐预约
 */
export interface CreatePackageReservationInput {
  packageId: number;
  customerName: string;
  customerPhone: string;
  pickupDate: Date;
  storeId: number;
  salespersonId?: number;
  remark?: string;
}

export async function createPackageReservation(input: CreatePackageReservationInput) {
  const { packageId, customerName, customerPhone, pickupDate, storeId, salespersonId, remark } = input;

  // 1. 获取套餐详情
  const pkg = await prisma.productPackage.findUnique({
    where: { id: packageId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              retailPrice: true,
              supplyPrice: true,
              costPrice: true,
              stock: true,
              lockStock: true,
            },
          },
        },
        orderBy: { sort: 'asc' },
      },
    },
  });

  if (!pkg) {
    return { success: false, message: '套餐不存在' };
  }

  if (pkg.status !== 'ACTIVE') {
    return { success: false, message: '套餐已下架' };
  }

  // 2. 验证门店
  const store = await prisma.warehouse.findUnique({
    where: { id: storeId },
  });
  if (!store || store.status !== 'ACTIVE') {
    return { success: false, message: '门店不存在或已停用' };
  }

  // 3. 计算可售库存（组件模式）
  let availableStock = Infinity;
  if (pkg.stockStrategy === 'COMPONENT') {
    for (const item of pkg.items) {
      const productAvailable = item.product.stock - (item.product.lockStock || 0);
      const canMake = Math.floor(productAvailable / item.quantity);
      availableStock = Math.min(availableStock, canMake);
    }
    if (availableStock === Infinity) availableStock = 0;
  } else {
    availableStock = pkg.independentStock;
  }

  if (availableStock <= 0) {
    return { success: false, message: '套餐库存不足' };
  }

  // 4. 获取推销员信息
  let salespersonLevel: number | null = null;
  let parentSalespersonId: number | null = null;
  let agentId: number | null = null;

  if (salespersonId) {
    const salesperson = await prisma.agent.findUnique({
      where: { id: salespersonId },
      select: { id: true, type: true, parentId: true, isMaster: true },
    });

    if (salesperson) {
      if (salesperson.isMaster) {
        agentId = salesperson.id;
      } else if (salesperson.type === 'LEVEL1') {
        salespersonLevel = 1;
        const master = await prisma.agent.findFirst({ where: { isMaster: true } });
        agentId = master?.id || null;
      } else if (salesperson.type === 'LEVEL2') {
        salespersonLevel = 2;
        parentSalespersonId = salesperson.parentId;
        const master = await prisma.agent.findFirst({ where: { isMaster: true } });
        agentId = master?.id || null;
      }
    }
  }

  // 5. 生成预约号
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `MQ${dateStr}`;
  const lastReservation = await prisma.reservation.findFirst({
    where: { reservationNo: { startsWith: prefix } },
    orderBy: { reservationNo: 'desc' },
  });
  let seq = 1;
  if (lastReservation) {
    const lastSeq = parseInt(lastReservation.reservationNo.slice(-5), 10);
    seq = lastSeq + 1;
  }
  const reservationNo = `${prefix}${seq.toString().padStart(5, '0')}`;

  // 6. 计算套餐价格（与普通商品保持一致的定价逻辑）
  // 【2026-01-29修复】统一定价逻辑：
  //   1. 优先使用推销员设置的 retailPrice（零售价）
  //   2. 二级没设置 retailPrice 时，使用一级给的 subPrice
  //   3. 最后才使用套餐建议零售价 masterRetailPrice
  // 【2026-01-29修复】保存snapshotLevel1Price用于分润计算
  let totalAmount = Number(pkg.masterRetailPrice);
  let snapshotLevel1Price: number | null = null; // 一级给二级的价格快照

  if (salespersonId) {
    const salesperson = await prisma.agent.findUnique({
      where: { id: salespersonId },
      select: { type: true, isMaster: true, parentId: true },
    });

    if (salesperson) {
      // 查询推销员对此套餐的定价
      const agentPrice = await prisma.packageAgentPrice.findUnique({
        where: {
          packageId_agentId: {
            packageId,
            agentId: salespersonId,
          },
        },
      });

      if (salesperson.isMaster) {
        // 总代理直销：使用建议零售价
        totalAmount = Number(pkg.masterRetailPrice);
      } else if (salesperson.type === 'LEVEL1') {
        // 一级推销员：优先使用自己设置的零售价
        if (agentPrice?.retailPrice) {
          totalAmount = Number(agentPrice.retailPrice);
        } else {
          // 未设置零售价，使用建议零售价
          totalAmount = Number(pkg.masterRetailPrice);
        }
        // 记录一级设置的subPrice（用于二级分润计算）
        if (agentPrice?.subPrice) {
          snapshotLevel1Price = Number(agentPrice.subPrice);
        }
      } else if (salesperson.type === 'LEVEL2' && salesperson.parentId) {
        // 二级推销员
        // 先获取一级给二级的价格
        const parentPrice = await prisma.packageAgentPrice.findUnique({
          where: {
            packageId_agentId: {
              packageId,
              agentId: salesperson.parentId,
            },
          },
        });

        // 保存一级给二级的价格（用于分润计算）
        if (parentPrice?.subPrice) {
          snapshotLevel1Price = Number(parentPrice.subPrice);
        } else {
          // 一级没设置subPrice，降级使用供货价
          snapshotLevel1Price = Number(pkg.supplyPrice);
          console.log(`[packageService] 套餐${packageId}一级未设置subPrice，降级使用供货价${pkg.supplyPrice}`);
        }

        // 计算零售价（优先级：二级retailPrice > 一级subPrice > 建议零售价）
        if (agentPrice?.retailPrice) {
          // 二级自己设置了零售价
          totalAmount = Number(agentPrice.retailPrice);
        } else if (parentPrice?.subPrice) {
          // 二级没设置零售价，使用一级给的subPrice
          totalAmount = Number(parentPrice.subPrice);
        } else {
          // 都没设置，使用建议零售价
          totalAmount = Number(pkg.masterRetailPrice);
        }
      }
    }
  }

  // 7. 在事务中创建预约并锁定库存
  return prisma.$transaction(async (tx) => {
    // 创建预约（注：Reservation模型没有remark字段，备注信息暂不保存）
    const reservation = await tx.reservation.create({
      data: {
        reservationNo,
        customerName,
        customerPhone,
        pickupDate,
        storeId,
        salespersonId,
        salespersonLevel,
        parentSalespersonId,
        agentId,
        totalAmount,
        status: 0, // 待确认
      },
    });

    // 创建预约商品项（套餐作为一个整体）
    // 解析套餐图片
    let pkgImage: string | null = null;
    if (pkg.images) {
      try {
        const parsed = JSON.parse(pkg.images);
        pkgImage = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : pkg.images;
      } catch {
        pkgImage = pkg.images;
      }
    }

    // 套餐商品明细JSON
    const packageItemsJson = JSON.stringify(pkg.items.map(item => ({
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      price: Number(item.snapshotRetailPrice || item.product.retailPrice),
    })));

    // 【2026-01-29修复】保存完整的价格快照用于分润计算
    // snapshotRetailPrice 应为实际成交价格（而非建议零售价）
    // snapshotLevel1Price 用于二级推销员订单的一级利润计算
    await tx.reservationItem.create({
      data: {
        reservationId: reservation.id,
        productId: pkg.items[0]?.productId || 0, // 使用第一个商品ID作为主商品
        productName: pkg.name,
        productImage: pkgImage,
        quantity: 1,
        price: totalAmount,
        snapshotCostPrice: pkg.costPrice,
        snapshotSupplyPrice: pkg.supplyPrice,
        snapshotLevel1Price: snapshotLevel1Price, // 【2026-01-29】一级给二级的价格
        snapshotRetailPrice: totalAmount, // 【2026-01-29修复】使用实际成交价格
        isPackage: true,
        packageId: pkg.id,
        packageName: pkg.name,
        packageItems: packageItemsJson,
      },
    });

    // 锁定库存（组件模式）
    if (pkg.stockStrategy === 'COMPONENT') {
      for (const item of pkg.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { lockStock: { increment: item.quantity } },
        });
      }
    } else {
      // 独立库存模式
      await tx.productPackage.update({
        where: { id: packageId },
        data: { independentStock: { decrement: 1 } },
      });
    }

    // 创建审计日志
    await tx.reservationAudit.create({
      data: {
        reservationId: reservation.id,
        action: 'CREATED',
        operatorType: salespersonId ? 'AGENT' : 'CUSTOMER',
        operatorId: salespersonId || null,
        details: JSON.stringify({
          packageId: pkg.id,
          packageName: pkg.name,
          totalAmount,
          source: 'package_checkout',
        }),
      },
    });

    return {
      success: true,
      reservationId: reservation.id,
      reservationNo,
      message: '预约成功',
    };
  });
}
