# 交易审计追踪系统技术实现文档

**创建日期**：2026-01-22
**作者**：Claude
**状态**：已部署生产

---

## 一、系统架构

### 1.1 设计目标

确保每笔交易数据全程可溯源，出问题时可快速定位和补救。

### 1.2 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                    管理后台 (admin)                          │
│              /api/admin/audit/* API端点                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                 auditTraceController.ts                      │
│        (审计控制器 - 处理HTTP请求)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                 auditTraceService.ts                         │
│        (审计服务 - 核心业务逻辑)                              │
│  ├─ createTransactionTrace()  创建追踪记录                   │
│  ├─ createBalanceSnapshot()   创建余额快照                   │
│  ├─ runReconciliation()       执行对账                       │
│  ├─ detectDuplicateSettlement() 检测重复结算                 │
│  └─ manualBalanceAdjust()     人工调账                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    数据库 (MySQL)                            │
│  ├─ transaction_traces   交易追踪表                          │
│  ├─ balance_snapshots    余额快照表                          │
│  ├─ reconciliation_logs  对账记录表                          │
│  └─ audit_alerts         异常告警表                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、数据模型设计

### 2.1 交易追踪表 (transaction_traces)

```sql
CREATE TABLE transaction_traces (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trace_id VARCHAR(32) UNIQUE,      -- 唯一追踪ID: TRC + 时间戳 + 随机数
  trace_type VARCHAR(30),           -- 交易类型
  agent_id INT,                     -- 推销员ID
  amount DECIMAL(10,2),             -- 变动金额
  before_balance DECIMAL(10,2),     -- 变动前余额
  after_balance DECIMAL(10,2),      -- 变动后余额
  source_table VARCHAR(50),         -- 源表名
  source_id INT,                    -- 源记录ID
  source_no VARCHAR(50),            -- 源单号
  details TEXT,                     -- JSON详情
  operator_type VARCHAR(20),        -- 操作人类型
  operator_id INT,                  -- 操作人ID
  operator_name VARCHAR(50),        -- 操作人姓名
  status VARCHAR(20) DEFAULT 'SUCCESS',
  checksum VARCHAR(64),             -- SHA256校验和（防篡改）
  reversed_by INT,                  -- 被哪条记录冲正
  reverses_id INT,                  -- 冲正哪条记录
  remark VARCHAR(255),
  created_at DATETIME DEFAULT NOW(),

  INDEX (agent_id, created_at),
  INDEX (trace_type, created_at),
  INDEX (source_table, source_id)
);
```

**交易类型枚举**：
| 类型 | 说明 | 触发场景 |
|------|------|---------|
| PROFIT_SETTLE | 利润结算 | 提货核销时 |
| COUPON_ISSUE | 代金券发放 | 奖励发放时 |
| COUPON_REDEEM | 代金券核销 | 提货使用代金券时 |
| RECHARGE | 充值 | 管理员充值时 |
| WITHDRAW | 提现 | 推销员提现时 |
| GIFT_COST | 赠品成本 | 赠品成本扣除时 |
| BALANCE_ADJUST | 人工调账 | 管理员调账时 |
| REFUND | 退款 | 订单退款时 |

### 2.2 余额快照表 (balance_snapshots)

```sql
CREATE TABLE balance_snapshots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agent_id INT,
  balance DECIMAL(10,2),
  total_commission DECIMAL(10,2),
  total_sales DECIMAL(10,2),
  team_sales DECIMAL(10,2),
  snapshot_type VARCHAR(20),        -- DAILY/WEEKLY/MONTHLY/MANUAL/PRE_OPERATION
  related_trace_id VARCHAR(32),     -- 关联的交易追踪ID
  transaction_count INT,            -- 交易数量
  expected_balance DECIMAL(10,2),   -- 根据流水计算的预期余额
  is_consistent BOOLEAN DEFAULT TRUE,
  discrepancy DECIMAL(10,2),        -- 差异金额
  remark VARCHAR(255),
  created_at DATETIME DEFAULT NOW()
);
```

### 2.3 对账记录表 (reconciliation_logs)

```sql
CREATE TABLE reconciliation_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  start_time DATETIME,
  end_time DATETIME,
  reconcile_type VARCHAR(20),       -- DAILY/WEEKLY/MONTHLY/MANUAL
  total_agents INT,
  consistent_count INT,
  discrepancy_count INT,
  discrepancies TEXT,               -- JSON数组
  executed_by VARCHAR(20),          -- SYSTEM/ADMIN
  executor_id INT,
  execution_time INT,               -- 耗时(毫秒)
  status VARCHAR(20) DEFAULT 'COMPLETED',
  error_message TEXT,
  created_at DATETIME DEFAULT NOW()
);
```

### 2.4 异常告警表 (audit_alerts)

```sql
CREATE TABLE audit_alerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  alert_type VARCHAR(30),           -- 告警类型
  severity VARCHAR(10),             -- LOW/MEDIUM/HIGH/CRITICAL
  agent_id INT,
  related_table VARCHAR(50),
  related_id INT,
  title VARCHAR(100),
  description TEXT,
  details TEXT,                     -- JSON详情
  status VARCHAR(20) DEFAULT 'PENDING',
  handled_by INT,
  handled_at DATETIME,
  resolution TEXT,
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME
);
```

---

## 三、核心功能实现

### 3.1 创建交易追踪记录

**文件**: `server/src/services/audit/auditTraceService.ts`

```typescript
export async function createTransactionTrace(
  tx: Prisma.TransactionClient,  // 在事务中执行
  params: {
    traceType: TraceType;
    agentId: number;
    amount: number;
    beforeBalance: number;
    afterBalance: number;
    sourceTable: string;
    sourceId: number;
    sourceNo?: string;
    details?: Record<string, unknown>;
    operatorType: OperatorType;
    operatorId?: number;
    operatorName?: string;
    remark?: string;
  }
): Promise<string> {
  // 1. 生成唯一追踪ID
  const traceId = generateTraceId();  // TRC + 时间戳(36进制) + 随机数

  // 2. 计算SHA256校验和（防篡改）
  const checksum = calculateChecksum({
    traceId, agentId, amount, beforeBalance, afterBalance, ...
  });

  // 3. 写入数据库
  await tx.transactionTrace.create({ data: { ... } });

  // 4. 检查是否需要触发告警
  await checkAndCreateAlerts(tx, params);

  return traceId;
}
```

**追踪ID生成规则**：
```typescript
function generateTraceId(): string {
  const timestamp = Date.now().toString(36);  // 时间戳转36进制
  const random = Math.random().toString(36).substring(2, 8);
  return `TRC${timestamp}${random}`.toUpperCase();
  // 示例: TRCMKP6RMLBX5AX2G
}
```

### 3.2 利润结算时自动追踪

**文件**: `server/src/services/profit/settlementExecutor.ts`

```typescript
export async function executeSettlement(
  agentId: number,
  amount: number,
  sourceType: 'RESERVATION' | 'ORDER',
  sourceId: number,
  sourceNo: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  // 1. 检测重复结算
  const isDuplicate = await detectDuplicateSettlement(
    sourceType === 'RESERVATION' ? 'reservations' : 'orders',
    sourceId,
    TraceType.PROFIT_SETTLE
  );
  if (isDuplicate) {
    console.warn('检测到重复结算尝试');
    return;  // 阻止重复结算
  }

  // 2. 锁定行获取当前余额
  const agents = await tx.$queryRaw`
    SELECT id, balance FROM agents WHERE id = ${agentId} FOR UPDATE
  `;
  const beforeBalance = Number(agents[0].balance);
  const afterBalance = beforeBalance + amount;

  // 3. 更新余额
  await tx.$executeRaw`
    UPDATE agents SET balance = balance + ${amount} WHERE id = ${agentId}
  `;

  // 4. 创建FundFlow记录（原有逻辑）
  await tx.fundFlow.create({ data: { ... } });

  // 5. 创建审计追踪记录（新增）
  await createTransactionTrace(tx, {
    traceType: TraceType.PROFIT_SETTLE,
    agentId,
    amount,
    beforeBalance,
    afterBalance,
    sourceTable: 'reservations',
    sourceId,
    sourceNo,
    operatorType: OperatorType.SYSTEM,
    remark: `利润结算（预约号：${sourceNo}）`
  });
}
```

### 3.3 代金券核销时自动追踪

**文件**: `server/src/services/campaign2026/couponService.ts`

```typescript
export async function redeemCouponsForPickup(params, tx) {
  for (const coupon of coupons) {
    // 1. 更新代金券状态
    await tx.coupon.update({ ... });

    // 2. 记录FundFlow
    await tx.fundFlow.create({
      data: {
        agentId,
        type: 'COUPON_REDEEM',
        amount: -couponAmount,
        beforeBalance,
        afterBalance: currentBalance,
        ...
      }
    });

    // 3. 创建审计追踪记录（新增）
    await createTransactionTrace(tx, {
      traceType: TraceType.COUPON_REDEEM,
      agentId,
      amount: -couponAmount,
      beforeBalance,
      afterBalance: currentBalance,
      sourceTable: 'coupons',
      sourceId: coupon.id,
      sourceNo: coupon.code,
      operatorType: OperatorType.STAFF,
      operatorId,
      remark: `代金券核销：${coupon.code}`
    });
  }
}
```

### 3.4 自动告警检测

```typescript
async function checkAndCreateAlerts(tx, params) {
  // 检查负余额
  if (params.afterBalance < 0) {
    await tx.auditAlert.create({
      data: {
        alertType: 'NEGATIVE_BALANCE',
        severity: 'MEDIUM',
        agentId: params.agentId,
        title: '推销员余额为负',
        description: `余额变为 ${params.afterBalance}元`
      }
    });
  }

  // 检查大额交易（超过5000元）
  if (Math.abs(params.amount) >= 5000) {
    await tx.auditAlert.create({
      data: {
        alertType: 'LARGE_TRANSACTION',
        severity: 'LOW',
        title: '大额交易记录',
        ...
      }
    });
  }
}
```

### 3.5 重复结算检测

```typescript
export async function detectDuplicateSettlement(
  sourceTable: string,
  sourceId: number,
  traceType: TraceType
): Promise<boolean> {
  const existing = await prisma.transactionTrace.findFirst({
    where: { sourceTable, sourceId, traceType, status: 'SUCCESS' }
  });

  if (existing) {
    // 创建HIGH级别告警
    await prisma.auditAlert.create({
      data: {
        alertType: 'DUPLICATE_SETTLE',
        severity: 'HIGH',
        title: '检测到重复结算尝试',
        ...
      }
    });
    return true;
  }
  return false;
}
```

### 3.6 余额快照

```typescript
export async function createBalanceSnapshot(
  agentId: number,
  snapshotType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MANUAL' | 'PRE_OPERATION',
  relatedTraceId?: string
): Promise<void> {
  // 1. 获取当前余额
  const agent = await prisma.agent.findUnique({ ... });

  // 2. 计算期望余额（基于交易追踪记录之和）
  const traces = await prisma.transactionTrace.aggregate({
    where: { agentId, status: 'SUCCESS' },
    _sum: { amount: true },
    _count: true
  });
  const expectedBalance = Number(traces._sum.amount || 0);

  // 3. 比对是否一致
  const actualBalance = Number(agent.balance);
  const discrepancy = actualBalance - expectedBalance;
  const isConsistent = Math.abs(discrepancy) < 0.01;

  // 4. 创建快照
  await prisma.balanceSnapshot.create({
    data: {
      agentId,
      balance: agent.balance,
      snapshotType,
      expectedBalance,
      isConsistent,
      discrepancy: isConsistent ? null : discrepancy,
      transactionCount: traces._count
    }
  });

  // 5. 如果不一致，创建告警
  if (!isConsistent) {
    await prisma.auditAlert.create({ ... });
  }
}
```

### 3.7 人工调账

```typescript
export async function manualBalanceAdjust(
  agentId: number,
  amount: number,
  reason: string,
  operatorId: number,
  operatorName: string
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    // 1. 获取当前余额
    const agent = await tx.agent.findUnique({ ... });
    const beforeBalance = Number(agent.balance);
    const afterBalance = beforeBalance + amount;

    // 2. 更新余额
    await tx.agent.update({
      where: { id: agentId },
      data: { balance: afterBalance }
    });

    // 3. 创建审计追踪
    const traceId = await createTransactionTrace(tx, {
      traceType: TraceType.BALANCE_ADJUST,
      agentId,
      amount,
      beforeBalance,
      afterBalance,
      sourceTable: 'manual_adjustment',
      sourceId: 0,
      details: { reason, adjustType: amount > 0 ? 'ADD' : 'DEDUCT' },
      operatorType: OperatorType.ADMIN,
      operatorId,
      operatorName,
      remark: `人工调账：${reason}`
    });

    return traceId;
  }, { timeout: 30000 }).then(async (traceId) => {
    // 4. 在事务外创建快照（避免嵌套事务超时）
    await createBalanceSnapshot(agentId, 'PRE_OPERATION', traceId);
    return traceId;
  });
}
```

---

## 四、定时任务

**文件**: `server/src/tasks/auditReconciliationTask.ts`

```typescript
export function startAuditReconciliationTasks(): void {
  // 每日凌晨2点 - 创建余额快照
  cron.schedule('0 2 * * *', async () => {
    const result = await createAllBalanceSnapshots('DAILY');
    console.log(`每日快照完成: ${result.total}人, 差异${result.discrepancy}人`);
  }, { timezone: 'Asia/Shanghai' });

  // 每日凌晨3点 - 执行日对账
  cron.schedule('0 3 * * *', async () => {
    const endTime = new Date();
    const startTime = new Date(endTime);
    startTime.setDate(startTime.getDate() - 1);
    await runReconciliation(startTime, endTime, 'DAILY');
  }, { timezone: 'Asia/Shanghai' });

  // 每周一凌晨4点 - 执行周对账
  cron.schedule('0 4 * * 1', async () => { ... });

  // 每月1日凌晨5点 - 执行月度对账
  cron.schedule('0 5 1 * *', async () => { ... });

  // 每小时检查告警
  cron.schedule('0 * * * *', async () => {
    const overview = await getAuditOverview();
    if (overview.criticalAlerts > 0) {
      console.error(`警告！存在${overview.criticalAlerts}个严重告警`);
    }
  });
}
```

---

## 五、API端点

**文件**: `server/src/routes/auditTrace.ts`

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | /api/admin/audit/overview | 审计概览 |
| GET | /api/admin/audit/agent/:agentId/traces | 推销员资金链路 |
| GET | /api/admin/audit/reservation/:id/trace | 预约资金追溯 |
| GET | /api/admin/audit/trace/:traceId | 追踪详情 |
| GET | /api/admin/audit/alerts | 告警列表 |
| POST | /api/admin/audit/alerts/:id/resolve | 处理告警 |
| POST | /api/admin/audit/agent/:id/adjust | 人工调账 |
| GET | /api/admin/audit/snapshots | 快照列表 |
| POST | /api/admin/audit/agent/:id/snapshot | 创建快照 |
| POST | /api/admin/audit/snapshots/batch | 批量快照 |
| POST | /api/admin/audit/reconciliation | 手动对账 |
| GET | /api/admin/audit/reconciliation/logs | 对账记录 |

---

## 六、数据流图

### 6.1 提货核销时的数据流

```
客户到店提货
     │
     ▼
┌─────────────────┐
│ pickupService   │
│ completePickup()│
└────────┬────────┘
         │
    ┌────▼────┐
    │ 事务开始 │
    └────┬────┘
         │
    ┌────▼─────────────────────┐
    │ settlementExecutor       │
    │ settleAllProfits()       │
    │  ├─ 检测重复结算          │
    │  ├─ 锁定行获取余额        │
    │  ├─ 更新余额              │
    │  ├─ 创建FundFlow         │
    │  └─ 创建TransactionTrace │
    └────┬─────────────────────┘
         │
    ┌────▼─────────────────────┐
    │ couponService            │
    │ redeemCouponsForPickup() │
    │  ├─ 更新代金券状态        │
    │  ├─ 扣减余额              │
    │  ├─ 创建FundFlow         │
    │  └─ 创建TransactionTrace │
    └────┬─────────────────────┘
         │
    ┌────▼────┐
    │ 事务提交 │
    └────┬────┘
         │
         ▼
    数据持久化完成
```

### 6.2 余额校验流程

```
定时任务触发 (每日2点)
         │
         ▼
┌─────────────────────────────┐
│ 遍历所有活跃推销员            │
└────────┬────────────────────┘
         │
    ┌────▼────────────────────┐
    │ 获取当前余额 (actual)    │
    └────┬────────────────────┘
         │
    ┌────▼────────────────────┐
    │ 计算交易追踪总和 (expected)│
    │ SUM(transaction_traces)  │
    └────┬────────────────────┘
         │
    ┌────▼────────────────────┐
    │ actual == expected ?     │
    └────┬──────────┬─────────┘
         │是        │否
    ┌────▼────┐  ┌──▼──────────┐
    │记录一致  │  │记录差异      │
    │快照     │  │创建告警      │
    └─────────┘  └─────────────┘
```

---

## 七、文件清单

| 文件 | 功能 |
|------|------|
| `server/prisma/schema.prisma` | 4张审计表定义（1808-1980行） |
| `server/src/services/audit/auditTraceService.ts` | 审计追踪核心服务 |
| `server/src/controllers/auditTraceController.ts` | 审计API控制器 |
| `server/src/routes/auditTrace.ts` | 审计路由定义 |
| `server/src/tasks/auditReconciliationTask.ts` | 对账定时任务 |
| `server/src/services/profit/settlementExecutor.ts` | 利润结算（集成追踪） |
| `server/src/services/campaign2026/couponService.ts` | 代金券（集成追踪） |

---

## 八、使用示例

### 8.1 查询推销员资金链路

```bash
GET /api/admin/audit/agent/40/traces?startDate=2026-01-01&pageSize=10

Response:
{
  "code": 0,
  "data": {
    "traces": [
      {
        "traceId": "TRCMKP6RMLBX5AX2G",
        "traceType": "BALANCE_ADJUST",
        "amount": 0.01,
        "beforeBalance": 9184.61,
        "afterBalance": 9184.62,
        "sourceTable": "manual_adjustment",
        "remark": "人工调账：审计追踪系统测试",
        "createdAt": "2026-01-22T08:21:00.000Z"
      }
    ],
    "summary": {
      "totalIn": 100.00,
      "totalOut": 50.00,
      "netChange": 50.00,
      "currentBalance": 9184.61
    }
  }
}
```

### 8.2 人工调账

```bash
POST /api/admin/audit/agent/40/adjust
Content-Type: application/json

{
  "amount": 100,
  "reason": "补发周销售奖励"
}

Response:
{
  "code": 0,
  "data": { "traceId": "TRCMKP7ABC123XYZ" },
  "message": "调账成功"
}
```

### 8.3 追溯预约资金流向

```bash
GET /api/admin/audit/reservation/123/trace

Response:
{
  "code": 0,
  "data": {
    "reservation": {
      "id": 123,
      "reservationNo": "MQ20260122001",
      "totalAmount": 500,
      "status": 3,
      "settled": true
    },
    "profitDistribution": {
      "masterProfit": 100,
      "level1Profit": 50,
      "level2Profit": 30,
      "giftCost": 10
    },
    "traces": [
      { "traceId": "...", "agentId": 32, "traceType": "PROFIT_SETTLE", "amount": 100 },
      { "traceId": "...", "agentId": 40, "traceType": "PROFIT_SETTLE", "amount": 50 }
    ],
    "couponsUsed": [
      { "couponCode": "CPN123456", "amount": 20, "agentId": 40 }
    ]
  }
}
```

---

## 九、注意事项

1. **事务一致性**：所有追踪记录必须在同一事务内创建，确保与业务操作原子性
2. **校验和**：每条追踪记录包含SHA256校验和，防止数据被篡改
3. **历史数据**：系统部署前的交易没有追踪记录，会导致余额校验不一致告警（属正常）
4. **性能考虑**：批量快照时遍历所有推销员，大量数据时注意性能
5. **告警处理**：HIGH级别告警应及时处理，CRITICAL级别告警需要立即响应
