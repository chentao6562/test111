import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AgentService } from './agent.service';
import { AuditAgentDto } from './dto/audit-agent.dto';
import { QueryAgentDto } from './dto/query-agent.dto';

@ApiTags('管理后台-代理商')
@Controller('admin/agent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AgentAdminController {
  constructor(private readonly agentService: AgentService) {}

  @Get('list')
  @ApiOperation({ summary: '代理商列表' })
  async getAgentList(@Query() dto: QueryAgentDto): Promise<any> {
    return this.agentService.getAgentList(dto);
  }

  @Get('tree')
  @ApiOperation({ summary: '代理商层级树' })
  async getAgentTree(): Promise<any> {
    return this.agentService.getAgentTree();
  }

  @Get(':id')
  @ApiOperation({ summary: '代理商详情' })
  async getAgentDetail(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.agentService.getAgentDetail(id);
  }

  @Put(':id/audit')
  @ApiOperation({ summary: '审核代理申请' })
  async auditAgent(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AuditAgentDto,
  ): Promise<{ message: string }> {
    await this.agentService.auditAgent(id, dto);
    return { message: dto.status === 2 ? '审核通过' : '已拒绝' };
  }

  @Put(':id/level')
  @ApiOperation({ summary: '调整代理等级' })
  async updateAgentLevel(
    @Param('id', ParseIntPipe) id: number,
    @Body('level', ParseIntPipe) level: number,
  ): Promise<{ message: string }> {
    await this.agentService.updateAgentLevel(id, level);
    return { message: '代理等级已更新' };
  }

  @Put(':id/status')
  @ApiOperation({ summary: '禁用/启用代理商' })
  async updateAgentStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status', ParseIntPipe) status: number,
  ): Promise<{ message: string }> {
    await this.agentService.updateAgentStatus(id, status);
    return { message: status === 1 ? '已启用' : '已禁用' };
  }
}
