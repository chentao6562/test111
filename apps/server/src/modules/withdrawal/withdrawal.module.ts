import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Withdrawal } from '../../database/entities/withdrawal.entity';
import { User } from '../../database/entities/user.entity';
import { PorterIncome } from '../../database/entities/porter-income.entity';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';
import { WithdrawalPorterController } from './withdrawal-porter.controller';
import { WithdrawalAdminController } from './withdrawal-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Withdrawal, User, PorterIncome])],
  controllers: [
    WithdrawalController,
    WithdrawalPorterController,
    WithdrawalAdminController,
  ],
  providers: [WithdrawalService],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
