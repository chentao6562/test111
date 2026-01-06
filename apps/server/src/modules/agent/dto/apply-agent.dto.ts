import {
  IsNotEmpty,
  IsString,
  IsOptional,
  Matches,
  Length,
} from 'class-validator';

export class ApplyAgentDto {
  @IsNotEmpty({ message: '真实姓名不能为空' })
  @IsString()
  @Length(2, 32, { message: '真实姓名长度为2-32个字符' })
  realName!: string;

  @IsNotEmpty({ message: '身份证号不能为空' })
  @IsString()
  @Matches(/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/, {
    message: '身份证号格式不正确',
  })
  idCard!: string;

  @IsNotEmpty({ message: '联系电话不能为空' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255, { message: '经营地址最多255个字符' })
  address?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6, { message: '邀请码为6位字符' })
  inviteCode?: string;
}
