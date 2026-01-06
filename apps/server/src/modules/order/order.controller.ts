import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { OrderService } from './order.service';
import { CreateOrderDto, QueryOrderDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('订单')
@ApiBearerAuth()
@Controller('order')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: '创建订单' })
  async createOrder(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(user.sub, dto);
  }

  @Get('list')
  @ApiOperation({ summary: '获取订单列表' })
  async getOrderList(
    @CurrentUser() user: JwtPayload,
    @Query() dto: QueryOrderDto,
  ) {
    return this.orderService.getOrderList(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取订单详情' })
  @ApiParam({ name: 'id', description: '订单ID' })
  async getOrderDetail(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.getOrderDetail(user.sub, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消订单' })
  @ApiParam({ name: 'id', description: '订单ID' })
  async cancelOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    return this.orderService.cancelOrder(user.sub, id, reason);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: '模拟支付(开发环境)' })
  @ApiParam({ name: 'id', description: '订单ID' })
  async payOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.payOrder(user.sub, id);
  }
}
