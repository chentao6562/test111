import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Config } from '../../database/entities/config.entity';
import { BusinessException } from '../../common/filters/business.exception';
import { ErrorCode } from '../../common/utils/error-code.enum';
import { ConfigItemDto } from './dto/update-config.dto';

@Injectable()
export class ConfigService {
  private readonly CACHE_PREFIX = 'config:';
  private readonly CACHE_TTL = 3600000; // 1小时

  constructor(
    @InjectRepository(Config)
    private readonly configRepo: Repository<Config>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async findAll(): Promise<Config[]> {
    return this.configRepo.find({
      order: { group: 'ASC', sort: 'ASC' },
    });
  }

  async findByGroup(group: string): Promise<Config[]> {
    return this.configRepo.find({
      where: { group },
      order: { sort: 'ASC' },
    });
  }

  async getConfig<T = string>(key: string): Promise<T | null> {
    // 先从缓存获取
    const cacheKey = this.CACHE_PREFIX + key;
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached !== undefined) {
      return this.parseValue<T>(cached);
    }

    // 从数据库获取
    const config = await this.configRepo.findOne({ where: { key } });
    if (!config) {
      return null;
    }

    // 存入缓存
    await this.cacheManager.set(cacheKey, config.value, this.CACHE_TTL);

    return this.parseValue<T>(config.value);
  }

  async getConfigOrDefault<T = string>(key: string, defaultValue: T): Promise<T> {
    const value = await this.getConfig<T>(key);
    return value !== null ? value : defaultValue;
  }

  async updateConfigs(items: ConfigItemDto[]): Promise<void> {
    for (const item of items) {
      const config = await this.configRepo.findOne({ where: { key: item.key } });
      if (config) {
        config.value = item.value;
        await this.configRepo.save(config);
        // 清除缓存
        await this.cacheManager.del(this.CACHE_PREFIX + item.key);
      }
    }
  }

  async setConfig(key: string, value: string, options?: { group?: string; name?: string; description?: string; type?: string }): Promise<void> {
    let config = await this.configRepo.findOne({ where: { key } });

    if (config) {
      config.value = value;
      if (options) {
        Object.assign(config, options);
      }
    } else {
      config = this.configRepo.create({
        key,
        value,
        group: options?.group || 'basic',
        name: options?.name || key,
        description: options?.description || null,
        type: options?.type || 'string',
      });
    }

    await this.configRepo.save(config);
    await this.cacheManager.del(this.CACHE_PREFIX + key);
  }

  async initDefaultConfigs(): Promise<void> {
    const defaultConfigs = [
      // 基础配置
      { key: 'site_name', value: '蒙庆烟花', group: 'basic', name: '站点名称', type: 'string' },
      { key: 'site_logo', value: '', group: 'basic', name: '站点Logo', type: 'string' },
      { key: 'contact_phone', value: '', group: 'basic', name: '联系电话', type: 'string' },
      { key: 'store_address', value: '', group: 'basic', name: '门店地址', type: 'string' },

      // 订单配置
      { key: 'min_order_amount', value: '0', group: 'order', name: '最低订单金额', type: 'number' },
      { key: 'lock_fee', value: '80', group: 'order', name: 'VIP锁货费', type: 'number' },
      { key: 'lock_fee_free_amount', value: '500', group: 'order', name: '免锁货费门槛', type: 'number' },

      // 分润配置
      { key: 'commission_threshold', value: '399', group: 'commission', name: '分润阈值', type: 'number' },
      { key: 'commission_rate_l1_t1', value: '0.10', group: 'commission', name: '一级分润比例(低)', type: 'number' },
      { key: 'commission_rate_l1_t2', value: '0.15', group: 'commission', name: '一级分润比例(高)', type: 'number' },
      { key: 'commission_rate_l2_t1', value: '0.02', group: 'commission', name: '二级分润比例(低)', type: 'number' },
      { key: 'commission_rate_l2_t2', value: '0.03', group: 'commission', name: '二级分润比例(高)', type: 'number' },

      // 提现配置
      { key: 'withdraw_min', value: '100', group: 'withdraw', name: '最低提现金额', type: 'number' },
      { key: 'withdraw_fee_rate', value: '0', group: 'withdraw', name: '提现手续费率', type: 'number' },

      // 搬运费配置
      { key: 'transfer_fee', value: '40', group: 'transfer', name: '单次搬运费', type: 'number' },
    ];

    for (const config of defaultConfigs) {
      const exists = await this.configRepo.findOne({ where: { key: config.key } });
      if (!exists) {
        await this.configRepo.save(this.configRepo.create(config));
      }
    }
  }

  private parseValue<T>(value: string | null): T | null {
    if (value === null) {
      return null;
    }

    // 尝试解析JSON
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }
}
