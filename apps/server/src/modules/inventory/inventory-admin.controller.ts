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
import { InventoryService } from './inventory.service';
import { QueryStockDto, QueryStockLogDto } from './dto/query-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@ApiTags('管理后台-库存')
@Controller('admin/inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class InventoryAdminController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('overview')
  @ApiOperation({ summary: '库存概览' })
  async getOverview(): Promise<any> {
    return this.inventoryService.getInventoryOverview();
  }

  @Get('list')
  @ApiOperation({ summary: '库存列表' })
  async getList(@Query() dto: QueryStockDto): Promise<any> {
    return this.inventoryService.getStockList(dto);
  }

  @Get('logs')
  @ApiOperation({ summary: '库存流水' })
  async getLogs(@Query() dto: QueryStockLogDto): Promise<any> {
    return this.inventoryService.getStockLogs(dto);
  }

  @Get('warning')
  @ApiOperation({ summary: '库存预警' })
  async getWarning(): Promise<any> {
    return this.inventoryService.getWarningList();
  }

  @Get(':id')
  @ApiOperation({ summary: '库存详情' })
  async getDetail(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.inventoryService.getStockDetail(id);
  }

  @Put(':id/adjust')
  @ApiOperation({ summary: '库存调整' })
  async adjust(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustStockDto,
    @CurrentUser('sub') operatorId: number,
  ): Promise<{ message: string }> {
    await this.inventoryService.adjustStock(id, dto, operatorId);
    return { message: '库存调整成功' };
  }
}

@ApiTags('管理后台-进货管理')
@Controller('admin/purchase')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class PurchaseAdminController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('list')
  @ApiOperation({ summary: '进货单列表' })
  async getList(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<any> {
    return this.inventoryService.getInboundList(page || 1, pageSize || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: '进货单详情' })
  async getDetail(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.inventoryService.getPurchaseDetail(id);
  }
}
