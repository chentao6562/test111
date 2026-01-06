import { IsNotEmpty, IsNumber, Min, IsString, Length, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ApplyWithdrawalDto {
  @IsNotEmpty({ message: '提现金额不能为空' })
  @Type(() => Number)
  @IsNumber({}, { message: '提现金额必须是数字' })
  @Min(0.01, { message: '提现金额必须大于0' })
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(0, 32)
  bankName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 32)
  bankAccount?: string;

  @IsOptional()
  @IsString()
  @Length(0, 32)
  bankHolder?: string;
}

export class AuditWithdrawalDto {
  @IsNotEmpty({ message: '审核状态不能为空' })
  @IsIn(['approved', 'rejected'], { message: '审核状态必须是 approved 或 rejected' })
  status!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @Length(0, 255)
  remark?: string;
}

export class QueryWithdrawalDto {
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 20;

  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'completed'])
  status?: string;
}

export class AdminQueryWithdrawalDto extends QueryWithdrawalDto {
  @IsOptional()
  @Type(() => Number)
  userId?: number;

  @IsOptional()
  @IsIn(['user', 'porter'])
  userType?: string;

  @IsOptional()
  withdrawNo?: string;
}
