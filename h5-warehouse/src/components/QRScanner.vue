<template>
  <!-- 【2026-01-20】改为全屏显示，扫码区域更大更方便操作 -->
  <t-popup v-model="visible" placement="center" :style="{ width: '100%', height: '100%' }">
    <div class="scanner-container">
      <div class="scanner-header">
        <div class="header-left" @click="handleClose">
          <t-icon name="chevron-left" size="24px" />
        </div>
        <span class="header-title">扫码核销</span>
        <div class="header-right"></div>
      </div>

      <div class="scanner-body">
        <!-- App环境显示原生扫码提示 -->
        <div v-if="isAppEnv" class="native-scan-hint">
          <div class="hint-icon">📷</div>
          <div class="hint-text">正在启动扫码...</div>
        </div>
        <!-- H5环境使用html5-qrcode -->
        <div v-else id="qr-reader" class="qr-reader"></div>
        <div v-if="!isAppEnv" class="scanner-tips">
          <p>请将二维码放入扫描框内</p>
          <p class="tips-small">支持提货码（6位/8位数字）</p>
        </div>
      </div>

      <!-- 【2026-01-20】底部提示区 -->
      <div class="scanner-footer">
        <div class="footer-tip">对准客户预约详情页的二维码</div>
      </div>
    </div>
  </t-popup>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import { Toast } from 'tdesign-mobile-vue'
import { vibrate, isInApp } from '@/utils/bridge'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', result: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = ref(false)
const isAppEnv = ref(false)
let scanner: Html5Qrcode | null = null

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
    if (val) {
      startScan()
    } else {
      stopScan()
    }
  },
  { immediate: true }
)

// 开始扫描
async function startScan() {
  // 检查是否在App环境
  isAppEnv.value = isInApp()

  if (isAppEnv.value) {
    // App环境：使用原生扫码
    startNativeScan()
  } else {
    // H5环境：使用html5-qrcode
    startH5Scan()
  }
}

// 启动原生扫码（Android App）
function startNativeScan() {
  try {
    // 生成唯一回调函数名
    const callbackName = `scanCallback_${Date.now()}`

    // 注册回调函数
    ;(window as any)[callbackName] = (resultJson: string) => {
      try {
        const result = JSON.parse(resultJson)
        if (result.success && result.code) {
          vibrate(200)
          emit('success', result.code)
        } else if (result.cancelled) {
          // 用户取消扫码
          console.log('用户取消扫码')
        } else {
          Toast({ message: result.error || '扫码失败', theme: 'error' })
        }
      } catch (e) {
        console.error('解析扫码结果失败:', e)
      }
      // 清理回调函数
      delete (window as any)[callbackName]
      handleClose()
    }

    // 调用原生扫码
    ;(window as any).AndroidBridge.scan(callbackName)
  } catch (error) {
    console.error('启动原生扫码失败:', error)
    Toast({ message: '扫码功能异常', theme: 'error' })
    handleClose()
  }
}

// 启动H5扫码
async function startH5Scan() {
  // 延迟执行，确保DOM已渲染
  await new Promise(resolve => setTimeout(resolve, 300))

  try {
    if (!scanner) {
      scanner = new Html5Qrcode('qr-reader')
    }

    await scanner.start(
      { facingMode: 'environment' }, // 后置摄像头
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      onScanSuccess,
      onScanError
    )
  } catch (error) {
    console.error('启动扫码失败:', error)
    Toast({
      message: '无法启动相机，请在App内使用或检查HTTPS',
      theme: 'error'
    })
    // 启动失败时自动关闭弹窗
    handleClose()
  }
}

// 停止扫描
async function stopScan() {
  if (scanner) {
    try {
      await scanner.stop()
      scanner.clear()
    } catch (error) {
      console.error('停止扫码失败:', error)
    }
  }
}

// H5扫描成功
function onScanSuccess(decodedText: string) {
  vibrate(200)
  emit('success', decodedText)
  handleClose()
}

// H5扫描错误（忽略，持续扫描）
function onScanError(error: string) {
  // 忽略扫描错误，继续扫描
}

// 关闭扫描器
function handleClose() {
  emit('update:modelValue', false)
}

// 组件卸载时清理
onBeforeUnmount(() => {
  stopScan()
})
</script>

<style scoped>
.scanner-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #000;
}

/* 【2026-01-20】全屏模式头部导航栏 */
.scanner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 50px;
  padding: 0 12px;
  background-color: rgba(0, 0, 0, 0.8);
}

.header-left,
.header-right {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
}

.header-left:active {
  opacity: 0.7;
}

.header-title {
  font-size: 17px;
  font-weight: 500;
  color: #fff;
}

.scanner-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.qr-reader {
  width: 100%;
  max-width: 400px;
}

.scanner-tips {
  margin-top: 24px;
  text-align: center;
  color: #fff;
}

.scanner-tips p {
  margin: 8px 0;
  font-size: 14px;
}

.tips-small {
  font-size: 12px;
  opacity: 0.7;
}

/* 【2026-01-20】底部提示区 */
.scanner-footer {
  padding: 20px 16px;
  background-color: rgba(0, 0, 0, 0.8);
}

.footer-tip {
  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}

/* 原生扫码提示 */
.native-scan-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 250px;
}

.hint-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.hint-text {
  color: #fff;
  font-size: 16px;
}
</style>
