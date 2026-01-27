<template>
  <div class="reservations-page">
    <!-- 页面标题 -->
    <PageHeader title="预约管理" subtitle="管理客户预约，查看确认状态，管理赠品档位">
      <template #actions>
        <t-button variant="outline" @click="showGiftTierDialog = true">
          <template #icon><t-icon name="gift" /></template>
          赠品配置
        </t-button>
        <t-button variant="outline" @click="handleExport" :disabled="reservationList.length === 0">
          <template #icon><t-icon name="download" /></template>
          导出报表
        </t-button>
      </template>
    </PageHeader>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card pending">
        <div class="stat-icon">
          <t-icon name="time" size="28px" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待确认</div>
        </div>
      </div>
      <div class="stat-card confirmed">
        <div class="stat-icon">
          <t-icon name="check-circle" size="28px" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.confirmed }}</div>
          <div class="stat-label">已确认</div>
        </div>
      </div>
      <div class="stat-card completed">
        <div class="stat-icon">
          <t-icon name="check-double" size="28px" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.completed }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </div>
      <div class="stat-card amount">
        <div class="stat-icon">
          <t-icon name="money-circle" size="28px" />
        </div>
        <div class="stat-info">
          <div class="stat-value">¥{{ formatAmount(stats.totalAmount) }}</div>
          <div class="stat-label">今日金额</div>
        </div>
      </div>
    </div>

    <!-- 备货统计卡片【2026-01-17新增】 -->
    <div class="stats-row prepare-stats">
      <div class="stat-card prepare-pending">
        <div class="stat-icon">
          <t-icon name="package" size="28px" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.pendingPrepare }}</div>
          <div class="stat-label">待备货</div>
        </div>
      </div>
      <div class="stat-card preparing">
        <div class="stat-icon">
          <t-icon name="loading" size="28px" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.preparing }}</div>
          <div class="stat-label">备货中</div>
        </div>
      </div>
      <div class="stat-card pickup">
        <div class="stat-icon">
          <t-icon name="shop" size="28px" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.pendingPickup }}</div>
          <div class="stat-label">待提货</div>
        </div>
      </div>
    </div>

    <!-- 筛选区域 -->
    <FilterCard>
      <t-form layout="inline" :data="filterForm" @submit="handleSearch">
        <t-form-item label="预约编号">
          <t-input
            v-model="filterForm.reservationNo"
            placeholder="请输入预约编号"
            clearable
            style="width: 180px"
          />
        </t-form-item>
        <t-form-item label="客户信息">
          <t-input
            v-model="filterForm.keyword"
            placeholder="姓名/手机号"
            clearable
            style="width: 160px"
          />
        </t-form-item>
        <t-form-item label="预约日期">
          <t-date-range-picker
            v-model="filterForm.dateRange"
            :placeholder="['开始日期', '结束日期']"
            style="width: 260px"
          />
        </t-form-item>
        <t-form-item label="预约状态">
          <t-select
            v-model="filterForm.status"
            placeholder="全部状态"
            clearable
            style="width: 140px"
          >
            <t-option
              v-for="(item, key) in RESERVATION_STATUSES"
              :key="key"
              :value="parseInt(key)"
              :label="item.label"
            />
          </t-select>
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
    <TableCard title="预约列表">
      <template #header-extra>
        <t-space v-if="selectedRowKeys.length > 0">
          <span class="selected-count">已选 {{ selectedRowKeys.length }} 条</span>
          <t-button
            theme="success"
            size="small"
            :disabled="!canBatchConfirm"
            @click="handleBatchConfirm"
          >
            批量确认
          </t-button>
          <t-button
            theme="danger"
            size="small"
            :disabled="!canBatchCancel"
            @click="handleBatchCancel"
          >
            批量取消
          </t-button>
          <t-button size="small" @click="selectedRowKeys = []">取消选择</t-button>
        </t-space>
      </template>
      <template v-if="!loading && reservationList.length === 0">
        <EmptyState
          v-if="hasFilters"
          type="search"
          title="未找到匹配的预约"
          description="请尝试调整筛选条件"
        >
          <template #action>
            <t-button theme="primary" @click="handleReset">清除筛选</t-button>
          </template>
        </EmptyState>
        <EmptyState
          v-else
          type="data"
          title="暂无预约"
          description="还没有客户预约"
        />
      </template>

      <t-table
        v-else
        :data="reservationList"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        :selected-row-keys="selectedRowKeys"
        row-key="id"
        hover
        stripe
        @page-change="handlePageChange"
        @select-change="handleSelectChange"
      >
        <!-- 预约编号 -->
        <template #reservationNo="{ row }">
          <span class="reservation-no">{{ row.reservationNo }}</span>
        </template>

        <!-- 客户信息 -->
        <template #customer="{ row }">
          <div class="customer-cell">
            <span class="customer-name">{{ row.customerName }}</span>
            <span class="customer-phone">{{ row.customerPhone }}</span>
          </div>
        </template>

        <!-- 商品信息 -->
        <template #productInfo="{ row }">
          <ProductCell
            v-if="row.items && row.items.length > 0"
            :image="getProductImage(row.items[0])"
            :name="row.items[0].productName"
            :description="getProductDescription(row.items)"
          />
          <span v-else class="empty-text">暂无商品</span>
        </template>

        <!-- 预约金额 -->
        <template #totalAmount="{ row }">
          <AmountText :value="row.totalAmount" />
        </template>

        <!-- 赠品 -->
        <template #gift="{ row }">
          <t-tag v-if="row.giftName" theme="warning" variant="light">
            <t-icon name="gift" size="14px" />
            {{ row.giftName }}
          </t-tag>
          <span v-else class="empty-text">-</span>
        </template>

        <!-- 预约到店日期 -->
        <template #pickupDate="{ row }">
          <span class="date-text">{{ formatDate(row.pickupDate) }}</span>
        </template>

        <!-- 预约时间 -->
        <template #createdAt="{ row }">
          <span class="time-text">{{ formatTime(row.createdAt) }}</span>
        </template>

        <!-- 预约状态 -->
        <template #status="{ row }">
          <StatusTag
            :type="RESERVATION_STATUSES[row.status]?.color || 'default'"
            :text="RESERVATION_STATUSES[row.status]?.label || '未知'"
          />
        </template>

        <!-- 操作 -->
        <template #operation="{ row }">
          <t-space size="small">
            <t-link theme="primary" @click="handleViewDetail(row)">详情</t-link>
            <t-link
              v-if="row.status === 0 || row.status === 1"
              theme="success"
              @click="handleConfirm(row)"
            >
              确认
            </t-link>
            <t-link
              v-if="[0, 1, 2].includes(row.status)"
              theme="danger"
              @click="handleCancel(row)"
            >
              取消
            </t-link>
          </t-space>
        </template>
      </t-table>
    </TableCard>

    <!-- 预约详情弹窗 -->
    <t-dialog
      v-model:visible="detailVisible"
      header="预约详情"
      width="720px"
      :footer="false"
      :top="60"
    >
      <div v-if="currentReservation" class="reservation-detail" style="max-height: 70vh; overflow-y: auto;">
        <!-- 状态卡片 -->
        <div class="status-card" :style="{ background: RESERVATION_STATUSES[currentReservation.status]?.bgColor }">
          <div class="status-info">
            <div class="status-label" :style="{ color: RESERVATION_STATUSES[currentReservation.status]?.textColor }">
              {{ RESERVATION_STATUSES[currentReservation.status]?.label }}
            </div>
            <div class="status-desc">{{ RESERVATION_STATUSES[currentReservation.status]?.desc }}</div>
          </div>
          <div class="status-time">
            预约编号：{{ currentReservation.reservationNo }}
          </div>
        </div>

        <!-- 客户信息 -->
        <div class="detail-section">
          <div class="section-title">客户信息</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">客户姓名</span>
              <span class="info-value">{{ currentReservation.customerName }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">联系电话</span>
              <span class="info-value highlight">{{ currentReservation.customerPhone }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">预约到店</span>
              <span class="info-value">{{ formatDate(currentReservation.pickupDate) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">预约时间</span>
              <span class="info-value">{{ formatTime(currentReservation.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- 商品清单 -->
        <div class="detail-section">
          <div class="section-title">商品清单</div>
          <div class="product-list">
            <div v-for="item in currentReservation.items" :key="item.id" class="product-item">
              <img
                :src="getProductImage(item)"
                class="product-image"
                @error="(e: Event) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60?text=图片'"
              />
              <div class="product-info">
                <div class="product-name">{{ item.productName }}</div>
                <div class="product-meta">
                  <span class="product-price">¥{{ item.price }}</span>
                  <span class="product-quantity">×{{ item.quantity }}</span>
                </div>
              </div>
              <div class="product-subtotal">¥{{ (item.price * item.quantity).toFixed(2) }}</div>
            </div>
          </div>
          <div class="total-row">
            <span>参考总金额</span>
            <span class="total-amount">¥{{ currentReservation.totalAmount }}</span>
          </div>
        </div>

        <!-- 赠品信息 -->
        <div v-if="currentReservation.giftName" class="detail-section gift-section">
          <div class="section-title">
            <t-icon name="gift" />
            预约赠品
          </div>
          <div class="gift-info">
            <span class="gift-name">{{ currentReservation.giftName }}</span>
            <t-tag v-if="currentReservation.giftDelivered" theme="success" variant="light">已发放</t-tag>
            <t-tag v-else theme="warning" variant="light">待发放</t-tag>
          </div>
        </div>

        <!-- 确认信息 -->
        <div v-if="currentReservation.confirmedAt" class="detail-section">
          <div class="section-title">确认信息</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">确认时间</span>
              <span class="info-value">{{ formatTime(currentReservation.confirmedAt) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">拨打次数</span>
              <span class="info-value">{{ currentReservation.callCount }}次</span>
            </div>
          </div>
        </div>

        <!-- 备货信息【2026-01-17新增】 -->
        <div v-if="[7, 8, 9].includes(currentReservation.status)" class="detail-section prepare-section">
          <div class="section-title">
            <t-icon name="package" />
            备货信息
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">备货状态</span>
              <span class="info-value">
                <t-tag v-if="currentReservation.status === 7" theme="warning">待备货</t-tag>
                <t-tag v-else-if="currentReservation.status === 8" theme="primary">备货中</t-tag>
                <t-tag v-else-if="currentReservation.status === 9" theme="success">已备好</t-tag>
              </span>
            </div>
            <div v-if="currentReservation.pickupCode" class="info-item">
              <span class="info-label">提货码</span>
              <span class="info-value highlight pickup-code">{{ currentReservation.pickupCode }}</span>
            </div>
            <div v-if="currentReservation.preparedAt" class="info-item">
              <span class="info-label">备货完成</span>
              <span class="info-value">{{ formatTime(currentReservation.preparedAt) }}</span>
            </div>
          </div>
          <!-- 备货进度 -->
          <div v-if="currentReservation.items && currentReservation.status >= 8" class="prepare-progress">
            <div class="progress-title">商品备货进度</div>
            <div class="progress-list">
              <div v-for="item in currentReservation.items" :key="item.id" class="progress-item">
                <t-icon :name="item.prepared ? 'check-circle-filled' : 'circle'" :class="{ checked: item.prepared }" />
                <span class="item-name">{{ item.productName }}</span>
                <span class="item-qty">×{{ item.quantity }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 核销信息 -->
        <div v-if="currentReservation.completedAt" class="detail-section">
          <div class="section-title">核销信息</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">核销时间</span>
              <span class="info-value">{{ formatTime(currentReservation.completedAt) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">支付方式</span>
              <span class="info-value">{{ getPaymentMethodLabel(currentReservation.paymentMethod) }}</span>
            </div>
          </div>
        </div>

        <!-- 操作记录【2026-01-17新增】 -->
        <div class="detail-section audit-section">
          <div class="section-title">
            <t-icon name="history" />
            操作记录
          </div>
          <div v-if="auditLogs.length > 0" class="audit-list">
            <div v-for="log in auditLogs" :key="log.id" class="audit-item">
              <div class="audit-time">{{ formatTime(log.createdAt) }}</div>
              <div class="audit-content">
                <span class="audit-user">{{ log.userName || '系统' }}</span>
                <span class="audit-action">{{ log.detail }}</span>
              </div>
            </div>
          </div>
          <div v-else class="audit-empty">
            <t-icon name="info-circle" />
            暂无操作记录
          </div>
        </div>
      </div>
    </t-dialog>

    <!-- 赠品配置弹窗 -->
    <t-dialog
      v-model:visible="showGiftTierDialog"
      header="赠品档位配置"
      width="800px"
      :footer="false"
    >
      <div class="gift-tier-config">
        <div class="tier-header">
          <t-button theme="primary" size="small" @click="handleAddTier">
            <template #icon><t-icon name="add" /></template>
            添加档位
          </t-button>
        </div>
        <t-table
          :data="giftTiers"
          :columns="giftTierColumns"
          row-key="id"
          hover
        >
          <template #minAmount="{ row }">
            <span class="amount-text">¥{{ row.minAmount }}</span>
          </template>
          <template #isActive="{ row }">
            <t-switch v-model="row.isActive" @change="handleTierStatusChange(row)" />
          </template>
          <template #operation="{ row }">
            <t-space size="small">
              <t-link theme="primary" @click="handleEditTier(row)">编辑</t-link>
              <t-popconfirm content="确定删除此档位？" @confirm="handleDeleteTier(row)">
                <t-link theme="danger">删除</t-link>
              </t-popconfirm>
            </t-space>
          </template>
        </t-table>
      </div>
    </t-dialog>

    <!-- 编辑赠品档位弹窗 -->
    <t-dialog
      v-model:visible="showTierEditDialog"
      :header="editingTier.id ? '编辑赠品档位' : '添加赠品档位'"
      width="500px"
      @confirm="handleSaveTier"
    >
      <t-form :data="editingTier" label-width="100px">
        <t-form-item label="最低金额" required>
          <t-input-number v-model="editingTier.minAmount" :min="0" suffix="元" style="width: 100%" />
        </t-form-item>
        <t-form-item label="赠品名称" required>
          <t-input v-model="editingTier.giftName" placeholder="如：仙女棒×10 + 摔炮×1盒" />
        </t-form-item>
        <t-form-item label="赠品成本">
          <t-input-number v-model="editingTier.giftCost" :min="0" suffix="元" style="width: 100%" />
        </t-form-item>
        <t-form-item label="排序">
          <t-input-number v-model="editingTier.sortOrder" :min="0" style="width: 100%" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 【2026-01-19改造】电话确认预约弹窗 -->
    <t-dialog
      v-model:visible="showConfirmDialog"
      header="电话确认预约"
      width="520px"
      :footer="false"
    >
      <div v-if="confirmingReservation" class="call-confirm-dialog">
        <!-- 客户信息卡片 -->
        <div class="customer-card">
          <div class="customer-avatar">
            <t-icon name="user" size="24px" />
          </div>
          <div class="customer-info">
            <div class="customer-name">{{ confirmingReservation.customerName }}</div>
            <div class="customer-phone">{{ confirmingReservation.customerPhone }}</div>
          </div>
          <t-tag :theme="getCallStatusTheme()" size="small">
            已拨打{{ confirmingReservation.callCount || 0 }}次
          </t-tag>
        </div>

        <!-- 确认话术 -->
        <div class="section">
          <div class="section-title">
            <t-icon name="chat" size="16px" />
            确认话术
          </div>
          <div class="script-card">
            <div class="script-text">
              您好，这里是蒙庆烟花，请问是<span class="highlight">{{ confirmingReservation.customerName }}</span>吗？
              您在我们这预约了<span class="highlight">{{ formatPickupDate(confirmingReservation.pickupDate) }}</span>的烟花提货，
              预约金额<span class="highlight">¥{{ confirmingReservation.totalAmount }}</span>，
              请问方便确认吗？
            </div>
            <div v-if="confirmingReservation.giftName" class="gift-remind">
              <t-icon name="gift" size="14px" />
              提醒客户：到店可领取赠品「{{ confirmingReservation.giftName }}」
            </div>
          </div>
        </div>

        <!-- 预约信息 -->
        <div class="section">
          <div class="section-title">
            <t-icon name="info-circle" size="16px" />
            预约信息
          </div>
          <div class="info-card">
            <div class="info-row">
              <span class="label">预约号</span>
              <span class="value">{{ confirmingReservation.reservationNo }}</span>
            </div>
            <div class="info-row">
              <span class="label">提货日期</span>
              <span class="value">{{ formatPickupDate(confirmingReservation.pickupDate) }}</span>
            </div>
            <div class="info-row">
              <span class="label">预约金额</span>
              <span class="value amount">¥{{ confirmingReservation.totalAmount }}</span>
            </div>
            <div class="info-row">
              <span class="label">商品数量</span>
              <span class="value">{{ confirmingReservation.items?.length || 0 }}件</span>
            </div>
          </div>
        </div>

        <!-- 通话记录 -->
        <div v-if="confirmingReservation.lastCallAt || confirmingReservation.callCount > 0" class="section">
          <div class="section-title">
            <t-icon name="time" size="16px" />
            通话记录
          </div>
          <div class="info-card">
            <div v-if="confirmingReservation.lastCallAt" class="info-row">
              <span class="label">最后拨打</span>
              <span class="value">{{ formatTime(confirmingReservation.lastCallAt) }}</span>
            </div>
            <div class="info-row">
              <span class="label">累计拨打</span>
              <span class="value">{{ confirmingReservation.callCount || 0 }}次</span>
            </div>
          </div>
        </div>

        <!-- 操作区域 -->
        <div class="action-section">
          <!-- 记录拨打按钮 -->
          <t-button
            theme="primary"
            size="large"
            block
            :loading="calling"
            :disabled="confirmingReservation.callCount >= 3"
            @click="handleRecordCall"
          >
            <t-icon name="call" /> 记录拨打
          </t-button>
          <div class="call-tip">
            拨打电话后点击此按钮记录，最多拨打3次
          </div>

          <!-- 确认结果按钮 -->
          <div class="result-actions">
            <t-button
              theme="success"
              size="large"
              :disabled="confirmingReservation.callCount === 0"
              :loading="confirming"
              @click="handleDoConfirm"
            >
              <t-icon name="check" /> 确认成功
            </t-button>
            <t-button
              theme="danger"
              size="large"
              :disabled="confirmingReservation.callCount < 3"
              :loading="marking"
              @click="handleMarkFailed"
            >
              <t-icon name="close" /> 确认失败
            </t-button>
          </div>
          <div class="result-tip">
            <span v-if="confirmingReservation.callCount === 0">需至少拨打1次后才能确认成功</span>
            <span v-else-if="confirmingReservation.callCount < 3">需拨打满3次后才能标记确认失败</span>
          </div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import FilterCard from '@/components/FilterCard.vue'
import TableCard from '@/components/TableCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusTag from '@/components/StatusTag.vue'
import AmountText from '@/components/AmountText.vue'
import ProductCell from '@/components/ProductCell.vue'
import { useFormatter } from '@/composables/useFormatter'
import { useUserStore } from '@/stores/user'
import request from '@/api/request'

const userStore = useUserStore()

const { formatTime, formatAmount } = useFormatter()

// 预约状态配置
const RESERVATION_STATUSES: Record<number, { label: string; color: string; bgColor: string; textColor: string; desc: string }> = {
  0: { label: '待确认', color: 'warning', bgColor: 'rgba(255, 152, 0, 0.1)', textColor: '#FF9800', desc: '等待门店电话确认' },
  1: { label: '确认中', color: 'primary', bgColor: 'rgba(33, 150, 243, 0.1)', textColor: '#2196F3', desc: '门店正在联系客户' },
  2: { label: '已确认', color: 'success', bgColor: 'rgba(76, 175, 80, 0.1)', textColor: '#4CAF50', desc: '等待客户到店' },
  3: { label: '已完成', color: 'default', bgColor: 'rgba(158, 158, 158, 0.1)', textColor: '#9E9E9E', desc: '预约已完成' },
  4: { label: '已取消', color: 'default', bgColor: 'rgba(158, 158, 158, 0.1)', textColor: '#9E9E9E', desc: '客户已取消' },
  5: { label: '已过期', color: 'danger', bgColor: 'rgba(244, 67, 54, 0.1)', textColor: '#F44336', desc: '预约已过期' },
  6: { label: '确认失败', color: 'danger', bgColor: 'rgba(244, 67, 54, 0.1)', textColor: '#F44336', desc: '多次联系未接通' },
  7: { label: '待备货', color: 'warning', bgColor: 'rgba(121, 85, 72, 0.1)', textColor: '#795548', desc: '等待门店备货' },
  8: { label: '备货中', color: 'primary', bgColor: 'rgba(255, 87, 34, 0.1)', textColor: '#FF5722', desc: '门店正在备货' },
  9: { label: '待提货', color: 'success', bgColor: 'rgba(3, 169, 244, 0.1)', textColor: '#03A9F4', desc: '商品已备好，等待提货' },
}

// 支付方式（仅支持现金/微信/支付宝）
const PAYMENT_METHODS: Record<string, string> = {
  cash: '现金',
  wechat: '微信',
  alipay: '支付宝',
}

// 统计数据
const stats = ref({
  pending: 0,
  confirmed: 0,
  completed: 0,
  totalAmount: 0,
  // 备货相关统计【2026-01-17新增】
  pendingPrepare: 0,
  preparing: 0,
  pendingPickup: 0,
})

// 筛选表单
const filterForm = reactive({
  reservationNo: '',
  keyword: '',
  dateRange: [] as string[],
  status: undefined as number | undefined,
})

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

// 数据
const loading = ref(false)
const reservationList = ref<any[]>([])
const currentReservation = ref<any>(null)
const detailVisible = ref(false)

// 赠品配置
const showGiftTierDialog = ref(false)
const giftTiers = ref<any[]>([])
const showTierEditDialog = ref(false)
const editingTier = ref<any>({})

// 审计日志
const auditLogs = ref<any[]>([])

// 【2026-01-19改造】电话确认预约
const showConfirmDialog = ref(false)
const confirmingReservation = ref<any>(null)
const calling = ref(false)      // 记录拨打中
const confirming = ref(false)   // 确认中
const marking = ref(false)      // 标记失败中

// 批量操作
const selectedRowKeys = ref<number[]>([])

// 是否可以批量确认（仅选中的待确认/确认中状态）
const canBatchConfirm = computed(() => {
  if (selectedRowKeys.value.length === 0) return false
  const selected = reservationList.value.filter(row => selectedRowKeys.value.includes(row.id))
  return selected.every(row => row.status === 0 || row.status === 1)
})

// 是否可以批量取消（仅选中的待确认/确认中/已确认状态）
const canBatchCancel = computed(() => {
  if (selectedRowKeys.value.length === 0) return false
  const selected = reservationList.value.filter(row => selectedRowKeys.value.includes(row.id))
  return selected.every(row => [0, 1, 2].includes(row.status))
})

// 表格列配置
const columns = [
  { colKey: 'row-select', type: 'multiple', width: 50 },
  { colKey: 'reservationNo', title: '预约编号', width: 160 },
  { colKey: 'customer', title: '客户信息', width: 140 },
  { colKey: 'productInfo', title: '商品信息', width: 200 },
  { colKey: 'totalAmount', title: '参考金额', width: 100, align: 'right' },
  { colKey: 'gift', title: '赠品', width: 140 },
  { colKey: 'pickupDate', title: '预约到店', width: 100 },
  { colKey: 'createdAt', title: '预约时间', width: 140 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'operation', title: '操作', width: 140, fixed: 'right' },
]

// 赠品档位表格列
const giftTierColumns = [
  { colKey: 'minAmount', title: '最低金额', width: 120 },
  { colKey: 'giftName', title: '赠品内容', minWidth: 200 },
  { colKey: 'giftCost', title: '成本', width: 100 },
  { colKey: 'sortOrder', title: '排序', width: 80 },
  { colKey: 'isActive', title: '启用', width: 80 },
  { colKey: 'operation', title: '操作', width: 120 },
]

// 是否有筛选条件
const hasFilters = computed(() => {
  return filterForm.reservationNo || filterForm.keyword || filterForm.dateRange?.length || filterForm.status !== undefined
})

// 格式化日期
const formatDate = (date: string) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

// 获取商品图片
const getProductImage = (item: any) => {
  if (!item) return ''
  const image = item.productImage || item.product?.images?.[0]
  if (!image) return ''
  if (image.startsWith('http')) return image
  // 【2026-01-20修复】管理后台运行在9090端口，图片在API服务80端口
  // 使用当前域名的80端口（不带端口号）拼接图片路径
  const baseUrl = window.location.origin.replace(':9090', '')
  return `${baseUrl}${image}`
}

// 获取商品描述（显示总数量和商品件数）
const getProductDescription = (items: any[]) => {
  if (!items || items.length === 0) return ''
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0)
  if (items.length === 1) {
    return `×${totalQuantity}`
  }
  return `共${totalQuantity}件，${items.length}种商品`
}

// 获取支付方式标签
const getPaymentMethodLabel = (method: string) => {
  return PAYMENT_METHODS[method] || method || '-'
}

// 加载统计数据
const loadStats = async () => {
  try {
    const res = await request.get('/admin/reservations/stats')
    stats.value = res.data || {}
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

// 加载预约列表
const loadReservations = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.current,
      pageSize: pagination.pageSize,
    }
    if (filterForm.reservationNo) params.reservationNo = filterForm.reservationNo
    if (filterForm.keyword) params.keyword = filterForm.keyword
    if (filterForm.status !== undefined) params.status = filterForm.status
    if (filterForm.dateRange?.length === 2) {
      params.startDate = filterForm.dateRange[0]
      params.endDate = filterForm.dateRange[1]
    }

    const res = await request.get('/admin/reservations', { params })
    reservationList.value = res.data?.list || []
    pagination.total = res.data?.total || 0
  } catch (error) {
    console.error('加载预约列表失败:', error)
    MessagePlugin.error('加载预约列表失败')
  } finally {
    loading.value = false
  }
}

// 加载赠品档位
const loadGiftTiers = async () => {
  try {
    const res = await request.get('/admin/gift-tiers')
    giftTiers.value = res.data || []
  } catch (error) {
    console.error('加载赠品档位失败:', error)
  }
}

// 搜索
const handleSearch = () => {
  pagination.current = 1
  loadReservations()
}

// 重置
const handleReset = () => {
  filterForm.reservationNo = ''
  filterForm.keyword = ''
  filterForm.dateRange = []
  filterForm.status = undefined
  pagination.current = 1
  loadReservations()
}

// 分页
const handlePageChange = (pageInfo: any) => {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  loadReservations()
}

// 查看详情
const handleViewDetail = async (row: any) => {
  try {
    const res = await request.get(`/admin/reservations/${row.id}`)
    currentReservation.value = res.data
    detailVisible.value = true
    // 加载审计日志
    loadAuditLogs(row.id)
  } catch (error) {
    MessagePlugin.error('获取详情失败')
  }
}

// 加载审计日志
const loadAuditLogs = async (reservationId: number) => {
  try {
    const res = await request.get(`/admin/reservations/${reservationId}/audit`)
    auditLogs.value = res.data || []
  } catch (error) {
    console.error('加载审计日志失败:', error)
    auditLogs.value = []
  }
}

// 【2026-01-19改造】电话确认预约流程
const handleConfirm = (row: any) => {
  confirmingReservation.value = { ...row }
  showConfirmDialog.value = true
}

// 获取拨打状态主题色
const getCallStatusTheme = (): string => {
  if (!confirmingReservation.value) return 'default'
  const callCount = confirmingReservation.value.callCount || 0
  if (callCount === 0) return 'default'
  if (callCount < 3) return 'primary'
  return 'warning'
}

// 格式化提货日期
const formatPickupDate = (date: string) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

// 记录拨打电话
const handleRecordCall = async () => {
  if (!confirmingReservation.value) return

  calling.value = true
  try {
    const res = await request.post(`/admin/reservations/${confirmingReservation.value.id}/call`, { connected: false })
    const data = res.data || {}

    // 更新本地状态
    confirmingReservation.value.callCount = data.callCount || (confirmingReservation.value.callCount + 1)
    confirmingReservation.value.lastCallAt = new Date().toISOString()

    // 如果后端自动标记为失败
    if (data.autoFailed) {
      MessagePlugin.warning(`已拨打第${data.callCount}次，3次未接通，系统自动标记为确认失败`)
      showConfirmDialog.value = false
      loadReservations()
      loadStats()
    } else {
      MessagePlugin.success(`已记录第${data.callCount}次拨打`)
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '记录拨打失败')
  } finally {
    calling.value = false
  }
}

// 确认成功
const handleDoConfirm = async () => {
  if (!confirmingReservation.value) return

  confirming.value = true
  try {
    await request.post(`/admin/reservations/${confirmingReservation.value.id}/confirm`)
    MessagePlugin.success('预约确认成功')
    showConfirmDialog.value = false
    loadReservations()
    loadStats()
  } catch (error: any) {
    MessagePlugin.error(error.message || '确认失败')
  } finally {
    confirming.value = false
  }
}

// 标记确认失败
const handleMarkFailed = async () => {
  if (!confirmingReservation.value) return
  if (confirmingReservation.value.callCount < 3) {
    MessagePlugin.warning('需拨打满3次后才能标记确认失败')
    return
  }

  marking.value = true
  try {
    await request.post(`/admin/reservations/${confirmingReservation.value.id}/fail`)
    MessagePlugin.success('已标记为确认失败')
    showConfirmDialog.value = false
    loadReservations()
    loadStats()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  } finally {
    marking.value = false
  }
}

// 取消预约
const handleCancel = async (row: any) => {
  try {
    await request.post(`/admin/reservations/${row.id}/cancel`)
    MessagePlugin.success('已取消')
    loadReservations()
    loadStats()
  } catch (error: any) {
    MessagePlugin.error(error.message || '取消失败')
  }
}

// 表格选择变化
const handleSelectChange = (selectedKeys: number[]) => {
  selectedRowKeys.value = selectedKeys
}

// 批量确认
const handleBatchConfirm = async () => {
  if (selectedRowKeys.value.length === 0) return

  const confirmCount = selectedRowKeys.value.length
  let successCount = 0
  let failCount = 0

  MessagePlugin.loading(`正在批量确认 ${confirmCount} 条预约...`, 0)

  for (const id of selectedRowKeys.value) {
    try {
      await request.post(`/admin/reservations/${id}/confirm`)
      successCount++
    } catch (error) {
      failCount++
    }
  }

  MessagePlugin.closeAll()

  if (failCount === 0) {
    MessagePlugin.success(`成功确认 ${successCount} 条预约`)
  } else {
    MessagePlugin.warning(`成功 ${successCount} 条，失败 ${failCount} 条`)
  }

  selectedRowKeys.value = []
  loadReservations()
  loadStats()
}

// 批量取消
const handleBatchCancel = async () => {
  if (selectedRowKeys.value.length === 0) return

  const cancelCount = selectedRowKeys.value.length
  let successCount = 0
  let failCount = 0

  MessagePlugin.loading(`正在批量取消 ${cancelCount} 条预约...`, 0)

  for (const id of selectedRowKeys.value) {
    try {
      await request.post(`/admin/reservations/${id}/cancel`)
      successCount++
    } catch (error) {
      failCount++
    }
  }

  MessagePlugin.closeAll()

  if (failCount === 0) {
    MessagePlugin.success(`成功取消 ${successCount} 条预约`)
  } else {
    MessagePlugin.warning(`成功 ${successCount} 条，失败 ${failCount} 条`)
  }

  selectedRowKeys.value = []
  loadReservations()
  loadStats()
}

// 导出
const handleExport = async () => {
  try {
    MessagePlugin.loading('正在导出数据...', 0)

    // 构建导出参数
    const params: any = {}
    if (filterForm.status !== undefined) params.status = filterForm.status
    if (filterForm.keyword) params.keyword = filterForm.keyword
    if (filterForm.dateRange?.length === 2) {
      params.startDate = filterForm.dateRange[0]
      params.endDate = filterForm.dateRange[1]
    }

    // 请求导出
    const response = await request.get('/admin/reservations/export', {
      params,
      responseType: 'blob',
    })

    // 创建下载链接
    const blob = new Blob([response as any], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `预约数据_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    MessagePlugin.closeAll()
    MessagePlugin.success('导出成功')
  } catch (error: any) {
    MessagePlugin.closeAll()
    MessagePlugin.error(error.message || '导出失败')
  }
}

// 赠品档位操作
const handleAddTier = () => {
  editingTier.value = {
    minAmount: 100,
    giftName: '',
    giftCost: 0,
    sortOrder: 0,
  }
  showTierEditDialog.value = true
}

const handleEditTier = (row: any) => {
  editingTier.value = { ...row }
  showTierEditDialog.value = true
}

const handleSaveTier = async () => {
  // 【2026-01-17修复】完善赠品档位验证逻辑
  if (!editingTier.value.giftName?.trim()) {
    MessagePlugin.warning('请填写赠品名称')
    return
  }
  if (editingTier.value.minAmount === undefined || editingTier.value.minAmount <= 0) {
    MessagePlugin.warning('最低金额必须大于0')
    return
  }
  if (editingTier.value.giftCost === undefined || editingTier.value.giftCost < 0) {
    MessagePlugin.warning('赠品成本不能为负数')
    return
  }
  if (editingTier.value.giftName.length > 100) {
    MessagePlugin.warning('赠品名称不能超过100个字符')
    return
  }
  try {
    if (editingTier.value.id) {
      await request.put(`/admin/gift-tiers/${editingTier.value.id}`, editingTier.value)
    } else {
      await request.post('/admin/gift-tiers', editingTier.value)
    }
    MessagePlugin.success('保存成功')
    showTierEditDialog.value = false
    loadGiftTiers()
  } catch (error: any) {
    MessagePlugin.error(error.message || '保存失败')
  }
}

const handleTierStatusChange = async (row: any) => {
  try {
    await request.put(`/admin/gift-tiers/${row.id}`, { isActive: row.isActive })
  } catch (error) {
    row.isActive = !row.isActive
    MessagePlugin.error('更新状态失败')
  }
}

const handleDeleteTier = async (row: any) => {
  try {
    await request.delete(`/admin/gift-tiers/${row.id}`)
    MessagePlugin.success('删除成功')
    loadGiftTiers()
  } catch (error: any) {
    MessagePlugin.error(error.message || '删除失败')
  }
}

// 初始化
onMounted(() => {
  loadStats()
  loadReservations()
  // 客服角色没有赠品管理权限，不加载赠品档位
  if (userStore.role !== 'SERVICE') {
    loadGiftTiers()
  }
})
</script>

<style scoped lang="less">
.reservations-page {
  padding: 0;
}

// 批量操作已选计数
.selected-count {
  color: var(--td-brand-color);
  font-weight: 500;
}

// 统计卡片
.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  .stat-icon {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    color: #fff;
  }

  .stat-info {
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
  }

  &.pending .stat-icon {
    background: linear-gradient(135deg, #FF9800, #FFB74D);
  }
  &.confirmed .stat-icon {
    background: linear-gradient(135deg, #4CAF50, #81C784);
  }
  &.completed .stat-icon {
    background: linear-gradient(135deg, #2196F3, #64B5F6);
  }
  &.amount .stat-icon {
    background: linear-gradient(135deg, #E53935, #FF6B6B);
  }

  // 备货相关统计卡片样式【2026-01-17新增】
  &.prepare-pending .stat-icon {
    background: linear-gradient(135deg, #795548, #A1887F);
  }
  &.preparing .stat-icon {
    background: linear-gradient(135deg, #FF5722, #FF8A65);
  }
  &.pickup .stat-icon {
    background: linear-gradient(135deg, #03A9F4, #4FC3F7);
  }
}

// 备货统计行样式
.prepare-stats {
  margin-top: 0;
}

// 表格单元格
.reservation-no {
  font-family: monospace;
  font-size: 13px;
  color: #1890ff;
}

.customer-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .customer-name {
    font-weight: 500;
    color: #333;
  }
  .customer-phone {
    font-size: 12px;
    color: #666;
  }
}

.date-text {
  color: #666;
}

.time-text {
  font-size: 12px;
  color: #999;
}

.empty-text {
  color: #999;
}

// 详情弹窗
.reservation-detail {
  .status-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-radius: 8px;
    margin-bottom: 20px;

    .status-label {
      font-size: 20px;
      font-weight: 700;
    }
    .status-desc {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
    .status-time {
      font-size: 14px;
      color: #666;
    }
  }

  .detail-section {
    margin-bottom: 20px;
    padding: 16px;
    background: #fafafa;
    border-radius: 8px;

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #eee;
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    .info-item {
      display: flex;
      justify-content: space-between;
      .info-label {
        color: #666;
      }
      .info-value {
        font-weight: 500;
        &.highlight {
          color: #E53935;
        }
      }
    }
  }

  .product-list {
    .product-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px dashed #eee;

      &:last-child {
        border-bottom: none;
      }

      .product-image {
        width: 60px;
        height: 60px;
        border-radius: 8px;
        object-fit: cover;
        background: #f0f0f0;
      }

      .product-info {
        flex: 1;
        .product-name {
          font-weight: 500;
          margin-bottom: 4px;
        }
        .product-meta {
          font-size: 13px;
          color: #666;
          .product-price {
            color: #E53935;
          }
          .product-quantity {
            margin-left: 12px;
          }
        }
      }

      .product-subtotal {
        font-size: 16px;
        font-weight: 600;
        color: #E53935;
      }
    }
  }

  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0 0;
    margin-top: 12px;
    border-top: 1px solid #eee;
    font-size: 16px;

    .total-amount {
      font-size: 24px;
      font-weight: 700;
      color: #E53935;
    }
  }

  .gift-section {
    background: rgba(255, 107, 107, 0.05);
    border: 1px solid rgba(255, 107, 107, 0.2);

    .section-title {
      color: #FF6B6B;
    }

    .gift-info {
      display: flex;
      align-items: center;
      gap: 12px;
      .gift-name {
        font-size: 16px;
        font-weight: 600;
        color: #FF6B6B;
      }
    }
  }

  // 备货信息样式【2026-01-17新增】
  .prepare-section {
    background: rgba(255, 87, 34, 0.05);
    border: 1px solid rgba(255, 87, 34, 0.2);

    .section-title {
      color: #FF5722;
    }

    .pickup-code {
      font-size: 18px;
      font-weight: 700;
      font-family: monospace;
      letter-spacing: 2px;
      color: #FF5722;
    }

    .prepare-progress {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px dashed rgba(255, 87, 34, 0.3);

      .progress-title {
        font-size: 14px;
        font-weight: 600;
        color: #666;
        margin-bottom: 12px;
      }

      .progress-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .progress-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;

        .t-icon {
          color: #ccc;
          &.checked {
            color: #4CAF50;
          }
        }

        .item-name {
          flex: 1;
        }

        .item-qty {
          color: #999;
        }
      }
    }
  }

  // 审计日志样式【2026-01-17新增】
  .audit-section {
    background: rgba(33, 150, 243, 0.05);
    border: 1px solid rgba(33, 150, 243, 0.2);

    .section-title {
      color: #2196F3;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .audit-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .audit-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px dashed #eee;

    &:last-child {
      border-bottom: none;
    }

    .audit-time {
      font-size: 12px;
      color: #999;
      white-space: nowrap;
    }

    .audit-content {
      flex: 1;
      font-size: 14px;

      .audit-user {
        color: #2196F3;
        font-weight: 500;
        margin-right: 8px;
      }

      .audit-action {
        color: #333;
      }
    }
  }

  .audit-empty {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #999;
    font-size: 14px;
    padding: 12px 0;
  }
}

// 赠品配置
.gift-tier-config {
  .tier-header {
    margin-bottom: 16px;
  }

  .amount-text {
    font-weight: 600;
    color: #E53935;
  }
}

// 【2026-01-19新增】电话确认弹窗样式
.call-confirm-dialog {
  .customer-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: linear-gradient(135deg, #E53935 0%, #FF6B6B 100%);
    border-radius: 8px;
    color: white;
    margin-bottom: 16px;

    .customer-avatar {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .customer-info {
      flex: 1;

      .customer-name {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .customer-phone {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 1px;
      }
    }
  }

  .section {
    margin-bottom: 16px;

    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 500;
      color: #666;
      margin-bottom: 8px;
    }
  }

  .script-card {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;

    .script-text {
      font-size: 14px;
      line-height: 1.8;
      color: #333;

      .highlight {
        color: #E53935;
        font-weight: 600;
      }
    }

    .gift-remind {
      margin-top: 12px;
      padding: 10px 12px;
      background: #fff8e1;
      border-radius: 6px;
      font-size: 13px;
      color: #f57c00;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  .info-card {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 12px 16px;

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #eee;

      &:last-child {
        border-bottom: none;
      }

      .label {
        font-size: 13px;
        color: #666;
      }

      .value {
        font-size: 14px;
        color: #333;
        font-weight: 500;

        &.amount {
          color: #E53935;
          font-weight: 700;
        }
      }
    }
  }

  .action-section {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #eee;

    .call-tip {
      text-align: center;
      font-size: 12px;
      color: #999;
      margin: 8px 0 16px;
    }

    .result-actions {
      display: flex;
      gap: 12px;

      .t-button {
        flex: 1;
      }
    }

    .result-tip {
      text-align: center;
      font-size: 12px;
      color: #999;
      margin-top: 8px;
      min-height: 18px;
    }
  }
}
</style>
