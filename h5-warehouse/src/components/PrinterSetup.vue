<template>
  <t-popup v-model="visible" placement="bottom" :close-on-overlay-click="false">
    <div class="printer-setup">
      <!-- 头部 -->
      <div class="setup-header">
        <span class="title">打印机设置</span>
        <t-icon name="close" size="24px" @click="handleClose" />
      </div>

      <div class="setup-content">
        <!-- 蓝牙不支持提示 -->
        <div v-if="!bluetoothSupported" class="not-supported">
          <t-icon name="info-circle" size="48px" color="#ff9800" />
          <p class="message">{{ notSupportedMessage }}</p>
          <p class="hint">核销时将使用系统打印功能</p>
        </div>

        <!-- 蓝牙支持时显示配置 -->
        <div v-else class="bluetooth-config">
          <!-- 设备状态卡片 -->
          <div class="device-card" :class="statusClass">
            <div class="device-icon">
              <t-icon :name="statusIcon" size="36px" :color="statusColor" />
            </div>
            <div class="device-info">
              <span class="device-name">{{ deviceName }}</span>
              <span class="device-status">{{ statusText }}</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="action-buttons">
            <!-- 已连接状态 -->
            <template v-if="status === 'connected'">
              <t-button
                theme="primary"
                block
                :loading="testing"
                @click="handleTestPrint"
              >
                测试打印
              </t-button>
              <div class="button-row">
                <t-button theme="default" @click="handleDisconnect">
                  断开连接
                </t-button>
                <t-button theme="danger" variant="text" @click="handleForget">
                  忘记设备
                </t-button>
              </div>
            </template>

            <!-- 未连接但有保存设备 -->
            <template v-else-if="savedDevice && status === 'disconnected'">
              <t-button
                theme="primary"
                block
                @click="handleReconnect"
              >
                重新连接
              </t-button>
              <t-button
                theme="default"
                block
                @click="handleConnect"
                style="margin-top: 12px"
              >
                配对新打印机
              </t-button>
            </template>

            <!-- 未连接且无保存设备 -->
            <template v-else>
              <t-button
                theme="primary"
                block
                :loading="status === 'connecting'"
                @click="handleConnect"
              >
                配对打印机
              </t-button>
            </template>
          </div>

          <!-- 使用说明 -->
          <div class="usage-tips">
            <div class="tip-title">
              <t-icon name="info-circle" size="16px" />
              <span>使用说明</span>
            </div>
            <ul class="tip-list">
              <li>请先打开打印机电源和蓝牙</li>
              <li>点击"配对打印机"，在弹出列表中选择 <strong>DL-5801</strong></li>
              <li>配对成功后，核销时点击"打印小票"即可</li>
              <li>打印机型号：得力 DL-5801PW（58mm热敏）</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </t-popup>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Toast } from 'tdesign-mobile-vue'
import { BluetoothPrinterService, printerService } from '@/services/bluetoothPrinter'
import type { PrinterStatus, SavedPrinterDevice } from '@/services/bluetoothPrinter'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = ref(false)
const status = ref<PrinterStatus>('disconnected')
const savedDevice = ref<SavedPrinterDevice | null>(null)
const testing = ref(false)

// 蓝牙支持检测
const bluetoothCheck = BluetoothPrinterService.checkSupport()
const bluetoothSupported = bluetoothCheck.supported
const notSupportedMessage = computed(() => {
  const messages: Record<string, string> = {
    'wechat': '微信浏览器不支持蓝牙打印',
    'safari': 'Safari浏览器不支持蓝牙打印',
    'no-https': '需要HTTPS安全连接',
    'no-api': '浏览器不支持蓝牙功能'
  }
  return messages[bluetoothCheck.reason!] || '蓝牙功能不可用'
})

// 设备名称
const deviceName = computed(() => {
  if (status.value === 'connected' || savedDevice.value) {
    return savedDevice.value?.name || '蓝牙打印机'
  }
  return '未配对打印机'
})

