/**
 * 预约服务模块导出
 * 【2026-01-16 预约模式升级】
 */

// 类型导出
export * from './types';

// 核心预约服务
export {
  createReservation,
  getReservationDetail,
  getReservationByNo,
  getCustomerReservations,
  getReservationCounts,  // 【2026-01-17新增】
  cancelReservation,
  getPendingReservations,
  getStoreReservations,
} from './reservationService';

// 赠品服务
export {
  calculateGift,
  getAllGiftTiers,
  isEligibleForGift,
  markGiftDelivered,
  getGiftTiersForAdmin,
  createGiftTier,
  updateGiftTier,
  deleteGiftTier,
} from './giftService';

// 客户风控服务
export {
  getOrCreateCustomer,
  checkCustomerCanReserve,
  recordReservation,
  recordCompletion,
  recordNoShow,
  getCustomerList,
  blockCustomer,
  unblockCustomer,
  getRiskLevelLabel,
} from './customerService';

// 电话确认服务
export {
  recordCall,
  confirmReservation,
  markCallFailed,
  getPendingStats,
  getUrgentReservations,
  processOverdueReservations,
} from './confirmService';

// 门店核销服务
export {
  findReservationByPhone,
  findReservationByNo,
  completePickup,
  getTodayPickupStats,
  getTodayCompletedList,
  getPickupStatsByPeriod,  // 【2026-01-19】按周期统计
  getReservationCoupons,   // 【2026-01-21】获取预约对应推销员代金券
} from './pickupService';

// 过期处理服务
export {
  processExpiredReservations,
  getSoonExpiringReservations,
  getExpiryStats,
  manualExpire,
} from './expiryService';

// 门店备货服务
export {
  getPendingPrepareList,
  getPreparingList,
  startPrepare,
  updateItemPrepareStatus,
  batchUpdateItemPrepareStatus,
  completePrepare,
  getPrepareProgress,
  reportIssue,
  verifyByPickupCode,
} from './prepareService';
