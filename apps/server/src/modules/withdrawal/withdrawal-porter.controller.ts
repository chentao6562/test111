import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WithdrawalService } from './withdrawal.service';
import { ApplyWithdrawalDto, QueryWithdrawalDto } from './dto/apply-withdrawal.dto';

@ApiTags('货管端-提现')
@Controller('porter/withdrawal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('porter', 'admin')
@ApiBearerAuth()
export class WithdrawalPorterController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Post('apply')
  @ApiOperation({ summary: '申请提现' })
  async applyWithdrawal(
    @CurrentUser('sub') porterId: number,
    @Body() dto: ApplyWithdrawalDto,
  ): Promise<any> {
    return this.withdrawalService.porterApplyWithdrawal(porterId, dto);
  }

  @Get('list')
  @ApiOperation({ summary: '提现记录' })
  async getWithdrawalList(
    @CurrentUser('sub') porterId: number,
    @Query() dto: QueryWithdrawalDto,
  ): Promise<any> {
    return this.withdrawalService.getPorterWithdrawalList(porterId, dto);
  }
}
