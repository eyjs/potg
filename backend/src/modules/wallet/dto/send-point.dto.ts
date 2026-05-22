import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SendPointDto {
  @IsUUID()
  recipientId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  message?: string;
}
