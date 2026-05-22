import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { LedgerService } from '../ledger/ledger.service';
import { POINT_TX_REASON } from '../ledger/ledger.constants';
import { SystemConfigService } from '../system-config/system-config.service';
import { SYSTEM_CONFIG_KEYS } from '../system-config/entities/system-config.entity';

export interface DiscordIdentity {
  discordId: string;
  username: string;
  avatarUrl?: string | null;
}

/**
 * Discord 사용자 식별 → POTG User 자동 가입/조회.
 *
 * 디스코드 슬래시 명령 첫 사용 또는 OAuth 콜백 시 호출.
 * `discord_id` UNIQUE 제약으로 중복 방지. 신규 가입 시 `SEED_AMOUNT` 시드 발행.
 */
@Injectable()
export class DiscordMemberService {
  private readonly logger = new Logger(DiscordMemberService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  /** discord_id 기반 조회. 미존재 시 null. */
  async findByDiscordId(discordId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { discordId } });
  }

  /**
   * 멱등 가입.
   * 신규: User row + 시드 mint. 기존: 메타데이터(username/avatar) 갱신 후 반환.
   *
   * 반환: { user, isNew } — isNew=true면 호출자가 환영 메시지 전송.
   */
  async findOrCreate(identity: DiscordIdentity): Promise<{ user: User; isNew: boolean }> {
    const existing = await this.findByDiscordId(identity.discordId);
    if (existing) {
      let dirty = false;
      if (identity.username && existing.username !== identity.username) {
        existing.username = await this.ensureUniqueUsername(identity.username, existing.id);
        dirty = true;
      }
      if (identity.avatarUrl && existing.avatarUrl !== identity.avatarUrl) {
        existing.avatarUrl = identity.avatarUrl;
        dirty = true;
      }
      if (dirty) await this.userRepository.save(existing);
      return { user: existing, isNew: false };
    }

    const seedAmount = await this.systemConfig.getNumber(
      SYSTEM_CONFIG_KEYS.SEED_AMOUNT,
      1000,
    );

    const created = await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const uniqueUsername = await this.ensureUniqueUsername(identity.username);
      const user = userRepo.create({
        username: uniqueUsername,
        nickname: identity.username,
        discordId: identity.discordId,
        avatarUrl: identity.avatarUrl ?? null,
        role: UserRole.USER,
        pointsBalance: '0',
        marketGatePassed: false,
        bettingFloatingEnabled: false,
      } as Partial<User>);
      const saved = await userRepo.save(user);

      if (seedAmount > 0) {
        await this.ledger.mint(
          saved.id,
          BigInt(seedAmount),
          POINT_TX_REASON.SEED,
          {
            refType: 'User',
            refId: saved.id,
            memo: `discord:${identity.discordId}`,
            manager,
          },
        );
      }
      return saved;
    });

    this.logger.log(
      `New Discord user registered: discord_id=${identity.discordId} user_id=${created.id} seed=${seedAmount}`,
    );

    // 시드 mint 이후 잔액 다시 로드 (transfer 내부에서 row update 수행).
    const reloaded = await this.userRepository.findOneOrFail({ where: { id: created.id } });
    return { user: reloaded, isNew: true };
  }

  /**
   * Discord username 충돌 시 suffix (discord_xxxx 등) 부여하여 유일성 확보.
   * 빈 입력 시 'discord_user' fallback.
   */
  private async ensureUniqueUsername(
    base: string,
    excludeUserId?: string,
  ): Promise<string> {
    const normalized = (base || 'discord_user').trim().slice(0, 32) || 'discord_user';
    let candidate = normalized;
    let suffix = 0;
    while (true) {
      const conflict = await this.userRepository.findOne({
        where: { username: candidate },
      });
      if (!conflict || (excludeUserId && conflict.id === excludeUserId)) {
        return candidate;
      }
      suffix += 1;
      const tail = `_${suffix.toString().padStart(2, '0')}`;
      candidate = (normalized.slice(0, 32 - tail.length) + tail).slice(0, 32);
      if (suffix > 99) {
        candidate = `discord_${Date.now().toString(36)}`;
        return candidate;
      }
    }
  }
}
