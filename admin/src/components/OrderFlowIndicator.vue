<template>
  <div class="order-flow" :class="[`order-flow--${size}`]">
    <div class="flow-steps">
      <template v-for="(step, index) in visibleSteps" :key="step.key">
        <!-- 步骤节点 -->
        <div
          class="flow-step"
          :class="{
            'flow-step--active': isStepActive(index),
            'flow-step--current': isStepCurrent(index),
            'flow-step--completed': isStepCompleted(index)
          }"
        >
          <div class="step-dot">
            <t-icon v-if="isStepCompleted(index)" name="check" size="12px" />
          </div>
          <span class="step-label">{{ step.label }}</span>
        </div>
        <!-- 连接线 -->
        <div
          v-if="index < visibleSteps.length - 1"
          class="flow-line"
          :class="{ 'flow-line--active': isStepCompleted(index) }"
        />
      </template>
    </div>
    <!-- 当前状态文字 -->
    <div v-if="showStatus" class="flow-status">
      <span class="status-label">当前状态：</span>
      <t-tag :theme="statusTheme" size="small">{{ statusText }}</t-tag>
      <span v-if="status === 'cancelled'" class="status-hint">（订单已取消）</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 订单流程指示器组件
 * 可视化展示订单的业务流程进度
 */
import { computed } from 'vue'

type OrderStatus =
  | 'pending_payment'
  | 'pending_accept'
  | 'preparing'
  | 'pending_transfer'
  | 'transferring'
  | 'pending_pickup'
  | 'completed'
  | 'cancelled'

type Size = 'small' | 'medium' | 'large'

interface Step {
  key: string
  label: string
}

const props = withDefaults(
  defineProps<{
    /** 订单状态 */
    status: OrderStatus
    /** 是否需要移库 */
    needTransfer?: boolean
    /** 尺寸 */
    size?: Size
    /** 是否显示状态文字 */
    showStatus?: boolean
  }>(),
  {
    needTransfer: false,
    size: 'medium',
    showStatus: true,
  }
)

// 状态映射
const STATUS_MAP: Record<OrderStatus, { text: string; theme: string }> = {
  pending_payment: { text: '待付款', theme: 'warning' },
  pending_accept: { text: '待接单', theme: 'primary' },
  preparing: { text: '备货中', theme: 'primary' },
  pending_transfer: { text: '待移库', theme: 'primary' },
  transferring: { text: '移库中', theme: 'primary' },
  pending_pickup: { text: '待提货', theme: 'success' },
  completed: { text: '已完成', theme: 'success' },
  cancelled: { text: '已取消', theme: 'default' },
}

// 自提模式步骤
const SELF_PICKUP_STEPS: Step[] = [
  { key: 'order', label: '下单' },
  { key: 'payment', label: '支付' },
  { key: 'prepare', label: '备货' },
  { key: 'pickup', label: '提货' },
  { key: 'complete', label: '完成' },
]

// 移库模式步骤
const TRANSFER_STEPS: Step[] = [
  { key: 'order', label: '下单' },
  { key: 'payment', label: '支付' },
  { key: 'prepare', label: '备货' },
  { key: 'transfer', label: '移库' },
  { key: 'pickup', label: '提货' },
  { key: 'complete', label: '完成' },
]

// 计算可见步骤
const visibleSteps = computed(() => {
  return props.needTransfer ? TRANSFER_STEPS : SELF_PICKUP_STEPS
})

// 获取当前进度（0-based index）
const currentProgress = computed(() => {
  const status = props.status

  if (status === 'cancelled') return -1
  if (status === 'completed') return visibleSteps.value.length - 1

  if (props.needTransfer) {
    // 移库模式
    switch (status) {
      case 'pending_payment': return 0
      case 'pending_accept': return 1
      case 'preparing': return 2
      case 'pending_transfer': return 3
      case 'transferring': return 3
      case 'pending_pickup': return 4
      default: return 0
    }
  } else {
    // 自提模式
    switch (status) {
      case 'pending_payment': return 0
      case 'pending_accept': return 1
      case 'preparing': return 2
      case 'pending_pickup': return 3
      default: return 0
    }
  }
})

// 判断步骤是否激活（已完成或当前）
function isStepActive(index: number): boolean {
  if (props.status === 'cancelled') return false
  return index <= currentProgress.value
}

// 判断是否为当前步骤
function isStepCurrent(index: number): boolean {
  if (props.status === 'cancelled') return false
  return index === currentProgress.value
}

// 判断步骤是否已完成
function isStepCompleted(index: number): boolean {
  if (props.status === 'cancelled') return false
  return index < currentProgress.value || props.status === 'completed'
}

// 状态文字
const statusText = computed(() => STATUS_MAP[props.status]?.text || props.status)
const statusTheme = computed(() => STATUS_MAP[props.status]?.theme || 'default')
</script>

<style scoped>
.order-flow {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* 步骤容器 */
.flow-steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
}

/* 步骤节点 */
.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  position: relative;
}

.step-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-normal);
  border: 2px solid var(--color-bg-card);
  box-shadow: var(--shadow-xs);
}

.flow-step--active .step-dot {
  background: var(--color-success);
}

.flow-step--current .step-dot {
  background: var(--color-primary);
  box-shadow: 0 0 0 4px var(--color-primary-border);
  animation: pulse-dot 2s ease-in-out infinite;
}

.flow-step--completed .step-dot {
  background: var(--color-success);
  color: white;
}

@keyframes pulse-dot {
  0%, 100% {
    box-shadow: 0 0 0 4px var(--color-primary-border);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(229, 55, 52, 0.1);
  }
}

.step-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
  transition: color var(--transition-fast);
}

.flow-step--active .step-label {
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
}

.flow-step--current .step-label {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

/* 连接线 */
.flow-line {
  flex: 1;
  height: 3px;
  min-width: 24px;
  max-width: 60px;
  background: var(--color-border-default);
  margin: 8px 4px 0;
  border-radius: 2px;
  transition: background var(--transition-normal);
}

.flow-line--active {
  background: linear-gradient(90deg, var(--color-success), var(--color-success-hover));
}

/* 状态文字 */
.flow-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-sm);
}

.status-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.status-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-placeholder);
}

/* 尺寸变体 */
.order-flow--small .step-dot {
  width: 16px;
  height: 16px;
}

.order-flow--small .step-label {
  font-size: 10px;
}

.order-flow--small .flow-line {
  min-width: 16px;
  max-width: 40px;
  height: 2px;
  margin-top: 6px;
}

.order-flow--large .step-dot {
  width: 24px;
  height: 24px;
}

.order-flow--large .step-label {
  font-size: var(--font-size-sm);
}

.order-flow--large .flow-line {
  min-width: 32px;
  max-width: 80px;
  height: 4px;
  margin-top: 10px;
}

/* 响应式 */
@media (max-width: 640px) {
  .flow-line {
    min-width: 16px;
    max-width: 32px;
  }
}
</style>
