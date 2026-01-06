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
import { TransferService } from './transfer.service';

@ApiTags('货管端-移库任务')
@Controller('porter/task')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('porter', 'admin')
@ApiBearerAuth()
export class PorterTaskController {
  constructor(private readonly transferService: TransferService) {}

  @Get('pending')
  @ApiOperation({ summary: '待接单任务列表' })
  async getPendingTasks(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<any> {
    return this.transferService.getPendingTasks(page || 1, pageSize || 20);
  }

  @Get('doing')
  @ApiOperation({ summary: '进行中任务列表' })
  async getDoingTasks(
    @CurrentUser('sub') porterId: number,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<any> {
    return this.transferService.getDoingTasks(porterId, page || 1, pageSize || 20);
  }

  @Get('done')
  @ApiOperation({ summary: '已完成任务列表' })
  async getDoneTasks(
    @CurrentUser('sub') porterId: number,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<any> {
    return this.transferService.getDoneTasks(porterId, page || 1, pageSize || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: '任务详情' })
  async getTaskDetail(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.transferService.getTaskDetail(id);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: '接单' })
  async acceptTask(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') porterId: number,
  ): Promise<{ message: string }> {
    await this.transferService.acceptTask(id, porterId);
    return { message: '接单成功' };
  }

  @Post(':id/pick')
  @ApiOperation({ summary: '确认取货' })
  async pickTask(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') porterId: number,
  ): Promise<{ message: string }> {
    await this.transferService.pickTask(id, porterId);
    return { message: '取货确认成功' };
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '完成任务' })
  async completeTask(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') porterId: number,
  ): Promise<{ message: string }> {
    await this.transferService.completeTask(id, porterId);
    return { message: '任务完成' };
  }
}

@ApiTags('货管端-收入')
@Controller('porter/income')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('porter', 'admin')
@ApiBearerAuth()
export class PorterIncomeController {
  constructor(private readonly transferService: TransferService) {}

  @Get()
  @ApiOperation({ summary: '收入统计' })
  async getIncomeStats(@CurrentUser('sub') porterId: number): Promise<any> {
    return this.transferService.getIncomeStats(porterId);
  }

  @Get('list')
  @ApiOperation({ summary: '收入明细' })
  async getIncomeList(
    @CurrentUser('sub') porterId: number,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<any> {
    return this.transferService.getIncomeList(porterId, page || 1, pageSize || 20);
  }
}
