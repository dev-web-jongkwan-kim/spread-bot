import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class TelegramLoginDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  hash: string;

  @IsNumber()
  @IsNotEmpty()
  auth_date: number;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  photo_url?: string;
}
