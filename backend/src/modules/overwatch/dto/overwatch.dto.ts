import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class SyncProfileDto {
  @IsOptional()
  @IsString()
  battleTag?: string;

  @IsOptional()
  @IsString()
  platform?: string;
}

export class UpdateSyncSettingsDto {
  @IsOptional()
  @IsBoolean()
  autoSync?: boolean;
}
