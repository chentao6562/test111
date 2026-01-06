import { IsOptional, IsInt, Min, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryCommissionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1, 2])
  status?: number;

  @IsOptional()
  @Type(() => Number)
  @IsIn([1, 2])
  level?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class AdminQueryCommissionDto extends QueryCommissionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  orderNo?: string;
}

export class SettleCommissionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ each: true })
  ids?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}
