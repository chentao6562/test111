import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CommissionService } from './commission.service';
import { QueryCommissionDto } from './dto/query-commission.dto';

@ApiTags('代理商端-分润')
@Controller('commission')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Get('list')
  @ApiOperation({ summary: '分润列表' })
  async getCommissionList(
    @CurrentUser('sub') userId: number,
    @Query() dto: QueryCommissionDto,
  ): Promise<any> {
    return this.commissionService.getCommissionList(userId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: '分润统计' })
  async getCommissionStats(@CurrentUser('sub') userId: number): Promise<any> {
    return this.commissionService.getCommissionStats(userId);
  }

  @Get('balance')
  @ApiOperation({ summary: '余额信息' })
  async getBalanceInfo(@CurrentUser('sub') userId: number): Promise<any> {
    return this.commissionService.getBalanceInfo(userId);
  }
}
