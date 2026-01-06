import {
  Controller,
  Get,
  Put,
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
import { TransferService } from './transfer.service';
import { QueryTransferDto } from './dto/query-transfer.dto';
import { AssignTransferDto } from './dto/create-transfer.dto';

@ApiTags('管理后台-移库任务')
@Controller('admin/transfer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class TransferAdminController {
  constructor(private readonly transferService: TransferService) {}

  @Get('list')
  @ApiOperation({ summary: '移库任务列表' })
  async getTaskList(@Query() dto: QueryTransferDto): Promise<any> {
    return this.transferService.getTaskList(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '任务详情' })
  async getTaskDetail(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.transferService.getTaskDetail(id);
  }

  @Put(':id/assign')
  @ApiOperation({ summary: '指派任务' })
  async assignTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTransferDto,
  ): Promise<{ message: string }> {
    await this.transferService.assignTask(id, dto);
    return { message: '指派成功' };
  }

  @Post('settle')
  @ApiOperation({ summary: '批量结算' })
  async settleTasks(@Body('taskIds') taskIds: number[]): Promise<any> {
    return this.transferService.settleTasks(taskIds);
  }
}
