import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', public: true }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '仪表盘', icon: 'Odometer' }
      },
      {
        path: 'product',
        name: 'Product',
        component: () => import('@/views/product/index.vue'),
        meta: { title: '商品管理', icon: 'Goods' }
      },
      {
        path: 'category',
        name: 'Category',
        component: () => import('@/views/category/index.vue'),
        meta: { title: '分类管理', icon: 'Menu' }
      },
      {
        path: 'order',
        name: 'Order',
        component: () => import('@/views/order/index.vue'),
        meta: { title: '订单管理', icon: 'Document' }
      },
      {
        path: 'agent',
        name: 'Agent',
        component: () => import('@/views/agent/index.vue'),
        meta: { title: '代理商管理', icon: 'User' }
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/views/inventory/index.vue'),
        meta: { title: '库存管理', icon: 'Box' }
      },
      {
        path: 'transfer',
        name: 'Transfer',
        component: () => import('@/views/transfer/index.vue'),
        meta: { title: '移库任务', icon: 'Van' }
      },
      {
        path: 'commission',
        name: 'Commission',
        component: () => import('@/views/commission/index.vue'),
        meta: { title: '分润管理', icon: 'Money' }
      },
      {
        path: 'commission-rule',
        name: 'CommissionRule',
        component: () => import('@/views/commission-rule/index.vue'),
        meta: { title: '分润规则', icon: 'Rule' }
      },
      {
        path: 'withdrawal',
        name: 'Withdrawal',
        component: () => import('@/views/withdrawal/index.vue'),
        meta: { title: '提现审核', icon: 'Wallet' }
      },
      {
        path: 'employee',
        name: 'Employee',
        component: () => import('@/views/employee/index.vue'),
        meta: { title: '员工管理', icon: 'Avatar' }
      },
      {
        path: 'system',
        name: 'System',
        component: () => import('@/views/system/index.vue'),
        meta: { title: '系统配置', icon: 'Setting' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = `${to.meta.title || '管理后台'} - 蒙庆烟花`

  const token = localStorage.getItem('admin_token')

  if (to.meta.public) {
    // 公开页面
    if (token && to.path === '/login') {
      next('/dashboard')
    } else {
      next()
    }
  } else {
    // 需要登录
    if (token) {
      next()
    } else {
      next('/login')
    }
  }
})

export default router
