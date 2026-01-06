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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WithdrawalService } from './withdrawal.service';
import { ApplyWithdrawalDto, QueryWithdrawalDto } from './dto/apply-withdrawal.dto';

@ApiTags('代理商端-提现')
@Controller('withdrawal')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Post('apply')
  @ApiOperation({ summary: '申请提现' })
  async applyWithdrawal(
    @CurrentUser('sub') userId: number,
    @Body() dto: ApplyWithdrawalDto,
  ): Promise<any> {
    return this.withdrawalService.applyWithdrawal(userId, dto);
  }

  @Get('list')
  @ApiOperation({ summary: '提现记录' })
  async getWithdrawalList(
    @CurrentUser('sub') userId: number,
    @Query() dto: QueryWithdrawalDto,
  ): Promise<any> {
    return this.withdrawalService.getUserWithdrawalList(userId, dto);
  }
}
