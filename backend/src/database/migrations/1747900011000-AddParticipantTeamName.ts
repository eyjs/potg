import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AuctionParticipant.teamName — 팀명 (CAPTAIN 행에서만 사용).
 * null 이면 프론트가 "{팀장닉네임} 팀" 으로 폴백 표시한다.
 */
export class AddParticipantTeamName1747900011000 implements MigrationInterface {
  name = 'AddParticipantTeamName1747900011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auction_participants" ADD COLUMN IF NOT EXISTS "team_name" character varying(40)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auction_participants" DROP COLUMN IF EXISTS "team_name"`,
    );
  }
}
