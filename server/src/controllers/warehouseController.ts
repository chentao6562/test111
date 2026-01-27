/**
 * 仓库管理控制器
 * 【2026-01-13 多仓库支持】
 */

import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { success, error } from '../utils/response';

/**
 * 获取仓库列表（公开接口，代理商下单时选择提货点）
 */
export async function getWarehouseList(req: Request, res: Response) {
  try {
    const { status = 'ACTIVE' } = req.query;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { sort: 'asc' },
        { createdAt: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        code: true,
        province: true,
        city: true,
        district: true,
        address: true,
        latitude: true,
        longitude: true,
        contactName: true,
        contactPhone: true,
        businessHours: true,
        isDefault: true,
        status: true,
      }
    });

    success(res, warehouses);
  } catch (err: any) {
    console.error('获取仓库列表失败:', err);
    error(res, err.message || '获取仓库列表失败', 500);
  }
}

/**
 * 获取仓库详情
 */
export async function getWarehouseDetail(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return error(res, '无效的仓库ID', 400);
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            staff: true,
            orders: true
          }
        }
      }
    });

    if (!warehouse) {
      return error(res, '仓库不存在', 404);
    }

    success(res, warehouse);
  } catch (err: any) {
    console.error('获取仓库详情失败:', err);
    error(res, err.message || '获取仓库详情失败', 500);
  }
}

/**
 * 管理后台 - 获取仓库列表（带分页和统计）
 */
export async function getAdminWarehouseList(req: Request, res: Response) {
  try {
    const {
      page = '1',
      pageSize = '10',
      keyword = '',
      status = ''
    } = req.query;

    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);

    const where: any = {};

    if (keyword) {
      where.OR = [
        { name: { contains: keyword as string } },
        { code: { contains: keyword as string } },
        { address: { contains: keyword as string } },
        { contactPhone: { contains: keyword as string } }
      ];
    }

    if (status) {
      where.status = status;
    }

    const [total, list] = await Promise.all([
      prisma.warehouse.count({ where }),
      prisma.warehouse.findMany({
        where,
        include: {
          _count: {
            select: {
              staff: {
                where: { role: 'WAREHOUSE' }
              },
              orders: true
            }
          }
        },
        orderBy: [
          { isDefault: 'desc' },
          { sort: 'asc' },
          { createdAt: 'desc' }
        ],
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum
      })
    ]);

    success(res, {
      list,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum)
    });
  } catch (err: any) {
    console.error('获取仓库列表失败:', err);
    error(res, err.message || '获取仓库列表失败', 500);
  }
}

/**
 * 管理后台 - 创建仓库
 */
export async function createWarehouse(req: Request, res: Response) {
  try {
    const {
      name,
      code,
      province,
      city,
      district,
      address,
      latitude,
      longitude,
      contactName,
      contactPhone,
      businessHours,
      isDefault = false,
      sort = 0
    } = req.body;

    // 验证必填字段
    if (!name || !code || !province || !city || !address || !contactPhone) {
      return error(res, '请填写完整的仓库信息', 400);
    }

    // 检查仓库编码是否已存在
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: { code }
    });

    if (existingWarehouse) {
      return error(res, '仓库编码已存在', 400);
    }

    // 如果设置为默认仓库，需要取消其他仓库的默认状态
    if (isDefault) {
      await prisma.warehouse.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        code,
        province,
        city,
        district,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        contactName,
        contactPhone,
        businessHours,
        isDefault,
        sort,
        status: 'ACTIVE'
      }
    });

    success(res, warehouse, '创建成功');
  } catch (err: any) {
    console.error('创建仓库失败:', err);
    error(res, err.message || '创建仓库失败', 500);
  }
}

/**
 * 管理后台 - 更新仓库
 */
