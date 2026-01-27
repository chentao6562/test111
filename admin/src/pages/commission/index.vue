<template>
  <div class="commission-page">
    <!-- 标签页切换 -->
    <t-tabs v-model="activeTab">
      <t-tab-panel value="supply" label="商品供价">
        <!-- 商品供价管理 -->
        <div class="tab-content">
          <!-- 提示信息 -->
          <t-alert theme="info" :close-btn="false" class="info-alert">
            <template #message>
              <div class="alert-content">
                <strong>供价管理说明</strong>
                <p>在此管理总代给一级推销员的供货价格。成本价为总代进货成本，供货价为一级推销员的拿货价，两者差价即为总代利润。</p>
              </div>
            </template>
          </t-alert>

          <!-- 筛选区域 -->
          <t-card class="filter-card" :bordered="false">
            <t-form layout="inline">
              <t-form-item label="商品搜索">
                <t-input
                  v-model="supplyFilter.keyword"
                  placeholder="商品名称/ID"
                  clearable
                  style="width: 200px"
                  @enter="fetchSupplyProducts"
                />
              </t-form-item>
              <t-form-item label="分类">
                <t-select
                  v-model="supplyFilter.categoryId"
                  placeholder="全部分类"
                  clearable
                  style="width: 140px"
                  @change="fetchSupplyProducts"
                >
                  <t-option
                    v-for="cat in categoryList"
                    :key="cat.id"
                    :value="cat.id"
                    :label="cat.name"
                  />
                </t-select>
              </t-form-item>
              <t-form-item>
                <t-button theme="primary" @click="fetchSupplyProducts">
                  <template #icon><t-icon name="search" /></template>
                  查询
                </t-button>
              </t-form-item>
            </t-form>
          </t-card>

          <!-- 商品供价列表 -->
          <TableCard title="商品供价列表">
            <t-table
              :data="supplyProductList"
              :columns="supplyColumns"
              :loading="supplyLoading"
              :pagination="supplyPagination"
              row-key="id"
              hover
              stripe
              @page-change="handleSupplyPageChange"
            >
              <template #empty>
                <EmptyState type="data" title="暂无商品数据" />
              </template>

              <!-- 商品信息 -->
              <template #product="{ row }">
                <div class="product-info">
                  <img v-if="row.images" :src="getFirstImage(row.images)" class="product-thumb" />
                  <div class="product-detail">
                    <div class="product-name">{{ row.name }}</div>
                    <div class="product-id">ID: {{ row.id }}</div>
                  </div>
                </div>
              </template>

              <!-- 成本价 -->
              <template #costPrice="{ row }">
                <span class="cost-price">¥ {{ formatAmount(row.costPrice) }}</span>
              </template>

              <!-- 供货价 -->
              <template #supplyPrice="{ row }">
                <span class="supply-price">¥ {{ formatAmount(row.supplyPrice) }}</span>
              </template>

              <!-- 供货利润 -->
              <template #supplyProfit="{ row }">
                <span class="profit-text" :class="{ 'profit-positive': getSupplyProfit(row) > 0 }">
                  ¥ {{ formatAmount(getSupplyProfit(row)) }}
                </span>
              </template>

              <!-- 建议零售价 -->
              <template #suggestedPrice="{ row }">
                <span v-if="row.suggestedPrice">¥ {{ formatAmount(row.suggestedPrice) }}</span>
                <span v-else class="no-price">未设置</span>
              </template>

              <!-- 最低零售价 -->
              <template #minRetailPrice="{ row }">
                <span v-if="row.minRetailPrice">¥ {{ formatAmount(row.minRetailPrice) }}</span>
                <span v-else class="no-price">未设置</span>
              </template>

              <!-- 操作 -->
              <template #operation="{ row }">
                <t-link theme="primary" @click="handleEditSupplyPrice(row)">编辑供价</t-link>
              </template>
            </t-table>
          </TableCard>

          <!-- 价格体系说明 -->
          <TableCard title="价格体系说明">
            <div class="rule-desc">
              <div class="rule-item">
                <div class="rule-icon default">
                  <t-icon name="money-circle" />
                </div>
                <div class="rule-content">
                  <h4>成本价 (costPrice)</h4>
                  <p>总代进货成本，用于计算总代利润</p>
                </div>
              </div>
              <div class="rule-item">
                <div class="rule-icon primary">
                  <t-icon name="shop" />
                </div>
                <div class="rule-content">
                  <h4>供货价 (supplyPrice)</h4>
                  <p>一级推销员的拿货价，供货价 - 成本价 = 总代利润</p>
                </div>
              </div>
              <div class="rule-item">
                <div class="rule-icon warning">
                  <t-icon name="tips" />
                </div>
                <div class="rule-content">
                  <h4>建议零售价 (suggestedPrice)</h4>
                  <p>推荐的销售价格，供推销员参考</p>
                </div>
              </div>
              <div class="rule-item">
                <div class="rule-icon success">
                  <t-icon name="secured" />
                </div>
                <div class="rule-content">
                  <h4>最低零售价 (minRetailPrice)</h4>
                  <p>强制约束的最低售价，推销员不能低于此价格销售</p>
                </div>
              </div>
            </div>
          </TableCard>
        </div>
      </t-tab-panel>

      <t-tab-panel value="records" label="分润记录">
        <!-- 分润记录内容 -->
        <div class="tab-content">
          <!-- 筛选区域 -->
          <t-card class="filter-card" :bordered="false">
            <t-form layout="inline" :data="recordsFilter" @submit="handleSearchRecords">
              <t-form-item label="关键词">
                <t-input
                  v-model="recordsFilter.keyword"
                  placeholder="代理商名称/手机号"
                  clearable
                  style="width: 180px"
                />
              </t-form-item>
              <t-form-item label="分润类型">
                <t-select
                  v-model="recordsFilter.type"
                  placeholder="全部类型"
                  clearable
                  style="width: 140px"
                >
                  <t-option value="DIRECT" label="直推分润" />
                  <t-option value="INDIRECT" label="间推分润" />
                </t-select>
              </t-form-item>
              <t-form-item label="状态">
                <t-select
                  v-model="recordsFilter.status"
                  placeholder="全部状态"
                  clearable
                  style="width: 140px"
                >
                  <t-option value="PENDING" label="待结算" />
                  <t-option value="SETTLED" label="已结算" />
                </t-select>
              </t-form-item>
              <t-form-item label="日期范围">
                <t-date-range-picker
                  v-model="recordsFilter.dateRange"
                  :placeholder="['开始日期', '结束日期']"
                  style="width: 260px"
                />
              </t-form-item>
              <t-form-item>
                <t-space>
                  <t-button theme="primary" type="submit">
                    <template #icon><t-icon name="search" /></template>
                    查询
                  </t-button>
                  <t-button theme="default" @click="handleResetRecords">
                    <template #icon><t-icon name="refresh" /></template>
                    重置
                  </t-button>
                </t-space>
              </t-form-item>
            </t-form>
          </t-card>

          <!-- 统计卡片 -->
          <div class="stat-cards">
            <StatCard
              label="总分润金额"
              :value="statistics.totalAmount || 0"
              icon="chart-pie"
              theme="primary"
              prefix="¥"
              :loading="recordsLoading"
            />
            <StatCard
              label="待结算"
              :value="statistics.pendingAmount || 0"
              icon="time"
              theme="warning"
              prefix="¥"
              :loading="recordsLoading"
            />
            <StatCard
              label="已结算"
              :value="statistics.settledAmount || 0"
              icon="check-circle"
              theme="success"
              prefix="¥"
              :loading="recordsLoading"
            />
            <StatCard
              label="总记录数"
              :value="statistics.totalCount || 0"
              icon="file-paste"
              theme="info"
              suffix="条"
              :loading="recordsLoading"
            />
          </div>

          <!-- 分润记录表格 -->
          <TableCard title="分润记录列表">
            <template #actions>
              <t-button variant="outline" @click="handleSettleBatch">
                <template #icon><t-icon name="wallet" /></template>
                批量结算
              </t-button>
            </template>

            <t-table
              :data="recordList"
              :columns="recordColumns"
              :loading="recordsLoading"
              :pagination="recordsPagination"
              row-key="id"
              hover
              stripe
              @page-change="handleRecordsPageChange"
            >
              <template #empty>
                <EmptyState
                  :type="recordsFilter.keyword || recordsFilter.type || recordsFilter.status ? 'search' : 'data'"
                  :title="recordsFilter.keyword || recordsFilter.type || recordsFilter.status ? '未找到匹配结果' : '暂无分润记录'"
                  :description="recordsFilter.keyword || recordsFilter.type || recordsFilter.status ? '请尝试调整筛选条件' : ''"
                />
              </template>
              <!-- 代理商信息 -->
              <template #agent="{ row }">
                <div class="agent-info">
                  <div class="agent-name">{{ row.agentName || row.agent?.name || '-' }}</div>
                  <div class="agent-phone">{{ row.agentPhone || row.agent?.phone || '-' }}</div>
                </div>
              </template>

              <!-- 分润类型 -->
              <template #type="{ row }">
                <t-tag :theme="row.type === 'DIRECT' ? 'primary' : 'warning'" variant="light" size="small">
                  {{ row.type === 'DIRECT' ? '直推分润' : '间推分润' }}
                </t-tag>
              </template>

              <!-- 分润金额 -->
              <template #amount="{ row }">
                <span class="amount-text">+¥ {{ formatAmount(row.amount) }}</span>
              </template>

              <!-- 分润比例 -->
              <template #rate="{ row }">
                {{ row.rate }}%
              </template>

              <!-- 订单金额 -->
              <template #orderAmount="{ row }">
                ¥ {{ formatAmount(row.orderAmount || row.order?.totalAmount || 0) }}
              </template>

              <!-- 状态 -->
              <template #status="{ row }">
                <t-tag :theme="row.status === 'SETTLED' ? 'success' : 'warning'" size="small">
                  {{ row.status === 'SETTLED' ? '已结算' : '待结算' }}
                </t-tag>
              </template>

              <!-- 关联订单 -->
              <template #orderNo="{ row }">
                <t-link
                  v-if="row.orderId"
                  theme="primary"
                  @click="handleViewOrder(row.orderId)"
                >
                  {{ row.orderNo || '-' }}
                </t-link>
                <span v-else class="no-order">-</span>
              </template>

              <!-- 创建时间 -->
              <template #createdAt="{ row }">
                <span class="time-text">{{ formatTime(row.createdAt) }}</span>
              </template>

              <!-- 操作 -->
              <template #operation="{ row }">
                <t-link theme="primary" @click="handleViewRecordDetail(row)">查看详情</t-link>
              </template>
            </t-table>
          </TableCard>
        </div>
      </t-tab-panel>

      <t-tab-panel value="withdrawals" label="提现审核">
        <!-- 提现审核内容 -->
        <div class="tab-content">
          <!-- 筛选区域 -->
          <t-card class="filter-card" :bordered="false">
            <t-form layout="inline" :data="withdrawalsFilter" @submit="handleSearchWithdrawals">
              <t-form-item label="关键词">
                <t-input
                  v-model="withdrawalsFilter.keyword"
                  placeholder="代理商名称/手机号"
                  clearable
                  style="width: 180px"
                />
              </t-form-item>
              <t-form-item label="状态">
                <t-select
                  v-model="withdrawalsFilter.status"
                  placeholder="全部状态"
                  clearable
                  style="width: 140px"
                >
                  <t-option value="PENDING" label="待审核" />
                  <t-option value="APPROVED" label="已通过" />
                  <t-option value="REJECTED" label="已拒绝" />
                  <t-option value="COMPLETED" label="已完成" />
                </t-select>
              </t-form-item>
              <t-form-item>
                <t-space>
                  <t-button theme="primary" type="submit">
                    <template #icon><t-icon name="search" /></template>
                    查询
                  </t-button>
                  <t-button theme="default" @click="handleResetWithdrawals">
                    <template #icon><t-icon name="refresh" /></template>
                    重置
                  </t-button>
                </t-space>
              </t-form-item>
            </t-form>
          </t-card>

          <!-- 提现列表 -->
          <TableCard title="提现申请列表">
            <t-table
              :data="withdrawalList"
              :columns="withdrawalColumns"
              :loading="withdrawalsLoading"
              :pagination="withdrawalsPagination"
              row-key="id"
              hover
              stripe
              @page-change="handleWithdrawalsPageChange"
            >
              <template #empty>
                <EmptyState
                  :type="withdrawalsFilter.keyword || withdrawalsFilter.status ? 'search' : 'data'"
                  :title="withdrawalsFilter.keyword || withdrawalsFilter.status ? '未找到匹配结果' : '暂无提现申请'"
                  :description="withdrawalsFilter.keyword || withdrawalsFilter.status ? '请尝试调整筛选条件' : ''"
                />
              </template>
              <!-- 代理商信息 -->
              <template #agent="{ row }">
                <div class="agent-info">
                  <div class="agent-name">{{ row.agentName || row.agent?.name || '-' }}</div>
                  <div class="agent-phone">{{ row.agentPhone || row.agent?.phone || '-' }}</div>
                </div>
              </template>

              <!-- 提现金额 -->
              <template #amount="{ row }">
                <span class="amount-text">¥ {{ formatAmount(row.amount) }}</span>
              </template>

              <!-- 状态 -->
              <template #status="{ row }">
                <t-tag :theme="getWithdrawalStatusTheme(row.status)" size="small">
                  {{ getWithdrawalStatusLabel(row.status) }}
                </t-tag>
              </template>

              <!-- 申请时间 -->
              <template #createdAt="{ row }">
                <span class="time-text">{{ formatTime(row.createdAt) }}</span>
              </template>

              <!-- 当前余额 -->
              <template #currentBalance="{ row }">
                <span class="balance-text">¥ {{ formatAmount(row.currentBalance || row.agent?.balance || 0) }}</span>
              </template>

              <!-- 操作 -->
              <template #operation="{ row }">
                <t-space size="small">
                  <t-link theme="primary" @click="handleViewWithdrawalDetail(row)">详情</t-link>
                  <template v-if="row.status === 'PENDING'">
                    <t-divider layout="vertical" />
                    <t-link theme="success" @click="handleApproveWithdrawal(row)">通过</t-link>
                    <t-divider layout="vertical" />
                    <t-link theme="danger" @click="handleRejectWithdrawal(row)">拒绝</t-link>
                  </template>
                </t-space>
              </template>
            </t-table>
          </TableCard>
        </div>
      </t-tab-panel>

      <t-tab-panel value="agentPricing" label="推销员定价">
        <!-- 推销员定价管理 -->
        <div class="tab-content">
          <!-- 提示信息 -->
          <t-alert theme="info" :close-btn="false" class="info-alert">
            <template #message>
              <div class="alert-content">
                <strong>推销员定价说明</strong>
                <p>查看各推销员为商品设置的零售价和给下级的价格。一级推销员可设置零售价和给二级的价格，二级推销员只能设置零售价。</p>
              </div>
            </template>
          </t-alert>

          <!-- 筛选区域 -->
          <t-card class="filter-card" :bordered="false">
            <t-form layout="inline">
              <t-form-item label="推销员">
                <t-select
                  v-model="agentPriceFilter.agentId"
                  placeholder="全部推销员"
                  clearable
                  filterable
                  style="width: 200px"
                  @change="fetchAgentPrices"
                >
                  <t-option
                    v-for="agent in agentFilterList"
                    :key="agent.id"
                    :value="agent.id"
                    :label="`${agent.name} (${agent.phone})`"
                  />
                </t-select>
              </t-form-item>
              <t-form-item label="商品">
                <t-select
                  v-model="agentPriceFilter.productId"
                  placeholder="全部商品"
                  clearable
                  filterable
                  style="width: 200px"
                  @change="fetchAgentPrices"
                >
                  <t-option
                    v-for="product in productFilterList"
                    :key="product.id"
                    :value="product.id"
                    :label="product.name"
                  />
                </t-select>
              </t-form-item>
              <t-form-item>
                <t-button theme="primary" @click="fetchAgentPrices">
                  <template #icon><t-icon name="search" /></template>
                  查询
                </t-button>
                <t-button theme="default" @click="handleResetAgentPriceFilter" style="margin-left: 8px">
                  重置
                </t-button>
              </t-form-item>
            </t-form>
          </t-card>

          <!-- 推销员定价列表 -->
          <TableCard title="推销员定价列表">
            <t-table
              :data="agentPriceList"
              :columns="agentPriceColumns"
              :loading="agentPriceLoading"
              :pagination="agentPricePagination"
              row-key="id"
              hover
              stripe
              @page-change="handleAgentPricePageChange"
            >
              <template #empty>
                <EmptyState type="data" title="暂无定价数据" description="推销员尚未设置任何商品定价" />
              </template>

              <!-- 推销员信息 -->
              <template #agent="{ row }">
                <div class="agent-cell">
                  <div class="agent-name">{{ row.agentName || '-' }}</div>
                  <div class="agent-phone">{{ row.agentPhone || '-' }}</div>
                  <t-tag
                    :theme="row.agentType === 'LEVEL1' ? 'warning' : 'primary'"
                    variant="light"
                    size="small"
                  >
                    {{ row.agentType === 'LEVEL1' ? '一级' : '二级' }}
                  </t-tag>
                </div>
              </template>

              <!-- 商品信息 -->
              <template #product="{ row }">
                <div class="product-info">
                  <img v-if="row.productImage" :src="getFirstImage(row.productImage)" class="product-thumb" />
                  <div class="product-detail">
                    <div class="product-name">{{ row.productName || '-' }}</div>
                    <div class="product-id">ID: {{ row.productId }}</div>
                  </div>
                </div>
              </template>

              <!-- 供货价（参考） -->
              <template #supplyPrice="{ row }">
                <span class="ref-price">¥ {{ formatAmount(row.supplyPrice) }}</span>
              </template>

              <!-- 推销员零售价 -->
              <template #retailPrice="{ row }">
                <span v-if="row.retailPrice" class="retail-price">¥ {{ formatAmount(row.retailPrice) }}</span>
                <span v-else class="no-price">未设置</span>
              </template>

              <!-- 给下级的价 -->
              <template #subPrice="{ row }">
                <template v-if="row.agentType === 'LEVEL1'">
                  <span v-if="row.subPrice" class="sub-price">¥ {{ formatAmount(row.subPrice) }}</span>
                  <span v-else class="no-price">未设置</span>
                </template>
                <span v-else class="not-applicable">-</span>
              </template>

              <!-- 利润空间 -->
              <template #profitMargin="{ row }">
                <span v-if="row.retailPrice && row.supplyPrice" class="profit-text" :class="{ 'profit-positive': getAgentProfitMargin(row) > 0 }">
                  ¥ {{ formatAmount(getAgentProfitMargin(row)) }}
                </span>
                <span v-else class="no-price">-</span>
              </template>

              <!-- 更新时间 -->
              <template #updatedAt="{ row }">
                <span class="time-text">{{ formatTime(row.updatedAt) }}</span>
              </template>
            </t-table>
          </TableCard>
        </div>
      </t-tab-panel>
    </t-tabs>

    <!-- 编辑供价弹窗 -->
    <t-dialog
      v-model:visible="supplyDialogVisible"
      header="编辑商品供价"
      width="600px"
      :confirm-btn="{ loading: submitting }"
      @confirm="handleSaveSupplyPrice"
    >
      <div v-if="currentSupplyProduct" class="supply-form">
        <div class="supply-product-header">
          <img v-if="currentSupplyProduct.images" :src="getFirstImage(currentSupplyProduct.images)" class="supply-product-thumb" />
          <div class="supply-product-info">
            <div class="supply-product-name">{{ currentSupplyProduct.name }}</div>
            <div class="supply-product-id">商品ID: {{ currentSupplyProduct.id }}</div>
          </div>
        </div>
        <t-form ref="supplyFormRef" :data="supplyForm" :rules="supplyFormRules" label-width="100px" class="supply-price-form">
          <div class="price-grid">
            <div class="price-item required">
              <div class="price-label">成本价</div>
              <t-input-number
                v-model="supplyForm.costPrice"
                :min="0"
                :decimal-places="2"
                theme="normal"
                placeholder="0.00"
                style="width: 100%"
              >
                <template #suffix>元</template>
              </t-input-number>
              <div class="price-tip">总代进货成本</div>
            </div>
            <div class="price-item required">
              <div class="price-label">供货价</div>
              <t-input-number
                v-model="supplyForm.supplyPrice"
                :min="0"
                :decimal-places="2"
                theme="normal"
                placeholder="0.00"
                style="width: 100%"
              >
                <template #suffix>元</template>
              </t-input-number>
              <div class="price-tip">一级推销员拿货价</div>
            </div>
            <div class="price-item">
              <div class="price-label">建议零售价</div>
              <t-input-number
                v-model="supplyForm.suggestedPrice"
                :min="0"
                :decimal-places="2"
                theme="normal"
                placeholder="0.00"
                style="width: 100%"
              >
                <template #suffix>元</template>
              </t-input-number>
              <div class="price-tip">推荐售价（选填）</div>
            </div>
            <div class="price-item">
              <div class="price-label">最低零售价</div>
              <t-input-number
                v-model="supplyForm.minRetailPrice"
                :min="0"
                :decimal-places="2"
                theme="normal"
                placeholder="0.00"
                style="width: 100%"
              >
                <template #suffix>元</template>
              </t-input-number>
              <div class="price-tip">强制最低售价（选填）</div>
            </div>
          </div>
          <!-- 利润预览 -->
          <div class="profit-preview-box" v-if="supplyForm.costPrice && supplyForm.supplyPrice">
            <div class="preview-header">利润预览</div>
            <div class="preview-content">
              <div class="preview-row">
                <span class="preview-label">供货利润（总代）:</span>
                <span class="preview-value" :class="{ 'profit-positive': supplyForm.supplyPrice - supplyForm.costPrice > 0 }">
                  ¥ {{ (supplyForm.supplyPrice - supplyForm.costPrice).toFixed(2) }}
                </span>
              </div>
              <div class="preview-row" v-if="supplyForm.suggestedPrice">
                <span class="preview-label">推销员最大利润:</span>
                <span class="preview-value profit-positive">
                  ¥ {{ (supplyForm.suggestedPrice - supplyForm.supplyPrice).toFixed(2) }}
                </span>
              </div>
            </div>
          </div>
        </t-form>
      </div>
    </t-dialog>

    <!-- 拒绝提现弹窗 -->
    <t-dialog
      v-model:visible="rejectDialogVisible"
      header="拒绝提现"
      width="500px"
      :confirm-btn="{ loading: submitting, theme: 'danger' }"
      @confirm="handleConfirmReject"
    >
      <t-form :data="rejectForm" label-width="80px">
        <t-form-item label="拒绝原因">
          <t-textarea
            v-model="rejectForm.reason"
            placeholder="请输入拒绝原因（选填）"
            :maxlength="200"
          />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 提现详情弹窗 -->
    <t-dialog
      v-model:visible="withdrawalDetailVisible"
      header="提现详情"
      width="700px"
      :footer="false"
    >
      <t-loading :loading="withdrawalDetailLoading">
        <div v-if="withdrawalDetail" class="withdrawal-detail">
          <!-- 提现信息 -->
          <div class="detail-section">
            <div class="section-title">提现信息</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">提现金额</span>
                <span class="info-value amount">¥ {{ formatAmount(withdrawalDetail.withdrawal?.amount) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">申请时间</span>
                <span class="info-value">{{ formatTime(withdrawalDetail.withdrawal?.createdAt) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">状态</span>
                <t-tag :theme="getWithdrawalStatusTheme(withdrawalDetail.withdrawal?.status)" size="small">
                  {{ getWithdrawalStatusLabel(withdrawalDetail.withdrawal?.status) }}
                </t-tag>
              </div>
              <div class="info-item" v-if="withdrawalDetail.withdrawal?.reason">
                <span class="info-label">拒绝原因</span>
                <span class="info-value">{{ withdrawalDetail.withdrawal?.reason }}</span>
              </div>
            </div>
          </div>

          <!-- 代理商信息 -->
          <div class="detail-section">
            <div class="section-title">代理商信息</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">代理商名称</span>
                <span class="info-value">{{ withdrawalDetail.agent?.name || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">手机号</span>
                <span class="info-value">{{ withdrawalDetail.agent?.phone || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">代理商类型</span>
                <t-tag theme="primary" variant="light" size="small">
                  {{ getAgentTypeLabel(withdrawalDetail.agent?.type) }}
                </t-tag>
              </div>
            </div>
          </div>

          <!-- 分润统计 -->
          <div class="detail-section">
            <div class="section-title">分润统计</div>
            <div class="stats-cards">
              <div class="stats-card">
                <div class="stats-label">累计分润</div>
                <div class="stats-value primary">¥ {{ formatAmount(withdrawalDetail.agent?.totalCommission) }}</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">当前余额</div>
                <div class="stats-value success">¥ {{ formatAmount(withdrawalDetail.agent?.currentBalance || withdrawalDetail.agent?.balance) }}</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">已提现</div>
                <div class="stats-value warning">¥ {{ formatAmount(withdrawalDetail.agent?.totalWithdrawn) }}</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">本月分润</div>
                <div class="stats-value info">¥ {{ formatAmount(withdrawalDetail.agent?.monthlyCommission) }}</div>
              </div>
            </div>
          </div>

          <!-- 最近分润记录 -->
          <div class="detail-section" v-if="withdrawalDetail.recentCommissions?.length">
            <div class="section-title">最近分润记录</div>
            <t-table
              :data="withdrawalDetail.recentCommissions"
              :columns="recentCommissionColumns"
              size="small"
              hover
              stripe
            >
              <template #type="{ row }">
                <t-tag :theme="row.type === 'DIRECT' ? 'primary' : 'warning'" variant="light" size="small">
                  {{ row.type === 'DIRECT' ? '直推' : '间推' }}
                </t-tag>
              </template>
              <template #amount="{ row }">
                <span class="amount-text">+¥ {{ formatAmount(row.amount) }}</span>
              </template>
              <template #orderNo="{ row }">
                <t-link v-if="row.orderId" theme="primary" @click="handleViewOrder(row.orderId)">
                  {{ row.orderNo || '-' }}
                </t-link>
                <span v-else>-</span>
              </template>
              <template #createdAt="{ row }">
                {{ formatTime(row.createdAt) }}
              </template>
            </t-table>
          </div>
        </div>
      </t-loading>
    </t-dialog>

    <!-- 【2026-01-20 新增】分润记录详情弹窗 -->
    <t-dialog
      v-model:visible="recordDetailVisible"
      header="分润详情"
      width="800px"
      :footer="false"
    >
      <t-loading :loading="recordDetailLoading">
        <div v-if="recordDetail" class="record-detail">
          <!-- 分润基本信息 -->
          <div class="detail-section">
            <div class="section-title">分润信息</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">分润金额</span>
                <span class="info-value amount">+¥ {{ formatAmount(recordDetail.amount) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">分润比例</span>
                <span class="info-value">{{ recordDetail.rate }}%</span>
              </div>
              <div class="info-item">
                <span class="info-label">状态</span>
                <t-tag theme="success" size="small">已结算</t-tag>
              </div>
              <div class="info-item">
                <span class="info-label">结算时间</span>
                <span class="info-value">{{ formatTime(recordDetail.createdAt) }}</span>
              </div>
            </div>
          </div>

          <!-- 获得分润的推销员 -->
          <div class="detail-section">
            <div class="section-title">获得分润推销员</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">姓名</span>
                <span class="info-value">{{ recordDetail.agent?.name || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">手机号</span>
                <span class="info-value">{{ recordDetail.agent?.phone || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">类型</span>
                <t-tag theme="primary" variant="light" size="small">
                  {{ getAgentTypeLabel(recordDetail.agent?.type) }}
                </t-tag>
              </div>
            </div>
          </div>

          <!-- 关联预约信息 -->
          <div class="detail-section" v-if="recordDetail.reservation">
            <div class="section-title">关联预约</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">预约号</span>
                <span class="info-value">{{ recordDetail.reservation.reservationNo }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">订单金额</span>
                <span class="info-value">¥ {{ formatAmount(recordDetail.reservation.totalAmount) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">客户</span>
                <span class="info-value">{{ recordDetail.reservation.customerName }} ({{ recordDetail.reservation.customerPhone }})</span>
              </div>
              <div class="info-item">
                <span class="info-label">完成时间</span>
                <span class="info-value">{{ formatTime(recordDetail.reservation.completedAt) }}</span>
              </div>
            </div>
          </div>

          <!-- 利润分配明细 -->
          <div class="detail-section" v-if="recordDetail.reservation?.profitDistribution">
            <div class="section-title">利润分配明细</div>
            <div class="profit-distribution">
              <div class="profit-item">
                <div class="profit-role">总代理</div>
                <div class="profit-amount">¥ {{ formatAmount(recordDetail.reservation.profitDistribution.masterProfit) }}</div>
              </div>
              <div class="profit-item">
                <div class="profit-role">一级推销员</div>
                <div class="profit-amount">¥ {{ formatAmount(recordDetail.reservation.profitDistribution.level1Profit) }}</div>
              </div>
              <div class="profit-item">
                <div class="profit-role">二级推销员</div>
                <div class="profit-amount">¥ {{ formatAmount(recordDetail.reservation.profitDistribution.level2Profit) }}</div>
              </div>
              <div class="profit-item total">
                <div class="profit-role">利润合计</div>
                <div class="profit-amount">¥ {{ formatAmount(recordDetail.reservation.profitDistribution.totalProfit) }}</div>
              </div>
            </div>
          </div>

          <!-- 推销员层级信息 -->
          <div class="detail-section" v-if="recordDetail.reservation">
            <div class="section-title">销售层级</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">订单来源</span>
                <t-tag theme="primary" variant="light" size="small">
                  {{ getSalespersonLevelLabel(recordDetail.reservation.salespersonLevel) }}
                </t-tag>
              </div>
              <div class="info-item" v-if="recordDetail.reservation.salesperson">
                <span class="info-label">销售推销员</span>
                <span class="info-value">{{ recordDetail.reservation.salesperson.name }} ({{ recordDetail.reservation.salesperson.phone }})</span>
              </div>
              <div class="info-item" v-if="recordDetail.reservation.parentSalesperson">
                <span class="info-label">上级推销员</span>
                <span class="info-value">{{ recordDetail.reservation.parentSalesperson.name }} ({{ recordDetail.reservation.parentSalesperson.phone }})</span>
              </div>
            </div>
          </div>

          <!-- 商品明细 -->
          <div class="detail-section" v-if="recordDetail.reservation?.items?.length">
            <div class="section-title">商品明细</div>
            <t-table
              :data="recordDetail.reservation.items"
              :columns="recordItemColumns"
              size="small"
              hover
              stripe
            >
              <template #productName="{ row }">
                <div class="product-info-small">
                  <img v-if="row.productImage" :src="row.productImage" class="product-thumb-small" />
                  <span>{{ row.productName }}</span>
                </div>
              </template>
              <template #price="{ row }">
                ¥ {{ formatAmount(row.price) }}
              </template>
              <template #subtotal="{ row }">
                ¥ {{ formatAmount(row.subtotal) }}
              </template>
              <template #priceSnapshot="{ row }">
                <div class="price-snapshot" v-if="row.priceSnapshot">
                  <div>成本: ¥{{ formatAmount(row.priceSnapshot.costPrice) }}</div>
                  <div>供货: ¥{{ formatAmount(row.priceSnapshot.supplyPrice) }}</div>
                  <div v-if="row.priceSnapshot.level1Price !== null">给二级: ¥{{ formatAmount(row.priceSnapshot.level1Price) }}</div>
                </div>
              </template>
            </t-table>
          </div>
        </div>
      </t-loading>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import type { FormInstanceFunctions, PageInfo } from 'tdesign-vue-next'
import { useRouter, useRoute } from 'vue-router'
import { StatCard, TableCard, EmptyState } from '@/components'
import {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  getStatistics,
  getRecords,
  getRecordDetail,
  settleCommissions,
  getWithdrawals,
  getWithdrawalDetail,
  reviewWithdrawal,
} from '@/api/commission'
import { getProductList, updateProduct, type Product } from '@/api/product'
import { getCategoryList, type Category } from '@/api/category'
import { getAgentList, getAgentPrices, type Agent, type AgentPrice } from '@/api/agent'
import { getFirstImage as getFirstImageUtil } from '@/utils/image'

const router = useRouter()
const route = useRoute()

// 当前标签
const activeTab = ref('supply')

// 状态
const rulesLoading = ref(false)
const recordsLoading = ref(false)
const withdrawalsLoading = ref(false)
const supplyLoading = ref(false)
const submitting = ref(false)

// 商品供价管理
const supplyProductList = ref<Product[]>([])
const categoryList = ref<Category[]>([])
const supplyFilter = reactive({
  keyword: '',
  categoryId: null as number | null,
})
const supplyPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showJumper: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50],
})
const supplyDialogVisible = ref(false)
const currentSupplyProduct = ref<Product | null>(null)
const supplyFormRef = ref<FormInstanceFunctions>()
const supplyForm = reactive({
  costPrice: 0,
  supplyPrice: 0,
  suggestedPrice: 0,
  minRetailPrice: 0,
})
const supplyFormRules = {
  costPrice: [{ required: true, message: '请输入成本价' }],
  supplyPrice: [{ required: true, message: '请输入供货价' }],
}

// 分润规则（保留但不再使用）
const ruleList = ref<any[]>([])
const ruleDialogVisible = ref(false)
const currentRule = ref<any>(null)
const ruleFormRef = ref<FormInstanceFunctions>()
const ruleForm = reactive({
  minAmount: 0,
  level1Rate: 10,
  level2Rate: 2,
})
const ruleFormRules = {
  minAmount: [{ required: true, message: '请输入最低订单金额' }],
  level1Rate: [{ required: true, message: '请输入一级代理分润比例' }],
  level2Rate: [{ required: true, message: '请输入二级代理分润比例' }],
}

// 分润记录
const recordList = ref<any[]>([])
const statistics = ref<any>({})
const recordsFilter = reactive({
  keyword: '',
  type: '',
  status: '',
  dateRange: [] as string[],
})
const recordsPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showJumper: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50],
})

// 提现审核
const withdrawalList = ref<any[]>([])
const withdrawalsFilter = reactive({
  keyword: '',
  status: '',
})
const withdrawalsPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showJumper: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50],
})
const rejectDialogVisible = ref(false)
const currentWithdrawal = ref<any>(null)
const rejectForm = reactive({
  reason: '',
})

// 提现详情弹窗
const withdrawalDetailVisible = ref(false)
const withdrawalDetailLoading = ref(false)
const withdrawalDetail = ref<any>(null)

// 【2026-01-20 新增】分润记录详情弹窗
const recordDetailVisible = ref(false)
const recordDetailLoading = ref(false)
const recordDetail = ref<any>(null)

// 推销员定价
const agentPriceLoading = ref(false)
const agentPriceList = ref<AgentPrice[]>([])
const agentFilterList = ref<Agent[]>([])
const productFilterList = ref<Product[]>([])
const agentPriceFilter = reactive({
  agentId: null as number | null,
  productId: null as number | null,
})
const agentPricePagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showJumper: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50],
})

// 商品供价表格列定义
const supplyColumns = [
  { colKey: 'product', title: '商品信息', width: 280 },
  { colKey: 'costPrice', title: '成本价', width: 100 },
  { colKey: 'supplyPrice', title: '供货价', width: 100 },
  { colKey: 'supplyProfit', title: '供货利润', width: 100 },
  { colKey: 'suggestedPrice', title: '建议零售价', width: 110 },
  { colKey: 'minRetailPrice', title: '最低零售价', width: 110 },
  { colKey: 'operation', title: '操作', width: 100, align: 'center' },
]

// 规则表格列定义（已废弃）
const ruleColumns = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'minAmount', title: '最低订单金额', width: 150 },
  { colKey: 'level1Rate', title: '一级代理分润', width: 140 },
  { colKey: 'level2Rate', title: '二级代理分润', width: 140 },
  { colKey: 'status', title: '状态', width: 100, align: 'center' },
  { colKey: 'operation', title: '操作', width: 200, align: 'center' },
]

// 分润记录表格列定义
const recordColumns = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'agent', title: '代理商', width: 160 },
  { colKey: 'type', title: '分润类型', width: 100, align: 'center' },
  { colKey: 'amount', title: '分润金额', width: 120 },
  { colKey: 'rate', title: '分润比例', width: 100 },
  { colKey: 'orderNo', title: '关联订单', width: 160 },
  { colKey: 'orderAmount', title: '订单金额', width: 120 },
  { colKey: 'status', title: '状态', width: 100, align: 'center' },
  { colKey: 'createdAt', title: '创建时间', width: 160 },
  { colKey: 'operation', title: '操作', width: 100, align: 'center', fixed: 'right' },
]

// 提现表格列定义
const withdrawalColumns = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'agent', title: '代理商', width: 160 },
  { colKey: 'amount', title: '提现金额', width: 140 },
  { colKey: 'currentBalance', title: '当前余额', width: 120 },
  { colKey: 'status', title: '状态', width: 100, align: 'center' },
  { colKey: 'createdAt', title: '申请时间', width: 170 },
  { colKey: 'operation', title: '操作', width: 200, align: 'center' },
]

