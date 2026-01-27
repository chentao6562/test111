<script setup lang="ts">
import { computed } from 'vue'

// Props定义
interface Props {
  // 图标名称（TDesign图标）
  icon?: string
  // 图标大小
  iconSize?: string
  // 主文本
  text?: string
  // 副文本
  description?: string
  // 按钮文本
  buttonText?: string
  // 按钮主题：'primary' | 'default'
  buttonTheme?: 'primary' | 'default'
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'inbox',
  iconSize: '64px',
  text: '暂无数据',
  description: '',
  buttonText: '',
  buttonTheme: 'primary'
})

// Emits
const emit = defineEmits<{
  buttonClick: []
}>()

// 按钮样式类
const buttonClass = computed(() => {
  return props.buttonTheme === 'primary' ? 'btn-primary' : 'btn-default'
})
</script>

<template>
  <div class="empty-state">
    <!-- 图标 -->
    <div class="empty-icon">
      <t-icon :name="icon" :size="iconSize" color="#d9d9d9" />
    </div>

    <!-- 主文本 -->
    <div class="empty-text">{{ text }}</div>

    <!-- 副文本 -->
    <div v-if="description" class="empty-description">
      {{ description }}
    </div>

    <!-- 操作按钮 -->
    <div v-if="buttonText" class="empty-action">
      <button :class="buttonClass" @click="emit('buttonClick')">
        {{ buttonText }}
      </button>
    </div>

    <!-- 插槽：自定义内容 -->
    <div v-if="$slots.default" class="empty-slot">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 32px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.6;
  max-width: 300px;
  margin-bottom: 24px;
}

.empty-action {
  margin-top: 16px;
}

.btn-primary,
.btn-default {
  padding: 10px 32px;
  border-radius: 99px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #EF062D 0%, #FF4D6D 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(239, 6, 45, 0.3);
}

.btn-primary:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(239, 6, 45, 0.4);
}

.btn-default {
  background: #f5f5f5;
  color: var(--text-primary);
}

.btn-default:active {
  background: #e0e0e0;
}

.empty-slot {
  margin-top: 24px;
  width: 100%;
}
</style>
