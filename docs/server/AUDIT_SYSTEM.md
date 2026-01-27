# 审计追踪系统文档

**版本**: v1.0
**创建日期**: 2026-01-22
**最后更新**: 2026-01-24

---

## 一、系统概述

### 1.1 核心功能

审计追踪系统是蒙庆烟花预约系统的财务安全核心模块，提供以下能力：

| 功能 | 说明 |
|------|------|
| 交易追踪 | 记录所有资金变动的完整链路，可追溯到每笔交易的源头 |
| 余额快照 | 定期记录推销员余额，用于对账和数据恢复 |
| 自动对账 | 定时检查余额一致性，发现问题自动告警 |
| 异常检测 | 实时检测重复结算、大额交易、负余额等异常情况 |
| 人工调账 | 支持管理员手动调整余额，全程审计记录 |

### 1.2 设计原则

1. **全链路可追溯** - 每笔资金变动都能追溯到原始业务单据
2. **防篡改** - 使用SHA256校验和防止数据被篡改
3. **实时告警** - 异常情况即时创建告警，快速响应
4. **自动对账** - 定时任务自动检查，减少人工工作量
5. **数据恢复** - 余额快照支持问题发生时快速定位和恢复

### 1.3 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      管理后台                                 │
│  审计概览 │ 交易追踪 │ 告警管理 │ 对账记录 │ 人工调账          │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API
┌─────────────────────────▼───────────────────────────────────┐
│                   审计追踪服务层                              │
│  createTransactionTrace()  │  runReconciliation()            │
│  createBalanceSnapshot()   │  detectDuplicateSettlement()    │
│  manualBalanceAdjust()     │  getAuditOverview()             │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                     数据持久层                               │
│  TransactionTrace │ BalanceSnapshot │ ReconciliationLog │ AuditAlert │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、数据模型

### 2.1 交易追踪表 (TransactionTrace)

记录所有资金变动的完整链路。

**表名**: `transaction_traces`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| trace_id | VARCHAR(32) | 唯一追踪ID，格式：TRC + 时间戳 + 随机数 |
| trace_type | VARCHAR(30) | 交易类型（见2.5节枚举） |
| agent_id | INT | 推销员ID |
| amount | DECIMAL(10,2) | 变动金额（正数增加，负数减少） |
| before_balance | DECIMAL(10,2) | 变动前余额 |
| after_balance | DECIMAL(10,2) | 变动后余额 |
| source_table | VARCHAR(50) | 源表名（reservations/coupons等） |
| source_id | INT | 源记录ID |
| source_no | VARCHAR(50) | 源单号（如MQ开头的预约号） |
| details | TEXT | JSON格式详细信息（计算过程等） |
| operator_type | VARCHAR(20) | 操作人类型（SYSTEM/STAFF/ADMIN/AGENT） |
| operator_id | INT | 操作人ID |
| operator_name | VARCHAR(50) | 操作人姓名 |
| status | VARCHAR(20) | 状态（SUCCESS/FAILED/PENDING/REVERSED） |
| checksum | VARCHAR(64) | SHA256校验和（防篡改） |
| reversed_by | INT | 被哪条记录冲正 |
| reverses_id | INT | 冲正哪条记录 |
| remark | VARCHAR(255) | 备注 |
| created_at | DATETIME | 创建时间 |

**索引**:
- `agent_id, created_at` - 按推销员查询交易
- `trace_type, created_at` - 按类型统计
- `source_table, source_id` - 追溯源头
- `trace_id` - 唯一查询
- `status` - 状态过滤

### 2.2 余额快照表 (BalanceSnapshot)

定期记录推销员余额，用于对账和恢复。

**表名**: `balance_snapshots`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| agent_id | INT | 推销员ID |
| balance | DECIMAL(10,2) | 快照时余额 |
| total_commission | DECIMAL(10,2) | 累计分润 |
| total_sales | DECIMAL(10,2) | 个人销售额 |
| team_sales | DECIMAL(10,2) | 团队销售额 |
| snapshot_type | VARCHAR(20) | 快照类型 |
| related_trace_id | VARCHAR(32) | 关联的交易追踪ID |
| transaction_count | INT | 该时间段交易数量 |
| expected_balance | DECIMAL(10,2) | 根据流水计算的预期余额 |
| is_consistent | BOOLEAN | 余额是否一致 |
| discrepancy | DECIMAL(10,2) | 差异金额 |
| remark | VARCHAR(255) | 备注 |
| created_at | DATETIME | 创建时间 |