// 状态文本
const statusText = computed(() => {
  const texts: Record<PrinterStatus, string> = {
    'disconnected': '未连接',
    'connecting': '连接中...',
    'connected': '已连接',
    'printing': '打印中...',
    'error': '连接失败'
  }
  return texts[status.value]
})

// 状态样式类
const statusClass = computed(() => ({
  'connected': status.value === 'connected',
  'connecting': status.value === 'connecting',
  'error': status.value === 'error'
}))

// 状态图标
const statusIcon = computed(() => {
  if (status.value === 'connected') return 'check-circle'
  if (status.value === 'connecting') return 'loading'
  if (status.value === 'error') return 'error-circle'
  return 'bluetooth'
})

// 状态颜色
const statusColor = computed(() => {
  if (status.value === 'connected') return '#4CAF50'
  if (status.value === 'error') return '#f44336'
  return '#9e9e9e'
})

let unsubscribe: (() => void) | null = null

onMounted(() => {
  savedDevice.value = printerService.getSavedDevice()
  status.value = printerService.getStatus()

  // 监听状态变化
  unsubscribe = printerService.onStatusChange((newStatus) => {
    status.value = newStatus
  })
})

onUnmounted(() => {
  unsubscribe?.()
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    // 打开时刷新状态
    savedDevice.value = printerService.getSavedDevice()
    status.value = printerService.getStatus()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function handleClose() {
  visible.value = false
}

async function handleConnect() {
  try {
    await printerService.connect()
    savedDevice.value = printerService.getSavedDevice()
    Toast({ message: '打印机配对成功', theme: 'success' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '配对失败'
    Toast({ message, theme: 'error' })
  }
}

async function handleReconnect() {
  const success = await printerService.reconnect()
  if (success) {
    Toast({ message: '连接成功', theme: 'success' })
  } else {
    // 重连失败，提示用户重新配对
    Toast({ message: '连接失败，请重新配对', theme: 'warning' })
  }
}

function handleDisconnect() {
  printerService.disconnect()
  Toast({ message: '已断开连接', theme: 'success' })
}

function handleForget() {
  printerService.forget()
  savedDevice.value = null
  Toast({ message: '已忘记设备', theme: 'success' })
}

async function handleTestPrint() {
  testing.value = true
  try {
    const result = await printerService.testPrint()
    if (result.success) {
      Toast({ message: '测试打印成功', theme: 'success' })
    } else {
      Toast({ message: result.error || '测试打印失败', theme: 'error' })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '测试打印失败'
    Toast({ message, theme: 'error' })
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.printer-setup {
  background-color: #fff;
  border-radius: 16px 16px 0 0;
  max-height: 80vh;
  overflow-y: auto;
}

.setup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.setup-header .title {
  font-size: 18px;
  font-weight: 500;
}

.setup-content {
  padding: 20px 16px 32px;
}

/* 不支持提示 */
.not-supported {
  text-align: center;
  padding: 40px 20px;
}

.not-supported .message {
  margin-top: 16px;
  font-size: 16px;
  color: #333;
}

.not-supported .hint {
  margin-top: 8px;
  font-size: 14px;
  color: #999;
}

/* 设备卡片 */
.device-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 12px;
  margin-bottom: 20px;
  transition: all 0.3s;
}

.device-card.connected {
  background-color: #e8f5e9;
}

.device-card.connecting {
  background-color: #e3f2fd;
}

.device-card.error {
  background-color: #ffebee;
}

.device-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border-radius: 50%;
  margin-right: 16px;
}

.device-info {
  display: flex;
  flex-direction: column;
}

.device-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.device-status {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

/* 操作按钮 */
.action-buttons {
  margin-bottom: 24px;
}

.button-row {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.button-row .t-button {
  flex: 1;
}

/* 使用说明 */
.usage-tips {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
}

.tip-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  margin-bottom: 12px;
}

.tip-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #666;
  line-height: 1.8;
}

.tip-list li {
  margin-bottom: 4px;
}

.tip-list strong {
  color: #1976D2;
}
</style>
