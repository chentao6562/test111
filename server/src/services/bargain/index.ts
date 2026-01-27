/**
 * 砍价活动系统服务导出
 * @module services/bargain
 * @since 2026-01-22
 */

// 类型导出
export * from './types';

// 核心服务
export {
  isBargainEnabled,
  getActiveBargainConfig,
  getBargainProducts,
  createBargain,
  getBargainByCode,
  getMyBargains,
  cancelBargain,
  checkAndExpireBargains,
  addBargainToCart,
  removeBargainFromCart,
} from './bargainService';

// 帮砍服务
export {
  calculateCutAmount,
  isNewHelper,
  helpCut,
  sendHelpCutCode,
} from './bargainCutService';

// 风控服务
export {
  isBlacklisted,
  checkBargainRisk,
  addToBlacklist,
  removeFromBlacklist,
  getBlacklist,
  cleanExpiredBlacklist,
} from './bargainRiskService';

// 下单服务
export {
  calculateBargainProfit,
  createBargainOrder,
  getBargainReservation,
} from './bargainOrderService';

// 【2026-01-23】门槛检查服务
export {
  checkCartThreshold,
  getThresholdAmount,
} from './bargainThresholdService';

// 【2026-01-25】防反复砍价服务
export {
  checkBargainEligibility,
  updateBargainStats,
  getBargainLimits,
  getCategoryCodeByBargainId,
} from './bargainAntiAbuseService';
