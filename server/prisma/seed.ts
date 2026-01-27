import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 生成SVG占位图的Base64 URL
function generatePlaceholderImage(text: string, bgColor: string = '#f0f0f0', textColor: string = '#999'): string {
  const svg = `<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" fill="${bgColor}"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${textColor}" font-size="24" font-family="Arial, sans-serif">${text}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// 生成6位邀请码
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function main() {
  console.log('开始初始化数据...');

  // 创建管理员账号
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.systemUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      name: '超级管理员',
      phone: '13800000000',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✓ 管理员账号创建成功: admin / admin123');

  // 创建库管账号
  const warehousePassword = await bcrypt.hash('123456', 10);
  await prisma.systemUser.upsert({
    where: { username: 'warehouse01' },
    update: {},
    create: {
      username: 'warehouse01',
      password: warehousePassword,
      name: '库管一号',
      phone: '13800000001',
      role: 'WAREHOUSE',
      status: 'ACTIVE',
    },
  });
  console.log('✓ 库管账号创建成功: warehouse01 / 123456');

  // 创建货管账号
  const logisticsPassword = await bcrypt.hash('123456', 10);
  await prisma.systemUser.upsert({
    where: { username: 'logistics01' },
    update: {},
    create: {
      username: 'logistics01',
      password: logisticsPassword,
      name: '货管一号',
      phone: '13800000002',
      role: 'LOGISTICS',
      status: 'ACTIVE',
    },
  });
  console.log('✓ 货管账号创建成功: logistics01 / 123456');

  // 创建测试代理商（一级代理）
  const agentPassword = await bcrypt.hash('123456', 10);
  const level1Agent = await prisma.agent.upsert({
    where: { phone: '13800138001' },
    update: {},
    create: {
      phone: '13800138001',
      password: agentPassword,
      name: '张三（一级代理）',
      type: 'LEVEL1',
      status: 'ACTIVE',
      inviteCode: generateInviteCode(),
    },
  });
  console.log('✓ 一级代理创建成功: 13800138001');

  // 创建测试代理商（二级代理）
  await prisma.agent.upsert({
    where: { phone: '13800138002' },
    update: {},
    create: {
      phone: '13800138002',
      password: agentPassword,
      name: '李四（二级代理）',
      type: 'LEVEL2',
      status: 'ACTIVE',
      parentId: level1Agent.id,
      inviteCode: generateInviteCode(),
    },
  });
  console.log('✓ 二级代理创建成功: 13800138002');

  // 创建测试代理商（批发商）
  await prisma.agent.upsert({
    where: { phone: '13800138003' },
    update: {},
    create: {
      phone: '13800138003',
      password: agentPassword,
      name: '王五（批发商）',
      type: 'WHOLESALE',
      status: 'ACTIVE',
      inviteCode: generateInviteCode(),
    },
  });
  console.log('✓ 批发商创建成功: 13800138003');

  // 创建通用测试代理商
  await prisma.agent.upsert({
    where: { phone: '13800138000' },
    update: {},
    create: {
      phone: '13800138000',
      password: agentPassword,
      name: '测试代理商',
      type: 'WHOLESALE',
      status: 'ACTIVE',
      inviteCode: generateInviteCode(),
    },
  });
  console.log('✓ 测试代理商创建成功: 13800138000');

  // 创建分润规则
  await prisma.commissionRule.upsert({
    where: { id: 1 },
    update: {},
    create: {
      minAmount: 0,
      level1Rate: 10,
      level2Rate: 2,
      status: 'ACTIVE',
    },
  });

  await prisma.commissionRule.upsert({
    where: { id: 2 },
    update: {},
    create: {
      minAmount: 399,
      level1Rate: 15,
      level2Rate: 3,
      status: 'ACTIVE',
    },
  });
  console.log('✓ 分润规则创建成功');

  // 创建商品分类
  const categories = [
    { id: 1, name: '组合烟花', icon: '🎆', sort: 1 },
    { id: 2, name: '单品烟花', icon: '🎇', sort: 2 },
    { id: 3, name: '小型烟花', icon: '✨', sort: 3 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        sort: cat.sort,
        status: 'ACTIVE',
      },
    });
  }
  console.log('✓ 商品分类创建成功');

  // 创建商品数据
  const products = [
    // 组合烟花
    {
      name: '盛世中华组合烟花',
      categoryId: 1,
      images: JSON.stringify([generatePlaceholderImage('盛世中华', '#ffe4e1', '#e53734')]),
      description: '108发大型组合烟花，效果震撼，适合大型庆典活动。燃放时间约3分钟。',
      retailPrice: 888.00,
      agentPrice: 688.00,
      wholesalePrice: 588.00,
      stock: 100,
      unit: '箱',
      salesCount: 256,
      sort: 1,
    },
    {
      name: '龙腾盛世组合烟花',
      categoryId: 1,
      images: JSON.stringify([generatePlaceholderImage('龙腾盛世', '#fff3e0', '#ff9800')]),
      description: '66发中型组合烟花，金龙效果，喜庆热闹。燃放时间约2分钟。',
      retailPrice: 588.00,
      agentPrice: 458.00,
      wholesalePrice: 388.00,
      stock: 150,
      unit: '箱',
      salesCount: 389,
      sort: 2,
    },
    {
      name: '喜迎新春组合烟花',
      categoryId: 1,
      images: JSON.stringify([generatePlaceholderImage('喜迎新春', '#ffebee', '#d32f2f')]),
      description: '36发小型组合烟花，色彩丰富，家庭燃放首选。燃放时间约1分钟。',
      retailPrice: 288.00,
      agentPrice: 218.00,
      wholesalePrice: 188.00,
      stock: 200,
      unit: '箱',
      salesCount: 512,
      sort: 3,
    },
    // 单品烟花
    {
      name: '金色瀑布礼花弹',
      categoryId: 2,
      images: JSON.stringify([generatePlaceholderImage('金色瀑布', '#fffde7', '#fbc02d')]),
      description: '单发礼花弹，金色瀑布效果，高度约50米，持续10秒。',
      retailPrice: 68.00,
      agentPrice: 52.00,
      wholesalePrice: 45.00,
      stock: 500,
      unit: '个',
      salesCount: 1024,
      sort: 1,
    },
    {
      name: '彩虹礼花弹',
      categoryId: 2,
      images: JSON.stringify([generatePlaceholderImage('彩虹礼花', '#e8f5e9', '#4caf50')]),
      description: '单发礼花弹，七彩效果，高度约40米，绚丽多彩。',
      retailPrice: 58.00,
      agentPrice: 45.00,
      wholesalePrice: 38.00,
      stock: 600,
      unit: '个',
      salesCount: 856,
      sort: 2,
    },
    {
      name: '银色闪光弹',
      categoryId: 2,
      images: JSON.stringify([generatePlaceholderImage('银色闪光', '#eceff1', '#607d8b')]),
      description: '单发礼花弹，银白色闪光效果，高度约35米，璀璨夺目。',
      retailPrice: 48.00,
      agentPrice: 38.00,
      wholesalePrice: 32.00,
      stock: 800,
      unit: '个',
      salesCount: 678,
      sort: 3,
    },
    // 小型烟花
    {
      name: '仙女棒（10支装）',
      categoryId: 3,
      images: JSON.stringify([generatePlaceholderImage('仙女棒', '#fce4ec', '#e91e63')]),
      description: '经典仙女棒，每支燃放约30秒，安全有趣，适合儿童。',
      retailPrice: 15.00,
      agentPrice: 12.00,
      wholesalePrice: 10.00,
      stock: 2000,
      unit: '包',
      salesCount: 3256,
      sort: 1,
    },
    {
      name: '彩色烟雾弹（6个装）',
      categoryId: 3,
      images: JSON.stringify([generatePlaceholderImage('彩色烟雾', '#e3f2fd', '#2196f3')]),
      description: '六色烟雾弹套装，每个持续约60秒，拍照神器。',
      retailPrice: 38.00,
      agentPrice: 30.00,
      wholesalePrice: 25.00,
      stock: 1500,
      unit: '盒',
      salesCount: 1892,
      sort: 2,
    },
    {
      name: '地面旋转花（20个装）',
      categoryId: 3,
      images: JSON.stringify([generatePlaceholderImage('地面旋转', '#f3e5f5', '#9c27b0')]),
      description: '地面旋转烟花，五彩旋转效果，安全低噪音。',
      retailPrice: 28.00,
      agentPrice: 22.00,
      wholesalePrice: 18.00,
      stock: 1800,
      unit: '盒',
      salesCount: 2145,
      sort: 3,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: products.indexOf(product) + 1 },
      update: {},
      create: {
        ...product,
        status: 'ACTIVE',
      },
    });
  }
  console.log('✓ 商品数据创建成功（9个商品）');

  // 创建Banner数据
  const banners = [
    {
      id: 1,
      title: '2024 龙年大吉系列',
      subtitle: '百鸟朝凤 · 盛世中华',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDHqjXiuh3-4y8PnQkU1M0Sii4f841FTzeglhnzEIrVfT5ovtcgafNuyIALmaDx8-hbGUM6CN0vCFqzWHfN0m7-rtV3VPNrYeoEB6sdsvpuajp94hZdS6AYmNC44zoEbz9EZdg9ukSoZhNx4ZyzHi9KM24MStO8Y2zvlL0TKaa9j3jXghdtj2ghuBp34Lo-KDnZEfH2-1pTeftks6vXGEw2P6ui5qyV6iAMJr04Hd4IeLvrGJrKFIipsPJMZrWY3QRuMTRMh9qhYGRJ',
      linkType: 'CATEGORY',
      linkValue: '1',
      sortOrder: 3,
      status: 'ACTIVE',
    },
    {
      id: 2,
      title: '爆款热销 限时特惠',
      subtitle: '精选烟花 超值优惠',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXjzgdzn-TP_ry9a-2BDBcUV8yKggBeVXpklNoSCy8cLYBQwu0AigoKsWP7zU-Ary124BNe7sig4nUFGo29I1lvQJnRwz51JkYlcfYdZ2Ab6R_a4cyEN2EsQK6msyPGHFFp94E9HzEUL8JuBdsIeJwsznG7ZgBvzfUSLOnxelA-RvtfDzOUg-nhhWwhc8fngZObNPoN7h417sOvlEZ_TCZ6VQ_WmMttT24TKKnheuh_56gbpNehr1Oqfchf33gE-94425g029vS7yD',
      linkType: 'NONE',
      linkValue: null,
      sortOrder: 2,
      status: 'ACTIVE',
    },
    {
      id: 3,
      title: '新品上市 抢先体验',
      subtitle: '全新烟花系列',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5F5Z_sClAApNQyzHFaL5OBULCDhJUXEZ5nE98X-QcpOibb_Oep6lJVcZ_fMo8BCf5IGNdV0QUJ6YL36MWmSFIftuPnGJDmUUNaMY_RFtKNFg6aJttvTyBKigYWKLQtfEBmKOvM2urKcwe_prY6RaWMJFpvCEP0ZK_6eatiWtk-SYWWbtTv-MA_y77dSUCU8IYZ-BjPD_pfB2ZoMaYy-9VicQhRqT-I5FVM8ECVG-5rIe3jpX5kidxvvSijihlmt1ukc-ctpWM9y4v',
      linkType: 'NONE',
      linkValue: null,
      sortOrder: 1,
      status: 'ACTIVE',
    },
  ];

  for (const banner of banners) {
    await prisma.banner.upsert({
      where: { id: banner.id },
      update: {},
      create: banner,
    });
  }
  console.log('✓ Banner数据创建成功（3个轮播图）');

  console.log('\n========================================');
  console.log('数据初始化完成！');
  console.log('========================================');
  console.log('测试账号：');
  console.log('  管理员: admin / admin123');
  console.log('  库管: warehouse01 / 123456');
  console.log('  货管: logistics01 / 123456');
  console.log('  代理商: 13800138000-13800138003 / 验证码123456');
  console.log('========================================');
  console.log('商品分类：');
  console.log('  1. 组合烟花 (3个商品)');
  console.log('  2. 单品烟花 (3个商品)');
  console.log('  3. 小型烟花 (3个商品)');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
