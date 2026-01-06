import { IsNotEmpty, IsInt, IsOptional, IsString, Length } from 'class-validator';

export class CreateTransferDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsInt({ message: '订单ID必须为整数' })
  orderId!: number;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  fromLocation?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  remark?: string;
}

export class AssignTransferDto {
  @IsNotEmpty({ message: '货管ID不能为空' })
  @IsInt({ message: '货管ID必须为整数' })
  porterId!: number;
}

export class CompleteTransferDto {
  @IsOptional()
  @IsString()
  @Length(0, 64)
  locationCode?: string;
}
