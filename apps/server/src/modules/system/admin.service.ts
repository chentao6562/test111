import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Admin } from '../../database/entities/admin.entity';
import { BusinessException } from '../../common/filters/business.exception';
import { ErrorCode } from '../../common/utils/error-code.enum';
import {
  CreateAdminDto,
  UpdateAdminDto,
  QueryAdminDto,
  ChangePasswordDto,
} from './dto/create-admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
  ) {}

  async create(dto: CreateAdminDto): Promise<Admin> {
    // 检查用户名是否已存在
    const exists = await this.adminRepo.findOne({
      where: { username: dto.username },
    });
    if (exists) {
      throw new BusinessException(ErrorCode.PARAM_ERROR, '用户名已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const admin = this.adminRepo.create({
      ...dto,
      password: hashedPassword,
    });

    return this.adminRepo.save(admin);
  }

  async findAll(dto: QueryAdminDto): Promise<{ list: Admin[]; total: number }> {
    const page = dto.page || 1;
    const pageSize = dto.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const qb = this.adminRepo.createQueryBuilder('admin');

    if (dto.role) {
      qb.andWhere('admin.role = :role', { role: dto.role });
    }

    if (dto.status !== undefined) {
      qb.andWhere('admin.status = :status', { status: dto.status });
    }

    if (dto.keyword) {
      qb.andWhere('(admin.username LIKE :keyword OR admin.name LIKE :keyword OR admin.phone LIKE :keyword)', {
        keyword: `%${dto.keyword}%`,
      });
    }

    qb.orderBy('admin.createdAt', 'DESC');
    qb.skip(skip).take(pageSize);

    const [list, total] = await qb.getManyAndCount();

    // 移除密码字段
    const safeList = list.map((admin) => {
      const { password, ...rest } = admin;
      return rest as Admin;
    });

    return { list: safeList, total };
  }

  async findOne(id: number): Promise<Admin> {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '管理员不存在');
    }
    const { password, ...rest } = admin;
    return rest as Admin;
  }

  async update(id: number, dto: UpdateAdminDto): Promise<Admin> {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '管理员不存在');
    }

    // 超级管理员不能被禁用
    if (admin.role === 1 && dto.status === 0) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '不能禁用超级管理员');
    }

    // 超级管理员角色不能被修改
    if (admin.role === 1 && dto.role && dto.role !== 1) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '不能修改超级管理员角色');
    }

    Object.assign(admin, dto);
    await this.adminRepo.save(admin);

    const { password, ...rest } = admin;
    return rest as Admin;
  }

  async changePassword(id: number, dto: ChangePasswordDto): Promise<void> {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '管理员不存在');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    admin.password = hashedPassword;
    await this.adminRepo.save(admin);
  }

  async remove(id: number): Promise<void> {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '管理员不存在');
    }

    // 超级管理员不能被删除
    if (admin.role === 1) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '不能删除超级管理员');
    }

    await this.adminRepo.remove(admin);
  }
}
