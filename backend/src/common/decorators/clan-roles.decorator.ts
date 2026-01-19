import { SetMetadata } from '@nestjs/common';
import { ClanRole } from '../../modules/clans/entities/clan-member.entity';

export const CLAN_ROLES_KEY = 'clan_roles';
export const ClanRoles = (...roles: ClanRole[]) =>
  SetMetadata(CLAN_ROLES_KEY, roles);
