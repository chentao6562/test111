import request from './request'

export interface BgmMusic {
  id: number
  name: string
  url: string
  duration: number | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// 获取BGM列表
export function getBgmList() {
  return request.get<BgmMusic[]>('/admin/bgm')
}

// 创建BGM
export function createBgm(data: { name: string; url: string; duration?: number }) {
  return request.post<BgmMusic>('/admin/bgm', data)
}

// 更新BGM
export function updateBgm(id: number, data: { name?: string; url?: string; isActive?: boolean; sortOrder?: number }) {
  return request.put<BgmMusic>(`/admin/bgm/${id}`, data)
}

// 删除BGM
export function deleteBgm(id: number) {
  return request.delete(`/admin/bgm/${id}`)
}

// 批量更新排序
export function updateBgmSort(items: { id: number; sortOrder: number }[]) {
  return request.put('/admin/bgm/sort', { items })
}
