import { IsOptional, IsInt, IsString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryProductDto {
  @ApiProperty({ description: '分类ID', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiProperty({ description: '搜索关键词', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '是否热销 0否 1是', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  isHot?: number;

  @ApiProperty({ description: '是否新品 0否 1是', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  isNew?: number;

  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;
}