// 提现详情中最近分润记录表格列
const recentCommissionColumns = [
  { colKey: 'type', title: '类型', width: 80 },
  { colKey: 'amount', title: '金额', width: 100 },
  { colKey: 'orderNo', title: '关联订单', width: 160 },
  { colKey: 'createdAt', title: '时间', width: 150 },
]

// 【2026-01-20 新增】分润详情中商品明细表格列
const recordItemColumns = [
  { colKey: 'productName', title: '商品', width: 200 },
  { colKey: 'quantity', title: '数量', width: 80, align: 'center' },
  { colKey: 'price', title: '单价', width: 100 },
  { colKey: 'subtotal', title: '小计', width: 100 },
  { colKey: 'priceSnapshot', title: '价格快照', width: 180 },
]

// 推销员定价表格列定义
const agentPriceColumns = [
  { colKey: 'agent', title: '推销员', width: 180 },
  { colKey: 'product', title: '商品', width: 240 },
  { colKey: 'supplyPrice', title: '供货价(参考)', width: 110 },
  { colKey: 'retailPrice', title: '零售价', width: 100 },
  { colKey: 'subPrice', title: '给下级的价', width: 110 },
  { colKey: 'profitMargin', title: '利润空间', width: 100 },
  { colKey: 'updatedAt', title: '更新时间', width: 160 },
]

