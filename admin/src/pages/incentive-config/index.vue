<template>
  <div class="incentive-config-page">
    <!-- 页面标题 -->
    <PageHeader title="激励配置" subtitle="配置推销员激励参数，包括代金券奖励、周期奖励等">
      <template #actions>
        <t-space>
          <t-button variant="outline" @click="loadConfigs">
            <template #icon><t-icon name="refresh" /></template>
            刷新
          </t-button>
          <t-button theme="primary" @click="handleSaveAll" :loading="saving">
            <template #icon><t-icon name="check" /></template>
            保存配置
          </t-button>
        </t-space>
      </template>
    </PageHeader>

    <!-- 【2026-01-23】代金券系统总开关 -->
    <t-card :bordered="false" class="config-card system-switch-card">
      <div class="system-switch-container">
        <div class="system-switch-left">
          <div class="system-switch-icon" :class="{ active: configs.coupon_system_enabled }">
            <t-icon :name="configs.coupon_system_enabled ? 'gift' : 'gift'" />
          </div>
          <div class="system-switch-info">
            <div class="system-switch-title">代金券系统总开关</div>
            <div class="system-switch-desc">
              {{ configs.coupon_system_enabled ? '系统已开启，代金券奖励正常发放' : '系统已关闭，所有代金券奖励暂停发放' }}
            </div>
          </div>
        </div>
        <div class="system-switch-right">
          <t-switch
            v-model="configs.coupon_system_enabled"
            size="large"
          />
        </div>
      </div>
      <!-- 关闭时的警告提示 -->
      <t-alert
        v-if="!configs.coupon_system_enabled"
        theme="warning"
        message="代金券系统已关闭"
        description="当前所有代金券奖励（注册、拉新、首单等）都不会发放。如需启用代金券激励功能，请开启此开关。"
        style="margin-top: 16px;"
      />
      <!-- 配置状态概览 -->
      <div class="config-overview" v-if="configs.coupon_system_enabled">
        <div class="overview-item">
          <span class="overview-label">即时奖励</span>
          <span class="overview-value">{{ enabledInstantCount }}/6 已启用</span>
        </div>
        <div class="overview-item">
          <span class="overview-label">周期奖励</span>
          <span class="overview-value">{{ enabledWeeklyCount }}/3 已启用</span>
        </div>
        <div class="overview-item" v-if="enabledInstantCount === 0 && enabledWeeklyCount === 0">
          <t-tag theme="warning" variant="light">所有奖励都未启用</t-tag>
        </div>
      </div>
    </t-card>

    <!-- 即时奖励配置 -->
    <t-card title="即时奖励配置" :bordered="false" class="config-card">
      <template #subtitle>
        <span class="card-subtitle">新推销员注册、首次预约、首单成交等即时发放的代金券奖励（开关控制是否启用）</span>
      </template>
      <div class="config-grid">
        <div class="config-item">
          <div class="config-header">
            <div class="config-icon register">
              <t-icon name="user-add" />
            </div>
            <div class="config-info">
              <div class="config-title">
                <t-switch v-model="configs.coupon_register_enabled" size="small" />
                <span>注册代金券</span>
              </div>
              <div class="config-desc">新推销员注册时发放</div>
            </div>
          </div>
          <div class="config-input">
            <t-input-number
              v-model="configs.coupon_register_bonus"
              :min="0"
              :max="100"
              suffix="元"
              theme="normal"
              :disabled="!configs.coupon_register_enabled"
            />
          </div>
        </div>

        <div class="config-item">
          <div class="config-header">
            <div class="config-icon reservation">
              <t-icon name="calendar" />
            </div>
            <div class="config-info">
              <div class="config-title">
                <t-switch v-model="configs.coupon_first_reservation_enabled" size="small" />
                <span>首预约代金券</span>
              </div>
              <div class="config-desc">首次有客户预约时发放</div>
            </div>
          </div>
          <div class="config-input">
            <t-input-number
              v-model="configs.coupon_first_reservation_bonus"
              :min="0"
              :max="100"
              suffix="元"
              theme="normal"
              :disabled="!configs.coupon_first_reservation_enabled"
            />
          </div>
        </div>

        <div class="config-item">
          <div class="config-header">
            <div class="config-icon complete">
              <t-icon name="check-circle" />
            </div>
            <div class="config-info">
              <div class="config-title">
                <t-switch v-model="configs.coupon_first_complete_enabled" size="small" />
                <span>首单成交代金券</span>
              </div>
              <div class="config-desc">首次有订单完成核销时发放</div>
            </div>
          </div>
          <div class="config-input">
            <t-input-number
              v-model="configs.coupon_first_complete_bonus"
              :min="0"
              :max="100"
              suffix="元"
              theme="normal"
              :disabled="!configs.coupon_first_complete_enabled"
            />
          </div>
        </div>

        <div class="config-item">
          <div class="config-header">
            <div class="config-icon recruit">
              <t-icon name="usergroup-add" />
            </div>
            <div class="config-info">
              <div class="config-title">
                <t-switch v-model="configs.coupon_recruit_enabled" size="small" />
                <span>拉新代金券</span>
              </div>
              <div class="config-desc">邀请新推销员注册时发放给邀请人</div>
            </div>
          </div>
          <div class="config-input">
            <t-input-number
              v-model="configs.coupon_recruit_bonus"
              :min="0"
              :max="100"
              suffix="元"
              theme="normal"
              :disabled="!configs.coupon_recruit_enabled"
            />
          </div>
        </div>

        <div class="config-item">
          <div class="config-header">
            <div class="config-icon share">
              <t-icon name="share" />
            </div>
            <div class="config-info">
              <div class="config-title">
                <t-switch v-model="configs.coupon_first_share_enabled" size="small" />
                <span>首发圈代金券</span>
              </div>
              <div class="config-desc">首次发圈审核通过时发放</div>
            </div>
          </div>
          <div class="config-input">
            <t-input-number
              v-model="configs.coupon_first_share_bonus"
              :min="0"
              :max="100"
              suffix="元"
              theme="normal"
              :disabled="!configs.coupon_first_share_enabled"
            />
          </div>
        </div>

        <div class="config-item">
          <div class="config-header">
            <div class="config-icon activate">
              <t-icon name="verified" />
            </div>
            <div class="config-info">
              <div class="config-title">
                <t-switch v-model="configs.coupon_activate_enabled" size="small" />
                <span>激活再奖代金券</span>
              </div>
              <div class="config-desc">下级推销员激活时发放给上级</div>
            </div>
          </div>
          <div class="config-input">
            <t-input-number
              v-model="configs.coupon_activate_bonus"
              :min="0"
              :max="100"
              suffix="元"
              theme="normal"
              :disabled="!configs.coupon_activate_enabled"
            />
          </div>
        </div>
      </div>
    </t-card>

    <!-- 周期奖励配置 -->
    <t-card title="周期奖励配置" :bordered="false" class="config-card">
      <template #subtitle>
        <span class="card-subtitle">每周一统计上周数据，达标后自动发放代金券（取最高档，不叠加）</span>
      </template>

      <div class="config-section">
        <div class="section-label">
          <t-switch v-model="configs.coupon_week_sales_enabled" size="small" />
          <t-icon name="chart-bar" class="section-icon sales" />
          周销售奖励
        </div>
        <div class="tier-config">
          <div class="tier-item">
            <span class="tier-label">3单</span>
            <t-input-number
              v-model="configs.coupon_week_sales_3"
              :min="0"
              :max="500"
              suffix="元"
              theme="normal"
              :disabled="!configs.coupon_week_sales_enabled"
            />
          </div>
          <div class="tier-item">
            <span class="tier-label">5单</span>
            <t-input-number
              v-model="configs.coupon_week_sales_5"
              :min="0"
              :max="500"
              suffix="元"
              theme="normal"
              :disabled="!configs.coupon_week_sales_enabled"
            />
          </div>
          <div class="tier-item">
            <span class="tier-label">10单</span>
            <t-input-number
              v-model="configs.coupon_week_sales_10"
              :min="0"
              :max="500"
              suffix="元"
              theme="normal"
              :disabled="!configs.coupon_week_sales_enabled"
            />
          </div>
        </div>
      </div>

      <div class="config-section">
        <div class="section-label">
          <t-switch v-model="configs.coupon_week_share_enabled" size="small" />
          <t-icon name="share" class="section-icon share" />
          发圈全勤奖励
        </div>
        <div class="tier-config">
          <div class="tier-item">
            <span class="tier-label">7天全勤</span>
            <t-input-number
              v-model="configs.coupon_week_share_full"
              :min="0"
              :max="200"
              suffix="元"
              theme="normal"
              :disabled="!configs.coupon_week_share_enabled"
            />
          </div>
        </div>
      </div>

      <div class="config-section">
        <div class="section-label">
          <t-switch v-model="configs.coupon_week_recruit_enabled" size="small" />
          <t-icon name="usergroup-add" class="section-icon recruit" />
          周拉新奖励
        </div>
        <div class="tier-config">
          <div class="tier-item">
            <span class="tier-label">3人</span>
            <t-input-number
              v-model="configs.coupon_week_recruit_3"
              :min="0"
              :max="200"
              suffix="元"
              theme="normal"
              :disabled="!configs.coupon_week_recruit_enabled"
            />
          </div>
        </div>
      </div>
    </t-card>

    <!-- 团队奖励配置 -->
    <t-card title="团队奖励配置（月度）" :bordered="false" class="config-card">
      <template #subtitle>
        <span class="card-subtitle">每月1日统计上月一级推销员的团队销售额，达标后发放现金奖励</span>
      </template>
      <div class="tier-config vertical">
        <div class="tier-item large">
          <span class="tier-label">档位1</span>
          <div class="tier-inputs">
            <t-input-number
              v-model="teamRewardTier1.sales"
              :min="0"
              :max="100000"
              suffix="元"
              placeholder="销售额"
              theme="normal"
            />
            <span class="tier-arrow">→</span>
            <t-input-number
              v-model="teamRewardTier1.reward"
              :min="0"
              :max="5000"
              suffix="元"
              placeholder="奖励"
              theme="normal"
            />
          </div>
        </div>
        <div class="tier-item large">
          <span class="tier-label">档位2</span>
          <div class="tier-inputs">
            <t-input-number
              v-model="teamRewardTier2.sales"
              :min="0"
              :max="100000"
              suffix="元"
              placeholder="销售额"
              theme="normal"
            />
            <span class="tier-arrow">→</span>
            <t-input-number
              v-model="teamRewardTier2.reward"
              :min="0"
              :max="5000"
              suffix="元"
              placeholder="奖励"
              theme="normal"
            />
          </div>
        </div>
        <div class="tier-item large">
          <span class="tier-label">档位3</span>
          <div class="tier-inputs">
            <t-input-number
              v-model="teamRewardTier3.sales"
              :min="0"
              :max="100000"
              suffix="元"
              placeholder="销售额"
              theme="normal"
            />
            <span class="tier-arrow">→</span>
            <t-input-number
              v-model="teamRewardTier3.reward"
              :min="0"
              :max="5000"
              suffix="元"
              placeholder="奖励"
              theme="normal"
            />
          </div>
        </div>
      </div>
    </t-card>

    <!-- 其他配置 -->
    <t-card title="其他配置" :bordered="false" class="config-card">
      <div class="config-grid">
        <div class="config-item">
          <div class="config-header">
            <div class="config-icon expire">
              <t-icon name="time" />
            </div>
            <div class="config-info">
              <div class="config-title">代金券过期日期</div>
              <div class="config-desc">所有代金券统一过期日期</div>
            </div>
          </div>
          <div class="config-input">
            <t-date-picker
              v-model="configs.coupon_expire_date"
              format="YYYY-MM-DD"
              placeholder="选择日期"
            />
          </div>
        </div>

        <div class="config-item">
          <div class="config-header">
            <div class="config-icon activate">
              <t-icon name="rocket" />
            </div>
            <div class="config-info">
              <div class="config-title">激活销售额门槛</div>
              <div class="config-desc">二级推销员达到此销售额视为激活</div>
            </div>
          </div>
          <div class="config-input">
            <t-input-number
              v-model="configs.activation_threshold"
              :min="0"
              :max="10000"
              suffix="元"
              theme="normal"
            />
          </div>
        </div>

        <div class="config-item">
          <div class="config-header">
            <div class="config-icon upgrade">
              <t-icon name="trending-up" />
            </div>
            <div class="config-info">
              <div class="config-title">晋升销售额门槛</div>
              <div class="config-desc">二级申请晋升一级的销售额要求</div>
            </div>
          </div>
          <div class="config-input">
            <t-input-number
              v-model="configs.upgrade_sales_threshold"
              :min="0"
              :max="100000"
              suffix="元"
              theme="normal"
            />
          </div>
        </div>

        <div class="config-item">
          <div class="config-header">
            <div class="config-icon upgrade">
              <t-icon name="file-paste" />
            </div>
            <div class="config-info">
              <div class="config-title">晋升订单数门槛</div>
              <div class="config-desc">二级申请晋升一级的订单数要求</div>
            </div>
          </div>
          <div class="config-input">
            <t-input-number
              v-model="configs.upgrade_orders_threshold"
              :min="0"
              :max="1000"
              suffix="单"
              theme="normal"
            />
          </div>
        </div>

        <div class="config-item">
          <div class="config-header">
            <div class="config-icon auto">
              <t-icon name="swap" />
            </div>
            <div class="config-info">
              <div class="config-title">自动晋升门槛</div>
              <div class="config-desc">达到此销售额自动晋升为一级</div>
            </div>
          </div>
          <div class="config-input">
            <t-input-number
              v-model="configs.auto_upgrade_threshold"
              :min="0"
              :max="100000"
              suffix="元"
              theme="normal"
            />
          </div>
        </div>
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 激励配置页面
 * 【2026-01-20】
 * 【2026-01-23】添加代金券系统总开关
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { PageHeader } from '@/components'
import request from '@/api/request'

