<template>
  <div class="stock-page">
    <!-- 搜索栏 -->
    <div class="search-section">
      <t-search
        v-model="searchKeyword"
        placeholder="搜索商品名、条码、编码"
        @change="onSearchChange"
        @clear="onSearchClear"
      />
    </div>

    <!-- 统计卡片区 -->
    <div class="stats-section">
      <div class="stats-grid">
        <!-- 库存总量卡片 -->
        <div class="stat-card stat-card-large" @click="handleStatClick('total')">
          <div class="stat-card-bg"></div>
          <div class="stat-card-content">
            <div class="stat-left">
              <span class="stat-label-light">库存总量 (箱)</span>
              <span class="stat-value-large">{{ statistics.totalStock }}</span>
            </div>
            <div class="stat-icon-wrap primary">
              <t-icon name="shop" size="24px" color="#fff" />
            </div>
          </div>
          <div class="stat-extra">
            <div v-if="statistics.todayIn > 0" class="stat-badge success">
              <t-icon name="arrow-up" size="12px" color="#4ade80" />
              <span>+{{ statistics.todayIn }} 今日入库</span>
            </div>
            <span class="stat-time">商品种类: {{ statistics.productCount }}</span>
          </div>
        </div>

        <!-- 库存预警卡片 -->
        <div class="stat-card stat-card-warning" @click="handleStatClick('warning')">
          <div class="stat-header">
            <div class="stat-icon warning">
              <t-icon name="error-circle" size="18px" color="#e53a34" />
            </div>
            <span class="stat-value">{{ statistics.warningCount }}</span>
          </div>
          <span class="stat-label">库存预警</span>
        </div>

        <!-- 待处理单据卡片 -->
        <div class="stat-card" @click="handleStatClick('pending')">
          <div class="stat-header">
            <div class="stat-icon pending">
              <t-icon name="file" size="18px" color="#f97316" />
            </div>
            <span class="stat-value">{{ statistics.pendingOrderCount }}</span>
          </div>
          <span class="stat-label">待处理单据</span>
        </div>
      </div>
    </div>

    <!-- 常用功能 -->
    <div class="actions-section">
      <div class="section-title">常用功能</div>
      <div class="actions-grid">
        <div class="action-item" @click="openStockInDialog">
          <div class="action-icon primary">
            <t-icon name="download" size="22px" color="#fff" />
          </div>
          <span class="action-label">快速入库</span>
        </div>
        <div class="action-item" @click="showInventoryDialog = true">
          <div class="action-icon success">
            <t-icon name="check-circle" size="22px" color="#fff" />
          </div>
          <span class="action-label">库存盘点</span>
        </div>
        <div class="action-item" @click="openAdjustDialog">
          <div class="action-icon default">
            <t-icon name="setting" size="22px" color="#e53a34" />
          </div>
          <span class="action-label">库存调整</span>
        </div>
        <div class="action-item" @click="handleShowLogs">
          <div class="action-icon default">
            <t-icon name="history" size="22px" color="#e53a34" />
          </div>
          <span class="action-label">出入明细</span>
        </div>
      </div>
    </div>

    <!-- 库存概览列表 -->
    <div class="stock-section">
      <div class="section-header">
        <span class="section-title">库存概览</span>
        <div class="section-action" @click="showWarningOnly = !showWarningOnly">
          <span>{{ showWarningOnly ? '查看全部' : '仅预警' }}</span>
          <t-icon name="chevron-right" size="16px" color="#e53a34" />
        </div>
      </div>
    </div>

    <!-- 库存列表 -->
    <div class="stock-list">
      <t-pull-down-refresh v-model="refreshing" @refresh="onRefresh">
        <div v-if="loading && filteredProducts.length === 0" class="loading-container">
          <t-loading text="加载中..." />
        </div>

        <div v-else-if="filteredProducts.length === 0" class="empty-container">
          <t-empty :description="searchKeyword ? '未找到匹配商品' : (showWarningOnly ? '暂无库存预警商品，库存充足' : '暂无库存数据')" />
        </div>

        <div v-else>
          <div v-for="product in filteredProducts" :key="product.id" class="stock-item">
            <div class="item-image">
              <img :src="getFirstImage(product.image)" alt="" @error="handleImageError" />
            </div>

            <div class="item-content">
              <div class="item-name">{{ product.name }}</div>
              <div class="item-info">
                <span v-if="product.barcode" class="info-tag">条码: {{ product.barcode }}</span>
                <span v-if="product.sku" class="info-tag">编码: {{ product.sku }}</span>
              </div>
              <div class="item-stock">
                <span class="stock-label">库存:</span>
                <span
                  :class="['stock-value', { warning: product.stock <= product.minStock }]"
                >
                  {{ product.stock }}
                </span>
                <span v-if="product.lockStock > 0" class="lock-stock" @click.stop="showLockStockInfo">
                  (锁定: {{ product.lockStock }})
                  <t-icon name="info-circle" size="14px" color="#999" />
                </span>
              </div>
            </div>

            <div class="item-actions">
              <t-button theme="primary" size="small" variant="outline" @click="handleStockIn(product)">
                入库
              </t-button>
              <t-button theme="default" size="small" variant="outline" @click="handleAdjust(product)">
                调整
              </t-button>
            </div>
          </div>

          <!-- 加载更多 -->
          <div v-if="hasMore" class="load-more">
            <t-button theme="default" size="small" :loading="loadingMore" @click="loadMore">
              {{ loadingMore ? '加载中...' : '加载更多' }}
            </t-button>
          </div>

          <div v-else-if="filteredProducts.length > 0" class="no-more">
            已加载全部商品
          </div>
        </div>
      </t-pull-down-refresh>
    </div>

    <!-- 快速入库弹窗 -->
    <t-popup v-model="showStockInDialog" placement="bottom">
      <div class="popup-container">
        <div class="popup-header">
          <span class="popup-title">快速入库</span>
          <div class="popup-close" @click="showStockInDialog = false">
            <t-icon name="close" size="20px" />
          </div>
        </div>
        <div class="popup-body">
          <div class="form-item">
            <span class="label">选择商品:</span>
            <div class="product-picker" @click="showProductPicker = true">
              <span :class="['picker-value', { placeholder: !stockInForm.productName }]">
                {{ stockInForm.productName || '点击选择商品' }}
              </span>
              <t-icon name="chevron-right" size="16px" color="#999" />
            </div>
          </div>
          <div class="form-item">
            <span class="label">入库数量:</span>
            <t-input
              v-model.number="stockInForm.quantity"
              type="number"
              placeholder="请输入数量"
              :min="1"
            />
          </div>
          <div class="form-item">
            <span class="label">备注:</span>
            <t-textarea v-model="stockInForm.remark" placeholder="选填" :maxlength="200" />
          </div>
        </div>
        <div class="popup-footer">
          <t-button theme="primary" block @click="handleStockInConfirm">确认入库</t-button>
        </div>
      </div>
    </t-popup>

    <!-- 商品选择器弹窗 -->
    <t-popup v-model="showProductPicker" placement="bottom">
      <div class="picker-container">
        <div class="picker-header">
          <span class="picker-cancel" @click="showProductPicker = false">取消</span>
          <span class="picker-title">选择商品</span>
          <span class="picker-confirm" @click="showProductPicker = false">确定</span>
        </div>
        <div class="picker-search">
          <t-search v-model="productPickerSearch" placeholder="搜索商品" @change="onProductPickerSearch" />
        </div>
        <div class="picker-list">
          <div
            v-for="item in productPickerList"
            :key="item.id"
            :class="['picker-item', { active: stockInForm.productId === item.id }]"
            @click="onSelectProduct(item)"
          >
            <div class="picker-item-name">{{ item.name }}</div>
            <div class="picker-item-info">库存: {{ item.stock }}</div>
            <t-icon v-if="stockInForm.productId === item.id" name="check" size="18px" color="var(--primary)" />
          </div>
          <div v-if="productPickerList.length === 0" class="picker-empty">
            暂无商品
          </div>
        </div>
      </div>
    </t-popup>

    <!-- 库存调整弹窗 -->
    <t-popup v-model="showAdjustDialog" placement="bottom">
      <div class="popup-container">
        <div class="popup-header">
          <span class="popup-title">库存调整</span>
          <div class="popup-close" @click="showAdjustDialog = false">
            <t-icon name="close" size="20px" />
          </div>
        </div>
        <div class="popup-body">
          <div class="form-item">
            <span class="label">选择商品:</span>
            <div v-if="adjustForm.productId" class="selected-product">
              <span class="value">{{ adjustForm.productName }}</span>
              <span class="change-btn" @click="showAdjustProductPicker = true">更换</span>
            </div>
            <div v-else class="product-picker" @click="showAdjustProductPicker = true">
              <span class="picker-value placeholder">点击选择商品</span>
              <t-icon name="chevron-right" size="16px" color="#999" />
            </div>
          </div>
          <div v-if="adjustForm.productId" class="form-item">
            <span class="label">当前库存:</span>
            <span class="value">{{ adjustForm.currentStock }}</span>
          </div>
          <div class="form-item">
            <span class="label">调整类型:</span>
            <t-radio-group v-model="adjustForm.type">
              <t-radio value="increase">增加</t-radio>
              <t-radio value="decrease">减少</t-radio>
            </t-radio-group>
          </div>
          <div class="form-item">
            <span class="label">调整数量:</span>
            <t-input
              v-model.number="adjustForm.quantity"
              type="number"
              placeholder="请输入数量"
              :min="1"
            />
          </div>
          <div class="form-item">
            <span class="label">调整原因:</span>
            <t-textarea v-model="adjustForm.reason" placeholder="必填" :maxlength="200" />
          </div>
        </div>
        <div class="popup-footer">
          <t-button theme="primary" block :disabled="!adjustForm.productId" @click="handleAdjustConfirm">确认调整</t-button>
        </div>
      </div>
    </t-popup>

    <!-- 库存调整商品选择器弹窗 -->
    <t-popup v-model="showAdjustProductPicker" placement="bottom">
      <div class="picker-container">
        <div class="picker-header">
          <span class="picker-cancel" @click="showAdjustProductPicker = false">取消</span>
          <span class="picker-title">选择商品</span>
          <span class="picker-confirm" @click="showAdjustProductPicker = false">确定</span>
        </div>
        <div class="picker-search">
          <t-search v-model="adjustProductSearch" placeholder="搜索商品" @change="onAdjustProductSearch" />
        </div>
        <div class="picker-list">
          <div
            v-for="item in adjustProductList"
            :key="item.id"
            :class="['picker-item', { active: adjustForm.productId === item.id }]"
            @click="onSelectAdjustProduct(item)"
          >
            <div class="picker-item-name">{{ item.name }}</div>
            <div class="picker-item-info">库存: {{ item.stock }}</div>
            <t-icon v-if="adjustForm.productId === item.id" name="check" size="18px" color="var(--primary)" />
          </div>
          <div v-if="adjustProductList.length === 0" class="picker-empty">
            暂无商品
          </div>
        </div>
      </div>
    </t-popup>

    <!-- 库存盘点弹窗 -->
    <t-popup v-model="showInventoryDialog" placement="bottom">
      <div class="popup-container popup-container-large">
        <div class="popup-header">
          <span class="popup-title">库存盘点</span>
          <div class="popup-close" @click="closeInventoryDialog">
            <t-icon name="close" size="20px" />
          </div>
        </div>
        <div class="popup-body">
          <div class="form-item">
            <span class="label">扫码/输入条码或SKU:</span>
            <div class="scan-input-group">
              <t-input
                v-model="inventoryForm.code"
                placeholder="条码/SKU"
                clearable
                @change="handleCodeChange"
              />
              <t-button theme="primary" size="small" @click="handleInventoryScan">
                <t-icon name="scan" /> 扫码
              </t-button>
            </div>
          </div>

          <!-- 空状态提示 -->
          <div v-if="!inventoryForm.product" class="inventory-empty">
            <div class="empty-icon">
              <t-icon name="scan" size="48px" color="#ccc" />
            </div>
            <div class="empty-text">请扫码或输入条形码/SKU查询商品</div>
          </div>

          <!-- 商品信息区 -->
          <div v-else class="inventory-product-info">
            <div class="product-card">
              <div class="info-row">
                <span class="label">商品名称:</span>
                <span class="value">{{ inventoryForm.product.name }}</span>
              </div>
              <div class="info-row">
                <span class="label">系统库存:</span>
                <span class="value stock-value">{{ inventoryForm.product.stock }}</span>
              </div>
              <div class="info-row">
                <span class="label">实际库存:</span>
                <t-input
                  v-model.number="inventoryForm.actualQuantity"
                  type="number"
                  placeholder="请输入实际库存"
                  :min="0"
                />
              </div>
            </div>

            <!-- 盘盈盘亏卡片 -->
            <div :class="['diff-card', diffClass]">
              <div class="diff-icon">
                <t-icon :name="inventoryDiff > 0 ? 'arrow-up' : inventoryDiff < 0 ? 'arrow-down' : 'check'" size="24px" />
              </div>
              <div class="diff-content">
                <div class="diff-label">{{ diffLabel }}</div>
                <div class="diff-value">{{ Math.abs(inventoryDiff) }}</div>
              </div>
            </div>

            <!-- 重新扫码按钮 -->
            <div class="rescan-btn">
              <t-button theme="default" variant="outline" size="small" @click="resetInventoryForm">
                <t-icon name="refresh" /> 重新扫码
              </t-button>
            </div>
          </div>

          <div class="form-item">
            <span class="label">备注:</span>
            <t-textarea v-model="inventoryForm.remark" placeholder="选填" :maxlength="200" />
          </div>
        </div>
        <div class="popup-footer">
          <t-button theme="primary" block :disabled="!inventoryForm.product" @click="handleInventoryConfirm">
            提交盘点
          </t-button>
        </div>
      </div>
    </t-popup>

    <!-- 出入明细弹窗 -->
    <t-popup v-model="showLogsDialog" placement="bottom">
      <div class="popup-container popup-container-large">
        <div class="popup-header">
          <span class="popup-title">出入明细</span>
          <div class="popup-close" @click="showLogsDialog = false">
            <t-icon name="close" size="20px" />
          </div>
        </div>
        <div class="popup-body logs-body">
          <div v-if="logsLoading" class="logs-loading">
            <t-loading text="加载中..." />
          </div>
          <div v-else-if="stockLogs.length === 0" class="logs-empty">
            <t-empty description="暂无出入记录" />
          </div>
          <div v-else class="logs-list">
            <div v-for="log in stockLogs" :key="log.id" class="log-item">
              <div class="log-icon" :class="log.type">
                <t-icon :name="getLogIcon(log.type)" size="18px" />
              </div>
              <div class="log-content">
                <div class="log-title">{{ getLogTitle(log.type) }}</div>
                <div class="log-desc">{{ log.productName || '未知商品' }}</div>
                <div class="log-time">{{ formatSmartTime(log.createdAt) }}</div>
              </div>
              <div :class="['log-quantity', log.type === 'in' || log.type === 'adjust_increase' ? 'increase' : 'decrease']">
                {{ log.type === 'in' || log.type === 'adjust_increase' ? '+' : '-' }}{{ log.quantity }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </t-popup>

    <!-- 扫码器 -->
    <QRScanner v-model="showScanner" @success="handleScanSuccess" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import { getStock, stockIn, adjustStock, inventoryCheck, getProduct, getStockStatistics, getStockLogs } from '@/api/stock'
import type { StockStatistics, StockLog } from '@/api/stock'
import { debounce, memoryCache } from '@/utils/performance'
import { getFirstImage, formatSmartTime } from '@/utils/format'
import { vibrate } from '@/utils/bridge'
import { SEARCH_DEBOUNCE_DELAY, PAGE_SIZE } from '@/utils/constants'
import QRScanner from '@/components/QRScanner.vue'
import type { StockProduct } from '@/types'

const router = useRouter()
const searchKeyword = ref('')
const showWarningOnly = ref(false)
const products = ref<StockProduct[]>([])
const loading = ref(false)
const refreshing = ref(false)
const loadingMore = ref(false)
const hasMore = ref(false)
const currentPage = ref(1)

// 统计数据
const statistics = ref<StockStatistics>({
  totalStock: 0,
  warningCount: 0,
  outOfStockCount: 0,
  pendingOrderCount: 0,
  productCount: 0,
  todayIn: 0
})

// 入库表单
const showStockInDialog = ref(false)
const stockInForm = ref({
  productId: '',
  productName: '',
  quantity: 1,
  remark: ''
})

// 商品选择器
const showProductPicker = ref(false)
const productPickerSearch = ref('')
const productPickerList = ref<StockProduct[]>([])

// 调整表单
const showAdjustDialog = ref(false)
const adjustForm = ref({
  productId: '',
  productName: '',
  currentStock: 0,
  type: 'increase' as 'increase' | 'decrease',
  quantity: 1,
  reason: ''
})

// 调整商品选择器
const showAdjustProductPicker = ref(false)
const adjustProductSearch = ref('')
const adjustProductList = ref<StockProduct[]>([])

// 盘点表单
const showInventoryDialog = ref(false)
const inventoryForm = ref({
  code: '',
  product: null as StockProduct | null,
  actualQuantity: 0,
  remark: ''
})

// 出入明细
const showLogsDialog = ref(false)
const stockLogs = ref<StockLog[]>([])
const logsLoading = ref(false)

const showScanner = ref(false)
const scanPurpose = ref<'inventory'>('inventory')

// 预警数量
const warningCount = computed(() => {
  return products.value.filter(p => p.stock <= p.minStock).length
})

// 过滤后的商品
const filteredProducts = computed(() => {
  if (showWarningOnly.value) {
    return products.value.filter(p => p.stock <= p.minStock)
  }
  return products.value
})

// 盘点盈亏
const inventoryDiff = computed(() => {
  if (!inventoryForm.value.product) return 0
  return inventoryForm.value.actualQuantity - inventoryForm.value.product.stock
})

// 盘盈盘亏样式类
const diffClass = computed(() => {
  if (inventoryDiff.value > 0) return 'profit'
  if (inventoryDiff.value < 0) return 'loss'
  return 'balanced'
})

// 盘盈盘亏标签
const diffLabel = computed(() => {
  if (inventoryDiff.value > 0) return '盘盈'
  if (inventoryDiff.value < 0) return '盘亏'
  return '无差异'
})

onMounted(() => {
  loadStatistics()
  loadProducts()
})

onActivated(() => {
  loadStatistics()
})

// 加载统计数据
async function loadStatistics() {
  const cacheKey = 'stock_statistics'
  const cached = memoryCache.get(cacheKey)
  if (cached) {
    statistics.value = cached as StockStatistics
    return
  }

  try {
    const result = await getStockStatistics()
    if (result) {
      const stats: StockStatistics = {
        totalStock: result.totalStock || 0,
        warningCount: result.warningCount || 0,
        outOfStockCount: result.outOfStockCount || 0,
        pendingOrderCount: result.pendingOrderCount || 0,
        productCount: result.productCount || 0,
        todayIn: result.todayIn || 0
      }
      statistics.value = stats
      memoryCache.set(cacheKey, stats, 30000) // 缓存30秒
    }
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

// 统计卡片点击
function handleStatClick(type: string) {
  vibrate(100)
  if (type === 'warning') {
    showWarningOnly.value = true
  } else if (type === 'total') {
    showWarningOnly.value = false
  } else if (type === 'pending') {
    // 跳转到工作台，切换到待接单Tab
    router.push('/workbench?tab=pending_accept')
  }
}

// 显示锁定库存说明
function showLockStockInfo() {
  Dialog.alert({
    title: '锁定库存说明',
    content: '锁定库存是指已被订单占用、但尚未完成提货的库存数量。\n\n可用库存 = 实际库存 - 锁定库存\n\n当订单完成提货后，锁定库存会自动扣减。如订单取消，锁定库存会自动释放。',
    confirmBtn: '我知道了'
  })
}

// 显示出入明细
async function handleShowLogs() {
  showLogsDialog.value = true
  logsLoading.value = true

  try {
    const res = await getStockLogs({ page: 1, pageSize: 50 })
    // 后端返回的是items字段，同时也支持list字段
    const logItems = res?.items || res?.list || []
    // 处理日志数据，将type统一成前端期望的格式
    stockLogs.value = logItems.map((log: any) => ({
      ...log,
      productName: log.product?.name || log.productName || '未知商品',
      // 将后端type映射到前端期望的格式
      type: mapLogType(log.type)
    }))
  } catch (error) {
    console.error('加载出入明细失败:', error)
    stockLogs.value = []
  } finally {
    logsLoading.value = false
  }
}

// 映射日志类型
function mapLogType(type: string): string {
  const typeMap: Record<string, string> = {
    'IN': 'in',
    'OUT': 'out',
    'ADJUST': 'adjust_increase', // 默认显示为增加，实际看quantity正负
    'INVENTORY': 'inventory'
  }
  return typeMap[type] || type.toLowerCase()
}

// 获取日志图标
function getLogIcon(type: string): string {
  const iconMap: Record<string, string> = {
    'in': 'download',
    'out': 'upload',
    'adjust_increase': 'add',
    'adjust_decrease': 'minus',
    'inventory': 'check-circle'
  }
  return iconMap[type] || 'file'
}

// 获取日志标题
function getLogTitle(type: string): string {
  const titleMap: Record<string, string> = {
    'in': '入库',
    'out': '出库',
    'adjust_increase': '库存增加',
    'adjust_decrease': '库存减少',
    'inventory': '库存盘点'
  }
  return titleMap[type] || '其他'
}

// 加载商品列表
async function loadProducts(append = false) {
  if (!append) {
    loading.value = true
    currentPage.value = 1
  } else {
    loadingMore.value = true
  }

  try {
    const res = await getStock({
      search: searchKeyword.value,
      page: currentPage.value,
      pageSize: PAGE_SIZE
    })

    if (res) {
      if (append) {
        products.value.push(...(res.list || []))
      } else {
        products.value = res.list || []
      }
      hasMore.value = res.hasMore || false
    } else {
      if (!append) {
        products.value = []
      }
      hasMore.value = false
    }
  } catch (error) {
    console.error('加载库存失败:', error)
    if (!append) {
      products.value = []
    }
    hasMore.value = false
  } finally {
    loading.value = false
    loadingMore.value = false
    refreshing.value = false
  }
}

// 加载更多
function loadMore() {
  if (hasMore.value && !loadingMore.value) {
    currentPage.value++
    loadProducts(true)
  }
}

// 下拉刷新
function onRefresh() {
  memoryCache.clear()
  loadStatistics()
  loadProducts()
}

// 搜索
const onSearchChange = debounce(() => {
  loadProducts()
}, SEARCH_DEBOUNCE_DELAY)

function onSearchClear() {
  searchKeyword.value = ''
  loadProducts()
}

// 打开快速入库弹窗（从常用功能）
function openStockInDialog() {
  stockInForm.value = {
    productId: '',
    productName: '',
    quantity: 1,
    remark: ''
  }
  loadProductPickerList()
  showStockInDialog.value = true
}

// 入库（从列表项点击）
function handleStockIn(product: StockProduct) {
  stockInForm.value = {
    productId: product.id,
    productName: product.name,
    quantity: 1,
    remark: ''
  }
  showStockInDialog.value = true
}

async function handleStockInConfirm() {
  if (!stockInForm.value.productId) {
    Toast({ message: '请选择商品', theme: 'warning' })
    return
  }
  if (stockInForm.value.quantity <= 0) {
    Toast({ message: '请输入正确的数量', theme: 'warning' })
    return
  }

  try {
    await stockIn({
      productId: stockInForm.value.productId,
      quantity: stockInForm.value.quantity,
      remark: stockInForm.value.remark
    })

    Toast({ message: '入库成功', theme: 'success' })
    showStockInDialog.value = false
    loadProducts()
  } catch (error) {
    // 错误已在拦截器处理
  }
}

// 商品选择器搜索
const onProductPickerSearch = debounce(async () => {
  try {
    const res = await getStock({
      search: productPickerSearch.value,
      page: 1,
      pageSize: 50
    })
    productPickerList.value = res?.list || []
  } catch (error) {
    productPickerList.value = []
  }
}, 300)

// 打开商品选择器时加载列表
async function loadProductPickerList() {
  try {
    const res = await getStock({ page: 1, pageSize: 50 })
    productPickerList.value = res?.list || []
  } catch (error) {
    productPickerList.value = []
  }
}

// 选择商品
function onSelectProduct(product: StockProduct) {
  stockInForm.value.productId = product.id
  stockInForm.value.productName = product.name
  showProductPicker.value = false
}

// 打开库存调整弹窗（从常用功能）
function openAdjustDialog() {
  adjustForm.value = {
    productId: '',
    productName: '',
    currentStock: 0,
    type: 'increase',
    quantity: 1,
    reason: ''
  }
  loadAdjustProductList()
  showAdjustDialog.value = true
}

// 调整（从列表项点击）
function handleAdjust(product: StockProduct) {
  adjustForm.value = {
    productId: product.id,
    productName: product.name,
    currentStock: product.stock,
    type: 'increase',
    quantity: 1,
    reason: ''
  }
  showAdjustDialog.value = true
}

// 加载调整商品选择器列表
async function loadAdjustProductList() {
  try {
    const res = await getStock({ page: 1, pageSize: 50 })
    adjustProductList.value = res?.list || []
  } catch (error) {
    adjustProductList.value = []
  }
}

// 调整商品选择器搜索
const onAdjustProductSearch = debounce(async () => {
  try {
    const res = await getStock({
      search: adjustProductSearch.value,
      page: 1,
      pageSize: 50
    })
    adjustProductList.value = res?.list || []
  } catch (error) {
    adjustProductList.value = []
  }
}, 300)

// 选择调整商品
function onSelectAdjustProduct(product: StockProduct) {
  adjustForm.value.productId = product.id
  adjustForm.value.productName = product.name
  adjustForm.value.currentStock = product.stock
  showAdjustProductPicker.value = false
}

async function handleAdjustConfirm() {
  if (!adjustForm.value.reason) {
    Toast({ message: '请输入调整原因', theme: 'warning' })
    return
  }

  try {
    // 后端期望adjustQuantity：正数增加，负数减少
    const adjustQuantity = adjustForm.value.type === 'increase'
      ? adjustForm.value.quantity
      : -adjustForm.value.quantity

    await adjustStock({
      productId: adjustForm.value.productId,
      adjustQuantity: adjustQuantity,
      reason: adjustForm.value.reason
    })

    Toast({ message: '调整成功', theme: 'success' })
    showAdjustDialog.value = false
    loadProducts()
  } catch (error) {
    // 错误已在拦截器处理
  }
}

// 盘点扫码
function handleInventoryScan() {
  scanPurpose.value = 'inventory'
  showScanner.value = true
}

function handleScanSuccess(result: string) {
  vibrate(200)
  if (scanPurpose.value === 'inventory') {
    inventoryForm.value.code = result
    handleCodeChange()
  }
}

// 查询商品
async function handleCodeChange() {
  if (!inventoryForm.value.code) {
    inventoryForm.value.product = null
    return
  }

  try {
    const product = await getProduct(inventoryForm.value.code)
    inventoryForm.value.product = product
    inventoryForm.value.actualQuantity = product.stock
    vibrate(200)
  } catch (error) {
    inventoryForm.value.product = null
  }
}

// 提交盘点
async function handleInventoryConfirm() {
  if (!inventoryForm.value.product) {
    Toast({ message: '请先扫码或输入商品编码', theme: 'warning' })
    return
  }

  try {
    await inventoryCheck({
      productId: inventoryForm.value.product.id,
      actualStock: inventoryForm.value.actualQuantity,  // 后端期望actualStock字段
      remark: inventoryForm.value.remark
    })

    Toast({ message: '盘点成功', theme: 'success' })
    vibrate(200)
    showInventoryDialog.value = false

    // 重置表单
    resetInventoryForm()
    loadProducts()
  } catch (error) {
    // 错误已在拦截器处理
  }
}

// 重置盘点表单
function resetInventoryForm() {
  inventoryForm.value = {
    code: '',
    product: null,
    actualQuantity: 0,
    remark: ''
  }
}

// 关闭盘点弹窗
function closeInventoryDialog() {
  showInventoryDialog.value = false
  resetInventoryForm()
}

// 图片加载失败处理
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  // 使用内联SVG作为默认占位图
  img.src = 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
      <rect width="60" height="60" fill="#f5f5f5"/>
      <text x="50%" y="50%" font-family="Arial" font-size="10" fill="#999" text-anchor="middle" dy=".3em">暂无图片</text>
    </svg>
  `)
  // 防止循环触发
  img.onerror = null
}
</script>

<style scoped>
.stock-page {
  min-height: 100vh;
  background-color: var(--bg-page);
  padding-bottom: 60px;
}

.search-section {
  padding: 12px;
  background-color: var(--bg-white);
}

/* 统计卡片区 */
.stats-section {
  padding: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-card {
  background-color: var(--bg-white);
  border-radius: 12px;
  padding: 12px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.stat-card:active {
  transform: scale(0.98);
}

.stat-card-large {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
}

.stat-card-bg {
  position: absolute;
  right: -20px;
  top: -20px;
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.stat-card-content {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.stat-left {
  display: flex;
  flex-direction: column;
}

.stat-label-light {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 4px;
}

.stat-value-large {
  font-size: 32px;
  font-weight: bold;
}

.stat-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-wrap.primary {
  background: rgba(255, 255, 255, 0.2);
}

.stat-extra {
  position: relative;
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
}

.stat-badge.success {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.stat-time {
  font-size: 11px;
  opacity: 0.8;
}

.stat-card-warning {
  border: 1px solid #FFCCC7;
  background-color: #FFF1F0;
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.stat-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.warning {
  background: rgba(229, 58, 52, 0.1);
}

.stat-icon.pending {
  background: rgba(249, 115, 22, 0.1);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 常用功能 */
.actions-section {
  padding: 0 12px 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.actions-grid {
  display: flex;
  justify-content: space-around;
  background-color: var(--bg-white);
  border-radius: 12px;
  padding: 16px 8px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.action-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon.primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
}

.action-icon.success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.action-icon.default {
  background: rgba(229, 58, 52, 0.1);
}

.action-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 库存概览 */
.stock-section {
  padding: 0 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-action {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--primary);
  cursor: pointer;
}

.stock-list {
  padding: 0 12px;
}

.loading-container,
.empty-container {
  padding: 60px 20px;
  text-align: center;
}

.stock-item {
  background-color: var(--bg-white);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  display: flex;
  gap: 12px;
}

.item-image {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-info {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.info-tag {
  font-size: 12px;
  color: var(--text-tertiary);
  background-color: var(--bg-page);
  padding: 2px 6px;
  border-radius: 4px;
}

.item-stock {
  font-size: 13px;
}

.stock-label {
  color: var(--text-secondary);
  margin-right: 4px;
}

.stock-value {
  font-weight: bold;
  color: var(--text-primary);
}

.stock-value.warning {
  color: #F5222D;
}

.lock-stock {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-left: 4px;
}

.item-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.load-more,
.no-more {
  text-align: center;
  padding: 16px;
}

.no-more {
  color: var(--text-tertiary);
  font-size: 13px;
}

.dialog-form {
  padding: 16px 0;
}

.form-item {
  margin-bottom: 16px;
}

.form-item .label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 14px;
}

.scan-input-group {
  display: flex;
  gap: 8px;
}

.scan-input-group :deep(.t-input) {
  flex: 1;
}

.product-info {
  background-color: var(--bg-page);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
}

.info-row .label {
  color: var(--text-secondary);
}

.info-row .value {
  color: var(--text-primary);
  font-weight: 500;
}

/* Popup通用样式 */
.popup-container {
  background-color: var(--bg-white);
  border-radius: 16px 16px 0 0;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.popup-container-large {
  max-height: 85vh;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.popup-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.popup-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-tertiary);
}

.popup-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.popup-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

/* 商品选择器样式 */
.product-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: var(--bg-page);
  border-radius: 8px;
  cursor: pointer;
}

.picker-value {
  font-size: 14px;
  color: var(--text-primary);
}

.picker-value.placeholder {
  color: var(--text-tertiary);
}

.picker-container {
  background-color: var(--bg-white);
  border-radius: 16px 16px 0 0;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.picker-cancel {
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
}

.picker-title {
  font-size: 16px;
  font-weight: 500;
}

.picker-confirm {
  font-size: 14px;
  color: var(--primary);
  cursor: pointer;
}

.picker-search {
  padding: 12px;
}

.picker-list {
  flex: 1;
  overflow-y: auto;
  max-height: 50vh;
}

.picker-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
}

.picker-item.active {
  background-color: rgba(239, 6, 45, 0.05);
}

.picker-item-name {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

.picker-item-info {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-right: 8px;
}

.picker-empty {
  padding: 40px;
  text-align: center;
  color: var(--text-tertiary);
}

/* 盘点弹窗样式 */
.inventory-empty {
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
  color: var(--text-tertiary);
}

.inventory-product-info {
  margin-bottom: 16px;
}

.product-card {
  background-color: var(--bg-page);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.stock-value {
  color: var(--primary);
  font-weight: bold;
}

/* 盘盈盘亏卡片 */
.diff-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.diff-card.profit {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.diff-card.loss {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.diff-card.balanced {
  background-color: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.diff-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.diff-card.profit .diff-icon {
  background-color: rgba(16, 185, 129, 0.2);
}

.diff-card.loss .diff-icon {
  background-color: rgba(239, 68, 68, 0.2);
}

.diff-card.balanced .diff-icon {
  background-color: rgba(107, 114, 128, 0.2);
}

.diff-content {
  flex: 1;
}

.diff-label {
  font-size: 12px;
  opacity: 0.8;
}

.diff-value {
  font-size: 24px;
  font-weight: bold;
}

.rescan-btn {
  text-align: center;
}

/* 出入明细样式 */
.logs-body {
  min-height: 300px;
}

.logs-loading,
.logs-empty {
  padding: 60px 20px;
  text-align: center;
}

.logs-list {
  /* 列表样式 */
}

.log-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.log-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.log-icon.in,
.log-icon.adjust_increase {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.log-icon.out,
.log-icon.adjust_decrease {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.log-icon.inventory {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.log-content {
  flex: 1;
  min-width: 0;
}

.log-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.log-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-time {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.log-quantity {
  font-size: 16px;
  font-weight: bold;
  flex-shrink: 0;
}

.log-quantity.increase {
  color: #10b981;
}

.log-quantity.decrease {
  color: #ef4444;
}

.text-success {
  color: #10b981;
}

.text-error {
  color: #ef4444;
}

/* 已选商品样式 */
.selected-product {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: var(--bg-page);
  border-radius: 8px;
}

.selected-product .value {
  font-size: 14px;
  color: var(--text-primary);
}

.selected-product .change-btn {
  font-size: 12px;
  color: var(--primary);
  cursor: pointer;
}
</style>
