<template>
  <div class="admin-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed, 'mobile-open': mobileMenuOpen }">
    <!-- 移动端遮罩层 -->
    <div class="mobile-overlay" @click="closeMobileMenu"></div>

    <!-- 侧边栏 -->
    <aside class="sidebar">
      <!-- Logo区域 -->
      <div class="logo-area">
        <div class="logo-icon">
          <img v-if="settings.companyLogo" :src="settings.companyLogo" alt="Logo" class="company-logo" />
          <svg v-else viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="16" fill="#e53734"/>
            <path d="M16 6C16 6 12 10 12 14C12 16.5 13.5 18.5 16 19C18.5 18.5 20 16.5 20 14C20 10 16 6 16 6Z" fill="white"/>
            <path d="M16 12C16 12 14 14 14 16C14 17.5 15 18.5 16 19C17 18.5 18 17.5 18 16C18 14 16 12 16 12Z" fill="#e53734"/>
          </svg>
        </div>
        <div class="logo-text" v-show="!sidebarCollapsed">
          <h1>{{ settings.companyName || '蒙庆烟花' }}</h1>
          <p>管理后台</p>
        </div>
        <!-- 移动端关闭按钮 -->
        <button class="mobile-close-btn" @click="closeMobileMenu">
          <t-icon name="close" />
        </button>
      </div>

      <!-- 导航菜单 -->
      <nav class="nav-menu">
        <router-link to="/dashboard" class="nav-item" :class="{ active: $route.path === '/dashboard' }" @click="handleNavClick">
          <t-icon name="dashboard" />
          <span class="nav-text">控制台</span>
        </router-link>

        <router-link to="/docs" class="nav-item" :class="{ active: $route.path === '/docs' }" @click="handleNavClick">
          <t-icon name="file-unknown" />
          <span class="nav-text">业务流程说明</span>
        </router-link>

        <!-- 商品管理：仅ADMIN/WAREHOUSE可见 -->
        <div class="nav-group" v-if="canShowMenuGroup(['/categories', '/products', '/packages'])">
          <div class="nav-item has-sub" :class="{ expanded: expandedMenus.products }" @click="toggleMenu('products')">
            <t-icon name="shop" />
            <span class="nav-text">商品管理</span>
            <t-icon name="chevron-down" class="arrow" />
          </div>
          <div class="sub-menu" v-show="expandedMenus.products">
            <router-link to="/categories" class="nav-item sub" :class="{ active: $route.path === '/categories' }" @click="handleNavClick">
              <span class="nav-text">分类管理</span>
            </router-link>
            <router-link to="/products" class="nav-item sub" :class="{ active: $route.path === '/products' }" @click="handleNavClick">
              <span class="nav-text">商品列表</span>
            </router-link>
            <router-link to="/packages" class="nav-item sub" :class="{ active: $route.path === '/packages' }" @click="handleNavClick">
              <span class="nav-text">套餐管理</span>
            </router-link>
          </div>
        </div>

        <!-- 推销员管理：仅ADMIN/WAREHOUSE可见 -->
        <div class="nav-group" v-if="canShowMenuGroup(['/agents'])">
          <div class="nav-item has-sub" :class="{ expanded: expandedMenus.agents }" @click="toggleMenu('agents')">
            <t-icon name="user-circle" />
            <span class="nav-text">推销员管理</span>
            <t-icon name="chevron-down" class="arrow" />
          </div>
          <div class="sub-menu" v-show="expandedMenus.agents">
            <router-link to="/agents" class="nav-item sub" :class="{ active: $route.path === '/agents' }" @click="handleNavClick">
              <span class="nav-text">推销员列表</span>
            </router-link>
          </div>
        </div>

        <!-- 预约管理：客服可见 -->
        <div class="nav-group" v-if="canShowMenuGroup(['/reservations', '/customers'])">
          <div class="nav-item has-sub" :class="{ expanded: expandedMenus.reservations }" @click="toggleMenu('reservations')">
            <t-icon name="calendar" />
            <span class="nav-text">预约管理</span>
            <t-icon name="chevron-down" class="arrow" />
          </div>
          <div class="sub-menu" v-show="expandedMenus.reservations">
            <router-link to="/reservations" class="nav-item sub" :class="{ active: $route.path === '/reservations' }" @click="handleNavClick">
              <span class="nav-text">预约列表</span>
            </router-link>
            <router-link to="/customers" class="nav-item sub" :class="{ active: $route.path === '/customers' }" @click="handleNavClick">
              <span class="nav-text">客户风控</span>
            </router-link>
          </div>
        </div>

        <!-- 供价管理：仅ADMIN/WAREHOUSE可见 -->
        <router-link v-if="canShowMenuItem('/commission')" to="/commission" class="nav-item" :class="{ active: $route.path === '/commission' }" @click="handleNavClick">
          <t-icon name="chart-pie" />
          <span class="nav-text">供价管理</span>
        </router-link>

        <!-- 库存管理：仅ADMIN/WAREHOUSE可见 -->
        <router-link v-if="canShowMenuItem('/stock')" to="/stock" class="nav-item" :class="{ active: $route.path === '/stock' }" @click="handleNavClick">
          <t-icon name="layers" />
          <span class="nav-text">库存管理</span>
        </router-link>

        <!-- 财务管理：仅ADMIN/WAREHOUSE可见 -->
        <router-link v-if="canShowMenuItem('/finance')" to="/finance" class="nav-item" :class="{ active: $route.path === '/finance' }" @click="handleNavClick">
          <t-icon name="wallet" />
          <span class="nav-text">财务管理</span>
        </router-link>

        <!-- 报表中心：仅ADMIN/WAREHOUSE可见 -->
        <router-link v-if="canShowMenuItem('/reports')" to="/reports" class="nav-item" :class="{ active: $route.path === '/reports' }" @click="handleNavClick">
          <t-icon name="chart-bar" />
          <span class="nav-text">报表中心</span>
        </router-link>

        <!-- 客服管理：客服可见 -->
        <router-link v-if="canShowMenuItem('/service')" to="/service" class="nav-item" :class="{ active: $route.path === '/service' }" @click="handleNavClick">
          <t-icon name="service" />
          <span class="nav-text">客服管理</span>
        </router-link>

        <!-- 推销员激励：仅ADMIN/WAREHOUSE可见 -->
        <div class="nav-group" v-if="canShowMenuGroup(['/share-audit', '/weekly-rewards', '/incentive-config'])">
          <div class="nav-item has-sub" :class="{ expanded: expandedMenus.incentive }" @click="toggleMenu('incentive')">
            <t-icon name="gift" />
            <span class="nav-text">推销员激励</span>
            <t-icon name="chevron-down" class="arrow" />
          </div>
          <div class="sub-menu" v-show="expandedMenus.incentive">
            <router-link to="/share-audit" class="nav-item sub" :class="{ active: $route.path === '/share-audit' }" @click="handleNavClick">
              <span class="nav-text">发圈审核</span>
            </router-link>
            <router-link to="/weekly-rewards" class="nav-item sub" :class="{ active: $route.path === '/weekly-rewards' }" @click="handleNavClick">
              <span class="nav-text">周期奖励</span>
            </router-link>
            <router-link to="/incentive-config" class="nav-item sub" :class="{ active: $route.path === '/incentive-config' }" @click="handleNavClick">
              <span class="nav-text">激励配置</span>
            </router-link>
          </div>
        </div>

        <!-- 营销活动：仅ADMIN/WAREHOUSE可见 -->
        <div class="nav-group" v-if="canShowMenuGroup(['/flash-sale', '/gift-tiers', '/marketing'])">
          <div class="nav-item has-sub" :class="{ expanded: expandedMenus.marketing }" @click="toggleMenu('marketing')">
            <t-icon name="discount" />
            <span class="nav-text">营销活动</span>
            <t-icon name="chevron-down" class="arrow" />
          </div>
          <div class="sub-menu" v-show="expandedMenus.marketing">
            <router-link to="/flash-sale" class="nav-item sub" :class="{ active: $route.path === '/flash-sale' }" @click="handleNavClick">
              <span class="nav-text">限时秒杀</span>
            </router-link>
            <router-link to="/gift-tiers" class="nav-item sub" :class="{ active: $route.path === '/gift-tiers' }" @click="handleNavClick">
              <span class="nav-text">满赠活动</span>
            </router-link>
            <router-link to="/coupon-activities" class="nav-item sub" :class="{ active: $route.path === '/coupon-activities' }" @click="handleNavClick">
              <span class="nav-text">代金券活动</span>
            </router-link>
            <router-link to="/activity-pages" class="nav-item sub" :class="{ active: $route.path === '/activity-pages' }" @click="handleNavClick">
              <span class="nav-text">活动专题页</span>
            </router-link>
            <router-link to="/group-buy-config" class="nav-item sub" :class="{ active: $route.path === '/group-buy-config' }" @click="handleNavClick">
              <span class="nav-text">拼团配置</span>
            </router-link>
            <router-link to="/group-buy-list" class="nav-item sub" :class="{ active: $route.path === '/group-buy-list' }" @click="handleNavClick">
              <span class="nav-text">拼团列表</span>
            </router-link>
            <router-link to="/price-lock-config" class="nav-item sub" :class="{ active: $route.path === '/price-lock-config' }" @click="handleNavClick">
              <span class="nav-text">锁价配置</span>
            </router-link>
            <router-link to="/bargain-config" class="nav-item sub" :class="{ active: $route.path === '/bargain-config' }" @click="handleNavClick">
              <span class="nav-text">砍价配置</span>
            </router-link>
            <router-link to="/bargain-list" class="nav-item sub" :class="{ active: $route.path === '/bargain-list' }" @click="handleNavClick">
              <span class="nav-text">砍价数据</span>
            </router-link>
            <router-link to="/spin-wheel-config" class="nav-item sub" :class="{ active: $route.path === '/spin-wheel-config' }" @click="handleNavClick">
              <span class="nav-text">大转盘配置</span>
            </router-link>
            <router-link to="/spin-wheel-redeem" class="nav-item sub" :class="{ active: $route.path === '/spin-wheel-redeem' }" @click="handleNavClick">
              <span class="nav-text">兑换管理</span>
            </router-link>
            <router-link to="/spin-wheel-blacklist" class="nav-item sub" :class="{ active: $route.path === '/spin-wheel-blacklist' }" @click="handleNavClick">
              <span class="nav-text">风控黑名单</span>
            </router-link>
            <router-link to="/spin-wheel-stats" class="nav-item sub" :class="{ active: $route.path === '/spin-wheel-stats' }" @click="handleNavClick">
              <span class="nav-text">转盘数据分析</span>
            </router-link>
          </div>
        </div>

        <!-- H5素材管理：仅ADMIN/WAREHOUSE可见 -->
        <div class="nav-group" v-if="canShowMenuGroup(['/h5-banners', '/h5-recommend'])">
          <div class="nav-item has-sub" :class="{ expanded: expandedMenus.h5Material }" @click="toggleMenu('h5Material')">
            <t-icon name="internet" />
            <span class="nav-text">H5素材管理</span>
            <t-icon name="chevron-down" class="arrow" />
          </div>
          <div class="sub-menu" v-show="expandedMenus.h5Material">
            <router-link to="/h5-banners" class="nav-item sub" :class="{ active: $route.path === '/h5-banners' }" @click="handleNavClick">
              <span class="nav-text">H5轮播图</span>
            </router-link>
            <router-link to="/h5-recommend" class="nav-item sub" :class="{ active: $route.path === '/h5-recommend' }" @click="handleNavClick">
              <span class="nav-text">H5推荐商品</span>
            </router-link>
            <router-link to="/h5-notices" class="nav-item sub" :class="{ active: $route.path === '/h5-notices' }" @click="handleNavClick">
              <span class="nav-text">H5公告通知</span>
            </router-link>
            <router-link to="/promotion-copies" class="nav-item sub" :class="{ active: $route.path === '/promotion-copies' }" @click="handleNavClick">
              <span class="nav-text">推广文案</span>
            </router-link>
            <router-link to="/brand-assets" class="nav-item sub" :class="{ active: $route.path === '/brand-assets' }" @click="handleNavClick">
              <span class="nav-text">品牌素材</span>
            </router-link>
          </div>
        </div>

        <!-- 系统设置：仅ADMIN/WAREHOUSE可见 -->
        <div class="nav-group" v-if="canShowMenuGroup(['/settings', '/warehouse', '/staff'])">
          <div class="nav-item has-sub" :class="{ expanded: expandedMenus.system }" @click="toggleMenu('system')">
            <t-icon name="setting" />
            <span class="nav-text">系统设置</span>
            <t-icon name="chevron-down" class="arrow" />
          </div>
          <div class="sub-menu" v-show="expandedMenus.system">
            <router-link to="/settings" class="nav-item sub" :class="{ active: $route.path === '/settings' }" @click="handleNavClick">
              <span class="nav-text">系统配置</span>
            </router-link>
            <router-link to="/warehouse" class="nav-item sub" :class="{ active: $route.path === '/warehouse' }" @click="handleNavClick">
              <span class="nav-text">仓库管理</span>
            </router-link>
            <router-link to="/staff" class="nav-item sub" :class="{ active: $route.path === '/staff' }" @click="handleNavClick">
              <span class="nav-text">员工管理</span>
            </router-link>
            <router-link to="/audit-logs" class="nav-item sub" :class="{ active: $route.path === '/audit-logs' }" @click="handleNavClick">
              <span class="nav-text">操作日志</span>
            </router-link>
          </div>
        </div>
      </nav>

      <!-- 侧边栏底部收起按钮 -->
      <div class="sidebar-toggle" @click="toggleSidebar">
        <t-icon :name="sidebarCollapsed ? 'chevron-right' : 'chevron-left'" />
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="main-wrapper">
      <!-- 顶部栏 -->
      <header class="header">
        <!-- 移动端菜单按钮 -->
        <button class="mobile-menu-btn" @click="openMobileMenu">
          <t-icon name="view-list" />
        </button>

        <div class="breadcrumb">
          <span class="text-gray">首页</span>
          <span class="separator">/</span>
          <span class="current">{{ $route.meta.title || '控制台' }}</span>
        </div>
        <div class="header-actions">
          <t-dropdown :options="userMenuOptions" @click="handleUserMenu">
            <t-button variant="text">
              <t-icon name="user-circle" />
              <span class="username-text">{{ userStore.username }}</span>
            </t-button>
          </t-dropdown>
        </div>
      </header>

      <!-- 内容区 -->
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 管理后台布局组件
 * 支持响应式设计：
 * - 桌面端：展开侧边栏
 * - 平板端：可收起侧边栏
 * - 移动端：抽屉式侧边栏
 */
