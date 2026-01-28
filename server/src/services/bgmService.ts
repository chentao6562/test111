/**
 * BGM背景音乐服务
 * @since 2026-01-28
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BgmMusic {
  id: number;
  name: string;
  url: string;
  duration: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBgmInput {
  name: string;
  url: string;
  duration?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateBgmInput {
  name?: string;
  url?: string;
  duration?: number;
  isActive?: boolean;
  sortOrder?: number;
}

/**
 * 获取所有BGM列表（管理后台）
 */
export async function getBgmList(): Promise<BgmMusic[]> {
  const list = await prisma.bgmMusic.findMany({
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'desc' },
    ],
  });
  return list;
}

/**
 * 获取启用的BGM列表
 */
export async function getActiveBgmList(): Promise<BgmMusic[]> {
  const list = await prisma.bgmMusic.findMany({
    where: { isActive: true },
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'desc' },
    ],
  });
  return list;
}

/**
 * 获取随机一首BGM（公开API）
 */
export async function getRandomBgm(): Promise<BgmMusic | null> {
  const activeList = await prisma.bgmMusic.findMany({
    where: { isActive: true },
  });

  if (activeList.length === 0) {
    return null;
  }

  // 随机选择
  const randomIndex = Math.floor(Math.random() * activeList.length);
  return activeList[randomIndex];
}

/**
 * 根据ID获取BGM
 */
export async function getBgmById(id: number): Promise<BgmMusic | null> {
  return await prisma.bgmMusic.findUnique({
    where: { id },
  });
}

/**
 * 创建BGM
 */
export async function createBgm(input: CreateBgmInput): Promise<BgmMusic> {
  return await prisma.bgmMusic.create({
    data: {
      name: input.name,
      url: input.url,
      duration: input.duration,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

/**
 * 更新BGM
 */
export async function updateBgm(id: number, input: UpdateBgmInput): Promise<BgmMusic> {
  return await prisma.bgmMusic.update({
    where: { id },
    data: input,
  });
}

/**
 * 删除BGM
 */
export async function deleteBgm(id: number): Promise<void> {
  await prisma.bgmMusic.delete({
    where: { id },
  });
}

/**
 * 批量更新排序
 */
export async function updateBgmSortOrder(items: { id: number; sortOrder: number }[]): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.bgmMusic.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    )
  );
}
