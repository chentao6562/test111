<script setup lang="ts">
/**
 * 发圈上传页面
 * 【2026-01-20】
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import { post } from '../api/index'

const router = useRouter()

// 上传文件函数
const uploadFile = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('h5_agent_token') || ''}`
    }
  })
  const data = await res.json()
  if (data.code !== 0) {
    throw new Error(data.message || '上传失败')
  }
  return data.data
}

// 表单数据
const imageUrl = ref('')
const shareType = ref('MOMENTS')
const uploading = ref(false)
const submitting = ref(false)

// 发圈类型选项
const shareTypeOptions = [
  { label: '微信朋友圈', value: 'MOMENTS' },
  { label: '小红书', value: 'XIAOHONGSHU' },
]

// 上传图片
const handleUpload = async (file: File) => {
  if (!file) return

  // 检查文件大小（最大5MB）
  if (file.size > 5 * 1024 * 1024) {
    Toast({ message: '图片大小不能超过5MB', theme: 'error' })
    return
  }

  uploading.value = true
  try {
    const result = await uploadFile(file)
    imageUrl.value = result.url
    Toast({ message: '上传成功', theme: 'success' })
  } catch (err: any) {
    Toast({ message: err.message || '上传失败', theme: 'error' })
  } finally {
    uploading.value = false
  }
}

// 选择图片
const handleSelectImage = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }
  input.click()
}

// 删除图片
const handleRemoveImage = () => {
  imageUrl.value = ''
}

// 提交
const handleSubmit = async () => {
  if (!imageUrl.value) {
    Toast({ message: '请先上传发圈截图', theme: 'warning' })
    return
  }

  submitting.value = true
  try {
    const res = await post('/shares', {
      imageUrl: imageUrl.value,
      shareType: shareType.value,
    })

    if (res.code === 0) {
      Dialog.confirm({
        title: '提交成功',
        content: '您的发圈已提交，等待管理员审核。首次发圈审核通过将获得5元代金券奖励！',
        confirmBtn: '查看我的发圈',
        cancelBtn: '返回',
        onConfirm: () => {
          router.push('/my-shares')
        },
        onCancel: () => {
          router.back()
        }
      })
    }
  } catch (err: any) {
    Toast({ message: err.message || '提交失败', theme: 'error' })
  } finally {
    submitting.value = false
  }
}

// 返回
const handleBack = () => {
  router.back()
}
</script>

<template>
  <div class="share-upload-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="handleBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">发圈打卡</div>
      <div class="nav-right"></div>
    </div>

    <div class="content">
      <!-- 说明卡片 -->
      <div class="tip-card">
        <div class="tip-icon">
          <t-icon name="lightbulb" />
        </div>
        <div class="tip-content">
          <div class="tip-title">发圈奖励规则</div>
          <div class="tip-desc">
            <p>1. 首次发圈审核通过可获得 <span class="highlight">5元</span> 代金券</p>
            <p>2. 每周发圈满7天可获得 <span class="highlight">20元</span> 全勤奖励</p>
            <p>3. 请确保截图清晰、内容真实</p>
          </div>
        </div>
      </div>

      <!-- 表单区域 -->
      <div class="form-section">
        <!-- 选择类型 -->
        <div class="form-item">
          <div class="form-label">发布平台</div>
          <div class="type-options">
            <div
              v-for="option in shareTypeOptions"
              :key="option.value"
              class="type-option"
              :class="{ active: shareType === option.value }"
              @click="shareType = option.value"
            >
              <div class="option-icon" :class="option.value.toLowerCase()">
                <t-icon :name="option.value === 'MOMENTS' ? 'logo-wechat' : 'logo-xiaohongshu'" />
              </div>
              <div class="option-label">{{ option.label }}</div>
            </div>
          </div>
        </div>

        <!-- 上传图片 -->
        <div class="form-item">
          <div class="form-label">发圈截图</div>
          <div class="upload-area" v-if="!imageUrl" @click="handleSelectImage">
            <div class="upload-content" v-if="!uploading">
              <t-icon name="add" class="upload-icon" />
              <div class="upload-text">点击上传截图</div>
              <div class="upload-hint">支持 jpg、png 格式，大小不超过5MB</div>
            </div>
            <div class="upload-loading" v-else>
              <t-loading />
              <div class="loading-text">上传中...</div>
            </div>
          </div>
          <div class="preview-area" v-else>
            <img :src="imageUrl" class="preview-image" @click="handleSelectImage" />
            <div class="preview-remove" @click.stop="handleRemoveImage">
              <t-icon name="close" />
            </div>
            <div class="preview-tip">点击图片可重新上传</div>
          </div>
        </div>
      </div>

      <!-- 提交按钮 -->
      <div class="submit-section">
        <t-button
          block
          theme="primary"
          size="large"
          :loading="submitting"
          @click="handleSubmit"
        >
          提交审核
        </t-button>
      </div>

      <!-- 温馨提示 -->
      <div class="bottom-tip">
        <t-icon name="info-circle" />
        <span>截图需包含完整的朋友圈/笔记内容，审核通过后奖励自动到账</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.share-upload-page {
  min-height: 100vh;
  background: var(--td-bg-color-page);
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-back {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.nav-right {
  width: 44px;
}

.content {
  padding: 16px;
}

/* 提示卡片 */
.tip-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
  margin-bottom: 16px;
}

