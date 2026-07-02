import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * auction_chat_messages — 경매방 채팅 영속화.
 * 늦게 입장/재접속한 유저에게 최근 채팅 히스토리를 제공하기 위해 저장한다.
 */
export class AddAuctionChatMessages1747900013000
  implements MigrationInterface
{
  name = 'AddAuctionChatMessages1747900013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auction_chat_messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "auctionId" character varying NOT NULL,
        "userId" character varying NOT NULL,
        "user_name" character varying NOT NULL,
        "message" text NOT NULL,
        CONSTRAINT "PK_auction_chat_messages" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auction_chat_auction_created"
        ON "auction_chat_messages" ("auctionId", "created_at")
    `);
    // FK 생략 — auctions.id 는 uuid 이나 기존 auction_bids 와 동일하게 auctionId 를
    // varchar 로 두어 스키마 일관성을 유지한다(운영 DB FK 미사용 관례).
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "auction_chat_messages"`);
  }
}
