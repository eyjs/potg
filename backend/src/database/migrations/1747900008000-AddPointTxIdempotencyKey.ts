import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PointTx 멱등성 키 컬럼 + 부분 유니크 인덱스.
 *
 * 목적:
 *   "정확히 1회" 가 보장돼야 하는 보상/정산 흐름(ex: 경매 영입 보상)이
 *   결정적 key(`AUCTION_REWARD:{auctionId}:{userId}` 등)를 지정하면
 *   동일 key 재기록을 DB 레벨에서 차단(중복 지급 방지).
 *
 * 설계:
 *   - 컬럼은 nullable. 기존/일반 거래(스테이크·이체 등 다건 허용)는 key=null →
 *     부분 유니크 인덱스(WHERE idempotency_key IS NOT NULL) 대상 아님.
 *   - 따라서 기존 데이터/흐름에 영향 없음 (안전 추가).
 */
export class AddPointTxIdempotencyKey1747900008000 implements MigrationInterface {
  name = 'AddPointTxIdempotencyKey1747900008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "point_tx" ADD COLUMN IF NOT EXISTS "idempotency_key" character varying(128)`,
    );
    // 부분 유니크: key 가 지정된 row 끼리만 유일성 강제
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_point_tx_idempotency_key" ` +
        `ON "point_tx" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_point_tx_idempotency_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "point_tx" DROP COLUMN IF EXISTS "idempotency_key"`,
    );
  }
}
