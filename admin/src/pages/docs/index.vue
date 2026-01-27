<template>
  <div class="flowchart-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>业务流程说明</h1>
      <p>蒙庆烟花预约系统 - 线上免费预约 + 到店全款付款</p>
    </div>

    <!-- 流程图切换标签 -->
    <div class="flow-tabs">
      <div
        class="tab-item"
        :class="{ active: activeTab === 'reservation-flow' }"
        @click="activeTab = 'reservation-flow'"
      >
        <t-icon name="assignment" />
        预约流程
      </div>
      <div
        class="tab-item"
        :class="{ active: activeTab === 'status-flow' }"
        @click="activeTab = 'status-flow'"
      >
        <t-icon name="swap" />
        状态流转
      </div>
      <div
        class="tab-item"
        :class="{ active: activeTab === 'roles' }"
        @click="activeTab = 'roles'"
      >
        <t-icon name="usergroup" />
        角色职责
      </div>
    </div>

    <!-- 图例 -->
    <div class="legend">
      <div class="legend-item">
        <div class="legend-color salesperson"></div>
        <span>推销员</span>
      </div>
      <div class="legend-item">
        <div class="legend-color customer"></div>
        <span>客户</span>
      </div>
      <div class="legend-item">
        <div class="legend-color store"></div>
        <span>门店员工</span>
      </div>
      <div class="legend-item">
        <div class="legend-color system"></div>
        <span>系统自动</span>
      </div>
      <div class="legend-item">
        <div class="legend-color admin"></div>
        <span>管理员</span>
      </div>
    </div>

    <!-- 预约流程图 -->
    <div v-show="activeTab === 'reservation-flow'" class="flowchart-container">
      <svg viewBox="0 0 1300 750" class="flowchart-svg">
        <!-- 背景网格 -->
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" stroke-width="1"/>
          </pattern>
          <!-- 箭头标记 -->
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af"/>
          </marker>
          <marker id="arrowhead-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e"/>
          </marker>
          <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444"/>
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>

        <!-- 第一行：推销员操作 -->
        <!-- 节点1：推销员设置价格 -->
        <g transform="translate(80, 60)">
          <rect x="0" y="0" width="160" height="70" rx="12" class="node salesperson"/>
          <text x="80" y="30" class="node-title">推销员设置价格</text>
          <text x="80" y="50" class="node-desc">设置零售价/给二级价</text>
        </g>

        <!-- 连线1 -->
        <line x1="240" y1="95" x2="300" y2="95" class="flow-line" marker-end="url(#arrowhead)"/>

        <!-- 节点2：推销员推广分享 -->
        <g transform="translate(320, 60)">
          <rect x="0" y="0" width="160" height="70" rx="12" class="node salesperson"/>
          <text x="80" y="30" class="node-title">推广分享</text>
          <text x="80" y="50" class="node-desc">分享专属链接/二维码</text>
        </g>

        <!-- 连线2 -->
        <line x1="480" y1="95" x2="540" y2="95" class="flow-line" marker-end="url(#arrowhead)"/>

        <!-- 节点3：客户访问 -->
        <g transform="translate(560, 60)">
          <rect x="0" y="0" width="160" height="70" rx="12" class="node customer"/>
          <text x="80" y="30" class="node-title">客户访问</text>
          <text x="80" y="50" class="node-desc">通过链接进入商城</text>
        </g>

        <!-- 连线3 -->
        <line x1="720" y1="95" x2="780" y2="95" class="flow-line" marker-end="url(#arrowhead)"/>

        <!-- 节点4：浏览商品 -->
        <g transform="translate(800, 60)">
          <rect x="0" y="0" width="160" height="70" rx="12" class="node customer"/>
          <text x="80" y="30" class="node-title">浏览商品</text>
          <text x="80" y="50" class="node-desc">查看商品/赠品信息</text>
        </g>

        <!-- 转折连线到第二行 -->
        <path d="M 880 130 L 880 170 L 160 170 L 160 200" class="flow-line" fill="none" marker-end="url(#arrowhead)"/>

        <!-- 第二行：预约提交 -->
        <!-- 节点5：提交预约 -->
        <g transform="translate(80, 220)">
          <rect x="0" y="0" width="160" height="70" rx="12" class="node customer"/>
          <text x="80" y="30" class="node-title">提交预约</text>
          <text x="80" y="50" class="node-desc">填写姓名/电话/日期</text>
          <rect x="35" y="55" width="90" height="18" rx="4" class="status-tag success"/>
          <text x="80" y="68" class="status-text">免费预约</text>
        </g>

        <!-- 连线5 -->
        <line x1="240" y1="255" x2="300" y2="255" class="flow-line" marker-end="url(#arrowhead)"/>

        <!-- 节点6：门店收到通知 -->
        <g transform="translate(320, 220)">
          <rect x="0" y="0" width="160" height="70" rx="12" class="node system"/>
          <text x="80" y="30" class="node-title">系统通知</text>
          <text x="80" y="50" class="node-desc">通知门店新预约</text>
        </g>

        <!-- 连线6 -->
        <line x1="480" y1="255" x2="540" y2="255" class="flow-line" marker-end="url(#arrowhead)"/>

        <!-- 节点7：电话确认（菱形判断） -->
        <g transform="translate(560, 210)">
          <polygon points="90,0 180,45 90,90 0,45" class="node-diamond store"/>
          <text x="90" y="40" class="node-title" style="font-size: 12px;">电话确认</text>
          <text x="90" y="55" class="node-desc" style="font-size: 10px;">30分钟内</text>
        </g>

        <!-- 确认成功分支 -->
        <line x1="740" y1="255" x2="800" y2="255" class="flow-line" marker-end="url(#arrowhead)"/>
        <text x="755" y="245" class="branch-label">确认</text>

        <!-- 节点8：已确认 -->
        <g transform="translate(820, 220)">
          <rect x="0" y="0" width="160" height="70" rx="12" class="node store"/>
          <text x="80" y="30" class="node-title">预约已确认</text>
          <text x="80" y="50" class="node-desc">等待提货日期</text>
          <rect x="35" y="55" width="90" height="18" rx="4" class="status-tag primary"/>
          <text x="80" y="68" class="status-text">3天有效期</text>
        </g>

        <!-- 确认失败分支 -->
        <line x1="650" y1="300" x2="650" y2="340" class="flow-line fail" marker-end="url(#arrowhead-red)"/>
        <text x="660" y="325" class="branch-label" style="fill: #ef4444;">3次未接</text>

        <!-- 节点：确认失败 -->
        <g transform="translate(570, 360)">
          <rect x="0" y="0" width="160" height="60" rx="12" class="node-fail"/>
          <text x="80" y="25" class="node-title" style="fill: #dc2626;">确认失败</text>
          <text x="80" y="45" class="node-desc" style="fill: #ef4444;">释放库存/记录爽约</text>
        </g>

        <!-- 转折到第三行 -->
        <path d="M 900 290 L 900 330 L 160 330 L 160 360" class="flow-line" fill="none" marker-end="url(#arrowhead)"/>

        <!-- 第三行：备货流程 -->
        <!-- 节点9：待备货 -->
        <g transform="translate(80, 380)">
          <rect x="0" y="0" width="160" height="70" rx="12" class="node system"/>
          <text x="80" y="30" class="node-title">待备货</text>
          <text x="80" y="50" class="node-desc">提货前一天系统提醒</text>
        </g>

        <!-- 连线9 -->
        <line x1="240" y1="415" x2="300" y2="415" class="flow-line" marker-end="url(#arrowhead)"/>

        <!-- 节点10：门店备货 -->
        <g transform="translate(320, 380)">
          <rect x="0" y="0" width="160" height="70" rx="12" class="node store"/>
          <text x="80" y="30" class="node-title">门店备货</text>
          <text x="80" y="50" class="node-desc">准备商品和赠品</text>
          <rect x="45" y="55" width="70" height="18" rx="4" class="status-tag warning"/>
          <text x="80" y="68" class="status-text">备货中</text>
        </g>

        <!-- 连线10 -->
        <line x1="480" y1="415" x2="540" y2="415" class="flow-line" marker-end="url(#arrowhead)"/>

        <!-- 节点11：生成提货码 -->
        <g transform="translate(560, 380)">
          <rect x="0" y="0" width="160" height="70" rx="12" class="node system"/>
          <text x="80" y="30" class="node-title">生成提货码</text>
          <text x="80" y="50" class="node-desc">客户小程序显示二维码</text>
        </g>

        <!-- 连线11 -->
        <line x1="720" y1="415" x2="780" y2="415" class="flow-line" marker-end="url(#arrowhead)"/>

        <!-- 节点12：待提货 -->
        <g transform="translate(800, 380)">
          <rect x="0" y="0" width="160" height="70" rx="12" class="node store"/>
          <text x="80" y="30" class="node-title">待提货</text>
          <text x="80" y="50" class="node-desc">等待客户到店</text>
          <rect x="45" y="55" width="70" height="18" rx="4" class="status-tag success"/>
          <text x="80" y="68" class="status-text">待提货</text>
        </g>

        <!-- 转折到第四行 -->
        <path d="M 880 450 L 880 490 L 160 490 L 160 520" class="flow-line" fill="none" marker-end="url(#arrowhead)"/>

        <!-- 第四行：核销流程 -->
        <!-- 节点13：客户到店 -->
        <g transform="translate(80, 540)">
          <rect x="0" y="0" width="160" height="70" rx="12" class="node customer"/>
          <text x="80" y="30" class="node-title">客户到店</text>
          <text x="80" y="50" class="node-desc">出示二维码/预约号</text>
        </g>

        <!-- 连线13 -->
        <line x1="240" y1="575" x2="300" y2="575" class="flow-line" marker-end="url(#arrowhead)"/>

        <!-- 节点14：门店核销 -->
        <g transform="translate(320, 540)">
          <rect x="0" y="0" width="160" height="70" rx="12" class="node store"/>
          <text x="80" y="30" class="node-title">扫码核销</text>
          <text x="80" y="50" class="node-desc">确认收款/发货/赠品</text>
          <rect x="35" y="55" width="90" height="18" rx="4" class="status-tag primary"/>
          <text x="80" y="68" class="status-text">全款支付</text>
        </g>

        <!-- 连线14 -->
        <line x1="480" y1="575" x2="540" y2="575" class="flow-line success" marker-end="url(#arrowhead-green)"/>

        <!-- 节点15：预约完成 -->
        <g transform="translate(560, 540)">
          <circle cx="80" cy="35" r="45" class="node-end"/>
          <text x="80" y="30" class="node-title" style="fill: white;">完成</text>
          <text x="80" y="50" class="node-desc" style="fill: rgba(255,255,255,0.9);">已完成</text>
        </g>

        <!-- 连线15 -->
        <line x1="685" y1="575" x2="745" y2="575" class="flow-line success" marker-end="url(#arrowhead-green)"/>

        <!-- 节点16：利润结算 -->
        <g transform="translate(765, 540)">
          <rect x="0" y="0" width="160" height="70" rx="12" class="node salesperson"/>
          <text x="80" y="30" class="node-title">利润即时结算</text>
          <text x="80" y="50" class="node-desc">利润入账到余额</text>
          <rect x="35" y="55" width="90" height="18" rx="4" class="status-tag success"/>
          <text x="80" y="68" class="status-text">可提现</text>
        </g>

        <!-- 过期分支 -->
        <g transform="translate(820, 380)">
          <line x1="80" y1="70" x2="80" y2="100" class="flow-line fail" stroke-dasharray="5,5"/>
          <text x="95" y="90" class="branch-label" style="fill: #ef4444;">3天未到店</text>
        </g>
        <g transform="translate(770, 480)">
          <rect x="0" y="0" width="130" height="45" rx="8" class="node-fail"/>
          <text x="65" y="20" class="node-title" style="fill: #dc2626; font-size: 12px;">已过期</text>
          <text x="65" y="35" class="node-desc" style="fill: #ef4444; font-size: 10px;">释放库存/记录爽约</text>
        </g>

        <!-- 关键要点框 -->
        <g transform="translate(1000, 60)">
          <rect x="0" y="0" width="260" height="200" rx="8" fill="#ecfdf5" stroke="#22c55e" stroke-width="2"/>
          <text x="130" y="25" class="tip-title" style="fill: #166534;">预约模式要点</text>
          <text x="15" y="55" class="tip-text" style="fill: #166534;">1. 线上预约完全免费</text>
          <text x="15" y="80" class="tip-text" style="fill: #166534;">2. 门店30分钟内电话确认</text>
          <text x="15" y="105" class="tip-text" style="fill: #166534;">3. 3次未接通自动失败</text>
          <text x="15" y="130" class="tip-text" style="fill: #166534;">4. 确认后3天内到店提货</text>
          <text x="15" y="155" class="tip-text" style="fill: #166534;">5. 核销时利润即时结算</text>
          <text x="15" y="180" class="tip-text" style="fill: #166534;">6. 线上预约享阶梯赠品</text>
        </g>

        <!-- 赠品说明框 -->
        <g transform="translate(1000, 280)">
          <rect x="0" y="0" width="260" height="170" rx="8" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
          <text x="130" y="25" class="tip-title" style="fill: #92400e;">赠品阶梯</text>
          <text x="15" y="50" class="tip-text" style="fill: #78350f;">满¥100：小手持烟花×2</text>
          <text x="15" y="75" class="tip-text" style="fill: #78350f;">满¥200：仙女棒+摔炮</text>
          <text x="15" y="100" class="tip-text" style="fill: #78350f;">满¥300：小型喷花+仙女棒</text>
          <text x="15" y="125" class="tip-text" style="fill: #78350f;">满¥500：中型烟花+小礼包</text>
          <text x="15" y="150" class="tip-text" style="fill: #78350f;">满¥1000：大型烟花+中礼包</text>
        </g>
      </svg>
    </div>

    <!-- 状态流转图 -->
    <div v-show="activeTab === 'status-flow'" class="flowchart-container">
      <svg viewBox="0 0 1200 650" class="flowchart-svg">
        <defs>
          <pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" stroke-width="1"/>
          </pattern>
          <marker id="arrow2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af"/>
          </marker>
          <marker id="arrow2-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e"/>
          </marker>
          <marker id="arrow2-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444"/>
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid2)"/>

        <!-- 标题 -->
        <text x="600" y="40" class="chart-title">预约单状态流转图</text>

        <!-- 主流程线 -->
        <!-- 状态0: 待确认 -->
        <g transform="translate(60, 100)">
          <rect x="0" y="0" width="130" height="70" rx="10" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>
          <text x="65" y="30" class="node-title">待确认</text>
          <text x="65" y="50" class="node-desc">状态 0</text>
        </g>

        <line x1="190" y1="135" x2="240" y2="135" class="flow-line" marker-end="url(#arrow2)"/>

        <!-- 状态1: 确认中 -->
        <g transform="translate(260, 100)">
          <rect x="0" y="0" width="130" height="70" rx="10" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
          <text x="65" y="30" class="node-title">确认中</text>
          <text x="65" y="50" class="node-desc">状态 1</text>
        </g>

        <line x1="390" y1="135" x2="440" y2="135" class="flow-line" marker-end="url(#arrow2)"/>

        <!-- 状态2: 已确认 -->
        <g transform="translate(460, 100)">
          <rect x="0" y="0" width="130" height="70" rx="10" fill="#dcfce7" stroke="#22c55e" stroke-width="2"/>
          <text x="65" y="30" class="node-title">已确认</text>
          <text x="65" y="50" class="node-desc">状态 2</text>
        </g>

        <line x1="590" y1="135" x2="640" y2="135" class="flow-line" marker-end="url(#arrow2)"/>

        <!-- 状态7: 待备货 -->
        <g transform="translate(660, 100)">
          <rect x="0" y="0" width="130" height="70" rx="10" fill="#e0e7ff" stroke="#6366f1" stroke-width="2"/>
          <text x="65" y="30" class="node-title">待备货</text>
          <text x="65" y="50" class="node-desc">状态 7</text>
        </g>

        <line x1="790" y1="135" x2="840" y2="135" class="flow-line" marker-end="url(#arrow2)"/>

        <!-- 状态8: 备货中 -->
        <g transform="translate(860, 100)">
          <rect x="0" y="0" width="130" height="70" rx="10" fill="#fce7f3" stroke="#ec4899" stroke-width="2"/>
          <text x="65" y="30" class="node-title">备货中</text>
          <text x="65" y="50" class="node-desc">状态 8</text>
        </g>

        <!-- 转折到第二行 -->
        <path d="M 925 170 L 925 220 L 125 220 L 125 260" class="flow-line" fill="none" marker-end="url(#arrow2)"/>

        <!-- 第二行 -->
        <!-- 状态9: 待提货 -->
        <g transform="translate(60, 280)">
          <rect x="0" y="0" width="130" height="70" rx="10" fill="#cffafe" stroke="#06b6d4" stroke-width="2"/>
          <text x="65" y="30" class="node-title">待提货</text>
          <text x="65" y="50" class="node-desc">状态 9</text>
        </g>

        <line x1="190" y1="315" x2="280" y2="315" class="flow-line success" marker-end="url(#arrow2-green)"/>

        <!-- 状态3: 已完成 -->
        <g transform="translate(300, 270)">
          <circle cx="65" cy="45" r="50" fill="#22c55e" stroke="#16a34a" stroke-width="3"/>
          <text x="65" y="40" class="node-title" style="fill: white;">已完成</text>
          <text x="65" y="58" class="node-desc" style="fill: rgba(255,255,255,0.9);">状态 3</text>
        </g>

        <!-- 异常状态分支 -->
        <!-- 从确认中到确认失败 -->
        <line x1="325" y1="170" x2="325" y2="400" class="flow-line fail" stroke-dasharray="5,5" marker-end="url(#arrow2-red)"/>
        <text x="335" y="290" class="branch-label" style="fill: #ef4444;">3次未接</text>

        <!-- 状态6: 确认失败 -->
        <g transform="translate(260, 420)">
          <rect x="0" y="0" width="130" height="70" rx="10" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
          <text x="65" y="30" class="node-title" style="fill: #dc2626;">确认失败</text>
          <text x="65" y="50" class="node-desc" style="fill: #ef4444;">状态 6</text>
        </g>

        <!-- 从确认中到已取消 -->
        <line x1="325" y1="170" x2="500" y2="420" class="flow-line fail" stroke-dasharray="5,5" marker-end="url(#arrow2-red)"/>
        <text x="430" y="320" class="branch-label" style="fill: #ef4444;">客户取消</text>

        <!-- 状态4: 已取消 -->
        <g transform="translate(460, 420)">
          <rect x="0" y="0" width="130" height="70" rx="10" fill="#f3f4f6" stroke="#9ca3af" stroke-width="2"/>
          <text x="65" y="30" class="node-title" style="fill: #6b7280;">已取消</text>
          <text x="65" y="50" class="node-desc" style="fill: #9ca3af;">状态 4</text>
        </g>

        <!-- 从已确认到已过期 -->
        <line x1="525" y1="170" x2="700" y2="420" class="flow-line fail" stroke-dasharray="5,5" marker-end="url(#arrow2-red)"/>
        <text x="630" y="320" class="branch-label" style="fill: #ef4444;">3天未到店</text>

        <!-- 状态5: 已过期 -->
        <g transform="translate(660, 420)">
          <rect x="0" y="0" width="130" height="70" rx="10" fill="#fef2f2" stroke="#f87171" stroke-width="2"/>
          <text x="65" y="30" class="node-title" style="fill: #b91c1c;">已过期</text>
          <text x="65" y="50" class="node-desc" style="fill: #f87171;">状态 5</text>
        </g>

        <!-- 状态说明表 -->
        <g transform="translate(860, 250)">
          <rect x="0" y="0" width="300" height="350" rx="8" fill="#f9fafb" stroke="#e5e7eb" stroke-width="2"/>
          <text x="150" y="30" class="tip-title" style="fill: #374151;">状态说明</text>

          <rect x="15" y="50" width="60" height="24" rx="4" fill="#dbeafe"/>
          <text x="45" y="66" style="font-size: 11px; fill: #1e40af; text-anchor: middle;">待确认</text>
          <text x="85" y="66" style="font-size: 11px; fill: #374151;">新预约等待电话确认</text>

          <rect x="15" y="85" width="60" height="24" rx="4" fill="#fef3c7"/>
          <text x="45" y="101" style="font-size: 11px; fill: #92400e; text-anchor: middle;">确认中</text>
          <text x="85" y="101" style="font-size: 11px; fill: #374151;">门店正在联系客户</text>

          <rect x="15" y="120" width="60" height="24" rx="4" fill="#dcfce7"/>
          <text x="45" y="136" style="font-size: 11px; fill: #166534; text-anchor: middle;">已确认</text>
          <text x="85" y="136" style="font-size: 11px; fill: #374151;">电话确认成功</text>

          <rect x="15" y="155" width="60" height="24" rx="4" fill="#e0e7ff"/>
          <text x="45" y="171" style="font-size: 11px; fill: #4338ca; text-anchor: middle;">待备货</text>
          <text x="85" y="171" style="font-size: 11px; fill: #374151;">提货前一天系统提醒</text>

          <rect x="15" y="190" width="60" height="24" rx="4" fill="#fce7f3"/>
          <text x="45" y="206" style="font-size: 11px; fill: #be185d; text-anchor: middle;">备货中</text>
          <text x="85" y="206" style="font-size: 11px; fill: #374151;">门店正在备货</text>

          <rect x="15" y="225" width="60" height="24" rx="4" fill="#cffafe"/>
          <text x="45" y="241" style="font-size: 11px; fill: #0e7490; text-anchor: middle;">待提货</text>
          <text x="85" y="241" style="font-size: 11px; fill: #374151;">备货完成等待提货</text>

          <rect x="15" y="260" width="60" height="24" rx="4" fill="#22c55e"/>
          <text x="45" y="276" style="font-size: 11px; fill: white; text-anchor: middle;">已完成</text>
          <text x="85" y="276" style="font-size: 11px; fill: #374151;">到店付款提货完成</text>

          <rect x="15" y="295" width="60" height="24" rx="4" fill="#fee2e2"/>
          <text x="45" y="311" style="font-size: 11px; fill: #dc2626; text-anchor: middle;">确认失败</text>
          <text x="85" y="311" style="font-size: 11px; fill: #374151;">3次电话未接通</text>

          <rect x="170" y="295" width="60" height="24" rx="4" fill="#f3f4f6"/>
          <text x="200" y="311" style="font-size: 11px; fill: #6b7280; text-anchor: middle;">已取消</text>

          <rect x="170" y="260" width="60" height="24" rx="4" fill="#fef2f2"/>
          <text x="200" y="276" style="font-size: 11px; fill: #b91c1c; text-anchor: middle;">已过期</text>
        </g>
      </svg>
    </div>

    <!-- 角色职责 -->
    <div v-show="activeTab === 'roles'" class="flowchart-container">
      <div class="roles-content">
        <!-- 推销员 -->
        <div class="role-card salesperson">
          <div class="role-header">
            <div class="role-icon">
              <t-icon name="user-business" size="32"/>
            </div>
            <div class="role-info">
              <h3>推销员</h3>
              <p>一级推销员 / 二级推销员</p>
            </div>
          </div>
          <div class="role-body">
            <div class="role-section">
              <h4>核心职责</h4>
              <ul>
                <li>设置商品零售价格</li>
                <li>推广分享专属链接</li>
                <li>发展团队（仅一级）</li>
              </ul>
            </div>
            <div class="role-section">
              <h4>收益来源</h4>
              <ul>
                <li>差价利润：零售价 - 拿货价</li>
                <li>推荐奖励：下级激活奖励</li>
                <li>团队奖励：团队业绩达标（仅一级）</li>
              </ul>
            </div>
            <div class="role-section">
              <h4>一级 vs 二级</h4>
              <div class="compare-table">
                <div class="compare-row header">
                  <span>能力</span>
                  <span>一级</span>
                  <span>二级</span>
                </div>
                <div class="compare-row">
                  <span>设置零售价</span>
                  <span class="yes">✓</span>
                  <span class="yes">✓</span>
                </div>
                <div class="compare-row">
                  <span>设置给二级价</span>
                  <span class="yes">✓</span>
                  <span class="no">✗</span>
                </div>
                <div class="compare-row">
                  <span>发展下级</span>
                  <span class="yes">✓</span>
                  <span class="no">✗</span>
                </div>
                <div class="compare-row">
                  <span>团队奖励</span>
                  <span class="yes">✓</span>
                  <span class="no">✗</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 门店员工 -->
        <div class="role-card store">
          <div class="role-header">
            <div class="role-icon">
              <t-icon name="shop" size="32"/>
            </div>
            <div class="role-info">
              <h3>门店员工</h3>
              <p>负责预约确认与核销</p>
            </div>
          </div>
          <div class="role-body">
            <div class="role-section">
              <h4>电话确认</h4>
              <ul>
                <li>收到新预约后30分钟内拨打电话</li>
                <li>确认预约信息（商品、数量、提货日期）</li>
                <li>告知赠品和门店地址</li>
                <li>3次未接通自动标记失败</li>
              </ul>
            </div>
            <div class="role-section">
              <h4>备货管理</h4>
              <ul>
                <li>提货前一天收到备货提醒</li>
                <li>准备商品和赠品</li>
                <li>备货完成后状态变为待提货</li>
              </ul>
            </div>
            <div class="role-section">
              <h4>到店核销</h4>
              <ul>
                <li>扫描客户二维码或输入预约号</li>
                <li>收取全款（现金/微信/支付宝）</li>
                <li>发放商品和赠品</li>
                <li>完成核销后利润即时结算</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 管理员 -->
        <div class="role-card admin">
          <div class="role-header">
            <div class="role-icon">
              <t-icon name="setting" size="32"/>
            </div>
            <div class="role-info">
              <h3>管理员</h3>
              <p>系统管理与运营</p>
            </div>
          </div>
          <div class="role-body">
            <div class="role-section">
              <h4>预约管理</h4>
              <ul>
                <li>查看所有预约列表和详情</li>
                <li>确认/取消预约</li>
                <li>导出预约数据</li>
              </ul>
            </div>
            <div class="role-section">
              <h4>赠品配置</h4>
              <ul>
                <li>配置赠品阶梯（金额门槛/赠品内容）</li>
                <li>启用/禁用赠品档位</li>
              </ul>
            </div>
            <div class="role-section">
              <h4>客户风控</h4>
              <ul>
                <li>查看客户风险等级（0-3级）</li>
                <li>管理黑名单（加入/解除）</li>
                <li>高风险客户不享受赠品</li>
              </ul>
            </div>
            <div class="role-section">
              <h4>数据报表</h4>
              <ul>
                <li>预约统计报表</li>
                <li>分润统计报表</li>
                <li>销售数据分析</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 客户风控说明 -->
        <div class="risk-card">
          <h3>客户风控等级</h3>
          <div class="risk-levels">
            <div class="risk-level level-0">
              <div class="level-badge">等级 0</div>
              <div class="level-name">正常</div>
              <div class="level-desc">爽约0次 | 可预约 | 享赠品</div>
            </div>
            <div class="risk-level level-1">
              <div class="level-badge">等级 1</div>
              <div class="level-name">有记录</div>
              <div class="level-desc">爽约1次 | 可预约 | 享赠品</div>
            </div>
            <div class="risk-level level-2">
              <div class="level-badge">等级 2</div>
              <div class="level-name">高风险</div>
              <div class="level-desc">爽约2次 | 可预约 | 无赠品</div>
            </div>
            <div class="risk-level level-3">
              <div class="level-badge">等级 3</div>
              <div class="level-name">黑名单</div>
              <div class="level-desc">爽约≥3次 | 禁止预约</div>
            </div>
          </div>
          <div class="risk-note">
            <t-icon name="info-circle" />
            <span>爽约场景：3次电话未接通 / 确认后3天内未到店提货</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 版本信息 -->
    <div class="version-info">
      <p>文档版本：v3.0 | 更新时间：2026年1月17日</p>
      <p>业务模式：线上免费预约 + 到店全款付款 | 结算方式：即时结算</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeTab = ref('reservation-flow')
