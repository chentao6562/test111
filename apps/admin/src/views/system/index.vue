<template>
  <!-- 套用设计稿风格: 系统设置页面 -->
  <div class="flex flex-col gap-6">
    <!-- 页面标题区域 -->
    <div class="flex flex-wrap justify-between items-center gap-4">
      <div>
        <h3 class="text-2xl font-black text-text-main tracking-tight">系统设置</h3>
        <p class="text-text-secondary text-sm mt-1">配置系统基础参数和业务规则</p>
      </div>
    </div>

    <!-- 设置卡片网格 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 基础设置卡片 -->
      <div class="bg-white rounded-xl border border-[#f3e8e8] shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-[#f3e8e8] bg-gradient-to-r from-primary/5 to-transparent">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-lg">
              <span class="material-symbols-outlined text-primary">settings</span>
            </div>
            <div>
              <h4 class="text-base font-bold text-text-main">基础设置</h4>
              <p class="text-xs text-text-secondary">系统名称、联系方式等</p>
            </div>
          </div>
        </div>
        <div class="p-6 flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-text-main">系统名称</label>
            <input
              v-model="config.systemName"
              type="text"
              class="h-10 px-4 rounded-lg border border-[#e6d0d0] bg-background-light focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm"
              placeholder="请输入系统名称"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-text-main">客服电话</label>
            <input
              v-model="config.servicePhone"
              type="text"
              class="h-10 px-4 rounded-lg border border-[#e6d0d0] bg-background-light focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm"
              placeholder="请输入客服电话"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-text-main">公司地址</label>
            <input
              v-model="config.companyAddress"
              type="text"
              class="h-10 px-4 rounded-lg border border-[#e6d0d0] bg-background-light focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm"
              placeholder="请输入公司地址"
            />
          </div>
        </div>
      </div>

      <!-- 分润规则卡片 -->
      <div class="bg-white rounded-xl border border-[#f3e8e8] shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-[#f3e8e8] bg-gradient-to-r from-primary/5 to-transparent">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-lg">
              <span class="material-symbols-outlined text-primary">currency_yen</span>
            </div>
            <div>
              <h4 class="text-base font-bold text-text-main">分润规则</h4>
              <p class="text-xs text-text-secondary">代理商分润比例配置</p>
            </div>
          </div>
        </div>
        <div class="p-6 flex flex-col gap-5">
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div class="flex items-start gap-2">
              <span class="material-symbols-outlined text-amber-600 text-lg">info</span>
              <div class="text-xs text-amber-800">
                <p class="font-medium mb-1">分润规则说明</p>
                <p>订单金额 &lt; 399元: 一级代理10%, 二级代理2%</p>
                <p>订单金额 ≥ 399元: 一级代理15%, 二级代理3%</p>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-text-main">分润阈值 (元)</label>
              <input
                v-model.number="config.commissionThreshold"
                type="number"
                class="h-10 px-4 rounded-lg border border-[#e6d0d0] bg-background-light focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-text-main">一级代理低档 (%)</label>
              <input
                v-model.number="config.level1RateLow"
                type="number"
                class="h-10 px-4 rounded-lg border border-[#e6d0d0] bg-background-light focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-text-main">一级代理高档 (%)</label>
              <input
                v-model.number="config.level1RateHigh"
                type="number"
                class="h-10 px-4 rounded-lg border border-[#e6d0d0] bg-background-light focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-text-main">二级代理低档 (%)</label>
              <input
                v-model.number="config.level2RateLow"
                type="number"
                class="h-10 px-4 rounded-lg border border-[#e6d0d0] bg-background-light focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-text-main">二级代理高档 (%)</label>
              <input
                v-model.number="config.level2RateHigh"
                type="number"
                class="h-10 px-4 rounded-lg border border-[#e6d0d0] bg-background-light focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- VIP锁货费设置卡片 -->
      <div class="bg-white rounded-xl border border-[#f3e8e8] shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-[#f3e8e8] bg-gradient-to-r from-primary/5 to-transparent">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-lg">
              <span class="material-symbols-outlined text-primary">local_shipping</span>
            </div>
            <div>
              <h4 class="text-base font-bold text-text-main">VIP锁货费</h4>
              <p class="text-xs text-text-secondary">配送费用相关设置</p>
            </div>
          </div>
        </div>
        <div class="p-6 flex flex-col gap-5">
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-text-main">基础锁货费 (元)</label>
              <input
                v-model.number="config.vipLockFee"
                type="number"
                class="h-10 px-4 rounded-lg border border-[#e6d0d0] bg-background-light focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-text-main">免费门槛 (元)</label>
              <input
                v-model.number="config.freeThreshold"
                type="number"
                class="h-10 px-4 rounded-lg border border-[#e6d0d0] bg-background-light focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm"
              />
            </div>
          </div>
          <div class="text-xs text-text-secondary">
            订单金额达到免费门槛时，VIP锁货费自动减免
          </div>
        </div>
      </div>

      <!-- 库存预警设置卡片 -->
      <div class="bg-white rounded-xl border border-[#f3e8e8] shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-[#f3e8e8] bg-gradient-to-r from-primary/5 to-transparent">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-lg">
              <span class="material-symbols-outlined text-primary">inventory_2</span>
            </div>
            <div>
              <h4 class="text-base font-bold text-text-main">库存预警</h4>
              <p class="text-xs text-text-secondary">库存不足提醒阈值</p>
            </div>
          </div>
        </div>
        <div class="p-6 flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-text-main">预警阈值 (件)</label>
            <input
              v-model.number="config.stockWarningThreshold"
              type="number"
              class="h-10 px-4 rounded-lg border border-[#e6d0d0] bg-background-light focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm"
              placeholder="库存低于此数量时发出预警"
            />
          </div>
          <div class="flex items-center gap-3">
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="config.enableStockWarning" type="checkbox" class="sr-only peer" />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
            <span class="text-sm text-text-main">启用库存预警通知</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 保存按钮 -->
    <div class="flex justify-end gap-4">
      <button
        @click="handleReset"
        class="h-10 px-6 rounded-lg border border-[#e6d0d0] bg-white text-text-main hover:bg-gray-50 font-medium text-sm transition-colors"
      >
        重置
      </button>
      <button
        @click="handleSave"
        :disabled="saving"
        class="h-10 px-8 rounded-lg bg-primary hover:bg-[#c9240e] text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all disabled:opacity-50 flex items-center gap-2"
      >
        <span v-if="saving" class="material-symbols-outlined animate-spin text-lg">progress_activity</span>
        <span>{{ saving ? '保存中...' : '保存设置' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getSystemConfig, updateSystemConfig } from '@/api/system'

interface SystemConfig {
  systemName: string
  servicePhone: string
  companyAddress: string
  commissionThreshold: number
  level1RateLow: number
  level1RateHigh: number
  level2RateLow: number
  level2RateHigh: number
  vipLockFee: number
  freeThreshold: number
  stockWarningThreshold: number
  enableStockWarning: boolean
}

const saving = ref(false)

const config = reactive<SystemConfig>({
  systemName: '蒙庆烟花订货系统',
  servicePhone: '400-888-8888',
  companyAddress: '内蒙古自治区呼和浩特市',
  commissionThreshold: 399,
  level1RateLow: 10,
  level1RateHigh: 15,
  level2RateLow: 2,
  level2RateHigh: 3,
  vipLockFee: 80,
  freeThreshold: 500,
  stockWarningThreshold: 50,
  enableStockWarning: true,
})

const defaultConfig = { ...config }

const fetchConfig = async () => {
  try {
    const res = await getSystemConfig()
    if (res.data) {
      Object.assign(config, res.data)
    }
  } catch (error) {
    console.error('获取系统配置失败', error)
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    await updateSystemConfig(config)
    ElMessage.success('保存成功')
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleReset = () => {
  Object.assign(config, defaultConfig)
  ElMessage.info('已重置为默认值')
}

onMounted(() => {
  fetchConfig()
})
</script>
