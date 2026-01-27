<script setup lang="ts">
import { computed } from 'vue'

// Props定义
interface Props {
  // 状态值
  status: string
  // 状态类型：'order' | 'payment' | 'commission' | 'withdraw' | 'custom'
  type?: 'order' | 'payment' | 'commission' | 'withdraw' | 'custom'
  // 自定义文本（type为custom时使用）
  text?: string
  // 尺寸：'small' | 'medium' | 'large'
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'order',
  size: 'medium'
})

// 状态文本映射
const statusTextMap: Record<string, Record<string, string>> = {
  order: {
    'pending_confirm': '待确认',
    'pending_payment': '待付款',
    'pending_accept': '待接单',
    'preparing': '备货中',
    'pending_transfer': '待移库',
    'transferring': '移库中',
    'pending_pickup': '待提货',
    'completed': '已完成',
    'cancelled': '已取消'
  },
  payment: {
    'unpaid': '未付款',
    'deposit': '已付定金',
    'full_paid': '已付款',
    'partial': '部分支付'
  },
  commission: {
    'PENDING': '待结算',
    'SETTLED': '已结算',
    'CANCELLED': '已取消'
  },
  withdraw: {
    'PENDING': '审核中',
    'APPROVED': '已通过',
    'COMPLETED': '已到账',
    'REJECTED': '已拒绝'
  }
}

// 获取显示文本
const displayText = computed(() => {
  if (props.type === 'custom' && props.text) {
    return props.text
  }
  return statusTextMap[props.type]?.[props.status] || props.status
})

// 状态主题类
const themeClass = computed(() => {
  // 订单状态
  if (props.type === 'order') {
    if (props.status === 'completed') return 'success'
    if (props.status === 'cancelled') return 'error'
    if (props.status === 'pending_payment') return 'warning'
    if (props.status === 'transferring' || props.status === 'pending_transfer') return 'purple'
    return 'info'
  }

  // 支付状态
  if (props.type === 'payment') {
    if (props.status === 'full_paid') return 'success'
    if (props.status === 'deposit' || props.status === 'partial') return 'warning'
    return 'default'
  }

  // 分润状态
  if (props.type === 'commission') {
    if (props.status === 'SETTLED') return 'success'
    if (props.status === 'CANCELLED') return 'error'
    return 'warning'
  }

  // 提现状态
  if (props.type === 'withdraw') {
    if (props.status === 'COMPLETED') return 'success'
    if (props.status === 'REJECTED') return 'error'
    if (props.status === 'APPROVED') return 'info'
    return 'warning'
  }

  return 'default'
})

// 尺寸类
const sizeClass = computed(() => {
  return `size-${props.size}`
})
</script>

<template>
  <span class="status-tag" :class="[themeClass, sizeClass]">
    {{ displayText }}
  </span>
</template>

<style scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 99px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s ease;
}

/* 尺寸 */
.size-small {
  padding: 2px 10px;
  font-size: 11px;
  line-height: 18px;
}

.size-medium {
  padding: 4px 12px;
  font-size: 12px;
  line-height: 20px;
}

.size-large {
  padding: 6px 16px;
  font-size: 14px;
  line-height: 22px;
}

/* 主题色 */
.default {
  background: #f5f5f5;
  color: #8c8c8c;
}

.info {
  background: rgba(24, 144, 255, 0.1);
  color: #1890ff;
}

.success {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
}

.warning {
  background: rgba(250, 173, 20, 0.1);
  color: #faad14;
}

.error {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.purple {
  background: rgba(114, 46, 209, 0.1);
  color: #722ed1;
}

/* Hover效果（如果需要） */
.status-tag:hover {
  opacity: 0.85;
}
</style>
