/**
 * 门店端控制器模块
 * 【2026-01-17 代码重构】将storeController拆分为4个模块
 *
 * 模块划分:
 * - listController: 预约列表管理
 * - confirmController: 电话确认流程
 * - pickupController: 核销流程
 * - prepareController: 备货流程
 */

// 预约列表相关
export {
  getReservationStats,
  getPending,
  getReservations,
  getDetail,
  getUrgent,
  getExpiring,
  getPrintConfigAction,
} from './listController';

// 电话确认相关
export {
  recordCallAction,
  confirm,
  markFailed,
  getPendingStatsAction,
} from './confirmController';

// 核销相关
export {
  searchForPickup,
  queryByPhone,
  queryByNo,
  complete,
  getTodayStats,
  getTodayCompleted,
  verifyPickupCode,
  getPeriodStats,  // 【2026-01-19】按周期统计
  getCoupons,      // 【2026-01-21】获取预约代金券
} from './pickupController';

// 备货相关
export {
  getPendingPrepare,
  getPreparingListAction,
  startPrepareAction,
  updatePrepareItem,
  batchUpdatePrepareItems,
  completePrepareAction,
  getPrepareProgressAction,
  reportPrepareIssue,
} from './prepareController';

// 向后兼容：导出与原storeController相同的默认导出结构
import * as listController from './listController';
import * as confirmController from './confirmController';
import * as pickupController from './pickupController';
import * as prepareController from './prepareController';

export default {
  // 预约列表
  getReservationStats: listController.getReservationStats,
  getPending: listController.getPending,
  getReservations: listController.getReservations,
  getDetail: listController.getDetail,
  getUrgent: listController.getUrgent,
  getExpiring: listController.getExpiring,
  getPrintConfigAction: listController.getPrintConfigAction,
  // 电话确认
  recordCallAction: confirmController.recordCallAction,
  confirm: confirmController.confirm,
  markFailed: confirmController.markFailed,
  getPendingStatsAction: confirmController.getPendingStatsAction,
  // 核销
  searchForPickup: pickupController.searchForPickup,
  queryByPhone: pickupController.queryByPhone,
  queryByNo: pickupController.queryByNo,
  complete: pickupController.complete,
  getTodayStats: pickupController.getTodayStats,
  getTodayCompleted: pickupController.getTodayCompleted,
  verifyPickupCode: pickupController.verifyPickupCode,
  getPeriodStats: pickupController.getPeriodStats,  // 【2026-01-19】
  getCoupons: pickupController.getCoupons,          // 【2026-01-21】
  // 备货
  getPendingPrepare: prepareController.getPendingPrepare,
  getPreparingListAction: prepareController.getPreparingListAction,
  startPrepareAction: prepareController.startPrepareAction,
  updatePrepareItem: prepareController.updatePrepareItem,
  batchUpdatePrepareItems: prepareController.batchUpdatePrepareItems,
  completePrepareAction: prepareController.completePrepareAction,
  getPrepareProgressAction: prepareController.getPrepareProgressAction,
  reportPrepareIssue: prepareController.reportPrepareIssue,
};
