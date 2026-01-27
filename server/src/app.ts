import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import mime from 'mime-types';
import { config } from './config';

// 导入定时任务
// 【2026-01-17 Order系统清理】已移除 startOrderConfirmTask
import { startCommissionSettleTask } from './tasks/commissionSettleTask';

// 【P1-12修复】导入速率限制中间件
import { generalRateLimiter, adminRateLimiter } from './middlewares/rateLimit';

// 【Phase 1 Task 1.1】导入全局错误处理中间件
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

// 导入路由
import authRouter from './routes/auth';
import staffRouter from './routes/staff';
import adminRouter from './routes/admin';
import { getPublicConfig } from './controllers/settingController';
import categoryRouter from './routes/category';
import adminCategoryRouter from './routes/adminCategory';
import productRouter from './routes/product';
import adminProductRouter from './routes/adminProduct';
import uploadRouter from './routes/upload';
// 【2026-01-17 Order系统清理】已移除 orderRouter - 系统已升级为预约模式
import commissionRouter from './routes/commission';
import bannerRouter from './routes/banner';
import adminBannerRouter from './routes/adminBanner';
import cartRouter from './routes/cart';
import retailRouter from './routes/retail';
import h5MaterialRouter from './routes/h5Material';
import recommendRouter from './routes/recommend';
import adminRecommendRouter from './routes/adminRecommend';

// 【2026-01-16 推广体系升级】导入推广体系路由
import promotionRouter from './routes/promotion';
import masterRouter from './routes/master';

// 【2026-01-16 预约模式升级】导入预约和门店路由
import reservationRouter from './routes/reservation';
import storeRouter from './routes/store';

// 【2026-01-17 客户商城】导入客户商城路由（访客模式）
import shopRouter from './routes/shop';

// 【2026-01-18 春节营销】导入代金券路由
import campaign2026Router from './routes/campaign2026';

// 【2026-01-20 活动系统】导入发圈审核和周期奖励路由
import shareAuditRouter from './routes/shareAudit';
import weeklyRewardRouter from './routes/weeklyReward';

// 【2026-01-21 拼团到店】导入拼团路由
import groupBuyRouter, { storeGroupBuyRouter } from './routes/groupBuy';

// 【2026-01-21 限时锁价】导入锁价路由
import priceLockRouter from './routes/priceLock';

// 【2026-01-21 顺路拼团】导入区域路由
import regionRouter from './routes/region';

// 【2026-01-21 代金券管理】导入代金券统计和返券路由
import { adminRouter as couponManageAdminRouter, h5Router as couponManageH5Router } from './routes/couponManage';

// 【2026-01-22 审计追踪】导入审计追踪路由
import auditTraceRouter from './routes/auditTrace';

// 【2026-01-22 砍价活动】导入砍价路由
import bargainRouter from './routes/bargain';
import adminBargainRouter from './routes/adminBargain';

// 【2026-01-23 现金大转盘】导入转盘路由
import spinWheelRouter from './routes/spinWheel';
import adminSpinWheelRouter from './routes/adminSpinWheel';

// 【2026-01-25 套餐系统】导入套餐路由
import packageRouter from './routes/package';
import adminPackageRouter from './routes/adminPackage';

// 【2026-01-22 高并发优化】导入健康检查路由
import healthRouter from './routes/health';
import { incrementRequestCount, incrementErrorCount } from './controllers/healthController';

// 【2026-01-16 预约模式升级】导入预约过期检查定时任务
import { startReservationExpiryTask } from './tasks/reservationExpiryTask';
// 【2026-01-17 备货环节】导入备货提醒定时任务
import { startPrepareReminderTask } from './tasks/prepareReminderTask';
// 【2026-01-17 30分钟确认时限】导入超时预约自动分配定时任务
import { startOverdueReservationTask } from './tasks/overdueReservationTask';
// 【2026-01-17 团队奖励月度统计】导入月度团队奖励定时任务
import { startMonthlyTeamRewardTask } from './tasks/monthlyTeamRewardTask';
// 【2026-01-20 周期奖励】导入周奖励定时任务
import { startWeeklyRewardTask } from './tasks/weeklyRewardTask';
// 【2026-01-21 拼团到店】导入拼团过期检查定时任务
import { startGroupBuyExpiryTask } from './tasks/groupBuyExpiryTask';
// 【2026-01-21 限时锁价】导入锁价过期检查定时任务
import { startPriceLockExpiryTask } from './tasks/priceLockExpiryTask';
// 【2026-01-22 审计追踪】导入审计对账定时任务
import { startAuditReconciliationTasks } from './tasks/auditReconciliationTask';
// 【2026-01-22 砍价活动】导入砍价过期检查定时任务
import { startBargainExpiryTask } from './tasks/bargainExpiryTask';
// 【2026-01-23 大转盘】导入碎片过期检查定时任务
import { startSpinWheelExpiryTask } from './tasks/spinWheelExpiryTask';
// 【2026-01-23 代金券过期】导入代金券过期检查定时任务
import { startCouponExpiryTask } from './tasks/couponExpiryTask';

