import {
  Controller,
  Get,
  Post,
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
import { WarehouseService } from './warehouse.service';

@ApiTags('库管端')
@Controller('warehouse')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('warehouse', 'admin')
@ApiBearerAuth()
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '工作台统计' })
  async getDashboard(): Promise<any> {
    return this.warehouseService.getDashboard();
  }

  @Get('order/verify/:code')
  @ApiOperation({ summary: '根据提货码查询订单' })
  async verifyOrderByCode(@Param('code') code: string): Promise<any> {
    return this.warehouseService.verifyOrderByCode(code);
  }

  @Post('order/pickup/:id')
  @ApiOperation({ summary: '确认提货核销' })
  async confirmPickup(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') operatorId: number,
  ): Promise<{ message: string }> {
    await this.warehouseService.confirmPickup(id, operatorId);
    return { message: '核销成功' };
  }

  @Get('prepare/list')
  @ApiOperation({ summary: '备货任务列表' })
  async getPrepareList(@Query('status') status?: number): Promise<any> {
    return this.warehouseService.getPrepareList(status ? Number(status) : undefined);
  }

  @Post('prepare/:id')
  @ApiOperation({ summary: '更新备货状态' })
  async updatePrepareStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('action') action: string,
    @CurrentUser('sub') operatorId: number,
  ): Promise<{ message: string }> {
    await this.warehouseService.updatePrepareStatus(id, action, operatorId);
    return { message: '操作成功' };
  }
}