**快照类型枚举**:

| 类型 | 说明 | 触发时机 |
|------|------|---------|
| DAILY | 每日快照 | 凌晨2点自动 |
| WEEKLY | 每周快照 | 周一凌晨4点 |
| MONTHLY | 每月快照 | 每月1日凌晨5点 |
| MANUAL | 人工快照 | 管理员手动触发 |
| PRE_OPERATION | 操作前快照 | 重要操作（如调账）前自动 |

### 2.3 对账记录表 (ReconciliationLog)

记录每次对账的结果。

**表名**: `reconciliation_logs`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| start_time | DATETIME | 对账起始时间 |
| end_time | DATETIME | 对账结束时间 |
| reconcile_type | VARCHAR(20) | 对账类型（DAILY/WEEKLY/MONTHLY/MANUAL） |
| total_agents | INT | 检查的推销员数量 |
| consistent_count | INT | 余额一致数量 |
| discrepancy_count | INT | 有差异数量 |
| discrepancies | TEXT | 差异详情JSON数组 |
| executed_by | VARCHAR(20) | 执行者（SYSTEM/ADMIN） |
| executor_id | INT | 执行人ID |
| execution_time | INT | 执行耗时（毫秒） |
| status | VARCHAR(20) | 状态（RUNNING/COMPLETED/FAILED） |
| error_message | TEXT | 错误信息 |
| created_at | DATETIME | 创建时间 |

**差异详情格式**:
```json
[
  {
    "agentId": 123,
    "expected": 1000.00,
    "actual": 980.00,
    "diff": -20.00,
    "possibleCause": "交易TRC001与TRC002之间余额断裂"
  }
]
```

### 2.4 异常告警表 (AuditAlert)

记录系统检测到的异常。

**表名**: `audit_alerts`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| alert_type | VARCHAR(30) | 告警类型 |
| severity | VARCHAR(10) | 严重程度 |
| agent_id | INT | 涉及的推销员ID |
| related_table | VARCHAR(50) | 涉及的表名 |
| related_id | INT | 涉及的记录ID |
| title | VARCHAR(100) | 告警标题 |
| description | TEXT | 详细描述 |
| details | TEXT | JSON格式的详细数据 |
| status | VARCHAR(20) | 处理状态 |
| handled_by | INT | 处理人ID |
| handled_at | DATETIME | 处理时间 |
| resolution | TEXT | 解决方案描述 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 2.5 交易类型枚举

| 类型 | 常量 | 说明 |
|------|------|------|
| 利润结算 | PROFIT_SETTLE | 预约核销时的利润入账 |
| 代金券发放 | COUPON_ISSUE | 发放代金券时的记录 |
| 代金券核销 | COUPON_REDEEM | 核销代金券时的余额扣减 |
| 充值 | RECHARGE | 余额充值 |
| 提现 | WITHDRAW | 余额提现 |
| 赠品成本 | GIFT_COST | 赠品成本扣减 |
| 人工调账 | BALANCE_ADJUST | 管理员手动调整 |
| 退款 | REFUND | 退款入账 |

### 2.6 告警类型枚举

| 类型 | 常量 | 说明 | 严重程度 |
|------|------|------|---------|
| 余额不一致 | BALANCE_MISMATCH | 余额与交易记录不一致 | HIGH |
| 重复结算 | DUPLICATE_SETTLE | 检测到重复结算尝试 | HIGH |
| 负余额 | NEGATIVE_BALANCE | 推销员余额变为负数 | MEDIUM |
| 大额交易 | LARGE_TRANSACTION | 单笔交易超过5000元 | LOW |
| 可疑模式 | SUSPICIOUS_PATTERN | 检测到可疑交易模式 | MEDIUM |
| 缺失追踪 | MISSING_TRACE | 缺失交易追踪记录 | HIGH |

### 2.7 告警严重程度