// 格式化金额
function formatAmount(amount: string | number): string {
  return Number(amount || 0).toFixed(2)
}

// 格式化时间
function formatTime(timeStr: string): string {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 获取提现状态主题
function getWithdrawalStatusTheme(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'warning',
    APPROVED: 'primary',
    REJECTED: 'danger',
    COMPLETED: 'success',
  }
  return map[status] || 'default'
}

// 获取提现状态标签
function getWithdrawalStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
    COMPLETED: '已完成',
  }
  return map[status] || status
}

// 获取分润规则
async function fetchRules() {
  rulesLoading.value = true
  try {
    const res = await getRules()
    ruleList.value = res.data || []
  } catch (err) {
    console.error('获取分润规则失败:', err)
  } finally {
    rulesLoading.value = false
  }
}

// 新增规则
function handleAddRule() {
  currentRule.value = null
  ruleForm.minAmount = 0
  ruleForm.level1Rate = 10
  ruleForm.level2Rate = 2
  ruleDialogVisible.value = true
}

// 编辑规则
function handleEditRule(row: any) {
  currentRule.value = row
  ruleForm.minAmount = Number(row.minAmount)
  ruleForm.level1Rate = Number(row.level1Rate)
  ruleForm.level2Rate = Number(row.level2Rate)
  ruleDialogVisible.value = true
}

