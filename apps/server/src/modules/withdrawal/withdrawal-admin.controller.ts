import {
  Controller,
  Get,
  Put,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WithdrawalService } from './withdrawal.service';
import { AuditWithdrawalDto, AdminQueryWithdrawalDto } from './dto/apply-withdrawal.dto';

@ApiTags('管理后台-提现')
@Controller('admin/withdrawal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class WithdrawalAdminController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Get('list')
  @ApiOperation({ summary: '提现列表' })
  async getWithdrawalList(@Query() dto: AdminQueryWithdrawalDto): Promise<any> {
    return this.withdrawalService.getAdminWithdrawalList(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '提现详情' })
  async getWithdrawalDetail(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.withdrawalService.getWithdrawalDetail(id);
  }

  @Put(':id/audit')
  @ApiOperation({ summary: '审核提现' })
  async auditWithdrawal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AuditWithdrawalDto,
    @CurrentUser('sub') auditorId: number,
  ): Promise<{ message: string }> {
    await this.withdrawalService.auditWithdrawal(id, dto, auditorId);
    return { message: '审核成功' };
  }

  @Put(':id/complete')
  @ApiOperation({ summary: '完成提现' })
  async completeWithdrawal(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.withdrawalService.completeWithdrawal(id);
    return { message: '已完成' };
  }
}
