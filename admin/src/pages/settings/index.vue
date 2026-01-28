<template>
  <div class="settings-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">系统配置</h1>
        <p class="page-desc">管理全局设置、公司详情及系统偏好选项。</p>
      </div>
      <div class="header-right">
        <span class="update-time" v-if="lastUpdateTime">最后更新时间：{{ lastUpdateTime }}</span>
      </div>
    </div>

    <!-- 主内容卡片 -->
    <t-card :bordered="false" class="main-card">
      <!-- Tab 切换 -->
      <t-tabs v-model="activeTab" @change="handleTabChange">
        <t-tab-panel value="company" label="公司信息">
          <div class="tab-content">
            <!-- 基础信息 -->
            <div class="form-section">
              <h3 class="section-title">
                <t-icon name="home" class="section-icon" />
                基础信息
              </h3>
              <t-form :data="companyForm" :rules="companyRules" ref="companyFormRef" label-width="120px">
                <t-form-item label="公司名称" name="companyName">
                  <t-input v-model="companyForm.companyName" placeholder="请输入公司名称" maxlength="50" />
                </t-form-item>
                <t-form-item label="公司 Logo">
                  <div class="logo-upload">
                    <div class="logo-preview" v-if="companyForm.companyLogo" @click="triggerLogoUpload">
                      <img :src="companyForm.companyLogo" alt="Logo" />
                      <div class="logo-overlay">
                        <t-icon name="edit" />
                      </div>
                    </div>
                    <div class="logo-placeholder" v-else @click="triggerLogoUpload">
                      <t-icon name="add" size="24px" />
                    </div>
                    <div class="logo-info">
                      <t-button variant="outline" size="small" @click="triggerLogoUpload" :loading="logoUploading">
                        {{ logoUploading ? '上传中...' : '上传新图片' }}
                      </t-button>
                      <p class="logo-tip">支持格式：PNG, JPG。最大限制：2MB。</p>
                    </div>
                    <!-- 隐藏的文件输入框 -->
                    <input
                      ref="logoInputRef"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      style="display: none"
                      @change="handleLogoSelect"
                    />
                  </div>
                </t-form-item>
                <t-form-item label="联系电话" name="contactPhone">
                  <t-input v-model="companyForm.contactPhone" placeholder="请输入联系电话" maxlength="20" />
                </t-form-item>
                <t-form-item label="公司地址" name="companyAddress">
                  <t-textarea v-model="companyForm.companyAddress" placeholder="请输入公司地址" :rows="3" maxlength="200" />
                </t-form-item>
              </t-form>
            </div>

            <!-- 系统偏好设置 -->
            <div class="form-section">
              <h3 class="section-title">
                <t-icon name="setting" class="section-icon" />
                系统偏好设置
              </h3>
              <t-form :data="companyForm" label-width="120px">
                <t-form-item label="维护模式">
                  <div class="switch-item">
                    <t-switch v-model="companyForm.maintenanceMode" />
                    <span class="switch-desc">系统更新维护时开启</span>
                  </div>
                </t-form-item>
                <t-form-item label="默认语言">
                  <t-select v-model="companyForm.defaultLanguage" style="width: 300px;">
                    <t-option value="zh-CN" label="简体中文 (zh-CN)" />
                    <t-option value="en-US" label="英语 (en-US)" />
                  </t-select>
                </t-form-item>
                <t-form-item label="数据备份">
                  <div class="backup-card">
                    <div class="backup-info">
                      <div class="backup-icon">
                        <t-icon name="cloud-upload" size="20px" />
                      </div>
                      <div class="backup-text">
                        <span class="backup-title">自动备份</span>
                        <span class="backup-time">上次备份：{{ lastBackupTime || '暂无备份记录' }}</span>
                      </div>
                    </div>
                    <t-button variant="outline" theme="primary" size="small" @click="handleBackup" :loading="backupLoading">
                      立即备份
                    </t-button>
                  </div>
                </t-form-item>
              </t-form>
            </div>

            <!-- 操作按钮 -->
            <div class="form-actions">
              <t-button variant="outline" @click="resetCompanyForm">取消</t-button>
              <t-button theme="primary" @click="saveCompanySettings" :loading="saveLoading">
                <t-icon name="save" slot="icon" />
                保存更改
              </t-button>
            </div>
          </div>
        </t-tab-panel>

        <t-tab-panel value="permission" label="权限管理">
          <div class="tab-content">
            <!-- 管理员列表 -->
            <div class="list-section">
              <div class="section-header">
                <h3 class="section-title">
                  <t-icon name="user-safety" class="section-icon" />
                  管理员列表
                </h3>
              </div>
              <t-table
                :data="adminList"
                :columns="adminColumns"
                :loading="adminLoading"
                row-key="id"
                hover
                stripe
              >
                <template #status="{ row }">
                  <t-tag :theme="row.status === 'ACTIVE' ? 'success' : 'default'" variant="light">
                    {{ row.status === 'ACTIVE' ? '正常' : '禁用' }}
                  </t-tag>
                </template>
                <template #createdAt="{ row }">
                  {{ formatDate(row.createdAt) }}
                </template>
              </t-table>
            </div>

            <!-- 员工列表 -->
            <div class="list-section" style="margin-top: 24px;">
              <div class="section-header">
                <h3 class="section-title">
                  <t-icon name="usergroup" class="section-icon" />
                  员工列表
                </h3>
              </div>
              <t-table
                :data="staffList"
                :columns="staffColumns"
                :loading="staffLoading"
                row-key="id"
                hover
                stripe
              >
                <template #role="{ row }">
                  <t-tag :theme="row.role === 'WAREHOUSE' ? 'primary' : 'warning'" variant="light">
                    {{ row.role === 'WAREHOUSE' ? '库管' : '货管' }}
                  </t-tag>
                </template>
                <template #status="{ row }">
                  <t-tag :theme="row.status === 'ACTIVE' ? 'success' : 'default'" variant="light">
                    {{ row.status === 'ACTIVE' ? '正常' : '禁用' }}
                  </t-tag>
                </template>
                <template #createdAt="{ row }">
                  {{ formatDate(row.createdAt) }}
                </template>
              </t-table>
            </div>
          </div>
        </t-tab-panel>

        <t-tab-panel value="security" label="数据安全">
          <div class="tab-content">
            <div class="form-section">
              <h3 class="section-title">
                <t-icon name="secured" class="section-icon" />
                安全设置
              </h3>
              <t-form :data="companyForm" label-width="120px">
                <t-form-item label="维护模式">
                  <div class="switch-item">
                    <t-switch v-model="companyForm.maintenanceMode" />
                    <span class="switch-desc">开启后，小程序端将显示维护提示，无法正常使用</span>
                  </div>
                </t-form-item>
                <t-form-item label="自动备份">
                  <div class="switch-item">
                    <t-switch v-model="companyForm.autoBackup" />
                    <span class="switch-desc">每天自动备份数据库</span>
                  </div>
                </t-form-item>
                <t-form-item label="手动备份">
                  <div class="backup-action">
                    <t-button theme="primary" @click="handleBackup" :loading="backupLoading">
                      <t-icon name="cloud-upload" slot="icon" />
                      立即备份
                    </t-button>
                    <span class="backup-hint" v-if="lastBackupTime">上次备份时间：{{ lastBackupTime }}</span>
                  </div>
                </t-form-item>
              </t-form>
            </div>

            <!-- 操作按钮 -->
            <div class="form-actions">
              <t-button variant="outline" @click="resetCompanyForm">取消</t-button>
              <t-button theme="primary" @click="saveCompanySettings" :loading="saveLoading">
                <t-icon name="save" slot="icon" />
                保存更改
              </t-button>
            </div>
          </div>
        </t-tab-panel>

        <t-tab-panel value="logs" label="操作日志">
          <div class="tab-content">
            <!-- 筛选 -->
            <div class="filter-section">
              <t-form :data="logFilters" layout="inline">
                <t-form-item label="操作类型">
                  <t-select v-model="logFilters.action" clearable placeholder="全部" style="width: 150px;">
                    <t-option value="login" label="登录" />
                    <t-option value="logout" label="退出" />
                    <t-option value="create" label="创建" />
                    <t-option value="update" label="更新" />
                    <t-option value="delete" label="删除" />
                    <t-option value="backup" label="备份" />
                  </t-select>
                </t-form-item>
                <t-form-item label="模块">
                  <t-select v-model="logFilters.module" clearable placeholder="全部" style="width: 150px;">
                    <t-option value="settings" label="系统设置" />
                    <t-option value="system" label="系统" />
                    <t-option value="agent" label="代理商" />
                    <t-option value="order" label="订单" />
                    <t-option value="product" label="商品" />
                    <t-option value="stock" label="库存" />
                  </t-select>
                </t-form-item>
                <t-form-item label="日期范围">
                  <t-date-range-picker v-model="logFilters.dateRange" style="width: 280px;" />
                </t-form-item>
                <t-form-item>
                  <t-button theme="primary" @click="loadAuditLogs">查询</t-button>
                  <t-button variant="outline" @click="resetLogFilters" style="margin-left: 8px;">重置</t-button>
                </t-form-item>
              </t-form>
            </div>

            <!-- 日志列表 -->
            <t-table
              :data="auditLogs"
              :columns="logColumns"
              :loading="logLoading"
              :pagination="logPagination"
              row-key="id"
              hover
              stripe
              @page-change="handleLogPageChange"
            >
              <template #empty>
                <EmptyState
                  :type="logFilters.action || logFilters.module ? 'search' : 'data'"
                  :title="logFilters.action || logFilters.module ? '未找到匹配结果' : '暂无操作日志'"
                  :description="logFilters.action || logFilters.module ? '请尝试调整筛选条件' : ''"
                />
              </template>
              <template #action="{ row }">
                <t-tag :theme="getActionTheme(row.action)" variant="light">
                  {{ getActionText(row.action) }}
                </t-tag>
              </template>
              <template #createdAt="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
              <template #detail="{ row }">
                <span class="log-detail" :title="row.detail">{{ truncateText(row.detail, 50) }}</span>
              </template>
            </t-table>
          </div>
        </t-tab-panel>

        <t-tab-panel value="bgm" label="BGM设置">
          <div class="tab-content">
            <!-- BGM设置说明 -->
            <div class="form-section">
              <h3 class="section-title">
                <t-icon name="sound" class="section-icon" />
                背景音乐设置
              </h3>
              <p class="section-desc">上传BGM音乐文件，H5端打开页面时会随机播放一首。用户可手动控制播放/暂停。</p>
              <div class="bgm-actions">
                <t-button theme="primary" @click="showBgmDialog = true">
                  <template #icon><t-icon name="add" /></template>
                  上传BGM
                </t-button>
              </div>
            </div>

            <!-- BGM列表 -->
            <div class="list-section">
              <t-table
                :data="bgmList"
                :columns="bgmColumns"
                :loading="bgmLoading"
                row-key="id"
                hover
                stripe
              >
                <template #empty>
                  <EmptyState
                    type="data"
                    title="暂无BGM"
                    description="点击上方按钮上传背景音乐"
                  />
                </template>
                <template #name="{ row }">
                  <div class="bgm-name-cell">
                    <t-icon name="sound" class="bgm-icon" />
                    <span>{{ row.name }}</span>
                  </div>
                </template>
                <template #isActive="{ row }">
                  <t-switch v-model="row.isActive" @change="handleBgmStatusChange(row)" />
                </template>
                <template #preview="{ row }">
                  <t-button variant="text" theme="primary" @click="previewBgm(row)">
                    <template #icon><t-icon :name="previewingId === row.id ? 'pause' : 'play'" /></template>
                    {{ previewingId === row.id ? '暂停' : '试听' }}
                  </t-button>
                </template>
                <template #operation="{ row }">
                  <t-button variant="text" theme="danger" @click="handleDeleteBgm(row)">
                    删除
                  </t-button>
                </template>
              </t-table>
            </div>
          </div>
        </t-tab-panel>

        <t-tab-panel value="print" label="打印设置">
          <div class="tab-content">
            <!-- 打印功能开关 -->
            <div class="form-section">
              <h3 class="section-title">
                <t-icon name="print" class="section-icon" />
                打印功能
              </h3>
              <t-form :data="printForm" label-width="120px">
                <t-form-item label="启用打印">
                  <div class="switch-item">
                    <t-switch v-model="printForm.enablePrint" />
                    <span class="switch-desc">开启后，库管端/货管端可以打印订单小票</span>
                  </div>
                </t-form-item>
              </t-form>
            </div>

            <!-- 小票内容设置 -->
            <div class="form-section">
              <h3 class="section-title">
                <t-icon name="file" class="section-icon" />
                小票内容设置
              </h3>
              <t-form :data="printForm" label-width="120px">
                <t-form-item label="店铺名称">
                  <t-input v-model="printForm.storeName" placeholder="显示在小票顶部" maxlength="30" style="width: 400px;" />
                </t-form-item>
                <t-form-item label="联系电话">
                  <t-input v-model="printForm.storePhone" placeholder="显示在小票上的联系电话" maxlength="20" style="width: 400px;" />
                </t-form-item>
                <t-form-item label="店铺地址">
                  <t-textarea v-model="printForm.storeAddress" placeholder="显示在小票底部的提货地址" :rows="2" maxlength="100" style="width: 400px;" />
                </t-form-item>
                <t-form-item label="底部提示语">
                  <t-input v-model="printForm.footerText" placeholder="如：请核对商品后签收" maxlength="50" style="width: 400px;" />
                </t-form-item>
              </t-form>
            </div>

            <!-- 打印机设置 -->
            <div class="form-section">
              <h3 class="section-title">
                <t-icon name="setting" class="section-icon" />
                打印机设置
              </h3>
              <t-form :data="printForm" label-width="120px">
                <t-form-item label="纸张宽度">
                  <t-select v-model="printForm.paperWidth" style="width: 200px;">
                    <t-option :value="58" label="58mm (标准热敏纸)" />
                    <t-option :value="80" label="80mm (宽幅热敏纸)" />
                  </t-select>
                </t-form-item>
                <t-form-item label="显示二维码">
                  <div class="switch-item">
                    <t-switch v-model="printForm.showQRCode" />
                    <span class="switch-desc">在小票底部显示提货码二维码（需更多打印空间）</span>
                  </div>
                </t-form-item>
              </t-form>
            </div>

            <!-- 小票预览 -->
            <div class="form-section">
              <h3 class="section-title">
                <t-icon name="browse" class="section-icon" />
                小票预览
              </h3>
              <div class="receipt-preview-wrap">
                <div class="receipt-preview" :style="{ width: printForm.paperWidth + 'mm' }">
                  <div class="receipt-header">
                    <div class="store-name">{{ printForm.storeName || '店铺名称' }}</div>
                    <div class="divider">================================</div>
                  </div>
                  <div class="receipt-info">
                    <div class="info-row">订单号: YH202601130001</div>
                    <div class="info-row">下单时间: 2026-01-13 14:30</div>
                    <div class="divider">--------------------------------</div>
                    <div class="info-row">客户: 张三</div>
                    <div class="info-row">电话: 138****8000</div>
                    <div class="divider">--------------------------------</div>
                  </div>
                  <div class="receipt-products">
                    <div class="products-title">【商品清单】</div>
                    <div class="product-row">1. 示例商品A      x2</div>
                    <div class="product-row">2. 示例商品B      x5</div>
                    <div class="divider">--------------------------------</div>
                  </div>
                  <div class="receipt-amount">
                    <div class="amount-row">商品金额: ¥1,280.00</div>
                    <div class="amount-row">移库费:   ¥50.00</div>
                    <div class="divider">--------------------------------</div>
                    <div class="amount-row total">订单总额: ¥1,330.00</div>
                    <div class="amount-row">支付状态: 已付款</div>
                    <div class="divider">--------------------------------</div>
                  </div>
                  <div class="receipt-code">
                    <div class="pickup-code">提货码: 123456</div>
                  </div>
                  <div class="receipt-footer">
                    <div class="divider">================================</div>
                    <div class="footer-text">{{ printForm.footerText || '请核对商品后签收' }}</div>
                    <div class="divider">================================</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="form-actions">
              <t-button variant="outline" @click="resetPrintForm">取消</t-button>
              <t-button theme="primary" @click="savePrintConfig" :loading="printSaveLoading">
                <t-icon name="save" slot="icon" />
                保存更改
              </t-button>
            </div>
          </div>
        </t-tab-panel>
      </t-tabs>
    </t-card>

    <!-- BGM上传对话框 -->
    <t-dialog
      v-model:visible="showBgmDialog"
      header="上传BGM"
      :confirm-btn="{ content: '上传', loading: bgmUploading }"
      :cancel-btn="{ content: '取消' }"
      @confirm="handleUploadBgm"
    >
      <t-form :data="bgmForm" label-width="80px">
        <t-form-item label="音乐名称" required>
          <t-input v-model="bgmForm.name" placeholder="请输入音乐名称" maxlength="50" />
        </t-form-item>
        <t-form-item label="音乐文件" required>
          <div class="bgm-upload-area">
            <div class="upload-info" v-if="bgmForm.url">
              <t-icon name="check-circle" class="upload-success-icon" />
              <span>文件已选择</span>
            </div>
            <t-button variant="outline" @click="triggerBgmUpload" :loading="bgmFileUploading">
              {{ bgmFileUploading ? '上传中...' : '选择文件' }}
            </t-button>
            <span class="upload-tip">支持 MP3 格式，最大 10MB</span>
            <input
              ref="bgmInputRef"
              type="file"
              accept="audio/mp3,audio/mpeg"
              style="display: none"
              @change="handleBgmFileSelect"
            />
          </div>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 音频预览元素 -->
    <audio ref="previewAudioRef" @ended="previewingId = 0" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { EmptyState } from '@/components'