// 配置数据
const configs = reactive<Record<string, any>>({
  // 【2026-01-23】代金券系统总开关
  coupon_system_enabled: false,
  // 即时奖励开关（默认关闭）
  coupon_register_enabled: false,
  coupon_recruit_enabled: false,
  coupon_first_reservation_enabled: false,
  coupon_first_complete_enabled: false,
  coupon_first_share_enabled: false,
  coupon_activate_enabled: false,
  // 即时奖励金额
  coupon_register_bonus: 5,
  coupon_first_reservation_bonus: 10,
  coupon_first_complete_bonus: 20,
  coupon_recruit_bonus: 15,
  coupon_first_share_bonus: 5,
  coupon_activate_bonus: 5,
  // 周期奖励开关（默认关闭）
  coupon_week_sales_enabled: false,
  coupon_week_share_enabled: false,
  coupon_week_recruit_enabled: false,
  // 周期奖励金额
  coupon_week_sales_3: 30,
  coupon_week_sales_5: 80,
  coupon_week_sales_10: 200,
  coupon_week_share_full: 20,
  coupon_week_recruit_3: 50,
  // 其他
  coupon_expire_date: '2026-02-14',
  activation_threshold: 500,
  upgrade_sales_threshold: 5000,
  upgrade_orders_threshold: 20,
  auto_upgrade_threshold: 30000,
})

