<template>
  <t-card class="filter-card" :bordered="false">
    <!-- 可折叠模式 -->
    <template v-if="collapsible">
      <div class="filter-header" @click="toggleCollapse">
        <span class="filter-title">
          <t-icon name="filter" class="filter-icon" />
          筛选条件
        </span>
        <span class="filter-toggle">
          <span v-if="collapsed" class="toggle-hint">展开</span>
          <span v-else class="toggle-hint">收起</span>
          <t-icon :name="collapsed ? 'chevron-down' : 'chevron-up'" />
        </span>
      </div>
      <t-collapse-transition>
        <div v-show="!collapsed" class="filter-content">
          <slot></slot>
        </div>
      </t-collapse-transition>
    </template>

    <!-- 普通模式 -->
    <template v-else>
      <slot></slot>
    </template>
  </t-card>
</template>

<script setup lang="ts">
/**
 * 筛选卡片组件
 * 统一的筛选区域布局
 * 支持展开/收起功能
 */
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  /** 是否可折叠 */
  collapsible?: boolean
  /** 默认是否折叠 */
  defaultCollapsed?: boolean
}>(), {
  collapsible: false,
  defaultCollapsed: false
})

const collapsed = ref(props.defaultCollapsed)

// 监听props变化
watch(() => props.defaultCollapsed, (val) => {
  collapsed.value = val
})

function toggleCollapse() {
  collapsed.value = !collapsed.value
}
</script>

<style scoped>
.filter-card {
  margin-bottom: 16px;
}

:deep(.t-card__body) {
  padding: 16px 24px;
}

/* 可折叠模式样式 */
.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  padding: 4px 0;
  transition: color var(--transition-fast);
}

.filter-header:hover {
  color: var(--color-primary);
}

.filter-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.filter-icon {
  color: var(--color-text-tertiary);
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.toggle-hint {
  font-size: var(--font-size-xs);
}

.filter-content {
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
  margin-top: 12px;
}

/* 响应式 */
@media (max-width: 768px) {
  :deep(.t-card__body) {
    padding: 12px 16px;
  }
}
</style>
