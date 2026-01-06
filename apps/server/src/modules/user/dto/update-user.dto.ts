import { IsOptional, IsString, Length, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ description: '昵称', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 20, { message: '昵称长度为2-20个字符' })
  nickname?: string;

  @ApiProperty({ description: '头像URL', required: false })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: '头像必须是有效的URL' })
  avatar?: string;

  @ApiProperty({ description: '真实姓名', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 10, { message: '真实姓名长度为2-10个字符' })
  realName?: string;
}
