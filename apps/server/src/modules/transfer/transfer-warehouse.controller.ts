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
import { CreateTransferDto, AssignTransferDto } from './dto/create-transfer.dto';
import { QueryTransferDto } from './dto/query-transfer.dto';

@ApiTags('库管端-移库任务')
@Controller('warehouse/transfer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('warehouse', 'admin')
@ApiBearerAuth()
export class TransferWarehouseController {
  constructor(private readonly transferService: TransferService) {}

  @Post('create')
  @ApiOperation({ summary: '创建移库任务' })
  async createTask(
    @Body() dto: CreateTransferDto,
    @CurrentUser('sub') operatorId: number,
  ): Promise<any> {
    return this.transferService.createTask(dto, operatorId);
  }

  @Get('list')
  @ApiOperation({ summary: '移库任务列表' })
  async getTaskList(@Query() dto: QueryTransferDto): Promise<any> {
    return this.transferService.getTaskList(dto);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: '指派任务' })
  async assignTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTransferDto,
  ): Promise<{ message: string }> {
    await this.transferService.assignTask(id, dto);
    return { message: '指派成功' };
  }
}
