import { IsString, IsOptional, IsIn, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ description: '姓名', example: '王五' })
  @IsString({ message: '姓名必须是字符串' })
  @Length(2, 32, { message: '姓名长度为2-32个字符' })
  name!: string;

  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;

  @ApiProperty({ description: '角色 warehouse库管 porter货管', example: 'warehouse' })
  @IsIn(['warehouse', 'porter'], { message: '角色必须是warehouse或porter' })
  role!: 'warehouse' | 'porter';
}

export class UpdateEmployeeDto {
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

  @ApiPropertyOptional({ description: '角色 warehouse库管 porter货管', example: 'porter' })
  @IsOptional()
  @IsIn(['warehouse', 'porter'], { message: '角色必须是warehouse或porter' })
  role?: 'warehouse' | 'porter';

  @ApiPropertyOptional({ description: '状态 0禁用 1正常', example: 1 })
  @IsOptional()
  @IsIn([0, 1], { message: '状态值无效' })
  status?: number;
}

export class QueryEmployeeDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 20 })
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ description: '角色', example: 'warehouse' })
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ description: '状态', example: 1 })
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({ description: '关键词搜索', example: '张三' })
  @IsOptional()
  keyword?: string;
}
