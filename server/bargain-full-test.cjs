/**
 * 砍价算法完整测试脚本
 * 创建10条砍价记录，每条模拟40次帮砍，验证算法正确性
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 砍价状态枚举
const BargainStatus = {
  BARGAINING: 'BARGAINING',
  SUCCESS: 'SUCCESS',
  ORDERED: 'ORDERED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

// 复制算法核心逻辑（修复版：第一刀真正随机85-95%）
function calculateCutAmount(params) {
  const { remainingAmount, cutCount, minCutCount, maxCutCount, isNewUser, newUserBonus, totalAmount } = params;

  if (remainingAmount <= 0) return 0;

  const currentCut = cutCount + 1;
  const canFinish = currentCut >= minCutCount;

  // 计算必须预留的金额（保证能砍到minCutCount次）
  const remainingCutsToMin = Math.max(0, minCutCount - currentCut);
  const minReserve = remainingCutsToMin * 0.01;
  const maxAllowed = Math.max(0.01, remainingAmount - minReserve);

  let cutAmount = 0;

  if (cutCount === 0) {
    // 第一刀：真正的85-95%随机，不应用新用户加成！
    const ratio = 0.85 + Math.random() * 0.10;
    cutAmount = totalAmount * ratio;
    // 确保预留足够给后续砍
    cutAmount = Math.min(cutAmount, maxAllowed);
    // 注意：第一刀直接返回，不乘以newUserBonus
    return Math.max(0.01, Number(cutAmount.toFixed(2)));
  } else if (!canFinish) {
    // 未达到minCutCount前：每刀砍小额
    const baseAmount = Math.min(maxAllowed * 0.3, remainingAmount * 0.1);
    cutAmount = Math.max(0.01, baseAmount * (0.5 + Math.random()));
  } else {
    // 达到minCutCount后：可以砍完
    if (currentCut === minCutCount) {
      cutAmount = Math.random() < 0.8 ? remainingAmount : remainingAmount * (0.5 + Math.random() * 0.3);
    } else {
      const remainingCuts = maxCutCount - currentCut;
      if (remainingCuts <= 2 || Math.random() < 0.7) {
        cutAmount = remainingAmount;
      } else {
        cutAmount = remainingAmount * (0.3 + Math.random() * 0.5);
      }
    }
  }

  // 新用户加成（仅对第2刀及以后生效）
  if (isNewUser && newUserBonus > 1) {
    cutAmount = cutAmount * newUserBonus;
  }

  // 关键：确保不会提前砍完（除非已到minCutCount）
  if (!canFinish) {
    cutAmount = Math.min(cutAmount, maxAllowed);
  } else {
    cutAmount = Math.min(cutAmount, remainingAmount);
  }

  return Math.max(0.01, Number(cutAmount.toFixed(2)));
}

function generateCode() {
  return 'BGTEST' + String(Math.floor(Math.random() * 900 + 100));
}

async function runTest() {
  console.log('========== 砍价算法完整测试 ==========\n');

  // 获取当前配置
  const config = await prisma.bargainConfig.findFirst({
    where: { isActive: true },
    include: { items: { include: { product: true } } }
  });

  if (!config || config.items.length === 0) {
    console.log('错误: 没有找到启用的砍价配置');
    return;
  }

  const item = config.items[0];
  console.log('当前配置:');
  console.log('  商品:', item.product.name);
  console.log('  原价:', item.originalPrice.toString(), '元');
  console.log('  底价:', item.floorPrice.toString(), '元');
  console.log('  最小砍价次数:', config.minBargainCount);
  console.log('  最大砍价次数:', config.maxBargainCount);
  console.log('  新用户加成:', config.newUserBonus.toString(), 'x');
  console.log('');

  const results = [];
  const testCount = 10;

  for (let i = 1; i <= testCount; i++) {
    const code = generateCode() + String(i).padStart(2, '0');
    const originalPrice = Number(item.originalPrice);
    const floorPrice = Number(item.floorPrice);
    const totalAmount = originalPrice - floorPrice;

    console.log('\n[' + i + '/' + testCount + '] 创建砍价 ' + code);
    console.log('  需要砍掉: ' + totalAmount + '元');

    // 创建砍价记录
    const bargain = await prisma.bargain.create({
      data: {
        code,
        config: { connect: { id: config.id } },
        product: { connect: { id: item.productId } },
        store: { connect: { id: 1 } }, // 默认门店
        initiatorPhone: '1380013800' + String(i).padStart(2, '0'),
        originalPrice: item.originalPrice,
        floorPrice: item.floorPrice,
        currentPrice: item.originalPrice,
        cutCount: 0,
        status: BargainStatus.BARGAINING,
        quantity: 1,
        expireAt: new Date(Date.now() + config.bargainHours * 60 * 60 * 1000),
      }
    });

    let currentPrice = originalPrice;
    let cutCount = 0;
    let firstCutAmount = 0;

    // 模拟帮砍直到完成
    while (currentPrice > floorPrice && cutCount < config.maxBargainCount) {
      const remainingAmount = currentPrice - floorPrice;
      const isNewUser = cutCount === 0; // 第一刀假设新用户

      const cutAmount = calculateCutAmount({
        remainingAmount,
        cutCount,
        minCutCount: config.minBargainCount,
        maxCutCount: config.maxBargainCount,
        isNewUser,
        newUserBonus: Number(config.newUserBonus),
        totalAmount
      });

      if (cutCount === 0) {
        firstCutAmount = cutAmount;
        const firstCutRatio = (cutAmount / totalAmount * 100).toFixed(1);
        console.log('  第1刀: ' + cutAmount.toFixed(2) + '元 (' + firstCutRatio + '%)');
      }

      currentPrice = Math.max(floorPrice, currentPrice - cutAmount);
      cutCount++;

      // 创建帮砍记录
      await prisma.bargainCut.create({
        data: {
          bargain: { connect: { id: bargain.id } },
          helperPhone: '139' + String(i).padStart(4, '0') + String(cutCount).padStart(4, '0'),
          cutAmount: cutAmount,
          priceAfterCut: currentPrice, // 砍后价格
          isNewUser,
        }
      });

      // 如果达到底价，退出循环
      if (currentPrice <= floorPrice) {
        break;
      }
    }

    // 更新砍价状态
    const reachedFloor = currentPrice <= floorPrice;
    await prisma.bargain.update({
      where: { id: bargain.id },
      data: {
        currentPrice: currentPrice,
        cutCount,
        reachedFloor,
        status: reachedFloor ? BargainStatus.SUCCESS : BargainStatus.BARGAINING,
      }
    });

    const firstCutRatio = (firstCutAmount / totalAmount * 100).toFixed(1);
    console.log('  完成: cutCount=' + cutCount + ', currentPrice=' + currentPrice.toFixed(2) + ', status=' + (reachedFloor ? 'SUCCESS' : 'BARGAINING'));

    results.push({
      code,
      cutCount,
      currentPrice,
      firstCutAmount,
      firstCutRatio: Number(firstCutRatio),
      reachedFloor
    });
  }

  // 输出汇总
  console.log('\n========== 测试结果汇总 ==========\n');
  console.log('| 编号 | 砍价码 | 砍刀数 | 最终价格 | 第一刀% | 状态 |');
  console.log('|------|--------|--------|----------|---------|------|');

  results.forEach((r, idx) => {
    const status = r.reachedFloor ? 'SUCCESS' : 'FAIL';
    console.log('| ' + (idx + 1) + ' | ' + r.code + ' | ' + r.cutCount + ' | ' + r.currentPrice.toFixed(2) + ' | ' + r.firstCutRatio + '% | ' + status + ' |');
  });

  const avgFirstCut = results.reduce((sum, r) => sum + r.firstCutRatio, 0) / results.length;
  const allSuccess = results.every(r => r.reachedFloor);
  const minCut = Math.min(...results.map(r => r.cutCount));
  const maxCut = Math.max(...results.map(r => r.cutCount));
  const allAt40 = results.every(r => r.cutCount === config.minBargainCount);

  console.log('\n统计:');
  console.log('  第一刀平均比例:', avgFirstCut.toFixed(1) + '%');
  console.log('  全部成功:', allSuccess ? 'YES' : 'NO');
  console.log('  全部在' + config.minBargainCount + '刀完成:', allAt40 ? 'YES' : 'NO');
  console.log('  砍刀数范围:', minCut + '-' + maxCut);
}

runTest()
  .then(() => console.log('\n测试完成'))
  .catch(e => console.error('测试失败:', e))
  .finally(() => prisma.$disconnect());
