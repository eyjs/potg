import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
