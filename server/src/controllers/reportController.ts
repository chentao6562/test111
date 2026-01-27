import { Request, Response } from 'express';
import {
  getSalesStatistics,
  getSalesTrend,
  getCategorySales,
  getSalesDetail,
  getStockStatistics,
  getFinanceStatistics as getFinanceReportStatistics,
  getDashboardData,
  getHotProducts,
  getRecentOrders,
  getCommissionStatistics,
  getCommissionTrend,
  getCommissionList,
  // 新增：预约报表
  getReservationStatistics,
  getReservationTrend,
  getReservationStatusDistribution,
  // 新增：销售报表（基于Reservation）
  getReservationSalesStatistics,
  getReservationSalesTrend,
  getProductSalesRanking,
  getAgentSalesRanking,
  // 新增：客户报表
  getCustomerStatistics,
  getCustomerTrend,
  getCustomerRiskDistribution,
} from '../services/reportService';
import { success, error } from '../utils/response';
import { sanitize } from '../utils/sanitize';

// 获取控制台首页数据
export async function getDashboard(req: Request, res: Response) {
  try {
    const data = await getDashboardData();
    return success(res, data);
  } catch (err: any) {
    console.error('获取控制台数据失败:', err);
    return error(res, err.message || '获取控制台数据失败');
  }
}

// 获取热销商品
export async function getHotProductsHandler(req: Request, res: Response) {
  try {
    const { limit = '5' } = req.query;
    const data = await getHotProducts(parseInt(limit as string, 10));
    return success(res, data);
  } catch (err: any) {
    console.error('获取热销商品失败:', err);
    return error(res, err.message || '获取热销商品失败');
  }
}

// 获取最新订单
export async function getRecentOrdersHandler(req: Request, res: Response) {
  try {
    const { limit = '5' } = req.query;
    const data = await getRecentOrders(parseInt(limit as string, 10));
    return success(res, data);
  } catch (err: any) {
    console.error('获取最新订单失败:', err);
    return error(res, err.message || '获取最新订单失败');
  }
}

// 获取销售报表统计
export async function getSalesStatisticsHandler(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const data = await getSalesStatistics(
      startDate as string,
      endDate as string
    );
    return success(res, data);
  } catch (err: any) {
    console.error('获取销售统计失败:', err);
    return error(res, err.message || '获取销售统计失败');
  }
}

// 获取销售趋势
export async function getSalesTrendHandler(req: Request, res: Response) {
  try {
    const { days = '30' } = req.query;
    const data = await getSalesTrend(parseInt(days as string, 10));
    return success(res, data);
  } catch (err: any) {
    console.error('获取销售趋势失败:', err);
    return error(res, err.message || '获取销售趋势失败');
  }
}

// 获取品类销售占比
export async function getCategorySalesHandler(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const data = await getCategorySales(
      startDate as string,
      endDate as string
    );
    return success(res, data);
  } catch (err: any) {
    console.error('获取品类销售失败:', err);
    return error(res, err.message || '获取品类销售失败');
  }
}

// 获取销售明细列表
export async function getSalesDetailHandler(req: Request, res: Response) {
  try {
    const {
      page = '1',
      pageSize = '10',
      keyword,
      categoryId,
      status,
      startDate,
      endDate
    } = req.query;

    const data = await getSalesDetail({
      page: parseInt(page as string, 10),
      pageSize: Math.min(parseInt(pageSize as string, 10), 100),
      keyword: keyword ? sanitize(keyword as string) : undefined,
      categoryId: categoryId ? parseInt(categoryId as string, 10) : undefined,
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string
    });

    return success(res, data);
  } catch (err: any) {
    console.error('获取销售明细失败:', err);
    return error(res, err.message || '获取销售明细失败');
  }
}

// 获取库存报表统计
export async function getStockStatisticsHandler(req: Request, res: Response) {
  try {
    const data = await getStockStatistics();
    return success(res, data);
  } catch (err: any) {
    console.error('获取库存统计失败:', err);
    return error(res, err.message || '获取库存统计失败');
  }
}

// 获取财务报表统计
export async function getFinanceReportHandler(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const data = await getFinanceReportStatistics(
      startDate as string,
      endDate as string
    );
    return success(res, data);
  } catch (err: any) {
    console.error('获取财务报表失败:', err);
    return error(res, err.message || '获取财务报表失败');
  }
}

// ============ 分润报表（基于Reservation表）============

// 获取分润统计
export async function getCommissionStatsHandler(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const data = await getCommissionStatistics(
      startDate as string,
      endDate as string
    );
    return success(res, data);
  } catch (err: any) {
    console.error('获取分润统计失败:', err);
    return error(res, err.message || '获取分润统计失败');
  }
}

