<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { get, getOptimizedImageUrl } from '../api'
import { useUserStore } from '../stores/user'
import QRCodeComponent from '../components/QRCode.vue'
import { generateProductPoster, downloadPoster } from '../utils/posterGenerator'
import { getPromotionCopies, getBrandAssets } from '../api/promotionMaterial'
import { getDisplayPrice, getOriginalPrice } from '../utils/priceUtils'
import type { PromotionCopy, BrandAsset } from '../api/promotionMaterial'

const router = useRouter()
const userStore = useUserStore()

// 当前Tab
const activeTab = ref('poster')

// 推销员信息（用于二维码和海报）
const currentSalespersonId = computed(() => userStore.currentSalespersonId)
const userName = computed(() => {
  // 优先使用扫码绑定的推销员名称
  if (userStore.salespersonInfo?.name) {
    return userStore.salespersonInfo.name
  }
  return userStore.userInfo?.name || '推销员'
})
// 是否可以生成海报（需要有推销员ID）
const canGeneratePoster = computed(() => !!currentSalespersonId.value)

// 基础URL（用于模板中）
const baseUrl = computed(() => typeof window !== 'undefined' ? window.location.origin : '')

// 二维码内容（包含推销员ID）
const qrContent = computed(() => {
  if (!currentSalespersonId.value) return ''
  return `${baseUrl.value}/?s=${currentSalespersonId.value}`
})

// ============ 商品海报 ============
interface ProductItem {
  id: number
  name: string
  images: string | string[]
  displayPrice: number
  retailPrice: number
  masterRetailPrice?: number
  unit: string
}

const products = ref<ProductItem[]>([])
const productsLoading = ref(false)
const selectedProduct = ref<ProductItem | null>(null)
const posterDialogVisible = ref(false)
const posterGenerating = ref(false)
const posterDataUrl = ref('')
const posterTemplate = ref<'red' | 'gold' | 'simple'>('red')

// 加载商品列表
const loadProducts = async () => {
  productsLoading.value = true
  try {
    const res = await get<any>('/shop/products', { s: currentSalespersonId.value, pageSize: 50 })
    products.value = res.data?.list || []
  } catch (error) {
    Toast({ message: '加载商品失败', theme: 'error' })
  } finally {
    productsLoading.value = false
  }
}

// 获取商品图片（使用优化后的URL）
const getProductImage = (product: ProductItem): string => {
  return getOptimizedImageUrl(product.images, 'medium')
}

// 打开海报生成弹窗
const openPosterDialog = (product: ProductItem) => {
  selectedProduct.value = product
  posterDataUrl.value = ''
  posterDialogVisible.value = true
}

// 二维码引用和数据
const posterQrRef = ref<InstanceType<typeof QRCodeComponent>>()
const posterQrDataUrl = ref('')

// 二维码生成完成
const onPosterQrReady = () => {
  if (posterQrRef.value?.canvas) {
    posterQrDataUrl.value = posterQrRef.value.canvas.toDataURL('image/png')
  }
}