import { getSettings, updateSettings, executeBackup, getAuditLogs, getAdminList, getStaffList, getPrintConfig, updatePrintConfig } from '@/api/settings'
import { uploadImage, uploadAudio } from '@/api/upload'
import { getBgmList, createBgm, updateBgm, deleteBgm } from '@/api/bgm'

// Tab状态
const activeTab = ref('company')

// 公司设置表单
const companyForm = reactive({
  companyName: '',
  companyLogo: '',
  contactPhone: '',
  companyAddress: '',
  maintenanceMode: false,
  defaultLanguage: 'zh-CN',
  autoBackup: false,
})

// 表单原始数据（用于重置）
const originalForm = ref<typeof companyForm | null>(null)

// 表单验证规则
const companyRules = {
  companyName: [{ required: true, message: '请输入公司名称', trigger: 'blur' }],
  contactPhone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
}

// 打印配置表单
const printForm = reactive({
  enablePrint: true,
  storeName: '蒙庆烟花',
  storePhone: '13190531439',
  storeAddress: '呼和浩特市和林格尔县盛乐镇姑子板村华门世家1号门面房',
  footerText: '请核对商品后签收',
  showQRCode: false,
  paperWidth: 58,
})

// 打印配置原始数据
const originalPrintForm = ref<typeof printForm | null>(null)

