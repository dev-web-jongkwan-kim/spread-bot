import { IsString, IsIn } from 'class-validator';

export class UpdateLanguageDto {
  @IsString()
  @IsIn(['en', 'ko', 'ja', 'zh'], {
    message: 'Language must be one of: en, ko, ja, zh',
  })
  language: string;
}
