<template>
  <div class="order-card" @click="handleClick">
    <!-- 批量选择模式 -->
    <t-checkbox
      v-if="selectable"
      v-model="checked"
      class="order-checkbox"
      @click.stop="handleCheckChange"
    />

    <div class="order-content">
      <!-- 订单头部 -->
      <div class="order-header">
        <span class="order-no">订单号: {{ order.orderNo }}</span>
        <t-tag :theme="statusConfig.theme" size="small">
          {{ statusConfig.text }}
        </t-tag>
      </div>

      <!-- 客户信息 -->
      <div class="order-info">
        <div class="info-item">
          <span class="label">客户:</span>
          <span class="value">{{ customerName }}</span>
        </div>
        <div class="info-item">
          <span class="label">电话:</span>
          <span class="value">{{ customerPhone }}</span>
        </div>
      </div>

      <!-- 金额信息 -->
      <div class="order-amount">
        <div class="amount-item">
          <span class="label">订单金额:</span>
          <span class="value amount">{{ formatPrice(order.totalAmount) }}</span>
        </div>
        <div class="amount-item" v-if="order.needTransfer">
          <span class="label">移库费:</span>
          <span class="value">{{ formatPrice(order.transferFee) }}</span>
        </div>
      </div>

      <!-- 支付状态 -->
      <div class="payment-status">
        <t-tag
          :theme="order.fullPaid ? 'success' : 'default'"
          size="small"
          variant="outline"
        >
          {{ order.fullPaid ? '已付款' : '未付款' }}
        </t-tag>
        <span v-if="order.needTransfer" class="transfer-tag">需移库</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatPrice } from '@/utils/format'
import { ORDER_STATUS_MAP } from '@/utils/constants'
import type { Order } from '@/types'

interface Props {
  order: Order
  selectable?: boolean
  modelValue?: boolean
}

interface Emits {
  (e: 'click', order: Order): void
  (e: 'update:modelValue', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  selectable: false,
  modelValue: false
})

const emit = defineEmits<Emits>()

const checked = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const statusConfig = computed(() => {
  const config = ORDER_STATUS_MAP[props.order.status]
  return {
    text: config.text,
    theme: getTheme(props.order.status)
  }
})

const customerName = computed(() => {
  const o: any = props.order as any
  return o.contactName || o.agentName || o.agent?.name || '-'
})

const customerPhone = computed(() => {
  const o: any = props.order as any
  return o.contactPhone || o.agentPhone || o.agent?.phone || '-'
})

function getTheme(status: string): string {
  const themeMap: Record<string, string> = {
    pending_accept: 'primary',
    preparing: 'warning',
    pending_transfer: 'success',
    pending_pickup: 'success',
    completed: 'success',
    cancelled: 'danger'
  }
  return themeMap[status] || 'default'
}

function handleClick(e: Event) {
  // 在批量选择模式下，点击卡片切换选中状态
  if (props.selectable) {
    checked.value = !checked.value
  } else {
    emit('click', props.order)
  }
}

function handleCheckChange(e: Event) {
  // 阻止事件冒泡，避免触发卡片点击
  e.stopPropagation()
  checked.value = !checked.value
}
</script>

<style scoped>
.order-card {
  background-color: var(--bg-white);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  gap: 12px;
}

.order-card:active {
  transform: scale(0.98);
}

.order-checkbox {
  flex-shrink: 0;
}

.order-content {
  flex: 1;
  min-width: 0;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.order-no {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.order-info {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.info-item {
  font-size: 13px;
}

.info-item .label {
  color: var(--text-tertiary);
  margin-right: 4px;
}

.info-item .value {
  color: var(--text-primary);
}

.order-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.amount-item {
  font-size: 13px;
}

.amount-item .label {
  color: var(--text-tertiary);
  margin-right: 4px;
}

.amount-item .value {
  color: var(--text-primary);
  font-weight: 500;
}

.amount-item .amount {
  color: var(--primary);
  font-size: 15px;
}

.payment-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.transfer-tag {
  font-size: 12px;
  color: var(--primary);
  padding: 2px 8px;
  border: 1px solid var(--primary);
  border-radius: 4px;
}
</style>
