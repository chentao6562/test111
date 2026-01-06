import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull, Not } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { ApplyAgentDto } from './dto/apply-agent.dto';
import { AuditAgentDto } from './dto/audit-agent.dto';
import { QueryAgentDto } from './dto/query-agent.dto';
import { BusinessException } from '../../common/filters/business.exception';
import { ErrorCode } from '../../common/utils/error-code.enum';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 申请成为代理商
   */
  async applyAgent(userId: number, dto: ApplyAgentDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }

    // 检查是否已是代理或已申请
    if (user.agentStatus === 1) {
      throw new BusinessException(ErrorCode.AGENT_ALREADY_APPLIED, '您已提交申请，请等待审核');
    }
    if (user.agentStatus === 2) {
      throw new BusinessException(ErrorCode.AGENT_ALREADY_APPROVED, '您已是代理商');
    }

    let parentId: number | null = null;

    // 如果有邀请码，验证邀请码有效性
    if (dto.inviteCode) {
      const parent = await this.userRepository.findOne({
        where: { inviteCode: dto.inviteCode },
      });
      if (!parent) {
        throw new BusinessException(ErrorCode.INVITE_CODE_INVALID, '邀请码无效');
      }
      if (parent.agentLevel !== 1) {
        throw new BusinessException(ErrorCode.INVITE_CODE_INVALID, '邀请码所属用户不是一级代理');
      }
      if (parent.agentStatus !== 2) {
        throw new BusinessException(ErrorCode.INVITE_CODE_INVALID, '邀请码所属用户未通过审核');
      }
      parentId = parent.id;
    }

    // 更新用户信息，提交申请
    await this.userRepository.update(userId, {
      realName: dto.realName,
      idCard: dto.idCard,
      phone: dto.phone,
      agentStatus: 1, // 待审核
      parentId,
    });
  }

  /**
   * 获取代理信息
   */
  async getAgentInfo(userId: number): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }

    // 统计团队人数
    const directCount = await this.userRepository.count({
      where: { parentId: userId, agentStatus: 2 },
    });

    return {
      agentLevel: user.agentLevel,
      agentStatus: user.agentStatus,
      inviteCode: user.inviteCode,
      directCount,
      balance: user.balance,
      frozenAmount: user.frozenAmount,
      totalIncome: user.totalIncome,
      agentAt: user.agentAt,
    };
  }

  /**
   * 获取推广码
   */
  async getQrcode(userId: number): Promise<{ inviteCode: string; qrcodeUrl: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }
    if (user.agentStatus !== 2) {
      throw new BusinessException(ErrorCode.NOT_AGENT, '您不是代理商');
    }
    if (user.agentLevel !== 1) {
      throw new BusinessException(ErrorCode.NOT_FIRST_LEVEL_AGENT, '只有一级代理可以发展下级');
    }
    if (!user.inviteCode) {
      throw new BusinessException(ErrorCode.INVITE_CODE_NOT_GENERATED, '邀请码尚未生成');
    }

    // 这里返回邀请码，实际小程序码需要调用微信接口生成
    return {
      inviteCode: user.inviteCode,
      qrcodeUrl: `/api/agent/qrcode-image/${user.inviteCode}`, // 占位URL
    };
  }

  /**
   * 获取我的团队列表
   */
  async getTeam(
    userId: number,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ list: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }
    if (user.agentStatus !== 2) {
      throw new BusinessException(ErrorCode.NOT_AGENT, '您不是代理商');
    }

    const [list, total] = await this.userRepository.findAndCount({
      where: { parentId: userId },
      select: ['id', 'nickname', 'avatar', 'phone', 'agentLevel', 'agentStatus', 'createdAt', 'agentAt'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取团队统计
   */
  async getTeamStats(userId: number): Promise<{
    directCount: number;
    teamCount: number;
    teamSales: number;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }

    // 直推人数
    const directCount = await this.userRepository.count({
      where: { parentId: userId, agentStatus: 2 },
    });

    // 团队总人数（一级代理可以看到二级代理）
    let teamCount = directCount;

    // 如果是一级代理，还需要统计二级代理的下级
    if (user.agentLevel === 1) {
      const directMembers = await this.userRepository.find({
        where: { parentId: userId, agentStatus: 2 },
        select: ['id'],
      });

      for (const member of directMembers) {
        const subCount = await this.userRepository.count({
          where: { parentId: member.id },
        });
        teamCount += subCount;
      }
    }

    // 团队业绩（需要关联订单表计算，这里简化返回0）
    // 实际需要: SELECT SUM(pay_amount) FROM orders WHERE user_id IN (团队成员IDs)
    const teamSales = 0;

    return {
      directCount,
      teamCount,
      teamSales,
    };
  }

  /**
   * 获取邀请记录
   */
  async getInvites(
    userId: number,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ list: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const [list, total] = await this.userRepository.findAndCount({
      where: { parentId: userId },
      select: ['id', 'nickname', 'avatar', 'phone', 'agentLevel', 'agentStatus', 'createdAt'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ==================== 管理后台方法 ====================

  /**
   * 获取代理商列表（管理后台）
   */
  async getAgentList(dto: QueryAgentDto): Promise<{
    list: User[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page = 1, pageSize = 20, status, level, keyword } = dto;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // 只查询申请过代理的用户
    queryBuilder.where('user.agentStatus > 0');

    if (status !== undefined) {
      queryBuilder.andWhere('user.agentStatus = :status', { status });
    }

    if (level !== undefined) {
      queryBuilder.andWhere('user.agentLevel = :level', { level });
    }

    if (keyword) {
      queryBuilder.andWhere(
        '(user.nickname LIKE :keyword OR user.phone LIKE :keyword OR user.realName LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    queryBuilder
      .orderBy('user.createdAt', 'DESC')
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
   * 获取代理商详情（管理后台）
   */
  async getAgentDetail(id: number): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }

    // 获取上级信息
    let parent = null;
    if (user.parentId) {
      parent = await this.userRepository.findOne({
        where: { id: user.parentId },
        select: ['id', 'nickname', 'phone', 'realName'],
      });
    }

    // 获取直推人数
    const directCount = await this.userRepository.count({
      where: { parentId: id, agentStatus: 2 },
    });

    return {
      ...user,
      parent,
      directCount,
    };
  }

  /**
   * 审核代理申请（管理后台）
   */
  async auditAgent(id: number, dto: AuditAgentDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }
    if (user.agentStatus !== 1) {
      throw new BusinessException(ErrorCode.AGENT_STATUS_INVALID, '该用户不在待审核状态');
    }

    const updateData: Partial<User> = {
      agentStatus: dto.status,
    };

    if (dto.status === 2) {
      // 审核通过
      // 设置代理等级：有上级为2级，无上级为1级
      updateData.agentLevel = user.parentId ? 2 : 1;
      // 生成邀请码（只有一级代理才有）
      if (!user.parentId) {
        updateData.inviteCode = await this.generateUniqueInviteCode();
      }
      updateData.agentAt = new Date();
      updateData.isVerified = 1; // 同时完成实名认证
    }

    await this.userRepository.update(id, updateData);
  }

  /**
   * 调整代理等级（管理后台）
   */
  async updateAgentLevel(id: number, level: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }
    if (user.agentStatus !== 2) {
      throw new BusinessException(ErrorCode.NOT_AGENT, '该用户不是代理商');
    }

    const updateData: Partial<User> = {
      agentLevel: level,
    };

    // 如果升级为一级代理，生成邀请码
    if (level === 1 && !user.inviteCode) {
      updateData.inviteCode = await this.generateUniqueInviteCode();
    }

    await this.userRepository.update(id, updateData);
  }

  /**
   * 禁用/启用代理商（管理后台）
   */
  async updateAgentStatus(id: number, status: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }

    await this.userRepository.update(id, { status });
  }

  /**
   * 获取代理商层级树（管理后台）
   */
  async getAgentTree(): Promise<any[]> {
    // 获取所有一级代理
    const level1Agents = await this.userRepository.find({
      where: { agentLevel: 1, agentStatus: 2 },
      select: ['id', 'nickname', 'realName', 'phone', 'agentLevel', 'inviteCode', 'agentAt'],
    });

    const tree = [];

    for (const agent of level1Agents) {
      // 获取该一级代理的下级
      const children = await this.userRepository.find({
        where: { parentId: agent.id, agentStatus: 2 },
        select: ['id', 'nickname', 'realName', 'phone', 'agentLevel', 'agentAt'],
      });

      tree.push({
        ...agent,
        children,
      });
    }

    return tree;
  }

  /**
   * 生成唯一邀请码
   */
  private async generateUniqueInviteCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let exists: User | null;

    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      exists = await this.userRepository.findOne({ where: { inviteCode: code } });
    } while (exists);

    return code;
  }
}
