import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../../database/entities/admin.entity';
import { Employee } from '../../database/entities/employee.entity';
import { Config } from '../../database/entities/config.entity';
import { AdminService } from './admin.service';
import { EmployeeService } from './employee.service';
import { ConfigService } from './config.service';
import { AdminController } from './admin.controller';
import { EmployeeController } from './employee.controller';
import { ConfigController } from './config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, Employee, Config])],
  controllers: [AdminController, EmployeeController, ConfigController],
  providers: [AdminService, EmployeeService, ConfigService],
  exports: [AdminService, EmployeeService, ConfigService],
})
export class SystemModule {}
