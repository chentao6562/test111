import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcryptjs';

import { User, Admin, Employee } from '../../database/entities';
import { UniLoginDto, AdminLoginDto, EmployeeLoginDto } from './dto';
import { JwtPayload } from './decorators/current-user.decorator';
import { BusinessException } from '../../common/filters/business.exception';
import { ErrorCode } from '../../common/utils/error-code.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  /**
   * uniCloud登录（小程序端）
   */
  async uniLogin(dto: UniLoginDto) {
    // 验证uniCloud token
    const uniUserInfo = await this.validateUniToken(dto.token);

    if (!uniUserInfo || !uniUserInfo.uid) {
      throw new UnauthorizedException('无效的登录凭证');
    }

    // 查找或创建用户
    let user = await this.userRepository.findOne({
      where: { uniId: uniUserInfo.uid },
    });

    if (!user) {
      // 创建新用户
      user = this.userRepository.create({
        uniId: uniUserInfo.uid,
        openid: uniUserInfo.openid || null,
        phone: uniUserInfo.mobile || null,
        nickname: uniUserInfo.nickname || `用户${Date.now().toString(36)}`,
        avatar: uniUserInfo.avatar || null,
      });

      // 处理邀请码
      if (dto.inviteCode) {
        const parent = await this.userRepository.findOne({
          where: { inviteCode: dto.inviteCode, agentLevel: 1 },
        });
        if (parent) {
          user.parentId = parent.id;
        }
      }

      await this.userRepository.save(user);
    }

    // 检查用户状态
    if (user.status === 0) {
      throw new BusinessException(ErrorCode.USER_DISABLED);
    }

    // 更新最后登录时间
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    // 签发JWT
    const token = this.generateToken({
      sub: user.id,
      type: 'user',
    });

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * 管理员登录
   */
  async adminLogin(dto: AdminLoginDto, ip?: string) {
    const admin = await this.adminRepository.findOne({
      where: { username: dto.username },
    });

    if (!admin) {
      throw new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND);
    }

    if (admin.status === 0) {
      throw new BusinessException(ErrorCode.USER_DISABLED);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.password);
    if (!isPasswordValid) {
      throw new BusinessException(ErrorCode.AUTH_PASSWORD_ERROR);
    }

    // 更新登录信息
    await this.adminRepository.update(admin.id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip ?? undefined,
    });

    // 签发JWT
    const token = this.generateToken({
      sub: admin.id,
      type: 'admin',
      role: admin.role,
    });

    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  /**
   * 员工登录（库管/货管）
   */
  async employeeLogin(dto: EmployeeLoginDto) {
    // 验证uniCloud token
    const uniUserInfo = await this.validateUniToken(dto.token);

    if (!uniUserInfo || !uniUserInfo.uid) {
      throw new UnauthorizedException('无效的登录凭证');
    }

    // 查找员工（通过uniId或手机号）
    let employee = await this.employeeRepository.findOne({
      where: { uniId: uniUserInfo.uid },
    });

    if (!employee && uniUserInfo.mobile) {
      employee = await this.employeeRepository.findOne({
        where: { phone: uniUserInfo.mobile },
      });
      if (employee) {
        // 绑定uniId
        await this.employeeRepository.update(employee.id, { uniId: uniUserInfo.uid });
      }
    }

    if (!employee) {
      throw new BusinessException(ErrorCode.AUTH_NOT_EMPLOYEE);
    }

    if (employee.status === 0) {
      throw new BusinessException(ErrorCode.USER_DISABLED);
    }

    // 更新最后登录时间
    await this.employeeRepository.update(employee.id, { lastLoginAt: new Date() });

    // 签发JWT
    const token = this.generateToken({
      sub: employee.id,
      type: 'employee',
      role: employee.role,
    });

    return {
      token,
      employee: {
        id: employee.id,
        name: employee.name,
        phone: employee.phone,
        role: employee.role,
      },
    };
  }

  /**
   * 获取当前用户信息
   */
  async getProfile(payload: JwtPayload) {
    if (payload.type === 'user') {
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND);
      }
      return { type: 'user', ...this.sanitizeUser(user) };
    }

    if (payload.type === 'admin') {
      const admin = await this.adminRepository.findOne({
        where: { id: payload.sub },
      });
      if (!admin) {
        throw new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND);
      }
      return {
        type: 'admin',
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
      };
    }

    if (payload.type === 'employee') {
      const employee = await this.employeeRepository.findOne({
        where: { id: payload.sub },
      });
      if (!employee) {
        throw new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND);
      }
      return {
        type: 'employee',
        id: employee.id,
        name: employee.name,
        phone: employee.phone,
        role: employee.role,
        balance: employee.balance,
        totalIncome: employee.totalIncome,
      };
    }

    throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
  }

  /**
   * 刷新Token
   */
  async refreshToken(payload: JwtPayload) {
    const token = this.generateToken({
      sub: payload.sub,
      type: payload.type,
      role: payload.role,
    });

    return { token };
  }

  /**
   * 退出登录
   */
  async logout(token: string) {
    // 将token加入黑名单
    const decoded = this.jwtService.decode(token) as JwtPayload;
    if (decoded && decoded.exp) {
      const ttl = decoded.exp * 1000 - Date.now();
      if (ttl > 0) {
        await this.cacheManager.set(`blacklist:${token}`, '1', ttl);
      }
    }
    return { message: '退出成功' };
  }

  /**
   * 验证uniCloud token
   */
  private async validateUniToken(token: string): Promise<any> {
    try {
      const spaceId = this.configService.get<string>('UNICLOUD_SPACE_ID');
      const clientSecret = this.configService.get<string>('UNICLOUD_CLIENT_SECRET');
      const requestUrl = this.configService.get<string>('UNICLOUD_REQUEST_URL');

      // 调用uniCloud验证接口
      const response = await fetch(`${requestUrl}/client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spaceId,
          method: 'serverless.auth.user.checkToken',
          params: JSON.stringify({ token }),
          clientSecret,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        return result.data;
      }

      // 开发环境模拟登录
      if (this.configService.get('app.nodeEnv') === 'development') {
        // 模拟用户数据用于测试
        return {
          uid: `dev_${Date.now()}`,
          openid: null,
          mobile: null,
          nickname: '测试用户',
          avatar: null,
        };
      }

      return null;
    } catch (error) {
      // 开发环境允许模拟登录
      if (this.configService.get('app.nodeEnv') === 'development') {
        return {
          uid: `dev_${Date.now()}`,
          openid: null,
          mobile: null,
          nickname: '测试用户',
          avatar: null,
        };
      }
      throw new UnauthorizedException('Token验证失败');
    }
  }

  /**
   * 生成JWT Token
   */
  private generateToken(payload: Partial<JwtPayload>): string {
    return this.jwtService.sign(payload as object);
  }

  /**
   * 脱敏用户信息
   */
  private sanitizeUser(user: User) {
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      phone: user.phone,
      realName: user.realName,
      isVerified: user.isVerified,
      agentLevel: user.agentLevel,
      agentStatus: user.agentStatus,
      inviteCode: user.inviteCode,
      balance: user.balance,
      totalIncome: user.totalIncome,
    };
  }
}
