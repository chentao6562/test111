import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ConfigService } from './config.service';
import { UpdateConfigDto, QueryConfigDto } from './dto/update-config.dto';

@ApiTags('管理后台-系统配置')
@Controller('admin/system/config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: '获取全部配置' })
  async findAll(@Query() dto: QueryConfigDto): Promise<any> {
    if (dto.group) {
      return this.configService.findByGroup(dto.group);
    }
    return this.configService.findAll();
  }

  @Get(':group')
  @ApiOperation({ summary: '按分组获取配置' })
  async findByGroup(@Param('group') group: string): Promise<any> {
    return this.configService.findByGroup(group);
  }

  @Put()
  @ApiOperation({ summary: '批量更新配置' })
  async update(@Body() dto: UpdateConfigDto): Promise<{ message: string }> {
    await this.configService.updateConfigs(dto.items);
    return { message: '更新成功' };
  }

  @Post('init')
  @ApiOperation({ summary: '初始化默认配置' })
  async initDefault(): Promise<{ message: string }> {
    await this.configService.initDefaultConfigs();
    return { message: '初始化成功' };
  }
}