// 加载状态
const saveLoading = ref(false)
const backupLoading = ref(false)
const adminLoading = ref(false)
const staffLoading = ref(false)
const logLoading = ref(false)
const logoUploading = ref(false)
const printSaveLoading = ref(false)

// BGM相关
const bgmList = ref<any[]>([])
const bgmLoading = ref(false)
const showBgmDialog = ref(false)
const bgmUploading = ref(false)
const bgmFileUploading = ref(false)
const bgmInputRef = ref<HTMLInputElement>()
const previewAudioRef = ref<HTMLAudioElement>()
const previewingId = ref(0)
const bgmForm = reactive({
  name: '',
  url: '',
})
const bgmColumns = [
  { colKey: 'name', title: '音乐名称', minWidth: 200 },
  { colKey: 'isActive', title: '启用状态', width: 100 },
  { colKey: 'preview', title: '试听', width: 100 },
  { colKey: 'operation', title: '操作', width: 100 },
]

// Logo 上传相关
const logoInputRef = ref<HTMLInputElement>()

// 时间显示
const lastUpdateTime = ref('')
const lastBackupTime = ref('')

// 管理员列表
const adminList = ref<any[]>([])
const adminColumns = [
  { colKey: 'username', title: '用户名', width: 120 },
  { colKey: 'name', title: '姓名', width: 120 },
  { colKey: 'phone', title: '手机号', width: 140 },
  { colKey: 'role', title: '角色', width: 120, cell: () => '超级管理员' },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
]