import { reactive, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { MessagePlugin } from 'tdesign-vue-next'
import { getPublicConfig } from '@/api/settings'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 响应式断点
const BREAKPOINT_TABLET = 1024
const BREAKPOINT_MOBILE = 768

// 侧边栏状态
const sidebarCollapsed = ref(false)
const mobileMenuOpen = ref(false)

// 系统设置（Logo、公司名称）
const settings = ref({
  companyName: '',
  companyLogo: '',
})

// 加载系统设置
async function loadSettings() {
  try {
    const res = await getPublicConfig()
    if (res.code === 0 && res.data) {
      settings.value.companyName = res.data.companyName || ''
      settings.value.companyLogo = res.data.companyLogo || ''
      updateDocumentTitle()
    }
  } catch (error) {
    console.error('加载系统设置失败:', error)
  }
}

// 更新浏览器标签页标题
function updateDocumentTitle() {
  const companyName = settings.value.companyName || '蒙庆烟花'
  const pageTitle = route.meta?.title as string || '控制台'
  document.title = `${pageTitle} - ${companyName}`
}

// 检查屏幕宽度并调整侧边栏状态
function checkScreenWidth() {
  const width = window.innerWidth
  if (width < BREAKPOINT_TABLET && width >= BREAKPOINT_MOBILE) {
    sidebarCollapsed.value = true
  } else if (width >= BREAKPOINT_TABLET) {
    sidebarCollapsed.value = false
  }
  // 移动端始终关闭侧边栏
  if (width < BREAKPOINT_MOBILE) {
    mobileMenuOpen.value = false
  }
}

// 切换侧边栏收起/展开
function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 打开移动端菜单
function openMobileMenu() {
  mobileMenuOpen.value = true
  document.body.style.overflow = 'hidden'
}

// 关闭移动端菜单
function closeMobileMenu() {
  mobileMenuOpen.value = false
  document.body.style.overflow = ''
}

// 导航点击处理（移动端自动关闭菜单）
function handleNavClick() {
  if (window.innerWidth < BREAKPOINT_MOBILE) {
    closeMobileMenu()
  }
}

onMounted(() => {
  loadSettings()
  checkScreenWidth()
  window.addEventListener('resize', checkScreenWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenWidth)
  document.body.style.overflow = ''
})

// 监听路由变化，更新标题
watch(() => route.path, () => {
  if (settings.value.companyName) {
    updateDocumentTitle()
  }
})

// 展开的菜单状态
const expandedMenus = reactive({
  products: true,
  agents: true,
  reservations: true,
  incentive: true,
  marketing: true,
  h5Material: true,
  system: true,
})

function toggleMenu(menu: string) {
  expandedMenus[menu as keyof typeof expandedMenus] = !expandedMenus[menu as keyof typeof expandedMenus]
}

// 【2026-01-23】菜单权限控制
// 客服角色只能访问特定菜单
const SERVICE_ALLOWED_PATHS = [
  '/dashboard',
  '/docs',
  '/reservations',
  '/customers',
  '/service'
]

/**
 * 判断菜单项是否可见
 * @param path 菜单路径
 */
function canShowMenuItem(path: string): boolean {
  if (userStore.role === 'SERVICE') {
    return SERVICE_ALLOWED_PATHS.some(p => path === p || path.startsWith(p + '/'))
  }
  return true // ADMIN、WAREHOUSE等角色显示所有菜单
}

/**
 * 判断菜单组是否可见（当组内有任意可见项时显示组）
 * @param paths 组内所有菜单路径
 */
function canShowMenuGroup(paths: string[]): boolean {
  if (userStore.role === 'SERVICE') {
    return paths.some(p => canShowMenuItem(p))
  }
  return true
}

// 用户菜单选项
const userMenuOptions = [
  { content: '个人设置', value: 'profile' },
  { content: '修改密码', value: 'password' },
  { content: '退出登录', value: 'logout', theme: 'error' },
]

// 处理用户菜单点击
function handleUserMenu(data: { value: string }) {
  if (data.value === 'logout') {
    userStore.logout()
    MessagePlugin.success('已退出登录')
    router.push('/login')
  }
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg-page);
}

