import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { MainRole } from '../../../src/modules/users/entities/user.entity';

/**
 * Integration Test: Auction Flow
 *
 * Scenario:
 * 1. Create clan and users
 * 2. Create auction
 * 3. Captains join auction
 * 4. Players join auction
 * 5. Captains bid on players
 * 6. Verify auction state
 */
describe('Auction Flow - Integration Test (e2e)', () => {
  let app: INestApplication;
  let creatorToken: string;
  let captain1Token: string;
  let captain2Token: string;
  let player1Token: string;
  let player2Token: string;
  let clanId: string;
  let auctionId: string;

  const users = [
    {
      battleTag: `AuctionCreator#${Date.now()}`,
      password: 'Pass123!',
      mainRole: MainRole.TANK,
    },
    {
      battleTag: `Captain1#${Date.now()}`,
      password: 'Pass123!',
      mainRole: MainRole.DPS,
    },
    {
      battleTag: `Captain2#${Date.now()}`,
      password: 'Pass123!',
      mainRole: MainRole.SUPPORT,
    },
    {
      battleTag: `Player1#${Date.now()}`,
      password: 'Pass123!',
      mainRole: MainRole.DPS,
    },
    {
      battleTag: `Player2#${Date.now()}`,
      password: 'Pass123!',
      mainRole: MainRole.TANK,
    },
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Register all users
    for (const user of users) {
      await request(app.getHttpServer()).post('/auth/register').send(user);
    }

    // Login all users
    const tokens: string[] = [];
    for (const user of users) {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ battleTag: user.battleTag, password: user.password });
      tokens.push(res.body.access_token);
    }

    [creatorToken, captain1Token, captain2Token, player1Token, player2Token] =
      tokens;

    // Create clan
    const clanRes = await request(app.getHttpServer())
      .post('/clans')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        name: `Auction Clan ${Date.now()}`,
        tag: `AC${Date.now().toString().slice(-3)}`,
        description: 'Auction test clan',
      });
    clanId = clanRes.body.id;

    // All users join clan
    for (const token of [
      captain1Token,
      captain2Token,
      player1Token,
      player2Token,
    ]) {
      await request(app.getHttpServer())
        .post(`/clans/${clanId}/join`)
        .set('Authorization', `Bearer ${token}`);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Step 1: Create Auction', () => {
    it('should create auction successfully', async () => {
      const auctionData = {
        title: 'Team Draft Auction',
        startingPoints: 1000,
        turnTimeLimit: 60,
      };

      const response = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(auctionData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(auctionData.title);
      expect(response.body.status).toBe('PENDING');
      auctionId = response.body.id;
    });
  });

  describe('Step 2: Join Auction as Captains', () => {
    it('should allow captain1 to join as CAPTAIN', async () => {
      const response = await request(app.getHttpServer())
        .post(`/auctions/${auctionId}/join`)
        .set('Authorization', `Bearer ${captain1Token}`)
        .send({ role: 'CAPTAIN' })
        .expect(201);

      expect(response.body.role).toBe('CAPTAIN');
      expect(response.body.currentPoints).toBe(1000); // startingPoints
    });

    it('should allow captain2 to join as CAPTAIN', async () => {
      const response = await request(app.getHttpServer())
        .post(`/auctions/${auctionId}/join`)
        .set('Authorization', `Bearer ${captain2Token}`)
        .send({ role: 'CAPTAIN' })
        .expect(201);

      expect(response.body.role).toBe('CAPTAIN');
      expect(response.body.currentPoints).toBe(1000);
    });
  });

  describe('Step 3: Join Auction as Players', () => {
    it('should allow player1 to join as PLAYER', async () => {
      const response = await request(app.getHttpServer())
        .post(`/auctions/${auctionId}/join`)
        .set('Authorization', `Bearer ${player1Token}`)
        .send({ role: 'PLAYER' })
        .expect(201);

      expect(response.body.role).toBe('PLAYER');
      expect(response.body.currentPoints).toBe(0);
    });

    it('should allow player2 to join as PLAYER', async () => {
      const response = await request(app.getHttpServer())
        .post(`/auctions/${auctionId}/join`)
        .set('Authorization', `Bearer ${player2Token}`)
        .send({ role: 'PLAYER' })
        .expect(201);

      expect(response.body.role).toBe('PLAYER');
    });
  });

  describe('Step 4: Place Bids', () => {
    let player1Id: string;
    let player2Id: string;

    beforeAll(async () => {
      const auctionDetails = await request(app.getHttpServer())
        .get(`/auctions/${auctionId}`)
        .expect(200);

      const player1Participant = auctionDetails.body.participants.find(
        (p: { role: string }) => p.role === 'PLAYER',
      );
      player1Id = player1Participant.userId;

      const player2Participant = auctionDetails.body.participants.filter(
        (p: { role: string }) => p.role === 'PLAYER',
      )[1];
      player2Id = player2Participant.userId;
    });

    it('should allow captain1 to bid on player1', async () => {
      const response = await request(app.getHttpServer())
        .post(`/auctions/${auctionId}/bid`)
        .set('Authorization', `Bearer ${captain1Token}`)
        .send({
          targetPlayerId: player1Id,
          amount: 300,
        })
        .expect(201);

      expect(response.body.amount).toBe(300);
      expect(response.body.targetPlayerId).toBe(player1Id);
    });

    it('should allow captain2 to bid on player2', async () => {
      const response = await request(app.getHttpServer())
        .post(`/auctions/${auctionId}/bid`)
        .set('Authorization', `Bearer ${captain2Token}`)
        .send({
          targetPlayerId: player2Id,
          amount: 250,
        })
        .expect(201);

      expect(response.body.amount).toBe(250);
    });

    it('should fail when captain bids more than available points', async () => {
      await request(app.getHttpServer())
        .post(`/auctions/${auctionId}/bid`)
        .set('Authorization', `Bearer ${captain1Token}`)
        .send({
          targetPlayerId: player2Id,
          amount: 800, // Only 700 left (1000 - 300)
        })
        .expect(400);
    });

    it('should fail when non-captain tries to bid', async () => {
      await request(app.getHttpServer())
        .post(`/auctions/${auctionId}/bid`)
        .set('Authorization', `Bearer ${player1Token}`)
        .send({
          targetPlayerId: player2Id,
          amount: 100,
        })
        .expect(400);
    });
  });

  describe('Step 5: Verify Auction State', () => {
    it('should get auction details with all bids', async () => {
      const response = await request(app.getHttpServer())
        .get(`/auctions/${auctionId}`)
        .expect(200);

      expect(response.body.id).toBe(auctionId);
      expect(response.body.participants).toBeDefined();
      expect(response.body.bids).toBeDefined();
      expect(response.body.bids.length).toBeGreaterThan(0);
    });

    it('should list all auctions', async () => {
      const response = await request(app.getHttpServer())
        .get('/auctions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const ourAuction = response.body.find(
        (a: { id: string }) => a.id === auctionId,
      );
      expect(ourAuction).toBeDefined();
    });
  });
});
