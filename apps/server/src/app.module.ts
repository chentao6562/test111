import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';

import configs from './config';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ProductModule } from './modules/product/product.module';
import { OrderModule } from './modules/order/order.module';
import { AgentModule } from './modules/agent/agent.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { TransferModule } from './modules/transfer/transfer.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { WithdrawalModule } from './modules/withdrawal/withdrawal.module';
import { SystemModule } from './modules/system/system.module';
import { UploadModule } from './modules/upload/upload.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      envFilePath: ['.env', '.env.local'],
    }),

    // 数据库模块
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('app.nodeEnv') !== 'production',
        logging: configService.get<string>('app.nodeEnv') === 'development',
        charset: 'utf8mb4',
        timezone: '+08:00',
      }),
    }),

    // 缓存模块 - 使用内存缓存 (生产环境可切换到Redis)
    CacheModule.register({
      isGlobal: true,
      ttl: 3600, // 默认缓存1小时
      max: 100, // 最大缓存条目数
    }),

    // 业务模块
    HealthModule,
    AuthModule,
    UserModule,
    ProductModule,
    OrderModule,
    AgentModule,
    InventoryModule,
    TransferModule,
    SettlementModule,
    WithdrawalModule,
    SystemModule,
    UploadModule,
    DashboardModule,
    WarehouseModule,
  ],
})
export class AppModule {}
