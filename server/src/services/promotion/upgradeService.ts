/**
 * 升级申请服务
 * 【2026-01-16 推广体系升级】
 * 【2026-01-17 增强】添加自动晋升功能
 *
 * 晋升方式:
 * 1. 自动晋升 - 累计销售额达到门槛自动晋升，无需审批
 * 2. 申请晋升 - 未达门槛可提前申请，需管理员审批
 *
 * 升级后:
 * - 二级推销员变为一级推销员
 * - 脱离原上级
 * - 原上级获得升级补偿
 */

import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import * as rewardService from './rewardService';

// 【2026-01-17】自动晋升配置键
export const AutoUpgradeConfigKeys = {
  AUTO_UPGRADE_THRESHOLD: 'auto_upgrade_threshold',  // 自动晋升销售额门槛（默认30000，与升级门槛一致）
  AUTO_UPGRADE_ENABLED: 'auto_upgrade_enabled',      // 是否启用自动晋升（默认true）
};

// 升级申请状态
export enum UpgradeStatus {
  PENDING = 0,   // 待审核
  APPROVED = 1,  // 已通过
  REJECTED = 2,  // 已拒绝
}

// 升级资格检查结果
export interface UpgradeEligibility {
  eligible: boolean;
  reasons: string[];
  currentStats: {
    totalSales: number;
    totalOrderCount: number;
    registerDays: number;
  };
  requirements: {
    salesThreshold: number;
    ordersThreshold: number;
    daysThreshold: number;
  };
}

/**
 * 检查升级资格
 */
export async function checkUpgradeEligibility(agentId: number): Promise<UpgradeEligibility> {
  // 获取推销员信息
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      type: true,
      totalSales: true,
      totalOrderCount: true,
      createdAt: true,
    },
  });

  if (!agent) {
    return {
      eligible: false,
      reasons: ['推销员不存在'],
      currentStats: { totalSales: 0, totalOrderCount: 0, registerDays: 0 },
      requirements: { salesThreshold: 0, ordersThreshold: 0, daysThreshold: 0 },
    };
  }

  // 只有二级推销员才能升级
  if (agent.type !== 'LEVEL2') {
    return {
      eligible: false,
      reasons: ['只有二级推销员才能申请升级'],
      currentStats: { totalSales: 0, totalOrderCount: 0, registerDays: 0 },
      requirements: { salesThreshold: 0, ordersThreshold: 0, daysThreshold: 0 },
    };
  }

  // 获取升级条件
  const salesThreshold = await rewardService.getRewardConfig(
    rewardService.RewardConfigKeys.UPGRADE_SALES_THRESHOLD
  );
  const ordersThreshold = await rewardService.getRewardConfig(
    rewardService.RewardConfigKeys.UPGRADE_ORDERS_THRESHOLD
  );
  const daysThreshold = await rewardService.getRewardConfig(
    rewardService.RewardConfigKeys.UPGRADE_DAYS_THRESHOLD
  );

  // 计算当前状态
  const totalSales = Number(agent.totalSales);
  const totalOrderCount = agent.totalOrderCount;
  const registerDays = Math.floor(
    (Date.now() - agent.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // 检查条件
  const reasons: string[] = [];

  if (salesThreshold > 0 && totalSales < salesThreshold) {
    reasons.push(`累计销售额未达到 ¥${salesThreshold}（当前: ¥${totalSales}）`);
  }

  if (ordersThreshold > 0 && totalOrderCount < ordersThreshold) {
    reasons.push(`累计订单数未达到 ${ordersThreshold} 单（当前: ${totalOrderCount} 单）`);
  }

  if (daysThreshold > 0 && registerDays < daysThreshold) {
    reasons.push(`注册时间未满 ${daysThreshold} 天（当前: ${registerDays} 天）`);
  }

  // 检查是否有待审核的申请
  const pendingApplication = await prisma.upgradeApplication.findFirst({
    where: {
      agentId,
      status: UpgradeStatus.PENDING,
    },
  });

  if (pendingApplication) {
    reasons.push('已有待审核的升级申请');
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    currentStats: {
      totalSales,
      totalOrderCount,
      registerDays,
    },
    requirements: {
      salesThreshold,
      ordersThreshold,
      daysThreshold,
    },
  };
}

/**
 * 提交升级申请
 */
export async function submitUpgradeApplication(
  agentId: number,
  reason?: string
): Promise<{ id: number }> {
  // 检查资格
  const eligibility = await checkUpgradeEligibility(agentId);
  if (!eligibility.eligible) {
    throw new Error(`不满足升级条件: ${eligibility.reasons.join('; ')}`);
  }

  // 获取推销员信息
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      parentId: true,
      totalSales: true,
      totalOrderCount: true,
    },
  });

  if (!agent) {
    throw new Error('推销员不存在');
  }

  // 创建申请
  const application = await prisma.upgradeApplication.create({
    data: {
      agentId,
      oldParentId: agent.parentId,
      applySales: agent.totalSales,
      applyOrders: agent.totalOrderCount,
      applyReason: reason,
      status: UpgradeStatus.PENDING,
    },
  });

  return { id: application.id };
}

