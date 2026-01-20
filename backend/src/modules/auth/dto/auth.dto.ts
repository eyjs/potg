export class LoginDto {
  username: string;
  password?: string;
}

export class RegisterDto {
  username: string;
  battleTag: string;
  password?: string;
  // Add other fields as necessary
}
