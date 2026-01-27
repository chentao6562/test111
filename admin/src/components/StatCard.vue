<template>
  <div
    class="stat-card"
    :class="[
      `stat-card--${theme}`,
      {
        'stat-card--loading': loading,
        'stat-card--clickable': clickable,
        'stat-card--highlight': highlight
      }
    ]"
    @click="handleClick"
  >
    <!-- 加载状态骨架屏 -->
    <div v-if="loading" class="stat-skeleton">
      <div class="skeleton-icon"></div>
      <div class="skeleton-content">
        <div class="skeleton-label"></div>
        <div class="skeleton-value"></div>
        <div class="skeleton-trend"></div>
      </div>
    </div>

    <!-- 正常内容 -->
    <div v-else class="stat-content">
      <div class="stat-icon" :class="[`stat-icon--${theme}`]">
        <t-icon :name="icon" :size="iconSize" />
      </div>
      <div class="stat-info">
        <div class="stat-label">{{ label }}</div>
        <div class="stat-value" :class="[valueClass]">
          <span v-if="prefix" class="stat-prefix">{{ prefix }}</span>
          <span class="stat-number">{{ displayValue }}</span>
          <span v-if="suffix" class="stat-suffix">{{ suffix }}</span>
        </div>
        <div v-if="trend !== undefined" class="stat-trend" :class="[trendClass]">
          <t-icon :name="trendIcon" size="14px" />
          <span>{{ trendPrefix }}{{ Math.abs(trend) }}%</span>
          <span class="trend-label">{{ trendLabel }}</span>
        </div>
        <div v-else-if="description" class="stat-description">
          {{ description }}
        </div>
      </div>
      <!-- 右上角徽章 -->
      <div v-if="badge" class="stat-badge" :class="[`stat-badge--${badgeTheme}`]">
        {{ badge }}
      </div>
    </div>

    <!-- 高亮动画效果 -->
    <div v-if="highlight" class="highlight-effect"></div>
  </div>
</template>

<script setup lang="ts">
/**
 * 统计卡片组件
 * 支持加载状态、点击交互、高亮效果
 */
import { computed } from 'vue'

type Theme = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'

const props = withDefaults(
  defineProps<{
    /** 标签文本 */
    label: string
    /** 数值 */
    value: string | number
    /** 图标名称 */
    icon: string
    /** 主题颜色 */
    theme?: Theme
    /** 数值前缀 */
    prefix?: string
    /** 数值后缀 */
    suffix?: string
    /** 趋势百分比（正数上涨，负数下跌） */
    trend?: number
    /** 趋势标签 */
    trendLabel?: string
    /** 图标大小 */
    iconSize?: string
    /** 是否加载中 */
    loading?: boolean
    /** 是否可点击 */
    clickable?: boolean
    /** 是否高亮显示 */
    highlight?: boolean
    /** 右上角徽章文字 */
    badge?: string | number
    /** 徽章主题 */
    badgeTheme?: Theme
    /** 描述文字（与trend互斥） */
    description?: string
  }>(),
  {
    theme: 'primary',
    prefix: '',
    suffix: '',
    trendLabel: '较昨日',
    iconSize: '22px',
    loading: false,
    clickable: false,
    highlight: false,
    badgeTheme: 'primary',
  }
)

const emit = defineEmits<{
  click: []
}>()

const displayValue = computed(() => {
  const num = typeof props.value === 'string' ? parseFloat(props.value) : props.value
  if (isNaN(num)) return props.value
  // 大数字格式化
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toLocaleString('zh-CN')
})

const valueClass = computed(() => {
  if (props.theme === 'danger') return 'value-danger'
  if (props.theme === 'warning') return 'value-warning'
  if (props.theme === 'success') return 'value-success'
  return ''
})

const trendClass = computed(() => {
  if (props.trend === undefined) return ''
  return props.trend >= 0 ? 'trend-up' : 'trend-down'
})

const trendIcon = computed(() => {
  if (props.trend === undefined) return ''
  return props.trend >= 0 ? 'arrow-up' : 'arrow-down'
})

const trendPrefix = computed(() => {
  if (props.trend === undefined) return ''
  return props.trend >= 0 ? '+' : ''
})

