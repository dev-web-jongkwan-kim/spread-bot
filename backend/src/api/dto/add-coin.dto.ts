import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class AddCoinDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'Symbol must contain only uppercase letters and numbers',
  })
  symbol: string;
}
