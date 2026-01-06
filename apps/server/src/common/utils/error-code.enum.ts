/**
 * 错误码枚举
 */
export enum ErrorCode {
  // 通用错误码
  SUCCESS = 0,
  PARAM_ERROR = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  SERVER_ERROR = 500,

  // 认证相关 1000+
  AUTH_TOKEN_INVALID = 1001,
  AUTH_TOKEN_EXPIRED = 1002,
  AUTH_USER_NOT_FOUND = 1003,
  AUTH_PASSWORD_ERROR = 1004,
  AUTH_INVALID_TOKEN = 1005,
  AUTH_NOT_EMPLOYEE = 1006,
  USER_DISABLED = 1007,
  USER_ALREADY_VERIFIED = 1008,
  ADDRESS_NOT_FOUND = 1009,
  ADDRESS_LIMIT_EXCEEDED = 1010,

  // 商品相关 2000+
  PRODUCT_NOT_FOUND = 2001,
  PRODUCT_OFF_SHELF = 2002,
  STOCK_NOT_ENOUGH = 2003,
  CATEGORY_NOT_FOUND = 2004,

  // 订单相关 3000+
  ORDER_NOT_FOUND = 3001,
  ORDER_STATUS_ERROR = 3002,
  ORDER_AMOUNT_ERROR = 3003,
  ORDER_CANCELLED = 3004,
  PICKUP_CODE_ERROR = 3005,

  // 代理商相关 4000+
  AGENT_NOT_APPROVED = 4001,
  AGENT_LEVEL_ERROR = 4002,
  INVITE_CODE_INVALID = 4003,
  ALREADY_APPLIED = 4004,
  AGENT_DISABLED = 4005,
  AGENT_ALREADY_APPLIED = 4006,
  AGENT_ALREADY_APPROVED = 4007,
  AGENT_STATUS_INVALID = 4008,
  NOT_AGENT = 4009,
  NOT_FIRST_LEVEL_AGENT = 4010,
  INVITE_CODE_NOT_GENERATED = 4011,
  USER_NOT_FOUND = 4012,

  // 库存相关 5000+
  INVENTORY_NOT_FOUND = 5001,
  INVENTORY_LOCKED = 5002,

  // 移库任务相关 5500+
  TRANSFER_NOT_FOUND = 5501,
  TRANSFER_STATUS_ERROR = 5502,
  TRANSFER_ALREADY_EXISTS = 5503,
  TRANSFER_NOT_ASSIGNED = 5504,

  // 提现相关 6000+
  BALANCE_NOT_ENOUGH = 6001,
  WITHDRAW_MIN_ERROR = 6002,
  WITHDRAW_STATUS_ERROR = 6003,

  // 上传相关 7000+
  UPLOAD_ERROR = 7001,
  FILE_TOO_LARGE = 7002,
  FILE_TYPE_ERROR = 7003,
}

/**
 * 错误信息映射
 */
export const ErrorMessage: Record<number, string> = {
  [ErrorCode.SUCCESS]: '成功',
  [ErrorCode.PARAM_ERROR]: '参数错误',
  [ErrorCode.UNAUTHORIZED]: '未授权',
  [ErrorCode.FORBIDDEN]: '禁止访问',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.SERVER_ERROR]: '服务器错误',

  [ErrorCode.AUTH_TOKEN_INVALID]: 'Token无效',
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 'Token已过期',
  [ErrorCode.AUTH_USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.AUTH_PASSWORD_ERROR]: '密码错误',
  [ErrorCode.AUTH_INVALID_TOKEN]: '无效的登录凭证',
  [ErrorCode.AUTH_NOT_EMPLOYEE]: '非员工账号',
  [ErrorCode.USER_DISABLED]: '用户已禁用',
  [ErrorCode.USER_ALREADY_VERIFIED]: '用户已完成实名认证',
  [ErrorCode.ADDRESS_NOT_FOUND]: '地址不存在',
  [ErrorCode.ADDRESS_LIMIT_EXCEEDED]: '最多只能添加10个地址',

  [ErrorCode.PRODUCT_NOT_FOUND]: '商品不存在',
  [ErrorCode.PRODUCT_OFF_SHELF]: '商品已下架',
  [ErrorCode.STOCK_NOT_ENOUGH]: '库存不足',
  [ErrorCode.CATEGORY_NOT_FOUND]: '分类不存在',

  [ErrorCode.ORDER_NOT_FOUND]: '订单不存在',
  [ErrorCode.ORDER_STATUS_ERROR]: '订单状态错误',
  [ErrorCode.ORDER_AMOUNT_ERROR]: '订单金额错误',
  [ErrorCode.ORDER_CANCELLED]: '订单已取消',
  [ErrorCode.PICKUP_CODE_ERROR]: '提货码错误',

  [ErrorCode.AGENT_NOT_APPROVED]: '代理商未审核通过',
  [ErrorCode.AGENT_LEVEL_ERROR]: '代理等级错误',
  [ErrorCode.INVITE_CODE_INVALID]: '邀请码无效',
  [ErrorCode.ALREADY_APPLIED]: '已提交申请',
  [ErrorCode.AGENT_DISABLED]: '代理商已禁用',
  [ErrorCode.AGENT_ALREADY_APPLIED]: '您已提交申请，请等待审核',
  [ErrorCode.AGENT_ALREADY_APPROVED]: '您已是代理商',
  [ErrorCode.AGENT_STATUS_INVALID]: '该用户不在待审核状态',
  [ErrorCode.NOT_AGENT]: '您不是代理商',
  [ErrorCode.NOT_FIRST_LEVEL_AGENT]: '只有一级代理可以发展下级',
  [ErrorCode.INVITE_CODE_NOT_GENERATED]: '邀请码尚未生成',
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',

  [ErrorCode.INVENTORY_NOT_FOUND]: '库存记录不存在',
  [ErrorCode.INVENTORY_LOCKED]: '库存已锁定',

  [ErrorCode.TRANSFER_NOT_FOUND]: '移库任务不存在',
  [ErrorCode.TRANSFER_STATUS_ERROR]: '任务状态错误',
  [ErrorCode.TRANSFER_ALREADY_EXISTS]: '该订单已存在移库任务',
  [ErrorCode.TRANSFER_NOT_ASSIGNED]: '任务未分配',

  [ErrorCode.BALANCE_NOT_ENOUGH]: '余额不足',
  [ErrorCode.WITHDRAW_MIN_ERROR]: '低于最低提现金额',
  [ErrorCode.WITHDRAW_STATUS_ERROR]: '提现状态错误',

  [ErrorCode.UPLOAD_ERROR]: '上传失败',
  [ErrorCode.FILE_TOO_LARGE]: '文件过大',
  [ErrorCode.FILE_TYPE_ERROR]: '文件类型不支持',
};
