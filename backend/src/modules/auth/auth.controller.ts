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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '@nestjs/passport';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import type { User } from '../users/entities/user.entity';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  /** Discord OAuth2 진입점 — passport-discord 가드가 리다이렉트 처리. */
  @Get('discord')
  @UseGuards(AuthGuard('discord'))
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  discordLogin(): void {}

  /**
   * Discord OAuth2 콜백.
   * JWT는 HttpOnly 쿠키로만 전달하여 Referer/이력 누출을 막는다.
   * 프론트는 별도 `GET /auth/profile` 호출로 세션 확인.
   */
  @Get('discord/callback')
  @UseGuards(AuthGuard('discord'))
  async discordCallback(
    @Request() req: AuthenticatedRequest & { user: User },
    @Res() res: Response,
  ): Promise<void> {
    const tokens = await this.authService.login(req.user);
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
      path: '/',
    });
    const redirect =
      this.configService.get<string>('DISCORD_OAUTH_SUCCESS_REDIRECT') ??
      '/auth/discord/success';
    res.redirect(redirect);
  }

  /**
   * 자체 로그인.
   * JWT는 HttpOnly 쿠키로만 전달한다.
   * 프론트는 로그인 후 GET /auth/profile 로 세션 정보를 조회한다.
   */
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = await this.authService.login(user);
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: SEVEN_DAYS_MS,
      path: '/',
    });
    return { ok: true };
  }

  /**
   * 로그아웃. access_token 쿠키를 만료 처리한다.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    res.clearCookie('access_token', { path: '/' });
    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    // req.user has basic info from JWT. Fetch full info with clan.
    const user = await this.usersService.findByIdWithClan(req.user.userId);
    if (!user) return null;

    // Flatten clanId, clanRole for frontend convenience.
    // 포인트는 User.pointsBalance(PointTx 합산 캐시)가 SSOT.
    const membership = user.clanMembers?.[0];
    const clanId = membership?.clanId || null;
    const clanRole = membership?.role || null;
    // pointsBalance는 bigint 컬럼 → string으로 저장됨. 프론트 호환을 위해 number 변환.
    const totalPoints = Number(user.pointsBalance ?? 0);

    return {
      ...user,
      id: user.id,
      clanId,
      clanRole,
      totalPoints,
      lockedPoints: 0,
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
