import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../database/entities/employee.entity';
import { BusinessException } from '../../common/filters/business.exception';
import { ErrorCode } from '../../common/utils/error-code.enum';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  QueryEmployeeDto,
} from './dto/create-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    // 检查手机号是否已存在
    const exists = await this.employeeRepo.findOne({
      where: { phone: dto.phone },
    });
    if (exists) {
      throw new BusinessException(ErrorCode.PARAM_ERROR, '手机号已存在');
    }

    const employee = this.employeeRepo.create(dto);
    return this.employeeRepo.save(employee);
  }

  async findAll(dto: QueryEmployeeDto): Promise<{ list: Employee[]; total: number }> {
    const page = dto.page || 1;
    const pageSize = dto.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const qb = this.employeeRepo.createQueryBuilder('employee');

    if (dto.role) {
      qb.andWhere('employee.role = :role', { role: dto.role });
    }

    if (dto.status !== undefined) {
      qb.andWhere('employee.status = :status', { status: dto.status });
    }

    if (dto.keyword) {
      qb.andWhere('(employee.name LIKE :keyword OR employee.phone LIKE :keyword)', {
        keyword: `%${dto.keyword}%`,
      });
    }

    qb.orderBy('employee.createdAt', 'DESC');
    qb.skip(skip).take(pageSize);

    const [list, total] = await qb.getManyAndCount();

    return { list, total };
  }

  async findOne(id: number): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({ where: { id } });
    if (!employee) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '员工不存在');
    }
    return employee;
  }

  async update(id: number, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({ where: { id } });
    if (!employee) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '员工不存在');
    }

    // 如果修改手机号，检查是否已存在
    if (dto.phone && dto.phone !== employee.phone) {
      const exists = await this.employeeRepo.findOne({
        where: { phone: dto.phone },
      });
      if (exists) {
        throw new BusinessException(ErrorCode.PARAM_ERROR, '手机号已存在');
      }
    }

    Object.assign(employee, dto);
    return this.employeeRepo.save(employee);
  }

  async remove(id: number): Promise<void> {
    const employee = await this.employeeRepo.findOne({ where: { id } });
    if (!employee) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '员工不存在');
    }

    // 检查员工是否有未完成的任务或未结算的收入
    if (employee.role === 'porter') {
      const balance = parseFloat(employee.balance || '0');
      const frozen = parseFloat(employee.frozenAmount || '0');
      if (balance > 0 || frozen > 0) {
        throw new BusinessException(ErrorCode.FORBIDDEN, '该员工有未结算的收入，无法删除');
      }
    }

    await this.employeeRepo.remove(employee);
  }

  async getStats(): Promise<{
    total: number;
    warehouseCount: number;
    porterCount: number;
    activeCount: number;
  }> {
    const total = await this.employeeRepo.count();
    const warehouseCount = await this.employeeRepo.count({
      where: { role: 'warehouse' },
    });
    const porterCount = await this.employeeRepo.count({
      where: { role: 'porter' },
    });
    const activeCount = await this.employeeRepo.count({
      where: { status: 1 },
    });

    return { total, warehouseCount, porterCount, activeCount };
  }
}
