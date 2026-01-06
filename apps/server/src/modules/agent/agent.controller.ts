import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AgentService } from './agent.service';
import { ApplyAgentDto } from './dto/apply-agent.dto';

@ApiTags('代理商')
@Controller('agent')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('apply')
  @ApiOperation({ summary: '申请成为代理商' })
  async applyAgent(
    @CurrentUser('sub') userId: number,
    @Body() dto: ApplyAgentDto,
  ): Promise<{ message: string }> {
    await this.agentService.applyAgent(userId, dto);
    return { message: '申请已提交，请等待审核' };
  }

  @Get('info')
  @ApiOperation({ summary: '获取代理信息' })
  async getAgentInfo(@CurrentUser('sub') userId: number): Promise<any> {
    return this.agentService.getAgentInfo(userId);
  }

  @Get('qrcode')
  @ApiOperation({ summary: '获取推广码' })
  async getQrcode(@CurrentUser('sub') userId: number): Promise<any> {
    return this.agentService.getQrcode(userId);
  }

  @Get('team')
  @ApiOperation({ summary: '我的团队' })
  async getTeam(
    @CurrentUser('sub') userId: number,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<any> {
    return this.agentService.getTeam(userId, page || 1, pageSize || 20);
  }

  @Get('team/stats')
  @ApiOperation({ summary: '团队统计' })
  async getTeamStats(@CurrentUser('sub') userId: number): Promise<any> {
    return this.agentService.getTeamStats(userId);
  }

  @Get('invites')
  @ApiOperation({ summary: '邀请记录' })
  async getInvites(
    @CurrentUser('sub') userId: number,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<any> {
    return this.agentService.getInvites(userId, page || 1, pageSize || 20);
  }
}
