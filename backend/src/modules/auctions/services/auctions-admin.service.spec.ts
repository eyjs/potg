import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AuctionsAdminService } from './auctions-admin.service';
import { Auction, AuctionStatus } from '../entities/auction.entity';
import { AuctionRole } from '../entities/auction-participant.entity';
import { LedgerService } from '../../ledger/ledger.service';
import { POINT_TX_REASON } from '../../ledger/ledger.constants';

/**
 * AuctionsAdminService.payoutParticipants 단위 테스트.
 *
 * 검증:
 *  - COMPLETED 경매의 PLAYER+CAPTAIN 에게 정액 mint, SPECTATOR 제외
 *  - 이미 지급된 사용자(멱등 키 존재) skip
 *  - COMPLETED 아니면 BadRequest, 경매 없으면 NotFound
 */
describe('AuctionsAdminService.payoutParticipants', () => {
  function setup(opts: {
    auction: Partial<Auction> | null;
    alreadyPaidUserIds?: string[];
  }) {
    const mint = jest.fn().mockResolvedValue(undefined);
    const ledger = { mint } as unknown as LedgerService;

    const paid = new Set(opts.alreadyPaidUserIds ?? []);
    const pointTxRepo = {
      findOne: jest.fn(({ where }: { where: { idempotencyKey: string } }) => {
        const userId = where.idempotencyKey.split(':')[2];
        return Promise.resolve(paid.has(userId) ? { id: 'tx' } : null);
      }),
    };

    const manager = {
      findOne: jest.fn().mockResolvedValue(opts.auction),
      getRepository: jest.fn(() => pointTxRepo),
    };

    const dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
        Promise.resolve(cb(manager)),
      ),
    } as unknown as DataSource;

    const service = new AuctionsAdminService(
      {} as unknown as Repository<Auction>,
      dataSource,
      ledger,
    );
    return { service, mint };
  }

  const completedAuction = (
    participants: { userId: string; role: AuctionRole }[],
  ): Partial<Auction> => ({
    id: 'auction-1',
    status: AuctionStatus.COMPLETED,
    participants: participants.map((p, i) => ({
      userId: p.userId,
      role: p.role,
      id: `part-${i}`,
    })) as Auction['participants'],
  });

  it('PLAYER+CAPTAIN 전원에게 정액 mint, SPECTATOR 제외', async () => {
    const { service, mint } = setup({
      auction: completedAuction([
        { userId: 'cap-1', role: AuctionRole.CAPTAIN },
        { userId: 'pl-1', role: AuctionRole.PLAYER },
        { userId: 'pl-2', role: AuctionRole.PLAYER },
        { userId: 'spec-1', role: AuctionRole.SPECTATOR },
      ]),
    });

    const result = await service.payoutParticipants('auction-1', 100);

    expect(mint).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ recipients: 3, paid: 3, skipped: 0 });
    expect(mint).toHaveBeenCalledWith(
      'cap-1',
      100n,
      POINT_TX_REASON.AUCTION_PAYOUT,
      expect.objectContaining({
        idempotencyKey: 'AUCTION_PAYOUT:auction-1:cap-1',
        refType: 'Auction',
        refId: 'auction-1',
      }),
    );
  });

  it('이미 지급된 사용자는 skip (멱등)', async () => {
    const { service, mint } = setup({
      auction: completedAuction([
        { userId: 'pl-1', role: AuctionRole.PLAYER },
        { userId: 'pl-2', role: AuctionRole.PLAYER },
      ]),
      alreadyPaidUserIds: ['pl-1'],
    });

    const result = await service.payoutParticipants('auction-1', 50);

    expect(mint).toHaveBeenCalledTimes(1);
    expect(mint).toHaveBeenCalledWith(
      'pl-2',
      50n,
      POINT_TX_REASON.AUCTION_PAYOUT,
      expect.anything(),
    );
    expect(result).toMatchObject({ paid: 1, skipped: 1 });
  });

  it('COMPLETED 가 아니면 BadRequest', async () => {
    const { service } = setup({
      auction: {
        id: 'auction-1',
        status: AuctionStatus.ONGOING,
        participants: [],
      },
    });
    await expect(service.payoutParticipants('auction-1', 100)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('경매가 없으면 NotFound', async () => {
    const { service } = setup({ auction: null });
    await expect(service.payoutParticipants('auction-1', 100)).rejects.toThrow(
      NotFoundException,
    );
  });
});