// 团队奖励（特殊格式：销售额:奖励）
const teamRewardTier1 = reactive({ sales: 5000, reward: 100 })
const teamRewardTier2 = reactive({ sales: 15000, reward: 300 })
const teamRewardTier3 = reactive({ sales: 50000, reward: 1000 })

const saving = ref(false)

// 【2026-01-23】计算已启用的即时奖励数量
const enabledInstantCount = computed(() => {
  let count = 0
  if (configs.coupon_register_enabled) count++
  if (configs.coupon_recruit_enabled) count++
  if (configs.coupon_first_reservation_enabled) count++
  if (configs.coupon_first_complete_enabled) count++
  if (configs.coupon_first_share_enabled) count++
  if (configs.coupon_activate_enabled) count++
  return count
})

// 【2026-01-23】计算已启用的周期奖励数量
const enabledWeeklyCount = computed(() => {
  let count = 0
  if (configs.coupon_week_sales_enabled) count++
  if (configs.coupon_week_share_enabled) count++
  if (configs.coupon_week_recruit_enabled) count++
  return count
})

// 加载配置
async function loadConfigs() {
  try {
    const res = await request.get('/admin/reward-configs')
    if (res.code === 0 && res.data) {
      // 合并配置
      Object.keys(res.data).forEach((key) => {
        if (key.startsWith('team_reward_tier_')) {
          // 解析团队奖励格式：销售额:奖励
          const [sales, reward] = (res.data[key] || '0:0').split(':').map(Number)
          if (key === 'team_reward_tier_1') {
            teamRewardTier1.sales = sales
            teamRewardTier1.reward = reward
          } else if (key === 'team_reward_tier_2') {
            teamRewardTier2.sales = sales
            teamRewardTier2.reward = reward
          } else if (key === 'team_reward_tier_3') {
            teamRewardTier3.sales = sales
            teamRewardTier3.reward = reward
          }
        } else if (key in configs) {
          // 【2026-01-21】开关配置需要转换为布尔值
          if (key.endsWith('_enabled')) {
            configs[key] = res.data[key] === 'true' || res.data[key] === true
          } else {
            configs[key] = res.data[key]
          }
        }
      })
    }
  } catch (err) {
    console.error('加载配置失败:', err)
    MessagePlugin.error('加载配置失败')
  }
}