// 保存规则
async function handleSaveRule() {
  const valid = await ruleFormRef.value?.validate()
  if (valid !== true) return

  submitting.value = true
  try {
    if (currentRule.value) {
      await updateRule(currentRule.value.id, ruleForm)
      MessagePlugin.success('更新成功')
    } else {
      await createRule(ruleForm)
      MessagePlugin.success('创建成功')
    }
    ruleDialogVisible.value = false
    fetchRules()
  } catch (err) {
    MessagePlugin.error('保存失败')
  } finally {
    submitting.value = false
  }
}

// 切换规则状态
async function handleToggleRuleStatus(row: any) {
  try {
    await updateRule(row.id, {
      status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    })
    MessagePlugin.success('状态更新成功')
    fetchRules()
  } catch (err) {
    MessagePlugin.error('操作失败')
  }
}

// 删除规则
async function handleDeleteRule(row: any) {
  try {
    await deleteRule(row.id)
    MessagePlugin.success('删除成功')
    fetchRules()
  } catch (err) {
    MessagePlugin.error('删除失败')
  }
}

// 获取分润统计
async function fetchStatistics() {
  try {
    const res = await getStatistics()
    statistics.value = res.data || {}
  } catch (err) {
    console.error('获取统计失败:', err)
  }
}

// 获取分润记录
async function fetchRecords() {
  recordsLoading.value = true
  try {
    const params: any = {
      page: recordsPagination.current,
      pageSize: recordsPagination.pageSize,
    }
    if (recordsFilter.keyword) params.keyword = recordsFilter.keyword
    if (recordsFilter.type) params.type = recordsFilter.type
    if (recordsFilter.status) params.status = recordsFilter.status
    if (recordsFilter.dateRange && recordsFilter.dateRange.length === 2) {
      params.startDate = recordsFilter.dateRange[0]
      params.endDate = recordsFilter.dateRange[1]
    }

    const res = await getRecords(params)
    recordList.value = res.data.list || []
    recordsPagination.total = res.data.total || 0
  } catch (err) {
    console.error('获取分润记录失败:', err)
  } finally {
    recordsLoading.value = false
  }
}

