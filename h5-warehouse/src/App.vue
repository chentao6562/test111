<template>
  <div id="app">
    <router-view v-slot="{ Component, route }">
      <keep-alive :include="['Workbench', 'Pickup', 'Stock', 'My']">
        <component :is="Component" :key="route.fullPath" />
      </keep-alive>
    </router-view>

    <!-- TabBar -->
    <TabBar v-if="showTabBar" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'

const route = useRoute()

// 需要显示TabBar的页面
const tabBarPages = ['Workbench', 'Pickup', 'Stock', 'My']
const showTabBar = computed(() => {
  return route.name && tabBarPages.includes(route.name as string)
})
</script>

<style>
#app {
  width: 100%;
  min-height: 100vh;
}
</style>