</script>

<style scoped>
.flowchart-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.page-header h1 {
  font-size: 28px;
  color: #1f0f0f;
  margin: 0 0 8px 0;
}

.page-header p {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
}

/* 流程图切换标签 */
.flow-tabs {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s;
}

.tab-item:hover {
  border-color: #e53734;
  color: #e53734;
}

.tab-item.active {
  background: #e53734;
  border-color: #e53734;
  color: #fff;
}

/* 图例 */
.legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 20px;
  padding: 12px 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #374151;
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.legend-color.salesperson {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
}

.legend-color.customer {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border: 1px solid #3b82f6;
}

.legend-color.store {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border: 1px solid #22c55e;
}

.legend-color.system {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border: 1px solid #9ca3af;
}

.legend-color.admin {
  background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
  border: 1px solid #a855f7;
}

/* 流程图容器 */
.flowchart-container {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
}

.flowchart-svg {
  width: 100%;
  min-width: 1000px;
  height: auto;
}

/* SVG 节点样式 */
.node {
  stroke-width: 2;
}

.node.salesperson {
  fill: #fef3c7;
  stroke: #f59e0b;
}

.node.customer {
  fill: #dbeafe;
  stroke: #3b82f6;
}

.node.store {
  fill: #dcfce7;
  stroke: #22c55e;
}

