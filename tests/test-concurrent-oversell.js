/**
 * 并发库存超卖测试
 * 验证：20个并发下单，库存10件，应精确成功10单
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConcurrentOversell() {
  console.log('======= 并发库存超卖测试 =======\n');

  try {
    // 1. 准备测试商品
    console.log('【步骤1】准备测试数据...\n');

    // 创建测试商品，库存10件
    const testProduct = await prisma.product.upsert({
      where: { id: 999 },
      update: {
        stock: 10,
        lockStock: 0,
        salesCount: 0
      },
      create: {
        id: 999,
        name: '并发测试商品',
        images: '/test.jpg',
        retailPrice: 100,
        agentPrice: 80,
        wholesalePrice: 70,
        stock: 10,
        lockStock: 0,
        salesCount: 0,
        categoryId: 1,
        status: 'active'
      }
    });

    console.log(`✓ 测试商品已准备`);
    console.log(`  ID: ${testProduct.id}`);
    console.log(`  初始库存: ${testProduct.stock}`);
    console.log(`  锁定库存: ${testProduct.lockStock || 0}\n`);

    // 查找测试代理商
    const testAgent = await prisma.agent.findFirst({
      where: { type: { in: ['LEVEL1', 'LEVEL2'] } }
    });

    if (!testAgent) {
      console.log('❌ 未找到测试代理商');
      await prisma.$disconnect();
      return;
    }

    console.log(`✓ 使用代理商: ${testAgent.name} (ID: ${testAgent.id})\n`);

    // 2. 执行并发下单
    console.log('【步骤2】执行并发下单（20个并发请求）...\n');

    const concurrency = 20;
    const orderQuantity = 1; // 每单1件

    const results = [];
    const startTime = Date.now();

    // 创建20个并发下单Promise
    const orderPromises = [];
    for (let i = 0; i < concurrency; i++) {
      orderPromises.push(createOrder(testProduct.id, testAgent, orderQuantity, i + 1));
    }

    // 并发执行
    const settledResults = await Promise.allSettled(orderPromises);

    const endTime = Date.now();

    // 3. 统计结果
    console.log('\n【步骤3】统计测试结果...\n');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < settledResults.length; i++) {
      const result = settledResults[i];
      if (result.status === 'fulfilled') {
        successCount++;
        console.log(`  请求${i + 1}: ✓ 成功 (订单${result.value.id})`);
        results.push({ index: i + 1, success: true, order: result.value });
      } else {
        failCount++;
        console.log(`  请求${i + 1}: ✗ 失败 (${result.reason.message})`);
        results.push({ index: i + 1, success: false, error: result.reason.message });
      }
    }

    console.log(`\n总计: ${successCount}成功, ${failCount}失败`);
    console.log(`耗时: ${endTime - startTime}ms\n`);

    // 4. 验证库存
    console.log('【步骤4】验证最终库存...\n');

    const finalProduct = await prisma.product.findUnique({
      where: { id: testProduct.id }
    });

    console.log('库存变化:');
    console.log(`  初始库存: ${testProduct.stock}`);
    console.log(`  最终库存: ${finalProduct.stock}`);
    console.log(`  锁定库存: ${finalProduct.lockStock || 0}`);
    console.log(`  已下单数: ${successCount}`);
    console.log(`  理论可用: ${finalProduct.stock - (finalProduct.lockStock || 0)}\n`);

    // 5. 最终验证
    console.log('【测试结果】\n');

    const errors = [];

    // 验证成功订单数
    if (successCount !== 10) {
      errors.push(`❌ 成功订单数不正确 (期望10单，实际${successCount}单)`);
    } else {
      console.log(`✓ 成功订单数正确 (${successCount}单)`);
    }

    // 验证失败订单数
    if (failCount !== 10) {
      errors.push(`❌ 失败订单数不正确 (期望10单，实际${failCount}单)`);
    } else {
      console.log(`✓ 失败订单数正确 (${failCount}单)`);
    }

    // 验证锁定库存
    const expectedLockStock = successCount * orderQuantity;
    if (Number(finalProduct.lockStock || 0) !== expectedLockStock) {
      errors.push(`❌ 锁定库存不正确 (期望${expectedLockStock}，实际${finalProduct.lockStock || 0})`);
    } else {
      console.log(`✓ 锁定库存正确 (${finalProduct.lockStock || 0}件)`);
    }

    // 验证可用库存
    const availableStock = Number(finalProduct.stock) - Number(finalProduct.lockStock || 0);
    if (availableStock !== 0) {
      errors.push(`❌ 可用库存不正确 (期望0，实际${availableStock})`);
    } else {
      console.log(`✓ 可用库存正确 (0件)`);
    }

    // 验证没有负库存
    if (Number(finalProduct.stock) < 0 || Number(finalProduct.lockStock || 0) < 0) {
      errors.push('❌ 出现负库存！');
    } else {
      console.log('✓ 无负库存');
    }

    console.log('\n======= 测试完成 =======');

    if (errors.length > 0) {
      console.log('\n发现问题:');
      errors.forEach(err => console.log(err));
      console.log('\n⚠️  存在库存超卖或并发问题！');
    } else {
      console.log('\n✅ 所有验证通过！无库存超卖！并发控制正常！');
    }

    // 清理测试数据
    console.log('\n【清理】删除测试订单和商品...');
    await prisma.orderItem.deleteMany({
      where: { productId: testProduct.id }
    });
    const deletedOrders = await prisma.order.deleteMany({
      where: {
        orderNo: { startsWith: 'CT' }
      }
    });
    console.log(`  已删除${deletedOrders.count}个测试订单`);

    await prisma.$disconnect();

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

/**
 * 创建订单（带库存锁定）
 */
async function createOrder(productId, agent, quantity, index) {
  const orderNo = `CT${index}_${Date.now()}`;

  return prisma.$transaction(async (tx) => {
    // 【关键】使用FOR UPDATE行级锁获取商品
    const products = await tx.$queryRaw`
      SELECT id, stock, lockStock FROM products WHERE id = ${productId} FOR UPDATE
    `;

    if (!products || products.length === 0) {
      throw new Error('商品不存在');
    }

    const product = products[0];
    const availableStock = Number(product.stock) - Number(product.lockStock || 0);

    if (availableStock < quantity) {
      throw new Error(`库存不足: 可用${availableStock}，需要${quantity}`);
    }

    // 锁定库存
    await tx.product.update({
      where: { id: productId },
      data: {
        lockStock: { increment: quantity }
      }
    });

    // 创建订单
    const order = await tx.order.create({
      data: {
        orderNo,
        agentId: agent.id,
        totalAmount: 80 * quantity,
        status: 'pending_payment',
        needTransfer: false,
        fullPaid: false,
        paidAmount: 0,
        contactName: agent.name,
        contactPhone: agent.phone,
        needConfirm: false
      }
    });

    // 创建订单项
    await tx.orderItem.create({
      data: {
        orderId: order.id,
        productId: productId,
        quantity: quantity,
        price: 80,
        productName: '并发测试商品',
        productImage: '/test.jpg'
      }
    });

    return order;
  });
}

testConcurrentOversell();
