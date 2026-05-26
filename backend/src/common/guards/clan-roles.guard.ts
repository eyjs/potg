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

/**
 * 단일 클랜 환경 — 요청 파라미터의 clanId는 무시하고
 * (userId, 임의 ClanMember)로 role 검증. 가입자가 아니면 403.
 */
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
    }>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Authenticated user required');
    }

    const member = await this.clanMemberRepository.findOne({
      where: { userId },
    });

    if (!member) {
      throw new ForbiddenException('User is not a clan member');
    }

    if (!requiredRoles.includes(member.role)) {
      throw new ForbiddenException(
        `Requires clan roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
