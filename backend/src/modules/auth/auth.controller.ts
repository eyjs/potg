import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service'; // Import UsersService
import { AuthGuard } from '@nestjs/passport';
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import type { User } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService, // Inject UsersService
    private configService: ConfigService,
  ) {}

  /** Discord OAuth2 진입점 — passport-discord 가드가 리다이렉트 처리. */
  @Get('discord')
  @UseGuards(AuthGuard('discord'))
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  discordLogin(): void {}

  /** Discord OAuth2 콜백 — 토큰 발급 후 프론트로 리다이렉트. */
  @Get('discord/callback')
  @UseGuards(AuthGuard('discord'))
  async discordCallback(
    @Request() req: AuthenticatedRequest & { user: User },
    @Res() res: Response,
  ): Promise<void> {
    const tokens = await this.authService.login(req.user);
    const redirect =
      this.configService.get<string>('DISCORD_OAUTH_SUCCESS_REDIRECT') ??
      `/auth/discord/success?token=${encodeURIComponent(tokens.access_token)}`;
    res.redirect(redirect);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    // req.user has basic info from JWT. Fetch full info with clan.
    const user = await this.usersService.findByIdWithClan(req.user.userId);
    if (!user) return null;

    // Flatten clanId, clanRole, and points for frontend convenience
    const membership = user.clanMembers?.[0];
    const clanId = membership?.clanId || null;
    const clanRole = membership?.role || null;
    const totalPoints = membership?.totalPoints ?? 0;
    const lockedPoints = membership?.lockedPoints ?? 0;

    return {
      ...user,
      id: user.id,
      clanId,
      clanRole,
      totalPoints,
      lockedPoints,
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }

  @Get('verify-reset-token')
  async verifyResetToken(@Query('token') token: string) {
    return this.authService.verifyResetToken(token);
  }
}
