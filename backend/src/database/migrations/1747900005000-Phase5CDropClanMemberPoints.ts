import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5-C: 단일 클랜 전환 — ClanMember 포인트 캐시 컬럼 DROP.
 *
 * 포인트는 User.pointsBalance + LedgerService(PointTx)가 SSOT.
 * ClanMember.total_points / locked_points는 더 이상 read/write 경로가 없어
 * 잔여 캐시 컬럼을 제거한다.
 *
 * down()은 컬럼을 DEFAULT 0으로 복구하여 롤백을 가능하게 한다.
 * 단, 이전 데이터는 복구되지 않는다 (SSOT는 PointTx에 있음).
 */
export class Phase5CDropClanMemberPoints1747900005000 implements MigrationInterface {
  name = 'Phase5CDropClanMemberPoints1747900005000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE "clan_members" DROP COLUMN IF EXISTS "total_points"`,
    );
    await qr.query(
      `ALTER TABLE "clan_members" DROP COLUMN IF EXISTS "locked_points"`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE "clan_members" ADD COLUMN IF NOT EXISTS "locked_points" integer NOT NULL DEFAULT 0`,
    );
    await qr.query(
      `ALTER TABLE "clan_members" ADD COLUMN IF NOT EXISTS "total_points" integer NOT NULL DEFAULT 0`,
    );
  }
}
