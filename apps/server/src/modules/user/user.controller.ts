import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { UserService } from './user.service';
import { UpdateUserDto, VerifyUserDto, CreateAddressDto, UpdateAddressDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('用户')
@ApiBearerAuth()
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('info')
  @ApiOperation({ summary: '获取用户信息' })
  async getUserInfo(@CurrentUser() user: JwtPayload) {
    return this.userService.getUserInfo(user.sub);
  }

  @Put('info')
  @ApiOperation({ summary: '更新用户信息' })
  async updateUserInfo(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.updateUserInfo(user.sub, dto);
  }

  @Post('verify')
  @ApiOperation({ summary: '实名认证' })
  async verifyUser(
    @CurrentUser() user: JwtPayload,
    @Body() dto: VerifyUserDto,
  ) {
    return this.userService.verifyUser(user.sub, dto);
  }

  @Get('address')
  @ApiOperation({ summary: '获取地址列表' })
  async getAddressList(@CurrentUser() user: JwtPayload) {
    return this.userService.getAddressList(user.sub);
  }

  @Post('address')
  @ApiOperation({ summary: '添加地址' })
  async createAddress(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAddressDto,
  ) {
    return this.userService.createAddress(user.sub, dto);
  }

  @Put('address/:id')
  @ApiOperation({ summary: '更新地址' })
  @ApiParam({ name: 'id', description: '地址ID' })
  async updateAddress(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.userService.updateAddress(user.sub, id, dto);
  }

  @Delete('address/:id')
  @ApiOperation({ summary: '删除地址' })
  @ApiParam({ name: 'id', description: '地址ID' })
  async deleteAddress(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.userService.deleteAddress(user.sub, id);
  }

  @Put('address/:id/default')
  @ApiOperation({ summary: '设为默认地址' })
  @ApiParam({ name: 'id', description: '地址ID' })
  async setDefaultAddress(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.userService.setDefaultAddress(user.sub, id);
  }
}
