import { IsNotEmpty, IsInt, IsString, IsOptional, Length } from 'class-validator';

export class AdjustStockDto {
  @IsNotEmpty({ message: '调整数量不能为空' })
  @IsInt({ message: '调整数量必须为整数' })
  quantity!: number; // 正数增加，负数减少

  @IsNotEmpty({ message: '调整原因不能为空' })
  @IsString()
  @Length(1, 32, { message: '调整原因长度为1-32个字符' })
  reason!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255, { message: '备注最多255个字符' })
  remark?: string;
}
