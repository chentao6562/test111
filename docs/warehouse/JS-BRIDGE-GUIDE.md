# JS Bridge 开发指南

## 概述

JS Bridge是H5页面与Android原生应用之间的通信桥梁，支持双环境运行：
- **Android App环境**：调用原生能力（高性能、用户体验好）
- **H5浏览器环境**：使用降级方案（兼容性好、开发测试方便）

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      H5应用层 (Vue3)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Pickup.vue │  │ Stock.vue  │  │ Tasks.vue  │            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
│        │                │                │                    │
│        └────────────────┴────────────────┘                    │
│                         │                                     │
│              ┌──────────▼──────────┐                          │
│              │   utils/bridge.ts   │  ◄─ JS Bridge层        │
│              │   (自动环境检测)     │                          │
│              └──────────┬──────────┘                          │
│                         │                                     │
│          ┌──────────────┴──────────────┐                     │
│          │                              │                     │
│    ┌─────▼─────┐                ┌─────▼─────┐               │
│    │ H5降级方案 │                │ 原生能力   │               │
│    │ html5-qrcode│               │ AndroidBridge│            │
│    │ Vibration API│              │ (注入window) │            │
│    └───────────┘                └─────┬─────┘               │
└────────────────────────────────────────┼───────────────────┘
                                         │
                                    ┌────▼────┐
                                    │ Android │
                                    │ 原生代码 │
                                    └─────────┘
```

---

## H5端实现

### 文件位置
- **库管端**: `h5-warehouse/src/utils/bridge.ts`
- **货管端**: `h5-logistics/src/utils/bridge.ts`

### 核心接口

```typescript
export interface BridgeInterface {
  // 扫码功能
  scan(): Promise<ScanResult>

  // 震动反馈
  vibrate(duration?: number): void

  // Toast提示
  showToast(message: string, type?: 'success' | 'error' | 'warning' | 'info'): void

  // 检查是否在App内
  isInApp(): boolean
}
```

### 使用示例

#### 1. 在Vue组件中使用扫码

```vue
<template>
  <div>
    <t-button @click="handleScan">扫码</t-button>
  </div>
</template>

<script setup lang="ts">
import { bridge } from '@/utils/bridge'
import { Toast } from 'tdesign-mobile-vue'

const handleScan = async () => {
  if (bridge.isInApp()) {
    // App环境：调用原生扫码
    const result = await bridge.scan()
    if (result.success) {
      console.log('扫码结果:', result.code)
      processPickupCode(result.code)
    } else if (result.cancelled) {
      Toast({ message: '已取消扫码', theme: 'warning' })
    } else {
      Toast({ message: result.error || '扫码失败', theme: 'error' })
    }
  } else {
    // H5环境：使用QRScanner组件
    showQRScanner.value = true
  }
}
</script>
```

#### 2. 使用震动反馈

```typescript
import { bridge } from '@/utils/bridge'

// 操作成功时震动
bridge.vibrate(100) // 震动100ms
```

#### 3. 使用Toast提示

```typescript
import { bridge } from '@/utils/bridge'

// 在App和H5环境都能正常显示Toast
bridge.showToast('操作成功', 'success')
```

#### 4. 检查运行环境

```typescript
import { bridge } from '@/utils/bridge'

if (bridge.isInApp()) {
  // App环境特有逻辑
  console.log('运行在Android App中')
} else {
  // H5环境特有逻辑
  console.log('运行在浏览器中')
}
```

---

## Android端实现

### 核心类：JSBridge.kt

```kotlin
package com.mengqing.warehouse

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.webkit.JavascriptInterface
import android.widget.Toast

class JSBridge(private val activity: MainActivity) {

    /**
     * 扫码功能
     * @param callbackName 回调函数名
     */
    @JavascriptInterface
    fun scan(callbackName: String) {
        activity.runOnUiThread {
            // 保存回调函数名
            activity.scanCallbackName = callbackName

            // 启动扫码Activity
            val intent = Intent(activity, ScanActivity::class.java)
            activity.startActivityForResult(intent, MainActivity.SCAN_REQUEST_CODE)
        }
    }

