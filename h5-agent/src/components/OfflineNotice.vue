<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Toast } from 'tdesign-mobile-vue'

const isOffline = ref(!navigator.onLine)

const handleOnline = () => {
  isOffline.value = false
  Toast({ message: '网络已恢复', theme: 'success' })
}

const handleOffline = () => {
  isOffline.value = true
  Toast({ message: '当前处于离线状态', theme: 'warning', duration: 3000 })
}

onMounted(() => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})
</script>

<template>
  <div class="offline-notice" v-if="isOffline">
    <span class="material-symbols-outlined">wifi_off</span>
    <span>离线模式</span>
  </div>
</template>

<style scoped>
.offline-notice {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: #FF6B35;
  color: white;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
}
</style>