// 【2026-01-23 代金券配置修复】导入奖励配置初始化
import { initRewardConfigs } from './utils/initRewardConfig';

// 【2026-01-13 多仓库支持】导入仓库公开API
import { getWarehouseList, getDefaultWarehouse } from './controllers/warehouseController';

// 创建Express应用
const app: Express = express();

// 【2026-01-25 速率限制修复】信任代理，正确获取客户端真实IP
// 这样 nginx 传递的 X-Forwarded-For 头才会被 Express 正确解析
app.set('trust proxy', true);

// 基础中间件
app.use(helmet()); // 安全头
app.use(cors()); // 跨域
app.use(morgan('combined')); // 日志
app.use(express.json({ limit: '10mb' })); // JSON解析，限制请求体大小
app.use(express.urlencoded({ extended: true })); // URL编码解析

// 【P1-12修复】全局API速率限制（每分钟100次）
app.use('/api', generalRateLimiter);

// 【2026-01-22 高并发优化】请求计数中间件
app.use((req: Request, res: Response, next: NextFunction) => {
  incrementRequestCount();
  res.on('finish', () => {
    if (res.statusCode >= 500) {
      incrementErrorCount();
    }
  });
  next();
});

// 设置响应头，确保UTF-8编码
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// JSON解析错误处理
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      code: 400,
      message: '请求格式错误，请发送有效的JSON',
      data: null,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next(err);
});

// 静态文件服务 - 提供上传文件访问（图片和视频都设置缓存）
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res, filePath) => {
    // 根据文件扩展名设置正确的Content-Type
    const mimeType = mime.lookup(filePath);
    if (mimeType) {
      res.setHeader('Content-Type', mimeType);
    }
    const ext = path.extname(filePath).toLowerCase();
    // 视频和HLS分片：1年缓存（内容不变）
    if (['.mp4', '.webm', '.mov', '.avi', '.ts', '.m3u8'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // 图片：30天缓存
    else if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
  },
  etag: true,
  lastModified: true
}));

// 静态文件服务 - 提供public目录访问（包含烟花图片等资源）
app.use(express.static(path.join(process.cwd(), 'public')));

// 注册路由
app.use('/api/auth', authRouter);
app.use('/api/staff', staffRouter);
app.use('/api/admin', adminRateLimiter, adminRouter);  // 管理后台路由（含认证和代理商管理），使用更高的速率限制
app.use('/api/categories', categoryRouter);
app.use('/api/admin/categories', adminRateLimiter, adminCategoryRouter);
app.use('/api/products', productRouter);
app.use('/api/admin/products', adminRateLimiter, adminProductRouter);
app.use('/api/upload', uploadRouter);
// 【2026-01-17 Order系统清理】已移除 /api/orders 路由 - 系统已升级为预约模式
app.use('/api/commission', commissionRouter);  // 代理商端分润路由
app.use('/api/banners', bannerRouter);  // 小程序端Banner路由
app.use('/api/admin/banners', adminRateLimiter, adminBannerRouter);  // 管理后台Banner路由
app.use('/api/cart', cartRouter);  // 代理商端购物车（订货单）路由
app.use('/api/retail', retailRouter);  // 库管端门店零售路由
app.use('/api/h5', h5MaterialRouter);  // H5素材管理路由
app.use('/api/recommends', recommendRouter);  // 小程序端推荐商品路由
app.use('/api/admin/recommends', adminRateLimiter, adminRecommendRouter);  // 管理后台推荐商品路由

