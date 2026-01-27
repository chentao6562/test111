import prisma from '../utils/prisma';
import { SystemUser } from '@prisma/client';

/**
 * 根据用户名查找系统用户
 */
export async function findByUsername(
  username: string
): Promise<SystemUser | null> {
  return prisma.systemUser.findUnique({
    where: { username },
  });
}

/**
 * 根据ID查找系统用户
 */
export async function findById(id: number): Promise<SystemUser | null> {
  return prisma.systemUser.findUnique({
    where: { id },
  });
}

/**
 * 根据手机号查找系统用户
 */
export async function findByPhone(phone: string): Promise<SystemUser | null> {
  return prisma.systemUser.findFirst({
    where: { phone },
  });
}

/**
 * 验证用户角色
 * @param userId 用户ID
 * @param roles 允许的角色列表
 */
export async function validateRole(
  userId: number,
  roles: string[]
): Promise<boolean> {
  const user = await findById(userId);
  if (!user) {
    return false;
  }
  return roles.includes(user.role);
}

/**
 * 获取系统用户信息（排除密码）
 * 【2026-01-13多仓库支持】增加 warehouseId 和 warehouse 信息
 */
export async function getStaffInfo(id: number) {
  const user = await prisma.systemUser.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      warehouseId: true,
      warehouse: {
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          contactPhone: true,
        },
      },
    },
  });

  return user;
}

/**
 * 记录登录失败
 */
export async function recordLoginFail(id: number): Promise<void> {
  const user = await findById(id);
  if (!user) return;

  const newCount = user.loginFailCount + 1;
  let lockedUntil: Date | null = null;

  // 连续5次失败锁定15分钟
  if (newCount >= 5) {
    lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
  }

  await prisma.systemUser.update({
    where: { id },
    data: {
      loginFailCount: newCount,
      lockedUntil,
    },
  });
}

/**
 * 重置登录失败计数
 */
export async function resetLoginFail(id: number): Promise<void> {
  await prisma.systemUser.update({
    where: { id },
    data: {
      loginFailCount: 0,
      lockedUntil: null,
    },
  });
}

/**
 * 检查账号是否被锁定
 */
export async function isLocked(id: number): Promise<boolean> {
  const user = await findById(id);
  if (!user || !user.lockedUntil) {
    return false;
  }
  return user.lockedUntil > new Date();
}

export default {
  findByUsername,
  findById,
  findByPhone,
  validateRole,
  getStaffInfo,
  recordLoginFail,
  resetLoginFail,
  isLocked,
};