// 搜索分润记录
function handleSearchRecords() {
  recordsPagination.current = 1
  fetchRecords()
}

// 重置分润记录筛选
function handleResetRecords() {
  recordsFilter.keyword = ''
  recordsFilter.type = ''
  recordsFilter.status = ''
  recordsFilter.dateRange = []
  recordsPagination.current = 1
  fetchRecords()
}

// 分润记录分页变化
function handleRecordsPageChange(pageInfo: { current: number; pageSize: number }) {
  recordsPagination.current = pageInfo.current
  recordsPagination.pageSize = pageInfo.pageSize
  fetchRecords()
}

// 批量结算
function handleSettleBatch() {
  const dialog = DialogPlugin.confirm({
    header: '批量结算',
    body: '确定要结算所有待结算的分润记录吗？',
    confirmBtn: { theme: 'primary' },
    onConfirm: async () => {
      try {
        await settleCommissions()
        MessagePlugin.success('结算成功')
        fetchRecords()
        fetchStatistics()
        dialog.destroy()
      } catch (err) {
        MessagePlugin.error('结算失败')
      }
    },
  })
}

// 获取提现列表
async function fetchWithdrawals() {
  withdrawalsLoading.value = true
  try {
    const params: any = {
      page: withdrawalsPagination.current,
      pageSize: withdrawalsPagination.pageSize,
    }
    if (withdrawalsFilter.keyword) params.keyword = withdrawalsFilter.keyword
    if (withdrawalsFilter.status) params.status = withdrawalsFilter.status

    const res = await getWithdrawals(params)
    withdrawalList.value = res.data.list || []
    withdrawalsPagination.total = res.data.total || 0
  } catch (err) {
    console.error('获取提现列表失败:', err)
  } finally {
    withdrawalsLoading.value = false
  }
}