// 【2026-01-16 推广体系升级】推广体系路由
app.use('/api/promotion', promotionRouter);  // 推销员定价、利润、奖励、升级
app.use('/api/master', adminRateLimiter, masterRouter);  // 总代理管理（需要管理员权限）

// 【2026-01-16 预约模式升级】预约和门店路由
app.use('/api/reservations', reservationRouter);  // 客户端预约API
app.use('/api/store', storeRouter);  // 门店端预约管理、电话确认、核销

// 【2026-01-17 客户商城】访客模式API（无需登录）
app.use('/api/shop', shopRouter);  // 客户扫码浏览商品、提交预约

// 【2026-01-18 春节营销】代金券API
app.use('/api', campaign2026Router);  // 代金券查询、统计

// 【2026-01-20 活动系统】发圈审核和周期奖励API
app.use('/api', shareAuditRouter);  // 推销员发圈提交和审核
app.use('/api', weeklyRewardRouter);  // 周期奖励进度和统计

// 【2026-01-21 拼团到店】拼团API
app.use('/api/group-buy', groupBuyRouter);  // H5端拼团API
app.use('/api/store/group-buy', storeGroupBuyRouter);  // 门店端拼团API

// 【2026-01-21 限时锁价】锁价API
app.use('/api/price-lock', priceLockRouter);  // H5端锁价API

// 【2026-01-21 顺路拼团】区域数据API
app.use('/api/regions', regionRouter);  // 区域数据（无需登录）

// 【2026-01-21 代金券管理】代金券统计和返券API
app.use('/api/admin/coupon-stats', adminRateLimiter, couponManageAdminRouter);  // 管理后台代金券统计
app.use('/api/promotion/coupon', couponManageH5Router);  // H5端一级给二级发券

// 【2026-01-22 审计追踪】审计追踪API
app.use('/api/admin/audit', adminRateLimiter, auditTraceRouter);  // 管理后台审计追踪

// 【2026-01-22 砍价活动】砍价API
app.use('/api/bargain', bargainRouter);  // H5端砍价API（部分公开，部分需登录）
app.use('/api/admin/bargain', adminRateLimiter, adminBargainRouter);  // 管理后台砍价管理

// 【2026-01-23 现金大转盘】转盘API
app.use('/api/spin-wheel', spinWheelRouter);  // H5端转盘API（部分公开，部分需登录）
app.use('/api/admin/spin-wheel', adminRateLimiter, adminSpinWheelRouter);  // 管理后台转盘管理

// 【2026-01-25 套餐系统】套餐API
app.use('/api/packages', packageRouter);  // H5端套餐API（列表、详情、定价）
app.use('/api/admin/packages', adminRateLimiter, adminPackageRouter);  // 管理后台套餐管理

// 【2026-01-19 活动系统增强】代金券活动API（使用inline require避免被linter移除）
app.use('/api/admin/coupon-activities', adminRateLimiter, require('./routes/adminCouponActivity').default);
app.use('/api/h5/coupon-activities', require('./routes/h5CouponActivity').default);

// 【2026-01-19 活动系统增强】活动专题页API
app.use('/api/admin/activity-pages', adminRateLimiter, require('./routes/adminActivityPage').default);
app.use('/api/h5/activity-pages', require('./routes/h5ActivityPage').default);

// 【2026-01-20 秒杀系统】秒杀活动API（使用inline require避免被linter移除）
app.use('/api/h5/flash-sale', require('./routes/h5FlashSale').default);  // H5端秒杀（无需登录）
app.use('/api/admin/flash-sale', adminRateLimiter, require('./routes/adminFlashSale').default);  // 管理后台秒杀

// 【2026-01-23 活动中心横幅】活动汇总API（无需登录）
app.use('/api/h5/activity-summary', require('./routes/h5ActivitySummary').default);

