import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import {
  WinstonModule,
  utilities as nestWinstonModuleUtilities,
} from 'nest-winston';
import * as winston from 'winston';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuctionsModule } from './modules/auctions/auctions.module';
import { ScrimsModule } from './modules/scrims/scrims.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClansModule } from './modules/clans/clans.module';
import { VotesModule } from './modules/votes/votes.module';
import { ShopModule } from './modules/shop/shop.module';
import { BettingModule } from './modules/betting/betting.module';
import { BlindDateModule } from './modules/blind-date/blind-date.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 정적 파일 서빙 (업로드 이미지)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { index: false },
    }),

    // Winston 로깅
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            nestWinstonModuleUtilities.format.nestLike('POTG', {
              colors: true,
              prettyPrint: true,
            }),
          ),
        }),
        // 프로덕션에서 파일 로깅
        ...(process.env.NODE_ENV === 'production'
          ? [
              new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                format: winston.format.combine(
                  winston.format.timestamp(),
                  winston.format.json(),
                ),
              }),
              new winston.transports.File({
                filename: 'logs/combined.log',
                format: winston.format.combine(
                  winston.format.timestamp(),
                  winston.format.json(),
                ),
              }),
            ]
          : []),
      ],
    }),

    // Rate Limiting (DDoS 방지)
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1초
        limit: 10, // 10 requests
      },
      {
        name: 'medium',
        ttl: 10000, // 10초
        limit: 50, // 50 requests
      },
      {
        name: 'long',
        ttl: 60000, // 1분
        limit: 200, // 200 requests
      },
    ]),

    // 캐싱
    CacheModule.register({
      isGlobal: true,
      ttl: 60000, // 60초 기본 TTL
      max: 100, // 최대 100개 캐시 항목
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('NODE_ENV') !== 'production', // Dev only
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ClansModule,
    AuctionsModule,
    ScrimsModule,
    VotesModule,
    ShopModule,
    BettingModule,
    BlindDateModule,
    WalletModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 전역 Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
