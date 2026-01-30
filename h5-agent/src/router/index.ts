import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '../stores/user'
import { get, post } from '../api'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: '首页', requiresAuth: true, allowGuest: true } // 允许访客模式
  },
  {
    path: '/category',
    name: 'Category',
    component: () => import('../views/Category.vue'),
    meta: { title: '分类', requiresAuth: true, allowGuest: true } // 允许访客模式
  },
  {
    path: '/product/:id',
    name: 'ProductDetail',
    component: () => import('../views/ProductDetail.vue'),
    meta: { title: '商品详情', requiresAuth: true, allowGuest: true } // 允许访客模式
  },
  {
    path: '/cart',
    name: 'Cart',
    component: () => import('../views/Cart.vue'),
    meta: { title: '采购单', requiresAuth: true, allowGuest: true } // 允许访客模式
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: () => import('../views/Checkout.vue'),
    meta: { title: '预约确认', requiresAuth: true, allowGuest: true } // 允许访客模式
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('../views/Orders.vue'),
    meta: { title: '我的预约', requiresAuth: true }
  },
  {
    path: '/orders/:id',
    name: 'OrderDetail',
    component: () => import('../views/OrderDetail.vue'),
    meta: { title: '预约详情', requiresAuth: true }
  },
  // 【2026-01-16 预约模式升级】预约相关路由
  {
    path: '/reservations',
    name: 'Reservations',
    component: () => import('../views/Reservations.vue'),
    meta: { title: '我的预约', requiresAuth: true }
  },
  {
    path: '/reservations/:id',
    name: 'ReservationDetail',
    component: () => import('../views/ReservationDetail.vue'),
    meta: { title: '预约详情', requiresAuth: true }
  },
  {
    path: '/my',
    name: 'My',
    component: () => import('../views/My.vue'),
    meta: { title: '个人中心', requiresAuth: true }
  },
  {
    path: '/commission',
    name: 'Commission',
    component: () => import('../views/Commission.vue'),
    meta: { title: '分润中心', requiresAuth: true }
  },
  {
    // 【2026-01-29】分润详情页
    path: '/commission/:id',
    name: 'CommissionDetail',
    component: () => import('../views/CommissionDetail.vue'),
    meta: { title: '分润详情', requiresAuth: true }
  },
  {
    path: '/team',
    name: 'Team',
    component: () => import('../views/Team.vue'),
    meta: { title: '我的团队', requiresAuth: true }
  },
  // 【2026-01-21】团队返券（一级给二级发券）
  {
    path: '/team-grant',
    name: 'TeamGrant',
    component: () => import('../views/TeamGrant.vue'),
    meta: { title: '团队返券', requiresAuth: true }
  },
  // 【2026-01-30】下级订单（一级查看二级的订单）
  {
    path: '/team-orders',
    name: 'TeamOrders',
    component: () => import('../views/TeamOrders.vue'),
    meta: { title: '下级订单', requiresAuth: true }
  },
  {
    path: '/promotion',
    name: 'Promotion',
    component: () => import('../views/Promotion.vue'),
    meta: { title: '推广中心', requiresAuth: true }
  },
  // 【2026-01-17 新增】邀请记录页面
  {
    path: '/invite-records',
    name: 'InviteRecords',
    component: () => import('../views/InviteRecords.vue'),
    meta: { title: '邀请记录', requiresAuth: true }
  },
  // 【2026-01-17 新增】定价管理页面
  {
    path: '/pricing',
    name: 'Pricing',
    component: () => import('../views/Pricing.vue'),
    meta: { title: '定价管理', requiresAuth: true }
  },
  // 【2026-01-17 新增】推广资料页面
  {
    path: '/promotion-material',
    name: 'PromotionMaterial',
    component: () => import('../views/PromotionMaterial.vue'),
    meta: { title: '推广资料', requiresAuth: true }
  },
  // 【2026-01-18 新增】限时秒杀页面
  {
    path: '/flash-sale',
    name: 'FlashSale',
    component: () => import('../views/FlashSale.vue'),
    meta: { title: '限时秒杀', requiresAuth: true, allowGuest: true }
  },
  // 【2026-01-18 新增】满赠活动页面
  {
    path: '/gift-activity',
    name: 'GiftActivity',
    component: () => import('../views/GiftActivity.vue'),
    meta: { title: '满赠活动', requiresAuth: true, allowGuest: true }
  },
  // 【2026-01-18 春节营销】代金券页面
  {
    path: '/coupons',
    name: 'Coupons',
    component: () => import('../views/MyCoupons.vue'),
    meta: { title: '我的代金券', requiresAuth: true }
  },
  // 【2026-01-19 活动系统增强】领券中心
  {
    path: '/coupon-center',
    name: 'CouponCenter',
    component: () => import('../views/CouponCenter.vue'),
    meta: { title: '领券中心', requiresAuth: true }
  },
  // 【2026-01-19 活动系统增强】活动专题页
  {
    path: '/activity/:slug',
    name: 'ActivityPage',
    component: () => import('../views/ActivityPage.vue'),
    meta: { title: '活动专题', requiresAuth: false, allowGuest: true }
  },
  // 【2026-01-20 活动系统】发圈相关页面
  {
    path: '/share-upload',
    name: 'ShareUpload',
    component: () => import('../views/ShareUpload.vue'),
    meta: { title: '发圈打卡', requiresAuth: true }
  },
  {
    path: '/my-shares',
    name: 'MyShares',
    component: () => import('../views/MyShares.vue'),
    meta: { title: '我的发圈', requiresAuth: true }
  },
  // 【2026-01-20 活动系统】活动中心页面
  {
    path: '/activity-center',
    name: 'ActivityCenter',
    component: () => import('../views/ActivityCenter.vue'),
    meta: { title: '活动中心', requiresAuth: true }
  },
  // 【2026-01-20 新增】客户预约页面（推销员查看客户订单）
  {
    path: '/customer-orders',
    name: 'CustomerOrders',
    component: () => import('../views/CustomerOrders.vue'),
    meta: { title: '客户预约', requiresAuth: true }
  },
  // 【2026-01-20 新增】推销员盈利展示页面
  {
    path: '/agent-recruit',
    name: 'AgentRecruit',
    component: () => import('../views/AgentRecruit.vue'),
    meta: { title: '推销员盈利', requiresAuth: false, allowGuest: true }
  },
  // 【2026-01-21 拼团到店】拼团相关页面
  {
    path: '/group-buy/:code',
    name: 'GroupBuyDetail',
    component: () => import('../views/GroupBuyDetail.vue'),
    meta: { title: '拼团详情', requiresAuth: false, allowGuest: true }
  },
  {
    path: '/my-group-buys',
    name: 'MyGroupBuys',
    component: () => import('../views/MyGroupBuys.vue'),
    meta: { title: '我的拼团', requiresAuth: true }
  },
  // 【2026-01-21 限时锁价】锁价相关页面
  {
    path: '/my-price-locks',
    name: 'MyPriceLocks',
    component: () => import('../views/MyPriceLocks.vue'),
    meta: { title: '我的锁价', requiresAuth: true }
  },
  // 【2026-01-24】过年烟花免费拿活动介绍页
  {
    path: '/free-fireworks',
    name: 'FreeFireworks',
    component: () => import('../views/FreeFireworks.vue'),
    meta: { title: '过年烟花免费拿', requiresAuth: false, allowGuest: true }
  },
  // 【2026-01-22 砍价活动】砍价相关页面
  {
    path: '/bargain-products',
    name: 'BargainProducts',
    component: () => import('../views/BargainProducts.vue'),
    meta: { title: '砍价活动', requiresAuth: true }
  },
  {
    path: '/bargain/:code',
    name: 'BargainDetail',
    component: () => import('../views/BargainDetail.vue'),
    meta: { title: '砍价详情', requiresAuth: false, allowGuest: true }
  },
  {
    path: '/bargain/:code/help',
    name: 'BargainHelp',
    component: () => import('../views/BargainHelp.vue'),
    meta: { title: '帮好友砍价', requiresAuth: false, allowGuest: true }
  },
  {
    path: '/my-bargains',
    name: 'MyBargains',
    component: () => import('../views/MyBargains.vue'),
    meta: { title: '我的砍价', requiresAuth: true }
  },
  // 【2026-01-23 现金大转盘】转盘相关页面
  {
    path: '/spin-wheel',
    name: 'SpinWheel',
    component: () => import('../views/SpinWheel.vue'),
    meta: { title: '现金大转盘', requiresAuth: true }
  },
  {
    path: '/spin-wheel/help/:code',
    name: 'SpinWheelHelp',
    component: () => import('../views/SpinWheelHelp.vue'),
    meta: { title: '帮好友助力', requiresAuth: false, allowGuest: true }
  },
  // 【2026-01-25 套餐功能】套餐相关页面
  {
    path: '/packages',
    name: 'PackageList',
    component: () => import('../views/packages/PackageList.vue'),
    meta: { title: '套餐专区', requiresAuth: true, allowGuest: true }
  },
  {
    path: '/packages/:id',
    name: 'PackageDetail',
    component: () => import('../views/packages/PackageDetail.vue'),
    meta: { title: '套餐详情', requiresAuth: true, allowGuest: true }
  },
  {
    path: '/packages/:id/price',
    name: 'PackagePrice',
    component: () => import('../views/packages/PackagePrice.vue'),
    meta: { title: '套餐定价', requiresAuth: true }
  },
  // 【2026-01-26】套餐预约结算页面
  {
    path: '/packages/:id/checkout',
    name: 'PackageCheckout',
    component: () => import('../views/packages/PackageCheckout.vue'),
    meta: { title: '套餐预约', requiresAuth: true, allowGuest: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫
router.beforeEach(async (to, _from, next) => {
  // 设置页面标题
  document.title = (to.meta.title as string) || '蒙庆烟花'

  const userStore = useUserStore()

  // 如果带有 force=1 参数访问登录页，强制清除登录状态
  if (to.path === '/login' && to.query.force === '1') {
    userStore.clearLogin()
    next()
    return
  }

  // 【2026-01-17 访客模式】处理推销员专属链接参数 ?s=推销员ID
  // 【2026-01-20修复】已登录用户扫码也要更新绑定关系
  const salespersonIdParam = to.query.s as string
  if (salespersonIdParam) {
    try {
      // 获取推销员信息并存储
      const res = await get<any>(`/shop/salesperson/${salespersonIdParam}`)
      if (res.data) {
        userStore.setSalesperson(res.data)

        // 【2026-01-20修复】已登录的WHOLESALE用户，更新后端绑定关系
        if (userStore.isLoggedIn && userStore.userInfo?.type === 'WHOLESALE') {
          try {
            await post('/auth/bind-salesperson', { salespersonId: Number(salespersonIdParam) })
            console.log(`[扫码绑定] 已更新用户绑定关系到推销员ID: ${salespersonIdParam}`)
          } catch (bindErr) {
            console.error('更新绑定关系失败:', bindErr)
          }
        }
      }
    } catch (err) {
      console.error('获取推销员信息失败:', err)
    }
    // 移除URL中的s参数，避免重复处理
    const query = { ...to.query }
    delete query.s
    next({ path: to.path, query, replace: true })
    return
  }

  // 需要登录但未登录
  if (to.meta.requiresAuth !== false && !userStore.isLoggedIn) {
    // 【2026-01-17 访客模式】允许访客模式访问的页面
    if (to.meta.allowGuest && userStore.isGuestMode) {
      next()
      return
    }
    // 访客模式但没有推销员ID，提示需要扫码
    if (to.meta.allowGuest && !userStore.salespersonInfo) {
      next({ path: '/login', query: { redirect: to.fullPath, guest: '1' } })
      return
    }
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  // 【2026-01-22修复】访问登录页时的处理
  // 已登录用户访问登录页时，跳转到首页或redirect指定的页面
  // 而不是清除登录状态（之前的逻辑会导致登录成功后被清除状态）
  if (to.path === '/login') {
    if (userStore.isLoggedIn) {
      // 如果有redirect参数，跳转到指定页面
      const redirect = to.query.redirect as string
      next(redirect || '/')
      return
    }
    next()
    return
  }

  next()
})

export default router