// 【2026-01-20】公开统计API（无需登录）
app.get('/api/agents/public-stats', async (req: Request, res: Response) => {
  try {
    const prisma = require('./utils/prisma').default;
    // 获取推销员总数（排除总代理）
    const totalAgents = await prisma.agent.count({
      where: {
        isMaster: false,
        status: 'ACTIVE'
      }
    });
    // 获取累计收益（所有推销员的totalCommission之和）
    const earnings = await prisma.agent.aggregate({
      _sum: { totalCommission: true },
      where: { isMaster: false }
    });
    res.json({
      code: 0,
      message: 'success',
      data: {
        totalAgents: totalAgents + 150, // 添加基础数展示效果
        totalEarnings: Math.round(Number(earnings._sum.totalCommission || 0) + 50000) // 添加基础金额
      }
    });
  } catch (err) {
    res.json({
      code: 0,
      message: 'success',
      data: { totalAgents: 200, totalEarnings: 80000 }
    });
  }
});

// 【2026-01-22 高并发优化】健康检查路由（增强版）
app.use('/api/health', healthRouter);

// 公开配置（无需认证）- 用于登录页面获取Logo和公司名称
app.get('/api/config', getPublicConfig);

// 【2026-01-13 多仓库支持】公开仓库API（代理商下单时选择提货点）
app.get('/api/warehouses', getWarehouseList);
app.get('/api/warehouses/default', getDefaultWarehouse);

// API根路径
app.get('/api', (req: Request, res: Response) => {
  res.json({
    code: 0,
    message: 'success',
    data: {
      name: '蒙庆烟花代理商订货系统 API',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        staff: '/api/staff',
        admin: '/api/admin',
        adminAgents: '/api/admin/agents',
        reservations: '/api/reservations (客户端预约)',
        store: '/api/store (门店端预约管理)',
        commission: '/api/commission',
        adminCommission: '/api/admin/commission',
        categories: '/api/categories',
        adminCategories: '/api/admin/categories',
        products: '/api/products',
        adminProducts: '/api/admin/products',
        upload: '/api/upload',
        banners: '/api/banners',
        adminBanners: '/api/admin/banners',
        cart: '/api/cart',
        promotion: '/api/promotion (推销员定价/利润)',
      },
    },
  });
});

// 【Phase 1 Task 1.1】使用统一的错误处理中间件
app.use(notFoundHandler);  // 404处理
app.use(errorHandler);     // 全局错误处理

// 启动服务器
const PORT = config.port;
app.listen(PORT, async () => {
  console.log(`
  ====================================
  🎆 蒙庆烟花代理商订货系统 API
  ====================================
  环境: ${config.nodeEnv}
  端口: ${PORT}
  地址: http://localhost:${PORT}
  健康检查: http://localhost:${PORT}/api/health
  ====================================
  `);

  // 【2026-01-23 代金券配置修复】初始化奖励配置
  try {
    await initRewardConfigs();
  } catch (error) {
    console.error('[启动] 奖励配置初始化失败:', error);
  }

  // 启动定时任务
  // 【2026-01-17 Order系统清理】已移除 startOrderConfirmTask
  // 【Task 2.2】启动T+1分润结算定时任务
  startCommissionSettleTask();
  // 【2026-01-16 预约模式升级】启动预约过期检查定时任务
  startReservationExpiryTask();
  // 【2026-01-17 备货环节】启动备货提醒定时任务（每天9:00）
  startPrepareReminderTask();
  // 【2026-01-17 30分钟确认时限】启动超时预约自动分配定时任务（每5分钟）
  startOverdueReservationTask();
  // 【2026-01-17 团队奖励月度统计】启动月度团队奖励定时任务（每月1日凌晨1:00）
  startMonthlyTeamRewardTask();
  // 【2026-01-20 周期奖励】启动周奖励定时任务（每周一凌晨2:00）
  startWeeklyRewardTask();
  // 【2026-01-21 拼团到店】启动拼团过期检查定时任务（每小时）
  startGroupBuyExpiryTask();
  // 【2026-01-21 限时锁价】启动锁价过期检查定时任务（每小时）
  startPriceLockExpiryTask();
  // 【2026-01-22 审计追踪】启动审计对账定时任务
  startAuditReconciliationTasks();
  // 【2026-01-22 砍价活动】启动砍价过期检查定时任务（每小时）
  startBargainExpiryTask();
  // 【2026-01-23 大转盘】启动碎片过期检查定时任务（每天凌晨1点）
  startSpinWheelExpiryTask();
  // 【2026-01-23 代金券过期】启动代金券过期检查定时任务（每天凌晨1:10）
  startCouponExpiryTask();
});

export default app;
