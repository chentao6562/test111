import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      redirect: '/workbench'
    },
    {
      path: '/workbench',
      name: 'Workbench',
      component: () => import('@/views/Workbench.vue'),
      meta: { requiresAuth: true, keepAlive: true }
    },
    {
      path: '/pickup',
      name: 'Pickup',
      component: () => import('@/views/Pickup.vue'),
      meta: { requiresAuth: true, keepAlive: true }
    },
    {
      path: '/stock',
      name: 'Stock',
      component: () => import('@/views/Stock.vue'),
      meta: { requiresAuth: true, keepAlive: true }
    },
    {
      path: '/my',
      name: 'My',
      component: () => import('@/views/My.vue'),
      meta: { requiresAuth: true, keepAlive: true }
    },
    {
      path: '/orders/:id',
      name: 'OrderDetail',
      component: () => import('@/views/OrderDetail.vue'),
      meta: { requiresAuth: true }
    },
    // 【2026-01-16 预约模式升级】预约管理相关路由
    {
      path: '/reservations',
      name: 'Reservations',
      component: () => import('@/views/Reservations.vue'),
      meta: { requiresAuth: true, keepAlive: true }
    },
    {
      path: '/reservations/:id',
      name: 'ReservationDetail',
      component: () => import('@/views/ReservationDetail.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/reservations/:id/confirm',
      name: 'ReservationConfirm',
      component: () => import('@/views/ReservationConfirm.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/pickup-reservation',
      name: 'PickupReservation',
      component: () => import('@/views/PickupReservationNew.vue'),
      meta: { requiresAuth: true }
    },
    // 【2026-01-29】旧版核销页面备份
    {
      path: '/pickup-reservation-old',
      name: 'PickupReservationOld',
      component: () => import('@/views/PickupReservation.vue'),
      meta: { requiresAuth: true }
    },
    // 【2026-01-17 备货环节】备货管理相关路由
    {
      path: '/prepare',
      name: 'Prepare',
      component: () => import('@/views/Prepare.vue'),
      meta: { requiresAuth: true, keepAlive: true }
    },
    {
      path: '/prepare/:id',
      name: 'PrepareDetail',
      component: () => import('@/views/PrepareDetail.vue'),
      meta: { requiresAuth: true }
    },
    // 【2026-01-18 春节营销】代金券核销
    {
      path: '/coupon-redeem',
      name: 'CouponRedeem',
      component: () => import('@/views/CouponRedeem.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// 全局路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  // 【2026-01-22修复】isLoggedIn改为computed属性，去掉括号
  // 需要登录的页面
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
    return
  }

  // 已登录访问登录页，跳转到工作台
  if (to.path === '/login' && userStore.isLoggedIn) {
    next('/workbench')
    return
  }

  next()
})

export default router
