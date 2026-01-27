/**
 * 区域控制器
 * 提供区域数据查询API（用于顺路拼团区域选择）
 * @since 2026-01-21
 */
import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * 获取区域树形结构
 * GET /api/regions
 * 返回两级结构：区县 -> 乡镇/街道
 */
export const getRegionTree = async (req: Request, res: Response) => {
  try {
    // 获取所有区县（level=1）
    const districts = await prisma.region.findMany({
      where: {
        level: 1,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        level: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
    });

    res.json({
      code: 0,
      message: 'success',
      data: districts,
    });
  } catch (error) {
    console.error('获取区域树失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取区域数据失败',
      data: null,
    });
  }
};

/**
 * 获取区域列表（平铺）
 * GET /api/regions/list
 * 可选参数：level (1=区县, 2=乡镇/街道)
 */
export const getRegionList = async (req: Request, res: Response) => {
  try {
    const { level, parentId } = req.query;

    const where: any = { isActive: true };
    if (level) where.level = parseInt(level as string);
    if (parentId) where.parentId = parseInt(parentId as string);

    const regions = await prisma.region.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        level: true,
        parentId: true,
      },
    });

    res.json({
      code: 0,
      message: 'success',
      data: regions,
    });
  } catch (error) {
    console.error('获取区域列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取区域数据失败',
      data: null,
    });
  }
};

/**
 * 根据ID获取区域详情（包含完整路径名称）
 * GET /api/regions/:id
 */
export const getRegionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const region = await prisma.region.findUnique({
      where: { id: parseInt(id) },
      include: {
        parent: {
          select: { id: true, name: true },
        },
      },
    });

    if (!region) {
      return res.status(404).json({
        code: 404,
        message: '区域不存在',
        data: null,
      });
    }

    // 构建完整路径名称
    const fullName = region.parent
      ? `${region.parent.name}/${region.name}`
      : region.name;

    res.json({
      code: 0,
      message: 'success',
      data: {
        ...region,
        fullName,
      },
    });
  } catch (error) {
    console.error('获取区域详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取区域数据失败',
      data: null,
    });
  }
};
