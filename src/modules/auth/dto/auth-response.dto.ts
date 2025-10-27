import { ApiProperty } from '@nestjs/swagger';

export class TokensDto {
  @ApiProperty({
    description: 'JWT access token (15min expiry)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'JWT refresh token (7 days expiry)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  token_type: string;

  @ApiProperty({
    description: 'Access token expiry in seconds',
    example: 900,
  })
  expires_in: number;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  user_id: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+233501234567',
  })
  phone: string;

  @ApiProperty({
    description: 'User full name',
    example: 'Kwame Kofi Mensah',
  })
  full_name: string;

  @ApiProperty({
    description: 'User role',
    example: 'user',
  })
  role: string;

  @ApiProperty({
    description: 'Authentication tokens',
    type: TokensDto,
  })
  tokens: TokensDto;
}

export class OtpSentResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'OTP sent successfully',
  })
  message: string;

  @ApiProperty({
    description: 'OTP reference ID',
    example: 'otp_ref_123456',
  })
  reference: string;

  @ApiProperty({
    description: 'OTP expiry timestamp',
    example: '2025-01-26T12:30:00Z',
  })
  expires_at: string;
}
