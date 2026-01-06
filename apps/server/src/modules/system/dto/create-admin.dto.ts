import { IsString, IsOptional, IsIn, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ description: '用户名', example: 'admin01' })
  @IsString({ message: '用户名必须是字符串' })
  @Length(3, 32, { message: '用户名长度为3-32个字符' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字、下划线' })
  username!: string;

  @ApiProperty({ description: '密码', example: 'Admin@123456' })
  @IsString({ message: '密码必须是字符串' })
  @Length(6, 32, { message: '密码长度为6-32个字符' })
  password!: string;

  @ApiProperty({ description: '姓名', example: '张三' })
  @IsString({ message: '姓名必须是字符串' })
  @Length(2, 32, { message: '姓名长度为2-32个字符' })
  name!: string;

  @ApiPropertyOptional({ description: '手机号', example: '13800138000' })
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @ApiProperty({ description: '角色 1超管 2运营 3财务', example: 2 })
  @IsIn([1, 2, 3], { message: '角色值无效' })
  role!: number;
}

export class UpdateAdminDto {
  @ApiPropertyOptional({ description: '姓名', example: '李四' })
  @IsOptional()
  @IsString({ message: '姓名必须是字符串' })
  @Length(2, 32, { message: '姓名长度为2-32个字符' })
  name?: string;

  @ApiPropertyOptional({ description: '手机号', example: '13900139000' })
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @ApiPropertyOptional({ description: '角色 1超管 2运营 3财务', example: 2 })
  @IsOptional()
  @IsIn([1, 2, 3], { message: '角色值无效' })
  role?: number;

  @ApiPropertyOptional({ description: '状态 0禁用 1正常', example: 1 })
  @IsOptional()
  @IsIn([0, 1], { message: '状态值无效' })
  status?: number;
}

export class ChangePasswordDto {
  @ApiProperty({ description: '新密码', example: 'NewPassword@123' })
  @IsString({ message: '密码必须是字符串' })
  @Length(6, 32, { message: '密码长度为6-32个字符' })
  password!: string;
}

export class QueryAdminDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 20 })
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ description: '角色', example: 2 })
  @IsOptional()
  role?: number;

  @ApiPropertyOptional({ description: '状态', example: 1 })
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({ description: '关键词搜索', example: '张三' })
  @IsOptional()
  keyword?: string;
}
