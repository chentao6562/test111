<template>
  <div v-if="isInitialized">
    <router-view />
  </div>
  <div v-else class="app-loading">
    <t-loading size="large" text="加载中..." />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'

const isInitialized = ref(false)
const userStore = useUserStore()

onMounted(() => {
  // 应用启动时，store 会自动从 localStorage 恢复状态
  // 这里确保 store 初始化完成后再渲染路由
  isInitialized.value = true
})
</script>

<style>
.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f5f7fa;
}
</style>
