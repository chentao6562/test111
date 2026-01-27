<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h1 class="app-name">蒙庆烟花库管端</h1>
        <p class="app-desc">库存管理 · 订单核销</p>
      </div>

      <div class="login-form">
        <t-input
          v-model="formData.username"
          placeholder="请输入用户名"
          clearable
          class="form-item"
        >
          <template #prefix-icon>
            <t-icon name="user" />
          </template>
        </t-input>

        <t-input
          v-model="formData.password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="请输入密码"
          clearable
          class="form-item"
        >
          <template #prefix-icon>
            <t-icon name="lock-on" />
          </template>
          <template #suffix-icon>
            <t-icon
              :name="showPassword ? 'browse' : 'browse-off'"
              @click="showPassword = !showPassword"
            />
          </template>
        </t-input>

        <div class="form-item">
          <t-checkbox v-model="formData.remember">记住密码</t-checkbox>
        </div>

        <t-button
          theme="primary"
          size="large"
          block
          :loading="loading"
          @click="handleLogin"
        >
          登录
        </t-button>
      </div>

      <div class="login-footer">
        <p class="copyright">© 2026 蒙庆烟花 v1.0.0</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { useUserStore } from '@/stores/user'
import { login } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formData = ref({
  username: '',
  password: '',
  remember: false
})

const loading = ref(false)
const showPassword = ref(false)

// 【2026-01-22 安全修复】密码不再存储在localStorage
// 只存储用户名，密码需要用户每次输入
onMounted(() => {
  const savedUsername = localStorage.getItem('warehouse_saved_username')
  // 清理旧的不安全存储的密码
  localStorage.removeItem('warehouse_saved_password')
  if (savedUsername) {
    formData.value.username = savedUsername
    formData.value.remember = true
  }
})

// 登录
async function handleLogin() {
  // 验证
  if (!formData.value.username) {
    Toast({ message: '请输入用户名', theme: 'warning' })
    return
  }
  if (!formData.value.password) {
    Toast({ message: '请输入密码', theme: 'warning' })
    return
  }

  loading.value = true

  try {
    const res = await login(formData.value.username, formData.value.password)

    // 兼容两种返回格式：staff 或 userInfo
    const staffInfo = res.staff || res.userInfo

    if (!staffInfo) {
      Toast({ message: '登录响应格式错误', theme: 'error' })
      return
    }

    // 检查角色
    if (staffInfo.role !== 'WAREHOUSE') {
      Toast({ message: '此账号不是库管账号', theme: 'error' })
      return
    }

    // 保存登录信息
    userStore.login(res.token, staffInfo as any)

    // 【2026-01-22 安全修复】记住用户名（不存储密码）
    if (formData.value.remember) {
      localStorage.setItem('warehouse_saved_username', formData.value.username)
    } else {
      localStorage.removeItem('warehouse_saved_username')
    }
    // 确保清理任何旧的不安全密码存储
    localStorage.removeItem('warehouse_saved_password')

    Toast({ message: '登录成功', theme: 'success' })

    // 跳转
    const redirect = (route.query.redirect as string) || '/workbench'
    router.push(redirect)
  } catch (error) {
    // 错误已在拦截器处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 400px;
  background-color: var(--bg-white);
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.app-name {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.app-desc {
  font-size: 14px;
  color: var(--text-tertiary);
}

.login-form {
  margin-bottom: 24px;
}

.form-item {
  margin-bottom: 16px;
}

.login-footer {
  text-align: center;
}

.copyright {
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>
