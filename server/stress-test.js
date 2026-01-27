/**
 * 压力测试脚本
 * 使用autocannon进行API压力测试
 *
 * 使用方法:
 * npm install -D autocannon
 * node stress-test.js
 */

const autocannon = require('autocannon');

const BASE_URL = 'http://39.104.58.26';

// 测试场景配置
const scenarios = [
  {
    name: '商品列表接口',
    config: {
      url: `${BASE_URL}/api/products?page=1&limit=20`,
      method: 'GET',
      connections: 100,
      duration: 30,
    },
    thresholds: {
      minQPS: 300,
      maxP99: 500,  // ms
    }
  },
  {
    name: '商品详情接口',
    config: {
      url: `${BASE_URL}/api/products/1`,
      method: 'GET',
      connections: 50,
      duration: 20,
    },
    thresholds: {
      minQPS: 500,
      maxP99: 200,
    }
  },
  {
    name: '分类列表接口',
    config: {
      url: `${BASE_URL}/api/categories`,
      method: 'GET',
      connections: 50,
      duration: 15,
    },
    thresholds: {
      minQPS: 800,
      maxP99: 100,
    }
  },
];

// 运行单个测试场景
async function runScenario(scenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`场景: ${scenario.name}`);
  console.log(`URL: ${scenario.config.url}`);
  console.log(`并发: ${scenario.config.connections}, 持续: ${scenario.config.duration}s`);
  console.log('='.repeat(60));

  return new Promise((resolve) => {
    const instance = autocannon(scenario.config, (err, result) => {
      if (err) {
        console.error('测试错误:', err);
        resolve({ passed: false, error: err.message });
        return;
      }

      const qps = result.requests.average;
      const p99 = result.latency.p99;
      const errors = result.errors;
      const successRate = ((result.requests.total - errors) / result.requests.total * 100).toFixed(2);

      console.log(`\n结果:`);
      console.log(`  QPS: ${qps.toFixed(2)}`);
      console.log(`  P99延迟: ${p99}ms`);
      console.log(`  成功率: ${successRate}%`);
      console.log(`  错误数: ${errors}`);

      // 检查阈值
      const qpsPassed = qps >= scenario.thresholds.minQPS;
      const p99Passed = p99 <= scenario.thresholds.maxP99;
      const passed = qpsPassed && p99Passed;

      console.log(`\n阈值检查:`);
      console.log(`  QPS >= ${scenario.thresholds.minQPS}: ${qpsPassed ? '✓ 通过' : '✗ 未通过'}`);
      console.log(`  P99 <= ${scenario.thresholds.maxP99}ms: ${p99Passed ? '✓ 通过' : '✗ 未通过'}`);
      console.log(`  总体: ${passed ? '✓ 通过' : '✗ 未通过'}`);

      resolve({
        name: scenario.name,
        passed,
        qps,
        p99,
        successRate,
        errors,
      });
    });

    // 实时进度
    autocannon.track(instance, { renderProgressBar: true });
  });
}

// 主函数
async function main() {
  console.log('\n蒙庆烟花系统 - 压力测试');
  console.log('目标服务器:', BASE_URL);
  console.log('测试时间:', new Date().toLocaleString());

  const results = [];

  for (const scenario of scenarios) {
    const result = await runScenario(scenario);
    results.push(result);

    // 场景间隔，让服务器恢复
    await new Promise(r => setTimeout(r, 3000));
  }

  // 汇总报告
  console.log('\n' + '='.repeat(60));
  console.log('压力测试汇总报告');
  console.log('='.repeat(60));

  let allPassed = true;
  results.forEach(r => {
    if (!r.passed) allPassed = false;
    console.log(`${r.passed ? '✓' : '✗'} ${r.name}: QPS=${r.qps?.toFixed(2) || 'N/A'}, P99=${r.p99 || 'N/A'}ms`);
  });

  console.log('='.repeat(60));
  console.log(`总体结果: ${allPassed ? '✓ 全部通过' : '✗ 存在未通过项'}`);

  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