| 等级 | 常量 | 说明 |
|------|------|------|
| 低 | LOW | 信息性告警，无需立即处理 |
| 中 | MEDIUM | 需要关注，建议当日处理 |
| 高 | HIGH | 需要优先处理 |
| 严重 | CRITICAL | 紧急处理，可能影响资金安全 |

### 2.8 告警处理状态

| 状态 | 常量 | 说明 |
|------|------|------|
| 待处理 | PENDING | 新创建的告警 |
| 调查中 | INVESTIGATING | 正在调查 |
| 已解决 | RESOLVED | 已人工处理 |
| 已忽略 | IGNORED | 确认为误报 |
| 自动修复 | AUTO_FIXED | 系统自动修复 |

---

## 三、API接口

所有接口需要管理员认证，前缀：`/api/admin/audit`

### 3.1 审计概览

**GET /overview**

获取审计系统整体状态。

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "todayTransactions": 156,
    "todayAmount": 12580.00,
    "pendingAlerts": 3,
    "criticalAlerts": 0,
    "lastReconciliation": "2026-01-24T03:00:00.000Z",
    "inconsistentAgents": 1
  },
  "message": "获取成功"
}
```

### 3.2 推销员资金链路查询

**GET /agent/:agentId/traces**

查询指定推销员的完整资金变动记录。

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | path | 是 | 推销员ID |
| startDate | query | 否 | 起始日期 |
| endDate | query | 否 | 结束日期 |
| traceType | query | 否 | 交易类型 |
| page | query | 否 | 页码，默认1 |
| pageSize | query | 否 | 每页数量，默认20 |

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "traces": [
      {
        "traceId": "TRC1706054321ABC",
        "traceType": "PROFIT_SETTLE",
        "amount": 50.00,
        "beforeBalance": 100.00,
        "afterBalance": 150.00,
        "sourceTable": "reservations",
        "sourceNo": "MQ20260124001",
        "remark": "预约利润结算",
        "createdAt": "2026-01-24T10:30:00.000Z"
      }
    ],
    "summary": {
      "totalIn": 1500.00,
      "totalOut": 200.00,
      "netChange": 1300.00,
      "currentBalance": 1300.00
    },
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 45
    }
  },
  "message": "获取成功"
}
```

### 3.3 预约资金追溯

**GET /reservation/:reservationId/trace**

追溯单笔预约的完整资金流向。

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "reservation": {
      "id": 123,
      "reservationNo": "MQ20260124001",
      "totalAmount": 1000.00,
      "status": 3,
      "settled": true
    },
    "profitDistribution": {
      "masterProfit": 100.00,
      "level1Profit": 80.00,
      "level2Profit": 50.00,
      "giftCost": 10.00
    },
    "traces": [
      {
        "traceId": "TRC001",
        "agentId": 1,
        "agentName": "总代理",
        "traceType": "PROFIT_SETTLE",
        "amount": 100.00,
        "createdAt": "2026-01-24T10:30:00.000Z"
      },
      {
        "traceId": "TRC002",
        "agentId": 5,
        "agentName": "一级推销员A",
        "traceType": "PROFIT_SETTLE",
        "amount": 80.00,
        "createdAt": "2026-01-24T10:30:00.000Z"
      }
    ],
    "couponsUsed": [
      {
        "couponCode": "COUPON001",
        "amount": 20.00,
        "agentId": 5
      }
    ]
  },
  "message": "获取成功"
}
```

### 3.4 交易追踪详情

**GET /trace/:traceId**

获取单条交易追踪的详细信息。

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "traceId": "TRC1706054321ABC",
    "traceType": "PROFIT_SETTLE",
    "amount": "50.00",
    "beforeBalance": "100.00",
    "afterBalance": "150.00",
    "sourceTable": "reservations",
    "sourceId": 123,
    "sourceNo": "MQ20260124001",
    "details": {
      "retailPrice": 200,
      "supplyPrice": 150,
      "profit": 50,
      "formula": "retailPrice - supplyPrice"
    },
    "operatorType": "SYSTEM",
    "checksum": "abc123...",
    "status": "SUCCESS",
    "agent": {
      "id": 5,
      "name": "张三",
      "phone": "138****1234"
    },
    "createdAt": "2026-01-24T10:30:00.000Z"
  },
  "message": "获取成功"
}
```

### 3.5 告警列表

