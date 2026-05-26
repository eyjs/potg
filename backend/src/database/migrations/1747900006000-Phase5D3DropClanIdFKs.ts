import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5-D.3 — 단일 클랜 전환 마무리.
 * clanId가 의미를 잃은 9개 테이블에서 컬럼 + FK 제거.
 *
 * 유지: clan_members.clanId (멤버십 본질), clans 테이블 자체
 *
 * 영향 테이블:
 *   posts, votes, shop_products, blind_date_listings, point_rules,
 *   announcements, clan_join_requests, hall_of_fame, replays
 */
export class Phase5D3DropClanIdFKs1747900006000 implements MigrationInterface {
  name = 'Phase5D3DropClanIdFKs1747900006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // FK를 먼저 떨군 다음 컬럼 삭제. PostgreSQL은 FK 이름이 자동 생성되므로
    // 동적으로 찾아 제거.
    const targets: Array<{ table: string; column: string }> = [
      { table: 'posts', column: 'clanId' },
      { table: 'votes', column: 'clanId' },
      { table: 'shop_products', column: 'clanId' },
      { table: 'blind_date_listings', column: 'clanId' },
      { table: 'point_rules', column: 'clanId' },
      { table: 'announcements', column: 'clanId' },
      { table: 'clan_join_requests', column: 'clanId' },
      { table: 'hall_of_fame', column: 'clanId' },
      { table: 'replays', column: 'clanId' },
    ];

    for (const { table, column } of targets) {
      // FK 삭제 (있으면)
      const fks = await queryRunner.query(
        `SELECT tc.constraint_name
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = $1
            AND kcu.column_name = $2`,
        [table, column],
      );
      for (const fk of fks as Array<{ constraint_name: string }>) {
        await queryRunner.query(
          `ALTER TABLE "${table}" DROP CONSTRAINT "${fk.constraint_name}"`,
        );
      }

      // 인덱스 삭제 (있으면 — posts 등은 @Index 부착됨)
      const idxs = await queryRunner.query(
        `SELECT indexname FROM pg_indexes
          WHERE tablename = $1 AND indexdef ILIKE $2`,
        [table, `%(${column})%`],
      );
      for (const idx of idxs as Array<{ indexname: string }>) {
        await queryRunner.query(`DROP INDEX IF EXISTS "${idx.indexname}"`);
      }

      // 컬럼 삭제
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${column}"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백: clanId UUID 컬럼을 nullable로 복원 (이전 데이터 복구 불가).
    const targets = [
      'posts',
      'votes',
      'shop_products',
      'blind_date_listings',
      'point_rules',
      'announcements',
      'clan_join_requests',
      'hall_of_fame',
      'replays',
    ];
    for (const table of targets) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "clanId" uuid`,
      );
    }
  }
}
