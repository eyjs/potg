import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { TokenRefreshInterceptor } from '../../common/interceptors/token-refresh.interceptor';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret || secret.length < 16) {
          throw new Error(
            'JWT_SECRET is required and must be at least 16 chars. See .env.example.',
          );
        }
        // 장시간 경매 이벤트 대비 12h. 활동 중에는 슬라이딩 갱신으로 계속 연장됨.
        return { secret, signOptions: { expiresIn: '12h' } };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    // 전역 슬라이딩 세션: 인증 요청마다 access_token 쿠키를 새 토큰으로 재발급
    { provide: APP_INTERCEPTOR, useClass: TokenRefreshInterceptor },
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
