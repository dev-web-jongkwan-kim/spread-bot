import { IsString, IsBoolean, IsIn } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsIn(['basic', 'pro', 'whale'], {
    message: 'Plan must be one of: basic, pro, whale',
  })
  plan: string;

  @IsBoolean()
  yearly: boolean;
}