    /**
     * 震动反馈
     * @param duration 震动时长（毫秒）
     */
    @JavascriptInterface
    fun vibrate(duration: Int) {
        val vibrator = activity.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(
                VibrationEffect.createOneShot(
                    duration.toLong(),
                    VibrationEffect.DEFAULT_AMPLITUDE
                )
            )
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(duration.toLong())
        }
    }

    /**
     * Toast提示
     * @param message 提示消息
     * @param type 提示类型
     */
    @JavascriptInterface
    fun showToast(message: String, type: String) {
        activity.runOnUiThread {
            Toast.makeText(activity, message, Toast.LENGTH_SHORT).show()
        }
    }
}
```

### MainActivity.kt（WebView配置）

```kotlin
class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    var scanCallbackName: String? = null

    companion object {
        const val SCAN_REQUEST_CODE = 1001
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        setupWebView()
        loadH5App()
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        webView.webViewClient = WebViewClient()

        // 注入JS Bridge
        webView.addJavascriptInterface(JSBridge(this), "AndroidBridge")
    }

    private fun loadH5App() {
        val url = when (BuildConfig.APP_TYPE) {
            "warehouse" -> "https://39.104.58.26/h5-warehouse/"
            "logistics" -> "https://39.104.58.26/h5-logistics/"
            else -> "https://39.104.58.26/h5-warehouse/"
        }
        webView.loadUrl(url)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == SCAN_REQUEST_CODE) {
            val callbackName = scanCallbackName ?: return

            val result = if (resultCode == RESULT_OK && data != null) {
                val code = data.getStringExtra("code") ?: ""
                val format = data.getStringExtra("format") ?: "UNKNOWN"
                """{"success":true,"code":"$code","format":"$format"}"""
            } else {
                """{"success":false,"code":"","cancelled":true}"""
            }

            // 调用H5回调函数
            webView.evaluateJavascript("window.$callbackName('$result');", null)

            // 清空回调函数名
            scanCallbackName = null
        }
    }
}
```

### ScanActivity.kt（扫码页面）

```kotlin
class ScanActivity : AppCompatActivity() {
    private lateinit var codeScanner: CodeScanner

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_scan)

        val scannerView = findViewById<CodeScannerView>(R.id.scanner_view)
        codeScanner = CodeScanner(this, scannerView).apply {
            camera = CodeScanner.CAMERA_BACK
            formats = CodeScanner.ALL_FORMATS
            autoFocusMode = AutoFocusMode.SAFE
            scanMode = ScanMode.SINGLE
            isAutoFocusEnabled = true
            isFlashEnabled = false

            decodeCallback = DecodeCallback { result ->
                runOnUiThread {
                    // 震动反馈
                    val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE))
                    } else {
                        @Suppress("DEPRECATION")
                        vibrator.vibrate(100)
                    }

                    // 返回扫码结果
                    val intent = Intent().apply {
                        putExtra("code", result.text)
                        putExtra("format", result.barcodeFormat.name)
                    }
                    setResult(Activity.RESULT_OK, intent)
                    finish()
                }
            }

            errorCallback = ErrorCallback {
                runOnUiThread {
                    Toast.makeText(this@ScanActivity, "扫码失败", Toast.LENGTH_SHORT).show()
                    finish()
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        codeScanner.startPreview()
    }

    override fun onPause() {
        codeScanner.releaseResources()
        super.onPause()
    }
}
```

---

## H5扫码组件（降级方案）

### QRScanner.vue组件

**文件位置**:
- 库管端: `h5-warehouse/src/components/QRScanner.vue`
- 货管端: `h5-logistics/src/components/QRScanner.vue`

### 使用方式

```vue
<template>
  <t-dialog v-model:visible="showScanner" title="扫码" fullscreen>
    <QRScanner @scan="handleScan" />
  </t-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import QRScanner from '@/components/QRScanner.vue'

const showScanner = ref(false)