function handleClick() {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<style scoped>
.stat-card {
  position: relative;
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  padding: var(--stat-card-padding);
  border: 1px solid var(--color-border-light);
  transition: all var(--transition-normal);
  overflow: hidden;
}

.stat-card:hover {
  box-shadow: var(--shadow-card-hover);
  border-color: var(--color-border-default);
}

.stat-card--clickable {
  cursor: pointer;
}

.stat-card--clickable:hover {
  transform: translateY(-2px);
}

.stat-card--clickable:active {
  transform: translateY(0);
}

/* 高亮效果 */
.stat-card--highlight {
  border-color: var(--color-primary-border);
  background: linear-gradient(135deg, var(--color-bg-card) 0%, var(--color-primary-lighter) 100%);
}

.stat-card--highlight::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
}

.highlight-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: var(--radius-xl);
  pointer-events: none;
  animation: pulse-highlight 2s ease-in-out infinite;
}

@keyframes pulse-highlight {
  0%, 100% {
    box-shadow: inset 0 0 0 1px var(--color-primary-border);
  }
  50% {
    box-shadow: inset 0 0 0 2px var(--color-primary-border);
  }
}

/* 内容布局 */
.stat-content {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-lg);
}

/* 图标样式 */
.stat-icon {
  width: var(--stat-card-icon-size);
  height: var(--stat-card-icon-size);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon--primary {
  background: linear-gradient(135deg, var(--color-primary-lighter) 0%, var(--color-primary-light) 100%);
  color: var(--color-primary);
}

.stat-icon--success {
  background: linear-gradient(135deg, var(--color-success-lighter) 0%, var(--color-success-light) 100%);
  color: var(--color-success);
}

.stat-icon--warning {
  background: linear-gradient(135deg, var(--color-warning-lighter) 0%, var(--color-warning-light) 100%);
  color: var(--color-warning);
}

.stat-icon--danger {
  background: linear-gradient(135deg, var(--color-danger-lighter) 0%, var(--color-danger-light) 100%);
  color: var(--color-danger);
}

.stat-icon--info {
  background: linear-gradient(135deg, var(--color-info-lighter) 0%, var(--color-info-light) 100%);
  color: var(--color-info);
}

.stat-icon--default {
  background: linear-gradient(135deg, #f8f8f8 0%, #f0f0f0 100%);
  color: var(--color-text-tertiary);
}

/* 信息区域 */
.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-sm);
  font-weight: var(--font-weight-medium);
}

.stat-value {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: 1.2;
  display: flex;
  align-items: baseline;
  gap: 2px;
  letter-spacing: -0.5px;
}

.stat-prefix {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.stat-suffix {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-normal);
  color: var(--color-text-tertiary);
  margin-left: var(--spacing-xs);
}

/* 数值颜色 */
.value-danger { color: var(--color-danger); }
.value-warning { color: var(--color-warning); }
.value-success { color: var(--color-success); }

/* 趋势指示 */
.stat-trend {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-sm);
  font-weight: var(--font-weight-medium);
}

.stat-trend.trend-up {
  color: var(--color-success);
}

.stat-trend.trend-down {
  color: var(--color-danger);
}

.trend-label {
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-normal);
  margin-left: var(--spacing-xs);
}

/* 描述文字 */
.stat-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-sm);
}

/* 徽章 */
.stat-badge {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.stat-badge--primary {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.stat-badge--success {
  background: var(--color-success-light);
  color: var(--color-success);
}

.stat-badge--warning {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.stat-badge--danger {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.stat-badge--info {
  background: var(--color-info-light);
  color: var(--color-info);
}

.stat-badge--default {
  background: var(--color-bg-hover);
  color: var(--color-text-tertiary);
}

/* 骨架屏加载状态 */
.stat-card--loading {
  pointer-events: none;
}

.stat-skeleton {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-lg);
}

.skeleton-icon {
  width: var(--stat-card-icon-size);
  height: var(--stat-card-icon-size);
  border-radius: var(--radius-lg);
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-content {
  flex: 1;
}

.skeleton-label {
  width: 60px;
  height: 14px;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  margin-bottom: var(--spacing-sm);
}

.skeleton-value {
  width: 100px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  animation-delay: 0.1s;
  margin-bottom: var(--spacing-sm);
}

.skeleton-trend {
  width: 80px;
  height: 14px;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  animation-delay: 0.2s;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