// 搜索提现
function handleSearchWithdrawals() {
  withdrawalsPagination.current = 1
  fetchWithdrawals()
}

// 重置提现筛选
function handleResetWithdrawals() {
  withdrawalsFilter.keyword = ''
  withdrawalsFilter.status = ''
  withdrawalsPagination.current = 1
  fetchWithdrawals()
}

// 提现分页变化
function handleWithdrawalsPageChange(pageInfo: { current: number; pageSize: number }) {
  withdrawalsPagination.current = pageInfo.current
  withdrawalsPagination.pageSize = pageInfo.pageSize
  fetchWithdrawals()
}

// 通过提现
async function handleApproveWithdrawal(row: any) {
  const dialog = DialogPlugin.confirm({
    header: '确认通过',
    body: `确定通过该提现申请吗？提现金额: ¥${formatAmount(row.amount)}`,
    confirmBtn: { theme: 'primary' },
    onConfirm: async () => {
      try {
        await reviewWithdrawal(row.id, { action: 'approve' })
        MessagePlugin.success('审核通过')
        fetchWithdrawals()
        dialog.destroy()
      } catch (err) {
        MessagePlugin.error('操作失败')
      }
    },
  })
}

// 拒绝提现
function handleRejectWithdrawal(row: any) {
  currentWithdrawal.value = row
  rejectForm.reason = ''
  rejectDialogVisible.value = true
}

