import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({
    description: 'Payment reference to verify',
    example: 'txn_abc123def456',
  })
  @IsNotEmpty()
  @IsString()
  reference: string;
}
