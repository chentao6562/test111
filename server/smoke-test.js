/**
 * 冒烟测试（Smoke Testing）
 * 目的：快速验证系统基本功能是否正常，确保核心服务可用
 * 执行时间：约1-2分钟
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function smokeTest() {
  console.log('======= 冒烟测试开始 =======');
  console.log(`执行时间: ${new Date().toLocaleString('zh-CN')}\n`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  // 辅助函数
  const test = async (name, fn) => {
    results.total++;
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      console.log(`✓ ${name}`);
      return true;
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: error.message });
      console.log(`✗ ${name}: ${error.message}`);
      return false;
    }
  };

  try {
    console.log('【测试组1】数据库连接\n');

    await test('数据库连接', async () => {
      await prisma.$connect();
    });

    await test('数据库查询', async () => {
      const count = await prisma.agent.count();
      if (count === 0) throw new Error('代理商表为空');
    });

    console.log('\n【测试组2】核心数据模型\n');

    await test('代理商表查询', async () => {
      const agents = await prisma.agent.findMany({ take: 1 });
      if (agents.length === 0) throw new Error('无代理商数据');
    });

    await test('商品表查询', async () => {
      const products = await prisma.product.findMany({ take: 1 });
      if (products.length === 0) throw new Error('无商品数据');
    });

    await test('订单表查询', async () => {
      await prisma.order.findMany({ take: 1 });
    });

    await test('分润规则查询', async () => {
      const rules = await prisma.commissionRule.findMany({ where: { status: 'ACTIVE' } });
      if (rules.length === 0) throw new Error('无有效分润规则');
    });

    console.log('\n【测试组3】关键业务逻辑\n');

    await test('库存可用性检查', async () => {
      const products = await prisma.product.findMany({
        where: { status: 'active' },
        take: 5
      });

      for (const product of products) {
        const available = Number(product.stock) - Number(product.lockStock || 0);
        if (available < 0) {
          throw new Error(`商品${product.name}可用库存为负: ${available}`);
        }
      }
    });

    await test('代理商层级关系', async () => {
      const level2Agents = await prisma.agent.findMany({
        where: {
          type: 'LEVEL2',
          parentId: { not: null }
        },
        include: { parent: true },
        take: 1
      });

      if (level2Agents.length > 0) {
        const agent = level2Agents[0];
        if (!agent.parent) {
          throw new Error(`二级代理${agent.name}的上级不存在`);
        }
        if (agent.parent.type !== 'LEVEL1') {
          throw new Error(`二级代理${agent.name}的上级不是一级代理`);
        }
      }
    });

    await test('分润规则完整性', async () => {
      const rules = await prisma.commissionRule.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { minAmount: 'asc' }
      });

      if (rules.length === 0) {
        throw new Error('无有效分润规则');
      }

      // 检查规则比例是否合理
      for (const rule of rules) {
        if (Number(rule.level1Rate) < 0 || Number(rule.level1Rate) > 100) {
          throw new Error(`规则${rule.id}的一级分润比例异常: ${rule.level1Rate}%`);
        }
        if (Number(rule.level2Rate) < 0 || Number(rule.level2Rate) > 100) {
          throw new Error(`规则${rule.id}的二级分润比例异常: ${rule.level2Rate}%`);
        }
      }
    });

    console.log('\n【测试组4】数据一致性（快速检查）\n');

    await test('无负库存', async () => {
      const negativeStock = await prisma.product.count({
        where: {
          OR: [
            { stock: { lt: 0 } },
            { lockStock: { lt: 0 } }
          ]
        }
      });

      if (negativeStock > 0) {
        throw new Error(`发现${negativeStock}个商品存在负库存`);
      }
    });

    await test('余额非负', async () => {
      const negativeBalance = await prisma.agent.count({
        where: { balance: { lt: 0 } }
      });

      if (negativeBalance > 0) {
        throw new Error(`发现${negativeBalance}个代理商余额为负`);
      }
    });

    console.log('\n【测试组5】系统配置\n');

    await test('系统用户存在', async () => {
      const warehouse = await prisma.systemUser.findFirst({
        where: { role: 'WAREHOUSE' }
      });
      const logistics = await prisma.systemUser.findFirst({
        where: { role: 'LOGISTICS' }
      });

      if (!warehouse) throw new Error('无库管账号');
      if (!logistics) throw new Error('无货管账号');
    });

    await test('商品分类存在', async () => {
      const categories = await prisma.category.findMany({
        where: { status: 'ACTIVE' }
      });

      if (categories.length === 0) {
        throw new Error('无有效商品分类');
      }
    });

    // 最终统计
    console.log('\n======= 冒烟测试完成 =======\n');
    console.log(`总测试数: ${results.total}`);
    console.log(`通过: ${results.passed}`);
    console.log(`失败: ${results.failed}`);
    console.log(`通过率: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

    if (results.failed === 0) {
      console.log('✅ 冒烟测试全部通过！系统基本功能正常！\n');
    } else {
      console.log('❌ 冒烟测试发现问题，详情：\n');
      results.tests.filter(t => t.status === 'FAIL').forEach(t => {
        console.log(`  - ${t.name}: ${t.error}`);
      });
      console.log('');
    }

    await prisma.$disconnect();
    return results;

  } catch (error) {
    console.error('\n❌ 冒烟测试执行失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// 执行测试
smokeTest().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
});
