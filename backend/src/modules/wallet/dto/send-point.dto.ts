import { IsNumber, IsString, IsUUID, Min, IsOptional } from 'class-validator';

export class SendPointDto {
  @IsUUID()
  recipientId: string;

  @IsUUID()
  clanId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  message?: string;
}
