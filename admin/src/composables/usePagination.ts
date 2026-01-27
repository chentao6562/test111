/**
 * 分页逻辑Hook
 * 消除所有列表页的分页代码重复
 * Phase 4 Task 4.1
 */
import { reactive } from 'vue'

interface PaginationOptions {
  initialPageSize?: number
  pageSizeOptions?: number[]
}

export interface PaginationState {
  current: number
  pageSize: number
  total: number
  pageSizeOptions: number[]
}

export interface PageChangeInfo {
  current: number
  pageSize: number
}

export function usePagination(options: PaginationOptions = {}) {
  const pagination = reactive<PaginationState>({
    current: 1,
    pageSize: options.initialPageSize || 10,
    total: 0,
    pageSizeOptions: options.pageSizeOptions || [10, 20, 50, 100],
  })

  /**
   * 处理分页变化
   */
  function handlePageChange(pageInfo: PageChangeInfo) {
    pagination.current = pageInfo.current
    pagination.pageSize = pageInfo.pageSize
  }

  /**
   * 重置分页到第一页
   */
  function resetPagination() {
    pagination.current = 1
  }

  /**
   * 设置总数
   */
  function setTotal(total: number) {
    pagination.total = total
  }

  /**
   * 获取API请求参数
   */
  function getQueryParams() {
    return {
      page: pagination.current,
      pageSize: pagination.pageSize,
    }
  }

  return {
    pagination,
    handlePageChange,
    resetPagination,
    setTotal,
    getQueryParams,
  }
}
