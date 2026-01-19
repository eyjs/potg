import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlindDateService } from './blind-date.service';
import { BlindDateController } from './blind-date.controller';
import { BlindDateListing } from './entities/blind-date-listing.entity';
import { BlindDateRequest } from './entities/blind-date-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BlindDateListing, BlindDateRequest])],
  controllers: [BlindDateController],
  providers: [BlindDateService],
  exports: [BlindDateService],
})
export class BlindDateModule {}
