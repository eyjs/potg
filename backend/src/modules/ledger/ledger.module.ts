import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { PointTx } from './entities/point-tx.entity';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PointTx, User])],
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService, TypeOrmModule],
})
export class LedgerModule {}