// 确认拒绝
async function handleConfirmReject() {
  if (!currentWithdrawal.value) return
  submitting.value = true
  try {
    await reviewWithdrawal(currentWithdrawal.value.id, {
      action: 'reject',
      reason: rejectForm.reason,
    })
    MessagePlugin.success('已拒绝')
    rejectDialogVisible.value = false
    fetchWithdrawals()
  } catch (err) {
    MessagePlugin.error('操作失败')
  } finally {
    submitting.value = false
  }
}

// 查看订单详情
function handleViewOrder(orderId: number) {
  if (!orderId) return
  // 跳转到预约管理页面并自动打开详情
  router.push({ path: '/reservations', query: { viewReservation: orderId.toString() } })
}

// 【2026-01-20 新增】查看分润记录详情
async function handleViewRecordDetail(row: any) {
  recordDetailLoading.value = true
  recordDetailVisible.value = true
  try {
    const res = await getRecordDetail(row.id)
    recordDetail.value = res.data
  } catch (err) {
    MessagePlugin.error('获取分润详情失败')
    recordDetailVisible.value = false
  } finally {
    recordDetailLoading.value = false
  }
}

// 获取推销员层级标签
function getSalespersonLevelLabel(level: number | null): string {
  if (level === null || level === undefined) return '总代理'
  const map: Record<number, string> = {
    0: '总代理',
    1: '一级推销员',
    2: '二级推销员',
  }
  return map[level] || '未知'
}

// 查看提现详情
async function handleViewWithdrawalDetail(row: any) {
  withdrawalDetailLoading.value = true
  withdrawalDetailVisible.value = true
  try {
    const res = await getWithdrawalDetail(row.id)
    withdrawalDetail.value = res.data
  } catch (err) {
    MessagePlugin.error('获取提现详情失败')
    withdrawalDetailVisible.value = false
  } finally {
    withdrawalDetailLoading.value = false
  }
}

// 获取代理商类型标签
function getAgentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    LEVEL1: '一级总代',
    LEVEL2: '二级代理',
    LEVEL3: '三级分销',
    WHOLESALE: '批发商',
  }
  return map[type] || type
}

// ========== 商品供价管理函数 ==========

// 获取第一张图片
function getFirstImage(images: string | string[]): string {
  return getFirstImageUtil(images)
}

// 计算供货利润
function getSupplyProfit(product: Product): number {
  const cost = Number(product.costPrice) || 0
  const supply = Number(product.supplyPrice) || 0
  return supply - cost
}

// 加载分类列表
async function fetchCategories() {
  try {
    const res = await getCategoryList()
    categoryList.value = res.data || []
  } catch (err) {
    console.error('加载分类失败:', err)
  }
}

// 加载商品供价列表
async function fetchSupplyProducts() {
  supplyLoading.value = true
  try {
    const res = await getProductList({
      page: supplyPagination.current,
      pageSize: supplyPagination.pageSize,
      keyword: supplyFilter.keyword || undefined,
      categoryId: supplyFilter.categoryId || undefined,
    })
    supplyProductList.value = res.data.list || []
    supplyPagination.total = res.data.total || 0
  } catch (err) {
    console.error('加载商品列表失败:', err)
  } finally {
    supplyLoading.value = false
  }
}

// 供价列表分页变化
function handleSupplyPageChange(pageInfo: PageInfo) {
  supplyPagination.current = pageInfo.current
  supplyPagination.pageSize = pageInfo.pageSize
  fetchSupplyProducts()
}

// 编辑商品供价
function handleEditSupplyPrice(product: Product) {
  currentSupplyProduct.value = product
  supplyForm.costPrice = Number(product.costPrice) || 0
  supplyForm.supplyPrice = Number(product.supplyPrice) || 0
  supplyForm.suggestedPrice = Number(product.suggestedPrice) || 0
  supplyForm.minRetailPrice = Number(product.minRetailPrice) || 0
  supplyDialogVisible.value = true
}

// 保存商品供价
async function handleSaveSupplyPrice() {
  const valid = await supplyFormRef.value?.validate()
  if (valid !== true) return

  if (!currentSupplyProduct.value) return

  submitting.value = true
  try {
    await updateProduct(currentSupplyProduct.value.id, {
      costPrice: supplyForm.costPrice,
      supplyPrice: supplyForm.supplyPrice,
      suggestedPrice: supplyForm.suggestedPrice || undefined,
      minRetailPrice: supplyForm.minRetailPrice || undefined,
    })
    MessagePlugin.success('供价更新成功')
    supplyDialogVisible.value = false
    fetchSupplyProducts()
  } catch (err) {
    MessagePlugin.error('更新失败')
  } finally {
    submitting.value = false
  }
}

// ========== 推销员定价管理函数 ==========

// 加载推销员筛选列表（只获取一级和二级推销员，排除WHOLESALE普通用户）
async function fetchAgentFilterList() {
  try {
    // 分别获取一级和二级推销员
    const [level1Res, level2Res] = await Promise.all([
      getAgentList({ pageSize: 200, status: 'ACTIVE', type: 'LEVEL1' }),
      getAgentList({ pageSize: 200, status: 'ACTIVE', type: 'LEVEL2' }),
    ])
    agentFilterList.value = [
      ...(level1Res.data.list || []),
      ...(level2Res.data.list || []),
    ]
  } catch (err) {
    console.error('加载推销员列表失败:', err)
  }
}

// 加载商品筛选列表
async function fetchProductFilterList() {
  try {
    const res = await getProductList({ pageSize: 200, status: 'ACTIVE' })
    productFilterList.value = res.data.list || []
  } catch (err) {
    console.error('加载商品列表失败:', err)
  }
}

// 获取推销员定价列表
async function fetchAgentPrices() {
  agentPriceLoading.value = true
  try {
    const res = await getAgentPrices({
      page: agentPricePagination.current,
      pageSize: agentPricePagination.pageSize,
      agentId: agentPriceFilter.agentId || undefined,
      productId: agentPriceFilter.productId || undefined,
    })
    agentPriceList.value = res.data.list || []
    agentPricePagination.total = res.data.total || 0
  } catch (err) {
    console.error('获取推销员定价失败:', err)
  } finally {
    agentPriceLoading.value = false
  }
}

