<template>
  <div class="orders-page">
    <!-- 页面标题 -->
    <PageHeader title="订单管理" subtitle="管理所有代理商订单，处理收款、设置移库费">
      <template #actions>
        <t-button variant="outline" @click="handleExport" :disabled="orderList.length === 0">
          <template #icon><t-icon name="download" /></template>
          导出报表
        </t-button>
      </template>
    </PageHeader>

    <!-- 筛选区域 -->
    <FilterCard>
      <t-form layout="inline" :data="filterForm" @submit="handleSearch">
        <t-form-item label="订单编号">
          <t-input
            v-model="filterForm.orderNo"
            placeholder="请输入订单编号"
            clearable
            style="width: 180px"
          />
        </t-form-item>
        <t-form-item label="关键词">
          <t-input
            v-model="filterForm.keyword"
            placeholder="联系人/电话"
            clearable
            style="width: 160px"
          />
        </t-form-item>
        <t-form-item label="下单时间">
          <t-date-range-picker
            v-model="filterForm.dateRange"
            :placeholder="['开始日期', '结束日期']"
            style="width: 260px"
          />
        </t-form-item>
        <t-form-item label="订单状态">
          <t-select
            v-model="filterForm.status"
            placeholder="全部状态"
            clearable
            style="width: 140px"
          >
            <t-option
              v-for="(item, key) in ORDER_STATUSES"
              :key="key"
              :value="key"
              :label="item.label"
            />
          </t-select>
        </t-form-item>
        <!-- 【2026-01-13 多仓库支持】仓库筛选 -->
        <t-form-item label="提货仓库">
          <t-select
            v-model="filterForm.warehouseId"
            placeholder="全部仓库"
            clearable
            style="width: 140px"
            :options="warehouseOptions"
          />
        </t-form-item>
        <t-form-item>
          <t-space>
            <t-button theme="primary" type="submit">
              <template #icon><t-icon name="search" /></template>
              查询
            </t-button>
            <t-button theme="default" @click="handleReset">
              <template #icon><t-icon name="refresh" /></template>
              重置
            </t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </FilterCard>

    <!-- 数据表格 -->
    <TableCard title="订单列表">
      <template v-if="!loading && orderList.length === 0">
        <EmptyState
          v-if="hasFilters"
          type="search"
          title="未找到匹配的订单"
          description="请尝试调整筛选条件"
        >
          <template #action>
            <t-button theme="primary" @click="handleReset">清除筛选</t-button>
          </template>
        </EmptyState>
        <EmptyState
          v-else
          type="data"
          title="暂无订单"
          description="还没有代理商下单"
        />
      </template>

      <t-table
        v-else
        :data="orderList"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        hover
        stripe
        @page-change="handlePageChange"
      >
        <!-- 订单编号 -->
        <template #orderNo="{ row }">
          <span class="order-no">{{ row.orderNo }}</span>
        </template>

        <!-- 订单类型 -->
        <template #orderType="{ row }">
          <StatusTag
            :type="row.needTransfer ? 'warning' : 'success'"
            :text="row.needTransfer ? '移库' : '到店'"
          />
        </template>

        <!-- 商品信息 -->
        <template #productInfo="{ row }">
          <ProductCell
            v-if="row.items && row.items.length > 0"
            :image="getProductImage(row.items[0])"
            :name="row.items[0].productName"
            :description="`数量: ${row.items[0].quantity}${row.items[0].product?.unit || '件'}${row.items.length > 1 ? ' 等' + row.items.length + '件商品' : ''}`"
          />
          <span v-else class="empty-text">暂无商品</span>
        </template>

        <!-- 【2026-01-13 多仓库支持】提货仓库 -->
        <template #warehouse="{ row }">
          <span v-if="row.warehouse">{{ row.warehouse.name }}</span>
          <span v-else class="empty-text">-</span>
        </template>

        <!-- 下单时间 -->
        <template #createdAt="{ row }">
          <span class="time-text">{{ formatTime(row.createdAt) }}</span>
        </template>

        <!-- 订单金额 -->
        <template #totalAmount="{ row }">
          <AmountText :value="row.totalAmount" />
        </template>

        <!-- 支付状态 -->
        <template #paymentStatus="{ row }">
          <StatusTag
            :type="getPaymentStatusType(row)"
            :text="getPaymentStatus(row).label"
          />
        </template>

        <!-- 订单状态 -->
        <template #status="{ row }">
          <StatusTag
            :type="ORDER_STATUSES[row.status]?.color || 'default'"
            :text="ORDER_STATUSES[row.status]?.label || row.status"
          />
        </template>

        <!-- 操作 -->
        <template #operation="{ row }">
          <t-space size="small">
            <t-link theme="primary" @click="handleViewDetail(row)">详情</t-link>
            <!-- 有更多操作时显示下拉菜单 -->
            <t-dropdown
              v-if="getOrderMoreActions(row).length > 0"
              :options="getOrderMoreActions(row)"
              trigger="click"
              @click="handleOrderAction($event, row)"
            >
              <t-link theme="default">
                更多
                <t-icon name="chevron-down" size="14px" />
              </t-link>
            </t-dropdown>
          </t-space>
        </template>
      </t-table>
    </TableCard>

    <!-- 订单详情弹窗 -->
    <t-dialog
      v-model:visible="detailVisible"
      header="订单详情"
      width="720px"
      :footer="false"
      :top="60"
    >
      <div v-if="currentOrder" class="order-detail" style="max-height: 70vh; overflow-y: auto;">
        <!-- 使用新的订单流程指示器组件 -->
        <div class="order-flow-wrapper">
          <OrderFlowIndicator
            :status="currentOrder.status"
            :need-transfer="currentOrder.needTransfer"
          />
        </div>

        <!-- 订单信息描述 -->
        <t-descriptions :column="2" bordered class="order-descriptions">
          <t-descriptions-item label="订单编号">
            <span class="order-no-text">{{ currentOrder.orderNo }}</span>
          </t-descriptions-item>
          <t-descriptions-item label="订单状态">
            <StatusTag
              :type="ORDER_STATUSES[currentOrder.status]?.color || 'default'"
              :text="ORDER_STATUSES[currentOrder.status]?.label || currentOrder.status"
            />
          </t-descriptions-item>
          <t-descriptions-item label="代理商">
            <span class="info-main">{{ currentOrder.agent?.name }}</span>
            <span class="info-sub">({{ currentOrder.agent?.phone }})</span>
          </t-descriptions-item>
          <t-descriptions-item label="代理类型">
            {{ formatAgentType(currentOrder.agent?.type) }}
          </t-descriptions-item>
          <t-descriptions-item label="联系人">{{ currentOrder.contactName }}</t-descriptions-item>
          <t-descriptions-item label="联系电话">{{ currentOrder.contactPhone }}</t-descriptions-item>
          <t-descriptions-item label="订单金额">
            <AmountText :value="currentOrder.totalAmount" size="large" />
          </t-descriptions-item>
          <t-descriptions-item label="已付金额">
            <AmountText :value="currentOrder.paidAmount" type="success" />
          </t-descriptions-item>
          <t-descriptions-item label="提货码" v-if="currentOrder.pickupCode">
            <t-tag theme="warning" size="large" class="pickup-code-tag">
              {{ currentOrder.pickupCode }}
            </t-tag>
          </t-descriptions-item>
          <t-descriptions-item label="订单类型">
            <StatusTag
              :type="currentOrder.needTransfer ? 'warning' : 'success'"
              :text="currentOrder.needTransfer ? 'VIP移库' : '到店自提'"
            />
          </t-descriptions-item>
          <t-descriptions-item label="移库费" v-if="currentOrder.needTransfer">
            <template v-if="Number(currentOrder.transferFee) > 0">
              <AmountText :value="currentOrder.transferFee" />
              <StatusTag
                v-if="currentOrder.transferFeeConfirmed"
                type="success"
                text="已确认"
                style="margin-left: 8px;"
              />
              <StatusTag
                v-else
                type="warning"
                text="待确认"
                style="margin-left: 8px;"
              />
            </template>
            <span v-else class="pending-text">未设置</span>
          </t-descriptions-item>
          <t-descriptions-item label="移库人" v-if="currentOrder.needTransfer">
            <template v-if="currentOrder.transferTask && currentOrder.transferTask.logistics">
              <div class="logistics-info">
                <span class="logistics-name">{{ currentOrder.transferTask.logistics.name }}</span>
                <span class="logistics-phone">({{ currentOrder.transferTask.logistics.phone }})</span>
                <StatusTag
                  v-if="currentOrder.transferTask.status === 'COMPLETED'"
                  type="success"
                  text="已完成"
                  style="margin-left: 8px;"
                />
                <StatusTag
                  v-else-if="currentOrder.transferTask.status === 'ACCEPTED'"
                  type="primary"
                  text="进行中"
                  style="margin-left: 8px;"
                />
                <StatusTag
                  v-else
                  type="warning"
                  text="待接单"
                  style="margin-left: 8px;"
                />
              </div>
            </template>
            <span v-else class="pending-text">待分配</span>
          </t-descriptions-item>
          <!-- 【2026-01-13 多仓库支持】提货仓库 -->
          <t-descriptions-item label="提货仓库">
            <div class="warehouse-info">
              <span v-if="currentOrder.warehouse">{{ currentOrder.warehouse.name }}</span>
              <span v-else class="pending-text">未指定</span>
              <t-button
                v-if="currentOrder.needTransfer && canAssignWarehouse(currentOrder)"
                size="small"
                variant="text"
                theme="primary"
                @click="handleAssignWarehouse(currentOrder)"
              >
                <t-icon name="edit" size="14px" />
                修改
              </t-button>
            </div>
          </t-descriptions-item>
          <t-descriptions-item label="下单时间" :span="2">
            {{ formatTime(currentOrder.createdAt) }}
          </t-descriptions-item>
          <t-descriptions-item label="客户备注" :span="2">
            {{ currentOrder.remark || '无' }}
          </t-descriptions-item>
          <t-descriptions-item label="管理备注" :span="2">
            {{ currentOrder.adminRemark || '无' }}
          </t-descriptions-item>
        </t-descriptions>

        <!-- 商品列表 -->
        <div class="order-items-section">
          <h4 class="section-title">商品列表</h4>
          <t-table
            :data="currentOrder.items"
            :columns="itemColumns"
            row-key="id"
            size="small"
            bordered
          >
            <template #productImage="{ row }">
              <img class="item-image" :src="getProductImage(row)" :alt="row.productName" />
            </template>
            <template #price="{ row }">
              <AmountText :value="row.price" size="small" />
            </template>
            <template #subtotal="{ row }">
              <AmountText :value="Number(row.price) * row.quantity" />
            </template>
          </t-table>
        </div>
      </div>
    </t-dialog>

    <!-- 取消订单弹窗 -->
    <t-dialog
      v-model:visible="cancelVisible"
      header="取消订单"
      width="500px"
      :confirm-btn="{ loading: submitting, theme: 'danger' }"
      @confirm="confirmCancel"
    >
      <t-form :data="cancelForm" label-width="80px">
        <t-form-item label="取消原因">
          <t-textarea
            v-model="cancelForm.reason"
            placeholder="请输入取消原因（选填）"
            :maxlength="200"
          />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 确认收款弹窗 -->
    <t-dialog
      v-model:visible="paymentVisible"
      header="确认收款"
      width="520px"
      :confirm-btn="{ loading: submitting, theme: 'primary' }"
      @confirm="submitConfirmPayment"
    >
      <div v-if="currentOrder" class="payment-dialog">
        <!-- 订单基本信息 -->
        <div class="payment-order-info">
          <div class="info-row">
            <span class="info-label">订单号</span>
            <span class="info-value">{{ currentOrder.orderNo }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">代理商</span>
            <span class="info-value">{{ currentOrder.agent?.name }} ({{ currentOrder.agent?.phone }})</span>
          </div>
          <div class="info-row">
            <span class="info-label">订单类型</span>
            <StatusTag
              :type="currentOrder.needTransfer ? 'warning' : 'success'"
              :text="currentOrder.needTransfer ? 'VIP移库' : '到店自提'"
            />
          </div>
        </div>

        <!-- 支付明细卡片 -->
        <div class="payment-details-card">
          <div class="payment-row">
            <span class="label">商品金额</span>
            <span class="value">¥ {{ formatAmount(getProductAmount(currentOrder)) }}</span>
          </div>
          <div v-if="currentOrder.needTransfer && Number(currentOrder.transferFee) > 0" class="payment-row">
            <span class="label">移库费</span>
            <span class="value">¥ {{ formatAmount(currentOrder.transferFee) }}</span>
          </div>
          <div class="payment-row total">
            <span class="label">订单总额</span>
            <span class="value">¥ {{ formatAmount(currentOrder.totalAmount) }}</span>
          </div>
          <div class="payment-divider"></div>
          <div class="payment-row">
            <span class="label">已付金额</span>
            <span class="value paid">¥ {{ formatAmount(currentOrder.paidAmount) }}</span>
          </div>
          <div class="payment-row pending">
            <span class="label">待收金额</span>
            <span class="value">¥ {{ getPendingAmount(currentOrder).toFixed(2) }}</span>
          </div>
        </div>

        <!-- 收款表单 -->
        <t-form :data="paymentForm" label-width="100px" class="payment-form">
          <t-form-item label="本次收款" required>
            <t-input-number
              v-model="paymentForm.amount"
              :min="0.01"
              :max="getPendingAmount(currentOrder)"
              :decimal-places="2"
              placeholder="请输入实际收到的金额"
              style="width: 100%;"
            />
            <div class="form-tip">
              <t-icon name="tips" size="14px" />
              <span>提示：所有订单需全款支付后才能进入后续流程</span>
            </div>
          </t-form-item>
          <t-form-item label="收款方式">
            <t-radio-group v-model="paymentForm.paymentType" variant="primary-filled">
              <t-radio-button value="transfer">银行转账</t-radio-button>
              <t-radio-button value="wechat">微信转账</t-radio-button>
              <t-radio-button value="alipay">支付宝</t-radio-button>
              <t-radio-button value="cash">现金</t-radio-button>
            </t-radio-group>
          </t-form-item>
          <t-form-item label="备注">
            <t-textarea
              v-model="paymentForm.remark"
              placeholder="请输入备注（转账流水号、付款人姓名等）"
              :maxlength="200"
            />
          </t-form-item>
        </t-form>

        <!-- 确认收款后状态预览 -->
        <div v-if="paymentForm.amount > 0" class="payment-preview" :class="{ success: willBeFullPaid }">
          <t-icon :name="willBeFullPaid ? 'check-circle' : 'info-circle'" />
          <span v-if="willBeFullPaid">
            本次收款后订单将变为<strong>「已付款」</strong>状态，可进入备货流程
          </span>
          <span v-else>
            本次收款 ¥{{ paymentForm.amount.toFixed(2) }}，剩余 ¥{{ (getPendingAmount(currentOrder) - paymentForm.amount).toFixed(2) }} 待收（需全款才能进入后续流程）
          </span>
        </div>
      </div>
    </t-dialog>

    <!-- 设置移库费弹窗 -->
    <t-dialog
      v-model:visible="transferFeeVisible"
      header="设置移库费"
      width="500px"
      :confirm-btn="{ loading: submitting, theme: 'warning' }"
      @confirm="submitSetTransferFee"
    >
      <div v-if="currentOrder" class="transfer-fee-dialog">
        <!-- 订单信息 -->
        <div class="transfer-fee-info">
          <div class="info-row">
            <span class="info-label">订单号</span>
            <span class="info-value">{{ currentOrder.orderNo }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">代理商</span>
            <span class="info-value">{{ currentOrder.agent?.name }} ({{ currentOrder.agent?.phone }})</span>
          </div>
          <div class="info-row">
            <span class="info-label">商品金额</span>
            <AmountText :value="currentOrder.totalAmount" size="large" />
          </div>
        </div>

        <div class="transfer-fee-tip">
          <t-icon name="info-circle-filled" />
          <span>设置移库费后，代理商需要在小程序端确认后才能继续支付</span>
        </div>

        <t-form :data="transferFeeForm" label-width="100px">
          <t-form-item label="移库费" required>
            <t-input-number
              v-model="transferFeeForm.fee"
              :min="0"
              :max="9999"
              :decimal-places="2"
              suffix="元"
              placeholder="请输入移库费金额"
              style="width: 100%;"
            />
          </t-form-item>
          <t-form-item label="应付总额">
            <AmountText
              :value="Number(currentOrder.totalAmount) + Number(transferFeeForm.fee || 0)"
              size="large"
            />
          </t-form-item>
          <t-form-item label="备注">
            <t-textarea
              v-model="transferFeeForm.remark"
              placeholder="可记录协商过程（选填）"
              :maxlength="200"
            />
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>

    <!-- 【2026-01-13 多仓库支持】指定仓库弹窗 -->
    <t-dialog
      v-model:visible="warehouseVisible"
      header="指定提货仓库"
      width="500px"
      :confirm-btn="{ loading: submitting, theme: 'primary' }"
      @confirm="submitAssignWarehouse"
    >
      <div v-if="currentOrder" class="warehouse-dialog">
        <!-- 订单信息 -->
        <div class="warehouse-order-info">
          <div class="info-row">
            <span class="info-label">订单号</span>
            <span class="info-value">{{ currentOrder.orderNo }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">代理商</span>
            <span class="info-value">{{ currentOrder.agent?.name }} ({{ currentOrder.agent?.phone }})</span>
          </div>
          <div class="info-row">
            <span class="info-label">当前仓库</span>
            <span class="info-value">{{ currentOrder.warehouse?.name || '未指定' }}</span>
          </div>
        </div>

        <t-form :data="warehouseForm" label-width="100px">
          <t-form-item label="提货仓库" required>
            <t-select
              v-model="warehouseForm.warehouseId"
              placeholder="请选择提货仓库"
              style="width: 100%;"
              :options="warehouseOptions"
            />
          </t-form-item>
        </t-form>

        <div class="warehouse-tip">
          <t-icon name="info-circle-filled" />
          <span>指定仓库后，该订单将由对应仓库的库管进行核销</span>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 订单管理页面
 * 管理所有代理商订单，处理收款、设置移库费、取消订单等操作
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import {
  PageHeader,
  FilterCard,
  TableCard,
  StatusTag,
  AmountText,
  ProductCell,
  EmptyState,
  OrderFlowIndicator,
} from '@/components'
import {
  getOrderList,
  getOrderDetail,
  cancelOrder,
  confirmPayment,
  setTransferFee,
  assignWarehouse,
  ORDER_STATUSES,
  getPaymentStatus,
  type Order,
  type OrderItem,
} from '@/api/order'
import { getActiveWarehouses } from '@/api/warehouse'  // 【2026-01-13 多仓库支持】
import { getImageUrl, getFirstImage as getFirstImageUtil, DEFAULT_PRODUCT_IMAGE } from '@/utils/image'

const route = useRoute()

// 筛选表单
const filterForm = reactive({
  orderNo: '',
  keyword: '',
  dateRange: [] as string[],
  status: '',
  warehouseId: null as number | null,  // 【2026-01-13 多仓库支持】
})

// 【2026-01-13 多仓库支持】仓库选项
const warehouseOptions = ref<{value: number, label: string}[]>([])

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showJumper: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50],
})

