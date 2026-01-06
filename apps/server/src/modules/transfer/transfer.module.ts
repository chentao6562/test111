import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferTask } from '../../database/entities/transfer-task.entity';
import { PorterIncome } from '../../database/entities/porter-income.entity';
import { Order } from '../../database/entities/order.entity';
import { TransferService } from './transfer.service';
import { PorterTaskController, PorterIncomeController } from './transfer.controller';
import { TransferWarehouseController } from './transfer-warehouse.controller';
import { TransferAdminController } from './transfer-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TransferTask, PorterIncome, Order])],
  controllers: [
    PorterTaskController,
    PorterIncomeController,
    TransferWarehouseController,
    TransferAdminController,
  ],
  providers: [TransferService],
  exports: [TransferService],
})
export class TransferModule {}
