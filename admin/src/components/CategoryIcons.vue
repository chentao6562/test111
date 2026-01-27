<template>
  <!-- 图标选择器弹窗 -->
  <t-dialog
    v-model:visible="visible"
    header="选择分类图标"
    :footer="false"
    width="560px"
  >
    <div class="icon-grid">
      <div
        v-for="icon in icons"
        :key="icon.key"
        class="icon-item"
        :class="{ selected: selectedIcon === icon.key }"
        @click="selectIcon(icon.key)"
      >
        <div class="icon-preview" v-html="icon.svg"></div>
        <span class="icon-name">{{ icon.name }}</span>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { icons } from './categoryIconsData'

const props = defineProps<{
  modelValue: boolean
  currentIcon?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'select': [iconKey: string]
}>()

const visible = ref(props.modelValue)
const selectedIcon = ref(props.currentIcon || '')

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

watch(() => props.currentIcon, (val) => {
  selectedIcon.value = val || ''
})

function selectIcon(iconKey: string) {
  selectedIcon.value = iconKey
  emit('select', iconKey)
  visible.value = false
}
</script>

<style scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 8px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border-radius: 12px;
  border: 2px solid transparent;
  background: #f8f8f8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-item:hover {
  background: #fff;
  border-color: #e53734;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(229, 55, 52, 0.15);
}

.icon-item.selected {
  background: #fef2f2;
  border-color: #e53734;
}

.icon-preview {
  width: 48px;
  height: 48px;
}

.icon-preview :deep(svg) {
  width: 100%;
  height: 100%;
}

.icon-name {
  font-size: 12px;
  color: #666;
  text-align: center;
}
</style>
