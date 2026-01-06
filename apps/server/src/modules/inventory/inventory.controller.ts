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
import { InventoryService } from './inventory.service';
import { QueryStockDto } from './dto/query-stock.dto';
import { CreateInboundDto } from './dto/create-inbound.dto';

@ApiTags('库管端-库存')
@Controller('warehouse/stock')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('warehouse', 'admin')
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('list')
  @ApiOperation({ summary: '库存列表' })
  async getStockList(@Query() dto: QueryStockDto): Promise<any> {
    return this.inventoryService.getStockList(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '库存详情' })
  async getStockDetail(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.inventoryService.getStockDetail(id);
  }
}

@ApiTags('库管端-入库')
@Controller('warehouse/inbound')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('warehouse', 'admin')
@ApiBearerAuth()
export class InboundController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @ApiOperation({ summary: '创建入库单' })
  async createInbound(
    @Body() dto: CreateInboundDto,
    @CurrentUser('sub') operatorId: number,
  ): Promise<any> {
    return this.inventoryService.createInbound(dto, operatorId);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: '确认入库' })
  async confirmInbound(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') operatorId: number,
  ): Promise<{ message: string }> {
    await this.inventoryService.confirmInbound(id, operatorId);
    return { message: '入库成功' };
  }

  @Get('list')
  @ApiOperation({ summary: '入库单列表' })
  async getInboundList(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<any> {
    return this.inventoryService.getInboundList(page || 1, pageSize || 20);
  }
}
