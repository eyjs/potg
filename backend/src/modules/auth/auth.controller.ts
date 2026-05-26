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
import type { CookieOptions, Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import type { User } from '../users/entities/user.entity';
import { DiscordOAuthService } from './discord-oauth.service';
import {
  DiscordOAuthGuard,
  DISCORD_OAUTH_STATE_COOKIE,
} from './discord-oauth.guard';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function buildAccessTokenCookieOptions(isProd: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: SEVEN_DAYS_MS,
    path: '/',
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private configService: ConfigService,
    private discordOAuth: DiscordOAuthService,
  ) {}

  /**
   * Discord OAuth2 진입점.
   * state 토큰을 짧은 HttpOnly 쿠키에 저장 후 Discord 동의 페이지로 302.
   */
  @Get('discord')
  @ApiOperation({ summary: 'Discord OAuth 진입 (state 쿠키 set + 302)' })
  discordLogin(@Res() res: Response): void {
    const state = this.discordOAuth.generateState();
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie(DISCORD_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: FIVE_MINUTES_MS,
      path: '/',
    });
    res.redirect(this.discordOAuth.getAuthUrl(state));
  }

  /**
   * Discord OAuth2 콜백.
   * DiscordOAuthGuard가 state 검증 + code 교환 + 사용자 멱등 생성 후 req.user 주입.
   * JWT는 HttpOnly 쿠키로만 전달하여 Referer/이력 누출을 막는다.
   * 프론트는 별도 `GET /auth/profile` 호출로 세션 확인.
   */
  @Get('discord/callback')
  @UseGuards(DiscordOAuthGuard)
  @ApiOperation({
    summary: 'Discord OAuth 콜백 (access_token 쿠키 set + 리다이렉트)',
  })
  async discordCallback(
    @Request() req: AuthenticatedRequest & { user: User },
    @Res() res: Response,
  ): Promise<void> {
    const tokens = await this.authService.login(req.user);
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie(
      'access_token',
      tokens.access_token,
      buildAccessTokenCookieOptions(isProd),
    );
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
  @ApiOperation({ summary: '자체 로그인 (HttpOnly 쿠키 발급)' })
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
    res.cookie(
      'access_token',
      tokens.access_token,
      buildAccessTokenCookieOptions(isProd),
    );
    return { ok: true };
  }

  /**
   * 로그아웃. access_token 쿠키를 만료 처리한다.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그아웃 (access_token 쿠키 삭제)' })
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    res.clearCookie('access_token', { path: '/' });
    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: '현재 세션 사용자 프로필 + 클랜 정보' })
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
  @ApiOperation({ summary: '비밀번호 재설정 이메일 발송' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: '비밀번호 재설정 (토큰 검증 + 변경)' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }

  @Get('verify-reset-token')
  @ApiOperation({ summary: '비밀번호 재설정 토큰 유효성 확인' })
  async verifyResetToken(@Query('token') token: string) {
    return this.authService.verifyResetToken(token);
  }
}
