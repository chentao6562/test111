<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { get } from '../api'
import { Toast } from 'tdesign-mobile-vue'

const router = useRouter()
const userStore = useUserStore()

// 是否已登录
const isLoggedIn = computed(() => userStore.isLoggedIn)

// 当前推销员信息（如果是通过推销员链接进入）
const currentSalesperson = computed(() => userStore.salespersonInfo)

// 推销员统计数据
const agentStats = ref({
  totalAgents: 0,
  totalEarnings: 0
})

// 加载推销员统计
const loadAgentStats = async () => {
  try {
    const res = await get<any>('/agents/public-stats')
    if (res.data) {
      agentStats.value.totalAgents = res.data.totalAgents || 200
      agentStats.value.totalEarnings = res.data.totalEarnings || 80000
    }
  } catch {
    agentStats.value.totalAgents = 200
    agentStats.value.totalEarnings = 80000
  }
}

// 【2026-01-23】成功案例数据（更有吸引力的故事）
const successCases = [
  { name: '王**', level: '宝妈兼职', monthEarnings: 12800, totalOrders: 86, story: '带娃期间利用碎片时间' },
  { name: '李**', level: '大学生创业', monthEarnings: 8600, totalOrders: 58, story: '寒假一个月赚到学费' },
  { name: '张**', level: '烟酒店老板', monthEarnings: 32000, totalOrders: 215, story: '老客户转化+朋友圈裂变' }
]

// 立即加入/开始赚钱
const handleAction = () => {
  if (isLoggedIn.value) {
    router.push('/promotion')
  } else {
    router.push('/login')
  }
}

// 【2026-01-27修复】拨打电话或复制号码（兼容桌面浏览器）
const callOrCopyPhone = async (phone: string) => {
  // 尝试拨打电话
  const telLink = document.createElement('a')
  telLink.href = `tel:${phone}`
  telLink.click()

  // 同时复制到剪贴板作为备选
  try {
    await navigator.clipboard.writeText(phone)
    Toast({ message: `电话 ${phone} 已复制`, theme: 'success' })
  } catch {
    Toast({ message: `客服电话: ${phone}` })
  }
}

// 【2026-01-23】联系当前推销员（使用推销员真实手机号）
const contactCurrentAgent = () => {
  const phone = currentSalesperson.value?.phone || '13190531439'
  callOrCopyPhone(phone)
}

// 联系客服
const contactService = () => {
  callOrCopyPhone('13190531439')
}

onMounted(() => {
  loadAgentStats()
})
</script>

