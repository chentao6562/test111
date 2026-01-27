import { createApp } from 'vue'
import { createPinia } from 'pinia'
import TDesign from 'tdesign-mobile-vue'
import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'

// 导入样式
import 'tdesign-mobile-vue/es/style/index.css'
import './styles/index.css'

const app = createApp(App)

// 创建Pinia实例
const pinia = createPinia()
app.use(pinia)

// 初始化用户状态
const userStore = useUserStore()
userStore.init()

// 使用插件
app.use(router)
app.use(TDesign)

app.mount('#app')
