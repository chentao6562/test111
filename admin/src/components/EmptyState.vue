<template>
  <div class="empty-state" :class="[`empty-state--${size}`]">
    <div class="empty-icon">
      <slot name="icon">
        <component :is="iconComponent" />
      </slot>
    </div>
    <div class="empty-title">{{ title || defaultTitle }}</div>
    <div v-if="description" class="empty-description">{{ description }}</div>
    <div v-if="$slots.action" class="empty-action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 空状态组件
 * 统一各种空状态的展示样式
 */
import { computed, h } from 'vue'
import { Icon as TIcon } from 'tdesign-vue-next'

type EmptyType = 'data' | 'search' | 'network' | 'permission' | 'error'
type Size = 'small' | 'medium' | 'large'

const props = withDefaults(
  defineProps<{
    /** 空状态类型 */
    type?: EmptyType
    /** 标题文字（可覆盖默认值） */
    title?: string
    /** 描述文字 */
    description?: string
    /** 尺寸 */
    size?: Size
  }>(),
  {
    type: 'data',
    size: 'medium',
  }
)

const defaultTitles: Record<EmptyType, string> = {
  data: '暂无数据',
  search: '未找到结果',
  network: '网络错误',
  permission: '暂无权限',
  error: '加载失败',
}

const defaultTitle = computed(() => defaultTitles[props.type])

const iconConfigs: Record<EmptyType, { name: string; color: string }> = {
  data: { name: 'file-unknown', color: 'var(--color-text-placeholder)' },
  search: { name: 'search', color: 'var(--color-text-placeholder)' },
  network: { name: 'wifi-off', color: 'var(--color-warning)' },
  permission: { name: 'lock-on', color: 'var(--color-danger)' },
  error: { name: 'error-circle', color: 'var(--color-danger)' },
}

const iconComponent = computed(() => {
  const config = iconConfigs[props.type]
  return h(TIcon, {
    name: config.name,
    size: props.size === 'small' ? '48px' : props.size === 'large' ? '80px' : '64px',
    style: { color: config.color },
  })
})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-4xl) var(--spacing-2xl);
  text-align: center;
}

.empty-state--small {
  padding: var(--spacing-2xl) var(--spacing-lg);
}

.empty-state--large {
  padding: var(--spacing-5xl) var(--spacing-3xl);
}

.empty-icon {
  margin-bottom: var(--spacing-lg);
  opacity: 0.6;
}

.empty-state--small .empty-icon {
  margin-bottom: var(--spacing-md);
}

.empty-state--large .empty-icon {
  margin-bottom: var(--spacing-xl);
}

.empty-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.empty-state--small .empty-title {
  font-size: var(--font-size-base);
}

.empty-state--large .empty-title {
  font-size: var(--font-size-xl);
}

.empty-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  max-width: 300px;
  line-height: 1.5;
}

.empty-state--large .empty-description {
  font-size: var(--font-size-base);
  max-width: 400px;
}

.empty-action {
  margin-top: var(--spacing-xl);
}

.empty-state--small .empty-action {
  margin-top: var(--spacing-lg);
}
</style>
