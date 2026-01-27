<template>
  <div class="spin-wheel-container">
    <!-- 转盘主体 -->
    <div class="wheel-wrapper">
      <!-- 发光背景 -->
      <div class="wheel-glow"></div>

      <!-- 转盘底座 -->
      <div class="wheel" :class="{ spinning: spinning }" :style="wheelStyle">
        <!-- 分割线 -->
        <div class="wheel-dividers">
          <div v-for="i in 6" :key="i" class="divider" :style="{ transform: `rotate(${i * 30}deg)` }"></div>
        </div>

        <!-- 奖品图标 -->
        <div
          v-for="(prize, index) in prizes"
          :key="index"
          class="prize-item"
          :style="getPrizePosition(index)"
        >
          <div class="prize-icon" :class="getPrizeClass(prize)">
            <span class="prize-symbol">{{ getPrizeSymbol(prize) }}</span>
          </div>
          <span class="prize-label">{{ prize.name }}</span>
        </div>

        <!-- 虚线圆圈装饰 -->
        <div class="dashed-circle"></div>
      </div>

      <!-- 中心抽奖按钮 -->
      <div class="center-button-wrapper" @click="handleSpin">
        <!-- 指针 -->
        <div class="wheel-pointer"></div>

        <!-- 按钮外圈（金色） -->
        <div class="button-outer" :class="{ 'pulse-animation': !spinning && canSpin }">
          <!-- 按钮内圈（红色） -->
          <div class="button-inner">
            <span class="btn-text">{{ spinning ? '抽奖中' : '抽奖' }}</span>
            <span class="btn-count">还剩{{ remainingSpins || 0 }}次</span>
          </div>
        </div>

        <!-- 点击手势图标 -->
        <div class="hand-icon" v-if="!spinning && canSpin">
          <span class="hand">👆</span>
        </div>
      </div>
    </div>

    <!-- 新用户提示 -->
    <div class="new-user-tip" v-if="isNewUser">
      <p class="tip-text">你是活动<span class="highlight">新用户</span>，超容易提现</p>
      <p class="tip-sub">- 活动新用户指10日内未参与现金大转盘活动的用户 -</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type CSSProperties } from 'vue'

interface Prize {
  name: string
  amount: number
  color?: string
  type?: 'redpack' | 'cash' | 'coupon' | 'coin'
}

const props = defineProps<{
  prizes: Prize[]
  remainingSpins?: number
  disabled?: boolean
  isNewUser?: boolean
}>()

const emit = defineEmits<{
  spin: []
  spinEnd: [prizeIndex: number]
}>()

const spinning = ref(false)
const currentRotation = ref(0)

// 转盘旋转样式
const wheelStyle = computed<CSSProperties>(() => {
  if (spinning.value) {
    return {
      transform: `rotate(${currentRotation.value}deg)`,
    }
  }
  return {}
})

// 是否可以抽奖
const canSpin = computed(() => {
  return !props.disabled && (props.remainingSpins === undefined || props.remainingSpins > 0)
})

// 获取奖品位置（8个奖品围成圆形）
function getPrizePosition(index: number) {
  const total = props.prizes.length || 8
  const angle = (360 / total) * index - 90 // 从顶部开始
  const radius = 110 // 距离中心的半径
  const radian = (angle * Math.PI) / 180
  const x = Math.cos(radian) * radius
  const y = Math.sin(radian) * radius

  return {
    transform: `translate(${x}px, ${y}px)`
  }
}

// 获取奖品样式类
function getPrizeClass(prize: Prize) {
  const type = prize.type || detectPrizeType(prize.name)
  return `prize-${type}`
}

// 根据名称检测奖品类型
function detectPrizeType(name: string): string {
  if (name.includes('红包')) return 'redpack'
  if (name.includes('现金') || name.includes('元')) return 'cash'
  if (name.includes('券') || name.includes('福利')) return 'coupon'
  if (name.includes('金币') || name.includes('碎片')) return 'coin'
  return 'cash'
}

// 获取奖品符号
function getPrizeSymbol(prize: Prize) {
  const type = prize.type || detectPrizeType(prize.name)
  switch (type) {
    case 'redpack': return '¥'
    case 'cash': return '💰'
    case 'coupon': return '🎫'
    case 'coin': return '🪙'
    default: return '¥'
  }
}

// 点击抽奖
function handleSpin() {
  console.log('[转盘组件] 点击抽奖', { spinning: spinning.value, disabled: props.disabled, remainingSpins: props.remainingSpins })

  if (spinning.value) {
    console.log('[转盘组件] 正在抽奖中，忽略点击')
    return
  }

  // 即使disabled也要emit事件，让父组件处理提示
  if (props.disabled) {
    console.log('[转盘组件] 已禁用，emit事件让父组件显示提示')
    emit('spin')
    return
  }

  if (props.remainingSpins !== undefined && props.remainingSpins <= 0) {
    console.log('[转盘组件] 次数用完，emit事件让父组件显示提示')
    emit('spin')
    return
  }

  emit('spin')
}

