/**
 * 订单查询Include预设
 * 避免重复的include配置
 * Phase 3 Task 3.5
 */

// 商品基本字段
export const PRODUCT_BASIC_FIELDS = {
  id: true,
  name: true,
  images: true,
  unit: true,
  retailPrice: true,
  agentPrice: true,
  wholesalePrice: true,
} as const;

// 商品完整字段（含库存）
export const PRODUCT_FULL_FIELDS = {
  ...PRODUCT_BASIC_FIELDS,
  stock: true,
  lockStock: true,
  minStock: true,
  status: true,
  categoryId: true,
} as const;

// 代理商基本字段
export const AGENT_BASIC_FIELDS = {
  id: true,
  name: true,
  phone: true,
  type: true,
} as const;

// 代理商完整字段
export const AGENT_FULL_FIELDS = {
  ...AGENT_BASIC_FIELDS,
  inviteCode: true,
  balance: true,
  totalCommission: true,
  parentId: true,
  status: true,
  createdAt: true,
} as const;

// 订单项Include（包含商品基本信息）
export const ORDER_ITEM_WITH_PRODUCT = {
  include: {
    product: {
      select: PRODUCT_BASIC_FIELDS,
    },
  },
} as const;

// 订单详情Include（包含商品和代理商）
export const ORDER_WITH_DETAILS = {
  items: ORDER_ITEM_WITH_PRODUCT,
  agent: {
    select: AGENT_BASIC_FIELDS,
  },
} as const;

// 订单完整Include（包含分润和移库任务）
export const ORDER_WITH_FULL_DETAILS = {
  items: ORDER_ITEM_WITH_PRODUCT,
  agent: {
    select: AGENT_FULL_FIELDS,
  },
  commissions: {
    include: {
      agent: {
        select: AGENT_BASIC_FIELDS,
      },
    },
  },
  transferTask: true,
} as const;

// 订单列表Include（轻量级，用于列表展示）
export const ORDER_LIST_INCLUDE = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          images: true,
        },
      },
    },
  },
  agent: {
    select: {
      id: true,
      name: true,
      phone: true,
    },
  },
} as const;

// 分润记录Include
export const COMMISSION_WITH_DETAILS = {
  agent: {
    select: AGENT_BASIC_FIELDS,
  },
  order: {
    select: {
      id: true,
      orderNo: true,
      totalAmount: true,
      status: true,
      createdAt: true,
    },
  },
} as const;

// 提现记录Include
export const WITHDRAWAL_WITH_AGENT = {
  agent: {
    select: AGENT_FULL_FIELDS,
  },
} as const;

// 移库任务Include
export const TRANSFER_TASK_WITH_DETAILS = {
  order: {
    include: {
      items: ORDER_ITEM_WITH_PRODUCT,
      agent: {
        select: AGENT_BASIC_FIELDS,
      },
    },
  },
  logistics: {
    select: {
      id: true,
      username: true,
      name: true,
      phone: true,
    },
  },
} as const;
