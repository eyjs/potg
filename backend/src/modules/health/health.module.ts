import { Module } from '@nestjs/common';
import { DiscordBotModule } from '../discord-bot/discord-bot.module';
import { HealthController } from './health.controller';

@Module({
  imports: [DiscordBotModule],
  controllers: [HealthController],
})
export class HealthModule {}
