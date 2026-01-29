import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { MemberProfile } from './entities/member-profile.entity';
import { Follow } from './entities/follow.entity';
import { Guestbook } from './entities/guestbook.entity';
import { ProfileVisit } from './entities/profile-visit.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { MemberItem } from '../shop/entities/member-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MemberProfile,
      Follow,
      Guestbook,
      ProfileVisit,
      ClanMember,
      MemberItem,
    ]),
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
