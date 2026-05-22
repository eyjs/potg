import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2: 핵심 비즈니스 로직 스키마.
 *
 * 변경:
 *   1) 신규 테이블:
 *      - betting_stakes (사용자 패리뮤추얼 스테이크 보관)
 *   2) 폐기 테이블 DROP:
 *      - point_logs            (PointTx로 대체)
 *      - betting_questions     (BettingMarket으로 대체)
 *      - betting_tickets       (BettingStake로 대체)
 *      - shop_purchases        (MarketOrder로 대체)
 *
 * 데이터 이관 없음 (requirement.md §8.4: 완전 클린 시작).
 */
export class Phase2CoreLogic1747900002000 implements MigrationInterface {
  name = 'Phase2CoreLogic1747900002000';

  public async up(qr: QueryRunner): Promise<void> {
    // ===== 1) betting_stakes 신규 =====
    await qr.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."betting_stakes_status_enum"
          AS ENUM ('PLACED','WON','LOST','REFUNDED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "betting_stakes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "market_id" uuid NOT NULL REFERENCES "betting_markets"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL,
        "side" varchar(64) NOT NULL,
        "stake" bigint NOT NULL,
        "payout" bigint NULL,
        "status" "public"."betting_stakes_status_enum" NOT NULL DEFAULT 'PLACED'
      );
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_betting_stakes_market" ON "betting_stakes" ("market_id");`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_betting_stakes_user" ON "betting_stakes" ("user_id");`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_betting_stakes_market_side" ON "betting_stakes" ("market_id","side");`,
    );

    // ===== 2) 폐기 테이블 DROP =====
    await qr.query(`DROP TABLE IF EXISTS "point_logs" CASCADE;`);
    await qr.query(`DROP TABLE IF EXISTS "betting_tickets" CASCADE;`);
    await qr.query(`DROP TABLE IF EXISTS "betting_questions" CASCADE;`);
    await qr.query(`DROP TABLE IF EXISTS "shop_purchases" CASCADE;`);
    // 폐기 enum 정리.
    await qr.query(`DROP TYPE IF EXISTS "public"."betting_questions_status_enum";`);
    await qr.query(`DROP TYPE IF EXISTS "public"."betting_tickets_status_enum";`);
    await qr.query(`DROP TYPE IF EXISTS "public"."shop_purchases_status_enum";`);
  }

  public async down(qr: QueryRunner): Promise<void> {
    // 폐기 테이블은 복원하지 않는다 (데이터 손실 회복 불가).
    await qr.query(`DROP TABLE IF EXISTS "betting_stakes";`);
    await qr.query(`DROP TYPE IF EXISTS "public"."betting_stakes_status_enum";`);
  }
}