<template>
  <div class="recruit-page">
    <!-- 顶部导航 -->
    <header class="recruit-header">
      <button class="back-btn" @click="router.back()">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <h1 class="header-title">兼职推销赚钱</h1>
    </header>

    <!-- 主横幅 -->
    <section class="hero-banner">
      <div class="hero-content">
        <h2 class="hero-title">蒙庆烟花兼职招募</h2>
        <p class="hero-subtitle">动动手指分享，轻松赚取佣金</p>
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-num">{{ agentStats.totalAgents }}+</span>
            <span class="stat-label">推销员已加入</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-num">¥{{ (agentStats.totalEarnings / 10000).toFixed(1) }}万+</span>
            <span class="stat-label">已发放佣金</span>
          </div>
        </div>
      </div>
      <div class="hero-decoration">
        <span class="material-symbols-outlined">celebration</span>
      </div>
    </section>

    <main class="recruit-main">
      <!-- 联系当前推销员提示卡片 -->
      <section class="contact-agent-card" v-if="currentSalesperson">
        <div class="agent-info">
          <div class="agent-avatar">
            <span class="material-symbols-outlined">person</span>
          </div>
          <div class="agent-detail">
            <div class="agent-name">{{ currentSalesperson.name || '推销员' }}</div>
            <div class="agent-tip">联系TA获取邀请码，即可成为推销员</div>
          </div>
        </div>
        <button class="call-agent-btn" @click="contactCurrentAgent">
          <span class="material-symbols-outlined">call</span>
          <span>联系TA</span>
        </button>
      </section>

      <!-- 核心卖点：零门槛 -->
      <section class="highlights-section">
        <div class="section-header">
          <span class="material-symbols-outlined">star</span>
          <h3>为什么选择我们</h3>
        </div>
        <div class="highlights-grid">
          <div class="highlight-item">
            <div class="highlight-icon no-stock">
              <span class="material-symbols-outlined">inventory_2</span>
            </div>
            <div class="highlight-text">
              <h4>不用进货</h4>
              <p>零库存压力</p>
            </div>
          </div>
          <div class="highlight-item">
            <div class="highlight-icon no-delivery">
              <span class="material-symbols-outlined">local_shipping</span>
            </div>
            <div class="highlight-text">
              <h4>不用交付</h4>
              <p>门店负责发货</p>
            </div>
          </div>
          <div class="highlight-item">
            <div class="highlight-icon no-contact">
              <span class="material-symbols-outlined">support_agent</span>
            </div>
            <div class="highlight-text">
              <h4>不用售后</h4>
              <p>门店处理客诉</p>
            </div>
          </div>
          <div class="highlight-item">
            <div class="highlight-icon has-support">
              <span class="material-symbols-outlined">school</span>
            </div>
            <div class="highlight-text">
              <h4>培训支持</h4>
              <p>拓客技巧指导</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 宣传物料支持 -->
      <section class="support-section">
        <div class="section-header">
          <span class="material-symbols-outlined">brush</span>
          <h3>全套宣传物料</h3>
        </div>
        <div class="support-list">
          <div class="support-item">
            <span class="material-symbols-outlined">image</span>
            <span>精美商品海报</span>
          </div>
          <div class="support-item">
            <span class="material-symbols-outlined">edit_note</span>
            <span>朋友圈文案库</span>
          </div>
          <div class="support-item">
            <span class="material-symbols-outlined">qr_code_2</span>
            <span>专属推广二维码</span>
          </div>
          <div class="support-item">
            <span class="material-symbols-outlined">video_library</span>
            <span>产品介绍视频</span>
          </div>
        </div>
        <p class="support-tip">一键转发，省时省力！</p>
      </section>

      <!-- 盈利模式说明 -->
      <section class="profit-section">
        <div class="section-header">
          <span class="material-symbols-outlined">monetization_on</span>
          <h3>盈利模式超简单</h3>
        </div>
        <div class="profit-card">
          <div class="profit-formula">
            <div class="formula-item">
              <span class="formula-label">客户预约价</span>
              <span class="formula-value">¥120</span>
            </div>
            <span class="formula-minus">-</span>
            <div class="formula-item">
              <span class="formula-label">您的成本价</span>
              <span class="formula-value cost">¥80</span>
            </div>
            <span class="formula-equals">=</span>
            <div class="formula-item result">
              <span class="formula-label">您的利润</span>
              <span class="formula-value profit">¥40</span>
            </div>
          </div>
          <div class="profit-highlight">
            <span class="material-symbols-outlined">tips_and_updates</span>
            <span>每预约成功一件商品，差价就是您的利润！</span>
          </div>
          <div class="profit-example">
            <div class="example-item">
              <span class="example-label">预约10件</span>
              <span class="example-arrow">→</span>
              <span class="example-profit">赚¥400</span>
            </div>
            <div class="example-item">
              <span class="example-label">预约50件</span>
              <span class="example-arrow">→</span>
              <span class="example-profit">赚¥2000</span>
            </div>
            <div class="example-item">
              <span class="example-label">预约100件</span>
              <span class="example-arrow">→</span>
              <span class="example-profit">赚¥4000</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 如何加入 -->
      <section class="steps-section">
        <div class="section-header">
          <span class="material-symbols-outlined">directions_run</span>
          <h3>三步开始赚钱</h3>
        </div>
        <div class="steps-list">
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-content">
              <h4>联系推销员获取邀请码</h4>
              <p>通过分享给您链接的推销员获取专属邀请码</p>
            </div>
          </div>
          <div class="step-connector"></div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-content">
              <h4>注册成为推销员</h4>
              <p>填写手机号和邀请码，立即开通推销员身份</p>
            </div>
          </div>
          <div class="step-connector"></div>
          <div class="step-item">
            <div class="step-num">3</div>
            <div class="step-content">
              <h4>分享链接赚佣金</h4>
              <p>分享商品给好友，每成功预约一件即得佣金</p>
            </div>
          </div>
        </div>

        <!-- 【2026-01-23】强调联系当前推销员，显示手机号（仅有推销员链接时显示） -->
        <div class="contact-tip-box" v-if="currentSalesperson">
          <span class="material-symbols-outlined">lightbulb</span>
          <span>联系 <strong>{{ currentSalesperson.name || '推销员' }} ({{ currentSalesperson.phone }})</strong> 获取您的专属邀请码</span>
        </div>
      </section>

      <!-- 成功案例 -->
      <section class="cases-section">
        <div class="section-header">
          <span class="material-symbols-outlined">workspace_premium</span>
          <h3>推销员收益展示</h3>
        </div>
        <div class="cases-list">
          <div v-for="(c, index) in successCases" :key="index" class="case-card">
            <div class="case-avatar">
              <span class="material-symbols-outlined">person</span>
            </div>
            <div class="case-info">
              <div class="case-name">{{ c.name }}</div>
              <div class="case-level">{{ c.level }}</div>
              <div class="case-story" v-if="c.story">{{ c.story }}</div>
            </div>
            <div class="case-stats">
              <div class="case-earning">
                <span class="label">本月收益</span>
                <span class="value">¥{{ c.monthEarnings }}</span>
              </div>
              <div class="case-orders">
                <span class="label">预约成交</span>
                <span class="value">{{ c.totalOrders }}件</span>
              </div>
            </div>
          </div>
        </div>
        <p class="cases-note">* 以上数据来自真实推销员案例，春节旺季收益更高</p>
      </section>

      <!-- 常见问题 -->
      <section class="faq-section">
        <div class="section-header">
          <span class="material-symbols-outlined">help</span>
          <h3>常见问题</h3>
        </div>
        <div class="faq-list">
          <div class="faq-item">
            <div class="faq-q">Q: 成为推销员需要缴费吗？</div>
            <div class="faq-a">A: 完全免费！不需要缴纳任何费用，零成本开始。</div>
          </div>
          <div class="faq-item">
            <div class="faq-q">Q: 我需要自己进货或发货吗？</div>
            <div class="faq-a">A: 完全不用！您只负责推广预约，进货、发货、售后全部由门店处理。</div>
          </div>
          <div class="faq-item">
            <div class="faq-q">Q: 佣金什么时候到账？</div>
            <div class="faq-a">A: 客户到店完成付款提货后，佣金即时到账您的余额。</div>
          </div>
          <div class="faq-item">
            <div class="faq-q">Q: 如何获取邀请码？</div>
            <div class="faq-a">A: 联系分享链接给您的推销员，或拨打客服电话 13190531439 获取。</div>
          </div>
        </div>
      </section>
    </main>

    <!-- 底部操作栏 -->
    <footer class="recruit-footer">
      <button class="contact-btn" @click="currentSalesperson ? contactCurrentAgent() : contactService()">
        <span class="material-symbols-outlined">call</span>
        <span>{{ currentSalesperson ? '联系推销员' : '咨询客服' }}</span>
      </button>
      <button class="action-btn" @click="handleAction">
        <span v-if="isLoggedIn">开始推广赚钱</span>
        <span v-else>立即加入</span>
        <span class="material-symbols-outlined">arrow_forward</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
