<script setup lang="ts">
/**
 * 套餐列表页面
 * 【2026-01-25】新增套餐功能
 * 【2026-01-27】新增：无主图套餐自动生成拼接图+价格爆炸贴
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { getOptimizedImageUrl } from '../../api'
import {
  getPackageList,
  getPositioningLabel,
  getPositioningColor,
  type Package
} from '../../api/package'
import { useUserStore } from '../../stores/user'
import {
  generatePackageThumbnail,
  shouldGenerateThumbnail,
  extractProductImages
} from '../../utils/packageThumbnailGenerator'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const packages = ref<Package[]>([])
const activeTab = ref('全部')

// 【2026-01-27】缩略图缓存：packageId -> dataUrl
const thumbnailCache = ref<Record<number, string>>({})

// 【2026-01-26】简化为3个分类Tab
const tabOptions = [
  { value: '全部', label: '全部' },
  { value: '家庭推荐', label: '家庭推荐' },
  { value: '尊享款', label: '尊享款' }
]

// 过滤后的套餐列表
const filteredPackages = computed(() => {
  if (activeTab.value === '全部') return packages.value
  if (activeTab.value === '家庭推荐') {
    // 包含：儿童首选、入门首选、家庭主推、经典升级
    return packages.value.filter(p =>
      ['儿童首选', '入门首选', '家庭主推', '经典升级'].includes(p.targetAudience || '')
    )
  }
  if (activeTab.value === '尊享款') {
    // 包含：寓意吉祥、土豪专属
    return packages.value.filter(p =>
      ['寓意吉祥', '土豪专属'].includes(p.targetAudience || '')
    )
  }
  return packages.value
})

// 是否是推销员（可以设置定价）
const isAgent = computed(() => {
  return userStore.userInfo?.type === 'LEVEL1' || userStore.userInfo?.type === 'LEVEL2'
})

// 加载套餐列表
const loadPackages = async () => {
  loading.value = true
  try {
    const res = await getPackageList({ pageSize: 100 })
    packages.value = res.data?.list || []
  } catch {
    Toast({ message: '加载失败', theme: 'error' })
  } finally {
    loading.value = false
  }
}

// 查看套餐详情
const goToDetail = (pkg: Package) => {
  router.push(`/packages/${pkg.id}`)
}

// 格式化价格
const formatPrice = (price: number | undefined | null): string => {
  if (price === undefined || price === null) return '-'
  return `¥${price.toFixed(2)}`
}

// 【2026-01-27】获取套餐图片（支持拼接图）
const getPackageImage = (pkg: Package): string => {
  // 1. 有主图的套餐，直接返回主图
  if (pkg.images && pkg.images.length > 0 && pkg.images[0]) {
    return getOptimizedImageUrl(pkg.images[0], 'medium')
  }

  // 2. 检查缓存中是否有生成的拼接图
  const cached = thumbnailCache.value[pkg.id]
  if (cached) {
    return cached
  }

  // 3. 返回占位图（拼接图会异步生成后更新）
  return '/placeholder.png'
}

// 计算毛利率显示 - grossMargin已经是百分比数值（如63表示63%）
const getGrossMarginDisplay = (pkg: Package): string => {
  if (pkg.grossMargin !== null && pkg.grossMargin !== undefined) {
    return `${Number(pkg.grossMargin).toFixed(0)}%`
  }
  return '-'
}

// 【2026-01-26】获取套餐显示价格
// 后端已根据用户认证信息返回正确的 displayPrice：
// - 一级推销员：displayPrice = supplyPrice（拿货价）
// - 二级推销员：displayPrice = 上级subPrice 或 supplyPrice
// - 客户：displayPrice = masterRetailPrice（零售价）
const getPackageDisplayPrice = (pkg: Package): number | undefined => {
  return pkg.displayPrice || pkg.masterRetailPrice
}

// 【2026-01-27】为没有主图的套餐生成拼接图
const generateThumbnails = async () => {
  for (const pkg of packages.value) {
    // 检查是否需要生成
    if (!shouldGenerateThumbnail(pkg)) continue

    // 检查是否已有缓存
    if (thumbnailCache.value[pkg.id]) continue

    // 检查是否有商品图片可用
    const productImages = extractProductImages(pkg.items || [])
    if (productImages.length === 0) continue

    try {
      // 【2026-01-27】爆炸贴使用建议零售价（masterRetailPrice）
      const price = Number(pkg.masterRetailPrice) || 0

      // 生成缩略图
      const dataUrl = await generatePackageThumbnail({
        packageId: pkg.id,
        productImages,
        price
      })

      // 存入缓存（触发响应式更新）
      thumbnailCache.value = { ...thumbnailCache.value, [pkg.id]: dataUrl }
    } catch (err) {
      console.warn(`生成套餐${pkg.id}缩略图失败:`, err)
    }
  }
}

onMounted(async () => {
  await loadPackages()
  // 异步生成拼接图
  generateThumbnails()
})
</script>

<template>
  <div class="package-list-page">
    <!-- 【2026-01-26】顶部导航栏 -->
    <div class="nav-bar">
      <div class="nav-back" @click="router.back()">
        <span class="back-icon">‹</span>
      </div>
      <div class="nav-title">套餐专区</div>
      <div class="nav-right"></div>
    </div>

    <!-- 顶部Tab - 3个分类 -->
    <div class="tab-container">
      <div
        v-for="tab in tabOptions"
        :key="tab.value"
        class="tab-item"
        :class="{ active: activeTab === tab.value }"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- 套餐列表 -->
    <div class="package-container">
      <t-loading v-if="loading" size="40px" text="加载中..." />

      <t-empty v-else-if="filteredPackages.length === 0" description="暂无套餐" />

      <div v-else class="package-grid">
        <div
          v-for="pkg in filteredPackages"
          :key="pkg.id"
          class="package-card"
          @click="goToDetail(pkg)"
        >
          <!-- 套餐图片 -->
          <div class="card-image">
            <img :src="getPackageImage(pkg)" :alt="pkg.name" />
            <div
              class="positioning-tag"
              :style="{ backgroundColor: getPositioningColor(pkg.positioning) }"
            >
              {{ getPositioningLabel(pkg.positioning) }}
            </div>
          </div>

          <!-- 套餐信息 -->
          <div class="card-info">
            <div class="pkg-name">{{ pkg.name }}</div>

            <div class="pkg-tags" v-if="pkg.sceneTags && pkg.sceneTags.length">
              <span
                v-for="(tag, idx) in pkg.sceneTags.slice(0, 2)"
                :key="idx"
                class="scene-tag"
              >
                {{ tag }}
              </span>
            </div>

            <div class="price-row">
              <div class="current-price">
                {{ formatPrice(getPackageDisplayPrice(pkg)) }}
              </div>
              <div class="original-price" v-if="pkg.originalPrice && pkg.originalPrice > (getPackageDisplayPrice(pkg) || 0)">
                原价 {{ formatPrice(pkg.originalPrice) }}
              </div>
            </div>

            <div class="stats-row" v-if="isAgent">
              <span class="profit-tag">
                毛利率 {{ getGrossMarginDisplay(pkg) }}
              </span>
              <span class="item-count">{{ pkg.items?.length || 0 }}件商品</span>
            </div>
            <div class="stats-row" v-else>
              <span class="saved-tag" v-if="pkg.savedAmount && pkg.savedAmount > 0">
                省 ¥{{ pkg.savedAmount.toFixed(0) }}
              </span>
              <span class="item-count">{{ pkg.items?.length || 0 }}件商品</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.package-list-page {
  min-height: 100vh;
  background: #f5f5f5;
}

/* 【2026-01-26】顶部导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 16px;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid #f0f0f0;
}

.nav-back {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
}

.back-icon {
  font-size: 28px;
  font-weight: 300;
  color: #333;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

.nav-right {
  width: 40px;
}

/* Tab 样式 */
.tab-container {
  display: flex;
  background: #fff;
  padding: 12px 16px;
  gap: 12px;
  position: sticky;
  top: 44px;
  z-index: 10;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  font-size: 14px;
  color: #666;
  border-radius: 20px;
  background: #f5f5f5;
  transition: all 0.3s;
}

.tab-item.active {
  background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%);
  color: #fff;
}

/* 套餐容器 */
.package-container {
  padding: 12px;
}

.package-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

/* 套餐卡片 */
.package-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-image {
  position: relative;
  width: 100%;
  padding-top: 100%;
  background: #f8f8f8;
}

.card-image img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.positioning-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 8px;
  font-size: 11px;
  color: #fff;
  border-radius: 4px;
}

.card-info {
  padding: 10px 12px;
}

.pkg-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pkg-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.scene-tag {
  font-size: 11px;
  color: #999;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}

.current-price {
  font-size: 18px;
  font-weight: 600;
  color: #ff5500;
}

.original-price {
  font-size: 12px;
  color: #999;
  text-decoration: line-through;
}

.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.profit-tag {
  color: #00b578;
  font-weight: 500;
}

.saved-tag {
  color: #ff5500;
  font-weight: 500;
}

.item-count {
  color: #999;
}
</style>
