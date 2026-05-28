import { Module } from '@nestjs/common';
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
  providers: [AuthService, JwtStrategy, DiscordOAuthService, DiscordOAuthGuard],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