.node.system {
  fill: #f3f4f6;
  stroke: #9ca3af;
}

.node.admin {
  fill: #f3e8ff;
  stroke: #a855f7;
}

.node-diamond {
  fill: #dcfce7;
  stroke: #22c55e;
  stroke-width: 2;
}

.node-end {
  fill: #22c55e;
  stroke: #16a34a;
  stroke-width: 3;
}

.node-fail {
  fill: #fee2e2;
  stroke: #ef4444;
  stroke-width: 2;
}

.node-title {
  font-size: 14px;
  font-weight: 600;
  fill: #1f2937;
  text-anchor: middle;
}

.node-desc {
  font-size: 11px;
  fill: #6b7280;
  text-anchor: middle;
}

.status-tag {
  stroke: none;
}

.status-tag.default {
  fill: #e5e7eb;
}

.status-tag.warning {
  fill: #fbbf24;
}

.status-tag.primary {
  fill: #3b82f6;
}

.status-tag.success {
  fill: #22c55e;
}

.status-text {
  font-size: 10px;
  fill: #fff;
  text-anchor: middle;
  font-weight: 500;
}

.flow-line {
  stroke: #9ca3af;
  stroke-width: 2;
  fill: none;
}

.flow-line.success {
  stroke: #22c55e;
  stroke-width: 3;
}

