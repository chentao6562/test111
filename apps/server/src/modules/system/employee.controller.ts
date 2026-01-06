import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EmployeeService } from './employee.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  QueryEmployeeDto,
} from './dto/create-employee.dto';

@ApiTags('管理后台-员工管理')
@Controller('admin/system/employee')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @ApiOperation({ summary: '创建员工' })
  async create(@Body() dto: CreateEmployeeDto): Promise<any> {
    const employee = await this.employeeService.create(dto);
    return { id: employee.id };
  }

  @Get('list')
  @ApiOperation({ summary: '员工列表' })
  async findAll(@Query() dto: QueryEmployeeDto): Promise<any> {
    return this.employeeService.findAll(dto);
  }

  @Get('stats')
  @ApiOperation({ summary: '员工统计' })
  async getStats(): Promise<any> {
    return this.employeeService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '员工详情' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.employeeService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新员工' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<any> {
    return this.employeeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除员工' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.employeeService.remove(id);
    return { message: '删除成功' };
  }
}
