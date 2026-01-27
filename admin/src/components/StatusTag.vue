<template>
  <t-tag :theme="computedTheme" :variant="variant" :size="size">
    {{ computedLabel }}
  </t-tag>
</template>

<script setup lang="ts">
/**
 * 状态标签组件
 * 支持两种使用方式：
 * 1. type + text 模式（直接传入类型和文本）
 * 2. status + statusMap 模式（通过映射表匹配）
 * Phase 4 Task 4.2
 */
import { computed } from 'vue'

export interface StatusConfig {
  label: string
  color: 'primary' | 'success' | 'warning' | 'danger' | 'default'
}

const props = withDefaults(
  defineProps<{
    // 模式1：直接传入
    type?: 'primary' | 'success' | 'warning' | 'danger' | 'default'
    text?: string
    // 模式2：通过映射
    status?: string
    statusMap?: Record<string, StatusConfig>
    // 通用属性
    size?: 'small' | 'medium' | 'large'
    variant?: 'dark' | 'light' | 'outline' | 'light-outline'
  }>(),
  {
    size: 'small',
    variant: 'light',
  }
)

// 兼容旧版 statusMap 模式
const config = computed(() => {
  if (props.statusMap && props.status) {
    return props.statusMap[props.status] || { label: props.status, color: 'default' }
  }
  return null
})

// 计算主题色
const computedTheme = computed(() => {
  // 优先使用直接传入的 type
  if (props.type) {
    return props.type
  }
  // 否则使用 statusMap 模式
  return config.value?.color || 'default'
})

// 计算标签文本
const computedLabel = computed(() => {
  // 优先使用直接传入的 text
  if (props.text !== undefined) {
    return props.text
  }
  // 否则使用 statusMap 模式
  return config.value?.label || props.status || ''
})
</script>
