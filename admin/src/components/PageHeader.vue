<template>
  <div class="page-header" :class="{ 'page-header--bordered': bordered }">
    <div class="page-header-main">
      <div class="page-header-title-row">
        <h1 class="page-title">{{ title }}</h1>
        <div v-if="$slots.titleExtra" class="page-title-extra">
          <slot name="titleExtra" />
        </div>
      </div>
      <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
      <div v-if="$slots.description" class="page-description">
        <slot name="description" />
      </div>
    </div>
    <div v-if="$slots.actions" class="page-header-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 页面标题组件
 * 统一页面顶部标题区域的样式
 */
defineProps<{
  /** 页面标题 */
  title: string
  /** 副标题/描述 */
  subtitle?: string
  /** 是否显示底部边框 */
  bordered?: boolean
}>()
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-2xl);
}

.page-header--bordered {
  padding-bottom: var(--spacing-xl);
  border-bottom: 1px solid var(--color-border-light);
}

.page-header-main {
  flex: 1;
  min-width: 200px;
}

.page-header-title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.page-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.3;
}

.page-title-extra {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.page-subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin: var(--spacing-xs) 0 0 0;
  line-height: 1.5;
}

.page-description {
  margin-top: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .page-header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .page-title {
    font-size: var(--font-size-xl);
  }
}
</style>
