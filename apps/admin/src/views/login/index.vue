<template>
  <!-- 直接套用设计稿: 网页版-管理后台/登录页/code.html -->
  <div class="login-festive-bg min-h-screen flex flex-col font-display antialiased text-slate-900 dark:text-white">
    <header class="w-full px-6 py-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/40 to-transparent">
      <div class="flex items-center gap-3">
        <div class="size-10 bg-primary/90 rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/30">
          <span class="material-symbols-outlined text-[28px]">local_fire_department</span>
        </div>
        <div>
          <h2 class="text-white text-xl font-black tracking-wide leading-none">蒙庆烟花</h2>
          <p class="text-white/70 text-xs font-medium tracking-wider">MENGQING FIREWORKS</p>
        </div>
      </div>
    </header>

    <main class="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10">
      <div class="w-full max-w-[480px] bg-warm-white dark:bg-[#2a1614] rounded-xl border-2 border-gold/40 shadow-2xl shadow-black/50 overflow-hidden relative">
        <div class="h-1.5 w-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600"></div>
        <div class="p-8 sm:p-10 flex flex-col gap-6">
          <div class="text-center flex flex-col gap-2 mb-2">
            <h1 class="text-[#221210] dark:text-white text-2xl sm:text-3xl font-black tracking-tight">
              蒙庆内部代理商<br/>订货系统
            </h1>
            <div class="h-1 w-16 bg-primary mx-auto rounded-full mt-2"></div>
            <p class="text-[#673832] dark:text-[#d1a69e] text-sm font-medium mt-1">
              欢迎回来，请登录您的账户
            </p>
          </div>

          <form class="flex flex-col gap-5" @submit.prevent="handleLogin">
            <div class="flex flex-col gap-1.5">
              <label class="text-[#482723] dark:text-[#f8f6f6] text-sm font-bold ml-1">账号</label>
              <div class="relative flex items-center group">
                <span class="absolute left-4 text-[#9c7b77] group-focus-within:text-primary transition-colors duration-200">
                  <span class="material-symbols-outlined">person</span>
                </span>
                <input
                  v-model="form.username"
                  class="w-full h-12 pl-12 pr-4 bg-white dark:bg-[#3e2320] border border-[#e6d0ce] dark:border-[#5a332f] rounded-lg text-[#221210] dark:text-white placeholder:text-[#bcaaa8] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 font-medium"
                  placeholder="请输入账号"
                  type="text"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[#482723] dark:text-[#f8f6f6] text-sm font-bold ml-1">密码</label>
              <div class="relative flex items-center group">
                <span class="absolute left-4 text-[#9c7b77] group-focus-within:text-primary transition-colors duration-200">
                  <span class="material-symbols-outlined">lock</span>
                </span>
                <input
                  v-model="form.password"
                  class="w-full h-12 pl-12 pr-4 bg-white dark:bg-[#3e2320] border border-[#e6d0ce] dark:border-[#5a332f] rounded-lg text-[#221210] dark:text-white placeholder:text-[#bcaaa8] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 font-medium"
                  placeholder="请输入密码"
                  type="password"
                />
              </div>
            </div>

            <div class="flex items-center justify-between mt-1">
              <label class="flex items-center gap-2 cursor-pointer group">
                <input v-model="rememberMe" class="size-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer" type="checkbox"/>
                <span class="text-sm text-[#673832] dark:text-[#d1a69e] font-medium group-hover:text-primary transition-colors">记住密码</span>
              </label>
              <div class="flex items-center gap-3">
                <a class="text-sm font-bold text-[#673832] dark:text-[#d1a69e] hover:text-primary transition-colors" href="#">
                  注册账号
                </a>
                <span class="text-[#e6d0ce] dark:text-[#5a332f]">|</span>
                <a class="text-sm font-bold text-primary hover:text-[#b01e0b] hover:underline decoration-2 underline-offset-4 transition-all" href="#">
                  忘记密码？
                </a>
              </div>
            </div>

            <button
              :disabled="loading"
              class="mt-4 w-full h-12 bg-primary hover:bg-[#c9240e] active:bg-[#b01e0b] text-white text-base font-bold rounded-lg shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              type="submit"
            >
              <span v-if="loading">登录中...</span>
              <template v-else>
                登录
                <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
              </template>
            </button>
          </form>

          <div class="text-center text-xs text-[#9c7b77]">
            默认账号: admin / Admin@123456
          </div>
        </div>
        <div class="h-3 w-full bg-[url('https://placeholder.pics/svg/20')] opacity-10 bg-repeat-x"></div>
      </div>
    </main>

    <footer class="w-full py-6 text-center z-10">
      <p class="text-white/40 text-xs font-medium">
        © 2024 蒙庆烟花 版权所有 | 蒙ICP备12345678号
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const rememberMe = ref(false)

const form = reactive({
  username: '',
  password: '',
})

const handleLogin = async () => {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }

  loading.value = true
  try {
    await userStore.login({
      username: form.username,
      password: form.password,
    })
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (error: any) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-festive-bg {
  background-color: #4a0404;
  background-image: radial-gradient(circle at 20% 20%, rgba(255, 215, 0, 0.15) 0%, transparent 20%),
                    radial-gradient(circle at 80% 30%, rgba(224, 40, 16, 0.2) 0%, transparent 25%),
                    radial-gradient(circle at 50% 80%, rgba(255, 215, 0, 0.1) 0%, transparent 30%);
  background-size: cover;
}
</style>
