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
import { AdminService } from './admin.service';
import {
  CreateAdminDto,
  UpdateAdminDto,
  QueryAdminDto,
  ChangePasswordDto,
} from './dto/create-admin.dto';

@ApiTags('管理后台-管理员管理')
@Controller('admin/system/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @ApiOperation({ summary: '创建管理员' })
  async create(@Body() dto: CreateAdminDto): Promise<any> {
    const admin = await this.adminService.create(dto);
    return { id: admin.id };
  }

  @Get('list')
  @ApiOperation({ summary: '管理员列表' })
  async findAll(@Query() dto: QueryAdminDto): Promise<any> {
    return this.adminService.findAll(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '管理员详情' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.adminService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新管理员' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminDto,
  ): Promise<any> {
    return this.adminService.update(id, dto);
  }

  @Put(':id/password')
  @ApiOperation({ summary: '修改密码' })
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.adminService.changePassword(id, dto);
    return { message: '密码修改成功' };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除管理员' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.adminService.remove(id);
    return { message: '删除成功' };
  }
}
