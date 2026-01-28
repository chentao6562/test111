<template>
  <div class="bgm-player" v-if="bgmUrl" @click="togglePlay">
    <div :class="['bgm-icon', { playing: isPlaying, rotating: isPlaying }]">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path v-if="isPlaying" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        <path v-else d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zm-2 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" opacity="0.5"/>
      </svg>
    </div>
  </div>
  <audio
    ref="audioRef"
    :src="bgmUrl"
    loop
    preload="auto"
    @canplaythrough="onCanPlay"
    @error="onError"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { get } from '../api'

// BGM数据
interface BgmData {
  id: number
  name: string
  url: string
  duration: number | null
}

const bgmUrl = ref<string>('')
const isPlaying = ref(false)
const audioRef = ref<HTMLAudioElement | null>(null)
const hasUserInteracted = ref(false)

// 获取随机BGM
const fetchRandomBgm = async () => {
  try {
    const res = await get<BgmData>('/bgm/random')
    if (res.data) {
      // 处理URL：如果是相对路径，添加服务器前缀
      let url = res.data.url
      if (url && !url.startsWith('http')) {
        // 使用相对路径让nginx代理
        url = url.startsWith('/') ? url : '/' + url
      }
      bgmUrl.value = url
    }
  } catch (error) {
    console.log('获取BGM失败，静默处理')
  }
}

// 音频可以播放
const onCanPlay = () => {
  // 如果用户已交互且用户偏好是播放，则尝试播放
  if (hasUserInteracted.value && getUserPreference()) {
    tryPlay()
  }
}

// 播放错误处理
const onError = () => {
  console.log('BGM加载失败，静默处理')
}

// 尝试播放
const tryPlay = async () => {
  if (!audioRef.value || !bgmUrl.value) return

  try {
    await audioRef.value.play()
    isPlaying.value = true
  } catch (error) {
    // 自动播放被阻止，这是正常的
    console.log('等待用户交互后播放')
  }
}

// 切换播放/暂停
const togglePlay = () => {
  if (!audioRef.value) return

  hasUserInteracted.value = true

  if (isPlaying.value) {
    audioRef.value.pause()
    isPlaying.value = false
    saveUserPreference(false)
  } else {
    audioRef.value.play().then(() => {
      isPlaying.value = true
      saveUserPreference(true)
    }).catch(() => {
      console.log('播放失败')
    })
  }
}

// 用户偏好存储
const STORAGE_KEY = 'bgm_preference'

const getUserPreference = (): boolean => {
  const stored = localStorage.getItem(STORAGE_KEY)
  // 默认开启
  return stored === null ? true : stored === 'true'
}

const saveUserPreference = (play: boolean) => {
  localStorage.setItem(STORAGE_KEY, String(play))
}

// 首次用户交互时尝试播放
const handleFirstInteraction = () => {
  if (hasUserInteracted.value) return

  hasUserInteracted.value = true

  // 如果用户偏好是播放，尝试播放
  if (getUserPreference() && bgmUrl.value) {
    tryPlay()
  }

  // 移除监听器
  document.removeEventListener('touchstart', handleFirstInteraction)
  document.removeEventListener('click', handleFirstInteraction)
}

onMounted(() => {
  // 获取随机BGM
  fetchRandomBgm()

  // 监听首次用户交互
  document.addEventListener('touchstart', handleFirstInteraction, { once: true })
  document.addEventListener('click', handleFirstInteraction, { once: true })
})

onUnmounted(() => {
  document.removeEventListener('touchstart', handleFirstInteraction)
  document.removeEventListener('click', handleFirstInteraction)
})
</script>

<style scoped>
.bgm-player {
  position: fixed;
  right: 16px;
  top: 100px;
  z-index: 999;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);
  transition: transform 0.2s;
}

.bgm-player:active {
  transform: scale(0.95);
}

.bgm-icon {
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bgm-icon.rotating {
  animation: rotate 3s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
