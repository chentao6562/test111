import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Ip,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { UniLoginDto, AdminLoginDto, EmployeeLoginDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from './decorators/current-user.decorator';

@ApiTags('认证')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('uni-login')
  @ApiOperation({ summary: 'uniCloud登录（小程序端）' })
  async uniLogin(@Body() dto: UniLoginDto) {
    return this.authService.uniLogin(dto);
  }

  @Public()
  @Post('admin/login')
  @ApiOperation({ summary: '管理员登录' })
  async adminLogin(@Body() dto: AdminLoginDto, @Ip() ip: string) {
    return this.authService.adminLogin(dto, ip);
  }

  @Public()
  @Post('employee/login')
  @ApiOperation({ summary: '员工登录（库管/货管）' })
  async employeeLogin(@Body() dto: EmployeeLoginDto) {
    return this.authService.employeeLogin(dto);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user);
  }

  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: '刷新Token' })
  async refreshToken(@CurrentUser() user: JwtPayload) {
    return this.authService.refreshToken(user);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: '退出登录' })
  async logout(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    return this.authService.logout(token);
  }
}