**GET /alerts**

获取告警列表。

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| alertType | query | 否 | 告警类型 |
| severity | query | 否 | 严重程度 |
| agentId | query | 否 | 推销员ID |
| status | query | 否 | 状态，默认PENDING |
| page | query | 否 | 页码 |
| pageSize | query | 否 | 每页数量 |

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "alertType": "NEGATIVE_BALANCE",
        "severity": "MEDIUM",
        "agentId": 10,
        "title": "推销员余额为负",
        "description": "推销员ID 10 余额变为负数：-50.00元",
        "details": {
          "amount": -70.00,
          "afterBalance": -50.00,
          "traceType": "COUPON_REDEEM"
        },
        "status": "PENDING",
        "createdAt": "2026-01-24T09:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 3
    }
  },
  "message": "获取成功"
}
```

### 3.6 处理告警

**POST /alerts/:alertId/resolve**

处理指定告警。

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| alertId | path | 是 | 告警ID |
| resolution | body | 是 | 处理说明 |
| status | body | 否 | 状态（RESOLVED/IGNORED），默认RESOLVED |

**请求示例**:
```json
{
  "resolution": "已与推销员核实，余额负数是因为代金券核销，下次分润会自动补齐",
  "status": "RESOLVED"
}
```

### 3.7 人工调账

**POST /agent/:agentId/adjust**

对推销员进行人工调账。

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | path | 是 | 推销员ID |
| amount | body | 是 | 调账金额（正数增加，负数减少） |
| reason | body | 是 | 调账原因 |

**请求示例**:
```json
{
  "amount": 50.00,
  "reason": "补偿因系统故障未入账的利润"
}
```

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "traceId": "TRC1706054321XYZ"
  },
  "message": "调账成功"
}
```

**注意**: 调账默认不允许使余额变为负数。如需扣减且余额不足，会返回错误。

### 3.8 余额快照列表

**GET /snapshots**

获取余额快照列表。

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | query | 否 | 推销员ID |
| snapshotType | query | 否 | 快照类型 |
| isConsistent | query | 否 | 是否一致（true/false） |
| page | query | 否 | 页码 |
| pageSize | query | 否 | 每页数量 |

### 3.9 创建余额快照

**POST /agent/:agentId/snapshot**

手动为指定推销员创建余额快照。

### 3.10 批量创建快照

**POST /snapshots/batch**

为所有活跃推销员创建余额快照。

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "total": 150,
    "consistent": 148,
    "discrepancy": 2
  },
  "message": "快照创建完成：共150人，一致148人，差异2人"
}
```

### 3.11 手动对账

**POST /reconciliation**

手动执行对账任务。

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | body | 是 | 起始日期 |
| endDate | body | 是 | 结束日期 |

**请求示例**:
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-24"
}
```

### 3.12 对账记录列表

**GET /reconciliation/logs**

获取对账记录列表。

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| reconcileType | query | 否 | 对账类型 |
| status | query | 否 | 状态 |
| page | query | 否 | 页码 |
| pageSize | query | 否 | 每页数量 |

---

## 四、定时任务

### 4.1 任务调度

| 时间 | 任务 | 说明 |
|------|------|------|
| 每日02:00 | 每日余额快照 | 为所有活跃推销员创建DAILY快照 |
| 每日03:00 | 每日对账 | 检查前一天的交易一致性 |
| 每周一04:00 | 周对账 | 创建WEEKLY快照并执行周对账 |
| 每月1日05:00 | 月度对账 | 创建MONTHLY快照并执行月对账 |
| 每小时整点 | 告警检查 | 检查待处理告警数量 |

### 4.2 分布式锁

为防止集群环境下任务重复执行，所有定时任务使用分布式锁：

| 任务 | 锁名称 | 超时时间 |
|------|-------|---------|
| 每日快照 | audit-daily-snapshot | 30分钟 |
| 每日对账 | audit-daily-reconciliation | 30分钟 |
| 周对账 | audit-weekly-reconciliation | 60分钟 |
| 月对账 | audit-monthly-reconciliation | 60分钟 |

---

## 五、使用指南

### 5.1 记录交易追踪

在任何资金变动时，调用 `createTransactionTrace()` 函数：