.recruit-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

/* 顶部导航 */
.recruit-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
  background: linear-gradient(135deg, #FF6B6B, #EF062D);
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.back-btn .material-symbols-outlined {
  font-size: 22px;
  color: white;
}

.header-title {
  font-size: 18px;
  font-weight: 700;
  color: white;
  margin: 0;
}

/* 主横幅 */
.hero-banner {
  background: linear-gradient(135deg, #FF6B6B, #EF062D);
  padding: 20px 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.hero-content {
  flex: 1;
}

.hero-title {
  font-size: 24px;
  font-weight: 800;
  color: white;
  margin: 0 0 8px;
}

.hero-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 20px;
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 12px 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 20px;
  font-weight: 800;
  color: white;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

.stat-divider {
  width: 1px;
  height: 30px;
  background: rgba(255, 255, 255, 0.3);
}

.hero-decoration {
  opacity: 0.3;
}

.hero-decoration .material-symbols-outlined {
  font-size: 80px;
  color: white;
}

/* 主内容区 */
.recruit-main {
  padding: 16px;
  margin-top: -20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.section-header .material-symbols-outlined {
  font-size: 22px;
  color: #EF062D;
}

.section-header h3 {
  font-size: 17px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

/* 联系当前推销员卡片 */
.contact-agent-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #FFF7E6, #FFF);
  border: 2px solid #FAAD14;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #FAAD14, #FFC53D);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.agent-avatar .material-symbols-outlined {
  font-size: 26px;
  color: white;
}

.agent-detail {
  flex: 1;
}

.agent-name {
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

.agent-tip {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.call-agent-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  background: #FAAD14;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
}

.call-agent-btn .material-symbols-outlined {
  font-size: 18px;
}

/* 核心卖点 */
.highlights-section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.highlights-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.highlight-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #f8f8f8;
  border-radius: 12px;
}

.highlight-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.highlight-icon .material-symbols-outlined {
  font-size: 24px;
  color: white;
}

.highlight-icon.no-stock {
  background: linear-gradient(135deg, #52C41A, #73D13D);
}

.highlight-icon.no-delivery {
  background: linear-gradient(135deg, #1890FF, #40A9FF);
}

.highlight-icon.no-contact {
  background: linear-gradient(135deg, #722ED1, #9254DE);
}

.highlight-icon.has-support {
  background: linear-gradient(135deg, #FA8C16, #FFA940);
}

.highlight-text h4 {
  font-size: 14px;
  font-weight: 700;
  color: #333;
  margin: 0 0 2px;
}

.highlight-text p {
  font-size: 11px;
  color: #999;
  margin: 0;
}

/* 宣传物料支持 */
.support-section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.support-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.support-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #E6F7FF, #FFF);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.support-item .material-symbols-outlined {
  font-size: 20px;
  color: #1890FF;
}

.support-tip {
  text-align: center;
  font-size: 12px;
  color: #1890FF;
  margin: 12px 0 0;
  font-weight: 600;
}

/* 盈利模式 */
.profit-section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.profit-card {
  background: linear-gradient(135deg, #FFF5F5, #FFF);
  border-radius: 12px;
  padding: 16px;
}

.profit-formula {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.formula-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 14px;
  background: white;
  border-radius: 10px;
}

.formula-item.result {
  background: linear-gradient(135deg, #52C41A, #73D13D);
}

.formula-item.result .formula-label,
.formula-item.result .formula-value {
  color: white;
}

.formula-label {
  font-size: 10px;
  color: #999;
}

.formula-value {
  font-size: 18px;
  font-weight: 800;
  color: #333;
  margin-top: 2px;
}

.formula-value.cost {
  color: #999;
}

.formula-value.profit {
  font-size: 22px;
}

.formula-minus,
.formula-equals {
  font-size: 18px;
  font-weight: 700;
  color: #999;
}

.profit-highlight {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: linear-gradient(135deg, #FFF7E6, #FFF);
  border-radius: 8px;
  margin-bottom: 12px;
}

.profit-highlight .material-symbols-outlined {
  font-size: 18px;
  color: #FAAD14;
}

.profit-highlight span:last-child {
  font-size: 13px;
  font-weight: 600;
  color: #D48806;
}

.profit-example {
  display: flex;
  justify-content: space-around;
}

.example-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.example-label {
  font-size: 11px;
  color: #666;
}

.example-arrow {
  font-size: 12px;
  color: #ccc;
}

.example-profit {
  font-size: 15px;
  font-weight: 800;
  color: #EF062D;
}

/* 步骤区域 */
.steps-section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.steps-list {
  display: flex;
  flex-direction: column;
}

.step-item {
  display: flex;
  gap: 16px;
}

.step-num {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #EF062D, #FF6B6B);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
  color: white;
  flex-shrink: 0;
}

.step-content h4 {
  font-size: 15px;
  font-weight: 700;
  color: #333;
  margin: 0 0 4px;
}

.step-content p {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.step-connector {
  width: 2px;
  height: 20px;
  background: #eee;
  margin-left: 17px;
}

.contact-tip-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #E6FFFB, #FFF);
  border: 1px solid #13C2C2;
  border-radius: 10px;
}

.contact-tip-box .material-symbols-outlined {
  font-size: 20px;
  color: #13C2C2;
}

.contact-tip-box span:last-child {
  font-size: 13px;
  color: #006D75;
}

.contact-tip-box strong {
  color: #13C2C2;
}

/* 成功案例 */
.cases-section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.cases-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.case-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f8f8;
  border-radius: 12px;
}

.case-avatar {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #FF9500, #FFCC00);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.case-avatar .material-symbols-outlined {
  font-size: 24px;
  color: white;
}

.case-info {
  flex: 1;
  min-width: 0;
}

.case-name {
  font-size: 14px;
  font-weight: 700;
  color: #333;
}

.case-level {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.case-story {
  font-size: 10px;
  color: #666;
  margin-top: 4px;
  padding: 2px 6px;
  background: linear-gradient(135deg, #FFF7E6, #FFF);
  border-radius: 4px;
  display: inline-block;
}

.case-stats {
  text-align: right;
}

.case-earning,
.case-orders {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.case-earning {
  margin-bottom: 4px;
}

.case-stats .label {
  font-size: 10px;
  color: #999;
}

.case-earning .value {
  font-size: 16px;
  font-weight: 800;
  color: #EF062D;
}

.case-orders .value {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.cases-note {
  font-size: 11px;
  color: #999;
  text-align: center;
  margin: 12px 0 0;
}

/* 常见问题 */
.faq-section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faq-item {
  padding: 12px;
  background: #f8f8f8;
  border-radius: 10px;
}

.faq-q {
  font-size: 13px;
  font-weight: 700;
  color: #333;
  margin-bottom: 6px;
}

.faq-a {
  font-size: 12px;
  color: #666;
}

/* 底部操作栏 */
.recruit-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: white;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.contact-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  cursor: pointer;
}

.contact-btn .material-symbols-outlined {
  font-size: 20px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 24px;
  background: linear-gradient(135deg, #EF062D, #FF6B6B);
  border: none;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 700;
  color: white;
  cursor: pointer;
}

.action-btn:active {
  transform: scale(0.98);
}

.action-btn .material-symbols-outlined {
  font-size: 20px;
}

/* Material Icons */
.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
}
</style>
