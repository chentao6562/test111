import { IsOptional, IsInt, Min, Max, IsIn, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAgentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1, 2, 3], { message: '状态只能是0-3' })
  status?: number;

  @IsOptional()
  @Type(() => Number)
  @IsIn([1, 2], { message: '代理等级只能是1或2' })
  level?: number;

  @IsOptional()
  @IsString()
  keyword?: string;
}
