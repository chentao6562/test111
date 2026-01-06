import { IsOptional, IsString, IsBoolean, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAddressDto {
  @ApiProperty({ description: '联系人', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 20, { message: '联系人长度为2-20个字符' })
  name?: string;

  @ApiProperty({ description: '手机号', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @ApiProperty({ description: '省份', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 20, { message: '省份长度为2-20个字符' })
  province?: string;

  @ApiProperty({ description: '城市', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 20, { message: '城市长度为2-20个字符' })
  city?: string;

  @ApiProperty({ description: '区县', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 20, { message: '区县长度为2-20个字符' })
  district?: string;

  @ApiProperty({ description: '详细地址', required: false })
  @IsOptional()
  @IsString()
  @Length(5, 200, { message: '详细地址长度为5-200个字符' })
  detail?: string;

  @ApiProperty({ description: '是否默认', required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
