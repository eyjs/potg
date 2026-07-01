import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { DiscordOAuthService } from './discord-oauth.service';
import { DiscordOAuthGuard } from './discord-oauth.guard';
import { DiscordBotModule } from '../discord-bot/discord-bot.module';
import { TokenRefreshInterceptor } from '../../common/interceptors/token-refresh.interceptor';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ConfigModule,
    DiscordBotModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret || secret.length < 16) {
          throw new Error(
            'JWT_SECRET is required and must be at least 16 chars. See .env.example.',
          );
        }
        return { secret, signOptions: { expiresIn: '60m' } };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    DiscordOAuthService,
    DiscordOAuthGuard,
    // 전역 슬라이딩 세션: 인증 요청마다 access_token 쿠키를 새 토큰으로 재발급
    { provide: APP_INTERCEPTOR, useClass: TokenRefreshInterceptor },
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
