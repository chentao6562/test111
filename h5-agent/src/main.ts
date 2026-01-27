import { createApp } from 'vue'
import TDesign, { Toast } from 'tdesign-mobile-vue'
import 'tdesign-mobile-vue/es/style/index.css'

import App from './App.vue'
import router from './router'
import pinia from './stores'
import './style.css'

const app = createApp(App)

// 全局错误处理器 - 捕获组件错误
app.config.errorHandler = (err, instance, info) => {
  console.error('【全局错误】组件错误:', err)
  console.error('错误组件:', instance)
  console.error('错误信息:', info)

  // 向用户显示友好提示
  Toast({
    message: '系统错误，请稍后重试',
    theme: 'error',
    duration: 2000
  })

  // 可选：上报错误到监控服务
  // if (import.meta.env.PROD) {
  //   errorReporter.report({
  //     type: 'component-error',
  //     error: err,
  //     componentName: instance?.$options.name,
  //     info
  //   })
  // }
}

// 全局警告处理器 - 开发环境使用
if (import.meta.env.DEV) {
  app.config.warnHandler = (msg, instance, trace) => {
    console.warn('【Vue警告】:', msg)
    console.warn('警告组件:', instance)
    console.warn('调用栈:', trace)
  }
}

// 捕获未处理的Promise rejection
window.addEventListener('unhandledrejection', (event) => {
  console.error('【全局错误】未处理的Promise拒绝:', event.reason)

  // 阻止默认的错误提示
  event.preventDefault()

  // 显示友好提示
  Toast({
    message: '操作失败，请稍后重试',
    theme: 'error',
    duration: 2000
  })

  // 可选：上报错误到监控服务
  // if (import.meta.env.PROD) {
  //   errorReporter.report({
  //     type: 'unhandled-rejection',
  //     reason: event.reason,
  //     promise: event.promise
  //   })
  // }
})

// 捕获全局运行时错误
window.addEventListener('error', (event) => {
  // 忽略资源加载错误（图片、脚本等）
  if (event.target !== window) {
    console.warn('【资源加载错误】:', event.target)
    return
  }

  console.error('【全局错误】运行时错误:', event.error)

  // 可选：上报错误到监控服务
  // if (import.meta.env.PROD) {
  //   errorReporter.report({
  //     type: 'runtime-error',
  //     message: event.message,
  //     filename: event.filename,
  //     lineno: event.lineno,
  //     colno: event.colno,
  //     error: event.error
  //   })
  // }
})

app.use(pinia)
app.use(router)
app.use(TDesign)

app.mount('#app')
