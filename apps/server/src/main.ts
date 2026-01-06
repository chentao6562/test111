import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters';
import { TransformInterceptor } from './common/interceptors';
import { ValidationPipe } from './common/pipes';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 获取配置服务
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;
  const nodeEnv = configService.get<string>('app.nodeEnv') || 'development';

  // 设置全局前缀
  app.setGlobalPrefix('api');

  // 注册全局管道
  app.useGlobalPipes(new ValidationPipe());

  // 注册全局拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  // 注册全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS配置
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Swagger文档配置 (仅开发环境)
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('蒙庆烟花API')
      .setDescription('蒙庆烟花B2B代理商订货系统API文档')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: '请输入JWT Token',
          in: 'header',
        },
        'access-token',
      )
      .addTag('健康检查', '系统健康状态检查')
      .addTag('认证', '登录、登出、Token刷新')
      .addTag('用户', '用户信息管理')
      .addTag('商品', '商品查询')
      .addTag('分类', '商品分类')
      .addTag('订单', '订单管理')
      .addTag('代理商', '代理商相关')
      .addTag('分润', '分润与提现')
      .addTag('库管', '库管端接口')
      .addTag('货管', '货管端接口')
      .addTag('管理后台', '管理后台接口')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(`Swagger文档已启用: http://localhost:${port}/api-docs`);
  }

  await app.listen(port);
  logger.log(`应用启动成功，监听端口: ${port}`);
  logger.log(`环境: ${nodeEnv}`);
}

bootstrap();
