import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommissionRuleService } from './commission-rule.service';
import {
  CreateCommissionRuleDto,
  UpdateCommissionRuleDto,
  QueryCommissionRuleDto,
} from './dto/commission-rule.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('管理后台-分润规则')
@ApiBearerAuth()
@Controller('admin/commission-rule')
@Roles('admin')
export class CommissionRuleController {
  constructor(private readonly ruleService: CommissionRuleService) {}

  @Post()
  @ApiOperation({ summary: '创建分润规则' })
  async create(@Body() dto: CreateCommissionRuleDto) {
    const rule = await this.ruleService.create(dto);
    return rule;
  }

  @Get('list')
  @ApiOperation({ summary: '获取分润规则列表' })
  async findAll(@Query() dto: QueryCommissionRuleDto) {
    return this.ruleService.findAll(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取分润规则详情' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ruleService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新分润规则' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommissionRuleDto,
  ) {
    return this.ruleService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除分润规则' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.ruleService.delete(id);
    return { message: '删除成功' };
  }
}
