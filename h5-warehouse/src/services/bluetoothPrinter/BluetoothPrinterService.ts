/**
 * 蓝牙打印机服务
 * 使用 Web Bluetooth API 连接 DL-5801PW 热敏打印机
 */

import type { PrinterStatus, SavedPrinterDevice, BluetoothSupport, PrintResult, ReceiptData } from './types'
import { ReceiptBuilder } from './ReceiptBuilder'

// localStorage 存储键
const STORAGE_KEY = 'mq_bluetooth_printer'

// 打印机蓝牙服务UUID（通用串口服务）
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb'
const PRINTER_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb'

// 备用UUID（某些打印机使用）
const ALT_SERVICE_UUID = '49535343-fe7d-4ae5-8fa9-9fafd205e455'
const ALT_CHARACTERISTIC_UUID = '49535343-8841-43f4-a8d4-ecbe34729bb3'

export class BluetoothPrinterService {
  private device: BluetoothDevice | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null
  private status: PrinterStatus = 'disconnected'
  private statusListeners: Set<(status: PrinterStatus) => void> = new Set()

  // 单例模式
  private static instance: BluetoothPrinterService
  static getInstance(): BluetoothPrinterService {
    if (!this.instance) {
      this.instance = new BluetoothPrinterService()
    }
    return this.instance
  }

  /**
   * 检测浏览器蓝牙支持情况
   */
  static checkSupport(): BluetoothSupport {
    // 检测微信环境
    if (/MicroMessenger/i.test(navigator.userAgent)) {
      return { supported: false, reason: 'wechat' }
    }

    // 检测Safari（iOS不支持Web Bluetooth）
    const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent)
    if (isSafari) {
      return { supported: false, reason: 'safari' }
    }