// 员工列表
const staffList = ref<any[]>([])
const staffColumns = [
  { colKey: 'username', title: '用户名', width: 120 },
  { colKey: 'name', title: '姓名', width: 120 },
  { colKey: 'phone', title: '手机号', width: 140 },
  { colKey: 'role', title: '角色', width: 100 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
]

// 操作日志
const auditLogs = ref<any[]>([])
const logFilters = reactive({
  action: '',
  module: '',
  dateRange: [] as string[],
})
const logPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})
const logColumns = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'userName', title: '操作人', width: 100, cell: ({ row }: any) => row.userName || `用户${row.userId}` },
  { colKey: 'userType', title: '用户类型', width: 100 },
  { colKey: 'action', title: '操作类型', width: 100 },
  { colKey: 'module', title: '模块', width: 100 },
  { colKey: 'detail', title: '详情', minWidth: 200 },
  { colKey: 'ip', title: 'IP地址', width: 130 },
  { colKey: 'createdAt', title: '操作时间', width: 180 },
]

// 加载设置
async function loadSettings() {
  try {
    const res = await getSettings()
    if (res.code === 0) {
      Object.assign(companyForm, res.data)
      originalForm.value = { ...res.data }
      if (res.data.lastBackupTime) {
        lastBackupTime.value = formatDateTime(res.data.lastBackupTime)
      }
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

// 保存公司设置
async function saveCompanySettings() {
  saveLoading.value = true
  try {
    const res = await updateSettings({
      companyName: companyForm.companyName,
      companyLogo: companyForm.companyLogo,
      contactPhone: companyForm.contactPhone,
      companyAddress: companyForm.companyAddress,
      maintenanceMode: companyForm.maintenanceMode,
      defaultLanguage: companyForm.defaultLanguage,
      autoBackup: companyForm.autoBackup,
    })
    if (res.code === 0) {
      MessagePlugin.success('设置保存成功')
      lastUpdateTime.value = formatDateTime(new Date().toISOString())
      originalForm.value = { ...companyForm }
    } else {
      MessagePlugin.error(res.message || '保存失败')
    }
  } catch (error) {
    MessagePlugin.error('保存失败')
  } finally {
    saveLoading.value = false
  }
}

// 重置公司设置表单
function resetCompanyForm() {
  if (originalForm.value) {
    Object.assign(companyForm, originalForm.value)
  }
}

// 触发 Logo 上传
function triggerLogoUpload() {
  logoInputRef.value?.click()
}

// 处理 Logo 选择
async function handleLogoSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  const file = files[0]

  // 检查文件类型
  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
    MessagePlugin.warning('只支持 PNG、JPG 格式的图片')
    input.value = ''
    return
  }

  // 检查文件大小（2MB）
  if (file.size > 2 * 1024 * 1024) {
    MessagePlugin.warning('图片大小不能超过 2MB')
    input.value = ''
    return
  }

  logoUploading.value = true
  try {
    const result = await uploadImage(file)
    companyForm.companyLogo = result.url
    MessagePlugin.success('Logo 上传成功，请点击保存更改')
  } catch (error: any) {
    MessagePlugin.error(error.message || 'Logo 上传失败')
  } finally {
    logoUploading.value = false
    input.value = ''
  }
}

// 执行备份
async function handleBackup() {
  backupLoading.value = true
  try {
    const res = await executeBackup()
    if (res.code === 0) {
      MessagePlugin.success('数据备份成功')
      lastBackupTime.value = formatDateTime(new Date().toISOString())
    } else {
      MessagePlugin.error(res.message || '备份失败')
    }
  } catch (error) {
    MessagePlugin.error('备份失败')
  } finally {
    backupLoading.value = false
  }
}

// 加载管理员列表
async function loadAdminList() {
  adminLoading.value = true
  try {
    const res = await getAdminList()
    if (res.code === 0) {
      adminList.value = res.data.list
    }
  } catch (error) {
    console.error('加载管理员列表失败:', error)
  } finally {
    adminLoading.value = false
  }
}

// 加载员工列表
async function loadStaffList() {
  staffLoading.value = true
  try {
    const res = await getStaffList()
    if (res.code === 0) {
      staffList.value = res.data.list
    }
  } catch (error) {
    console.error('加载员工列表失败:', error)
  } finally {
    staffLoading.value = false
  }
}

// 加载操作日志
async function loadAuditLogs() {
  logLoading.value = true
  try {
    const params: any = {
      page: logPagination.current,
      pageSize: logPagination.pageSize,
    }
    if (logFilters.action) params.action = logFilters.action
    if (logFilters.module) params.module = logFilters.module
    if (logFilters.dateRange && logFilters.dateRange.length === 2) {
      params.startDate = logFilters.dateRange[0]
      params.endDate = logFilters.dateRange[1]
    }

    const res = await getAuditLogs(params)
    if (res.code === 0) {
      auditLogs.value = res.data.list
      logPagination.total = res.data.total
    }
  } catch (error) {
    console.error('加载操作日志失败:', error)
  } finally {
    logLoading.value = false
  }
}

// 重置日志筛选
function resetLogFilters() {
  logFilters.action = ''
  logFilters.module = ''
  logFilters.dateRange = []
  logPagination.current = 1
  loadAuditLogs()
}

// 日志分页变化
function handleLogPageChange({ current, pageSize }: { current: number; pageSize: number }) {
  logPagination.current = current
  logPagination.pageSize = pageSize
  loadAuditLogs()
}

// Tab切换处理
function handleTabChange(value: string) {
  if (value === 'permission') {
    loadAdminList()
    loadStaffList()
  } else if (value === 'logs') {
    loadAuditLogs()
  } else if (value === 'print') {
    loadPrintConfig()
  } else if (value === 'bgm') {
    loadBgmList()
  }
}

// 加载打印配置
async function loadPrintConfig() {
  try {
    const res = await getPrintConfig()
    if (res.code === 0 && res.data) {
      Object.assign(printForm, res.data)
      originalPrintForm.value = { ...res.data }
    }
  } catch (error) {
    console.error('加载打印配置失败:', error)
    // 使用默认值，不报错
  }
}

// 保存打印配置
async function savePrintConfig() {
  printSaveLoading.value = true
  try {
    const res = await updatePrintConfig({
      enablePrint: printForm.enablePrint,
      storeName: printForm.storeName,
      storePhone: printForm.storePhone,
      storeAddress: printForm.storeAddress,
      footerText: printForm.footerText,
      showQRCode: printForm.showQRCode,
      paperWidth: printForm.paperWidth,
    })
    if (res.code === 0) {
      MessagePlugin.success('打印配置保存成功')
      originalPrintForm.value = { ...printForm }
    } else {
      MessagePlugin.error(res.message || '保存失败')
    }
  } catch (error) {
    MessagePlugin.error('保存失败')
  } finally {
    printSaveLoading.value = false
  }
}

// 重置打印配置表单
function resetPrintForm() {
  if (originalPrintForm.value) {
    Object.assign(printForm, originalPrintForm.value)
  }
}

// ============ BGM相关函数 ============

// 加载BGM列表
async function loadBgmList() {
  bgmLoading.value = true
  try {
    const res = await getBgmList()
    if (res.code === 0) {
      bgmList.value = res.data
    }
  } catch (error) {
    console.error('加载BGM列表失败:', error)
  } finally {
    bgmLoading.value = false
  }
}

// 触发BGM文件上传
function triggerBgmUpload() {
  bgmInputRef.value?.click()
}

// 处理BGM文件选择
async function handleBgmFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  const file = files[0]

  // 检查文件类型
  if (!['audio/mp3', 'audio/mpeg'].includes(file.type)) {
    MessagePlugin.warning('只支持 MP3 格式的音频文件')
    input.value = ''
    return
  }

  // 检查文件大小（10MB）
  if (file.size > 10 * 1024 * 1024) {
    MessagePlugin.warning('音频文件大小不能超过 10MB')
    input.value = ''
    return
  }

  // 自动填充文件名
  if (!bgmForm.name) {
    bgmForm.name = file.name.replace(/\.[^/.]+$/, '')
  }

  bgmFileUploading.value = true
  try {
    const result = await uploadAudio(file)
    bgmForm.url = result.url
    MessagePlugin.success('文件上传成功')
  } catch (error: any) {
    MessagePlugin.error(error.message || '文件上传失败')
  } finally {
    bgmFileUploading.value = false
    input.value = ''
  }
}

