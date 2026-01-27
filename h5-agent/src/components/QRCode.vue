<script setup lang="ts">
/**
 * 二维码组件
 * 【2026-01-17 新增】用于生成预约核销二维码
 * 【2026-01-17 增强】暴露canvas引用，支持外部获取二维码图片
 */
import { ref, onMounted, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps<{
  content: string
  size?: number
}>()

const emit = defineEmits<{
  ready: []
}>()

const canvas = ref<HTMLCanvasElement>()

const generateQRCode = async () => {
  if (canvas.value && props.content) {
    try {
      await QRCode.toCanvas(canvas.value, props.content, {
        width: props.size || 200,
        margin: 2,
        color: {
          dark: '#333333',
          light: '#ffffff'
        }
      })
      // 二维码生成完成后触发ready事件
      emit('ready')
    } catch (error) {
      console.error('生成二维码失败:', error)
    }
  }
}

// 暴露canvas引用供父组件使用
defineExpose({
  canvas
})

onMounted(generateQRCode)
watch(() => props.content, generateQRCode)
</script>

<template>
  <div class="qrcode-container">
    <canvas ref="canvas" :width="size || 200" :height="size || 200"></canvas>
  </div>
</template>

<style scoped>
.qrcode-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.qrcode-container canvas {
  border-radius: 8px;
}
</style>
