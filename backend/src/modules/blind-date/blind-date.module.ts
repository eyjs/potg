import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlindDateService } from './blind-date.service';
import { BlindDateController } from './blind-date.controller';
import { BlindDateListing } from './entities/blind-date-listing.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlindDateListing]),
  ],
  controllers: [BlindDateController],
  providers: [BlindDateService],
  exports: [BlindDateService],
})
export class BlindDateModule {}
