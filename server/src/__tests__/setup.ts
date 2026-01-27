/**
 * Jest测试环境配置
 */
import dotenv from 'dotenv';

// 加载测试环境变量
dotenv.config({ path: '.env.test' });

// 设置测试环境
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';

// 全局超时设置
jest.setTimeout(30000);

// 静默console输出（可选）
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

beforeAll(() => {
  console.log('🧪 测试环境初始化完成');
});

afterAll(() => {
  console.log('🧪 测试完成，清理资源');
});