```typescript
import { createTransactionTrace, TraceType, OperatorType } from '../services/audit/auditTraceService';

// 在事务中记录交易追踪
await prisma.$transaction(async (tx) => {
  // 1. 更新余额
  const agent = await tx.agent.findUnique({ where: { id: agentId } });
  const beforeBalance = Number(agent.balance);
  const afterBalance = beforeBalance + profitAmount;

  await tx.agent.update({
    where: { id: agentId },
    data: { balance: afterBalance }
  });

  // 2. 记录交易追踪
  await createTransactionTrace(tx, {
    traceType: TraceType.PROFIT_SETTLE,
    agentId,
    amount: profitAmount,
    beforeBalance,
    afterBalance,
    sourceTable: 'reservations',
    sourceId: reservationId,
    sourceNo: reservation.reservationNo,
    details: { retailPrice, supplyPrice, profit: profitAmount },
    operatorType: OperatorType.SYSTEM,
    remark: '预约利润结算',
  });
});
```

### 5.2 检测重复结算

在结算前检测是否已存在结算记录，防止重复入账：

```typescript
import { detectDuplicateSettlementInTx, TraceType } from '../services/audit/auditTraceService';

await prisma.$transaction(async (tx) => {
  // 使用事务版本检测，确保并发安全
  const isDuplicate = await detectDuplicateSettlementInTx(
    tx,
    'reservations',
    reservationId,
    TraceType.PROFIT_SETTLE,
    agentId
  );

  if (isDuplicate) {
    throw new Error('该预约已结算，不可重复结算');
  }

  // 继续结算逻辑...
});
```

### 5.3 处理异常告警

1. 登录管理后台 → 审计管理 → 告警列表
2. 查看待处理告警，按严重程度排序
3. 点击告警查看详情
4. 根据告警类型进行调查：
   - **BALANCE_MISMATCH**: 检查交易记录是否完整
   - **DUPLICATE_SETTLE**: 检查是否存在重复入账
   - **NEGATIVE_BALANCE**: 确认是否为正常的代金券核销
5. 填写处理说明，选择处理状态

### 5.4 数据恢复流程

当发现数据异常时：

1. 查询推销员资金链路，找到异常交易
2. 创建当前余额快照，记录现状
3. 根据交易追踪计算正确余额
4. 使用人工调账修正余额
5. 将相关告警标记为已解决

---

## 六、关键代码文件

| 文件 | 说明 |
|------|------|
| `server/src/services/audit/auditTraceService.ts` | 审计追踪核心服务（904行） |
| `server/src/controllers/auditTraceController.ts` | 控制器（507行） |
| `server/src/routes/auditTrace.ts` | 路由定义（56行） |
| `server/src/tasks/auditReconciliationTask.ts` | 定时任务（147行） |
| `server/prisma/schema.prisma` | 数据模型（行1830-2004） |

---

## 七、最佳实践

### 7.1 开发规范

1. **所有余额变动必须记录追踪** - 不允许直接修改余额而不记录
2. **使用事务保证一致性** - 余额更新和追踪记录必须在同一事务
3. **结算前检测重复** - 使用 `detectDuplicateSettlementInTx()`
4. **记录完整details** - 便于后续问题定位

### 7.2 运维建议

1. **每日检查告警** - 特别是HIGH和CRITICAL级别
2. **定期审查对账报告** - 关注discrepancy_count
3. **保留快照数据** - 建议保留至少3个月
4. **大额交易复核** - 超过5000元的交易人工确认

### 7.3 故障处理

| 场景 | 处理方式 |
|------|---------|
| 余额与追踪记录不一致 | 1. 导出该推销员所有交易记录 2. 重新计算正确余额 3. 人工调账修正 |
| 重复结算告警 | 1. 确认是否真的重复入账 2. 如是则人工扣除多余金额 |
| 负余额告警 | 1. 确认原因（通常是代金券核销） 2. 如非正常则调查 |
| 对账失败 | 1. 检查错误日志 2. 修复问题后手动重新对账 |

---

## 八、更新日志

### v1.0 (2026-01-22)
- 初始版本
- 实现交易追踪完整功能
- 实现余额快照机制
- 实现自动对账任务
- 实现异常告警系统
- 实现人工调账功能
