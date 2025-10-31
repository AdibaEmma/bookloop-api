import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionTier } from '../entities/subscription.entity';

export class UpgradeSubscriptionDto {
  @ApiProperty({
    description: 'Target subscription tier',
    enum: SubscriptionTier,
    example: SubscriptionTier.BASIC,
  })
  @IsNotEmpty()
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @ApiProperty({
    description: 'Payment reference from successful payment',
    example: 'txn_abc123def456',
  })
  @IsNotEmpty()
  @IsString()
  payment_reference: string;
}
