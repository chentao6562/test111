import { IsNotEmpty, IsArray, IsOptional, IsString, IsInt, Min, ValidateNested, ArrayMinSize, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @ApiProperty({ description: '商品ID' })
  @IsNotEmpty({ message: '商品ID不能为空' })
  @IsInt()
  productId!: number;

  @ApiProperty({ description: '数量' })
  @IsNotEmpty({ message: '数量不能为空' })
  @IsInt()
  @Min(1, { message: '数量至少为1' })
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: '订单商品列表', type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要一个商品' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ description: '联系人' })
  @IsNotEmpty({ message: '联系人不能为空' })
  @IsString()
  contactName!: string;

  @ApiProperty({ description: '联系电话' })
  @IsNotEmpty({ message: '联系电话不能为空' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  contactPhone!: string;

  @ApiProperty({ description: '收货地址', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
