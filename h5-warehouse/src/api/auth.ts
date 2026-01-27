import { request } from './request'
import type { LoginResponse } from '@/types'

// 登录
export function login(username: string, password: string): Promise<LoginResponse> {
  return request.post('/staff/login', { username, password })
}
