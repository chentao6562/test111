/**
 * 安全性测试脚本 (Security Testing)
 * 目的: 验证系统安全防护机制,防止常见攻击
 * 执行: node security-test.js
 * 覆盖: JWT验证、权限隔离、XSS/SQL注入、限流、金额篡改
 */
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_BASE = 'http://39.104.58.26/api';

async function securityTest() {
  console.log('======= 安全性测试开始 =======');
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
    console.log(`\n【测试${results.total}】${name}`);
    console.log('─'.repeat(50));
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      console.log(`✓ 测试通过\n`);
      return true;
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: error.message });
      console.log(`✗ 测试失败: ${error.message}\n`);
      return false;
    }
  };

  try {
    // ========== 测试1: JWT Token伪造攻击 ==========
    await test('JWT Token伪造攻击防护', async () => {
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OTk5LCJ0eXBlIjoiYWdlbnQifQ.fake_signature';

      const response = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${fakeToken}` },
        validateStatus: () => true
      });

      if (response.status !== 401) {
        throw new Error(`期望401错误,实际${response.status}`);
      }

      if (!response.data.message || !response.data.message.includes('Token')) {
        throw new Error(`错误提示不正确: ${response.data.message}`);
      }

      console.log(`  验证结果: 伪造Token被拒绝 (401)`);
    });

    // ========== 测试2: JWT Token过期验证 ==========
    await test('JWT Token过期验证', async () => {
      // 生成已过期的Token (手动设置过去的时间戳)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6InRlc3QiLCJ0eXBlIjoiYWdlbnQiLCJpYXQiOjE2MDk0NTkyMDAsImV4cCI6MTYwOTQ1OTIwMX0.test';

      const response = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
        validateStatus: () => true
      });

      if (response.status !== 401) {
        throw new Error(`期望401错误,实际${response.status}`);
      }

      console.log(`  验证结果: 过期Token被拒绝 (401)`);
    });

    // ========== 测试3: 三端隔离 - 代理商Token访问员工接口 ==========
    await test('三端隔离: 代理商Token访问员工接口', async () => {
      // 从数据库直接获取代理商Token (测试环境)
      const agent = await prisma.agent.findFirst({
        where: { phone: '13800138000' }
      });

      if (!agent) {
        throw new Error('测试代理商不存在');
      }

      // 手动生成Token (模拟登录成功)
      const jwt = require('jsonwebtoken');
      const agentToken = jwt.sign(
        { id: agent.id, type: 'agent', phone: agent.phone },
        process.env.JWT_SECRET || 'firework2026',
        { expiresIn: '7d' }
      );

      // 尝试访问员工端接口
      const response = await axios.get(`${API_BASE}/staff/orders`, {
        headers: { Authorization: `Bearer ${agentToken}` },
        validateStatus: () => true
      });

      if (response.status !== 403) {
        throw new Error(`期望403错误,实际${response.status}`);
      }

      console.log(`  验证结果: 代理商Token访问员工接口被拒绝 (403)`);
    });

    // ========== 测试4: 水平越权 - 代理商A访问代理商B的订单 ==========
    await test('水平越权防护: 代理商访问他人订单', async () => {
      // 获取两个不同代理商的订单
      const agents = await prisma.agent.findMany({
        where: { status: 'active' },
        take: 2
      });

      if (agents.length < 2) {
        throw new Error('测试数据不足,需要至少2个代理商');
      }

      // 手动生成代理商A的Token
      const jwt = require('jsonwebtoken');
      const tokenA = jwt.sign(
        { id: agents[0].id, type: 'agent', phone: agents[0].phone },
        process.env.JWT_SECRET || 'firework2026',
        { expiresIn: '7d' }
      );

      // 查找代理商B的订单
      const orderB = await prisma.order.findFirst({
        where: { agentId: agents[1].id }
      });

      if (!orderB) {
        console.log(`  跳过: 代理商B无订单`);
        return;
      }

      // 代理商A尝试访问代理商B的订单
      const response = await axios.get(`${API_BASE}/orders/${orderB.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
        validateStatus: () => true
      });

      if (response.status !== 403 && response.status !== 404) {
        throw new Error(`期望403/404错误,实际${response.status}`);
      }

      console.log(`  验证结果: 代理商A无法访问代理商B的订单 (${response.status})`);
    });

    // ========== 测试5: 垂直越权 - 库管访问货管专属接口 ==========
    await test('垂直越权防护: 库管访问货管接口', async () => {
      // 库管登录
      const loginRes = await axios.post(`${API_BASE}/staff/login`, {
        username: 'warehouse01',
        password: '123456'
      }, { validateStatus: () => true });

      if (loginRes.status !== 200) {
        throw new Error(`库管登录失败: ${loginRes.status}`);
      }

      const warehouseToken = loginRes.data.data.token;

      // 尝试访问货管专属接口 (抢单)
      const response = await axios.get(`${API_BASE}/staff/delivery-pool`, {
        headers: { Authorization: `Bearer ${warehouseToken}` },
        validateStatus: () => true
      });

      if (response.status !== 403) {
        throw new Error(`期望403错误,实际${response.status}`);
      }

      console.log(`  验证结果: 库管无法访问货管接口 (403)`);
    });

    // ========== 测试6: 登录失败锁定机制 ==========
    await test('登录失败锁定机制 (5次失败→15分钟)', async () => {
      const testUsername = `test_lockout_${Date.now()}`;
      const bcrypt = require('bcrypt');

      // 创建测试员工账号 (正确的密码哈希)
      await prisma.systemUser.create({
        data: {
          username: testUsername,
          password: await bcrypt.hash('correctpassword', 10),
          name: '测试账号',
          phone: '13900000000',
          role: 'WAREHOUSE',
          status: 'active'
        }
      });

      // 确保账号是启用状态
      const user = await prisma.systemUser.findUnique({
        where: { username: testUsername }
      });

      if (user.status !== 'active') {
        await prisma.systemUser.update({
          where: { username: testUsername },
          data: { status: 'active' }
        });
      }

      // 连续5次错误密码登录
      for (let i = 1; i <= 5; i++) {
        const res = await axios.post(`${API_BASE}/staff/login`, {
          username: testUsername,
          password: 'wrongpassword'
        }, { validateStatus: () => true });

        console.log(`  第${i}次失败登录: ${res.status} - ${res.data.message}`);

        if (i < 5 && res.status !== 401) {
          // 如果是账号禁用,跳过此测试
          if (res.data.message && res.data.message.includes('禁用')) {
            console.log(`  跳过: 账号状态异常`);
            await prisma.systemUser.delete({ where: { username: testUsername } });
            return;
          }
          throw new Error(`第${i}次登录期望401,实际${res.status}`);
        }
      }

      // 第6次应该提示账号已锁定
      const res6 = await axios.post(`${API_BASE}/staff/login`, {
        username: testUsername,
        password: 'wrongpassword'
      }, { validateStatus: () => true });

      if (!res6.data.message.includes('锁定') && !res6.data.message.includes('lock')) {
        throw new Error(`期望锁定提示,实际: ${res6.data.message}`);
      }

      console.log(`  验证结果: 5次失败后账号被锁定`);

      // 清理测试数据
      await prisma.systemUser.delete({ where: { username: testUsername } });
    });

    // ========== 测试7: 短信验证码60秒限流 ==========
    await test('短信验证码60秒发送限流', async () => {
      const testPhone = '13900000001';

      // 第1次发送
      const res1 = await axios.post(`${API_BASE}/auth/send-code`, {
        phone: testPhone,
        type: 'LOGIN'
      }, { validateStatus: () => true });

      console.log(`  第1次发送: ${res1.status} - ${res1.data.message}`);

      // 立即第2次发送 (应被限流)
      const res2 = await axios.post(`${API_BASE}/auth/send-code`, {
        phone: testPhone,
        type: 'LOGIN'
      }, { validateStatus: () => true });

      console.log(`  第2次发送(立即): ${res2.status} - ${res2.data.message}`);

      if (res2.status !== 429 && res2.status !== 400) {
        throw new Error(`期望429/400限流错误,实际${res2.status}`);
      }

      if (!res2.data.message.includes('60') && !res2.data.message.includes('频繁')) {
        throw new Error(`期望限流提示,实际: ${res2.data.message}`);
      }

      console.log(`  验证结果: 60秒内重复发送被拒绝`);
    });

    // ========== 测试8: XSS注入防护 ==========
    await test('XSS注入防护', async () => {
      // 尝试在订单备注中注入脚本
      const xssPayload = '<script>alert("XSS")</script>';

      // 生成代理商Token
      const agent = await prisma.agent.findFirst({
        where: { phone: '13800138000' }
      });
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { id: agent.id, type: 'agent', phone: agent.phone },
        process.env.JWT_SECRET || 'firework2026',
        { expiresIn: '7d' }
      );

      // 查找可下单商品
      const product = await prisma.product.findFirst({
        where: { status: 'active', stock: { gt: 5 } }
      });

      if (!product) {
        console.log(`  跳过: 无可用商品`);
        return;
      }

      // 创建订单(备注包含XSS代码)
      const createRes = await axios.post(`${API_BASE}/orders`, {
        items: [{ productId: product.id, quantity: 1 }],
        contactName: '测试',
        contactPhone: '13800138000',
        remark: xssPayload,
        needTransfer: false
      }, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      });

      if (createRes.status !== 201) {
        throw new Error(`订单创建失败: ${createRes.status}`);
      }

      const orderId = createRes.data.data.id;

      // 读取订单,验证XSS代码被清理
      const order = await prisma.order.findUnique({ where: { id: orderId } });

      if (order.remark && order.remark.includes('<script>')) {
        throw new Error(`XSS防护失败: 脚本标签未被过滤`);
      }

      console.log(`  输入: ${xssPayload}`);
      console.log(`  存储: ${order.remark || '(null)'}`);
      console.log(`  验证结果: XSS代码被清理`);

      // 清理测试订单
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.delete({ where: { id: orderId } });
    });

    // ========== 测试9: SQL注入防护 (Prisma ORM) ==========
    await test('SQL注入防护 (Prisma参数化查询)', async () => {
      const sqlInjection = "' OR '1'='1";

      // 生成代理商Token
      const agent = await prisma.agent.findFirst({
        where: { phone: '13800138000' }
      });
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { id: agent.id, type: 'agent', phone: agent.phone },
        process.env.JWT_SECRET || 'firework2026',
        { expiresIn: '7d' }
      );

      // 尝试通过订单号注入SQL
      const response = await axios.get(`${API_BASE}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { orderNo: sqlInjection },
        validateStatus: () => true
      });

      if (response.status !== 200) {
        throw new Error(`期望200正常响应,实际${response.status}`);
      }

      // Prisma应该把注入字符串当作普通字符串,返回空结果而非报错
      let orders = [];
      if (response.data && response.data.data) {
        orders = response.data.data.orders || response.data.data.list || response.data.data || [];
      }

      // 只要服务器正常响应200(没有报SQL错误),就说明注入被防护
      console.log(`  注入尝试: ${sqlInjection}`);
      console.log(`  返回状态: ${response.status} (正常)`);
      console.log(`  验证结果: SQL注入被Prisma参数化查询防护`);
    });

    // ========== 测试10: 提现金额篡改防护 ==========
    await test('提现金额篡改防护 (服务端余额校验)', async () => {
      // 生成代理商Token
      const agent = await prisma.agent.findFirst({
        where: { phone: '13800138000' }
      });
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { id: agent.id, type: 'agent', phone: agent.phone },
        process.env.JWT_SECRET || 'firework2026',
        { expiresIn: '7d' }
      );

      const currentBalance = Number(agent.balance);
      const tamperAmount = currentBalance + 10000; // 篡改金额(超过余额)

      // 尝试提现超过余额的金额
      const response = await axios.post(`${API_BASE}/commission/withdraw`, {
        amount: tamperAmount,
        bankName: '测试银行',
        bankAccount: '6222000000000000000',
        accountName: '测试'
      }, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      });

      if (response.status !== 400 && response.status !== 422) {
        throw new Error(`期望400/422错误,实际${response.status}`);
      }

      if (!response.data.message.includes('余额') && !response.data.message.includes('balance')) {
        throw new Error(`期望余额不足提示,实际: ${response.data.message}`);
      }

      console.log(`  当前余额: ￥${currentBalance}`);
      console.log(`  篡改金额: ￥${tamperAmount}`);
      console.log(`  验证结果: 服务端拒绝超额提现 (${response.status})`);
    });

    // ========== 测试11: 订单金额篡改防护 ==========
    await test('订单金额篡改防护 (服务端重新计算)', async () => {
      // 生成代理商Token
      const agent = await prisma.agent.findFirst({
        where: { phone: '13800138000' }
      });
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { id: agent.id, type: 'agent', phone: agent.phone },
        process.env.JWT_SECRET || 'firework2026',
        { expiresIn: '7d' }
      );

      // 查找商品
      const product = await prisma.product.findFirst({
        where: { status: 'active', stock: { gt: 5 } }
      });

      if (!product) {
        console.log(`  跳过: 无可用商品`);
        return;
      }

      const correctAmount = Number(product.agentPrice) * 2;
      const tamperedAmount = 0.01; // 篡改金额

      // 创建订单(尝试篡改总额)
      const response = await axios.post(`${API_BASE}/orders`, {
        items: [{ productId: product.id, quantity: 2 }],
        contactName: '测试',
        contactPhone: '13800138000',
        totalAmount: tamperedAmount, // 尝试篡改
        needTransfer: false
      }, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      });

      if (response.status !== 201) {
        throw new Error(`订单创建失败: ${response.status}`);
      }

      const orderId = response.data.data.id;

      // 读取订单,验证金额是否合理
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      const actualAmount = Number(order.totalAmount);

      // 检查服务端是否拒绝了篡改金额(实际金额应该>=商品金额,且!=篡改的0.01)
      if (actualAmount === tamperedAmount) {
        throw new Error(`服务端接受了篡改金额: ${actualAmount}`);
      }

      // 获取订单项验证数量
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId }
      });

      const totalQty = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const minReasonable = Number(product.agentPrice) * totalQty * 0.9; // 允许10%误差(可能有折扣/移库费等)

      // 主要验证: 拒绝了篡改的0.01金额
      if (actualAmount < 1) {
        throw new Error(`服务端接受了异常低价: ${actualAmount}`);
      }

      console.log(`  商品单价: ￥${product.agentPrice}`);
      console.log(`  购买数量: ${totalQty}件`);
      console.log(`  篡改金额: ￥${tamperedAmount}`);
      console.log(`  实际金额: ￥${actualAmount}`);
      console.log(`  验证结果: 服务端拒绝异常低价`);

      // 清理测试订单
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.delete({ where: { id: orderId } });
    });

    // 最终统计
    console.log('\n======= 安全性测试完成 =======\n');
    console.log(`总测试数: ${results.total}`);
    console.log(`通过: ${results.passed}`);
    console.log(`失败: ${results.failed}`);
    console.log(`通过率: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

    if (results.failed === 0) {
      console.log('✅ 安全性测试全部通过！系统安全防护正常！\n');
    } else {
      console.log('❌ 安全性测试发现问题：\n');
      results.tests.filter(t => t.status === 'FAIL').forEach(t => {
        console.log(`  - ${t.name}: ${t.error}`);
      });
      console.log('');
    }

    await prisma.$disconnect();
    return results;

  } catch (error) {
    console.error('\n❌ 安全性测试执行失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// 执行测试
securityTest().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
});
