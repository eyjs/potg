import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline 마이그레이션 (placeholder).
 *
 * 의도:
 *   - 현재 운영/개발 DB는 `synchronize: true` 모드로 누적된 스키마 위에서 동작.
 *   - 본 마이그레이션은 `typeorm_migrations` 테이블만 초기화하고, 기존 스키마를
 *     "현 시점 baseline"으로 기록.
 *   - **클린 DB에서 처음 시작하는 경우**: 본 마이그레이션 실행 전에
 *       1) 한 번만 `synchronize: true`로 부팅하여 기존 엔티티 테이블 생성,
 *       2) `synchronize: false`로 전환 후 본 마이그레이션 + Phase1 마이그레이션 실행.
 *     또는 `npm run migration:generate -- <Name>` 으로 통합 baseline 재생성 가능.
 *
 * 후속:
 *   - `1747900001000-Phase1DiscordRefactor.ts` : User 확장 + 신규 엔티티 8종 + 시드
 */
export class Baseline1747900000000 implements MigrationInterface {
  name = 'Baseline1747900000000';

  public async up(_qr: QueryRunner): Promise<void> {
    // no-op : 기존 스키마를 baseline으로 인정
  }

  public async down(_qr: QueryRunner): Promise<void> {
    // no-op
  }
}
