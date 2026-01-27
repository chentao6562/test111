<template>
  <div class="finance-page">
    <!-- 页面标题 -->
    <PageHeader title="财务管理" subtitle="管理提现审批、资金流水与数据核对" />

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <StatCard
        label="待审核提现"
        :value="statistics.pendingWithdrawal + statistics.pendingStaffWithdrawal"
        suffix="笔"
        icon="wallet"
        theme="warning"
        :loading="statsLoading"
        :highlight="statistics.pendingWithdrawal > 0 || statistics.pendingStaffWithdrawal > 0"
        clickable
        @click="switchTab('withdrawal')"
      />
      <StatCard
        label="待打款"
        :value="statistics.pendingPaymentWithdrawal + statistics.pendingPaymentStaffWithdrawal"
        suffix="笔"
        icon="money-circle"
        theme="primary"
        :loading="statsLoading"
        :highlight="statistics.pendingPaymentWithdrawal > 0 || statistics.pendingPaymentStaffWithdrawal > 0"
        clickable
        @click="switchTab('pendingPayment')"
      />
      <StatCard
        label="累计提现"
        :value="statistics.totalWithdrawalAmount + statistics.totalStaffWithdrawalAmount"
        prefix="¥"
        icon="chart-pie"
        theme="success"
        :loading="statsLoading"
        clickable
        @click="switchTab('history')"
      />
      <StatCard
        :label="statistics.todayFlow > 0 ? '今日流水' : '本月流水'"
        :value="statistics.todayFlow > 0 ? statistics.todayFlow : statistics.monthlyFlowAmount"
        prefix="¥"
        icon="trending-up"
        theme="info"
        :loading="statsLoading"
        clickable
        @click="switchTab('flow')"
      />
    </div>

    <!-- 主内容卡片 -->
    <TableCard>
      <template #header>
        <t-tabs v-model="activeTab" @change="handleTabChange">
          <t-tab-panel value="withdrawal">
            <template #label>
              <span>提现审核</span>
              <t-badge v-if="statistics.pendingWithdrawal + statistics.pendingStaffWithdrawal > 0" :count="statistics.pendingWithdrawal + statistics.pendingStaffWithdrawal" />
            </template>
          </t-tab-panel>
          <t-tab-panel value="pendingPayment">
            <template #label>
              <span>待打款</span>
              <t-badge v-if="statistics.pendingPaymentWithdrawal + statistics.pendingPaymentStaffWithdrawal > 0" :count="statistics.pendingPaymentWithdrawal + statistics.pendingPaymentStaffWithdrawal" />
            </template>
          </t-tab-panel>
          <t-tab-panel value="history" label="提现历史" />
          <t-tab-panel value="commission" label="利润记录" />
          <t-tab-panel value="flow" label="资金流水" />
          <t-tab-panel value="reconciliation" label="数据核对" />
          <t-tab-panel value="recharge">
            <template #label>
              <span>加款审批</span>
              <t-badge v-if="statistics.pendingRecharge > 0" :count="statistics.pendingRecharge" />
            </template>
          </t-tab-panel>
        </t-tabs>
      </template>

      <!-- 筛选区域 -->
      <div class="filter-bar">
        <t-input
          v-model="searchForm.keyword"
          placeholder="推销员/员工名称或手机号"
          clearable
          style="width: 200px"
        >
          <template #prefix-icon><t-icon name="search" /></template>
        </t-input>

        <t-select
          v-if="activeTab === 'withdrawal' || activeTab === 'pendingPayment'"
          v-model="searchForm.userType"
          placeholder="用户类型"
          clearable
          style="width: 120px"
        >
          <t-option value="" label="全部" />
          <t-option value="agent" label="推销员" />
          <t-option value="staff" label="员工" />
        </t-select>

        <t-select
          v-if="activeTab === 'withdrawal'"
          v-model="searchForm.status"
          placeholder="全部状态"
          clearable
          style="width: 140px"
        >
          <t-option value="" label="全部状态" />
          <t-option value="PENDING" label="待审核" />
          <t-option value="APPROVED" label="待打款" />
          <t-option value="COMPLETED" label="已打款" />
          <t-option value="REJECTED" label="已拒绝" />
        </t-select>

        <t-select
          v-if="activeTab === 'commission'"
          v-model="searchForm.commissionType"
          placeholder="分润类型"
          clearable
          style="width: 120px"
        >
          <t-option value="" label="全部类型" />
          <t-option value="DIRECT" label="直接分润" />
          <t-option value="INDIRECT" label="间接分润" />
        </t-select>

        <t-select
          v-if="activeTab === 'commission'"
          v-model="searchForm.commissionStatus"
          placeholder="结算状态"
          clearable
          style="width: 120px"
        >
          <t-option value="" label="全部" />
          <t-option value="PENDING" label="待结算" />
          <t-option value="SETTLED" label="已结算" />
        </t-select>

        <t-date-range-picker
          v-model="dateRange"
          placeholder="选择日期范围"
          style="width: 260px"
        />

        <t-space style="margin-left: auto;">
          <t-button theme="default" @click="handleReset">重置</t-button>
          <t-button theme="primary" @click="handleSearch">
            <template #icon><t-icon name="search" /></template>
            查询
          </t-button>
        </t-space>
      </div>

      <!-- 空状态 -->
      <template v-if="!loading && getCurrentList().length === 0">
        <EmptyState
          v-if="hasFilters"
          type="search"
          title="未找到匹配的记录"
          description="请尝试调整筛选条件"
        >
          <template #action>
            <t-button theme="primary" @click="handleReset">清除筛选</t-button>
          </template>
        </EmptyState>
        <EmptyState
          v-else
          type="data"
          :title="getEmptyTitle()"
          :description="getEmptyDesc()"
        />
      </template>

      <!-- 提现审核列表 -->
      <t-table
        v-else-if="activeTab === 'withdrawal'"
        :data="withdrawalList"
        :columns="withdrawalColumns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        hover
        stripe
        @page-change="handlePageChange"
      >
        <template #user="{ row }">
          <div class="user-info">
            <div :class="['user-avatar', row.isStaff ? 'staff' : '']">{{ (row.name || row.staffName)?.charAt(0) || 'U' }}</div>
            <div class="user-detail">
              <span class="name">{{ row.name || row.staffName || '-' }}</span>
              <span class="id">
                <t-tag size="small" :theme="row.isStaff ? 'primary' : 'warning'" variant="light">
                  {{ row.isStaff ? '员工' : '推销员' }}
                </t-tag>
              </span>
            </div>
          </div>
        </template>
        <template #amount="{ row }">
          <AmountText :value="row.amount" />
        </template>
        <template #paymentMethod="{ row }">
          <div v-if="row.isStaff" class="payment-method">
            <template v-if="row.bankAccount">
              <StatusTag type="default" text="银行卡" />
              <span class="method-detail">{{ row.bankName }} {{ maskAccount(row.bankAccount) }}</span>
            </template>
            <template v-else-if="row.alipay">
              <StatusTag type="info" text="支付宝" />
              <span class="method-detail">{{ row.alipay }}</span>
            </template>
            <template v-else-if="row.wechat">
              <StatusTag type="success" text="微信" />
              <span class="method-detail">{{ row.wechat }}</span>
            </template>
            <template v-else>
              <span class="text-muted">未设置</span>
            </template>
          </div>
          <div v-else class="payment-method">
            <span class="text-muted">线下打款</span>
          </div>
        </template>
        <template #status="{ row }">
          <StatusTag :type="getStatusType(row.status)" :text="getStatusText(row.status)" />
        </template>
        <template #createdAt="{ row }">
          <span class="time-text">{{ formatDate(row.createdAt) }}</span>
        </template>
        <template #op="{ row }">
          <t-space v-if="row.status === 'PENDING'" size="small">
            <t-link theme="primary" @click="handleViewWithdrawalDetail(row)">详情</t-link>
            <t-link theme="success" @click="handleApproveWithdrawal(row)">通过</t-link>
            <t-link theme="danger" @click="handleRejectWithdrawal(row)">拒绝</t-link>
          </t-space>
          <t-space v-else-if="row.status === 'APPROVED'" size="small">
            <t-link theme="primary" @click="handleViewWithdrawalDetail(row)">详情</t-link>
            <t-link theme="success" @click="handleCompleteWithdrawal(row)">确认打款</t-link>
          </t-space>
          <t-link v-else theme="primary" @click="handleViewWithdrawalDetail(row)">查看详情</t-link>
        </template>
      </t-table>

      <!-- 待打款列表 -->
      <t-table
        v-else-if="activeTab === 'pendingPayment'"
        :data="pendingPaymentList"
        :columns="pendingPaymentColumns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        hover
        stripe
        @page-change="handlePageChange"
      >
        <template #user="{ row }">
          <div class="user-info">
            <div :class="['user-avatar', row.isStaff ? 'staff' : '']">{{ (row.name || row.staffName)?.charAt(0) || 'U' }}</div>
            <div class="user-detail">
              <span class="name">{{ row.name || row.staffName || '-' }}</span>
              <span class="id">
                <t-tag size="small" :theme="row.isStaff ? 'primary' : 'warning'" variant="light">
                  {{ row.isStaff ? '员工' : '推销员' }}
                </t-tag>
              </span>
            </div>
          </div>
        </template>
        <template #phone="{ row }">
          {{ row.phone || '-' }}
        </template>
        <template #amount="{ row }">
          <AmountText :value="row.amount" type="warning" />
        </template>
        <template #paymentMethod="{ row }">
          <div v-if="row.isStaff" class="payment-method">
            <template v-if="row.bankAccount">
              <StatusTag type="default" text="银行卡" />
              <span class="method-detail">{{ row.bankName }} {{ maskAccount(row.bankAccount) }}</span>
            </template>
            <template v-else-if="row.alipay">
              <StatusTag type="info" text="支付宝" />
              <span class="method-detail">{{ row.alipay }}</span>
            </template>
            <template v-else-if="row.wechat">
              <StatusTag type="success" text="微信" />
              <span class="method-detail">{{ row.wechat }}</span>
            </template>
            <template v-else>
              <span class="text-muted">未设置</span>
            </template>
          </div>
          <div v-else class="payment-method">
            <span class="text-muted">线下打款至推销员</span>
          </div>
        </template>
        <template #reviewedAt="{ row }">
          <span class="time-text">{{ formatDate(row.reviewedAt) }}</span>
        </template>
        <template #op="{ row }">
          <t-space size="small">
            <t-link theme="primary" @click="handleViewWithdrawalDetail(row)">详情</t-link>
            <t-button theme="success" size="small" @click="handleCompleteWithdrawal(row)">
              <template #icon><t-icon name="check" /></template>
              确认打款
            </t-button>
          </t-space>
        </template>
      </t-table>

      <!-- 分润记录列表 -->
      <t-table
        v-else-if="activeTab === 'commission'"
        :data="commissionList"
        :columns="commissionColumns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        hover
        stripe
        @page-change="handlePageChange"
      >
        <template #agent="{ row }">
          <div class="user-info">
            <div class="user-avatar">{{ row.agentName?.charAt(0) || 'U' }}</div>
            <div class="user-detail">
              <span class="name">{{ row.agentName || row.agent?.name || '-' }}</span>
              <span class="id">{{ row.agentPhone || row.agent?.phone || '' }}</span>
            </div>
          </div>
        </template>
        <template #type="{ row }">
          <t-tag :theme="row.type === 'DIRECT' ? 'primary' : 'warning'" variant="light" size="small">
            {{ row.type === 'DIRECT' ? '直接分润' : '间接分润' }}
          </t-tag>
        </template>
        <template #amount="{ row }">
          <span class="amount-positive">+¥{{ formatMoney(row.amount) }}</span>
        </template>
        <template #orderAmount="{ row }">
          ¥{{ formatMoney(row.orderAmount || row.order?.totalAmount || 0) }}
        </template>
        <template #status="{ row }">
          <t-tag :theme="row.status === 'SETTLED' ? 'success' : 'warning'" size="small">
            {{ row.status === 'SETTLED' ? '已结算' : '待结算' }}
          </t-tag>
        </template>
        <template #createdAt="{ row }">
          <span class="time-text">{{ formatDate(row.createdAt) }}</span>
        </template>
      </t-table>

      <!-- 资金流水列表 -->
      <t-table
        v-else-if="activeTab === 'flow'"
        :data="flowList"
        :columns="flowColumns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        hover
        stripe
        @page-change="handlePageChange"
      >
        <template #agent="{ row }">
          <div class="user-info">
            <div class="user-avatar">{{ row.agent?.name?.charAt(0) || 'U' }}</div>
            <div class="user-detail">
              <span class="name">{{ row.agent?.name || '-' }}</span>
              <span class="id">ID: {{ row.agentId }}</span>
            </div>
          </div>
        </template>
        <template #type="{ row }">
          <StatusTag :type="getFlowTypeTheme(row.type)" :text="getFlowTypeText(row.type)" />
        </template>
        <template #amount="{ row }">
          <span :class="['flow-amount', row.amount > 0 ? 'income' : 'expense']">
            {{ row.amount > 0 ? '+' : '' }}¥{{ formatMoney(Math.abs(row.amount)) }}
          </span>
        </template>
        <template #balance="{ row }">
          <AmountText :value="row.afterBalance" size="small" />
        </template>
        <template #createdAt="{ row }">
          <span class="time-text">{{ formatDate(row.createdAt) }}</span>
        </template>
      </t-table>

      <!-- 加款审批列表 -->
      <t-table
        v-else-if="activeTab === 'recharge'"
        :data="rechargeList"
        :columns="rechargeColumns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        hover
        stripe
        @page-change="handlePageChange"
      >
        <template #agent="{ row }">
          <div class="user-info">
            <div class="user-avatar">{{ row.agent?.name?.charAt(0) || 'U' }}</div>
            <div class="user-detail">
              <span class="name">{{ row.agent?.name || '-' }}</span>
              <span class="id">ID: {{ row.agentId }}</span>
            </div>
          </div>
        </template>
        <template #amount="{ row }">
          <AmountText :value="row.amount" />
        </template>
        <template #voucher="{ row }">
          <t-image
            v-if="row.voucher"
            :src="row.voucher"
            fit="cover"
            class="voucher-image"
            @click="handlePreviewImage(row.voucher)"
          />
          <span v-else class="text-muted">无凭证</span>
        </template>
        <template #status="{ row }">
          <StatusTag :type="getStatusType(row.status)" :text="getStatusText(row.status)" />
        </template>
        <template #createdAt="{ row }">
          <span class="time-text">{{ formatDate(row.createdAt) }}</span>
        </template>
        <template #op="{ row }">
          <t-space v-if="row.status === 'PENDING'" size="small">
            <t-link theme="danger" @click="handleRejectRecharge(row)">拒绝</t-link>
            <t-link theme="success" @click="handleApproveRecharge(row)">通过</t-link>
          </t-space>
          <t-link v-else theme="primary" @click="handleViewDetail(row)">查看详情</t-link>
        </template>
      </t-table>

      <!-- 提现历史列表 -->
      <t-table
        v-else-if="activeTab === 'history'"
        :data="historyList"
        :columns="historyColumns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        hover
        stripe
        @page-change="handlePageChange"
      >
        <template #user="{ row }">
          <div class="user-info">
            <div :class="['user-avatar', row.isStaff ? 'staff' : '']">{{ (row.name || row.staffName)?.charAt(0) || 'U' }}</div>
            <div class="user-detail">
              <span class="name">{{ row.name || row.staffName || '-' }}</span>
              <span class="id">
                <t-tag size="small" :theme="row.isStaff ? 'primary' : 'warning'" variant="light">
                  {{ row.isStaff ? '员工' : '推销员' }}
                </t-tag>
              </span>
            </div>
          </div>
        </template>
        <template #amount="{ row }">
          <AmountText :value="row.amount" type="success" />
        </template>
        <template #status="{ row }">
          <StatusTag :type="getStatusType(row.status)" :text="getStatusText(row.status)" />
        </template>
        <template #completedAt="{ row }">
          <span class="time-text">{{ formatDate(row.completedAt || row.reviewedAt) }}</span>
        </template>
        <template #op="{ row }">
          <t-link theme="primary" @click="handleViewWithdrawalDetail(row)">查看详情</t-link>
        </template>
      </t-table>

      <!-- 数据核对 -->
      <div v-else-if="activeTab === 'reconciliation'" class="reconciliation-content">
        <t-alert theme="info" :close-btn="false" class="info-alert">
          <template #message>
            <div class="alert-content">
              <strong>数据核对说明</strong>
              <p>系统自动计算各项财务数据，用于核对账务是否平衡。如发现异常请及时联系技术支持。</p>
            </div>
          </template>
        </t-alert>

        <div class="reconciliation-header">
          <h3>财务数据核对</h3>
          <t-button theme="primary" :loading="reconciliationLoading" @click="loadReconciliationData">
            <template #icon><t-icon name="refresh" /></template>
            刷新数据
          </t-button>
        </div>

        <!-- 核对数据卡片 -->
        <div class="reconciliation-grid">
          <!-- 推销员提现核对 -->
          <div class="reconciliation-card">
            <div class="card-header">
              <t-icon name="wallet" />
              <span>推销员提现核对</span>
            </div>
            <div class="card-body">
              <div class="data-row">
                <span class="label">待审核提现</span>
                <span class="value">{{ reconciliationData.agentWithdrawal.pending }} 笔</span>
                <span class="amount">¥{{ formatMoney(reconciliationData.agentWithdrawal.pendingAmount) }}</span>
              </div>
              <div class="data-row">
                <span class="label">待打款</span>
                <span class="value">{{ reconciliationData.agentWithdrawal.approved }} 笔</span>
                <span class="amount">¥{{ formatMoney(reconciliationData.agentWithdrawal.approvedAmount) }}</span>
              </div>
              <div class="data-row">
                <span class="label">已完成</span>
                <span class="value">{{ reconciliationData.agentWithdrawal.completed }} 笔</span>
                <span class="amount success">¥{{ formatMoney(reconciliationData.agentWithdrawal.completedAmount) }}</span>
              </div>
              <div class="data-row">
                <span class="label">已拒绝</span>
                <span class="value">{{ reconciliationData.agentWithdrawal.rejected }} 笔</span>
                <span class="amount danger">¥{{ formatMoney(reconciliationData.agentWithdrawal.rejectedAmount) }}</span>
              </div>
              <div class="data-row total">
                <span class="label">总计申请</span>
                <span class="value">{{ reconciliationData.agentWithdrawal.total }} 笔</span>
                <span class="amount">¥{{ formatMoney(reconciliationData.agentWithdrawal.totalAmount) }}</span>
              </div>
            </div>
          </div>

          <!-- 员工提现核对 -->
          <div class="reconciliation-card">
            <div class="card-header">
              <t-icon name="user-money" />
              <span>员工提现核对</span>
            </div>
            <div class="card-body">
              <div class="data-row">
                <span class="label">待审核提现</span>
                <span class="value">{{ reconciliationData.staffWithdrawal.pending }} 笔</span>
                <span class="amount">¥{{ formatMoney(reconciliationData.staffWithdrawal.pendingAmount) }}</span>
              </div>
              <div class="data-row">
                <span class="label">待打款</span>
                <span class="value">{{ reconciliationData.staffWithdrawal.approved }} 笔</span>
                <span class="amount">¥{{ formatMoney(reconciliationData.staffWithdrawal.approvedAmount) }}</span>
              </div>
              <div class="data-row">
                <span class="label">已完成</span>
                <span class="value">{{ reconciliationData.staffWithdrawal.completed }} 笔</span>
                <span class="amount success">¥{{ formatMoney(reconciliationData.staffWithdrawal.completedAmount) }}</span>
              </div>
              <div class="data-row">
                <span class="label">已拒绝</span>
                <span class="value">{{ reconciliationData.staffWithdrawal.rejected }} 笔</span>
                <span class="amount danger">¥{{ formatMoney(reconciliationData.staffWithdrawal.rejectedAmount) }}</span>
              </div>
              <div class="data-row total">
                <span class="label">总计申请</span>
                <span class="value">{{ reconciliationData.staffWithdrawal.total }} 笔</span>
                <span class="amount">¥{{ formatMoney(reconciliationData.staffWithdrawal.totalAmount) }}</span>
              </div>
            </div>
          </div>

          <!-- 分润核对 -->
          <div class="reconciliation-card">
            <div class="card-header">
              <t-icon name="chart-pie" />
              <span>利润数据核对</span>
            </div>
            <div class="card-body">
              <div class="data-row">
                <span class="label">待结算利润</span>
                <span class="value">{{ reconciliationData.commission.pending }} 笔</span>
                <span class="amount">¥{{ formatMoney(reconciliationData.commission.pendingAmount) }}</span>
              </div>
              <div class="data-row">
                <span class="label">已结算利润</span>
                <span class="value">{{ reconciliationData.commission.settled }} 笔</span>
                <span class="amount success">¥{{ formatMoney(reconciliationData.commission.settledAmount) }}</span>
              </div>
              <div class="data-row">
                <span class="label">已取消利润</span>
                <span class="value">{{ reconciliationData.commission.cancelled }} 笔</span>
                <span class="amount danger">¥{{ formatMoney(reconciliationData.commission.cancelledAmount) }}</span>
              </div>
              <div class="data-row total">
                <span class="label">总计利润</span>
                <span class="value">{{ reconciliationData.commission.total }} 笔</span>
                <span class="amount">¥{{ formatMoney(reconciliationData.commission.totalAmount) }}</span>
              </div>
            </div>
          </div>

          <!-- 推销员余额核对 -->
          <div class="reconciliation-card">
            <div class="card-header">
              <t-icon name="money-circle" />
              <span>推销员余额核对</span>
            </div>
            <div class="card-body">
              <div class="data-row">
                <span class="label">推销员总数</span>
                <span class="value">{{ reconciliationData.agentBalance.totalAgents }} 人</span>
                <span class="amount">-</span>
              </div>
              <div class="data-row">
                <span class="label">总余额</span>
                <span class="value">-</span>
                <span class="amount">¥{{ formatMoney(reconciliationData.agentBalance.totalBalance) }}</span>
              </div>
              <div class="data-row">
                <span class="label">累计利润收入</span>
                <span class="value">-</span>
                <span class="amount success">¥{{ formatMoney(reconciliationData.agentBalance.totalCommission) }}</span>
              </div>
              <div class="data-row">
                <span class="label">累计提现支出</span>
                <span class="value">-</span>
                <span class="amount danger">¥{{ formatMoney(reconciliationData.agentBalance.totalWithdrawn) }}</span>
              </div>
              <div class="data-row total" :class="{ error: !reconciliationData.agentBalance.isBalanced }">
                <span class="label">差额核对</span>
                <span class="value">收入-支出-余额</span>
                <span class="amount" :class="reconciliationData.agentBalance.isBalanced ? 'success' : 'danger'">
                  {{ reconciliationData.agentBalance.isBalanced ? '✓ 平衡' : '✗ 差额 ¥' + formatMoney(reconciliationData.agentBalance.difference) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 核对结果摘要 -->
        <div class="reconciliation-summary">
          <div class="summary-header">
            <t-icon :name="reconciliationData.isAllBalanced ? 'check-circle' : 'error-circle'" :class="reconciliationData.isAllBalanced ? 'success' : 'danger'" />
            <span>核对结果: {{ reconciliationData.isAllBalanced ? '所有数据核对通过' : '存在数据异常，请检查' }}</span>
          </div>
          <div class="summary-time">
            最后核对时间: {{ reconciliationData.lastCheckTime || '-' }}
          </div>
        </div>
      </div>
    </TableCard>

    <!-- 图片预览 -->
    <t-image-viewer v-model:visible="imageViewerVisible" :images="[previewImage]" />

    <!-- 拒绝原因弹窗 -->
    <t-dialog
      v-model:visible="rejectDialogVisible"
      header="拒绝原因"
      :confirm-btn="{ content: '确认拒绝', theme: 'danger' }"
      @confirm="handleConfirmReject"
    >
      <t-textarea
        v-model="rejectReason"
        placeholder="请输入拒绝原因"
        :maxlength="200"
        :autosize="{ minRows: 3, maxRows: 5 }"
      />
    </t-dialog>

    <!-- 提现详情弹窗 -->
    <t-dialog
      v-model:visible="withdrawalDetailVisible"
      header="提现详情"
      :footer="false"
      width="700px"
    >
      <div class="withdrawal-detail" v-if="withdrawalDetail">
        <!-- 提现信息 -->
        <div class="detail-section">
          <div class="section-title">提现信息</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">提现金额</span>
              <AmountText :value="withdrawalDetail.withdrawal?.amount || withdrawalDetail.amount" size="large" />
            </div>
            <div class="detail-item">
              <span class="label">状态</span>
              <StatusTag
                :type="getStatusType(withdrawalDetail.withdrawal?.status || withdrawalDetail.status)"
                :text="getStatusText(withdrawalDetail.withdrawal?.status || withdrawalDetail.status)"
              />
            </div>
            <div class="detail-item">
              <span class="label">申请时间</span>
              <span class="value">{{ formatDate(withdrawalDetail.withdrawal?.createdAt || withdrawalDetail.createdAt) }}</span>
            </div>
            <div class="detail-item" v-if="withdrawalDetail.withdrawal?.reviewedAt || withdrawalDetail.reviewedAt">
              <span class="label">审核时间</span>
              <span class="value">{{ formatDate(withdrawalDetail.withdrawal?.reviewedAt || withdrawalDetail.reviewedAt) }}</span>
            </div>
            <div class="detail-item full" v-if="withdrawalDetail.withdrawal?.rejectReason || withdrawalDetail.reason">
              <span class="label">拒绝原因</span>
              <span class="value danger">{{ withdrawalDetail.withdrawal?.rejectReason || withdrawalDetail.reason }}</span>
            </div>
          </div>
        </div>

        <!-- 收款信息（员工提现） -->
        <div class="detail-section" v-if="withdrawalDetail.isStaff || withdrawalDetail.staffId">
          <div class="section-title">收款信息</div>
          <div class="detail-grid">
            <div class="detail-item" v-if="withdrawalDetail.bankAccount">
              <span class="label">银行卡</span>
              <span class="value">{{ withdrawalDetail.bankName }} {{ withdrawalDetail.bankAccount }}</span>
            </div>
            <div class="detail-item" v-if="withdrawalDetail.alipay">
              <span class="label">支付宝</span>
              <span class="value">{{ withdrawalDetail.alipay }}</span>
            </div>
            <div class="detail-item" v-if="withdrawalDetail.wechat">
              <span class="label">微信</span>
              <span class="value">{{ withdrawalDetail.wechat }}</span>
            </div>
          </div>
        </div>

        <!-- 用户信息 -->
        <div class="detail-section">
          <div class="section-title">{{ withdrawalDetail.isStaff || withdrawalDetail.staffId ? '员工信息' : '推销员信息' }}</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">姓名</span>
              <span class="value">{{ withdrawalDetail.agent?.name || withdrawalDetail.staffName || withdrawalDetail.name || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">手机号</span>
              <span class="value">{{ withdrawalDetail.agent?.phone || withdrawalDetail.phone || '-' }}</span>
            </div>
            <div class="detail-item" v-if="!withdrawalDetail.isStaff && !withdrawalDetail.staffId">
              <span class="label">当前余额</span>
              <AmountText :value="withdrawalDetail.agent?.currentBalance || withdrawalDetail.agent?.balance" />
            </div>
            <div class="detail-item" v-if="!withdrawalDetail.isStaff && !withdrawalDetail.staffId">
              <span class="label">累计分润</span>
              <AmountText :value="withdrawalDetail.agent?.totalCommission" />
            </div>
          </div>
        </div>

        <!-- 最近利润记录（推销员） -->
        <div class="detail-section" v-if="withdrawalDetail.recentCommissions?.length">
          <div class="section-title">最近利润记录</div>
          <t-table
            :data="withdrawalDetail.recentCommissions"
            :columns="recentCommissionColumns"
            size="small"
            bordered
            row-key="id"
          >
            <template #type="{ row }">
              <StatusTag
                :type="row.type === 'DIRECT' ? 'primary' : 'warning'"
                :text="row.type === 'DIRECT' ? '直接分润' : '间接分润'"
              />
            </template>
            <template #amount="{ row }">
              <span class="text-success">+¥{{ formatMoney(row.amount) }}</span>
            </template>
            <template #createdAt="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </t-table>
        </div>

        <!-- 操作按钮 -->
        <div class="detail-actions" v-if="withdrawalDetail.withdrawal?.status === 'APPROVED' || withdrawalDetail.status === 'APPROVED'">
          <t-button theme="success" size="large" @click="handleCompleteWithdrawalFromDetail">
            <template #icon><t-icon name="check" /></template>
            确认打款完成
          </t-button>
        </div>
      </div>
    </t-dialog>

    <!-- 确认打款弹窗 -->
    <t-dialog
      v-model:visible="completeDialogVisible"
      header="确认打款完成"
      :confirm-btn="{ content: '确认打款完成', theme: 'success', disabled: !selectedPaymentMethod }"
      @confirm="handleConfirmComplete"
    >
      <div class="complete-dialog">
        <div class="complete-info">
          <p>您确认已经完成线下打款吗？</p>
          <div class="complete-row">
            <span class="label">打款金额</span>
            <AmountText :value="currentCompleteItem?.amount" size="large" type="warning" />
          </div>
          <div class="complete-row">
            <span class="label">收款人</span>
            <span class="value">{{ currentCompleteItem?.name || currentCompleteItem?.staffName }} ({{ currentCompleteItem?.phone || currentCompleteItem?.bankAccount || currentCompleteItem?.alipay || currentCompleteItem?.wechat }})</span>
          </div>
          <div class="complete-row" v-if="currentCompleteItem?.isStaff">
            <span class="label">收款账户</span>
            <span class="value">
              <template v-if="currentCompleteItem?.bankAccount">银行卡: {{ currentCompleteItem?.bankName }} {{ currentCompleteItem?.bankAccount }}</template>
              <template v-else-if="currentCompleteItem?.alipay">支付宝: {{ currentCompleteItem?.alipay }}</template>
              <template v-else-if="currentCompleteItem?.wechat">微信: {{ currentCompleteItem?.wechat }}</template>
            </span>
          </div>
        </div>

        <!-- 打款方式选择 -->
        <div class="payment-method-section">
          <div class="section-label">打款方式 <span class="required">*</span></div>
          <t-radio-group v-model="selectedPaymentMethod" variant="default-filled">
            <t-radio-button value="CASH">现金打款</t-radio-button>
            <t-radio-button value="WECHAT">微信转账</t-radio-button>
            <t-radio-button value="ALIPAY">支付宝转账</t-radio-button>
            <t-radio-button value="BANK">银行转账</t-radio-button>
          </t-radio-group>
        </div>

        <t-textarea
          v-model="completeRemark"
          placeholder="打款备注（选填）"
          :maxlength="200"
          :autosize="{ minRows: 2, maxRows: 4 }"
        />
      </div>
    </t-dialog>

  </div>
</template>

<script setup lang="ts">
/**
 * 财务管理页面
 * 整合：利润记录、提现审批（推销员+员工）、待打款、资金流水、数据核对、加款审批
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import {
  PageHeader,
  TableCard,
  StatCard,
  StatusTag,
  AmountText,
  EmptyState,
} from '@/components'
import { getFinanceStatistics, getRechargeList, reviewRecharge, getFundFlowList } from '@/api/finance'
import {
  getWithdrawals,
  reviewWithdrawal,
  completeWithdrawal,
  getWithdrawalDetail,
  getRecords,
} from '@/api/commission'
import { getStaffWithdrawals, reviewStaffWithdrawal, completeStaffWithdrawal } from '@/api/staffWithdrawal'

// 统计数据
const statistics = ref({
  pendingRecharge: 0,
  pendingWithdrawal: 0,
  pendingStaffWithdrawal: 0,
  todayFlow: 0,
  pendingPaymentWithdrawal: 0,
  pendingPaymentStaffWithdrawal: 0,
  totalWithdrawalAmount: 0,
  totalStaffWithdrawalAmount: 0,
  monthlyFlowAmount: 0,
})
const statsLoading = ref(false)

// Tab
const activeTab = ref('withdrawal')

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: '',
  userType: '',
  commissionType: '',
  commissionStatus: '',
})
const dateRange = ref<string[]>([])

// 加载状态
const loading = ref(false)
const submitting = ref(false)

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

// 是否有筛选条件
const hasFilters = computed(() => {
  return searchForm.keyword || searchForm.status || searchForm.userType || dateRange.value.length > 0
})

// 列表数据
const withdrawalList = ref<any[]>([])
const pendingPaymentList = ref<any[]>([])
const historyList = ref<any[]>([])
const commissionList = ref<any[]>([])
const flowList = ref<any[]>([])
const rechargeList = ref<any[]>([])

// 数据核对
const reconciliationLoading = ref(false)
const reconciliationData = reactive({
  agentWithdrawal: {
    pending: 0,
    pendingAmount: 0,
    approved: 0,
    approvedAmount: 0,
    completed: 0,
    completedAmount: 0,
    rejected: 0,
    rejectedAmount: 0,
    total: 0,
    totalAmount: 0,
  },
  staffWithdrawal: {
    pending: 0,
    pendingAmount: 0,
    approved: 0,
    approvedAmount: 0,
    completed: 0,
    completedAmount: 0,
    rejected: 0,
    rejectedAmount: 0,
    total: 0,
    totalAmount: 0,
  },
  commission: {
    pending: 0,
    pendingAmount: 0,
    settled: 0,
    settledAmount: 0,
    cancelled: 0,
    cancelledAmount: 0,
    total: 0,
    totalAmount: 0,
  },
  agentBalance: {
    totalAgents: 0,
    totalBalance: 0,
    totalCommission: 0,
    totalWithdrawn: 0,
    difference: 0,
    isBalanced: true,
  },
  isAllBalanced: true,
  lastCheckTime: '',
})

// 图片预览
const imageViewerVisible = ref(false)
const previewImage = ref('')

// 拒绝弹窗
const rejectDialogVisible = ref(false)
const rejectReason = ref('')
const currentRejectItem = ref<any>(null)
const rejectType = ref<'recharge' | 'withdrawal' | 'staffWithdrawal'>('withdrawal')

// 提现详情弹窗
const withdrawalDetailVisible = ref(false)
const withdrawalDetail = ref<any>(null)

// 确认打款弹窗
const completeDialogVisible = ref(false)
const completeRemark = ref('')
const currentCompleteItem = ref<any>(null)
const selectedPaymentMethod = ref('')

// 表格列配置
const withdrawalColumns = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'user', title: '申请人', width: 180 },
  { colKey: 'amount', title: '提现金额', width: 140 },
  { colKey: 'paymentMethod', title: '收款方式', width: 200 },
  { colKey: 'createdAt', title: '申请时间', width: 180 },
  { colKey: 'status', title: '状态', width: 100, align: 'center' },
  { colKey: 'op', title: '操作', width: 200, align: 'center', fixed: 'right' },
]

const pendingPaymentColumns = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'user', title: '收款人', width: 180 },
  { colKey: 'phone', title: '联系电话', width: 140 },
  { colKey: 'amount', title: '打款金额', width: 140 },
  { colKey: 'paymentMethod', title: '收款方式', width: 220 },
  { colKey: 'reviewedAt', title: '审核通过时间', width: 180 },
  { colKey: 'op', title: '操作', width: 180, align: 'center', fixed: 'right' },
]

const commissionColumns = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'agent', title: '推销员', width: 180 },
  { colKey: 'type', title: '利润类型', width: 100 },
  { colKey: 'amount', title: '利润金额', width: 120 },
  { colKey: 'rate', title: '比例', width: 80 },
  { colKey: 'orderAmount', title: '预约金额', width: 120 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
]

const flowColumns = [
  { colKey: 'id', title: '流水ID', width: 100 },
  { colKey: 'agent', title: '用户', width: 180 },
  { colKey: 'type', title: '类型', width: 120 },
  { colKey: 'amount', title: '金额', width: 140 },
  { colKey: 'balance', title: '余额', width: 140 },
  { colKey: 'remark', title: '备注', ellipsis: true },
  { colKey: 'createdAt', title: '时间', width: 180 },
]

const rechargeColumns = [
  { colKey: 'id', title: '申请ID', width: 100 },
  { colKey: 'agent', title: '申请用户', width: 180 },
  { colKey: 'amount', title: '申请金额', width: 140 },
  { colKey: 'voucher', title: '支付凭证', width: 100 },
  { colKey: 'createdAt', title: '提交时间', width: 180 },
  { colKey: 'status', title: '状态', width: 100, align: 'center' },
  { colKey: 'op', title: '操作', width: 140, align: 'center', fixed: 'right' },
]

const recentCommissionColumns = [
  { colKey: 'orderNo', title: '预约号', width: 140 },
  { colKey: 'type', title: '类型', width: 100 },
  { colKey: 'amount', title: '金额', width: 100 },
  { colKey: 'createdAt', title: '时间', width: 140 },
]

const historyColumns = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'user', title: '提现人', width: 180 },
  { colKey: 'amount', title: '提现金额', width: 140 },
  { colKey: 'status', title: '状态', width: 100, align: 'center' },
  { colKey: 'completedAt', title: '完成时间', width: 180 },
  { colKey: 'op', title: '操作', width: 100, align: 'center', fixed: 'right' },
]

// 格式化金额
function formatMoney(value: number | string): string {
  const num = Number(value) || 0
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 格式化日期
function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 状态类型
function getStatusType(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'warning',
    APPROVED: 'primary',
    COMPLETED: 'success',
    REJECTED: 'danger',
  }
  return map[status] || 'default'
}

// 状态文本
function getStatusText(status: string): string {
  const map: Record<string, string> = {
    PENDING: '待审核',
    APPROVED: '待打款',
    COMPLETED: '已打款',
    REJECTED: '已拒绝',
  }
  return map[status] || status
}

// 流水类型主题
function getFlowTypeTheme(type: string): string {
  const map: Record<string, string> = {
    RECHARGE: 'primary',
    WITHDRAW: 'warning',
    ORDER: 'success',
    COMMISSION: 'primary',
    REFUND: 'danger',
    COMMISSION_REFUND: 'danger',
    WITHDRAWAL_REFUND: 'warning',
  }
  return map[type] || 'default'
}

// 流水类型文本
function getFlowTypeText(type: string): string {
  const map: Record<string, string> = {
    RECHARGE: '充值',
    WITHDRAW: '提现',
    ORDER: '订单',
    COMMISSION: '分润',
    REFUND: '退款',
    COMMISSION_REFUND: '分润回滚',
    WITHDRAWAL_REFUND: '提现退回',
  }
  return map[type] || type
}

// 遮掩账号
function maskAccount(account: string): string {
  if (!account) return ''
  if (account.length <= 8) return account
  return account.slice(0, 4) + '****' + account.slice(-4)
}

// 获取当前列表
function getCurrentList(): any[] {
  switch (activeTab.value) {
    case 'withdrawal': return withdrawalList.value
    case 'pendingPayment': return pendingPaymentList.value
    case 'history': return historyList.value
    case 'commission': return commissionList.value
    case 'flow': return flowList.value
    case 'recharge': return rechargeList.value
    case 'reconciliation': return [1] // 非空，使数据核对区域显示
    default: return []
  }
}

// 获取空状态标题
function getEmptyTitle(): string {
  const map: Record<string, string> = {
    withdrawal: '暂无提现申请',
    pendingPayment: '暂无待打款记录',
    history: '暂无提现历史',
    commission: '暂无利润记录',
    flow: '暂无资金流水',
    recharge: '暂无加款申请',
    reconciliation: '数据加载中',
  }
  return map[activeTab.value] || '暂无数据'
}

// 获取空状态描述
function getEmptyDesc(): string {
  const map: Record<string, string> = {
    withdrawal: '推销员或员工提交的提现申请会显示在这里',
    pendingPayment: '审核通过待打款的提现会显示在这里',
    history: '已完成或已拒绝的提现记录会显示在这里',
    commission: '推销员的利润记录会显示在这里',
    flow: '所有资金变动记录会显示在这里',
    recharge: '推销员提交的加款申请会显示在这里',
    reconciliation: '请稍候...',
  }
  return map[activeTab.value] || ''
}

// 切换Tab
function switchTab(tab: string) {
  activeTab.value = tab
  pagination.current = 1
  loadData()
}

// 加载统计数据
async function loadStatistics() {
  statsLoading.value = true
  try {
    const res = await getFinanceStatistics()
    if (res.code === 0) {
      statistics.value = {
        pendingRecharge: res.data.pendingRecharge || res.data.pendingRechargeCount || 0,
        pendingWithdrawal: res.data.pendingWithdrawal || res.data.pendingWithdrawalCount || 0,
        pendingStaffWithdrawal: res.data.pendingStaffWithdrawal || res.data.pendingStaffWithdrawalCount || 0,
        todayFlow: res.data.todayFlow || res.data.todayFlowAmount || 0,
        pendingPaymentWithdrawal: res.data.pendingPaymentWithdrawal || 0,
        pendingPaymentStaffWithdrawal: res.data.pendingPaymentStaffWithdrawal || 0,
        totalWithdrawalAmount: res.data.totalWithdrawalAmount || 0,
        totalStaffWithdrawalAmount: res.data.totalStaffWithdrawalAmount || 0,
        monthlyFlowAmount: res.data.monthlyFlowAmount || 0,
      }
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  } finally {
    statsLoading.value = false
  }
}

// 加载提现列表（合并代理商和员工）
async function loadWithdrawalList() {
  loading.value = true
  try {
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      status: searchForm.status || undefined,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined,
    }

    // 根据用户类型筛选决定请求哪些数据
    const fetchAgent = !searchForm.userType || searchForm.userType === 'agent'
    const fetchStaff = !searchForm.userType || searchForm.userType === 'staff'

    const results: any[] = []

    if (fetchAgent) {
      const agentRes = await getWithdrawals(params)
      if (agentRes.code === 0 && agentRes.data.list) {
        results.push(...agentRes.data.list.map((item: any) => ({
          ...item,
          isStaff: false,
          name: item.agent?.name || item.agentName,
          phone: item.agent?.phone || item.agentPhone,
        })))
      }
    }

    if (fetchStaff) {
      const staffRes = await getStaffWithdrawals(params)
      if (staffRes.code === 0 && staffRes.data.items) {
        results.push(...staffRes.data.items.map((item: any) => ({
          ...item,
          isStaff: true,
          name: item.staffName,
          phone: item.bankAccount || item.alipay || item.wechat,
        })))
      }
    }

    // 按创建时间排序
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    withdrawalList.value = results
    pagination.total = results.length
  } catch (error) {
    console.error('加载提现列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载待打款列表
async function loadPendingPaymentList() {
  loading.value = true
  try {
    const params = {
      page: 1,
      pageSize: 100,
      status: 'APPROVED',
    }

    const fetchAgent = !searchForm.userType || searchForm.userType === 'agent'
    const fetchStaff = !searchForm.userType || searchForm.userType === 'staff'

    const results: any[] = []

    if (fetchAgent) {
      const agentRes = await getWithdrawals(params)
      if (agentRes.code === 0 && agentRes.data.list) {
        results.push(...agentRes.data.list.map((item: any) => ({
          ...item,
          isStaff: false,
          name: item.agent?.name || item.agentName,
          phone: item.agent?.phone || item.agentPhone,
        })))
      }
    }

    if (fetchStaff) {
      const staffRes = await getStaffWithdrawals(params)
      if (staffRes.code === 0 && staffRes.data.items) {
        results.push(...staffRes.data.items.map((item: any) => ({
          ...item,
          isStaff: true,
          name: item.staffName,
          phone: item.bankAccount || item.alipay || item.wechat,
        })))
      }
    }

    // 按审核时间排序（审核越早越靠前）
    results.sort((a, b) => new Date(a.reviewedAt || a.createdAt).getTime() - new Date(b.reviewedAt || b.createdAt).getTime())

    pendingPaymentList.value = results
    pagination.total = results.length
  } catch (error) {
    console.error('加载待打款列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载分润记录
async function loadCommissionList() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      type: searchForm.commissionType || undefined,
      status: searchForm.commissionStatus || undefined,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined,
    }

    const res = await getRecords(params)
    if (res.code === 0) {
      commissionList.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('加载分润记录失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载资金流水
async function loadFlowList() {
  loading.value = true
  try {
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined,
    }
    const res = await getFundFlowList(params)
    if (res.code === 0) {
      flowList.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('加载流水列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载加款列表
async function loadRechargeList() {
  loading.value = true
  try {
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      status: searchForm.status || undefined,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined,
    }
    const res = await getRechargeList(params)
    if (res.code === 0) {
      rechargeList.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('加载加款列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载提现历史列表（已完成和已拒绝）
async function loadHistoryList() {
  loading.value = true
  try {
    const results: any[] = []

    // 获取代理商已完成/已拒绝的提现
    const agentRes = await getWithdrawals({
      page: 1,
      pageSize: 100,
      keyword: searchForm.keyword || undefined,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined,
    })
    if (agentRes.code === 0 && agentRes.data.list) {
      const filtered = agentRes.data.list.filter((item: any) =>
        item.status === 'COMPLETED' || item.status === 'REJECTED'
      )
      results.push(...filtered.map((item: any) => ({
        ...item,
        isStaff: false,
        name: item.agent?.name || item.agentName,
        phone: item.agent?.phone || item.agentPhone,
      })))
    }

    // 获取员工已完成/已拒绝的提现
    const staffRes = await getStaffWithdrawals({
      page: 1,
      pageSize: 100,
      keyword: searchForm.keyword || undefined,
    })
    if (staffRes.code === 0 && staffRes.data.items) {
      const filtered = staffRes.data.items.filter((item: any) =>
        item.status === 'COMPLETED' || item.status === 'REJECTED'
      )
      results.push(...filtered.map((item: any) => ({
        ...item,
        isStaff: true,
        name: item.staffName,
      })))
    }

    // 按完成时间排序（最新的在前）
    results.sort((a, b) => {
      const timeA = new Date(a.completedAt || a.reviewedAt || a.createdAt).getTime()
      const timeB = new Date(b.completedAt || b.reviewedAt || b.createdAt).getTime()
      return timeB - timeA
    })

    historyList.value = results
    pagination.total = results.length
  } catch (error) {
    console.error('加载提现历史失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载数据核对
async function loadReconciliationData() {
  reconciliationLoading.value = true
  try {
    // 获取代理商提现统计
    const agentRes = await getWithdrawals({ page: 1, pageSize: 1000 })
    if (agentRes.code === 0 && agentRes.data.list) {
      const list = agentRes.data.list
      const pending = list.filter((i: any) => i.status === 'PENDING')
      const approved = list.filter((i: any) => i.status === 'APPROVED')
      const completed = list.filter((i: any) => i.status === 'COMPLETED')
      const rejected = list.filter((i: any) => i.status === 'REJECTED')

      reconciliationData.agentWithdrawal = {
        pending: pending.length,
        pendingAmount: pending.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0),
        approved: approved.length,
        approvedAmount: approved.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0),
        completed: completed.length,
        completedAmount: completed.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0),
        rejected: rejected.length,
        rejectedAmount: rejected.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0),
        total: list.length,
        totalAmount: list.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0),
      }
    }

    // 获取员工提现统计
    const staffRes = await getStaffWithdrawals({ page: 1, pageSize: 1000 })
    if (staffRes.code === 0 && staffRes.data.items) {
      const list = staffRes.data.items
      const pending = list.filter((i: any) => i.status === 'PENDING')
      const approved = list.filter((i: any) => i.status === 'APPROVED')
      const completed = list.filter((i: any) => i.status === 'COMPLETED')
      const rejected = list.filter((i: any) => i.status === 'REJECTED')

      reconciliationData.staffWithdrawal = {
        pending: pending.length,
        pendingAmount: pending.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0),
        approved: approved.length,
        approvedAmount: approved.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0),
        completed: completed.length,
        completedAmount: completed.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0),
        rejected: rejected.length,
        rejectedAmount: rejected.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0),
        total: list.length,
        totalAmount: list.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0),
      }
    }

    // 获取分润统计
    const commissionRes = await getRecords({ page: 1, pageSize: 1000 })
    if (commissionRes.code === 0 && commissionRes.data.list) {
      const list = commissionRes.data.list
      const pending = list.filter((i: any) => i.status === 'PENDING')
      const settled = list.filter((i: any) => i.status === 'SETTLED')
      const cancelled = list.filter((i: any) => i.status === 'CANCELLED')

      reconciliationData.commission = {
        pending: pending.length,
        pendingAmount: pending.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0),
        settled: settled.length,
        settledAmount: settled.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0),
        cancelled: cancelled.length,
        cancelledAmount: cancelled.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0),
        total: list.length,
        totalAmount: list.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0),
      }
    }

    // 推销员余额核对（使用已有的统计数据）
    const statsRes = await getFinanceStatistics()
    if (statsRes.code === 0 && statsRes.data) {
      const data = statsRes.data
      // 计算差额：已结算利润 - 已完成提现 应该等于 当前总余额
      const totalSettled = reconciliationData.commission.settledAmount
      const totalWithdrawn = reconciliationData.agentWithdrawal.completedAmount
      const expectedBalance = totalSettled - totalWithdrawn

      reconciliationData.agentBalance = {
        totalAgents: data.totalAgents || 0,
        totalBalance: data.totalAgentBalance || 0,
        totalCommission: totalSettled,
        totalWithdrawn: totalWithdrawn,
        difference: Math.abs((data.totalAgentBalance || 0) - expectedBalance),
        isBalanced: Math.abs((data.totalAgentBalance || 0) - expectedBalance) < 0.01,
      }
    }

    // 检查所有数据是否平衡
    reconciliationData.isAllBalanced = reconciliationData.agentBalance.isBalanced
    reconciliationData.lastCheckTime = formatDate(new Date().toISOString())

  } catch (error) {
    console.error('加载核对数据失败:', error)
    MessagePlugin.error('加载核对数据失败')
  } finally {
    reconciliationLoading.value = false
  }
}

// Tab切换
function handleTabChange() {
  pagination.current = 1
  searchForm.status = ''
  loadData()
}

// 加载数据
function loadData() {
  switch (activeTab.value) {
    case 'withdrawal': loadWithdrawalList(); break
    case 'pendingPayment': loadPendingPaymentList(); break
    case 'history': loadHistoryList(); break
    case 'commission': loadCommissionList(); break
    case 'flow': loadFlowList(); break
    case 'recharge': loadRechargeList(); break
    case 'reconciliation': loadReconciliationData(); break
  }
}

// 搜索
function handleSearch() {
  pagination.current = 1
  loadData()
}

// 重置
function handleReset() {
  searchForm.keyword = ''
  searchForm.status = ''
  searchForm.userType = ''
  searchForm.commissionType = ''
  searchForm.commissionStatus = ''
  dateRange.value = []
  pagination.current = 1
  loadData()
}

// 分页变化
function handlePageChange(pageInfo: { current: number; pageSize: number }) {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  loadData()
}

// 预览图片
function handlePreviewImage(url: string) {
  previewImage.value = url
  imageViewerVisible.value = true
}

// 通过提现审核
async function handleApproveWithdrawal(row: any) {
  try {
    if (row.isStaff) {
      const res = await reviewStaffWithdrawal(row.id, { action: 'APPROVED' })
      if (res.code === 0) {
        MessagePlugin.success('审核通过')
        loadData()
        loadStatistics()
      } else {
        MessagePlugin.error(res.message || '操作失败')
      }
    } else {
      const res = await reviewWithdrawal(row.id, { action: 'approve' })
      if (res.code === 0) {
        MessagePlugin.success('审核通过')
        loadData()
        loadStatistics()
      } else {
        MessagePlugin.error(res.message || '操作失败')
      }
    }
  } catch (error) {
    MessagePlugin.error('操作失败')
  }
}

// 拒绝提现审核
function handleRejectWithdrawal(row: any) {
  currentRejectItem.value = row
  rejectType.value = row.isStaff ? 'staffWithdrawal' : 'withdrawal'
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

// 确认拒绝
async function handleConfirmReject() {
  if (!rejectReason.value.trim()) {
    MessagePlugin.warning('请输入拒绝原因')
    return
  }

  try {
    if (rejectType.value === 'staffWithdrawal') {
      const res = await reviewStaffWithdrawal(currentRejectItem.value.id, {
        action: 'REJECTED',
        reason: rejectReason.value,
      })
      if (res.code === 0) {
        MessagePlugin.success('已拒绝')
        rejectDialogVisible.value = false
        loadData()
        loadStatistics()
      } else {
        MessagePlugin.error(res.message || '操作失败')
      }
    } else if (rejectType.value === 'withdrawal') {
      const res = await reviewWithdrawal(currentRejectItem.value.id, {
        action: 'reject',
        rejectReason: rejectReason.value,
      })
      if (res.code === 0) {
        MessagePlugin.success('已拒绝')
        rejectDialogVisible.value = false
        loadData()
        loadStatistics()
      } else {
        MessagePlugin.error(res.message || '操作失败')
      }
    } else if (rejectType.value === 'recharge') {
      const res = await reviewRecharge(currentRejectItem.value.id, {
        action: 'reject',
        rejectReason: rejectReason.value,
      })
      if (res.code === 0) {
        MessagePlugin.success('已拒绝')
        rejectDialogVisible.value = false
        loadData()
        loadStatistics()
      } else {
        MessagePlugin.error(res.message || '操作失败')
      }
    }
  } catch (error) {
    MessagePlugin.error('操作失败')
  }
}

// 查看提现详情
async function handleViewWithdrawalDetail(row: any) {
  if (row.isStaff) {
    // 员工提现详情直接使用行数据
    withdrawalDetail.value = {
      ...row,
      withdrawal: row,
    }
    withdrawalDetailVisible.value = true
  } else {
    // 代理商提现详情从API获取
    try {
      const res = await getWithdrawalDetail(row.id)
      if (res.code === 0) {
        withdrawalDetail.value = res.data
        withdrawalDetailVisible.value = true
      } else {
        MessagePlugin.error(res.message || '获取详情失败')
      }
    } catch (error) {
      MessagePlugin.error('获取详情失败')
    }
  }
}

// 确认打款
function handleCompleteWithdrawal(row: any) {
  currentCompleteItem.value = row
  completeRemark.value = ''
  selectedPaymentMethod.value = ''
  completeDialogVisible.value = true
}

// 从详情页确认打款
function handleCompleteWithdrawalFromDetail() {
  const row = withdrawalDetail.value
  currentCompleteItem.value = {
    ...row,
    id: row.withdrawal?.id || row.id,
    amount: row.withdrawal?.amount || row.amount,
    name: row.agent?.name || row.staffName || row.name,
    phone: row.agent?.phone || row.phone,
    isStaff: row.isStaff || row.staffId,
  }
  completeRemark.value = ''
  selectedPaymentMethod.value = ''
  completeDialogVisible.value = true
}

// 确认打款完成
async function handleConfirmComplete() {
  if (!selectedPaymentMethod.value) {
    MessagePlugin.warning('请选择打款方式')
    return
  }

  try {
    if (currentCompleteItem.value.isStaff || currentCompleteItem.value.staffId) {
      const res = await completeStaffWithdrawal(currentCompleteItem.value.id, {
        remark: completeRemark.value || undefined,
        paymentMethod: selectedPaymentMethod.value,
      })
      if (res.code === 0) {
        MessagePlugin.success('已确认打款完成')
        completeDialogVisible.value = false
        withdrawalDetailVisible.value = false
        loadData()
        loadStatistics()
      } else {
        MessagePlugin.error(res.message || '操作失败')
      }
    } else {
      const res = await completeWithdrawal(currentCompleteItem.value.id, {
        remark: completeRemark.value || undefined,
        paymentMethod: selectedPaymentMethod.value,
      })
      if (res.code === 0) {
        MessagePlugin.success('已确认打款完成')
        completeDialogVisible.value = false
        withdrawalDetailVisible.value = false
        loadData()
        loadStatistics()
      } else {
        MessagePlugin.error(res.message || '操作失败')
      }
    }
  } catch (error) {
    MessagePlugin.error('操作失败')
  }
}

// 加款相关
async function handleApproveRecharge(row: any) {
  try {
    const res = await reviewRecharge(row.id, { action: 'approve' })
    if (res.code === 0) {
      MessagePlugin.success('审批通过')
      loadRechargeList()
      loadStatistics()
    } else {
      MessagePlugin.error(res.message || '操作失败')
    }
  } catch (error) {
    MessagePlugin.error('操作失败')
  }
}

function handleRejectRecharge(row: any) {
  currentRejectItem.value = row
  rejectType.value = 'recharge'
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

function handleViewDetail(_row: any) {
  MessagePlugin.info('查看详情功能开发中')
}

onMounted(() => {
  loadStatistics()
  loadData()
})
</script>

<style scoped>
.finance-page {
  padding: 0;
}

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-bg-page);
  border-bottom: 1px solid var(--color-border-light);
  flex-wrap: wrap;
}

/* 用户信息 */
.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: #fff;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
  flex-shrink: 0;
}

.user-avatar.staff {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
}

.user-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-detail .name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.user-detail .id {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* 凭证图片 */
.voucher-image {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  object-fit: cover;
}

/* 文本样式 */
.text-muted {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

.text-success {
  color: var(--color-success);
}

.time-text {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.amount-text {
  font-weight: 600;
  color: var(--color-primary);
}

.amount-positive {
  font-weight: 600;
  color: var(--color-success);
}

/* 流水金额 */
.flow-amount {
  font-weight: var(--font-weight-semibold);
}

.flow-amount.income {
  color: var(--color-success);
}

.flow-amount.expense {
  color: var(--color-danger);
}

/* 支付方式 */
.payment-method {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.method-detail {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

/* Tab样式 */
:deep(.t-tabs__nav) {
  padding: 0 var(--spacing-xl);
}

:deep(.t-tabs__nav-item) {
  padding: var(--spacing-lg) 0;
}

:deep(.t-badge) {
  margin-left: var(--spacing-xs);
}

/* 提现详情弹窗 */
.withdrawal-detail {
  padding: var(--spacing-sm) 0;
}

.detail-section {
  margin-bottom: var(--spacing-xl);
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
  padding-left: var(--spacing-sm);
  border-left: 3px solid var(--color-primary);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-page);
  border-radius: var(--radius-md);
}

.detail-item.full {
  grid-column: span 2;
}

.detail-item .label {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.detail-item .value {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.detail-item .value.danger {
  color: var(--color-danger);
}

.detail-actions {
  display: flex;
  justify-content: center;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
  margin-top: var(--spacing-lg);
}

/* 确认打款弹窗 */
.complete-dialog {
  padding: var(--spacing-sm) 0;
}

.complete-info {
  background: var(--color-bg-page);
  padding: var(--spacing-lg);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
}

.complete-info p {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.complete-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px dashed var(--color-border-light);
}

.complete-row:last-child {
  border-bottom: none;
}

.complete-row .label {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.complete-row .value {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

/* 打款方式选择 */
.payment-method-section {
  margin-bottom: var(--spacing-lg);
}

.payment-method-section .section-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.payment-method-section .required {
  color: var(--color-danger);
}

/* 数据核对内容区 */
.reconciliation-content {
  padding: var(--spacing-lg);
}

.reconciliation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.reconciliation-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

/* 核对数据卡片网格 */
.reconciliation-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

@media (max-width: 1200px) {
  .reconciliation-grid {
    grid-template-columns: 1fr;
  }
}

.reconciliation-card {
  background: #fff;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.reconciliation-card .card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: #f9fafb;
  border-bottom: 1px solid var(--color-border-light);
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text-primary);
}

.reconciliation-card .card-header .t-icon {
  font-size: 18px;
  color: var(--color-primary);
}

.reconciliation-card .card-body {
  padding: var(--spacing-md);
}

.reconciliation-card .data-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  align-items: center;
  border-bottom: 1px dashed #f0f0f0;
}

.reconciliation-card .data-row:last-child {
  border-bottom: none;
}

.reconciliation-card .data-row.total {
  background: #f9fafb;
  margin: var(--spacing-sm) calc(-1 * var(--spacing-md));
  margin-bottom: calc(-1 * var(--spacing-md));
  padding: var(--spacing-md);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  border-top: 1px solid var(--color-border-light);
  border-bottom: none;
}

.reconciliation-card .data-row.total.error {
  background: #fff5f5;
}

.reconciliation-card .data-row .label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.reconciliation-card .data-row .value {
  font-size: 13px;
  color: var(--color-text-tertiary);
  text-align: center;
  min-width: 60px;
}

.reconciliation-card .data-row .amount {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: right;
  min-width: 100px;
}

.reconciliation-card .data-row .amount.success {
  color: var(--color-success);
}

.reconciliation-card .data-row .amount.danger {
  color: var(--color-danger);
}

/* 核对结果摘要 */
.reconciliation-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background: #f9fafb;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
}

.summary-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 15px;
  font-weight: 600;
}

.summary-header .t-icon {
  font-size: 20px;
}

.summary-header .t-icon.success {
  color: var(--color-success);
}

.summary-header .t-icon.danger {
  color: var(--color-danger);
}

.summary-time {
  font-size: 13px;
  color: var(--color-text-tertiary);
}
</style>