    // 检测HTTPS（Web Bluetooth要求安全上下文，localhost除外）
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      return { supported: false, reason: 'no-https' }
    }

    // 检测Web Bluetooth API
    if (!navigator.bluetooth) {
      return { supported: false, reason: 'no-api' }
    }

    return { supported: true }
  }

  /**
   * 获取支持性错误消息
   */
  static getSupportErrorMessage(reason: string): string {
    const messages: Record<string, string> = {
      'wechat': '微信浏览器不支持蓝牙打印，请使用Chrome浏览器',
      'safari': 'Safari浏览器不支持蓝牙打印，请使用Chrome浏览器',
      'no-https': '蓝牙打印需要HTTPS安全连接',
      'no-api': '当前浏览器不支持Web Bluetooth API',
      'unknown': '蓝牙功能不可用'
    }
    return messages[reason] || messages['unknown']
  }

  /**
   * 获取当前连接状态
   */
  getStatus(): PrinterStatus {
    return this.status
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.status === 'connected' && this.characteristic !== null
  }

  /**
   * 监听状态变化
   */
  onStatusChange(listener: (status: PrinterStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  private setStatus(status: PrinterStatus): void {
    this.status = status
    this.statusListeners.forEach(listener => listener(status))
  }

  /**
   * 获取已保存的打印机设备信息
   */
  getSavedDevice(): SavedPrinterDevice | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  /**
   * 保存打印机设备信息
   */
  private saveDevice(device: BluetoothDevice): void {
    const savedDevice: SavedPrinterDevice = {
      id: device.id,
      name: device.name || '蓝牙打印机',
      lastConnected: Date.now()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDevice))
  }

  /**
   * 清除保存的打印机
   */
  clearSavedDevice(): void {
    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * 连接打印机（首次配对）
   * 会弹出蓝牙设备选择对话框
   */
  async connect(): Promise<boolean> {
    const support = BluetoothPrinterService.checkSupport()
    if (!support.supported) {
      throw new Error(BluetoothPrinterService.getSupportErrorMessage(support.reason!))
    }

    try {
      this.setStatus('connecting')

      // 请求蓝牙设备（显示选择对话框）
      this.device = await navigator.bluetooth.requestDevice({
        // 接受所有设备（打印机可能使用各种UUID）
        acceptAllDevices: true,
        optionalServices: [PRINTER_SERVICE_UUID, ALT_SERVICE_UUID]
      })

      // 监听断开事件
      this.device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnect()
      })

      // 连接GATT服务器
      const connected = await this.connectToGATT()
      if (connected) {
        this.saveDevice(this.device)
        this.setStatus('connected')
        return true
      } else {
        this.setStatus('error')
        return false
      }
    } catch (error: unknown) {
      console.error('蓝牙连接失败:', error)
      this.setStatus('error')
      if (error instanceof Error && error.name === 'NotFoundError') {
        throw new Error('未选择设备或用户取消')
      }
      throw error
    }
  }

  /**
   * 连接GATT服务器并获取写入特征
   */
  private async connectToGATT(): Promise<boolean> {
    if (!this.device) return false

    try {
      const server = await this.device.gatt?.connect()
      if (!server) {
        throw new Error('无法连接到GATT服务器')
      }

      // 尝试主服务UUID
      try {
        const service = await server.getPrimaryService(PRINTER_SERVICE_UUID)
        this.characteristic = await service.getCharacteristic(PRINTER_CHARACTERISTIC_UUID)
        return true
      } catch {
        // 尝试备用UUID
        try {
          const service = await server.getPrimaryService(ALT_SERVICE_UUID)
          this.characteristic = await service.getCharacteristic(ALT_CHARACTERISTIC_UUID)
          return true
        } catch {
          // 尝试获取所有服务并找到可写特征
          const services = await server.getPrimaryServices()
          for (const service of services) {
            try {
              const characteristics = await service.getCharacteristics()
              for (const char of characteristics) {
                if (char.properties.write || char.properties.writeWithoutResponse) {
                  this.characteristic = char
                  console.log('找到可写特征:', char.uuid)
                  return true
                }
              }
            } catch {
              continue
            }
          }
        }
      }

      throw new Error('未找到打印机写入服务')
    } catch (error) {
      console.error('GATT连接失败:', error)
      return false
    }
  }

  /**
   * 尝试重新连接已保存的设备
   */
  async reconnect(): Promise<boolean> {
    // Web Bluetooth API 不支持直接重连已保存的设备
    // 需要用户再次选择设备
    // 但如果设备对象还在且GATT已断开，可以尝试重连
    if (this.device && this.device.gatt) {
      try {
        this.setStatus('connecting')
        const connected = await this.connectToGATT()
        if (connected) {
          this.setStatus('connected')
          return true
        }
      } catch (error) {
        console.warn('重连失败:', error)
      }
    }

    this.setStatus('disconnected')
    return false
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect()
    }
    this.handleDisconnect()
  }

  /**
   * 忘记设备（断开并清除保存）
   */
  forget(): void {
    this.disconnect()
    this.clearSavedDevice()
    this.device = null
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(): void {
    this.characteristic = null
    this.setStatus('disconnected')
  }

  /**
   * 发送数据到打印机
   */
  private async sendData(data: Uint8Array): Promise<void> {
    if (!this.characteristic) {
      throw new Error('打印机未连接')
    }

    // 分块发送（蓝牙MTU限制，通常512字节以内安全）
    const CHUNK_SIZE = 512
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE)
      if (this.characteristic.properties.writeWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk)
      } else {
        await this.characteristic.writeValue(chunk)
      }
      // 短暂延迟，确保打印机处理
      await new Promise(resolve => setTimeout(resolve, 20))
    }
  }

  /**
   * 打印小票
   */
  async print(data: ReceiptData): Promise<PrintResult> {
    // 检查连接状态
    if (!this.isConnected()) {
      // 尝试重连
      const reconnected = await this.reconnect()
      if (!reconnected) {
        return { success: false, method: 'bluetooth', error: '打印机未连接' }
      }
    }

    try {
      this.setStatus('printing')

      // 构建ESC/POS指令
      const commands = ReceiptBuilder.build(data)

      // 发送到打印机
      await this.sendData(commands)

      this.setStatus('connected')
      return { success: true, method: 'bluetooth' }
    } catch (error: unknown) {
      console.error('打印失败:', error)
      this.setStatus('error')
      return {
        success: false,
        method: 'bluetooth',
        error: error instanceof Error ? error.message : '打印失败'
      }
    }
  }

  /**
   * 测试打印（打印测试页）
   */
  async testPrint(): Promise<PrintResult> {
    const testData: ReceiptData = {
      storeName: '蒙庆烟花',
      storePhone: '13190531439',
      reservationNo: 'TEST' + Date.now(),
      customerName: '测试客户',
      customerPhone: '13800138000',
      items: [
        { name: '测试商品A', quantity: 2, price: 99.00, subtotal: 198.00 },
        { name: '测试商品B', quantity: 1, price: 50.00, subtotal: 50.00 }
      ],
      totalAmount: 248.00,
      actualPayment: 248.00,
      paymentMethod: 'wechat',
      printTime: new Date()
    }

    return this.print(testData)
  }
}

// 导出单例
export const printerService = BluetoothPrinterService.getInstance()