/* 移动端遮罩层 */
.mobile-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  opacity: 0;
  visibility: hidden;
  transition: all var(--transition-normal);
}

/* 侧边栏 */
.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--color-sidebar-bg);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-sidebar-border);
  transition: width var(--transition-normal);
  z-index: 1000;
}

/* Logo区域 */
.logo-area {
  height: var(--header-height);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: 0 var(--spacing-xl);
  border-bottom: 1px solid var(--color-sidebar-border);
  flex-shrink: 0;
}

.logo-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.logo-icon svg {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(229, 55, 52, 0.5);
}

.logo-icon .company-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-md);
}

.logo-text h1 {
  color: #fff;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  margin: 0;
  line-height: 1.2;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.logo-text p {
  color: #9ca3af;
  font-size: var(--font-size-xs);
  margin: 2px 0 0 0;
}

/* 移动端关闭按钮 */
.mobile-close-btn {
  display: none;
  margin-left: auto;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  color: #fff;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mobile-close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 导航菜单 */
.nav-menu {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg) var(--spacing-md);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-lg);
  color: #d1d5db;
  text-decoration: none;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: var(--spacing-xs);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.nav-item.active {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 4px 12px rgba(229, 55, 52, 0.3);
}

.nav-item.has-sub {
  justify-content: flex-start;
}

.nav-item .arrow {
  margin-left: auto;
  transition: transform var(--transition-fast);
  flex-shrink: 0;
}

.nav-item.expanded .arrow {
  transform: rotate(180deg);
}

.nav-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub-menu {
  padding-left: var(--spacing-xl);
}

.nav-item.sub {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-xs);
}