const handleScan = (result: { success: boolean; code: string }) => {
  if (result.success) {
    console.log('扫码结果:', result.code)
    showScanner.value = false
    // 处理扫码结果
    processPickupCode(result.code)
  }
}
</script>
```

---

## 调试指南

### H5环境调试

1. **浏览器开发者工具**
   ```bash
   # 启动H5项目
   cd h5-warehouse
   npm run dev

   # 访问 http://localhost:5180
   # 打开浏览器开发者工具 Console
   ```

2. **测试Bridge**
   ```javascript
   // 在Console中测试
   bridge.isInApp() // 应返回false（浏览器环境）
   bridge.vibrate(100) // 手机浏览器会震动
   bridge.showToast('测试', 'success') // 显示Toast
   ```

3. **测试扫码组件**
   - 需要HTTPS或localhost才能访问摄像头
   - 需要用户授权摄像头权限
   - 使用手机二维码测试扫码功能

### Android环境调试

1. **Chrome远程调试**
   ```bash
   # 1. Android设备连接电脑
   # 2. 开启USB调试
   # 3. Chrome访问 chrome://inspect
   # 4. 在WebView中选择对应页面
   ```

2. **查看Console日志**
   ```kotlin
   // 在MainActivity中启用WebView调试
   if (BuildConfig.DEBUG) {
       WebView.setWebContentsDebuggingEnabled(true)
   }
   ```

3. **测试Bridge调用**
   ```javascript
   // 在Chrome DevTools Console中测试
   bridge.isInApp() // 应返回true（App环境）
   await bridge.scan() // 应启动原生扫码
   ```

---

## 常见问题

### 1. H5中bridge.scan()返回错误

**问题**: 在浏览器中调用`bridge.scan()`返回错误消息

**解决**: 这是正常的，浏览器环境应该使用`QRScanner`组件：

```typescript
if (bridge.isInApp()) {
  const result = await bridge.scan()
} else {
  showQRScanner.value = true // 显示QRScanner组件
}
```

### 2. Android扫码回调未触发

**问题**: 扫码后H5页面没有收到结果

**解决**: 检查以下几点：
1. `MainActivity.scanCallbackName`是否正确保存
2. `onActivityResult`是否正确处理
3. `evaluateJavascript`调用是否正确
4. Chrome远程调试查看Console错误

### 3. 摄像头权限被拒绝

**H5环境**:
- 确保使用HTTPS或localhost
- 浏览器会弹出权限请求，用户需要允许

**Android环境**:
- 在AndroidManifest.xml中添加权限
- 运行时请求摄像头权限

---

## 性能优化

### 1. 扫码性能

- **H5**: 降低fps配置（默认10fps，可调整为5fps）
- **Android**: 使用原生扫码，性能更好

### 2. 内存管理

- **QRScanner组件**: `onUnmounted`时必须调用`stopScan()`释放摄像头
- **Android**: ScanActivity的`onPause`中释放资源

### 3. 用户体验

- 扫码成功后震动反馈（100ms）
- 扫码成功后Toast提示
- 扫码中显示引导提示

---

## 测试清单

### H5环境测试

- [ ] 浏览器中`bridge.isInApp()`返回false
- [ ] QRScanner组件能正常启动摄像头
- [ ] 扫码成功后正确触发@scan事件
- [ ] 取消扫码正常释放摄像头
- [ ] 震动API在支持的浏览器中正常工作

### Android环境测试

- [ ] App中`bridge.isInApp()`返回true
- [ ] `bridge.scan()`能启动ScanActivity
- [ ] 扫码成功后正确返回结果给H5
- [ ] 取消扫码返回cancelled状态
- [ ] 震动功能正常工作
- [ ] Toast提示正常显示

### 兼容性测试

- [ ] Chrome浏览器
- [ ] Firefox浏览器
- [ ] Safari浏览器（iOS）
- [ ] Android 7.0+
- [ ] Android 10+

---

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0.0 | 2026-01-12 | 初始版本，支持扫码/震动/Toast |

---

## 下一步开发计划

### Phase 1: Android壳工程（本周）
- [x] JS Bridge H5端实现
- [x] QRScanner H5组件
- [ ] Android MainActivity
- [ ] Android JSBridge类
- [ ] Android ScanActivity

### Phase 2: 功能扩展（下周）
- [ ] 推送通知（极光推送）
- [ ] 文件下载
- [ ] 图片选择器
- [ ] 分享功能

### Phase 3: 优化与测试（下下周）
- [ ] 性能优化
- [ ] 完整测试
- [ ] 打包分发（蒲公英）

---

**文档维护者**: Claude Code
**最后更新**: 2026-01-12
