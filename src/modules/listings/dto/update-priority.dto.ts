import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';

export class UpdatePriorityDto {
  @ApiProperty({
    description: 'New priority (1 = highest, 2, 3 = lowest)',
  })
  @IsNumber()
  @Min(1)
  @Max(3)
  priority: number;
}