// 开始旋转到指定奖品
function spinTo(prizeIndex: number) {
  if (spinning.value) return

  // 计算目标角度
  const total = props.prizes.length || 8
  const itemAngle = 360 / total
  // 目标奖品的中心角度（从12点钟方向开始计算）
  const targetAngle = itemAngle * prizeIndex + itemAngle / 2
  // 需要旋转的角度（顺时针旋转多圈 + 到达目标位置）
  const rotations = 5 // 旋转5圈
  const finalRotation = currentRotation.value + rotations * 360 + (360 - targetAngle)

  // 先设置旋转角度，再设置spinning状态触发动画
  currentRotation.value = finalRotation
  spinning.value = true

  console.log('[转盘] 开始旋转, 目标索引:', prizeIndex, '旋转角度:', finalRotation)

  // 动画结束后
  setTimeout(() => {
    spinning.value = false
    emit('spinEnd', prizeIndex)
    console.log('[转盘] 旋转结束')
  }, 4000)
}

// 暴露方法给父组件
defineExpose({
  spinTo,
  spinning
})
</script>

<style scoped>
.spin-wheel-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  position: relative;
}

.wheel-wrapper {
  position: relative;
  width: 300px;
  height: 300px;
}

/* 发光背景 */
.wheel-glow {
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
  border-radius: 50%;
  filter: blur(20px);
}

/* 转盘主体 */
.wheel {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #fff;
  border: 8px solid #FFD4A0;
  position: relative;
  box-shadow:
    0 0 20px rgba(0, 0, 0, 0.2),
    inset 0 0 10px rgba(255, 255, 255, 0.5);
  transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);
}

/* 分割线 */
.wheel-dividers {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

.divider {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 10%, rgba(255, 200, 150, 0.3) 50%, transparent 90%);
  transform-origin: center;
}

/* 虚线圆圈装饰 */
.dashed-circle {
  position: absolute;
  inset: 10px;
  border: 2px dashed rgba(255, 200, 150, 0.4);
  border-radius: 50%;
  pointer-events: none;
}

/* 奖品项 */
.prize-item {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: -25px;
  margin-left: -20px;
}

.prize-icon {
  width: 36px;
  height: 40px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.prize-icon.prize-redpack {
  background: linear-gradient(135deg, #FF5F5F 0%, #E02E24 100%);
  border: 1px solid #FFD700;
  color: #FFD700;
}

.prize-icon.prize-cash {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border: 2px solid #FFE4B5;
  color: #fff;
}

.prize-icon.prize-coupon {
  background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
  border: 1px solid #81C784;
  color: #fff;
}

.prize-icon.prize-coin {
  background: linear-gradient(135deg, #FFD700 0%, #FFC107 100%);
  border: 2px solid #FFE082;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  color: #fff;
}

.prize-symbol {
  font-size: 16px;
}

.prize-label {
  font-size: 10px;
  color: #666;
  margin-top: 4px;
  white-space: nowrap;
}

/* 中心按钮包装 */
.center-button-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 10;
}

/* 指针 */
.wheel-pointer {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 15px solid transparent;
  border-right: 15px solid transparent;
  border-bottom: 25px solid #FFD700;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2));
  z-index: 11;
}

/* 按钮外圈（金色渐变） */
.button-outer {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
  padding: 4px;
  box-shadow: 0 4px 15px rgba(255, 165, 0, 0.5);
}

/* 脉冲动画 */
.pulse-animation {
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(224, 46, 36, 0.7);
  }
  70% {
    transform: scale(1.05);
    box-shadow: 0 0 0 15px rgba(224, 46, 36, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(224, 46, 36, 0);
  }
}

/* 按钮内圈（红色渐变） */
.button-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(180deg, #FF5F5F 0%, #E02E24 100%);
  border: 4px solid #FFD700;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s;
}

.button-inner:active {
  transform: scale(0.95);
}

.btn-text {
  font-size: 20px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.btn-count {
  font-size: 10px;
  font-weight: bold;
  color: #FFE082;
  margin-top: 4px;
}

/* 手势图标 */
.hand-icon {
  position: absolute;
  bottom: -10px;
  right: -10px;
  animation: bounce-hand 1s ease-in-out infinite;
}

.hand {
  font-size: 28px;
  transform: rotate(-15deg);
  display: inline-block;
}

@keyframes bounce-hand {
  0%, 100% {
    transform: translateY(0) rotate(-12deg);
  }
  50% {
    transform: translateY(-8px) rotate(-12deg);
  }
}

/* 新用户提示 */
.new-user-tip {
  position: absolute;
  bottom: -60px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: 10px 20px;
  text-align: center;
  width: 80%;
  max-width: 280px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.tip-text {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
}

.tip-text .highlight {
  color: #FFD700;
}

.tip-sub {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4px;
}
</style>
