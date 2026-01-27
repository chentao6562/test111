/**
 * 现金大转盘抽奖算法
 * 拼多多式黑箱算法 - 永远差一点点
 * @module services/spinWheel/spinAlgorithm
 * @since 2026-01-23
 */

import {
  SpinAlgorithmContext,
  SpinAlgorithmResult,
  PrizePoolItem,
} from './types';

/**
 * 生成指定范围内的随机数
 */
function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 根据权重随机选择奖品
 */
function weightedRandom(prizes: PrizePoolItem[]): number {
  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < prizes.length; i++) {
    random -= prizes[i].weight;
    if (random <= 0) {
      return i;
    }
  }

  return prizes.length - 1;
}

/**
 * 计算进度百分比
 */
function calculateProgress(totalAmount: number, threshold: number): number {
  return Math.min(100, (totalAmount / threshold) * 100);
}

/**
 * 拼多多式抽奖算法
 *
 * 核心逻辑：
 * 1. 第1次抽奖：必中大额（30-50%进度）
 * 2. 第2次抽奖：中额（15-25%进度）
 * 3. 第3-5次：小额（3-8%进度）
 * 4. 后续抽奖：微额（0.01-0.5元）
 * 5. 越接近100元：金额越小（永远差一点点）
 *
 * @param context 抽奖上下文
 * @returns 抽奖结果
 */
export function spinWheel(context: SpinAlgorithmContext): SpinAlgorithmResult {
  const { spinCount, totalAmount, redeemThreshold, prizePool } = context;
  const progress = calculateProgress(totalAmount, redeemThreshold);

  let prizeAmount: number;

  // 根据抽奖次数和进度决定金额
  if (spinCount === 0) {
    // 第1次抽奖：必中大额（30-50%进度）
    const targetProgress = randomInRange(30, 50);
    prizeAmount = (targetProgress / 100) * redeemThreshold;
    // 添加一点随机波动，使金额更自然
    prizeAmount = Math.round(prizeAmount * 100) / 100;
  } else if (spinCount === 1) {
    // 第2次抽奖：中额（15-25%进度）
    const targetProgress = randomInRange(15, 25);
    prizeAmount = (targetProgress / 100) * redeemThreshold;
    prizeAmount = Math.round(prizeAmount * 100) / 100;
  } else if (spinCount >= 2 && spinCount <= 4) {
    // 第3-5次：小额（3-8%进度）
    const targetProgress = randomInRange(3, 8);
    prizeAmount = (targetProgress / 100) * redeemThreshold;
    prizeAmount = Math.round(prizeAmount * 100) / 100;
  } else {
    // 后续抽奖：微额，且越接近门槛金额越小
    if (progress >= 99) {
      // 99%以上：0.01元
      prizeAmount = 0.01;
    } else if (progress >= 95) {
      // 95-99%：0.01-0.05元
      prizeAmount = randomInRange(0.01, 0.05);
    } else if (progress >= 90) {
      // 90-95%：0.01-0.1元
      prizeAmount = randomInRange(0.01, 0.1);
    } else if (progress >= 80) {
      // 80-90%：0.01-0.2元
      prizeAmount = randomInRange(0.01, 0.2);
    } else {
      // 80%以下：0.01-0.5元
      prizeAmount = randomInRange(0.01, 0.5);
    }
    prizeAmount = Math.round(prizeAmount * 100) / 100;
  }

  // 确保不会超过门槛（永远差一点点）
  const maxAllowed = redeemThreshold - totalAmount - 0.01;
  if (prizeAmount > maxAllowed && maxAllowed > 0) {
    // 如果会超过门槛，限制到差0.01-1元之间
    prizeAmount = Math.min(prizeAmount, maxAllowed - randomInRange(0, 1));
    prizeAmount = Math.max(0.01, Math.round(prizeAmount * 100) / 100);
  }

  // 确保最小金额为0.01
  prizeAmount = Math.max(0.01, prizeAmount);

  // 根据金额找到最接近的奖品名称
  const { prizeName, prizeIndex } = findMatchingPrize(prizeAmount, prizePool);

  return {
    prizeName,
    prizeAmount,
    prizeIndex,
  };
}