// 获取分润趋势
export async function getCommissionTrendHandler(req: Request, res: Response) {
  try {
    const { days = '30' } = req.query;
    const data = await getCommissionTrend(parseInt(days as string, 10));
    return success(res, data);
  } catch (err: any) {
    console.error('获取分润趋势失败:', err);
    return error(res, err.message || '获取分润趋势失败');
  }
}

// 获取分润明细列表
export async function getCommissionListHandler(req: Request, res: Response) {
  try {
    const {
      page = '1',
      pageSize = '10',
      startDate,
      endDate
    } = req.query;

    const data = await getCommissionList({
      page: parseInt(page as string, 10),
      pageSize: Math.min(parseInt(pageSize as string, 10), 100),
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return success(res, data);
  } catch (err: any) {
    console.error('获取分润明细失败:', err);
    return error(res, err.message || '获取分润明细失败');
  }
}

// ============ 预约报表 ============

// 获取预约统计
export async function getReservationStatsHandler(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const data = await getReservationStatistics(
      startDate as string,
      endDate as string
    );
    return success(res, data);
  } catch (err: any) {
    console.error('获取预约统计失败:', err);
    return error(res, err.message || '获取预约统计失败');
  }
}

// 获取预约趋势
export async function getReservationTrendHandler(req: Request, res: Response) {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10);
    const data = await getReservationTrend(isNaN(daysNum) ? 30 : daysNum);
    return success(res, data);
  } catch (err: any) {
    console.error('获取预约趋势失败:', err);
    return error(res, err.message || '获取预约趋势失败');
  }
}

// 获取预约状态分布
export async function getReservationStatusHandler(req: Request, res: Response) {
  try {
    const data = await getReservationStatusDistribution();
    return success(res, data);
  } catch (err: any) {
    console.error('获取预约状态分布失败:', err);
    return error(res, err.message || '获取预约状态分布失败');
  }
}

// ============ 销售报表（基于Reservation）============

// 获取销售统计
export async function getReservationSalesStatsHandler(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const data = await getReservationSalesStatistics(
      startDate as string,
      endDate as string
    );
    return success(res, data);
  } catch (err: any) {
    console.error('获取销售统计失败:', err);
    return error(res, err.message || '获取销售统计失败');
  }
}

// 获取销售趋势（基于Reservation）
export async function getReservationSalesTrendHandler(req: Request, res: Response) {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10);
    const data = await getReservationSalesTrend(isNaN(daysNum) ? 30 : daysNum);
    return success(res, data);
  } catch (err: any) {
    console.error('获取销售趋势失败:', err);
    return error(res, err.message || '获取销售趋势失败');
  }
}

// 获取商品销售排行
export async function getProductRankingHandler(req: Request, res: Response) {
  try {
    const { limit = '10', startDate, endDate } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const data = await getProductSalesRanking(
      isNaN(limitNum) ? 10 : limitNum,
      startDate as string,
      endDate as string
    );
    return success(res, data);
  } catch (err: any) {
    console.error('获取商品排行失败:', err);
    return error(res, err.message || '获取商品排行失败');
  }
}

// 获取推销员业绩排行
export async function getAgentRankingHandler(req: Request, res: Response) {
  try {
    const { limit = '10', startDate, endDate } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const data = await getAgentSalesRanking(
      isNaN(limitNum) ? 10 : limitNum,
      startDate as string,
      endDate as string
    );
    return success(res, data);
  } catch (err: any) {
    console.error('获取推销员排行失败:', err);
    return error(res, err.message || '获取推销员排行失败');
  }
}

// ============ 客户报表 ============

// 获取客户统计
export async function getCustomerStatsHandler(req: Request, res: Response) {
  try {
    const data = await getCustomerStatistics();
    return success(res, data);
  } catch (err: any) {
    console.error('获取客户统计失败:', err);
    return error(res, err.message || '获取客户统计失败');
  }
}

// 获取客户增长趋势
export async function getCustomerTrendHandler(req: Request, res: Response) {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10);
    const data = await getCustomerTrend(isNaN(daysNum) ? 30 : daysNum);
    return success(res, data);
  } catch (err: any) {
    console.error('获取客户趋势失败:', err);
    return error(res, err.message || '获取客户趋势失败');
  }
}

// 获取客户风险等级分布
export async function getRiskDistributionHandler(req: Request, res: Response) {
  try {
    const data = await getCustomerRiskDistribution();
    return success(res, data);
  } catch (err: any) {
    console.error('获取风险分布失败:', err);
    return error(res, err.message || '获取风险分布失败');
  }
}
