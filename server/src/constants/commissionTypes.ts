/**
 * 分润相关常量
 *
 * 用于统一管理分润类型、状态等字符串，避免硬编码
 * Phase 1 Task 1.3
 */

// 分润类型
export const COMMISSION_TYPE = {
  DIRECT: 'DIRECT',       // 直接分润（一级上级）
  INDIRECT: 'INDIRECT',   // 间接分润（二级上级）
} as const;

export type CommissionType = typeof COMMISSION_TYPE[keyof typeof COMMISSION_TYPE];

// 分润类型显示名称
export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  [COMMISSION_TYPE.DIRECT]: '直接分润',
  [COMMISSION_TYPE.INDIRECT]: '间接分润',
};

// 分润状态
export const COMMISSION_STATUS = {
  PENDING: 'PENDING',       // 待结算
  SETTLED: 'SETTLED',       // 已结算
  CANCELLED: 'CANCELLED',   // 已取消
} as const;

export type CommissionStatus = typeof COMMISSION_STATUS[keyof typeof COMMISSION_STATUS];

// 分润状态显示名称
export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  [COMMISSION_STATUS.PENDING]: '待结算',
  [COMMISSION_STATUS.SETTLED]: '已结算',
  [COMMISSION_STATUS.CANCELLED]: '已取消',
};

// 分润方式
export const COMMISSION_METHOD = {
  RATE: 'RATE',               // 按比例
  PRICE_DIFF: 'PRICE_DIFF',   // 进货差价
} as const;

export type CommissionMethod = typeof COMMISSION_METHOD[keyof typeof COMMISSION_METHOD];

// 分润方式显示名称
export const COMMISSION_METHOD_LABELS: Record<CommissionMethod, string> = {
  [COMMISSION_METHOD.RATE]: '按比例',
  [COMMISSION_METHOD.PRICE_DIFF]: '进货差价',
};

// 提现状态
export const WITHDRAWAL_STATUS = {
  PENDING: 'PENDING',       // 待审核
  APPROVED: 'APPROVED',     // 已通过
  COMPLETED: 'COMPLETED',   // 已到账
  REJECTED: 'REJECTED',     // 已拒绝
} as const;

export type WithdrawalStatus = typeof WITHDRAWAL_STATUS[keyof typeof WITHDRAWAL_STATUS];

// 提现状态显示名称
export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  [WITHDRAWAL_STATUS.PENDING]: '待审核',
  [WITHDRAWAL_STATUS.APPROVED]: '已通过',
  [WITHDRAWAL_STATUS.COMPLETED]: '已到账',
  [WITHDRAWAL_STATUS.REJECTED]: '已拒绝',
};

// 资金流水类型
export const FUND_FLOW_TYPE = {
  COMMISSION: 'COMMISSION',                   // 分润收入
  COMMISSION_REFUND: 'COMMISSION_REFUND',     // 分润回滚
  WITHDRAWAL: 'WITHDRAWAL',                   // 提现冻结
  WITHDRAWAL_REFUND: 'WITHDRAWAL_REFUND',     // 提现拒绝退回
  RECHARGE: 'RECHARGE',                       // 充值
} as const;

export type FundFlowType = typeof FUND_FLOW_TYPE[keyof typeof FUND_FLOW_TYPE];

// 资金流水类型显示名称
export const FUND_FLOW_TYPE_LABELS: Record<FundFlowType, string> = {
  [FUND_FLOW_TYPE.COMMISSION]: '分润收入',
  [FUND_FLOW_TYPE.COMMISSION_REFUND]: '分润回滚',
  [FUND_FLOW_TYPE.WITHDRAWAL]: '提现支出',
  [FUND_FLOW_TYPE.WITHDRAWAL_REFUND]: '提现退回',
  [FUND_FLOW_TYPE.RECHARGE]: '充值',
};

// 最低提现金额（元）
export const MIN_WITHDRAWAL_AMOUNT = 100;

// 分润默认比例配置（用于初始化）
export const DEFAULT_COMMISSION_RATES = [
  { minAmount: 0, level1Rate: 10, level2Rate: 2 },      // < 399元
  { minAmount: 399, level1Rate: 15, level2Rate: 3 },    // >= 399元
];
