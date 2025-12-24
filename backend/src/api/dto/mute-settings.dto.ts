import { IsNumber, IsOptional, Min } from 'class-validator';

export class MuteSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  minutes?: number | null;
}
