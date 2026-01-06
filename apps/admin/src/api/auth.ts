import { post, get } from '@/utils/request'

// 管理员登录
export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  admin: {
    id: number
    username: string
    name: string
    role: number
  }
}

export function login(data: LoginParams) {
  return post<LoginResult>('/auth/admin/login', data)
}

// 获取当前用户信息
export function getProfile() {
  return get('/auth/profile')
}

// 退出登录
export function logout() {
  return post('/auth/logout')
}
