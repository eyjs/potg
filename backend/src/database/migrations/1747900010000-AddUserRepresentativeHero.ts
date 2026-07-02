import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * User.representativeHero — 대표 오버워치 영웅 key (OverFast API 기준).
 * 경매 매물/현재 매물 카드 등에서 영웅 초상화 아이콘으로 표시된다.
 */
export class AddUserRepresentativeHero1747900010000
  implements MigrationInterface
{
  name = 'AddUserRepresentativeHero1747900010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "representative_hero" character varying(64)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "representative_hero"`,
    );
  }
}
