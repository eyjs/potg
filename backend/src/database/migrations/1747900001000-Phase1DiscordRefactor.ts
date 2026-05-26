import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1: Discord refactor 기반 스키마 변경.
 *
 * 변경:
 *   1) users 테이블:
 *      - role enum 에 CAPTAIN 추가
 *      - discord_id (uuid? string), points_balance (bigint), market_gate_passed (bool) 추가
 *   2) 신규 테이블:
 *      - point_tx (복식부기 원장, append-only)
 *      - matches, teams, team_members
 *      - betting_markets
 *      - market_orders
 *      - system_config (+ 시드 5건)
 */
export class Phase1DiscordRefactor1747900001000 implements MigrationInterface {
  name = 'Phase1DiscordRefactor1747900001000';

  public async up(qr: QueryRunner): Promise<void> {
    // ===== 1) users 확장 =====
    await qr.query(`
      ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'CAPTAIN';
    `);
    await qr.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "discord_id" varchar,
        ADD COLUMN IF NOT EXISTS "points_balance" bigint NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "market_gate_passed" boolean NOT NULL DEFAULT false;
    `);
    await qr.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_discord_id"
        ON "users" ("discord_id") WHERE "discord_id" IS NOT NULL;
    `);

    // ===== 2-a) point_tx =====
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "point_tx" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "from_account" uuid NULL,
        "to_account" uuid NULL,
        "amount" bigint NOT NULL,
        "reason" varchar(64) NOT NULL,
        "ref_type" varchar(32) NULL,
        "ref_id" uuid NULL,
        "memo" text NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_point_tx_from" ON "point_tx" ("from_account");`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_point_tx_to" ON "point_tx" ("to_account");`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_point_tx_ref" ON "point_tx" ("ref_type","ref_id");`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_point_tx_created" ON "point_tx" ("created_at");`,
    );

    // ===== 2-b) matches / teams / team_members =====
    await qr.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."matches_status_enum" AS ENUM ('DRAFT','BETTING_OPEN','LOCKED','SETTLED','CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "matches" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "title" varchar NOT NULL,
        "scheduled_at" timestamp NULL,
        "status" "public"."matches_status_enum" NOT NULL DEFAULT 'DRAFT',
        "winner_team_id" uuid NULL,
        "settled_at" timestamp NULL,
        "description" text NULL
      );
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_matches_status" ON "matches" ("status");`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_matches_scheduled" ON "matches" ("scheduled_at");`,
    );

    await qr.query(`
      CREATE TABLE IF NOT EXISTS "teams" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "match_id" uuid NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
        "name" varchar NOT NULL,
        "captain_id" uuid NULL,
        "placement" int NULL
      );
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_teams_match" ON "teams" ("match_id");`,
    );

    await qr.query(`
      CREATE TABLE IF NOT EXISTS "team_members" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL,
        "bid_price" bigint NULL,
        CONSTRAINT "uq_team_member" UNIQUE ("team_id","user_id")
      );
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_team_members_team" ON "team_members" ("team_id");`,
    );

    // ===== 2-c) betting_markets =====
    await qr.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."betting_markets_type_enum" AS ENUM ('WIN','RANK');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await qr.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."betting_markets_status_enum" AS ENUM ('OPEN','LOCKED','SETTLED','CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "betting_markets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "match_id" uuid NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
        "type" "public"."betting_markets_type_enum" NOT NULL,
        "status" "public"."betting_markets_status_enum" NOT NULL DEFAULT 'OPEN',
        "total_pool" bigint NOT NULL DEFAULT 0,
        "rake_bps" int NOT NULL DEFAULT 500,
        "winning_option" varchar(64) NULL,
        "locked_at" timestamp NULL,
        "settled_at" timestamp NULL
      );
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_betting_markets_match" ON "betting_markets" ("match_id");`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_betting_markets_status" ON "betting_markets" ("status");`,
    );

    // ===== 2-d) market_orders =====
    await qr.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."market_orders_status_enum" AS ENUM ('COMPLETED','DELIVERED','CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "market_orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "product_id" uuid NOT NULL,
        "buyer_id" uuid NOT NULL,
        "quantity" int NOT NULL,
        "unit_price" bigint NOT NULL,
        "total_price" bigint NOT NULL,
        "status" "public"."market_orders_status_enum" NOT NULL DEFAULT 'COMPLETED',
        "delivered_at" timestamp NULL,
        "cancelled_at" timestamp NULL,
        "admin_note" text NULL
      );
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_market_orders_buyer" ON "market_orders" ("buyer_id");`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_market_orders_status" ON "market_orders" ("status");`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_market_orders_product" ON "market_orders" ("product_id");`,
    );

    // ===== 2-e) system_config + 시드 =====
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "system_config" (
        "key" varchar(64) PRIMARY KEY,
        "value" text NOT NULL,
        "description" text NULL,
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    await qr.query(`
      INSERT INTO "system_config" ("key","value","description") VALUES
        ('SEED_AMOUNT','1000','가입 시드 포인트'),
        ('MONTHLY_CAP','5000','월 적립 상한 포인트'),
        ('RAKE_BPS','500','베팅 Rake 비율 (basis points, 500 = 5%)'),
        ('MARKET_GATE_ATTENDANCE_DAYS','7','마켓 게이트 출석 임계값 (일)'),
        ('MARKET_GATE_MATCH_COUNT','2','마켓 게이트 내전 참여 임계값 (회)')
      ON CONFLICT ("key") DO NOTHING;
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "system_config";`);
    await qr.query(`DROP TABLE IF EXISTS "market_orders";`);
    await qr.query(`DROP TYPE IF EXISTS "public"."market_orders_status_enum";`);
    await qr.query(`DROP TABLE IF EXISTS "betting_markets";`);
    await qr.query(
      `DROP TYPE IF EXISTS "public"."betting_markets_status_enum";`,
    );
    await qr.query(`DROP TYPE IF EXISTS "public"."betting_markets_type_enum";`);
    await qr.query(`DROP TABLE IF EXISTS "team_members";`);
    await qr.query(`DROP TABLE IF EXISTS "teams";`);
    await qr.query(`DROP TABLE IF EXISTS "matches";`);
    await qr.query(`DROP TYPE IF EXISTS "public"."matches_status_enum";`);
    await qr.query(`DROP TABLE IF EXISTS "point_tx";`);
    await qr.query(`DROP INDEX IF EXISTS "uq_users_discord_id";`);
    await qr.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "discord_id",
        DROP COLUMN IF EXISTS "points_balance",
        DROP COLUMN IF EXISTS "market_gate_passed";
    `);
    // Postgres ENUM 값 제거는 DROP TYPE 후 재생성 필요 — 운영 위험 → no-op
  }
}
