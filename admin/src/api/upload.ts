import request from './request'
import axios from 'axios'

// 上传配置
export interface UploadConfig {
  maxSize: number
  maxFiles: number
  allowedTypes: string[]
  uploadUrl: string
}

// 上传结果
export interface UploadResult {
  url: string
  filename: string
  size: number
}

// 获取上传配置
export function getUploadConfig() {
  return request.get<UploadConfig>('/upload/config')
}

// 上传单张图片
export async function uploadImage(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('image', file)

  const token = localStorage.getItem('admin_token')
  const response = await axios.post('/api/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: token ? `Bearer ${token}` : '',
    },
  })

  if (response.data.code !== 0) {
    throw new Error(response.data.message || '上传失败')
  }

  return response.data.data
}

// 上传多张图片
export async function uploadImages(files: File[]): Promise<UploadResult[]> {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('images', file)
  })

  const token = localStorage.getItem('admin_token')
  const response = await axios.post('/api/upload/images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: token ? `Bearer ${token}` : '',
    },
  })

  if (response.data.code !== 0) {
    throw new Error(response.data.message || '上传失败')
  }

  return response.data.data
}

// 上传视频
export async function uploadVideo(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('video', file)

  const token = localStorage.getItem('admin_token')
  const response = await axios.post('/api/upload/video', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: token ? `Bearer ${token}` : '',
    },
  })

  if (response.data.code !== 0) {
    throw new Error(response.data.message || '视频上传失败')
  }

  return response.data.data
}

// 删除图片
export function deleteImage(url: string) {
  return request.delete('/upload/image', { data: { url } })
}
