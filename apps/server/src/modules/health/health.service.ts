import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * 基础健康检查
   */
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * 数据库连接检查
   */
  async checkDatabase() {
    try {
      const isConnected = this.dataSource.isInitialized;
      if (isConnected) {
        // 执行简单查询测试连接
        await this.dataSource.query('SELECT 1');
      }
      return {
        status: isConnected ? 'ok' : 'error',
        database: 'mysql',
        connected: isConnected,
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'mysql',
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 缓存连接检查
   */
  async checkCache() {
    try {
      const testKey = 'health_check_test';
      const testValue = Date.now().toString();

      // 写入测试
      await this.cacheManager.set(testKey, testValue, 10);

      // 读取测试
      const cachedValue = await this.cacheManager.get<string>(testKey);

      // 清理
      await this.cacheManager.del(testKey);

      const isWorking = cachedValue === testValue;

      return {
        status: isWorking ? 'ok' : 'error',
        cache: 'redis',
        working: isWorking,
      };
    } catch (error) {
      return {
        status: 'error',
        cache: 'redis',
        working: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
