import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentAdminController } from './agent-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AgentController, AgentAdminController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
