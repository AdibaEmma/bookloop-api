import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendPushDto {
  @ApiProperty({
    description: 'User ID to send notification to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Exchange Request',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification body/message',
    example: 'John wants to exchange "The Great Gatsby" with you',
  })
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiProperty({
    description: 'Additional data payload (optional)',
    example: { exchange_id: '123', listing_id: '456' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
