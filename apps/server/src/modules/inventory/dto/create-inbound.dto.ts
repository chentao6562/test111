import {
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InboundItemDto {
  @IsNotEmpty({ message: '商品ID不能为空' })
  @IsInt({ message: '商品ID必须为整数' })
  productId!: number;

  @IsNotEmpty({ message: '数量不能为空' })
  @IsInt({ message: '数量必须为整数' })
  @Min(1, { message: '数量必须大于0' })
  quantity!: number;

  @IsNotEmpty({ message: '成本价不能为空' })
  @IsNumber({}, { message: '成本价必须为数字' })
  @Min(0, { message: '成本价不能为负数' })
  costPrice!: number;

  @IsOptional()
  @IsString()
  @Length(0, 32)
  batchNo?: string;

  @IsOptional()
  @IsString()
  productionDate?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;
}

export class CreateInboundDto {
  @IsNotEmpty({ message: '商品列表不能为空' })
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要一个商品' })
  @ValidateNested({ each: true })
  @Type(() => InboundItemDto)
  items!: InboundItemDto[];

  @IsOptional()
  @IsString()
  @Length(0, 64, { message: '供应商名称最多64个字符' })
  supplierName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255, { message: '备注最多255个字符' })
  remark?: string;
}
