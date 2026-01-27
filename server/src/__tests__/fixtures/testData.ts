/**
 * 测试数据定义
 * 用于单元测试和集成测试
 */

// 测试商品数据
export const testProducts = [
  {
    id: 9001,
    name: '测试商品A-正价',
    costPrice: 50,
    supplyPrice: 60,
    masterRetailPrice: 100,
    retailPrice: 100,
    stock: 100,
    lockStock: 0,
  },
  {
    id: 9002,
    name: '测试商品B-低利润',
    costPrice: 90,
    supplyPrice: 92,
    masterRetailPrice: 100,
    retailPrice: 100,
    stock: 50,
    lockStock: 0,
  },
  {
    id: 9003,
    name: '测试秒杀商品',
    costPrice: null, // 秒杀商品无成本价快照
    supplyPrice: null,
    masterRetailPrice: 99,
    retailPrice: 99,
    stock: 20,
    lockStock: 0,
  },
];

// 测试推销员数据
export const testAgents = {
  master: {
    id: 9001,
    name: '测试总代理',
    phone: '19900000001',
    isMaster: true,
    type: 'LEVEL1',
    parentId: null,
    status: 'ACTIVE',
    balance: 0,
    totalCommission: 0,
  },
  level1: {
    id: 9002,
    name: '测试一级推销员',
    phone: '19900000002',
    isMaster: false,
    type: 'LEVEL1',
    parentId: null,
    status: 'ACTIVE',
    balance: 0,
    totalCommission: 0,
  },
  level2: {
    id: 9003,
    name: '测试二级推销员',
    phone: '19900000003',
    isMaster: false,
    type: 'LEVEL2',
    parentId: 9002, // 上级是一级推销员
    status: 'ACTIVE',
    balance: 0,
    totalCommission: 0,
  },
};

// 测试推销员定价
export const testAgentPrices = [
  {
    agentId: 9002, // 一级推销员
    productId: 9001,
    retailPrice: 95,
    subPrice: 70, // 给二级的价格
  },
  {
    agentId: 9003, // 二级推销员
    productId: 9001,
    retailPrice: 90,
    subPrice: null,
  },
];

// 测试门店
export const testStore = {
  id: 9001,
  name: '测试门店',
  code: 'TEST01',
  address: '测试地址',
  phone: '13800138000',
};

// 测试员工
export const testStaff = {
  id: 9001,
  name: '测试员工',
  username: 'teststaff',
  storeId: 9001,
  role: 'STAFF',
};