// 状态
const loading = ref(false)
const submitting = ref(false)
const orderList = ref<Order[]>([])
const currentOrder = ref<Order | null>(null)
const detailVisible = ref(false)
const detailLoading = ref(false)
const cancelVisible = ref(false)
const paymentVisible = ref(false)
const transferFeeVisible = ref(false)
const warehouseVisible = ref(false)  // 【2026-01-13 多仓库支持】

// 表单
const cancelForm = reactive({ reason: '' })
const paymentForm = reactive({ amount: 0, remark: '', paymentType: 'transfer' })
const transferFeeForm = reactive({ fee: 50, remark: '' })
const warehouseForm = reactive({ warehouseId: null as number | null })  // 【2026-01-13 多仓库支持】

// 计算属性：是否有筛选条件
const hasFilters = computed(() => {
  return filterForm.orderNo || filterForm.keyword || filterForm.status || filterForm.dateRange.length > 0 || filterForm.warehouseId
})

// 计算属性：收款后是否为全款
const willBeFullPaid = computed(() => {
  if (!currentOrder.value) return false
  const total = Number(currentOrder.value.totalAmount)
  const paid = Number(currentOrder.value.paidAmount)
  return (paid + paymentForm.amount) >= total
})

// 表格列定义
const columns = [
  { colKey: 'orderNo', title: '订单编号', width: 180 },
  { colKey: 'orderType', title: '类型', width: 90, align: 'center' },
  { colKey: 'productInfo', title: '商品信息', width: 260 },
  { colKey: 'warehouse', title: '提货仓库', width: 120 },  // 【2026-01-13 多仓库支持】
  { colKey: 'createdAt', title: '下单时间', width: 160 },
  { colKey: 'totalAmount', title: '订单金额', width: 110 },
  { colKey: 'paymentStatus', title: '支付状态', width: 90, align: 'center' },
  { colKey: 'status', title: '订单状态', width: 90, align: 'center' },
  { colKey: 'operation', title: '操作', width: 200, align: 'center', fixed: 'right' },
]