.nav-group {
  margin-bottom: var(--spacing-xs);
}

/* 侧边栏底部收起按钮 */
.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-top: 1px solid var(--color-sidebar-border);
  color: #9ca3af;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

/* 主内容区包装器 */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

/* 顶部栏 */
.header {
  height: var(--header-height);
  flex-shrink: 0;
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-xl);
  gap: var(--spacing-lg);
}

/* 移动端菜单按钮 */
.mobile-menu-btn {
  display: none;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mobile-menu-btn:hover {
  background: var(--color-bg-hover);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  flex: 1;
  min-width: 0;
}

.breadcrumb .text-gray {
  color: var(--color-text-tertiary);
}

.breadcrumb .separator {
  color: var(--color-text-quaternary);
}

.breadcrumb .current {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  flex-shrink: 0;
}

.username-text {
  margin-left: var(--spacing-xs);
}

/* 内容区 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xl) var(--spacing-2xl);
  background: var(--color-bg-page);
}

/* 滚动条样式 */
.nav-menu::-webkit-scrollbar {
  width: 4px;
}

.nav-menu::-webkit-scrollbar-track {
  background: #2b1212;
}

.nav-menu::-webkit-scrollbar-thumb {
  background: #552b2b;
  border-radius: 2px;
}

.content::-webkit-scrollbar {
  width: 6px;
}

.content::-webkit-scrollbar-track {
  background: transparent;
}

.content::-webkit-scrollbar-thumb {
  background: var(--color-text-quaternary);
  border-radius: 3px;
}

/* ========== 收起状态 ========== */
.sidebar-collapsed .sidebar {
  width: 64px;
}

.sidebar-collapsed .logo-text {
  display: none;
}

.sidebar-collapsed .nav-text {
  display: none;
}

.sidebar-collapsed .nav-item .arrow {
  display: none;
}

.sidebar-collapsed .sub-menu {
  padding-left: 0;
}

.sidebar-collapsed .nav-item {
  justify-content: center;
  padding: var(--spacing-sm);
}

.sidebar-collapsed .nav-item.sub {
  padding: var(--spacing-xs) var(--spacing-sm);
}

/* ========== 平板端响应式 (768px - 1024px) ========== */
@media (max-width: 1024px) {
  .sidebar {
    width: 64px;
  }

  .logo-text {
    display: none;
  }

  .nav-text {
    display: none;
  }

  .nav-item .arrow {
    display: none;
  }

  .sub-menu {
    padding-left: 0;
  }

  .nav-item {
    justify-content: center;
    padding: var(--spacing-sm);
  }

  .nav-item.sub {
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .sidebar-toggle {
    display: none;
  }

  .content {
    padding: var(--spacing-lg);
  }
}

/* ========== 移动端响应式 (< 768px) ========== */
@media (max-width: 768px) {
  .mobile-overlay {
    display: block;
  }

  .mobile-open .mobile-overlay {
    opacity: 1;
    visibility: visible;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    transform: translateX(-100%);
    transition: transform var(--transition-normal);
    box-shadow: var(--shadow-lg);
  }

  .mobile-open .sidebar {
    transform: translateX(0);
  }

  .logo-text {
    display: block;
  }

  .nav-text {
    display: inline;
  }

  .nav-item .arrow {
    display: inline;
  }

  .sub-menu {
    padding-left: var(--spacing-xl);
  }

  .nav-item {
    justify-content: flex-start;
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .nav-item.sub {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .mobile-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar-toggle {
    display: none;
  }

  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .header {
    padding: 0 var(--spacing-md);
  }

  .breadcrumb {
    display: none;
  }

  .username-text {
    display: none;
  }

  .content {
    padding: var(--spacing-md);
  }
}

/* ========== 超小屏幕 (< 480px) ========== */
@media (max-width: 480px) {
  .sidebar {
    width: 100%;
  }

  .content {
    padding: var(--spacing-sm);
  }
}
</style>
