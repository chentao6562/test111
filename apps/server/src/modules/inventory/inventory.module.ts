import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../database/entities/product.entity';
import { StockLog } from '../../database/entities/stock-log.entity';
import { Purchase } from '../../database/entities/purchase.entity';
import { PurchaseItem } from '../../database/entities/purchase-item.entity';
import { InventoryService } from './inventory.service';
import { InventoryController, InboundController } from './inventory.controller';
import { InventoryAdminController, PurchaseAdminController } from './inventory-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product, StockLog, Purchase, PurchaseItem])],
  controllers: [
    InventoryController,
    InboundController,
    InventoryAdminController,
    PurchaseAdminController,
  ],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
