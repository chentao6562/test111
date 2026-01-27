import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { jwtDecode } from 'jwt-decode'

// JWT payload 类型
interface TokenPayload {
  id: number
  type: string
  role: string
  exp: number
  iat: number
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/login/index.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/pages/dashboard/index.vue'),
        meta: { title: '控制台' },
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/pages/categories/index.vue'),
        meta: { title: '分类管理' },
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/pages/products/index.vue'),
        meta: { title: '商品管理' },
      },
      // 【2026-01-25】套餐管理
      {
        path: 'packages',
        name: 'Packages',
        component: () => import('@/pages/packages/index.vue'),
        meta: { title: '套餐管理' },
      },
      {
        path: 'agents',
        name: 'Agents',
        component: () => import('@/pages/agents/index.vue'),
        meta: { title: '代理商管理' },
      },
      // 【2026-01-17】推销员定价管理
      {
        path: 'agent-prices',
        name: 'AgentPrices',
        component: () => import('@/pages/agent-prices/index.vue'),
        meta: { title: '推销员定价' },
      },
      // 【2026-01-17】晋升申请管理
      {
        path: 'upgrade-applications',
        name: 'UpgradeApplications',
        component: () => import('@/pages/upgrade-applications/index.vue'),
        meta: { title: '晋升申请' },
      },
      // 【2026-01-17】订单路由已废弃，重定向到预约管理
      {
        path: 'orders',
        redirect: '/reservations',
      },
      // 【2026-01-16 预约模式升级】预约管理
      {
        path: 'reservations',
        name: 'Reservations',
        component: () => import('@/pages/reservations/index.vue'),
        meta: { title: '预约管理' },
      },
      // 【2026-01-16 预约模式升级】客户风控
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('@/pages/customers/index.vue'),
        meta: { title: '客户风控' },
      },
      {
        path: 'commission',
        name: 'Commission',
        component: () => import('@/pages/commission/index.vue'),
        meta: { title: '分润配置' },
      },
      {
        path: 'stock',
        name: 'Stock',
        component: () => import('@/pages/stock/index.vue'),
        meta: { title: '库存管理' },
      },
      {
        path: 'finance',
        name: 'Finance',
        component: () => import('@/pages/finance/index.vue'),
        meta: { title: '财务管理' },
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/pages/reports/index.vue'),
        meta: { title: '报表中心' },
      },
      // 【2026-01-16 预约模式升级】预约统计报表
      {
        path: 'reports/reservations',
        name: 'ReservationReport',
        component: () => import('@/pages/reports/reservations.vue'),
        meta: { title: '预约统计报表' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/pages/settings/index.vue'),
        meta: { title: '系统设置' },
      },
      {
        path: 'service',
        name: 'Service',
        component: () => import('@/pages/service/index.vue'),
        meta: { title: '客服管理' },
      },
      {
        path: 'docs',
        name: 'Docs',
        component: () => import('@/pages/docs/index.vue'),
        meta: { title: '业务流程说明' },
      },
      {
        path: 'staff',
        name: 'Staff',
        component: () => import('@/pages/staff/index.vue'),
        meta: { title: '员工管理' },
      },
      {
        path: 'audit-logs',
        name: 'AuditLogs',
        component: () => import('@/pages/audit-logs/index.vue'),
        meta: { title: '操作日志' },
      },
      // H5页面内容管理
      {
        path: 'h5-banners',
        name: 'H5Banners',
        component: () => import('@/pages/h5-banners/index.vue'),
        meta: { title: 'H5轮播图' },
      },
      {
        path: 'h5-recommend',
        name: 'H5Recommend',
        component: () => import('@/pages/h5-recommend/index.vue'),
        meta: { title: 'H5推荐商品' },
      },
      {
        path: 'h5-notices',
        name: 'H5Notices',
        component: () => import('@/pages/h5-notices/index.vue'),
        meta: { title: 'H5公告通知' },
      },
      // 【2026-01-17】推广资料管理
      {
        path: 'promotion-copies',
        name: 'PromotionCopies',
        component: () => import('@/pages/promotion-copies/index.vue'),
        meta: { title: '推广文案' },
      },
      {
        path: 'brand-assets',
        name: 'BrandAssets',
        component: () => import('@/pages/brand-assets/index.vue'),
        meta: { title: '品牌素材' },
      },
      // 【2026-01-19】营销活动管理
      {
        path: 'flash-sale',
        name: 'FlashSale',
        component: () => import('@/pages/flash-sale/index.vue'),
        meta: { title: '限时秒杀' },
      },
      {
        path: 'gift-tiers',
        name: 'GiftTiers',
        component: () => import('@/pages/gift-tiers/index.vue'),
        meta: { title: '满赠活动' },
      },
      {
        path: 'coupon-activities',
        name: 'CouponActivities',
        component: () => import('@/pages/coupon-activities/index.vue'),
        meta: { title: '代金券活动' },
      },
      // 【2026-01-21】代金券统计
      {
        path: 'coupon-stats',
        name: 'CouponStats',
        component: () => import('@/pages/coupon-stats/index.vue'),
        meta: { title: '代金券统计' },
      },
      {
        path: 'activity-pages',
        name: 'ActivityPages',
        component: () => import('@/pages/activity-pages/index.vue'),
        meta: { title: '活动专题页' },
      },
      // 【2026-01-21】拼团管理
      {
        path: 'group-buy-config',
        name: 'GroupBuyConfig',
        component: () => import('@/pages/group-buy-config/index.vue'),
        meta: { title: '拼团配置' },
      },
      {
        path: 'group-buy-list',
        name: 'GroupBuyList',
        component: () => import('@/pages/group-buy-list/index.vue'),
        meta: { title: '拼团列表' },
      },
      // 【2026-01-21】锁价管理
      {
        path: 'price-lock-config',
        name: 'PriceLockConfig',
        component: () => import('@/pages/price-lock-config/index.vue'),
        meta: { title: '锁价配置' },
      },
      // 【2026-01-22】砍价活动管理
      {
        path: 'bargain-config',
        name: 'BargainConfig',
        component: () => import('@/pages/bargain-config/index.vue'),
        meta: { title: '砍价配置' },
      },
      {
        path: 'bargain-list',
        name: 'BargainList',
        component: () => import('@/pages/bargain-list/index.vue'),
        meta: { title: '砍价数据' },
      },
      // 【2026-01-23】大转盘活动管理
      {
        path: 'spin-wheel-config',
        name: 'SpinWheelConfig',
        component: () => import('@/pages/spin-wheel-config/index.vue'),
        meta: { title: '大转盘配置' },
      },
      {
        path: 'spin-wheel-redeem',
        name: 'SpinWheelRedeem',
        component: () => import('@/pages/spin-wheel-redeem/index.vue'),
        meta: { title: '兑换管理' },
      },
      {
        path: 'spin-wheel-blacklist',
        name: 'SpinWheelBlacklist',
        component: () => import('@/pages/spin-wheel-blacklist/index.vue'),
        meta: { title: '风控黑名单' },
      },
      {
        path: 'spin-wheel-stats',
        name: 'SpinWheelStats',
        component: () => import('@/pages/spin-wheel-stats/index.vue'),
        meta: { title: '转盘数据分析' },
      },
      // 【2026-01-20】推销员激励管理
      {
        path: 'share-audit',
        name: 'ShareAudit',
        component: () => import('@/pages/share-audit/index.vue'),
        meta: { title: '发圈审核' },
      },
      {
        path: 'weekly-rewards',
        name: 'WeeklyRewards',
        component: () => import('@/pages/weekly-rewards/index.vue'),
        meta: { title: '周期奖励' },
      },
      {
        path: 'incentive-config',
        name: 'IncentiveConfig',
        component: () => import('@/pages/incentive-config/index.vue'),
        meta: { title: '激励配置' },
      },
      // 【2026-01-17】移库管理路由已废弃，重定向到首页
      {
        path: 'transfer',
        redirect: '/dashboard',
      },
      // 【2026-01-13】仓库管理（多仓库支持）
      {
        path: 'warehouse',
        name: 'Warehouse',
        component: () => import('@/pages/warehouse/index.vue'),
        meta: { title: '仓库管理' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

/**
 * 检查是否已登录（直接检查 localStorage，避免 store 初始化问题）
 * 【2026-01-22修复】增加Token过期验证
 */
function isAuthenticated(): boolean {
  const token = localStorage.getItem('admin_token')
  if (!token) return false

  try {
    const decoded = jwtDecode<TokenPayload>(token)
    // 检查是否过期（提前5分钟判定为过期，避免边界问题）
    const bufferTime = 5 * 60 * 1000 // 5分钟
    if (decoded.exp * 1000 < Date.now() + bufferTime) {
      // Token已过期或即将过期，清理登录状态
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      return false
    }
    return true
  } catch {
    // Token解析失败，清理登录状态
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    return false
  }
}

// 【2026-01-23】客服角色可访问的路由白名单
const SERVICE_ALLOWED_ROUTES = [
  '/dashboard',
  '/docs',
  '/reservations',
  '/customers',
  '/service'
]

/**
 * 检查客服角色是否有权限访问指定路由
 */
function isServiceAllowed(path: string): boolean {
  return SERVICE_ALLOWED_ROUTES.some(route =>
    path === route || path.startsWith(route + '/')
  )
}

// 路由守卫
router.beforeEach((to, _from, next) => {
  // 设置页面标题
  document.title = to.meta.title
    ? `${to.meta.title} - 蒙庆烟花管理后台`
    : '蒙庆烟花管理后台'

  // 公开页面直接放行
  if (to.meta.public) {
    // 如果已登录且访问登录页，跳转到首页
    if (to.name === 'Login' && isAuthenticated()) {
      next({ path: '/dashboard' })
      return
    }
    next()
    return
  }

  // 检查登录状态（直接检查 localStorage）
  if (!isAuthenticated()) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  // 【2026-01-23】客服角色路由权限检查
  const userStr = localStorage.getItem('admin_user')
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      if (user.role === 'SERVICE') {
        // 客服角色只能访问白名单中的路由
        if (!isServiceAllowed(to.path)) {
          console.warn(`[Router] 客服角色无权访问: ${to.path}`)
          next({ path: '/dashboard' })
          return
        }
      }
    } catch (e) {
      console.error('[Router] 解析用户信息失败:', e)
    }
  }

  next()
})

export default router
