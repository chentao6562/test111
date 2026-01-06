import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('管理后台-数据统计')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: '今日概览' })
  async getStats(): Promise<any> {
    return this.dashboardService.getStats();
  }

  @Get('chart')
  @ApiOperation({ summary: '趋势图表' })
  @ApiQuery({ name: 'days', required: false, description: '天数', example: 7 })
  async getChart(@Query('days') days?: number): Promise<any> {
    return this.dashboardService.getChartData(days || 7);
  }

  @Get('todos')
  @ApiOperation({ summary: '待办事项' })
  async getTodos(): Promise<any> {
    return this.dashboardService.getTodos();
  }
}

@ApiTags('管理后台-报表')
@Controller('admin/report')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class ReportController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('sales')
  @ApiOperation({ summary: '销售报表' })
  @ApiQuery({ name: 'startDate', required: true, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2024-01-31' })
  async getSalesReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<any> {
    return this.dashboardService.getSalesReport(startDate, endDate);
  }

  @Get('agent')
  @ApiOperation({ summary: '代理业绩报表' })
  @ApiQuery({ name: 'startDate', required: true, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2024-01-31' })
  async getAgentReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<any> {
    return this.dashboardService.getAgentReport(startDate, endDate);
  }

  @Get('product')
  @ApiOperation({ summary: '商品分析' })
  @ApiQuery({ name: 'startDate', required: true, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2024-01-31' })
  async getProductReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<any> {
    return this.dashboardService.getProductReport(startDate, endDate);
  }
}
