import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UniLoginDto {
  @ApiProperty({ description: 'uniCloud的uni-id-token' })
  @IsNotEmpty({ message: 'token不能为空' })
  @IsString()
  token!: string;

  @ApiProperty({ description: '邀请码', required: false })
  @IsOptional()
  @IsString()
  inviteCode?: string;
}