export async function updateWarehouse(req: Request, res: Response) {
  try {
    const warehouseId = parseInt(req.params.id);

    if (isNaN(warehouseId)) {
      return error(res, '无效的仓库ID', 400);
    }

    const {
      name,
      code,
      province,
      city,
      district,
      address,
      latitude,
      longitude,
      contactName,
      contactPhone,
      businessHours,
      isDefault,
      sort,
      status
    } = req.body;

    // 检查仓库是否存在
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId }
    });

    if (!existingWarehouse) {
      return error(res, '仓库不存在', 404);
    }

    // 如果修改了仓库编码，检查是否与其他仓库冲突
    if (code && code !== existingWarehouse.code) {
      const codeExists = await prisma.warehouse.findUnique({
        where: { code }
      });
      if (codeExists) {
        return error(res, '仓库编码已被使用', 400);
      }
    }

    // 如果设置为默认仓库，需要取消其他仓库的默认状态
    if (isDefault === true && !existingWarehouse.isDefault) {
      await prisma.warehouse.updateMany({
        where: {
          isDefault: true,
          id: { not: warehouseId }
        },
        data: { isDefault: false }
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (province !== undefined) updateData.province = province;
    if (city !== undefined) updateData.city = city;
    if (district !== undefined) updateData.district = district;
    if (address !== undefined) updateData.address = address;
    if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
    if (contactName !== undefined) updateData.contactName = contactName;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (businessHours !== undefined) updateData.businessHours = businessHours;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (sort !== undefined) updateData.sort = sort;
    if (status !== undefined) updateData.status = status;

    const warehouse = await prisma.warehouse.update({
      where: { id: warehouseId },
      data: updateData
    });

    success(res, warehouse, '更新成功');
  } catch (err: any) {
    console.error('更新仓库失败:', err);
    error(res, err.message || '更新仓库失败', 500);
  }
}

/**
 * 管理后台 - 删除仓库（软删除，改为停用）
 */
export async function deleteWarehouse(req: Request, res: Response) {
  try {
    const warehouseId = parseInt(req.params.id);

    if (isNaN(warehouseId)) {
      return error(res, '无效的仓库ID', 400);
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      include: {
        _count: {
          select: {
            staff: true,
            orders: {
              where: {
                status: {
                  notIn: ['completed', 'cancelled']
                }
              }
            }
          }
        }
      }
    });

    if (!warehouse) {
      return error(res, '仓库不存在', 404);
    }

    // 检查是否有关联的员工
    if (warehouse._count.staff > 0) {
      return error(res, `该仓库下有 ${warehouse._count.staff} 名员工，请先转移员工后再删除`, 400);
    }

    // 检查是否有未完成的订单
    if (warehouse._count.orders > 0) {
      return error(res, `该仓库有 ${warehouse._count.orders} 个未完成订单，无法删除`, 400);
    }

    // 检查是否为默认仓库
    if (warehouse.isDefault) {
      return error(res, '默认仓库无法删除，请先设置其他仓库为默认仓库', 400);
    }

    // 软删除：改为停用状态
    await prisma.warehouse.update({
      where: { id: warehouseId },
      data: { status: 'INACTIVE' }
    });

    success(res, null, '删除成功');
  } catch (err: any) {
    console.error('删除仓库失败:', err);
    error(res, err.message || '删除仓库失败', 500);
  }
}

/**
 * 管理后台 - 设置默认仓库
 */
export async function setDefaultWarehouse(req: Request, res: Response) {
  try {
    const warehouseId = parseInt(req.params.id);

    if (isNaN(warehouseId)) {
      return error(res, '无效的仓库ID', 400);
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId }
    });

    if (!warehouse) {
      return error(res, '仓库不存在', 404);
    }

    if (warehouse.status !== 'ACTIVE') {
      return error(res, '停用状态的仓库无法设为默认', 400);
    }

    // 事务操作：取消所有默认仓库，设置当前为默认
    await prisma.$transaction([
      prisma.warehouse.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      }),
      prisma.warehouse.update({
        where: { id: warehouseId },
        data: { isDefault: true }
      })
    ]);

    success(res, null, '设置成功');
  } catch (err: any) {
    console.error('设置默认仓库失败:', err);
    error(res, err.message || '设置默认仓库失败', 500);
  }
}

/**
 * 管理后台 - 获取仓库统计
 */
export async function getWarehouseStats(req: Request, res: Response) {
  try {
    const [
      totalCount,
      activeCount,
      inactiveCount,
      staffCounts
    ] = await Promise.all([
      prisma.warehouse.count(),
      prisma.warehouse.count({ where: { status: 'ACTIVE' } }),
      prisma.warehouse.count({ where: { status: 'INACTIVE' } }),
      prisma.systemUser.groupBy({
        by: ['warehouseId'],
        where: {
          role: 'WAREHOUSE',
          warehouseId: { not: null }
        },
        _count: true
      })
    ]);

    // 统计各仓库今日订单数
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrderCounts = await prisma.order.groupBy({
      by: ['warehouseId'],
      where: {
        createdAt: { gte: today },
        warehouseId: { not: null }
      },
      _count: true
    });

    success(res, {
      totalCount,
      activeCount,
      inactiveCount,
      warehouseStaffCounts: staffCounts,
      todayOrderCounts
    });
  } catch (err: any) {
    console.error('获取仓库统计失败:', err);
    error(res, err.message || '获取仓库统计失败', 500);
  }
}

/**
 * 获取默认仓库
 */
export async function getDefaultWarehouse(req: Request, res: Response) {
  try {
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        isDefault: true,
        status: 'ACTIVE'
      }
    });

    if (!warehouse) {
      // 如果没有默认仓库，返回第一个激活的仓库
      const firstWarehouse = await prisma.warehouse.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' }
      });

      return success(res, firstWarehouse);
    }

    success(res, warehouse);
  } catch (err: any) {
    console.error('获取默认仓库失败:', err);
    error(res, err.message || '获取默认仓库失败', 500);
  }
}