/**
 * 根据金额找到最接近的奖品
 */
function findMatchingPrize(amount: number, prizePool: PrizePoolItem[]): { prizeName: string; prizeIndex: number } {
  // 按金额排序
  const sortedPrizes = [...prizePool].sort((a, b) => a.amount - b.amount);

  // 找到最接近的奖品
  let closestIndex = 0;
  let closestDiff = Math.abs(sortedPrizes[0].amount - amount);

  for (let i = 1; i < sortedPrizes.length; i++) {
    const diff = Math.abs(sortedPrizes[i].amount - amount);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }

  const matchedPrize = sortedPrizes[closestIndex];

  // 找到原始数组中的索引（用于转盘动画）
  const originalIndex = prizePool.findIndex(p => p.name === matchedPrize.name);

  return {
    prizeName: matchedPrize.name,
    prizeIndex: originalIndex >= 0 ? originalIndex : 0,
  };
}

/**
 * 生成助力金额
 *
 * @param isNewUser 是否新用户
 * @param config 活动配置
 * @returns 助力金额
 */
export function generateHelpAmount(
  isNewUser: boolean,
  config: {
    newUserHelpMin: number;
    newUserHelpMax: number;
    oldUserHelpMin: number;
    oldUserHelpMax: number;
  }
): number {
  if (isNewUser) {
    // 新用户：3-5元
    return Math.round(randomInRange(config.newUserHelpMin, config.newUserHelpMax) * 100) / 100;
  } else {
    // 老用户：0.01-0.5元
    return Math.round(randomInRange(config.oldUserHelpMin, config.oldUserHelpMax) * 100) / 100;
  }
}

/**
 * 生成默认奖池配置（8格转盘）
 */
export function getDefaultPrizePool(): PrizePoolItem[] {
  return [
    { name: '0.01元', amount: 0.01, weight: 30, color: '#FF6B6B' },
    { name: '0.1元', amount: 0.1, weight: 25, color: '#FFD93D' },
    { name: '0.5元', amount: 0.5, weight: 20, color: '#6BCB77' },
    { name: '1元', amount: 1, weight: 10, color: '#4D96FF' },
    { name: '2元', amount: 2, weight: 5, color: '#FF6B6B' },
    { name: '5元', amount: 5, weight: 5, color: '#FFD93D' },
    { name: '10元', amount: 10, weight: 3, color: '#6BCB77' },
    { name: '50元', amount: 50, weight: 2, color: '#4D96FF' },
  ];
}

/**
 * 生成虚假的滚动播报数据
 * 用于营造活跃氛围
 */
export function generateFakeNotices(count: number = 10): Array<{
  phone: string;
  action: 'spin' | 'redeem';
  amount: number;
  timestamp: number;
}> {
  const notices: Array<{
    phone: string;
    action: 'spin' | 'redeem';
    amount: number;
    timestamp: number;
  }> = [];

  const now = Date.now();

  for (let i = 0; i < count; i++) {
    // 生成随机手机号（脱敏）
    const phone = `1${Math.floor(Math.random() * 9) + 3}${Math.floor(Math.random() * 10)}****${Math.floor(Math.random() * 10000).toString().padStart(4, '0').slice(0, 4)}`;

    // 90%是抽奖，10%是兑换
    const isRedeem = Math.random() < 0.1;

    if (isRedeem) {
      notices.push({
        phone,
        action: 'redeem',
        amount: 100,
        timestamp: now - i * 30000 - Math.floor(Math.random() * 10000),
      });
    } else {
      // 随机金额
      const amounts = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 30, 50];
      const weights = [20, 15, 15, 10, 10, 10, 5, 5, 3, 3, 2, 1, 1];

      let totalWeight = weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;
      let amountIndex = 0;

      for (let j = 0; j < weights.length; j++) {
        random -= weights[j];
        if (random <= 0) {
          amountIndex = j;
          break;
        }
      }

      notices.push({
        phone,
        action: 'spin',
        amount: amounts[amountIndex],
        timestamp: now - i * 30000 - Math.floor(Math.random() * 10000),
      });
    }
  }

  return notices;
}