// 重置推销员定价筛选
function handleResetAgentPriceFilter() {
  agentPriceFilter.agentId = null
  agentPriceFilter.productId = null
  agentPricePagination.current = 1
  fetchAgentPrices()
}

// 推销员定价分页变化
function handleAgentPricePageChange(pageInfo: { current: number; pageSize: number }) {
  agentPricePagination.current = pageInfo.current
  agentPricePagination.pageSize = pageInfo.pageSize
  fetchAgentPrices()
}

// 计算推销员利润空间（零售价 - 供货价）
function getAgentProfitMargin(row: AgentPrice): number {
  const retail = Number(row.retailPrice) || 0
  const supply = Number(row.supplyPrice) || 0
  return retail - supply
}

// 初始化
onMounted(() => {
  // 从URL参数初始化
  const { tab, keyword } = route.query
  if (tab === 'supply' || tab === 'records' || tab === 'withdrawals' || tab === 'agentPricing') {
    activeTab.value = tab as string
  }
  if (keyword) {
    if (tab === 'records') {
      recordsFilter.keyword = keyword as string
    } else if (tab === 'withdrawals') {
      withdrawalsFilter.keyword = keyword as string
    }
  }

  // 加载数据
  fetchCategories()
  fetchSupplyProducts()
  fetchStatistics()
  fetchRecords()
  fetchWithdrawals()
  // 推销员定价相关
  fetchAgentFilterList()
  fetchProductFilterList()
  fetchAgentPrices()
})
</script>

<style scoped>
.commission-page {
  padding: 0;
}

.tab-content {
  padding-top: 16px;
}

.info-alert {
  margin-bottom: 16px;
}

.alert-content {
  line-height: 1.6;
}

.alert-content strong {
  display: block;
  margin-bottom: 4px;
}

.alert-content p {
  margin: 0;
  color: #666;
}

.filter-card {
  margin-bottom: 16px;
}

.amount-text {
  font-weight: 600;
  color: #e53935;
}

.time-text {
  color: #4e5969;
}

.agent-info {
  line-height: 1.5;
}

.agent-name {
  font-weight: 500;
  color: #1d2129;
}

.agent-phone {
  font-size: 12px;
  color: #86909c;
}

.no-operation {
  color: #c9cdd4;
}

/* 统计卡片 */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

/* 分润规则说明 */
.rule-desc {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.rule-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.rule-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rule-icon.primary {
  background: var(--color-primary-lighter, rgba(229, 57, 53, 0.1));
  color: var(--color-primary, #e53935);
}

.rule-icon.warning {
  background: var(--color-warning-lighter, rgba(255, 152, 0, 0.1));
  color: var(--color-warning, #ff9800);
}

.rule-icon.success {
  background: var(--color-success-lighter, rgba(76, 175, 80, 0.1));
  color: var(--color-success, #4caf50);
}

.rule-icon.default {
  background: var(--color-bg-hover, #f5f5f5);
  color: var(--color-text-secondary, #666);
}

.rule-content h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  margin: 0 0 8px;
}

.rule-content p {
  font-size: 13px;
  color: #86909c;
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 1200px) {
  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .rule-desc {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stat-cards {
    grid-template-columns: 1fr;
  }

  .rule-desc {
    grid-template-columns: 1fr;
  }
}

/* 提现详情弹窗 */
.withdrawal-detail {
  padding: 0 8px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section .section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 16px;
  padding-left: 10px;
  border-left: 3px solid #e53935;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 24px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  color: #86909c;
  font-size: 13px;
  min-width: 80px;
}

.info-value {
  color: #1d2129;
  font-size: 14px;
}

.info-value.amount {
  color: #e53935;
  font-weight: 600;
  font-size: 16px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stats-card {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stats-label {
  font-size: 12px;
  color: #86909c;
  margin-bottom: 8px;
}

.stats-value {
  font-size: 18px;
  font-weight: 600;
}

.stats-value.primary {
  color: #e53935;
}

.stats-value.success {
  color: #4caf50;
}

.stats-value.warning {
  color: #ff9800;
}

.stats-value.info {
  color: #2196f3;
}

.balance-text {
  color: #4caf50;
  font-weight: 500;
}

.no-order {
  color: #c9cdd4;
}

/* ========== 商品供价管理样式 ========== */

/* 商品信息列 */
.product-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
  background: #f5f5f5;
}

.product-detail {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-weight: 500;
  color: #1d2129;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-id {
  font-size: 12px;
  color: #86909c;
  margin-top: 2px;
}

/* 价格样式 */
.cost-price {
  color: #86909c;
}

.supply-price {
  color: #e53935;
  font-weight: 600;
}

.profit-text {
  color: #86909c;
}

.profit-text.profit-positive {
  color: #4caf50;
  font-weight: 600;
}

.no-price {
  color: #c9cdd4;
  font-size: 12px;
}

/* 供价编辑弹窗 */
.supply-form {
  padding: 8px 0;
}

.supply-product-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 24px;
}

.supply-product-thumb {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
  background: #f0f0f0;
}

.supply-product-info {
  flex: 1;
}

.supply-product-name {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
}

.supply-product-id {
  font-size: 13px;
  color: #86909c;
  margin-top: 4px;
}

.form-tip {
  font-size: 12px;
  color: #86909c;
  margin-top: 4px;
}

/* 供价编辑表单网格布局 */
.supply-price-form {
  margin-top: 8px;
}

.price-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.price-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.price-item .price-label {
  font-size: 14px;
  font-weight: 500;
  color: #1d2129;
}

.price-item.required .price-label::before {
  content: '*';
  color: #e34d59;
  margin-right: 4px;
}

.price-item .price-tip {
  font-size: 12px;
  color: #86909c;
  margin-top: -4px;
}

/* 利润预览框 */
.profit-preview-box {
  background: #f0f9eb;
  border: 1px solid #e6f7e0;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.preview-header {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 12px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.preview-label {
  color: #4e5969;
}

.preview-value {
  font-weight: 600;
  color: #4e5969;
}

.preview-value.profit-positive {
  color: #4caf50;
}

/* ========== 推销员定价样式 ========== */

/* 推销员信息单元格 */
.agent-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.agent-cell .agent-name {
  font-weight: 500;
  color: #1d2129;
}

.agent-cell .agent-phone {
  font-size: 12px;
  color: #86909c;
}

/* 价格样式 */
.ref-price {
  color: #86909c;
  font-size: 13px;
}

.retail-price {
  color: #e53935;
  font-weight: 600;
}

.sub-price {
  color: #ff9800;
  font-weight: 500;
}

.not-applicable {
  color: #c9cdd4;
}

/* ========== 【2026-01-20】分润详情弹窗样式 ========== */

.record-detail {
  padding: 8px 0;
}

/* 利润分配明细 */
.profit-distribution {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.profit-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.profit-item.total {
  background: #e3f2fd;
}

.profit-role {
  font-size: 13px;
  color: #86909c;
  margin-bottom: 8px;
}

.profit-amount {
  font-size: 18px;
  font-weight: 600;
  color: #4caf50;
}

.profit-item.total .profit-amount {
  color: #e53935;
}

/* 商品小缩略图 */
.product-info-small {
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-thumb-small {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  object-fit: cover;
  background: #f5f5f5;
}

/* 价格快照 */
.price-snapshot {
  font-size: 12px;
  color: #86909c;
  line-height: 1.6;
}
</style>
