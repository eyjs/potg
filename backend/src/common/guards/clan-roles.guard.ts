import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClanMember } from '../../modules/clans/entities/clan-member.entity';
import { CLAN_ROLES_KEY } from '../decorators/clan-roles.decorator';

@Injectable()
export class ClanRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(ClanMember)
    private clanMemberRepository: Repository<ClanMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      CLAN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user: { userId: string };
      params: Record<string, any>;
      body: Record<string, any>;
      query: Record<string, any>;
    }>();
    const { user, params, body, query } = request;

    const clanId =
      (params.clanId as string) ||
      (body.clanId as string) ||
      (query.clanId as string) ||
      (params.id as string);

    if (!clanId) {
      throw new ForbiddenException('Clan ID not provided for role check');
    }

    const member = await this.clanMemberRepository.findOne({
      where: { userId: user.userId, clanId },
    });

    if (!member) {
      throw new ForbiddenException('User is not a member of this clan');
    }

    const hasRole = requiredRoles.includes(member.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Requires clan roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
