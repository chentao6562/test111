// Banner服务层
import prisma from '../utils/prisma';

export interface CreateBannerDto {
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkType?: string;
  linkValue?: string;
  sortOrder?: number;
  status?: string;
}

export interface UpdateBannerDto {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  linkType?: string;
  linkValue?: string;
  sortOrder?: number;
  status?: string;
}

// 获取Banner列表（小程序端 - 只返回启用的）
export async function getActiveBanners() {
  return prisma.banner.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { sortOrder: 'desc' },
  });
}

// 获取所有Banner（管理后台）
export async function getAllBanners(params: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  const { page = 1, pageSize = 10, status } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (status) {
    where.status = status;
  }

  const [list, total] = await Promise.all([
    prisma.banner.findMany({
      where,
      orderBy: { sortOrder: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.banner.count({ where }),
  ]);

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// 获取单个Banner
export async function getBannerById(id: number) {
  return prisma.banner.findUnique({
    where: { id },
  });
}

// 创建Banner
export async function createBanner(data: CreateBannerDto) {
  return prisma.banner.create({
    data: {
      title: data.title,
      subtitle: data.subtitle,
      imageUrl: data.imageUrl,
      linkType: data.linkType || 'NONE',
      linkValue: data.linkValue,
      sortOrder: data.sortOrder || 0,
      status: data.status || 'ACTIVE',
    },
  });
}

// 更新Banner
export async function updateBanner(id: number, data: UpdateBannerDto) {
  return prisma.banner.update({
    where: { id },
    data,
  });
}

// 删除Banner
export async function deleteBanner(id: number) {
  return prisma.banner.delete({
    where: { id },
  });
}

// 批量更新排序
export async function updateBannerSort(items: { id: number; sortOrder: number }[]) {
  const updates = items.map((item) =>
    prisma.banner.update({
      where: { id: item.id },
      data: { sortOrder: item.sortOrder },
    })
  );
  return prisma.$transaction(updates);
}
