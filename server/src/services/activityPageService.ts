/**
 * 活动专题页服务
 * 【2026-01-19 活动系统增强】
 * 支持创建可配置的营销专题页，包含商品区块
 */
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';

interface PageListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}

interface CreatePageParams {
  name: string;
  slug: string;
  bannerImage?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  layout?: string;
  createdBy: number;
}

interface UpdatePageParams {
  name?: string;
  slug?: string;
  bannerImage?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  layout?: string;
}

interface SectionParams {
  title?: string;
  type: string;
  content?: string;  // JSON格式的商品ID列表等
  sort?: number;
}

/**
 * 获取专题页列表（管理后台）
 */
export async function getPageList(params: PageListParams) {
  const { page = 1, pageSize = 10, status, keyword } = params;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ActivityPageWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { slug: { contains: keyword } },
    ];
  }

  const [list, total] = await Promise.all([
    prisma.activityPage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        _count: { select: { sections: true } },
      },
    }),
    prisma.activityPage.count({ where }),
  ]);

  return {
    list: list.map(item => ({
      ...item,
      sectionCount: item._count.sections,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取专题页详情（管理后台）
 */
export async function getPageDetail(id: number) {
  const page = await prisma.activityPage.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { sort: 'asc' },
      },
    },
  });

  if (!page) {
    return null;
  }

  // 解析section的content字段，获取商品信息
  const sectionsWithProducts = await Promise.all(
    page.sections.map(async (section) => {
      if (section.type === 'PRODUCTS' && section.content) {
        try {
          const productIds = JSON.parse(section.content);
          if (Array.isArray(productIds) && productIds.length > 0) {
            const products = await prisma.product.findMany({
              where: { id: { in: productIds } },
              select: {
                id: true,
                name: true,
                images: true,
                retailPrice: true,
                stock: true,
                lockStock: true,
              },
            });
            // 保持原来的顺序
            const productMap = new Map(products.map(p => [p.id, p]));
            const orderedProducts = productIds.map((id: number) => productMap.get(id)).filter(Boolean);
            return {
              ...section,
              products: orderedProducts.map(p => ({
                ...p,
                retailPrice: Number(p?.retailPrice || 0),
              })),
            };
          }
        } catch {
          // 解析失败，返回空商品列表
        }
      }
      return { ...section, products: [] };
    })
  );

  return {
    ...page,
    sections: sectionsWithProducts,
  };
}

/**
 * 创建专题页
 */
export async function createPage(params: CreatePageParams) {
  // 检查slug是否已存在
  const existing = await prisma.activityPage.findUnique({
    where: { slug: params.slug },
  });

  if (existing) {
    throw new Error('URL标识已存在');
  }

  const page = await prisma.activityPage.create({
    data: {
      name: params.name,
      slug: params.slug,
      bannerImage: params.bannerImage || null,
      description: params.description || null,
      startTime: params.startTime ? new Date(params.startTime) : null,
      endTime: params.endTime ? new Date(params.endTime) : null,
      layout: params.layout || 'GRID',
      status: 'DRAFT',
      createdBy: params.createdBy,
    },
  });

  return page;
}

/**
 * 更新专题页
 */
export async function updatePage(id: number, params: UpdatePageParams) {
  const existing = await prisma.activityPage.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('专题页不存在');
  }

  // 如果更新slug，检查是否与其他页面冲突
  if (params.slug && params.slug !== existing.slug) {
    const slugExists = await prisma.activityPage.findUnique({
      where: { slug: params.slug },
    });
    if (slugExists) {
      throw new Error('URL标识已存在');
    }
  }

  const updateData: Prisma.ActivityPageUpdateInput = {};

  if (params.name !== undefined) updateData.name = params.name;
  if (params.slug !== undefined) updateData.slug = params.slug;
  if (params.bannerImage !== undefined) updateData.bannerImage = params.bannerImage || null;
  if (params.description !== undefined) updateData.description = params.description || null;
  if (params.startTime !== undefined) updateData.startTime = params.startTime ? new Date(params.startTime) : null;
  if (params.endTime !== undefined) updateData.endTime = params.endTime ? new Date(params.endTime) : null;
  if (params.layout !== undefined) updateData.layout = params.layout;

  const page = await prisma.activityPage.update({
    where: { id },
    data: updateData,
  });

  return page;
}

/**
 * 删除专题页
 */
