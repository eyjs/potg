import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { Repository } from 'typeorm';
import type { SlashCommand } from '../interfaces/slash-command.interface';
import { DiscordMemberService } from '../discord-member.service';
import { ShopService } from '../../shop/shop.service';
import { LedgerService } from '../../ledger/ledger.service';
import {
  ProductStatus,
  ShopProduct,
} from '../../shop/entities/shop-product.entity';
import { SystemConfigService } from '../../system-config/system-config.service';
import { SYSTEM_CONFIG_KEYS } from '../../system-config/entities/system-config.entity';
import { AttendanceRecord, AttendanceStatus } from '../../attendance/entities/attendance-record.entity';

@Injectable()
export class BuyCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('구매')
    .setDescription('상품을 구매합니다 (마켓 게이트 통과 필요)')
    .addStringOption((o) =>
      o.setName('상품').setDescription('상품 ID').setRequired(true),
    )
    .addIntegerOption((o) =>
      o
        .setName('수량')
        .setDescription('구매 수량 (기본 1)')
        .setMinValue(1)
        .setRequired(false),
    );

  constructor(
    private readonly members: DiscordMemberService,
    private readonly shop: ShopService,
    private readonly ledger: LedgerService,
    private readonly systemConfig: SystemConfigService,
    @InjectRepository(ShopProduct)
    private readonly productRepo: Repository<ShopProduct>,
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepo: Repository<AttendanceRecord>,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const productId = interaction.options.getString('상품', true);
    const quantity = interaction.options.getInteger('수량') ?? 1;

    const { user } = await this.members.findOrCreate({
      discordId: interaction.user.id,
      username: interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL({ size: 256 }),
    });

    await this.ensureMarketGate(user.id, user.marketGatePassed);

    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('상품을 찾을 수 없습니다.');
    if (product.status !== ProductStatus.ACTIVE) {
      await interaction.editReply('현재 판매중이 아닌 상품입니다.');
      return;
    }

    const order = await this.shop.purchase(user.id, product.id, quantity);
    const balance = await this.ledger.getBalance(user.id);

    await interaction.editReply(
      [
        `✅ **${product.name}** \`x${quantity}\` 구매 완료`,
        `결제: ${order.totalPrice} P`,
        `주문번호: \`${order.id}\``,
        `현재 잔액: ${balance.toString()} P`,
        '관리자가 실물 전달 후 알림드릴 예정입니다.',
      ].join('\n'),
    );
  }

  /**
   * MarketGateGuard와 동일한 로직을 직접 적용한다.
   * (디스코드 인터랙션은 HTTP 가드 체인을 거치지 않으므로 별도 검증)
   */
  private async ensureMarketGate(userId: string, cached: boolean): Promise<void> {
    if (cached) return;

    const requiredDays = await this.systemConfig.getNumber(
      SYSTEM_CONFIG_KEYS.MARKET_GATE_ATTENDANCE_DAYS,
      7,
    );
    const requiredMatches = await this.systemConfig.getNumber(
      SYSTEM_CONFIG_KEYS.MARKET_GATE_MATCH_COUNT,
      2,
    );

    const attendanceDays = await this.attendanceRepo
      .createQueryBuilder('ar')
      .innerJoin('clan_members', 'cm', 'cm.id = ar.memberId')
      .where('cm.userId = :userId', { userId })
      .andWhere('ar.status IN (:...active)', {
        active: [AttendanceStatus.PRESENT, AttendanceStatus.LATE],
      })
      .andWhere('ar.scrimId IS NULL')
      .getCount();

    const matchCount = await this.attendanceRepo
      .createQueryBuilder('ar')
      .innerJoin('clan_members', 'cm', 'cm.id = ar.memberId')
      .where('cm.userId = :userId', { userId })
      .andWhere('ar.status IN (:...active)', {
        active: [AttendanceStatus.PRESENT, AttendanceStatus.LATE],
      })
      .andWhere('ar.scrimId IS NOT NULL')
      .getCount();

    if (attendanceDays < requiredDays || matchCount < requiredMatches) {
      throw new ForbiddenException(
        `마켓 게이트 미통과: 출석 ${attendanceDays}/${requiredDays}일, 내전 ${matchCount}/${requiredMatches}회`,
      );
    }
    // 통과 캐시는 MarketGateGuard와 일관되게 다음 HTTP 호출 또는 별도 작업에서 갱신.
    // 본 인터랙션에서는 일회성 검증만 수행.
  }
}
