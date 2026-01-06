import {
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class AuditAgentDto {
  @IsNotEmpty({ message: '审核状态不能为空' })
  @IsIn([2, 3], { message: '审核状态只能是2(通过)或3(拒绝)' })
  status!: number;

  @IsOptional()
  @IsString()
  @Length(0, 255, { message: '拒绝原因最多255个字符' })
  reason?: string;
}
