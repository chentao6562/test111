<template>
  <span :class="amountClass">
    <span v-if="showPrefix" class="prefix">{{ prefix }}</span>
    <span class="value">{{ formattedValue }}</span>
    <span v-if="showSuffix" class="suffix">{{ suffix }}</span>
  </span>
</template>

<script setup lang="ts">
/**
 * 金额文本组件
 * 统一的金额展示样式
 * Phase 4 Task 4.2
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: string | number | null | undefined
    prefix?: string
    suffix?: string
    decimals?: number
    highlight?: boolean
    showSign?: boolean
    bold?: boolean
    theme?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  }>(),
  {
    prefix: '¥',
    suffix: '',
    decimals: 2,
    highlight: false,
    showSign: false,
    bold: false,
    theme: 'default',
  }
)

const numValue = computed(() => {
  if (props.value === null || props.value === undefined) return 0
  const num = Number(props.value)
  return isNaN(num) ? 0 : num
})

const isNegative = computed(() => numValue.value < 0)

const formattedValue = computed(() => {
  const absValue = Math.abs(numValue.value).toFixed(props.decimals)
  if (props.showSign && numValue.value > 0) {
    return `+${absValue}`
  }
  if (props.showSign && numValue.value < 0) {
    return `-${absValue}`
  }
  return absValue
})

const showPrefix = computed(() => !!props.prefix)
const showSuffix = computed(() => !!props.suffix)

const amountClass = computed(() => [
  'amount-text',
  {
    highlight: props.highlight,
    negative: isNegative.value,
    bold: props.bold,
    [`theme-${props.theme}`]: props.theme !== 'default',
  },
])
</script>

<style scoped>
.amount-text {
  color: #333;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.amount-text.bold {
  font-weight: 600;
}

.amount-text.highlight {
  color: #e53935;
  font-weight: 500;
}

.amount-text.negative {
  color: #4caf50;
}

.amount-text.theme-primary {
  color: #0052d9;
}

.amount-text.theme-success {
  color: #00a870;
}

.amount-text.theme-warning {
  color: #ed7b2f;
}

.amount-text.theme-danger {
  color: #e34d59;
}

.prefix {
  margin-right: 2px;
}

.suffix {
  margin-left: 2px;
  font-size: 0.9em;
  color: #999;
}
</style>