// 利润计算测试用例
export const profitTestCases = [
  {
    name: '总代理直销-单件商品',
    input: {
      orderSource: 0,
      costPrice: 50,
      supplyPrice: 60,
      level1Price: null,
      retailPrice: 100,
      quantity: 1,
    },
    expected: {
      masterProfit: 50,
      level1Profit: 0,
      level2Profit: 0,
    },
  },
  {
    name: '总代理直销-多件商品',
    input: {
      orderSource: 0,
      costPrice: 50,
      supplyPrice: 60,
      level1Price: null,
      retailPrice: 100,
      quantity: 5,
    },
    expected: {
      masterProfit: 250, // (100-50)*5
      level1Profit: 0,
      level2Profit: 0,
    },
  },
  {
    name: '一级推销员销售-单件',
    input: {
      orderSource: 1,
      costPrice: 50,
      supplyPrice: 60,
      level1Price: null,
      retailPrice: 100,
      quantity: 1,
    },
    expected: {
      masterProfit: 10, // 60-50
      level1Profit: 40, // 100-60
      level2Profit: 0,
    },
  },
  {
    name: '一级推销员销售-多件',
    input: {
      orderSource: 1,
      costPrice: 50,
      supplyPrice: 60,
      level1Price: null,
      retailPrice: 95,
      quantity: 3,
    },
    expected: {
      masterProfit: 30, // (60-50)*3
      level1Profit: 105, // (95-60)*3
      level2Profit: 0,
    },
  },
  {
    name: '二级推销员销售-有subPrice',
    input: {
      orderSource: 2,
      costPrice: 50,
      supplyPrice: 60,
      level1Price: 70, // 一级给二级的价
      retailPrice: 90,
      quantity: 1,
    },
    expected: {
      masterProfit: 10, // 60-50
      level1Profit: 10, // 70-60
      level2Profit: 20, // 90-70
    },
  },
  {
    name: '二级推销员销售-无subPrice回退到supplyPrice',
    input: {
      orderSource: 2,
      costPrice: 50,
      supplyPrice: 60,
      level1Price: null, // 一级未设置subPrice
      retailPrice: 90,
      quantity: 1,
    },
    expected: {
      masterProfit: 10, // 60-50
      level1Profit: 0, // actualLevel1Price=60, 60-60=0
      level2Profit: 30, // 90-60
    },
  },
  {
    name: '零利润场景-成本等于零售',
    input: {
      orderSource: 0,
      costPrice: 100,
      supplyPrice: 100,
      level1Price: null,
      retailPrice: 100,
      quantity: 1,
    },
    expected: {
      masterProfit: 0,
      level1Profit: 0,
      level2Profit: 0,
    },
  },
  {
    name: '小数精度-向下取整',
    input: {
      orderSource: 1,
      costPrice: 33.33,
      supplyPrice: 44.44,
      level1Price: null,
      retailPrice: 55.55,
      quantity: 1,
    },
    expected: {
      masterProfit: 11.11, // floor(11.11 * 100) / 100
      level1Profit: 11.11, // floor(11.11 * 100) / 100
      level2Profit: 0,
    },
  },
  {
    name: '大金额测试',
    input: {
      orderSource: 1,
      costPrice: 5000,
      supplyPrice: 6000,
      level1Price: null,
      retailPrice: 10000,
      quantity: 10,
    },
    expected: {
      masterProfit: 10000, // (6000-5000)*10
      level1Profit: 40000, // (10000-6000)*10
      level2Profit: 0,
    },
  },
];

// 边界测试用例
export const boundaryTestCases = [
  {
    name: '负利润场景-成本大于零售（不应发生）',
    input: {
      orderSource: 0,
      costPrice: 120,
      supplyPrice: 110,
      level1Price: null,
      retailPrice: 100,
      quantity: 1,
    },
    // 预期负数，系统应该处理
    expectedNegative: true,
  },
  {
    name: '数量为0',
    input: {
      orderSource: 1,
      costPrice: 50,
      supplyPrice: 60,
      level1Price: null,
      retailPrice: 100,
      quantity: 0,
    },
    expected: {
      masterProfit: 0,
      level1Profit: 0,
      level2Profit: 0,
    },
  },
];

// 库存测试场景
export const stockTestCases = [
  {
    name: '正常锁定库存',
    initialStock: 100,
    initialLockStock: 0,
    reserveQuantity: 10,
    expectedLockStock: 10,
    shouldSucceed: true,
  },
  {
    name: '库存不足',
    initialStock: 5,
    initialLockStock: 0,
    reserveQuantity: 10,
    expectedLockStock: 0,
    shouldSucceed: false,
  },
  {
    name: '可用库存不足（已锁定）',
    initialStock: 100,
    initialLockStock: 95,
    reserveQuantity: 10,
    expectedLockStock: 95,
    shouldSucceed: false,
  },
  {
    name: '边界-刚好够用',
    initialStock: 100,
    initialLockStock: 90,
    reserveQuantity: 10,
    expectedLockStock: 100,
    shouldSucceed: true,
  },
];

// 赠品成本测试
export const giftCostTestCases = [
  {
    name: '赠品成本小于利润',
    profit: 50,
    giftCost: 10,
    expectedFinalProfit: 40,
  },
  {
    name: '赠品成本等于利润',
    profit: 20,
    giftCost: 20,
    expectedFinalProfit: 0,
  },
  {
    name: '赠品成本大于利润（截断为0）',
    profit: 15,
    giftCost: 25,
    expectedFinalProfit: 0, // Math.max(0, 15-25) = 0
  },
];
