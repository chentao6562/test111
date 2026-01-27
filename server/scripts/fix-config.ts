/**
 * 修复赠品档位和奖励配置
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createGiftTiers() {
  console.log('创建赠品档位...');

  const tiers = [
    { id: 1, minAmount: 200, giftName: '18寸仙女棒1盒', giftItems: '18寸魔法仙女棒x1', giftCost: 2, description: '满200元赠品', isActive: true, sortOrder: 1 },
    { id: 2, minAmount: 400, giftName: '精彩四变色1盒', giftItems: '精彩四变色x1', giftCost: 5, description: '满400元赠品', isActive: true, sortOrder: 2 },
    { id: 3, minAmount: 600, giftName: '迷你加特林1个', giftItems: '迷你加特林x1', giftCost: 8, description: '满600元赠品', isActive: true, sortOrder: 3 },
    { id: 4, minAmount: 1000, giftName: '超级棒棒糖1个', giftItems: '超级棒棒糖x1', giftCost: 10, description: '满1000元赠品', isActive: true, sortOrder: 4 },
  ];

  for (const tier of tiers) {
    await prisma.giftTier.upsert({
      where: { id: tier.id },
      update: tier,
      create: tier,
    });
    console.log(`  - ${tier.giftName} (满${tier.minAmount}元)`);
  }
}

async function createRewardConfig() {
  console.log('\n创建奖励配置...');

  const rewardConfig = {
    enabled: true,
    instantRewards: {
      register: { enabled: true, amount: 5 },
      firstShare: { enabled: true, amount: 5 },
      firstReservation: { enabled: true, amount: 10 },
      firstComplete: { enabled: true, amount: 20 },
      recruit: { enabled: true, amount: 15 },
    },
    weeklyRewards: {
      sales3: { enabled: true, threshold: 3, amount: 30 },
      sales5: { enabled: true, threshold: 5, amount: 80 },
      sales10: { enabled: true, threshold: 10, amount: 200 },
      shareFull: { enabled: true, amount: 20 },
      recruit3: { enabled: true, threshold: 3, amount: 50 },
    },
    couponExpireDate: '2026-02-14',
  };

  await prisma.config.upsert({
    where: { key: 'REWARD_CONFIG' },
    update: { value: JSON.stringify(rewardConfig) },
    create: {
      key: 'REWARD_CONFIG',
      value: JSON.stringify(rewardConfig),
      remark: '代金券奖励配置'
    },
  });

  console.log('  - 即时奖励: 注册5元, 首发圈5元, 首预约10元, 首成交20元, 拉新15元');
  console.log('  - 周奖励: 3单30元, 5单80元, 10单200元, 发圈全勤20元, 拉新3人50元');
}

async function main() {
  console.log('='.repeat(60));
  console.log('修复配置数据');
  console.log('='.repeat(60));

  try {
    await createGiftTiers();
    await createRewardConfig();
    console.log('\n配置修复完成！');
  } catch (error) {
    console.error('配置修复失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