// 订单项列定义
const itemColumns = [
  { colKey: 'productImage', title: '图片', width: 80 },
  { colKey: 'productName', title: '商品名称', ellipsis: true },
  { colKey: 'price', title: '单价', width: 100 },
  { colKey: 'quantity', title: '数量', width: 80 },
  { colKey: 'subtotal', title: '小计', width: 100 },
]

// 获取商品图片
function getProductImage(item: OrderItem): string {
  // 优先使用订单项中的图片
  if (item.productImage) {
    return getImageUrl(item.productImage) || DEFAULT_PRODUCT_IMAGE
  }
  // 尝试从商品数据解析图片
  if (item.product?.images) {
    return getFirstImageUtil(item.product.images, DEFAULT_PRODUCT_IMAGE)
  }
  return DEFAULT_PRODUCT_IMAGE
}

// 格式化时间
function formatTime(timeStr: string): string {
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 格式化金额
function formatAmount(amount: string | number): string {
  return Number(amount).toFixed(2)
}

// 格式化代理商类型
function formatAgentType(type: string | undefined): string {
  const typeMap: Record<string, string> = {
    LEVEL1: '一级代理',
    LEVEL2: '二级代理',
    LEVEL3: '三级代理',
    WHOLESALE: '批发商',
  }
  return type ? typeMap[type] || type : '-'
}

// 获取支付状态类型
function getPaymentStatusType(order: Order): string {
  const status = getPaymentStatus(order)
  const colorMap: Record<string, string> = {
    default: 'default',
    warning: 'warning',
    success: 'success',
  }
  return colorMap[status.color] || 'default'
}

// 判断是否可以取消
function canCancel(status: string): boolean {
  return ['pending_payment', 'pending_accept'].includes(status)
}

// 获取订单更多操作下拉菜单选项
function getOrderMoreActions(row: Order): Array<{ content: string; value: string; theme?: string }> {
  const actions: Array<{ content: string; value: string; theme?: string }> = []

  // 待付款且需要移库的订单：设置移库费
  if (row.status === 'pending_payment' && row.needTransfer && Number(row.transferFee) === 0) {
    actions.push({ content: '设置移库费', value: 'setTransferFee', theme: 'warning' })
  }

  // 待付款订单：客服确认收款
  if (row.status === 'pending_payment') {
    actions.push({ content: '确认收款', value: 'confirmPayment', theme: 'success' })
  }

  // 可取消的订单
  if (canCancel(row.status)) {
    actions.push({ content: '取消订单', value: 'cancel', theme: 'error' })
  }

  // 【2026-01-13 多仓库支持】锁货模式订单可指定仓库
  if (row.needTransfer && !['completed', 'cancelled'].includes(row.status)) {
    actions.push({ content: '指定仓库', value: 'assignWarehouse', theme: 'primary' })
  }

  return actions
}

// 处理订单下拉菜单操作
function handleOrderAction(data: { value: string }, row: Order) {
  const actionMap: Record<string, () => void> = {
    setTransferFee: () => handleSetTransferFee(row),
    confirmPayment: () => handleConfirmPayment(row),
    cancel: () => handleCancel(row),
    assignWarehouse: () => handleAssignWarehouse(row),  // 【2026-01-13】
  }

  const action = actionMap[data.value]
  if (action) {
    action()
  }
}

// 支付相关辅助函数
function getProductAmount(order: Order): number {
  const total = Number(order.totalAmount)
  const transferFee = Number(order.transferFee || 0)
  return total - transferFee
}

function getPendingAmount(order: Order): number {
  return Number(order.totalAmount) - Number(order.paidAmount)
}

// 【2026-01-13 多仓库支持】加载仓库列表
async function loadWarehouses() {
  try {
    const res = await getActiveWarehouses()
    warehouseOptions.value = (res.data || []).map((w: any) => ({
      value: w.id,
      label: w.name
    }))
  } catch (err) {
    console.error('加载仓库列表失败:', err)
  }
}

// 获取订单列表
async function fetchOrders() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.current,
      pageSize: pagination.pageSize,
    }
    if (filterForm.orderNo) params.orderNo = filterForm.orderNo
    if (filterForm.keyword) params.keyword = filterForm.keyword
    if (filterForm.status) params.status = filterForm.status
    if (filterForm.warehouseId) params.warehouseId = filterForm.warehouseId  // 【2026-01-13】
    if (filterForm.dateRange && filterForm.dateRange.length === 2) {
      params.startDate = filterForm.dateRange[0]
      params.endDate = filterForm.dateRange[1]
    }

    const res = await getOrderList(params)
    orderList.value = res.data.list
    pagination.total = res.data.total
  } catch (err) {
    console.error('获取订单列表失败:', err)
    MessagePlugin.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  pagination.current = 1
  fetchOrders()
}

