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
import { CommissionService } from './commission.service';
import { AdminQueryCommissionDto, SettleCommissionDto } from './dto/query-commission.dto';

@ApiTags('管理后台-分润结算')
@Controller('admin/commission')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class CommissionAdminController {
  constructor(private readonly commissionService: CommissionService) {}

  @Get('list')
  @ApiOperation({ summary: '分润列表' })
  async getCommissionList(@Query() dto: AdminQueryCommissionDto): Promise<any> {
    return this.commissionService.getAdminCommissionList(dto);
  }

  @Get('stats')
  @ApiOperation({ summary: '分润统计' })
  async getCommissionStats(): Promise<any> {
    return this.commissionService.getAdminCommissionStats();
  }

  @Post('settle')
  @ApiOperation({ summary: '批量结算' })
  async settleCommissions(@Body() dto: SettleCommissionDto): Promise<any> {
    return this.commissionService.settleCommissions(dto);
  }
}
