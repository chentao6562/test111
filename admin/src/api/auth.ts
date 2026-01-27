import request from './request'

// 密码登录请求参数（保留兼容）
export interface LoginParams {
  username: string
  password: string
  captchaId: string
  captcha: string
}

// 【2026-01-24新增】短信验证码登录参数
export interface PhoneLoginParams {
  phone: string
  code: string
}

// 【2026-01-22新增】验证码响应
export interface CaptchaResponse {
  captchaId: string
  svg: string
}

// 登录响应数据
export interface LoginResponse {
  token: string
  user: {
    id: number
    username: string
    name: string
    role: string
  }
}

// 用户信息
export interface UserInfo {
  id: number
  username: string
  name: string
  phone?: string
  role: string
  status: string
}

/**
 * 【2026-01-22新增】获取验证码
 */
export function getCaptcha() {
  return request.get<CaptchaResponse>('/admin/captcha')
}

/**
 * 管理员密码登录（保留兼容）
 */
export function login(params: LoginParams) {
  return request.post<LoginResponse>('/admin/auth/login', params)
}

/**
 * 【2026-01-24新增】发送管理员登录验证码
 */
export function sendCode(params: { phone: string }) {
  return request.post('/admin/auth/send-code', params)
}

/**
 * 【2026-01-24新增】管理员短信验证码登录
 */
export function phoneLogin(params: PhoneLoginParams) {
  return request.post<LoginResponse>('/admin/auth/phone-login', params)
}

/**
 * 获取当前用户信息
 */
export function getUserInfo() {
  return request.get<UserInfo>('/admin/auth/me')
}

/**
 * 退出登录
 */
export function logout() {
  return request.post('/admin/auth/logout')
}

/**
 * 修改密码
 */
export function changePassword(oldPassword: string, newPassword: string) {
  return request.post('/admin/auth/change-password', {
    oldPassword,
    newPassword,
  })
}

export default {
  getCaptcha,
  login,
  sendCode,
  phoneLogin,
  getUserInfo,
  logout,
  changePassword,
}
