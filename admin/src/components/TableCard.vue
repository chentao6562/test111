<template>
  <t-card class="table-card" :bordered="false">
    <template #header>
      <div class="table-header">
        <div class="table-title">
          <span class="title-bar"></span>
          <span>{{ title }}</span>
          <span v-if="subtitle" class="subtitle">{{ subtitle }}</span>
        </div>
        <t-space>
          <slot name="actions"></slot>
        </t-space>
      </div>
    </template>

    <slot></slot>
  </t-card>
</template>

<script setup lang="ts">
/**
 * 表格卡片组件
 * 统一的表格区域布局（含标题栏和操作按钮）
 * Phase 4 Task 4.2
 */

defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<style scoped>
.table-card {
  margin-bottom: 16px;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.title-bar {
  width: 4px;
  height: 18px;
  background: var(--td-brand-color, #0052d9);
  border-radius: 2px;
}

.subtitle {
  font-size: 14px;
  font-weight: 400;
  color: #999;
}

:deep(.t-card__body) {
  padding: 0 24px 24px;
}
</style>
