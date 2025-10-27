import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Phone number in international format',
    example: '+233501234567',
  })
  @IsPhoneNumber('GH')
  phone: string;
}
