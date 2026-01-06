<template>
  <!-- 直接套用设计稿: 网页版-管理后台/订货单管理/code.html 的布局结构 -->
  <div class="bg-background-light dark:bg-background-dark font-display text-text-main overflow-hidden h-screen flex">
    <!-- Sidebar -->
    <aside class="w-[260px] flex-shrink-0 bg-white dark:bg-card-dark border-r border-[#f3e8e8] dark:border-[#3e2a2a] flex flex-col h-full transition-colors z-20">
      <div class="p-6 flex items-center gap-3">
        <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/20 bg-primary/10 flex items-center justify-center">
          <span class="material-symbols-outlined text-primary text-[24px]">local_fire_department</span>
        </div>
        <div class="flex flex-col">
          <h1 class="text-text-main dark:text-white text-base font-bold leading-normal tracking-wide">蒙庆订货系统</h1>
          <p class="text-primary text-xs font-normal leading-normal">内部管理后台</p>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2">
        <router-link to="/dashboard" custom v-slot="{ isActive, navigate }">
          <div
            @click="navigate"
            :class="[
              'flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer group transition-colors',
              isActive ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-primary-light/50'
            ]"
          >
            <span :class="['material-symbols-outlined', isActive ? 'text-primary' : 'text-text-main dark:text-white group-hover:text-primary']" style="font-size: 24px;">home</span>
            <p :class="['text-sm', isActive ? 'text-primary font-bold' : 'text-text-main dark:text-white font-medium']">首页</p>
          </div>
        </router-link>

        <router-link to="/order" custom v-slot="{ isActive, navigate }">
          <div
            @click="navigate"
            :class="[
              'flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer group transition-colors',
              isActive ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-primary-light/50'
            ]"
          >
            <span :class="['material-symbols-outlined', isActive ? 'text-primary' : 'text-text-main dark:text-white group-hover:text-primary']" style="font-size: 24px;">assignment</span>
            <p :class="['text-sm', isActive ? 'text-primary font-bold' : 'text-text-main dark:text-white font-medium']">订货单管理</p>
          </div>
        </router-link>

        <router-link to="/product" custom v-slot="{ isActive, navigate }">
          <div
            @click="navigate"
            :class="[
              'flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer group transition-colors',
              isActive ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-primary-light/50'
            ]"
          >
            <span :class="['material-symbols-outlined', isActive ? 'text-primary' : 'text-text-main dark:text-white group-hover:text-primary']" style="font-size: 24px;">shopping_bag</span>
            <p :class="['text-sm', isActive ? 'text-primary font-bold' : 'text-text-main dark:text-white font-medium']">商品管理</p>
          </div>
        </router-link>

        <router-link to="/commission" custom v-slot="{ isActive, navigate }">
          <div
            @click="navigate"
            :class="[
              'flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer group transition-colors',
              isActive ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-primary-light/50'
            ]"
          >
            <span :class="['material-symbols-outlined', isActive ? 'text-primary' : 'text-text-main dark:text-white group-hover:text-primary']" style="font-size: 24px;">currency_yen</span>
            <p :class="['text-sm', isActive ? 'text-primary font-bold' : 'text-text-main dark:text-white font-medium']">财务核算</p>
          </div>
        </router-link>

        <router-link to="/agent" custom v-slot="{ isActive, navigate }">
          <div
            @click="navigate"
            :class="[
              'flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer group transition-colors',
              isActive ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-primary-light/50'
            ]"
          >
            <span :class="['material-symbols-outlined', isActive ? 'text-primary' : 'text-text-main dark:text-white group-hover:text-primary']" style="font-size: 24px;">group</span>
            <p :class="['text-sm', isActive ? 'text-primary font-bold' : 'text-text-main dark:text-white font-medium']">代理商库</p>
          </div>
        </router-link>

        <router-link to="/inventory" custom v-slot="{ isActive, navigate }">
          <div
            @click="navigate"
            :class="[
              'flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer group transition-colors',
              isActive ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-primary-light/50'
            ]"
          >
            <span :class="['material-symbols-outlined', isActive ? 'text-primary' : 'text-text-main dark:text-white group-hover:text-primary']" style="font-size: 24px;">inventory_2</span>
            <p :class="['text-sm', isActive ? 'text-primary font-bold' : 'text-text-main dark:text-white font-medium']">库存查询</p>
          </div>
        </router-link>

        <router-link to="/withdrawal" custom v-slot="{ isActive, navigate }">
          <div
            @click="navigate"
            :class="[
              'flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer group transition-colors',
              isActive ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-primary-light/50'
            ]"
          >
            <span :class="['material-symbols-outlined', isActive ? 'text-primary' : 'text-text-main dark:text-white group-hover:text-primary']" style="font-size: 24px;">payments</span>
            <p :class="['text-sm', isActive ? 'text-primary font-bold' : 'text-text-main dark:text-white font-medium']">提现审核</p>
          </div>
        </router-link>

        <router-link to="/system" custom v-slot="{ isActive, navigate }">
          <div
            @click="navigate"
            :class="[
              'flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer group transition-colors mt-auto',
              isActive ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-primary-light/50'
            ]"
          >
            <span :class="['material-symbols-outlined', isActive ? 'text-primary' : 'text-text-main dark:text-white group-hover:text-primary']" style="font-size: 24px;">settings</span>
            <p :class="['text-sm', isActive ? 'text-primary font-bold' : 'text-text-main dark:text-white font-medium']">系统设置</p>
          </div>
        </router-link>
      </div>

      <div class="p-4 border-t border-[#f3e8e8] dark:border-[#3e2a2a]">
        <div class="flex items-center gap-3 px-2 py-2">
          <div class="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
            {{ userStore.userInfo?.username?.charAt(0)?.toUpperCase() || 'A' }}
          </div>
          <div>
            <p class="text-sm font-bold text-text-main dark:text-white">{{ userStore.userInfo?.username || 'Admin' }}</p>
            <p class="text-xs text-text-secondary">超级管理员</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col h-full relative overflow-hidden bg-background-light dark:bg-background-dark">
      <!-- Background Pattern -->
      <div class="absolute inset-0 festive-bg pointer-events-none z-0"></div>

      <!-- Top Header -->
      <header class="flex-shrink-0 flex items-center justify-between bg-white/80 dark:bg-card-dark/90 backdrop-blur-md border-b border-[#f3e8e8] dark:border-[#3e2a2a] px-8 py-4 z-10">
        <div class="flex items-center gap-4">
          <div class="p-2 bg-primary/10 rounded-lg text-primary">
            <span class="material-symbols-outlined" style="font-size: 24px;">{{ currentIcon }}</span>
          </div>
          <h2 class="text-text-main dark:text-white text-xl font-bold tracking-tight">{{ currentTitle }}</h2>
        </div>
        <div class="flex items-center gap-4">
          <button class="relative p-2 rounded-lg hover:bg-background-light text-text-main dark:text-white transition-colors">
            <span class="material-symbols-outlined" style="font-size: 22px;">notifications</span>
            <span class="absolute top-2 right-2 size-2 bg-primary rounded-full border border-white dark:border-card-dark"></span>
          </button>
          <button @click="handleLogout" class="flex items-center justify-center px-4 py-2 bg-white border border-[#e6d0d0] text-text-main rounded-lg text-sm font-medium hover:bg-background-light transition-colors gap-2">
            <span class="material-symbols-outlined" style="font-size: 18px;">logout</span>
            退出
          </button>
        </div>
      </header>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-8 z-10 flex flex-col gap-6 scroll-smooth">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessageBox, ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const currentTitle = computed(() => (route.meta.title as string) || '首页')

const currentIcon = computed(() => {
  const iconMap: Record<string, string> = {
    '/dashboard': 'home',
    '/order': 'assignment',
    '/product': 'shopping_bag',
    '/category': 'category',
    '/agent': 'group',
    '/inventory': 'inventory_2',
    '/commission': 'currency_yen',
    '/withdrawal': 'payments',
    '/system': 'settings',
  }
  return iconMap[route.path] || 'home'
})

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    userStore.logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch {
    // 取消
  }
}
</script>

<style scoped>
.festive-bg {
  background-image: radial-gradient(#e63333 0.5px, transparent 0.5px), radial-gradient(#e63333 0.5px, transparent 0.5px);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  opacity: 0.03;
}
</style>