// 提交上传BGM
async function handleUploadBgm() {
  if (!bgmForm.name) {
    MessagePlugin.warning('请输入音乐名称')
    return
  }
  if (!bgmForm.url) {
    MessagePlugin.warning('请上传音乐文件')
    return
  }

  bgmUploading.value = true
  try {
    const res = await createBgm({
      name: bgmForm.name,
      url: bgmForm.url,
    })
    if (res.code === 0) {
      MessagePlugin.success('BGM添加成功')
      showBgmDialog.value = false
      bgmForm.name = ''
      bgmForm.url = ''
      loadBgmList()
    } else {
      MessagePlugin.error(res.message || '添加失败')
    }
  } catch (error) {
    MessagePlugin.error('添加失败')
  } finally {
    bgmUploading.value = false
  }
}

// 切换BGM状态
async function handleBgmStatusChange(row: any) {
  try {
    await updateBgm(row.id, { isActive: row.isActive })
    MessagePlugin.success(row.isActive ? '已启用' : '已禁用')
  } catch (error) {
    MessagePlugin.error('状态更新失败')
    row.isActive = !row.isActive
  }
}

// 删除BGM
async function handleDeleteBgm(row: any) {
  try {
    await deleteBgm(row.id)
    MessagePlugin.success('删除成功')
    loadBgmList()
  } catch (error) {
    MessagePlugin.error('删除失败')
  }
}

