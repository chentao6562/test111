/**
 * 弹窗表单Hook
 * 统一新增/编辑弹窗的状态管理
 * Phase 4 Task 4.1
 */
import { ref, reactive, type Ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
}

interface FormDialogOptions<T, F> {
  /** 默认表单数据 */
  defaultForm: F
  /** 创建API */
  createApi?: (data: F) => Promise<ApiResponse<T>>
  /** 更新API */
  updateApi?: (id: number, data: F) => Promise<ApiResponse<T>>
  /** 获取详情API */
  detailApi?: (id: number) => Promise<ApiResponse<T>>
  /** 保存成功回调 */
  onSuccess?: (data: T, isEdit: boolean) => void
  /** 表单数据转换（提交前） */
  transformSubmit?: (form: F) => any
  /** 详情数据转换（编辑时） */
  transformDetail?: (data: T) => F
}

export function useFormDialog<T, F extends Record<string, any>>(options: FormDialogOptions<T, F>) {
  const visible = ref(false)
  const loading = ref(false)
  const isEdit = ref(false)
  const editId: Ref<number | null> = ref(null)
  const formData = reactive<F>({ ...options.defaultForm })

  /**
   * 打开新增弹窗
   */
  function openCreate() {
    isEdit.value = false
    editId.value = null
    resetForm()
    visible.value = true
  }

  /**
   * 打开编辑弹窗
   */
  async function openEdit(id: number, data?: T) {
    isEdit.value = true
    editId.value = id
    resetForm()

    // 如果提供了数据，直接使用
    if (data) {
      const transformed = options.transformDetail ? options.transformDetail(data) : (data as unknown as F)
      Object.assign(formData, transformed)
      visible.value = true
      return
    }

    // 否则从API获取详情
    if (options.detailApi) {
      loading.value = true
      try {
        const res = await options.detailApi(id)
        if (res.code === 0 || res.code === 200) {
          const transformed = options.transformDetail ? options.transformDetail(res.data) : (res.data as unknown as F)
          Object.assign(formData, transformed)
          visible.value = true
        } else {
          MessagePlugin.error(res.message || '获取详情失败')
        }
      } catch (err: any) {
        MessagePlugin.error(err.message || '获取详情失败')
      } finally {
        loading.value = false
      }
    } else {
      visible.value = true
    }
  }

  /**
   * 关闭弹窗
   */
  function close() {
    visible.value = false
    resetForm()
  }

  /**
   * 重置表单
   */
  function resetForm() {
    Object.keys(formData).forEach((key) => {
      ;(formData as any)[key] = (options.defaultForm as any)[key]
    })
  }

  /**
   * 提交表单
   */
  async function submit() {
    const submitData = options.transformSubmit ? options.transformSubmit(formData) : formData

    loading.value = true
    try {
      let res: ApiResponse<T>

      if (isEdit.value && editId.value !== null) {
        if (!options.updateApi) {
          throw new Error('updateApi未配置')
        }
        res = await options.updateApi(editId.value, submitData)
      } else {
        if (!options.createApi) {
          throw new Error('createApi未配置')
        }
        res = await options.createApi(submitData)
      }

      if (res.code === 0 || res.code === 200) {
        MessagePlugin.success(isEdit.value ? '更新成功' : '创建成功')
        options.onSuccess?.(res.data, isEdit.value)
        close()
        return true
      } else {
        MessagePlugin.error(res.message || '操作失败')
        return false
      }
    } catch (err: any) {
      MessagePlugin.error(err.message || '操作失败')
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    visible,
    loading,
    isEdit,
    editId,
    formData,
    openCreate,
    openEdit,
    close,
    resetForm,
    submit,
  }
}
