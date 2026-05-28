import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5-E — 사용자 채널 → Discord 봇 이관 후 잔여 테이블 drop.
 *
 * 이관 사유:
 *   사용자 페이지(community/profile/overwatch/blind-date/vote/scrim-results)
 *   가 Discord 슬래시 명령으로 모두 대체됨. 백엔드 모듈 및 entity 파일은
 *   직전 커밋에서 제거. 본 마이그레이션은 DB 잔여 테이블 정리.
 *
 * 추가: forgot/reset-password 기능 폐기 → password_resets 테이블 drop.
 *
 * 순서: 자식 테이블 먼저 drop 후 부모 drop. PostgreSQL은 FK 위반시 즉시 실패.
 * IF EXISTS 로 멱등성 보장 (이미 drop된 환경에서도 안전).
 */
export class DropUserChannelTables1747900007000 implements MigrationInterface {
  name = 'DropUserChannelTables1747900007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 자식 테이블 (FK 참조) 먼저
    await queryRunner.query(`DROP TABLE IF EXISTS "post_comments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vote_records" CASCADE`);

    // 부모/단독 테이블
    await queryRunner.query(`DROP TABLE IF EXISTS "posts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "votes" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "blind_date_listings" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "member_profiles" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "overwatch_profiles" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "replays" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scrim_results" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_resets" CASCADE`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 복구 불가 (스키마 정의가 코드베이스에서 사라짐). 빈 down 으로 둠.
    // 롤백이 필요하면 baseline + Phase1 entity 복원 후 재실행해야 함.
  }
}