.tip-icon {
  width: 36px;
  height: 36px;
  background: #f59e0b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  flex-shrink: 0;
}

.tip-content {
  flex: 1;
}

.tip-title {
  font-size: 15px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 8px;
}

.tip-desc {
  font-size: 13px;
  color: #a16207;
  line-height: 1.6;
}

.tip-desc p {
  margin: 0 0 4px;
}

.tip-desc .highlight {
  color: #dc2626;
  font-weight: 600;
}

/* 表单区域 */
.form-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.form-item {
  margin-bottom: 20px;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--td-text-color-primary);
  margin-bottom: 12px;
}

/* 类型选项 */
.type-options {
  display: flex;
  gap: 12px;
}

.type-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: var(--td-bg-color-page);
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s;
}

.type-option.active {
  border-color: var(--td-brand-color);
  background: var(--td-brand-color-light);
}

.option-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 8px;
}

.option-icon.moments {
  background: #07c160;
  color: #fff;
}

.option-icon.xiaohongshu {
  background: #fe2c55;
  color: #fff;
}

.option-label {
  font-size: 13px;
  color: var(--td-text-color-secondary);
}

.type-option.active .option-label {
  color: var(--td-brand-color);
  font-weight: 500;
}

/* 上传区域 */
.upload-area {
  height: 200px;
  background: var(--td-bg-color-page);
  border: 2px dashed var(--td-border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:active {
  border-color: var(--td-brand-color);
  background: var(--td-brand-color-light);
}

.upload-content {
  text-align: center;
}

.upload-icon {
  font-size: 40px;
  color: var(--td-text-color-placeholder);
  margin-bottom: 8px;
}

.upload-text {
  font-size: 14px;
  color: var(--td-text-color-secondary);
  margin-bottom: 4px;
}

.upload-hint {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.upload-loading {
  text-align: center;
}

.loading-text {
  font-size: 14px;
  color: var(--td-text-color-secondary);
  margin-top: 8px;
}

/* 预览区域 */
.preview-area {
  position: relative;
}

.preview-image {
  width: 100%;
  border-radius: 8px;
  cursor: pointer;
}

.preview-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
}

.preview-tip {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  text-align: center;
  margin-top: 8px;
}

/* 提交按钮 */
.submit-section {
  margin-bottom: 16px;
}

/* 底部提示 */
.bottom-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  padding: 0 8px;
}

.bottom-tip .t-icon {
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