// 试听BGM
function previewBgm(row: any) {
  if (!previewAudioRef.value) return

  if (previewingId.value === row.id) {
    // 暂停
    previewAudioRef.value.pause()
    previewingId.value = 0
  } else {
    // 播放
    previewAudioRef.value.src = row.url
    previewAudioRef.value.play()
    previewingId.value = row.id
  }
}

// 格式化日期
function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

// 格式化日期时间
function formatDateTime(dateStr: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

// 截断文本
function truncateText(text: string, length: number) {
  if (!text) return '-'
  return text.length > length ? text.substring(0, length) + '...' : text
}

// 获取操作类型主题
function getActionTheme(action: string) {
  const themes: Record<string, string> = {
    login: 'success',
    logout: 'default',
    create: 'primary',
    update: 'warning',
    delete: 'danger',
    backup: 'primary',
  }
  return themes[action] || 'default'
}

// 获取操作类型文本
function getActionText(action: string) {
  const texts: Record<string, string> = {
    login: '登录',
    logout: '退出',
    create: '创建',
    update: '更新',
    delete: '删除',
    backup: '备份',
  }
  return texts[action] || action
}

// 初始化
onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-page {
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 4px 0;
}

.page-desc {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.update-time {
  font-size: 13px;
  color: #999;
}

.main-card {
  background: #fff;
  border-radius: 8px;
}

.tab-content {
  padding: 24px 0;
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  color: #e53935;
}

.logo-upload {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.logo-preview {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  position: relative;
  cursor: pointer;
}

.logo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: none;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.logo-preview:hover .logo-overlay {
  display: flex;
}

.logo-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  border: 1px dashed #d0d0d0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  cursor: pointer;
  background: #fafafa;
}

.logo-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.logo-tip {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.switch-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.switch-desc {
  font-size: 13px;
  color: #666;
}

.backup-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  max-width: 400px;
}

.backup-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.backup-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #e3f2fd;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1976d2;
}

.backup-text {
  display: flex;
  flex-direction: column;
}

.backup-title {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
}

.backup-time {
  font-size: 12px;
  color: #999;
}

.backup-action {
  display: flex;
  align-items: center;
  gap: 16px;
}

.backup-hint {
  font-size: 13px;
  color: #666;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.list-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.filter-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.log-detail {
  color: #666;
  font-size: 13px;
}

/* TDesign 样式覆盖 */
:deep(.t-tabs__nav-item) {
  font-size: 14px;
}

:deep(.t-tabs__nav-item.t-is-active) {
  font-weight: 500;
}

:deep(.t-form__item) {
  margin-bottom: 20px;
}

/* 小票预览样式 */
.receipt-preview-wrap {
  display: flex;
  justify-content: center;
  padding: 24px;
  background: #f5f5f5;
  border-radius: 8px;
}

.receipt-preview {
  background: #fff;
  padding: 16px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 58mm;
  max-width: 80mm;
}

.receipt-preview .store-name {
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
}

.receipt-preview .divider {
  text-align: center;
  color: #999;
  margin: 4px 0;
  overflow: hidden;
  white-space: nowrap;
}

.receipt-preview .info-row,
.receipt-preview .product-row,
.receipt-preview .amount-row {
  margin: 4px 0;
}

.receipt-preview .products-title {
  font-weight: bold;
  margin: 8px 0 4px;
}

.receipt-preview .amount-row.total {
  font-weight: bold;
  font-size: 14px;
}

.receipt-preview .pickup-code {
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  margin: 12px 0;
  padding: 8px;
  background: #f0f0f0;
  border-radius: 4px;
}

.receipt-preview .footer-text {
  text-align: center;
  margin: 8px 0;
}

/* BGM设置样式 */
.section-desc {
  font-size: 14px;
  color: #666;
  margin: 0 0 16px 0;
}

.bgm-actions {
  margin-bottom: 24px;
}

.bgm-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bgm-icon {
  color: #e53935;
}

.bgm-upload-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #52c41a;
  font-size: 14px;
}

.upload-success-icon {
  color: #52c41a;
}

.upload-tip {
  font-size: 12px;
  color: #999;
}
</style>
