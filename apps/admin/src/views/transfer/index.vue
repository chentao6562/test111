<template>
  <div class="transfer-page">
    <el-card shadow="never">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-form :inline="true" :model="searchForm">
          <el-form-item label="任务编号">
            <el-input v-model="searchForm.taskNo" placeholder="请输入任务编号" clearable />
          </el-form-item>
          <el-form-item label="任务状态">
            <el-select v-model="searchForm.status" placeholder="全部状态" clearable>
              <el-option label="待分配" value="pending" />
              <el-option label="待接单" value="assigned" />
              <el-option label="进行中" value="doing" />
              <el-option label="已完成" value="done" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-form-item>
          <el-form-item label="创建时间">
            <el-date-picker
              v-model="searchForm.dateRange"
              type="daterange"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 状态标签 -->
      <div class="status-tabs">
        <el-radio-group v-model="activeStatus" @change="handleStatusChange">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="pending">
            待分配 <el-badge :value="statusCount.pending" :max="99" v-if="statusCount.pending > 0" />
          </el-radio-button>
          <el-radio-button value="assigned">待接单</el-radio-button>
          <el-radio-button value="doing">进行中</el-radio-button>
          <el-radio-button value="done">已完成</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 表格 -->
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="taskNo" label="任务编号" width="180" />
        <el-table-column label="关联订单" width="180">
          <template #default="{ row }">
            {{ row.orderNo || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="商品信息" min-width="200">
          <template #default="{ row }">
            <div class="product-info">
              <span class="name">{{ row.productName }}</span>
              <span class="qty">x{{ row.quantity }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="起始仓库" width="120">
          <template #default="{ row }">
            {{ row.fromWarehouse || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="目标地点" width="150">
          <template #default="{ row }">
            {{ row.toLocation || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="货管员" width="100">
          <template #default="{ row }">
            {{ row.porterName || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="搬运费" width="100">
          <template #default="{ row }">
            <span class="money">¥{{ row.fee || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="success"
              link
              @click="handleAssign(row)"
            >
              分配
            </el-button>
            <el-button
              v-if="row.status === 'pending' || row.status === 'assigned'"
              type="danger"
              link
              @click="handleCancel(row)"
            >
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 任务详情弹窗 -->
    <el-dialog v-model="detailVisible" title="移库任务详情" width="700px">
      <div v-if="currentTask" class="task-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务编号">{{ currentTask.taskNo }}</el-descriptions-item>
          <el-descriptions-item label="任务状态">
            <el-tag :type="getStatusType(currentTask.status)">
              {{ getStatusText(currentTask.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="关联订单">{{ currentTask.orderNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="商品名称">{{ currentTask.productName }}</el-descriptions-item>
          <el-descriptions-item label="移库数量">{{ currentTask.quantity }}</el-descriptions-item>
          <el-descriptions-item label="搬运费">
            <span class="money">¥{{ currentTask.fee || 0 }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="起始仓库">{{ currentTask.fromWarehouse || '-' }}</el-descriptions-item>
          <el-descriptions-item label="目标地点">{{ currentTask.toLocation || '-' }}</el-descriptions-item>
          <el-descriptions-item label="货管员">{{ currentTask.porterName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="货管员电话">{{ currentTask.porterPhone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(currentTask.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ formatDate(currentTask.completedAt) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentTask.remark || '无' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 分配任务弹窗 -->
    <el-dialog v-model="assignVisible" title="分配货管员" width="500px">
      <el-form
        ref="assignFormRef"
        :model="assignForm"
        :rules="assignRules"
        label-width="100px"
      >
        <el-form-item label="选择货管员" prop="porterId">
          <el-select v-model="assignForm.porterId" placeholder="请选择货管员" style="width: 100%">
            <el-option
              v-for="porter in porterList"
              :key="porter.id"
              :label="`${porter.name} (${porter.phone})`"
              :value="porter.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="搬运费" prop="fee">
          <el-input-number v-model="assignForm.fee" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="assignForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" :loading="assignLoading" @click="submitAssign">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { getTransferList } from '@/api/transfer'

interface TransferTask {
  id: number
  taskNo: string
  orderNo: string
  productName: string
  quantity: number
  fromWarehouse: string
  toLocation: string
  porterId: number
  porterName: string
  porterPhone: string
  status: string
  fee: number
  remark: string
  createdAt: string
  completedAt: string
}

interface Porter {
  id: number
  name: string
  phone: string
}

const loading = ref(false)
const assignLoading = ref(false)
const detailVisible = ref(false)
const assignVisible = ref(false)
const activeStatus = ref('')

const statusCount = reactive({
  pending: 0,
  assigned: 0,
  doing: 0,
  done: 0,
})

const searchForm = reactive({
  taskNo: '',
  status: '',
  dateRange: [] as string[],
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const tableData = ref<TransferTask[]>([])
const currentTask = ref<TransferTask | null>(null)
const porterList = ref<Porter[]>([])

const assignFormRef = ref<FormInstance>()
const assignForm = reactive({
  taskId: 0,
  porterId: undefined as number | undefined,
  fee: 80,
  remark: '',
})

const assignRules: FormRules = {
  porterId: [{ required: true, message: '请选择货管员', trigger: 'change' }],
  fee: [{ required: true, message: '请输入搬运费', trigger: 'blur' }],
}

const statusMap: Record<string, { text: string; type: string }> = {
  pending: { text: '待分配', type: 'warning' },
  assigned: { text: '待接单', type: 'info' },
  doing: { text: '进行中', type: 'primary' },
  done: { text: '已完成', type: 'success' },
  cancelled: { text: '已取消', type: 'info' },
}

const getStatusText = (status: string) => statusMap[status]?.text || '未知'
const getStatusType = (status: string) => statusMap[status]?.type || 'info'

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const fetchData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      taskNo: searchForm.taskNo || undefined,
      status: activeStatus.value || searchForm.status || undefined,
    }

    if (searchForm.dateRange?.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    const res = await getTransferList(params)
    if (res.data) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取移库任务列表失败', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  activeStatus.value = ''
  fetchData()
}

const handleReset = () => {
  searchForm.taskNo = ''
  searchForm.status = ''
  searchForm.dateRange = []
  activeStatus.value = ''
  handleSearch()
}

const handleStatusChange = () => {
  pagination.page = 1
  fetchData()
}

const handleDetail = (row: TransferTask) => {
  currentTask.value = row
  detailVisible.value = true
}

const handleAssign = (row: TransferTask) => {
  assignForm.taskId = row.id
  assignForm.porterId = undefined
  assignForm.fee = 80
  assignForm.remark = ''
  assignVisible.value = true
}

const submitAssign = async () => {
  if (!assignFormRef.value) return

  await assignFormRef.value.validate(async (valid) => {
    if (!valid) return

    assignLoading.value = true
    try {
      // TODO: 调用分配任务接口
      ElMessage.success('任务分配成功')
      assignVisible.value = false
      fetchData()
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    } finally {
      assignLoading.value = false
    }
  })
}

const handleCancel = async (row: TransferTask) => {
  try {
    await ElMessageBox.confirm('确定要取消该任务吗？', '提示', { type: 'warning' })
    // TODO: 调用取消任务接口
    ElMessage.success('任务已取消')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.transfer-page {
  .search-bar {
    margin-bottom: 20px;
  }

  .status-tabs {
    margin-bottom: 20px;
  }

  .product-info {
    display: flex;
    justify-content: space-between;

    .name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .qty {
      color: #999;
      margin-left: 8px;
    }
  }

  .money {
    color: #f56c6c;
    font-weight: 600;
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}

.task-detail {
  .money {
    color: #f56c6c;
    font-weight: 600;
  }
}
</style>
