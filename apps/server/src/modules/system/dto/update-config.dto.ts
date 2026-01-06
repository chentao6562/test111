import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ConfigItemDto {
  @ApiProperty({ description: '配置键', example: 'site_name' })
  @IsString({ message: '配置键必须是字符串' })
  key!: string;

  @ApiProperty({ description: '配置值', example: '蒙庆烟花' })
  @IsString({ message: '配置值必须是字符串' })
  value!: string;
}

export class UpdateConfigDto {
  @ApiProperty({ description: '配置项列表', type: [ConfigItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigItemDto)
  items!: ConfigItemDto[];
}

export class QueryConfigDto {
  @ApiPropertyOptional({ description: '配置分组', example: 'basic' })
  @IsOptional()
  @IsString()
  group?: string;
}
