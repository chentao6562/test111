import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmployeeLoginDto {
  @ApiProperty({ description: 'uniCloud的uni-id-token' })
  @IsNotEmpty({ message: 'token不能为空' })
  @IsString()
  token!: string;
}