// 重置
function handleReset() {
  filterForm.orderNo = ''
  filterForm.keyword = ''
  filterForm.dateRange = []
  filterForm.status = ''
  filterForm.warehouseId = null  // 【2026-01-13】
  pagination.current = 1
  fetchOrders()
}

// 分页变化
function handlePageChange(pageInfo: { current: number; pageSize: number }) {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  fetchOrders()
}

// 导出订单为CSV
async function handleExport() {
  if (orderList.value.length === 0) {
    MessagePlugin.warning('暂无数据可导出')
    return
  }

  try {
    MessagePlugin.loading('正在导出...')

    // 构建CSV内容
    const headers = ['订单编号', '下单时间', '代理商', '联系电话', '订单状态', '支付状态', '商品数量', '订单金额', '已付金额', '备注']
    const rows = orderList.value.map(order => {
      const statusLabel = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES]?.label || order.status
      const paymentLabel = getPaymentStatus(order).label
      const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
      return [
        order.orderNo,
        order.createdAt ? new Date(order.createdAt).toLocaleString('zh-CN') : '',
        order.agent?.name || '',
        order.agent?.phone || '',
        statusLabel,
        paymentLabel,
        itemCount,
        Number(order.totalAmount).toFixed(2),
        Number(order.paidAmount || 0).toFixed(2),
        order.remark || ''
      ]
    })

    // 转换为CSV字符串
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // 添加BOM以支持Excel正确显示中文
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `订单导出_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    MessagePlugin.success('导出成功')
  } catch (err) {
    console.error('导出失败:', err)
    MessagePlugin.error('导出失败')
  }
}

// 查看详情
async function handleViewDetail(order: Order) {
  detailLoading.value = true
  try {
    const res = await getOrderDetail(order.id)
    if (!res.data) {
      MessagePlugin.error('订单数据为空')
      return
    }
    currentOrder.value = res.data
    detailVisible.value = true
  } catch (err) {
    console.error('获取订单详情失败:', err)
    MessagePlugin.error('获取订单详情失败')
  } finally {
    detailLoading.value = false
  }
}

// 取消订单
function handleCancel(order: Order) {
  currentOrder.value = order
  cancelForm.reason = ''
  cancelVisible.value = true
}

async function confirmCancel() {
  if (!currentOrder.value) return
  submitting.value = true
  try {
    await cancelOrder(currentOrder.value.id, cancelForm.reason)
    MessagePlugin.success('订单已取消')
    cancelVisible.value = false
    fetchOrders()
  } catch (err) {
    MessagePlugin.error('取消失败')
  } finally {
    submitting.value = false
  }
}

// 确认收款
async function handleConfirmPayment(order: Order) {
  try {
    const res = await getOrderDetail(order.id)
    currentOrder.value = res.data
    const pendingAmount = Number(res.data.totalAmount) - Number(res.data.paidAmount)
    paymentForm.amount = Number(pendingAmount.toFixed(2))
    paymentForm.remark = ''
    paymentVisible.value = true
  } catch (err) {
    MessagePlugin.error('获取订单详情失败')
  }
}

async function submitConfirmPayment() {
  if (!currentOrder.value) return
  if (!paymentForm.amount || paymentForm.amount <= 0) {
    MessagePlugin.warning('请输入有效的收款金额')
    return
  }
  const pendingAmount = getPendingAmount(currentOrder.value)
  if (paymentForm.amount > pendingAmount) {
    MessagePlugin.warning('收款金额不能超过待付金额')
    return
  }

  const paymentTypeText: Record<string, string> = {
    transfer: '银行转账',
    wechat: '微信转账',
    alipay: '支付宝',
    cash: '现金',
  }
  const fullRemark = paymentForm.remark
    ? `[${paymentTypeText[paymentForm.paymentType]}] ${paymentForm.remark}`
    : `[${paymentTypeText[paymentForm.paymentType]}]`

  submitting.value = true
  try {
    await confirmPayment(currentOrder.value.id, paymentForm.amount, fullRemark)
    MessagePlugin.success('收款确认成功')
    paymentVisible.value = false
    fetchOrders()
  } catch (err: any) {
    MessagePlugin.error(err.response?.data?.message || '确认收款失败')
  } finally {
    submitting.value = false
  }
}

// 设置移库费
async function handleSetTransferFee(order: Order) {
  try {
    const res = await getOrderDetail(order.id)
    currentOrder.value = res.data
    transferFeeForm.fee = 50
    transferFeeForm.remark = ''
    transferFeeVisible.value = true
  } catch (err) {
    MessagePlugin.error('获取订单详情失败')
  }
}

async function submitSetTransferFee() {
  if (!currentOrder.value) return
  if (transferFeeForm.fee === undefined || transferFeeForm.fee < 0) {
    MessagePlugin.warning('请输入有效的移库费金额')
    return
  }
  submitting.value = true
  try {
    await setTransferFee(currentOrder.value.id, transferFeeForm.fee, transferFeeForm.remark)
    MessagePlugin.success('移库费设置成功，等待代理商确认')
    transferFeeVisible.value = false
    fetchOrders()
  } catch (err: any) {
    MessagePlugin.error(err.response?.data?.message || '设置移库费失败')
  } finally {
    submitting.value = false
  }
}

// 【2026-01-13 多仓库支持】判断是否可以指定仓库
function canAssignWarehouse(order: Order): boolean {
  // 锁货模式订单，且未完成/未取消，都可以修改仓库
  const notAllowed = ['completed', 'cancelled']
  return order.needTransfer && !notAllowed.includes(order.status)
}

// 【2026-01-13 多仓库支持】打开指定仓库弹窗
async function handleAssignWarehouse(order: Order) {
  try {
    const res = await getOrderDetail(order.id)
    currentOrder.value = res.data
    warehouseForm.warehouseId = res.data.warehouse?.id || null
    warehouseVisible.value = true
  } catch (err) {
    MessagePlugin.error('获取订单详情失败')
  }
}

// 【2026-01-13 多仓库支持】提交指定仓库
async function submitAssignWarehouse() {
  if (!currentOrder.value) return
  if (!warehouseForm.warehouseId) {
    MessagePlugin.warning('请选择提货仓库')
    return
  }
  submitting.value = true
  try {
    await assignWarehouse(currentOrder.value.id, warehouseForm.warehouseId)
    MessagePlugin.success('提货仓库设置成功')
    warehouseVisible.value = false
    // 刷新订单详情
    const res = await getOrderDetail(currentOrder.value.id)
    currentOrder.value = res.data
    fetchOrders()
  } catch (err: any) {
    MessagePlugin.error(err.response?.data?.message || '设置提货仓库失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  loadWarehouses()  // 【2026-01-13】
  await fetchOrders()

  // 【2026-01-13】支持通过URL参数打开订单详情
  const orderId = route.query.id
  if (orderId) {
    openDetail(Number(orderId))
  }
})
</script>

<style scoped>
.orders-page {
  padding: 0;
}

/* 空文本 */
.empty-text {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

/* 时间文本 */
.time-text {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

/* 订单编号 */
.order-no {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
}

/* ===== 订单详情弹窗 ===== */
.order-detail {
  padding: var(--spacing-sm) 0;
}

.order-flow-wrapper {
  background: linear-gradient(135deg, var(--color-primary-lighter) 0%, #fff5f2 100%);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
  border: 1px solid var(--color-primary-border);
}

.order-descriptions {
  margin-bottom: var(--spacing-xl);
}

.order-no-text {
  font-family: var(--font-family-mono);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.info-main {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.info-sub {
  color: var(--color-text-tertiary);
  margin-left: var(--spacing-xs);
}

.pickup-code-tag {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-lg);
  letter-spacing: 2px;
}

.pending-text {
  color: var(--color-warning);
  font-weight: var(--font-weight-medium);
}

.logistics-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.logistics-name {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.logistics-phone {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

/* 商品列表区域 */
.order-items-section {
  margin-top: var(--spacing-xl);
}

.section-title {
  margin: 0 0 var(--spacing-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.section-title::before {
  content: '';
  width: 3px;
  height: 14px;
  background: var(--color-primary);
  border-radius: 2px;
}

.item-image {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  border: 1px solid var(--color-border-light);
}

/* ===== 确认收款弹窗 ===== */
.payment-dialog {
  padding: var(--spacing-sm) 0;
}

.payment-order-info {
  background: var(--color-bg-page);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.payment-order-info .info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) 0;
}

.payment-order-info .info-label {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.payment-order-info .info-value {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.payment-details-card {
  background: var(--color-bg-container);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border-light);
  margin-bottom: var(--spacing-lg);
}

.payment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
}

.payment-row .label {
  color: var(--color-text-secondary);
}

.payment-row .value {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.payment-row .value.paid {
  color: var(--color-success);
}

.payment-row.total {
  font-weight: var(--font-weight-semibold);
}

.payment-row.total .label,
.payment-row.total .value {
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
}

.payment-row.sub {
  padding-top: 0;
}

.payment-row.sub .label {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

.payment-row.pending {
  padding-top: var(--spacing-md);
}

.payment-row.pending .label {
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.payment-row.pending .value {
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  font-size: var(--font-size-xl);
}

.payment-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: var(--spacing-sm) 0;
}

.payment-form {
  margin-top: var(--spacing-lg);
}

.form-tip {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

.payment-preview {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-lg);
  background: var(--color-warning-light);
  color: var(--color-warning-hover);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-md);
}

.payment-preview.success {
  background: var(--color-success-light);
  color: var(--color-success-hover);
}

.payment-preview strong {
  font-weight: var(--font-weight-semibold);
}

/* ===== 设置移库费弹窗 ===== */
.transfer-fee-dialog {
  padding: var(--spacing-sm) 0;
}

.transfer-fee-info {
  background: var(--color-bg-page);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.transfer-fee-info .info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) 0;
}

.transfer-fee-info .info-label {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.transfer-fee-info .info-value {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.transfer-fee-tip {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-lg);
  background: var(--color-warning-lighter);
  color: var(--color-warning-hover);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-lg);
  line-height: 1.5;
}

.transfer-fee-tip .t-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

/* ===== 【2026-01-13 多仓库支持】指定仓库弹窗 ===== */
.warehouse-dialog {
  padding: var(--spacing-sm) 0;
}

.warehouse-order-info {
  background: var(--color-bg-page);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.warehouse-order-info .info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) 0;
}

.warehouse-order-info .info-label {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.warehouse-order-info .info-value {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.warehouse-tip {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-lg);
  background: var(--color-primary-lighter);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-lg);
  line-height: 1.5;
}

.warehouse-tip .t-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

/* 仓库信息行 */
.warehouse-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
</style>
