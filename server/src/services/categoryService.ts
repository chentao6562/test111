import { Category } from '@prisma/client';
import prisma from '../utils/prisma';

// 分类查询参数
interface CategoryQueryParams {
  status?: string;
  includeProductCount?: boolean;
}

// 创建分类DTO
interface CreateCategoryDto {
  name: string;
  icon?: string;
  sort?: number;
}

// 更新分类DTO
interface UpdateCategoryDto {
  name?: string;
  icon?: string | null;
  sort?: number;
  status?: string;
}

/**
 * 获取所有分类
 */
export async function findAll(params: CategoryQueryParams = {}) {
  const { status, includeProductCount } = params;

  const where: any = {};
  if (status) {
    where.status = status;
  }

  const categories = await prisma.category.findMany({
    where,
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    include: includeProductCount
      ? {
          _count: {
            select: { products: true },
          },
        }
      : undefined,
  });

  // 【2026-01-27】查询活跃套餐数量，用于"套餐"分类显示
  let packageCount = 0;
  if (includeProductCount) {
    packageCount = await prisma.productPackage.count({
      where: { status: 'ACTIVE' },
    });
  }

  return categories.map((cat: any) => ({
    ...cat,
    // 【2026-01-27】套餐分类使用ProductPackage表的统计
    productCount: cat.name === '套餐' ? packageCount : (cat._count?.products ?? undefined),
    _count: undefined,
  }));
}

/**
 * 根据ID获取分类
 */
export async function findById(id: number) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!category) {
    return null;
  }

  return {
    ...category,
    productCount: category._count.products,
    _count: undefined,
  };
}

/**
 * 创建分类
 */
export async function create(data: CreateCategoryDto) {
  return prisma.category.create({
    data: {
      name: data.name,
      icon: data.icon || null,
      sort: data.sort || 0,
      status: 'ACTIVE',
    },
  });
}

/**
 * 更新分类
 */
export async function update(id: number, data: UpdateCategoryDto) {
  return prisma.category.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.sort !== undefined && { sort: data.sort }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
}

/**
 * 删除分类（检查是否有商品）
 */
export async function deleteCategory(id: number) {
  // 检查是否有商品
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!category) {
    throw new Error('分类不存在');
  }

  if (category._count.products > 0) {
    throw new Error(`该分类下有 ${category._count.products} 个商品，无法删除`);
  }

  return prisma.category.delete({
    where: { id },
  });
}

/**
 * 批量更新排序
 */
export async function updateSort(ids: number[]) {
  const updates = ids.map((id, index) =>
    prisma.category.update({
      where: { id },
      data: { sort: index + 1 },
    })
  );

  return prisma.$transaction(updates);
}

/**
 * 切换分类状态
 */
export async function toggleStatus(id: number) {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new Error('分类不存在');
  }

  const newStatus = category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  return prisma.category.update({
    where: { id },
    data: { status: newStatus },
  });
}

/**
 * 初始化场景分类
 * 【2026-01-25】创建5个场景分类
 */
export async function initSceneCategories() {
  const sceneCategories = [
    { name: '网红款', icon: 'trending_up', sort: 1 },
    { name: '居家款', icon: 'home', sort: 2 },
    { name: '套餐', icon: 'inventory_2', sort: 3 },
    { name: '常规款', icon: 'category', sort: 4 },
    { name: '特效礼花', icon: 'celebration', sort: 5 },
  ];

  const created = [];

  for (const cat of sceneCategories) {
    // 检查是否已存在
    const existing = await prisma.category.findFirst({
      where: { name: cat.name },
    });

    if (existing) {
      created.push(existing);
    } else {
      const newCat = await prisma.category.create({
        data: {
          name: cat.name,
          icon: cat.icon,
          sort: cat.sort,
          status: 'ACTIVE',
        },
      });
      created.push(newCat);
    }
  }

  return created;
}

/**
 * 批量更新商品分类
 * 【2026-01-25】支持批量将商品移动到指定分类
 */
export async function batchUpdateProductCategory(
  productIds: number[],
  categoryId: number
) {
  // 验证分类存在
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new Error('目标分类不存在');
  }

  // 批量更新
  const result = await prisma.product.updateMany({
    where: {
      id: { in: productIds },
    },
    data: {
      categoryId: categoryId,
    },
  });

  return {
    count: result.count,
    categoryId,
    categoryName: category.name,
  };
}
