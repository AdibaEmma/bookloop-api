import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, PaymentPurpose } from '../entities/payment.entity';

export class InitializePaymentDto {
  @ApiProperty({
    description: 'Payment amount in GHS',
    example: 50.0,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
  })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({
    description: 'Purpose of payment',
    enum: PaymentPurpose,
    example: PaymentPurpose.SUBSCRIPTION,
  })
  @IsNotEmpty()
  @IsEnum(PaymentPurpose)
  purpose: PaymentPurpose;

  @ApiProperty({
    description: 'Exchange ID (required for exchange payments)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  exchange_id?: string;

  @ApiProperty({
    description: 'Subscription ID (required for subscription payments)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  subscription_id?: string;
}
