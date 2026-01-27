<template>
  <div class="product-cell">
    <img class="product-image" :src="imageUrl" :alt="name" @error="handleImageError" />
    <div class="product-info">
      <div class="product-name" :title="name">{{ name }}</div>
      <div v-if="showSpec" class="product-spec">
        <slot name="spec">
          <span v-if="quantity">数量: {{ quantity }}{{ unit }}</span>
          <span v-if="extraText" class="extra">{{ extraText }}</span>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 商品单元格组件
 * 用于表格中展示商品信息（图片+名称+规格）
 * Phase 4 Task 4.2
 */
import { computed, ref } from 'vue'
import { getImageUrl } from '@/utils/image'

// Base64编码的SVG占位图（显示"无图片"文字）
const DEFAULT_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiNFNUU1RTUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIxMCI+5peg5Zu+54mHPC90ZXh0Pjwvc3ZnPg=='

const props = withDefaults(
  defineProps<{
    name: string
    image?: string | null
    images?: string | string[] | null
    quantity?: number
    unit?: string
    showSpec?: boolean
    extraText?: string
    placeholder?: string
  }>(),
  {
    unit: '件',
    showSpec: true,
    placeholder: DEFAULT_PLACEHOLDER,
  }
)

const imageFailed = ref(false)

const imageUrl = computed(() => {
  if (imageFailed.value) return props.placeholder

  let url = ''

  // 优先使用 image 属性
  if (props.image) {
    url = props.image
  } else if (props.images) {
    // 尝试解析 images JSON
    if (Array.isArray(props.images) && props.images.length > 0) {
      url = props.images[0]
    } else if (typeof props.images === 'string') {
      try {
        const parsed = JSON.parse(props.images)
        if (Array.isArray(parsed) && parsed.length > 0) {
          url = parsed[0]
        }
      } catch {
        // 如果不是 JSON，检查是否是逗号分隔的字符串
        if (props.images.includes(',')) {
          url = props.images.split(',')[0].trim()
        } else {
          url = props.images
        }
      }
    }
  }

  if (!url) return props.placeholder

  // 转换为完整URL
  return getImageUrl(url) || props.placeholder
})

function handleImageError() {
  imageFailed.value = true
}
</script>

<style scoped>
.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-image {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  background: #f5f5f5;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-spec {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.product-spec .extra {
  margin-left: 8px;
  color: #666;
}
</style>
