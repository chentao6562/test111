/**
 * 支付方式常量
 * 【2026-01-17 代码重构】统一各端的支付方式定义
 */

// 支付方式枚举
export const PaymentMethod = {
  CASH: 'cash',       // 现金
  WECHAT: 'wechat',   // 微信
  ALIPAY: 'alipay',   // 支付宝
} as const;

export type PaymentMethodType = typeof PaymentMethod[keyof typeof PaymentMethod];

// 支付方式文本标签
export const PaymentMethodLabels: Record<string, string> = {
  [PaymentMethod.CASH]: '现金',
  [PaymentMethod.WECHAT]: '微信',
  [PaymentMethod.ALIPAY]: '支付宝',
};

// 支付方式图标
export const PaymentMethodIcons: Record<string, string> = {
  [PaymentMethod.CASH]: 'money',
  [PaymentMethod.WECHAT]: 'logo-wechat',
  [PaymentMethod.ALIPAY]: 'logo-alipay',
};

/**
 * 获取支付方式文本
 */
export function getPaymentMethodLabel(method: string): string {
  return PaymentMethodLabels[method] || '未知';
}

/**
 * 支付方式选项列表（用于表单选择）
 */
export const paymentMethodOptions = [
  { value: PaymentMethod.CASH, label: '现金' },
  { value: PaymentMethod.WECHAT, label: '微信' },
  { value: PaymentMethod.ALIPAY, label: '支付宝' },
];
