import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * User.isGuest 컬럼 추가 (비회원 게스트 매물).
 *
 * 목적:
 *   경매 매물 수기 등록(POST /auctions/:id/players/guest)이 생성하는
 *   게스트 User 를 일반 회원과 구분. 게스트는 로그인 불가이며
 *   /users, /admin/members 목록에서 제외된다.
 *
 * 배경:
 *   entity 에는 is_guest 가 이미 반영됐으나 마이그레이션이 누락돼
 *   운영 DB 에서 User 조회 쿼리 전체가 "column is_guest does not exist"
 *   로 실패하던 문제의 수정. 기존 row 는 전부 false (일반 회원).
 */
export class AddUserIsGuest1747900009000 implements MigrationInterface {
  name = 'AddUserIsGuest1747900009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_guest" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "is_guest"`,
    );
  }
}
