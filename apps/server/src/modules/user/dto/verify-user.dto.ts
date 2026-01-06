import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyUserDto {
  @ApiProperty({ description: '真实姓名' })
  @IsNotEmpty({ message: '真实姓名不能为空' })
  @IsString()
  @Length(2, 10, { message: '真实姓名长度为2-10个字符' })
  realName!: string;

  @ApiProperty({ description: '身份证号' })
  @IsNotEmpty({ message: '身份证号不能为空' })
  @IsString()
  @Matches(/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/, {
    message: '身份证号格式不正确',
  })
  idCard!: string;
}