// 保存配置
async function handleSaveAll() {
  saving.value = true
  try {
    // 构建配置数据
    const configData = {
      ...configs,
      team_reward_tier_1: `${teamRewardTier1.sales}:${teamRewardTier1.reward}`,
      team_reward_tier_2: `${teamRewardTier2.sales}:${teamRewardTier2.reward}`,
      team_reward_tier_3: `${teamRewardTier3.sales}:${teamRewardTier3.reward}`,
    }

    await request.post('/admin/reward-configs', configData)
    MessagePlugin.success('保存成功')
  } catch (err: any) {
    MessagePlugin.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// 初始化
onMounted(() => {
  loadConfigs()
})
</script>

<style scoped>
.incentive-config-page {
  padding: 0;
}

.config-card {
  margin-bottom: var(--spacing-xl);
}

/* 【2026-01-23】系统总开关卡片样式 */
.system-switch-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.system-switch-card :deep(.t-card__body) {
  padding: var(--spacing-lg);
}

.system-switch-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.system-switch-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.system-switch-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s;
}

.system-switch-icon.active {
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.system-switch-info {
  color: #fff;
}

.system-switch-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 4px;
}

.system-switch-desc {
  font-size: var(--font-size-sm);
  opacity: 0.85;
}

.system-switch-right {
  flex-shrink: 0;
}

.system-switch-right :deep(.t-switch) {
  --td-switch-checked-bg: #22c55e;
}

/* 配置状态概览 */
.config-overview {
  display: flex;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.overview-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: #fff;
  font-size: var(--font-size-sm);
}

.overview-label {
  opacity: 0.75;
}

.overview-value {
  font-weight: var(--font-weight-medium);
}

.card-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

/* 配置网格 */
.config-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-lg);
}

