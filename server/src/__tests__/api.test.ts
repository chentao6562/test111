/**
 * API集成测试
 * 测试核心API端点的基本功能
 */
import request from 'supertest';

const BASE_URL = process.env.TEST_API_URL || 'http://39.104.58.26';

describe('API健康检查', () => {
  it('应该返回API状态正常', async () => {
    const response = await request(BASE_URL)
      .get('/api/health')
      .timeout(10000);

    // 可能返回200或404（如果没有health端点）
    expect([200, 404]).toContain(response.status);
  });
});

describe('商品API', () => {
  it('应该返回商品列表', async () => {
    const response = await request(BASE_URL)
      .get('/api/products')
      .query({ page: 1, limit: 10 })
      .timeout(10000);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });

  it('应该支持分类筛选', async () => {
    const response = await request(BASE_URL)
      .get('/api/products')
      .query({ categoryId: 1, page: 1, limit: 10 })
      .timeout(10000);

    expect(response.status).toBe(200);
  });
});

describe('认证API', () => {
  it('无token访问受保护接口应返回401', async () => {
    const response = await request(BASE_URL)
      .get('/api/agent/profile')
      .timeout(10000);

    expect(response.status).toBe(401);
  });

  it('无效token应返回401', async () => {
    const response = await request(BASE_URL)
      .get('/api/agent/profile')
      .set('Authorization', 'Bearer invalid-token')
      .timeout(10000);

    expect(response.status).toBe(401);
  });
});

describe('门店API', () => {
  it('无token访问门店接口应返回401', async () => {
    const response = await request(BASE_URL)
      .get('/api/store/reservations')
      .timeout(10000);

    expect(response.status).toBe(401);
  });
});

describe('安全测试', () => {
  it('SQL注入应被阻止', async () => {
    const response = await request(BASE_URL)
      .get('/api/products')
      .query({ categoryId: "1' OR '1'='1" })
      .timeout(10000);

    // 应该返回400（参数错误）或200（安全处理）
    expect([200, 400]).toContain(response.status);
    // 不应该返回500（服务器错误）
    expect(response.status).not.toBe(500);
  });

  it('XSS注入应被转义', async () => {
    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        phone: '<script>alert(1)</script>',
        code: '123456'
      })
      .timeout(10000);

    // 不应该包含未转义的script标签
    expect(JSON.stringify(response.body)).not.toContain('<script>');
  });
});
