/**
 * 代金券奖励配置初始化脚本
 * 【2026-01-23】
 *
 * 功能：服务启动时自动检查并初始化缺失的奖励配置
 * 确保所有开关配置在数据库中存在，避免因配置缺失导致功能失效
 */

import prisma from './prisma';

// 需要初始化的配置项列表
const REQUIRED_CONFIGS = [
  // 代金券系统总开关
  { key: 'coupon_system_enabled', defaultValue: 'false', description: '代金券系统总开关' },

  // 即时奖励开关
  { key: 'coupon_register_enabled', defaultValue: 'false', description: '注册奖励开关' },
  { key: 'coupon_first_reservation_enabled', defaultValue: 'false', description: '首预约奖励开关' },
  { key: 'coupon_first_complete_enabled', defaultValue: 'false', description: '首单成交奖励开关' },
  { key: 'coupon_recruit_enabled', defaultValue: 'false', description: '拉新奖励开关' },
  { key: 'coupon_first_share_enabled', defaultValue: 'false', description: '首发圈奖励开关' },
  { key: 'coupon_activate_enabled', defaultValue: 'false', description: '激活再奖开关' },

  // 周期奖励开关
  { key: 'coupon_week_sales_enabled', defaultValue: 'false', description: '周销售奖励开关' },
  { key: 'coupon_week_share_enabled', defaultValue: 'false', description: '周发圈全勤奖励开关' },
  { key: 'coupon_week_recruit_enabled', defaultValue: 'false', description: '周拉新奖励开关' },

  // 即时奖励金额（如果不存在则初始化默认值）
  { key: 'coupon_register_bonus', defaultValue: '5', description: '注册奖励金额' },
  { key: 'coupon_first_reservation_bonus', defaultValue: '10', description: '首预约奖励金额' },
  { key: 'coupon_first_complete_bonus', defaultValue: '20', description: '首单成交奖励金额' },
  { key: 'coupon_recruit_bonus', defaultValue: '15', description: '拉新奖励金额' },
  { key: 'coupon_first_share_bonus', defaultValue: '5', description: '首发圈奖励金额' },
  { key: 'coupon_activate_bonus', defaultValue: '5', description: '激活再奖金额' },

  // 周期奖励金额
  { key: 'coupon_week_sales_3', defaultValue: '30', description: '周销售3单奖励金额' },
  { key: 'coupon_week_sales_5', defaultValue: '80', description: '周销售5单奖励金额' },
  { key: 'coupon_week_sales_10', defaultValue: '200', description: '周销售10单奖励金额' },
  { key: 'coupon_week_share_full', defaultValue: '20', description: '周发圈全勤奖励金额' },
  { key: 'coupon_week_recruit_3', defaultValue: '50', description: '周拉新3人奖励金额' },

  // 其他配置
  { key: 'coupon_expire_date', defaultValue: '2026-02-14', description: '代金券统一过期日期' },
  { key: 'activation_threshold', defaultValue: '500', description: '激活销售额门槛' },
  { key: 'upgrade_sales_threshold', defaultValue: '5000', description: '晋升销售额门槛' },
  { key: 'upgrade_orders_threshold', defaultValue: '20', description: '晋升订单数门槛' },
  { key: 'auto_upgrade_threshold', defaultValue: '30000', description: '自动晋升门槛' },
];

/**
 * 初始化奖励配置
 * 检查并创建缺失的配置项
 */
export async function initRewardConfigs(): Promise<void> {
  console.log('[配置初始化] 开始检查奖励配置...');

  let createdCount = 0;
  let existingCount = 0;

  for (const config of REQUIRED_CONFIGS) {
    try {
      // 检查配置是否存在
      const existing = await prisma.rewardConfig.findUnique({
        where: { configKey: config.key },
      });

      if (!existing) {
        // 配置不存在，创建它
        await prisma.rewardConfig.create({
          data: {
            configKey: config.key,
            configValue: config.defaultValue,
            description: config.description,
          },
        });
        console.log(`[配置初始化] 创建配置: ${config.key} = ${config.defaultValue}`);
        createdCount++;
      } else {
        existingCount++;
      }
    } catch (error) {
      console.error(`[配置初始化] 处理配置 ${config.key} 失败:`, error);
    }
  }

  console.log(`[配置初始化] 完成！已存在: ${existingCount}, 新创建: ${createdCount}`);

  // 输出开关状态摘要
  await printConfigSummary();
}

/**
 * 打印配置状态摘要
 */
async function printConfigSummary(): Promise<void> {
  const switchConfigs = await prisma.rewardConfig.findMany({
    where: {
      configKey: { endsWith: '_enabled' },
    },
  });

  const enabledCount = switchConfigs.filter(c => c.configValue === 'true').length;
  const totalCount = switchConfigs.length;

  console.log(`[配置初始化] 开关状态: ${enabledCount}/${totalCount} 已启用`);

  if (enabledCount === 0) {
    console.log('[配置初始化] ⚠️ 警告: 所有代金券奖励开关都已关闭，请在管理后台激励配置页面开启需要的奖励');
  }
}

/**
 * 检查代金券系统总开关是否开启
 */
export async function isCouponSystemEnabled(): Promise<boolean> {
  const config = await prisma.rewardConfig.findUnique({
    where: { configKey: 'coupon_system_enabled' },
  });
  return config?.configValue === 'true';
}

export default {
  initRewardConfigs,
  isCouponSystemEnabled,
};
