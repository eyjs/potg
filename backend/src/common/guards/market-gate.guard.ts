import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { MarketGateService } from '../services/market-gate.service';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/**
 * 마켓 게이트 HTTP 가드.
 * 실제 검증 로직은 MarketGateService에 위임 (디스코드 인터랙션과 공유).
 */
@Injectable()
export class MarketGateGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly gate: MarketGateService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User not found: ${userId}`);

    await this.gate.enforce(userId, user.marketGatePassed);
    return true;
  }
}
