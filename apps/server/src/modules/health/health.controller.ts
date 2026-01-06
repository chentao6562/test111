import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { HealthService } from './health.service';

@ApiTags('健康检查')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '健康检查' })
  check() {
    return this.healthService.check();
  }

  @Get('db')
  @Public()
  @ApiOperation({ summary: '数据库连接检查' })
  checkDb() {
    return this.healthService.checkDatabase();
  }

  @Get('cache')
  @Public()
  @ApiOperation({ summary: '缓存连接检查' })
  checkCache() {
    return this.healthService.checkCache();
  }
}