.flow-line.fail {
  stroke: #ef4444;
  stroke-width: 2;
}

.branch-label {
  font-size: 11px;
  fill: #6b7280;
}

.tip-title {
  font-size: 14px;
  font-weight: 600;
  fill: #92400e;
  text-anchor: middle;
}

.tip-text {
  font-size: 12px;
  fill: #78350f;
}

.chart-title {
  font-size: 20px;
  font-weight: 700;
  fill: #1f2937;
  text-anchor: middle;
}

/* 角色职责样式 */
.roles-content {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 1200px) {
  .roles-content {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .roles-content {
    grid-template-columns: 1fr;
  }
}

.role-card {
  background: #fff;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  overflow: hidden;
}

.role-card.salesperson {
  border-color: #f59e0b;
}

.role-card.salesperson .role-header {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.role-card.store {
  border-color: #22c55e;
}

.role-card.store .role-header {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.role-card.admin {
  border-color: #a855f7;
}

.role-card.admin .role-header {
  background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
}

.role-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.role-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #374151;
}

.role-info h3 {
  margin: 0;
  font-size: 18px;
  color: #1f2937;
}

.role-info p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.role-body {
  padding: 16px;
}

.role-section {
  margin-bottom: 16px;
}

.role-section:last-child {
  margin-bottom: 0;
}

.role-section h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 6px;
}

.role-section ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #6b7280;
}

