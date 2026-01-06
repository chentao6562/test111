import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commission } from '../../database/entities/commission.entity';
import { CommissionRule } from '../../database/entities/commission-rule.entity';
import { User } from '../../database/entities/user.entity';
import { Order } from '../../database/entities/order.entity';
import { CommissionService } from './commission.service';
import { CommissionRuleService } from './commission-rule.service';
import { CommissionController } from './commission.controller';
import { CommissionAdminController } from './commission-admin.controller';
import { CommissionRuleController } from './commission-rule.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Commission, CommissionRule, User, Order])],
  controllers: [CommissionController, CommissionAdminController, CommissionRuleController],
  providers: [CommissionService, CommissionRuleService],
  exports: [CommissionService, CommissionRuleService],
})
export class SettlementModule {}
