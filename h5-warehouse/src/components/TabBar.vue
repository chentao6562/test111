<template>
  <div class="custom-tabbar">
    <div
      v-for="item in tabs"
      :key="item.value"
      :class="['tabbar-item', { active: activeTab === item.value }]"
      @click="handleChange(item.value)"
    >
      <div class="tabbar-icon">
        <t-icon :name="item.icon" size="24px" />
      </div>
      <div class="tabbar-label">{{ item.label }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const tabs = [
  { value: 'workbench', icon: 'dashboard', label: '工作台' },
  { value: 'pickup', icon: 'scan', label: '提货核销' },
  { value: 'stock', icon: 'shop', label: '库存管理' },
  { value: 'my', icon: 'user', label: '我的' }
]

const activeTab = ref<string>('workbench')

// 监听路由变化，更新activeTab
watch(
  () => route.name,
  (newName) => {
    if (newName) {
      activeTab.value = (newName as string).toLowerCase()
    }
  },
  { immediate: true }
)

// 处理Tab切换
function handleChange(value: string) {
  activeTab.value = value
  router.push(`/${value}`)
}
</script>

<style scoped>
.custom-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  background-color: var(--bg-white);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom);
}

.tabbar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
  transition: color 0.2s;
  cursor: pointer;
}

.tabbar-item.active {
  color: var(--primary);
}

.tabbar-icon {
  font-size: 24px;
  line-height: 1;
  margin-bottom: 2px;
}

.tabbar-label {
  font-size: 10px;
  line-height: 1.2;
}
</style>
