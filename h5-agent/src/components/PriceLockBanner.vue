<script setup lang="ts">
/**
 * 锁价提示横幅组件
 * @since 2026-01-21
 *
 * 显示当前有效的锁价信息和倒计时
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  getActivePriceLock,
  getPriceLockConfig,
  PriceLockStatus,
  type PriceLockDetail,
  type PriceLockConfig
} from '../api/priceLock'

const props = defineProps<{
  customerPhone: string
  show?: boolean
}>()

const emit = defineEmits<{
  (e: 'use-lock', priceLock: PriceLockDetail): void
}>()


// 数据
const config = ref<PriceLockConfig | null>(null)
const priceLock = ref<PriceLockDetail | null>(null)
const loading = ref(false)

// 倒计时
const remainingTime = ref('')
const countdownTimer = ref<number | null>(null)

// 是否显示
const visible = computed(() => {
  return props.show !== false && config.value?.enabled && priceLock.value?.status === PriceLockStatus.ACTIVE
})

// 加载配置
const loadConfig = async () => {
  try {
    config.value = await getPriceLockConfig()
  } catch {
    // 忽略
  }
}

// 加载锁价
const loadPriceLock = async () => {
  if (!props.customerPhone || !config.value?.enabled) return

  loading.value = true
  try {
    priceLock.value = await getActivePriceLock(props.customerPhone)
    if (priceLock.value) {
      startCountdown()
    }
  } catch {
    // 忽略
  } finally {
    loading.value = false
  }
}

// 开始倒计时
const startCountdown = () => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
  }

  const updateCountdown = () => {
    if (!priceLock.value || priceLock.value.status !== PriceLockStatus.ACTIVE) {
      remainingTime.value = ''
      return
    }

    const seconds = priceLock.value.remainingSeconds
    if (seconds <= 0) {
      remainingTime.value = '已过期'
      // 重新加载
      loadPriceLock()
      return
    }

    // 更新剩余秒数
    priceLock.value.remainingSeconds--

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    remainingTime.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  updateCountdown()
  countdownTimer.value = window.setInterval(updateCountdown, 1000)
}

// 使用锁价
const useLock = () => {
  if (priceLock.value) {
    emit('use-lock', priceLock.value)
  }
}

// 监听手机号变化
watch(() => props.customerPhone, () => {
  loadPriceLock()
})

onMounted(async () => {
  await loadConfig()
  await loadPriceLock()
})

onUnmounted(() => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
  }
})

// 暴露方法供父组件调用
defineExpose({
  refresh: loadPriceLock
})
</script>

<template>
  <div class="price-lock-banner" v-if="visible">
    <div class="banner-content">
      <div class="lock-icon">
        <t-icon name="lock-on" size="20px" />
      </div>
      <div class="lock-info">
        <div class="lock-title">已锁定当前优惠价</div>
        <div class="lock-desc">
          <span class="countdown">{{ remainingTime }}</span>
          <span class="tip">内到店有效</span>
        </div>
      </div>
      <div class="lock-action">
        <t-button theme="primary" size="small" @click="useLock">
          立即预约
        </t-button>
      </div>
    </div>
    <div class="banner-warning">
      <t-icon name="info-circle" size="12px" />
      锁定期结束后价格可能上涨
    </div>
  </div>
</template>

<style scoped>
.price-lock-banner {
  background: linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%);
  border: 1px solid #ffe58f;
  border-radius: 12px;
  overflow: hidden;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.lock-icon {
  width: 40px;
  height: 40px;
  background: #E53935;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.lock-info {
  flex: 1;
}

.lock-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.lock-desc {
  font-size: 13px;
}

.countdown {
  color: #E53935;
  font-weight: 600;
  font-family: monospace;
}

.tip {
  color: #666;
}

.lock-action {
  flex-shrink: 0;
}

.banner-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.03);
  font-size: 12px;
  color: #8c6d00;
}
</style>