.role-section li {
  margin-bottom: 4px;
}

.compare-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  font-size: 12px;
}

.compare-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  border-bottom: 1px solid #e5e7eb;
}

.compare-row:last-child {
  border-bottom: none;
}

.compare-row.header {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.compare-row span {
  padding: 8px;
  text-align: center;
  color: #6b7280;
}

.compare-row span:first-child {
  text-align: left;
}

.compare-row .yes {
  color: #22c55e;
  font-weight: 600;
}

.compare-row .no {
  color: #ef4444;
}

/* 风控卡片 */
.risk-card {
  grid-column: 1 / -1;
  background: #fff;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  padding: 20px;
}

.risk-card h3 {
  margin: 0 0 16px;
  font-size: 16px;
  color: #1f2937;
  text-align: center;
}

.risk-levels {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 768px) {
  .risk-levels {
    grid-template-columns: repeat(2, 1fr);
  }
}

.risk-level {
  text-align: center;
  padding: 16px;
  border-radius: 8px;
}

.risk-level.level-0 {
  background: #dcfce7;
  border: 1px solid #22c55e;
}

.risk-level.level-1 {
  background: #fef3c7;
  border: 1px solid #f59e0b;
}

.risk-level.level-2 {
  background: #fed7aa;
  border: 1px solid #f97316;
}

.risk-level.level-3 {
  background: #fee2e2;
  border: 1px solid #ef4444;
}

.level-badge {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.level-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.level-desc {
  font-size: 12px;
  color: #6b7280;
}

.risk-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 13px;
  color: #6b7280;
}

/* 版本信息 */
.version-info {
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
  padding: 24px;
  margin-top: 20px;
}

.version-info p {
  margin: 4px 0;
}
</style>
