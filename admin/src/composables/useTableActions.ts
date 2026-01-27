/**
 * 表格操作Hook
 * 统一列表页的加载、删除等操作
 * Phase 4 Task 4.1
 */
import { ref, type Ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { usePagination, type PageChangeInfo } from './usePagination'

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
}

interface ListResponse<T> {
  list: T[]
  total: number
}

interface TableActionsOptions<T> {
  /** 列表查询API */
  listApi: (params: Record<string, any>) => Promise<ApiResponse<ListResponse<T>>>
  /** 删除API（可选） */
  deleteApi?: (id: number) => Promise<ApiResponse<any>>
  /** 删除成功回调 */
  onDeleteSuccess?: () => void
  /** 加载成功回调 */
  onLoadSuccess?: (data: T[]) => void
  /** 初始分页大小 */
  initialPageSize?: number
}

export function useTableActions<T>(options: TableActionsOptions<T>) {
  const loading = ref(false)
  const dataList: Ref<T[]> = ref([])
  const { pagination, handlePageChange, resetPagination, setTotal, getQueryParams } = usePagination({
    initialPageSize: options.initialPageSize,
  })

  /**
   * 加载数据
   */
  async function loadData(extraParams: Record<string, any> = {}) {
    loading.value = true
    try {
      const params = {
        ...getQueryParams(),
        ...extraParams,
      }
      const res = await options.listApi(params)
      if (res.code === 0 || res.code === 200) {
        dataList.value = res.data.list || []
        setTotal(res.data.total || 0)
        options.onLoadSuccess?.(res.data.list)
      } else {
        MessagePlugin.error(res.message || '加载数据失败')
      }
    } catch (err: any) {
      console.error('加载数据失败:', err)
      MessagePlugin.error(err.message || '加载数据失败')
    } finally {
      loading.value = false
    }
  }

  /**
   * 刷新数据（保持当前页码）
   */
  function refresh(extraParams: Record<string, any> = {}) {
    return loadData(extraParams)
  }

  /**
   * 重新加载（回到第一页）
   */
  function reload(extraParams: Record<string, any> = {}) {
    resetPagination()
    return loadData(extraParams)
  }

  /**
   * 处理分页变化
   */
  function onPageChange(pageInfo: PageChangeInfo, extraParams: Record<string, any> = {}) {
    handlePageChange(pageInfo)
    return loadData(extraParams)
  }

  /**
   * 删除记录
   */
  async function handleDelete(id: number, confirmMessage = '确定要删除吗？') {
    if (!options.deleteApi) {
      console.warn('deleteApi未配置')
      return
    }

    try {
      // TDesign的确认弹窗
      const { DialogPlugin } = await import('tdesign-vue-next')
      const confirmDialog = DialogPlugin.confirm({
        header: '确认删除',
        body: confirmMessage,
        confirmBtn: { theme: 'danger', content: '删除' },
        onConfirm: async () => {
          try {
            const res = await options.deleteApi!(id)
            if (res.code === 0 || res.code === 200) {
              MessagePlugin.success('删除成功')
              options.onDeleteSuccess?.()
              // 如果当前页只有一条数据且不是第一页，则回到上一页
              if (dataList.value.length === 1 && pagination.current > 1) {
                pagination.current--
              }
              await loadData()
            } else {
              MessagePlugin.error(res.message || '删除失败')
            }
          } catch (err: any) {
            MessagePlugin.error(err.message || '删除失败')
          }
          confirmDialog.destroy()
        },
        onClose: () => {
          confirmDialog.destroy()
        },
      })
    } catch (err) {
      console.error('删除操作失败:', err)
    }
  }

  return {
    loading,
    dataList,
    pagination,
    loadData,
    refresh,
    reload,
    onPageChange,
    handleDelete,
    resetPagination,
  }
}