// 生成海报
const generatePoster = async () => {
  if (!canGeneratePoster.value) {
    Toast({ message: '请先登录后再生成海报', theme: 'warning' })
    return
  }
  if (!selectedProduct.value || !posterQrDataUrl.value) {
    Toast({ message: '请等待二维码生成', theme: 'warning' })
    return
  }

  posterGenerating.value = true
  try {
    const product = selectedProduct.value
    const imageUrl = getProductImage(product)

    // 获取完整图片URL
    const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${window.location.origin}${imageUrl}`

    posterDataUrl.value = await generateProductPoster({
      product: {
        name: product.name,
        image: fullImageUrl,
        price: getDisplayPrice(product),
        originalPrice: getOriginalPrice(product) || undefined,
        unit: product.unit
      },
      salesperson: {
        name: userName.value
      },
      qrCodeDataUrl: posterQrDataUrl.value,
      template: posterTemplate.value
    })
  } catch (error) {
    console.error('生成海报失败:', error)
    Toast({ message: '生成海报失败，请重试', theme: 'error' })
  } finally {
    posterGenerating.value = false
  }
}

// 保存海报
const savePoster = () => {
  if (!posterDataUrl.value) {
    Toast({ message: '请先生成海报', theme: 'warning' })
    return
  }
  const productName = selectedProduct.value?.name || '商品'
  downloadPoster(posterDataUrl.value, `${productName}-推广海报.jpg`)
  Toast({ message: '海报已保存', theme: 'success' })
}

// ============ 推广文案 ============
const copyType = ref('')
const copies = ref<PromotionCopy[]>([])
const copiesLoading = ref(false)

const copyTypeOptions = [
  { label: '全部', value: '' },
  { label: '朋友圈', value: 'MOMENTS' },
  { label: '客户话术', value: 'TALK' },
  { label: '商品卖点', value: 'PRODUCT' }
]

const loadCopies = async () => {
  copiesLoading.value = true
  try {
    const res = await getPromotionCopies(copyType.value || undefined)
    copies.value = res.data || []
  } catch (error) {
    Toast({ message: '加载文案失败', theme: 'error' })
  } finally {
    copiesLoading.value = false
  }
}

// 复制文案
const copyCopyContent = async (copy: PromotionCopy) => {
  try {
    await navigator.clipboard.writeText(copy.content)
    Toast({ message: '文案已复制', theme: 'success' })
  } catch {
    // 降级方案
    const input = document.createElement('textarea')
    input.value = copy.content
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    Toast({ message: '文案已复制', theme: 'success' })
  }
}

// 获取文案类型标签
const getCopyTypeLabel = (type: string) => {
  const option = copyTypeOptions.find(o => o.value === type)
  return option ? option.label : type
}

// ============ 品牌素材 ============
const assetType = ref('')
const assets = ref<BrandAsset[]>([])
const assetsLoading = ref(false)
const previewAsset = ref<BrandAsset | null>(null)
const previewVisible = ref(false)

const assetTypeOptions = [
  { label: '全部', value: '' },
  { label: 'LOGO', value: 'LOGO' },
  { label: '产品图', value: 'PHOTO' },
  { label: '视频', value: 'VIDEO' },
  { label: '海报', value: 'POSTER' }
]

const loadAssets = async () => {
  assetsLoading.value = true
  try {
    const res = await getBrandAssets(assetType.value || undefined)
    assets.value = res.data || []
  } catch (error) {
    Toast({ message: '加载素材失败', theme: 'error' })
  } finally {
    assetsLoading.value = false
  }
}

// 获取素材图片URL
const getAssetUrl = (asset: BrandAsset): string => {
  if (asset.type === 'VIDEO' && asset.thumbnail) {
    return asset.thumbnail
  }
  return asset.url
}

// 预览素材
const openPreview = (asset: BrandAsset) => {
  previewAsset.value = asset
  previewVisible.value = true
}

// 下载素材
const downloadAsset = (asset: BrandAsset) => {
  const link = document.createElement('a')
  link.href = asset.url
  link.download = asset.name
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  Toast({ message: '开始下载', theme: 'success' })
}

// Tab切换处理
const onTabChange = (tab: string | number) => {
  activeTab.value = tab as string
  if (tab === 'poster' && products.value.length === 0) {
    loadProducts()
  } else if (tab === 'copy' && copies.value.length === 0) {
    loadCopies()
  } else if (tab === 'asset' && assets.value.length === 0) {
    loadAssets()
  }
}

// 返回
const goBack = () => router.back()

onMounted(() => {
  loadProducts()
})
</script>

<template>
  <div class="promotion-material-page">
    <!-- 导航栏 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">
        <t-icon name="chevron-left" size="24px" />
      </div>
      <div class="nav-title">推广资料</div>
      <div class="nav-placeholder"></div>
    </div>

    <!-- Tab切换 -->
    <div class="tab-wrapper">
      <t-tabs :value="activeTab" @change="onTabChange">
        <t-tab-panel value="poster" label="商品海报" />
        <t-tab-panel value="copy" label="推广文案" />
        <t-tab-panel value="asset" label="品牌素材" />
      </t-tabs>
    </div>

    <!-- 【2026-01-23】门店信息提示卡片 - 突出线下到店自提 -->
    <div class="store-info-card">
      <div class="store-badge">
        <t-icon name="shop" size="20px" />
        <span>线下门店 · 到店自提</span>
      </div>
      <div class="store-detail">
        <div class="store-address">
          <t-icon name="location" size="18px" />
          <span>呼和浩特市和林格尔县盛乐镇姑子板村华门世家1号门面房</span>
        </div>
        <div class="store-phone">
          <t-icon name="call" size="18px" />
          <span>13190531439 / 15849390600</span>
        </div>
      </div>
      <div class="store-notice">
        <t-icon name="info-circle" size="16px" />
        <span>烟花爆竹属危险品，仅限到店自提，不支持快递配送</span>
      </div>
    </div>

    <!-- 商品海报Tab -->
    <div v-show="activeTab === 'poster'" class="tab-content">
      <div v-if="productsLoading" class="loading-wrap">
        <t-loading theme="circular" size="40px" />
      </div>
      <div v-else-if="products.length === 0" class="empty-state">
        <t-icon name="image" size="48px" />
        <p>暂无商品</p>
      </div>
      <div v-else class="product-grid">
        <div
          v-for="product in products"
          :key="product.id"
          class="product-card"
          @click="openPosterDialog(product)"
        >
          <div class="product-image">
            <img :src="getProductImage(product)" :alt="product.name" />
            <div class="poster-badge">
              <t-icon name="image" size="14px" />
              <span>生成海报</span>
            </div>
          </div>
          <div class="product-info">
            <div class="product-name">{{ product.name }}</div>
            <div class="product-price">¥{{ Number(product.displayPrice).toFixed(2) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 推广文案Tab -->
    <div v-show="activeTab === 'copy'" class="tab-content">
      <!-- 分类筛选 -->
      <div class="filter-bar">
        <div
          v-for="option in copyTypeOptions"
          :key="option.value"
          class="filter-item"
          :class="{ active: copyType === option.value }"
          @click="copyType = option.value; loadCopies()"
        >
          {{ option.label }}
        </div>
      </div>

      <div v-if="copiesLoading" class="loading-wrap">
        <t-loading theme="circular" size="40px" />
      </div>
      <div v-else-if="copies.length === 0" class="empty-state">
        <t-icon name="file-unknown" size="48px" />
        <p>暂无文案</p>
      </div>
      <div v-else class="copy-list">
        <div
          v-for="copy in copies"
          :key="copy.id"
          class="copy-card"
        >
          <div class="copy-header">
            <div class="copy-title">{{ copy.title }}</div>
            <div class="copy-type-tag" :class="copy.type.toLowerCase()">
              {{ getCopyTypeLabel(copy.type) }}
            </div>
          </div>
          <div class="copy-content">{{ copy.content }}</div>
          <div class="copy-footer">
            <t-button
              theme="primary"
              size="small"
              @click="copyCopyContent(copy)"
            >
              <t-icon name="file-copy" />
              一键复制
            </t-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 品牌素材Tab -->
    <div v-show="activeTab === 'asset'" class="tab-content">
      <!-- 分类筛选 -->
      <div class="filter-bar">
        <div
          v-for="option in assetTypeOptions"
          :key="option.value"
          class="filter-item"
          :class="{ active: assetType === option.value }"
          @click="assetType = option.value; loadAssets()"
        >
          {{ option.label }}
        </div>
      </div>

      <div v-if="assetsLoading" class="loading-wrap">
        <t-loading theme="circular" size="40px" />
      </div>
      <div v-else-if="assets.length === 0" class="empty-state">
        <t-icon name="folder-open" size="48px" />
        <p>暂无素材</p>
      </div>
      <div v-else class="asset-grid">
        <div
          v-for="asset in assets"
          :key="asset.id"
          class="asset-card"
        >
          <div class="asset-preview" @click="openPreview(asset)">
            <img v-if="asset.type !== 'VIDEO'" :src="getAssetUrl(asset)" :alt="asset.name" />
            <div v-else class="video-preview">
              <img v-if="asset.thumbnail" :src="asset.thumbnail" :alt="asset.name" />
              <t-icon name="play-circle-filled" size="40px" class="play-icon" />
            </div>
          </div>
          <div class="asset-info">
            <div class="asset-name">{{ asset.name }}</div>
            <t-button
              size="small"
              variant="outline"
              @click.stop="downloadAsset(asset)"
            >
              <t-icon name="download" />
              下载
            </t-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 海报生成弹窗 -->
    <t-popup v-model="posterDialogVisible" placement="bottom">
      <div class="poster-dialog">
        <div class="dialog-header">
          <div class="dialog-title">生成商品海报</div>
          <t-icon name="close" size="24px" class="dialog-close" @click="posterDialogVisible = false" />
        </div>

        <div class="dialog-content">
          <!-- 未登录提示 -->
          <div v-if="!canGeneratePoster" class="login-tip">
            <t-icon name="info-circle" size="24px" />
            <p>请先登录后再生成海报</p>
            <t-button size="small" theme="primary" @click="router.push('/login')">去登录</t-button>
          </div>

          <!-- 隐藏的二维码组件用于生成 -->
          <div v-if="canGeneratePoster" style="position: absolute; left: -9999px;">
            <QRCodeComponent
              v-if="selectedProduct"
              ref="posterQrRef"
              :content="qrContent"
              :size="200"
              @ready="onPosterQrReady"
            />
          </div>

          <!-- 模板选择 -->
          <div class="template-section">
            <div class="section-label">选择模板</div>
            <div class="template-options">
              <div
                class="template-item"
                :class="{ active: posterTemplate === 'red' }"
                @click="posterTemplate = 'red'"
              >
                <div class="template-preview red"></div>
                <span>喜庆红</span>
              </div>
              <div
                class="template-item"
                :class="{ active: posterTemplate === 'gold' }"
                @click="posterTemplate = 'gold'"
              >
                <div class="template-preview gold"></div>
                <span>金色</span>
              </div>
              <div
                class="template-item"
                :class="{ active: posterTemplate === 'simple' }"
                @click="posterTemplate = 'simple'"
              >
                <div class="template-preview simple"></div>
                <span>简约蓝</span>
              </div>
            </div>
          </div>

          <!-- 海报预览 -->
          <div class="poster-preview-area">
            <div v-if="!posterDataUrl && !posterGenerating" class="preview-placeholder">
              <t-icon name="image" size="48px" />
              <p>点击下方按钮生成海报</p>
            </div>
            <div v-else-if="posterGenerating" class="preview-loading">
              <t-loading theme="circular" size="40px" />
              <p>海报生成中...</p>
            </div>
            <img
              v-else
              :src="posterDataUrl"
              class="poster-preview-img"
              alt="海报预览"
            />
          </div>

          <!-- 操作按钮 -->
          <div class="dialog-actions">
            <t-button
              block
              theme="primary"
              variant="outline"
              :loading="posterGenerating"
              @click="generatePoster"
            >
              {{ posterDataUrl ? '重新生成' : '生成海报' }}
            </t-button>
            <t-button
              v-if="posterDataUrl"
              block
              theme="primary"
              @click="savePoster"
            >
              保存海报
            </t-button>
          </div>
        </div>
      </div>
    </t-popup>

    <!-- 素材预览弹窗 -->
    <t-popup v-model="previewVisible" placement="center">
      <div class="preview-dialog" v-if="previewAsset">
        <div class="preview-close" @click="previewVisible = false">
          <t-icon name="close" size="24px" />
        </div>
        <video
          v-if="previewAsset.type === 'VIDEO'"
          :src="previewAsset.url"
          controls
          class="preview-video"
        />
        <img
          v-else
          :src="previewAsset.url"
          :alt="previewAsset.name"
          class="preview-image"
        />
      </div>
    </t-popup>
  </div>
</template>

<style scoped>
.promotion-material-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 20px;
}

/* 导航栏 */
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  z-index: 100;
  border-bottom: 1px solid #eee;
}

.nav-back, .nav-placeholder {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  font-size: 16px;
  font-weight: 500;
}

/* Tab */
.tab-wrapper {
  position: fixed;
  top: 44px;
  left: 0;
  right: 0;
  background: #fff;
  z-index: 99;
}

.tab-content {
  margin-top: 12px;
  padding: 12px;
}

/* 【2026-01-23】门店信息卡片 - 合规提示 */
.store-info-card {
  margin: 94px 12px 0;
  background: linear-gradient(135deg, #FFF3E0 0%, #FFECB3 100%);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #FFE082;
}

.store-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
  color: #E65100;
  margin-bottom: 12px;
}

.store-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.store-address, .store-phone {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  color: #5D4037;
}

.store-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(230, 81, 0, 0.1);
  border-radius: 8px;
  font-size: 12px;
  color: #BF360C;
  font-weight: 500;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 8px;
  padding: 8px 0;
  overflow-x: auto;
  margin-bottom: 12px;
}

.filter-item {
  flex-shrink: 0;
  padding: 6px 16px;
  background: #fff;
  border-radius: 20px;
  font-size: 13px;
  color: #666;
  border: 1px solid #e0e0e0;
}

.filter-item.active {
  background: #E53935;
  color: #fff;
  border-color: #E53935;
}

/* 加载和空状态 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #999;
}

.empty-state p {
  margin-top: 12px;
  font-size: 14px;
}

/* 商品网格 */
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.product-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.product-image {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.poster-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.product-info {
  padding: 10px;
}

.product-name {
  font-size: 13px;
  color: #333;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}

.product-price {
  font-size: 16px;
  font-weight: 600;
  color: #E53935;
}

/* 文案列表 */
.copy-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.copy-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.copy-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.copy-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.copy-type-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.copy-type-tag.moments {
  background: #E3F2FD;
  color: #1976D2;
}

.copy-type-tag.talk {
  background: #E8F5E9;
  color: #388E3C;
}

.copy-type-tag.product {
  background: #FFF3E0;
  color: #F57C00;
}

.copy-content {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
  margin-bottom: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

.copy-footer {
  display: flex;
  justify-content: flex-end;
}

/* 素材网格 */
.asset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.asset-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.asset-preview {
  aspect-ratio: 1;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.asset-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-preview {
  position: relative;
  width: 100%;
  height: 100%;
}

.video-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.asset-info {
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.asset-name {
  font-size: 13px;
  color: #333;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 海报弹窗 */
.poster-dialog {
  background: #fff;
  border-radius: 16px 16px 0 0;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.dialog-title {
  font-size: 16px;
  font-weight: 500;
}

.dialog-close {
  color: #999;
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.template-section {
  margin-bottom: 16px;
}

.section-label {
  font-size: 14px;
  color: #333;
  margin-bottom: 12px;
}

.template-options {
  display: flex;
  gap: 16px;
}

.template-item {
  flex: 1;
  text-align: center;
  cursor: pointer;
}

.template-preview {
  height: 60px;
  border-radius: 8px;
  margin-bottom: 8px;
  border: 2px solid transparent;
}

.template-item.active .template-preview {
  border-color: #E53935;
}

.template-preview.red {
  background: linear-gradient(135deg, #E53935, #FF6B6B);
}

.template-preview.gold {
  background: linear-gradient(135deg, #FF8C00, #FFD700);
}

.template-preview.simple {
  background: linear-gradient(135deg, #1976D2, #64B5F6);
}

.template-item span {
  font-size: 12px;
  color: #666;
}

.template-item.active span {
  color: #E53935;
  font-weight: 500;
}

.poster-preview-area {
  background: #f5f5f5;
  border-radius: 12px;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  overflow: hidden;
}

.preview-placeholder, .preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #999;
}

.preview-placeholder p, .preview-loading p {
  margin-top: 12px;
  font-size: 14px;
}

.poster-preview-img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.dialog-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 未登录提示 */
.login-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
  text-align: center;
}

.login-tip p {
  margin: 12px 0;
  font-size: 14px;
}

/* 素材预览弹窗 */
.preview-dialog {
  position: relative;
  background: #000;
  max-width: 90vw;
  max-height: 80vh;
  border-radius: 8px;
  overflow: hidden;
}

.preview-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  z-index: 10;
}

.preview-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
}

.preview-video {
  max-width: 100%;
  max-height: 80vh;
}
</style>
