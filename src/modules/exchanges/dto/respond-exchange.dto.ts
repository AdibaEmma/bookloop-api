import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RespondExchangeDto {
  @ApiProperty({ description: 'Response message', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  response?: string;
}
