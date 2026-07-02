import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  Get,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/auth.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import {
  ACCESS_TOKEN_COOKIE,
  buildAccessTokenCookieOptions,
  clearAccessTokenCookieOptions,
} from '../../common/config/access-token-cookie';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  /**
   * 자체 로그인.
   * JWT는 HttpOnly 쿠키로 발급하되, 응답 바디에도 access_token을 함께 내려준다.
   * 일부 브라우저가 서드파티/크로스사이트 쿠키를 차단해 쿠키만으로는 로그인
   * 직후 세션 확인(/auth/profile)이 실패해 로그인 페이지가 무한 새로고침되는
   * 문제를 완화하기 위함이다. 프론트는 이 토큰을 Authorization: Bearer 헤더
   * 폴백으로 사용한다.
   *
   * 트레이드오프: 토큰을 응답 바디로 노출하면 XSS 공격 표면이 넓어진다
   * (localStorage 등에 저장 시 스크립트로 탈취 가능). 근본 해결책은 프론트와
   * 백엔드를 동일 사이트(same-site) 도메인으로 통합해 쿠키만으로 인증이
   * 정상 동작하게 하는 것이며, 이는 인프라 변경이 필요해 별도 과제로 미룬다.
   */
  @Post('login')
  @ApiOperation({ summary: '자체 로그인 (HttpOnly 쿠키 발급 + 토큰 병행 응답)' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true; access_token: string }> {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = await this.authService.login(user);
    res.cookie(
      ACCESS_TOKEN_COOKIE,
      tokens.access_token,
      buildAccessTokenCookieOptions(),
    );
    return { ok: true, access_token: tokens.access_token };
  }

  /**
   * 로그아웃. access_token 쿠키를 만료 처리한다.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그아웃 (access_token 쿠키 삭제)' })
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    res.clearCookie(ACCESS_TOKEN_COOKIE, clearAccessTokenCookieOptions());
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
}
