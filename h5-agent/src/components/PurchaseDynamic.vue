<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import {
  DynamicDisplayManager,
  type PurchaseDynamic as DynamicType,
  type Product
} from '../utils/purchaseDynamic'

const props = defineProps<{
  products: Product[]
  position?: 'top' | 'bottom'
}>()

const isVisible = ref(false)
const currentDynamic = ref<DynamicType | null>(null)
const manager = ref<DynamicDisplayManager | null>(null)

// 初始化动态管理器
onMounted(() => {
  manager.value = new DynamicDisplayManager({
    onUpdate: (dynamic) => {
      currentDynamic.value = dynamic
    },
    onShow: () => {
      isVisible.value = true
    },
    onHide: () => {
      isVisible.value = false
    }
  })

  if (props.products && props.products.length > 0) {
    manager.value.setProducts(props.products)
    manager.value.start(3500, 8000, 18000)
  }
})

// 监听商品列表变化
watch(() => props.products, (newProducts) => {
  if (manager.value && newProducts && newProducts.length > 0) {
    manager.value.setProducts(newProducts)
    manager.value.start(3500, 8000, 18000)
  }
}, { deep: true })

onUnmounted(() => {
  if (manager.value) {
    manager.value.stop()
  }
})
</script>

<template>
  <Transition name="slide-fade">
    <div
      v-if="isVisible && currentDynamic"
      class="purchase-dynamic"
      :class="[position || 'bottom']"
    >
      <div class="dynamic-content">
        <span class="dynamic-icon">🔔</span>
        <span class="dynamic-text">
          <span class="phone">{{ currentDynamic.phone }}</span>
          <span class="city">（{{ currentDynamic.city }}）</span>
          <span class="time">{{ currentDynamic.time }}</span>
          预约了
          <span class="product-name">{{ currentDynamic.productName }}</span>
        </span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.purchase-dynamic {
  position: fixed;
  left: 16px;
  right: 16px;
  z-index: 999;
  pointer-events: none;
}

.purchase-dynamic.top {
  top: 60px;
}

.purchase-dynamic.bottom {
  bottom: 100px;
}

.dynamic-content {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, rgba(239, 6, 45, 0.95) 0%, rgba(180, 5, 35, 0.95) 100%);
  backdrop-filter: blur(10px);
  color: white;
  padding: 12px 16px;
  border-radius: 25px;
  box-shadow: 0 4px 20px rgba(239, 6, 45, 0.3);
  font-size: 13px;
  line-height: 1.4;
}

.dynamic-icon {
  font-size: 18px;
  flex-shrink: 0;
  animation: bell-shake 0.5s ease-in-out;
}

@keyframes bell-shake {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-10deg); }
  50% { transform: rotate(10deg); }
  75% { transform: rotate(-5deg); }
}

.dynamic-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.phone {
  font-weight: 600;
  color: #FFE566;
}

.city {
  color: rgba(255, 255, 255, 0.85);
}

.time {
  color: rgba(255, 255, 255, 0.75);
  margin-right: 2px;
}

.product-name {
  font-weight: 600;
  color: #FFE566;
}

/* 过渡动画 */
.slide-fade-enter-active {
  animation: slide-in 0.4s ease-out;
}

.slide-fade-leave-active {
  animation: slide-out 0.3s ease-in;
}

@keyframes slide-in {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-out {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-10px);
  }
}

/* 顶部位置动画方向相反 */
.purchase-dynamic.top .slide-fade-enter-active {
  animation: slide-in-top 0.4s ease-out;
}

.purchase-dynamic.top .slide-fade-leave-active {
  animation: slide-out-top 0.3s ease-in;
}

@keyframes slide-in-top {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-out-top {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(10px);
  }
}
</style>