/**
 * 获取升级申请列表（管理员）
 */
export async function getUpgradeApplications(options: {
  page?: number;
  pageSize?: number;
  status?: UpgradeStatus;
}): Promise<{
  list: Array<{
    id: number;
    agentId: number;
    agentName: string;
    agentPhone: string;
    oldParentId: number | null;
    oldParentName: string | null;
    applySales: number;
    applyOrders: number | null;
    applyReason: string | null;
    status: number;
    reviewRemark: string | null;
    createdAt: Date;
    reviewedAt: Date | null;
  }>;
  total: number;
}> {
  const { page = 1, pageSize = 20, status } = options;
  const skip = (page - 1) * pageSize;

  const where: Prisma.UpgradeApplicationWhereInput = {};
  if (status !== undefined) {
    where.status = status;
  }

  const [applications, total] = await Promise.all([
    prisma.upgradeApplication.findMany({
      where,
      include: {
        agent: {
          select: {
            name: true,
            phone: true,
            parent: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.upgradeApplication.count({ where }),
  ]);

  return {
    list: applications.map(app => ({
      id: app.id,
      agentId: app.agentId,
      agentName: app.agent.name || '',
      agentPhone: app.agent.phone,
      oldParentId: app.oldParentId,
      oldParentName: app.agent.parent?.name || null,
      applySales: Number(app.applySales),
      applyOrders: app.applyOrders,
      applyReason: app.applyReason,
      status: app.status,
      reviewRemark: app.reviewRemark,
      createdAt: app.createdAt,
      reviewedAt: app.reviewedAt,
    })),
    total,
  };
}

/**
 * 审核升级申请
 */
export async function reviewUpgradeApplication(
  applicationId: number,
  approved: boolean,
  reviewedBy: number,
  remark?: string
): Promise<void> {
  const application = await prisma.upgradeApplication.findUnique({
    where: { id: applicationId },
    include: {
      agent: {
        select: {
          id: true,
          type: true,
          parentId: true,
        },
      },
    },
  });

  if (!application) {
    throw new Error('申请不存在');
  }

  if (application.status !== UpgradeStatus.PENDING) {
    throw new Error('该申请已处理');
  }

  if (!approved) {
    // 拒绝申请
    await prisma.upgradeApplication.update({
      where: { id: applicationId },
      data: {
        status: UpgradeStatus.REJECTED,
        reviewRemark: remark,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });
    return;
  }

  // 通过申请，使用事务处理
  await prisma.$transaction(async (tx) => {
    const agent = application.agent;
    const oldParentId = agent.parentId;

    // 1. 更新推销员类型为一级
    await tx.agent.update({
      where: { id: agent.id },
      data: {
        type: 'LEVEL1',
        parentId: null,  // 解除与原上级的关系
      },
    });

    // 2. 发放升级补偿给原上级
    if (oldParentId) {
      await rewardService.grantUpgradeCompensation(oldParentId, agent.id, tx);

      // 更新申请记录标记补偿已发放
      await tx.upgradeApplication.update({
        where: { id: applicationId },
        data: {
          compensationPaid: true,
        },
      });
    }

    // 3. 更新申请状态
    await tx.upgradeApplication.update({
      where: { id: applicationId },
      data: {
        status: UpgradeStatus.APPROVED,
        reviewRemark: remark,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });
  });
}

/**
 * 获取我的升级申请记录
 */
export async function getMyUpgradeApplications(agentId: number): Promise<Array<{
  id: number;
  applySales: number;
  applyOrders: number | null;
  applyReason: string | null;
  status: number;
  reviewRemark: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
}>> {
  const applications = await prisma.upgradeApplication.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
  });

  return applications.map(app => ({
    id: app.id,
    applySales: Number(app.applySales),
    applyOrders: app.applyOrders,
    applyReason: app.applyReason,
    status: app.status,
    reviewRemark: app.reviewRemark,
    createdAt: app.createdAt,
    reviewedAt: app.reviewedAt,
  }));
}

// ============ 【2026-01-17】自动晋升功能 ============

/**
 * 获取自动晋升配置
 */
export async function getAutoUpgradeConfig(): Promise<{
  threshold: number;
  enabled: boolean;
}> {
  const [thresholdConfig, enabledConfig] = await Promise.all([
    prisma.rewardConfig.findUnique({
      where: { configKey: AutoUpgradeConfigKeys.AUTO_UPGRADE_THRESHOLD },
    }),
    prisma.rewardConfig.findUnique({
      where: { configKey: AutoUpgradeConfigKeys.AUTO_UPGRADE_ENABLED },
    }),
  ]);

  return {
    threshold: thresholdConfig ? Number(thresholdConfig.configValue) : 30000, // 默认30000元，与升级门槛一致
    enabled: enabledConfig ? enabledConfig.configValue !== 'false' : true,   // 默认开启
  };
}

/**
 * 设置自动晋升配置
 */
export async function setAutoUpgradeConfig(
  threshold: number,
  enabled: boolean,
  updatedBy?: number
): Promise<void> {
  await Promise.all([
    prisma.rewardConfig.upsert({
      where: { configKey: AutoUpgradeConfigKeys.AUTO_UPGRADE_THRESHOLD },
      update: { configValue: String(threshold), updatedBy },
      create: {
        configKey: AutoUpgradeConfigKeys.AUTO_UPGRADE_THRESHOLD,
        configValue: String(threshold),
        description: '自动晋升销售额门槛',
        updatedBy,
      },
    }),
    prisma.rewardConfig.upsert({
      where: { configKey: AutoUpgradeConfigKeys.AUTO_UPGRADE_ENABLED },
      update: { configValue: String(enabled), updatedBy },
      create: {
        configKey: AutoUpgradeConfigKeys.AUTO_UPGRADE_ENABLED,
        configValue: String(enabled),
        description: '是否启用自动晋升',
        updatedBy,
      },
    }),
  ]);
}

/**
 * 检查是否满足自动晋升条件
 */
export async function checkAutoUpgradeEligibility(agentId: number): Promise<{
  eligible: boolean;
  currentSales: number;
  threshold: number;
  progress: number;
  enabled: boolean;
}> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent || agent.type !== 'LEVEL2') {
    return { eligible: false, currentSales: 0, threshold: 0, progress: 0, enabled: false };
  }

  const config = await getAutoUpgradeConfig();
  const currentSales = Number(agent.totalSales);
  const progress = config.threshold > 0
    ? Math.min(100, Math.round((currentSales / config.threshold) * 100))
    : 100;

  return {
    eligible: config.enabled && currentSales >= config.threshold,
    currentSales,
    threshold: config.threshold,
    progress,
    enabled: config.enabled,
  };
}

/**
 * 执行自动晋升
 * 在订单结算后调用，检查是否达到晋升门槛
 * @returns 是否完成晋升
 */
export async function processAutoUpgrade(
  agentId: number,
  tx?: Prisma.TransactionClient
): Promise<{
  upgraded: boolean;
  message?: string;
}> {
  const client = tx || prisma;

  const agent = await client.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent || agent.type !== 'LEVEL2') {
    return { upgraded: false };
  }

  const config = await getAutoUpgradeConfig();
  if (!config.enabled) {
    return { upgraded: false };
  }

  const currentSales = Number(agent.totalSales);
  if (currentSales < config.threshold) {
    return { upgraded: false };
  }

  // 执行晋升
  const oldParentId = agent.parentId;

  // 1. 更新类型为一级
  await client.agent.update({
    where: { id: agentId },
    data: {
      type: 'LEVEL1',
      parentId: null,
    },
  });

  // 2. 发放升级补偿给原上级
  if (oldParentId) {
    await rewardService.grantUpgradeCompensation(oldParentId, agentId, client);
  }

  // 3. 创建自动晋升记录（使用升级申请表记录）
  await client.upgradeApplication.create({
    data: {
      agentId,
      oldParentId,
      applySales: agent.totalSales,
      applyOrders: agent.totalOrderCount,
      applyReason: '系统自动晋升：累计销售额达到门槛',
      status: UpgradeStatus.APPROVED,
      reviewRemark: `自动晋升：销售额${currentSales}元 >= 门槛${config.threshold}元`,
      reviewedBy: 0, // 0表示系统
      reviewedAt: new Date(),
      compensationPaid: !!oldParentId,
    },
  });

  console.log(`[自动晋升] 推销员${agentId}累计销售${currentSales}元，达到门槛${config.threshold}元，自动晋升为一级推销员`);

  return {
    upgraded: true,
    message: `恭喜！您的累计销售额已达到${config.threshold}元，已自动晋升为一级推销员！`,
  };
}

/**
 * 获取晋升状态概览（H5端使用）
 */
export async function getUpgradeStatusOverview(agentId: number): Promise<{
  currentType: string;
  currentTypeName: string;
  canApply: boolean;
  autoUpgrade: {
    enabled: boolean;
    threshold: number;
    currentSales: number;
    progress: number;
    eligible: boolean;
  };
  applyUpgrade: {
    eligible: boolean;
    reasons: string[];
    hasPendingApplication: boolean;
  };
  applications: Array<{
    id: number;
    status: number;
    statusName: string;
    applySales: number;
    createdAt: Date;
    reviewedAt: Date | null;
    reviewRemark: string | null;
  }>;
}> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new Error('推销员不存在');
  }

  const typeNames: Record<string, string> = {
    LEVEL1: '一级推销员',
    LEVEL2: '二级推销员',
    WHOLESALE: '普通用户',
  };

  // 不是二级推销员
  if (agent.type !== 'LEVEL2') {
    return {
      currentType: agent.type,
      currentTypeName: typeNames[agent.type] || agent.type,
      canApply: false,
      autoUpgrade: {
        enabled: false,
        threshold: 0,
        currentSales: Number(agent.totalSales),
        progress: 100,
        eligible: false,
      },
      applyUpgrade: {
        eligible: false,
        reasons: ['只有二级推销员可以申请晋升'],
        hasPendingApplication: false,
      },
      applications: [],
    };
  }

  // 获取自动晋升信息
  const autoEligibility = await checkAutoUpgradeEligibility(agentId);

  // 获取申请晋升信息
  const applyEligibility = await checkUpgradeEligibility(agentId);

  // 检查是否有待审核申请
  const pendingApp = await prisma.upgradeApplication.findFirst({
    where: { agentId, status: UpgradeStatus.PENDING },
  });

  // 获取申请历史
  const applications = await prisma.upgradeApplication.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const statusNames: Record<number, string> = {
    0: '待审核',
    1: '已通过',
    2: '已拒绝',
  };

  return {
    currentType: agent.type,
    currentTypeName: typeNames[agent.type],
    canApply: applyEligibility.eligible && !pendingApp,
    autoUpgrade: {
      enabled: autoEligibility.enabled,
      threshold: autoEligibility.threshold,
      currentSales: autoEligibility.currentSales,
      progress: autoEligibility.progress,
      eligible: autoEligibility.eligible,
    },
    applyUpgrade: {
      eligible: applyEligibility.eligible,
      reasons: applyEligibility.reasons,
      hasPendingApplication: !!pendingApp,
    },
    applications: applications.map(app => ({
      id: app.id,
      status: app.status,
      statusName: statusNames[app.status] || '未知',
      applySales: Number(app.applySales),
      createdAt: app.createdAt,
      reviewedAt: app.reviewedAt,
      reviewRemark: app.reviewRemark,
    })),
  };
}

export default {
  UpgradeStatus,
  AutoUpgradeConfigKeys,
  checkUpgradeEligibility,
  submitUpgradeApplication,
  getUpgradeApplications,
  reviewUpgradeApplication,
  getMyUpgradeApplications,
  // 【2026-01-17】自动晋升
  getAutoUpgradeConfig,
  setAutoUpgradeConfig,
  checkAutoUpgradeEligibility,
  processAutoUpgrade,
  getUpgradeStatusOverview,
};
