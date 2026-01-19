import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scrim } from './entities/scrim.entity';
import { ScrimMatch } from './entities/scrim-match.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Scrim, ScrimMatch])],
  controllers: [],
  providers: [],
})
export class ScrimsModule {}
