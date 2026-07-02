import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Auction.rosterMode — 로스터 구성 모드.
 * - CAPTAIN(기본): 팀장이 로스터 일원 → 팀당 확보 선수 4명.
 * - COACH: 팀장이 감독(코치)으로 로스터 외부 → 팀당 선수 5명.
 * 기존 경매는 기본값 CAPTAIN 으로 채워져 종전 동작이 유지된다.
 */
export class AddAuctionRosterMode1747900012000 implements MigrationInterface {
  name = 'AddAuctionRosterMode1747900012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."auctions_roster_mode_enum" AS ENUM ('CAPTAIN','COACH');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(
      `ALTER TABLE "auctions" ADD COLUMN IF NOT EXISTS "roster_mode" "public"."auctions_roster_mode_enum" NOT NULL DEFAULT 'CAPTAIN'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auctions" DROP COLUMN IF EXISTS "roster_mode"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."auctions_roster_mode_enum"`,
    );
  }
}
