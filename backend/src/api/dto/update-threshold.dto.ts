import { IsNumber, Min, Max } from 'class-validator';

export class UpdateThresholdDto {
  @IsNumber()
  @Min(0.01)
  @Max(10.0)
  threshold: number;
}