@media (max-width: 1200px) {
  .config-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .config-grid {
    grid-template-columns: 1fr;
  }
}

/* 配置项 */
.config-item {
  background: var(--color-bg-page);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.config-header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.config-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
}

.config-icon.register {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: #fff;
}

.config-icon.reservation {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #fff;
}

.config-icon.complete {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
}

.config-icon.recruit {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  color: #fff;
}

.config-icon.share {
  background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
  color: #fff;
}

.config-icon.activate {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  color: #fff;
}

.config-icon.expire {
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
  color: #fff;
}

.config-icon.upgrade {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: #fff;
}

.config-icon.auto {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
}

.config-info {
  flex: 1;
}

.config-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: 2px;
}

.config-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.config-input {
  width: 100%;
}

.config-input :deep(.t-input-number),
.config-input :deep(.t-date-picker) {
  width: 100%;
}

/* 配置分区 */
.config-section {
  padding: var(--spacing-lg);
  background: var(--color-bg-page);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
}

.config-section:last-child {
  margin-bottom: 0;
}

.section-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.section-icon {
  font-size: 18px;
}

.section-icon.sales {
  color: #f59e0b;
}

.section-icon.share {
  color: #ec4899;
}

.section-icon.recruit {
  color: #3b82f6;
}

/* 档位配置 */
.tier-config {
  display: flex;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.tier-config.vertical {
  flex-direction: column;
}

.tier-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.tier-item.large {
  padding: var(--spacing-md);
  background: var(--color-bg-container);
  border-radius: var(--radius-md);
}

.tier-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-width: 60px;
}

.tier-inputs {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.tier-arrow {
  color: var(--color-text-placeholder);
  font-size: var(--font-size-lg);
}

.tier-item :deep(.t-input-number) {
  width: 120px;
}

.tier-inputs :deep(.t-input-number) {
  width: 140px;
}
</style>
