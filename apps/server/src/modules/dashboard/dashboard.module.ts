import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../database/entities/order.entity';
import { User } from '../../database/entities/user.entity';
import { Product } from '../../database/entities/product.entity';
import { Commission } from '../../database/entities/commission.entity';
import { Withdrawal } from '../../database/entities/withdrawal.entity';
import { TransferTask } from '../../database/entities/transfer-task.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController, ReportController } from './dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      User,
      Product,
      Commission,
      Withdrawal,
      TransferTask,
    ]),
  ],
  controllers: [DashboardController, ReportController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
