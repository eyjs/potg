import { MainRole } from '../../users/entities/user.entity';

export class LoginDto {
  username: string;
  password?: string;
}

export class RegisterDto {
  username: string;
  battleTag: string;
  password?: string;
  nickname?: string;
  mainRole?: MainRole;
  rating?: number;
}
