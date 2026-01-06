import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, IsNull, Or } from 'typeorm';
import { CommissionRule } from '../../database/entities/commission-rule.entity';
import {
  CreateCommissionRuleDto,
  UpdateCommissionRuleDto,
  QueryCommissionRuleDto,
} from './dto/commission-rule.dto';

@Injectable()
export class CommissionRuleService {
  constructor(
    @InjectRepository(CommissionRule)
    private readonly ruleRepository: Repository<CommissionRule>,
  ) {}

  /**
   * 创建分润规则
   */
  async create(dto: CreateCommissionRuleDto): Promise<CommissionRule> {
    // 验证金额区间
    if (dto.maxAmount !== undefined && dto.maxAmount !== null && dto.maxAmount <= dto.minAmount) {
      throw new BadRequestException('最高金额必须大于最低金额');
    }

    const rule = this.ruleRepository.create({
      name: dto.name,
      minAmount: dto.minAmount.toFixed(2),
      maxAmount: dto.maxAmount !== undefined && dto.maxAmount !== null ? dto.maxAmount.toFixed(2) : null,
      level1Rate: dto.level1Rate.toFixed(4),
      level2Rate: dto.level2Rate.toFixed(4),
      sort: dto.sort ?? 0,
      status: dto.status ?? 1,
    });

    return this.ruleRepository.save(rule);
  }

  /**
   * 更新分润规则
   */
  async update(id: number, dto: UpdateCommissionRuleDto): Promise<CommissionRule> {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('分润规则不存在');
    }

    // 验证金额区间
    const minAmount = dto.minAmount !== undefined ? dto.minAmount : parseFloat(rule.minAmount);
    const maxAmount = dto.maxAmount !== undefined ? dto.maxAmount : (rule.maxAmount ? parseFloat(rule.maxAmount) : null);

    if (maxAmount !== null && maxAmount <= minAmount) {
      throw new BadRequestException('最高金额必须大于最低金额');
    }

    if (dto.name !== undefined) rule.name = dto.name;
    if (dto.minAmount !== undefined) rule.minAmount = dto.minAmount.toFixed(2);
    if (dto.maxAmount !== undefined) rule.maxAmount = dto.maxAmount !== null ? dto.maxAmount.toFixed(2) : null;
    if (dto.level1Rate !== undefined) rule.level1Rate = dto.level1Rate.toFixed(4);
    if (dto.level2Rate !== undefined) rule.level2Rate = dto.level2Rate.toFixed(4);
    if (dto.sort !== undefined) rule.sort = dto.sort;
    if (dto.status !== undefined) rule.status = dto.status;

    return this.ruleRepository.save(rule);
  }

  /**
   * 删除分润规则
   */
  async delete(id: number): Promise<void> {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('分润规则不存在');
    }

    await this.ruleRepository.remove(rule);
  }

  /**
   * 获取分润规则详情
   */
  async findOne(id: number): Promise<CommissionRule> {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('分润规则不存在');
    }
    return rule;
  }

  /**
   * 获取分润规则列表（管理后台）
   */
  async findAll(dto: QueryCommissionRuleDto): Promise<{
    list: CommissionRule[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page = 1, pageSize = 20, status } = dto;

    const queryBuilder = this.ruleRepository.createQueryBuilder('r');

    if (status !== undefined) {
      queryBuilder.where('r.status = :status', { status });
    }

    queryBuilder
      .orderBy('r.sort', 'ASC')
      .addOrderBy('r.min_amount', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取所有启用的分润规则（用于计算分润）
   */
  async getActiveRules(): Promise<CommissionRule[]> {
    return this.ruleRepository.find({
      where: { status: 1 },
      order: { sort: 'ASC', minAmount: 'ASC' },
    });
  }

  /**
   * 根据订单金额匹配分润规则
   */
  async matchRule(orderAmount: number): Promise<CommissionRule | null> {
    const rules = await this.getActiveRules();

    for (const rule of rules) {
      const minAmount = parseFloat(rule.minAmount);
      const maxAmount = rule.maxAmount ? parseFloat(rule.maxAmount) : null;

      // 检查金额是否在区间内
      if (orderAmount >= minAmount) {
        if (maxAmount === null || orderAmount < maxAmount) {
          return rule;
        }
      }
    }

    return null;
  }

  /**
   * 获取分润比例（兼容旧逻辑，用于计算分润）
   */
  async getCommissionRates(orderAmount: number): Promise<{
    level1Rate: number;
    level2Rate: number;
  }> {
    const rule = await this.matchRule(orderAmount);

    if (rule) {
      return {
        level1Rate: parseFloat(rule.level1Rate),
        level2Rate: parseFloat(rule.level2Rate),
      };
    }

    // 如果没有匹配的规则，返回默认值（向后兼容）
    // 订单金额 < 399元: 一级代理10%, 二级代理2%
    // 订单金额 >= 399元: 一级代理15%, 二级代理3%
    const isHighValue = orderAmount >= 399;
    return {
      level1Rate: isHighValue ? 0.15 : 0.10,
      level2Rate: isHighValue ? 0.03 : 0.02,
    };
  }
}
