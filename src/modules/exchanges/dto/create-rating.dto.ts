import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, Max, MaxLength } from 'class-validator';

export class CreateRatingDto {
  @ApiProperty({ description: 'Rating (1-5 stars)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: 'Optional review text', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  review?: string;
}