export async function deletePage(id: number) {
  const existing = await prisma.activityPage.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('专题页不存在');
  }

  // 级联删除sections
  await prisma.activityPage.delete({ where: { id } });
  return true;
}

/**
 * 切换专题页状态
 */
export async function togglePageStatus(id: number, status: 'ACTIVE' | 'INACTIVE') {
  const existing = await prisma.activityPage.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('专题页不存在');
  }

  const page = await prisma.activityPage.update({
    where: { id },
    data: { status },
  });

  return page;
}

/**
 * 添加区块
 */
export async function addSection(pageId: number, params: SectionParams) {
  const page = await prisma.activityPage.findUnique({ where: { id: pageId } });
  if (!page) {
    throw new Error('专题页不存在');
  }

  const section = await prisma.activityPageSection.create({
    data: {
      pageId,
      title: params.title || null,
      type: params.type,
      content: params.content || null,
      sort: params.sort || 0,
    },
  });

  return section;
}

/**
 * 更新区块
 */
export async function updateSection(sectionId: number, params: SectionParams) {
  const existing = await prisma.activityPageSection.findUnique({ where: { id: sectionId } });
  if (!existing) {
    throw new Error('区块不存在');
  }

  const section = await prisma.activityPageSection.update({
    where: { id: sectionId },
    data: {
      title: params.title !== undefined ? params.title : existing.title,
      type: params.type || existing.type,
      content: params.content !== undefined ? params.content : existing.content,
      sort: params.sort !== undefined ? params.sort : existing.sort,
    },
  });

  return section;
}

/**
 * 删除区块
 */
export async function deleteSection(sectionId: number) {
  const existing = await prisma.activityPageSection.findUnique({ where: { id: sectionId } });
  if (!existing) {
    throw new Error('区块不存在');
  }

  await prisma.activityPageSection.delete({ where: { id: sectionId } });
  return true;
}

/**
 * 批量更新区块排序
 */
export async function updateSectionSort(sections: { id: number; sort: number }[]) {
  await prisma.$transaction(
    sections.map(({ id, sort }) =>
      prisma.activityPageSection.update({
        where: { id },
        data: { sort },
      })
    )
  );
  return true;
}

/**
 * 获取专题页内容（H5前端，通过slug获取）
 */
export async function getPageBySlug(slug: string) {
  const now = new Date();

  const page = await prisma.activityPage.findUnique({
    where: { slug },
    include: {
      sections: {
        orderBy: { sort: 'asc' },
      },
    },
  });

  if (!page) {
    return null;
  }

  // 检查状态和时间
  if (page.status !== 'ACTIVE') {
    return null;
  }

  if (page.startTime && now < page.startTime) {
    return null;  // 活动未开始
  }

  if (page.endTime && now > page.endTime) {
    return null;  // 活动已结束
  }

  // 获取商品详情
  const sectionsWithProducts = await Promise.all(
    page.sections.map(async (section) => {
      if (section.type === 'PRODUCTS' && section.content) {
        try {
          const productIds = JSON.parse(section.content);
          if (Array.isArray(productIds) && productIds.length > 0) {
            const products = await prisma.product.findMany({
              where: {
                id: { in: productIds },
                status: 'ACTIVE',
              },
              select: {
                id: true,
                name: true,
                images: true,
                retailPrice: true,
                stock: true,
                lockStock: true,
                unit: true,
              },
            });
            // 保持原来的顺序
            const productMap = new Map(products.map(p => [p.id, p]));
            const orderedProducts = productIds
              .map((id: number) => productMap.get(id))
              .filter(Boolean)
              .map(p => ({
                ...p,
                retailPrice: Number(p?.retailPrice || 0),
                availableStock: (p?.stock || 0) - (p?.lockStock || 0),
              }));
            return {
              id: section.id,
              title: section.title,
              type: section.type,
              products: orderedProducts,
            };
          }
        } catch {
          // 解析失败
        }
      }
      return {
        id: section.id,
        title: section.title,
        type: section.type,
        products: [],
      };
    })
  );

  return {
    id: page.id,
    name: page.name,
    slug: page.slug,
    bannerImage: page.bannerImage,
    description: page.description,
    layout: page.layout,
    sections: sectionsWithProducts,
  };
}

export default {
  getPageList,
  getPageDetail,
  createPage,
  updatePage,
  deletePage,
  togglePageStatus,
  addSection,
  updateSection,
  deleteSection,
  updateSectionSort,
  getPageBySlug,
};
