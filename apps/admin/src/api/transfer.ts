import { get } from '@/utils/request'
import type { PageResult } from '@/utils/request'

// 移库任务接口
export interface TransferTask {
  id: number
  taskNo: string
  orderId: number
  porterId?: number
  assignedAt?: string
  status: string
  transferFee: number
  feeStatus: number
  fromLocation?: string
  toLocation: string
  pickedAt?: string
  completedAt?: string
  remark?: string
  createdAt: string
  order?: {
    orderNo: string
    contactName: string
    contactPhone: string
    contactAddress: string
  }
  porter?: {
    id: number
    name: string
    phone: string
  }
}

// 获取移库任务列表
export function getTransferList(params?: {
  page?: number
  pageSize?: number
  status?: string
}) {
  return get<PageResult<TransferTask>>('/admin/transfer/list', params)
}
