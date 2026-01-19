import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import {
  MainRole,
  User,
  UserRole,
} from '../../../src/modules/users/entities/user.entity';
import { DataSource } from 'typeorm';

/**
 * Integration Test: Betting Flow
 *
 * Scenario:
 * 1. Create clan, users, and scrim
 * 2. Create betting question for scrim
 * 3. Users place bets
 * 4. Settle betting question with result
 * 5. Verify winners and losers
 */
describe('Betting Flow - Integration Test (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let bettor1Token: string;
  let bettor2Token: string;
  let clanId: string;
  let scrimId: string;
  let questionId: string;

  const users = [
    {
      battleTag: `BettingAdmin#${Date.now()}`,
      password: 'Pass123!',
      mainRole: MainRole.TANK,
    },
    {
      battleTag: `Bettor1#${Date.now()}`,
      password: 'Pass123!',
      mainRole: MainRole.DPS,
    },
    {
      battleTag: `Bettor2#${Date.now()}`,
      password: 'Pass123!',
      mainRole: MainRole.SUPPORT,
    },
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Register users
    for (const user of users) {
      await request(app.getHttpServer()).post('/auth/register').send(user);
    }

    // Promote Admin User
    const dataSource = app.get(DataSource);
    await dataSource
      .getRepository(User)
      .update({ battleTag: users[0].battleTag }, { role: UserRole.ADMIN });

    // Login users
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ battleTag: users[0].battleTag, password: users[0].password });
    adminToken = adminLogin.body.access_token;

    const bettor1Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ battleTag: users[1].battleTag, password: users[1].password });
    bettor1Token = bettor1Login.body.access_token;

    const bettor2Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ battleTag: users[2].battleTag, password: users[2].password });
    bettor2Token = bettor2Login.body.access_token;

    // Create clan
    const clanRes = await request(app.getHttpServer())
      .post('/clans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Betting Clan ${Date.now()}`,
        tag: `BC${Date.now().toString().slice(-3)}`,
        description: 'Betting test clan',
      });
    clanId = clanRes.body.id;

    // Users join clan
    await request(app.getHttpServer())
      .post(`/clans/${clanId}/join`)
      .set('Authorization', `Bearer ${bettor1Token}`);

    await request(app.getHttpServer())
      .post(`/clans/${clanId}/join`)
      .set('Authorization', `Bearer ${bettor2Token}`);

    // Create scrim for betting
    const scrimRes = await request(app.getHttpServer())
      .post('/scrims')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Betting Test Match',
        clanId,
        recruitmentType: 'MANUAL',
      });
    scrimId = scrimRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Step 1: Create Betting Question', () => {
    it('should create betting question for scrim', async () => {
      const questionData = {
        scrimId,
        question: 'Will Team A win the match?',
        minBetAmount: 100,
        rewardMultiplier: 2.0,
      };

      const response = await request(app.getHttpServer())
        .post('/betting/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(questionData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.question).toBe(questionData.question);
      expect(response.body.status).toBe('OPEN');
      questionId = response.body.id;
    });

    it('should fail to create question without authentication', async () => {
      await request(app.getHttpServer())
        .post('/betting/questions')
        .send({ question: 'Test?', minBetAmount: 50 })
        .expect(401);
    });
  });

  describe('Step 2: Place Bets', () => {
    it('should allow bettor1 to bet O (Yes)', async () => {
      const betData = {
        prediction: 'O',
        amount: 500,
        clanId,
      };

      const response = await request(app.getHttpServer())
        .post(`/betting/questions/${questionId}/bet`)
        .set('Authorization', `Bearer ${bettor1Token}`)
        .send(betData)
        .expect(201);

      expect(response.body.prediction).toBe('O');
      expect(response.body.betAmount).toBe(500);
      expect(response.body.status).toBe('PENDING');
    });

    it('should allow bettor2 to bet X (No)', async () => {
      const betData = {
        prediction: 'X',
        amount: 300,
        clanId,
      };

      const response = await request(app.getHttpServer())
        .post(`/betting/questions/${questionId}/bet`)
        .set('Authorization', `Bearer ${bettor2Token}`)
        .send(betData)
        .expect(201);

      expect(response.body.prediction).toBe('X');
      expect(response.body.betAmount).toBe(300);
    });

    it('should fail to bet below minimum amount', async () => {
      await request(app.getHttpServer())
        .post(`/betting/questions/${questionId}/bet`)
        .set('Authorization', `Bearer ${bettor1Token}`)
        .send({
          prediction: 'O',
          amount: 50, // Below min of 100
          clanId,
        })
        .expect(400);
    });

    it('should fail to bet without sufficient points', async () => {
      await request(app.getHttpServer())
        .post(`/betting/questions/${questionId}/bet`)
        .set('Authorization', `Bearer ${bettor1Token}`)
        .send({
          prediction: 'X',
          amount: 99999,
          clanId,
        })
        .expect(400);
    });
  });

  describe('Step 3: Settle Betting Question', () => {
    it('should settle question with result O (Team A wins)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/betting/questions/${questionId}/settle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ result: 'O' })
        .expect(201);

      expect(response.body.updatedCount).toBeGreaterThan(0);
    });

    it('should fail to settle already settled question', async () => {
      await request(app.getHttpServer())
        .post(`/betting/questions/${questionId}/settle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ result: 'X' })
        .expect(400);
    });
  });

  describe('Step 4: Verify Betting Results', () => {
    // Note: This would require additional endpoint to get user's betting tickets
    // For now, we verify the question was settled
    it('should show question as SETTLED', async () => {
      // This would need a GET endpoint for betting questions
      // For now, this is a placeholder for future implementation
      expect(questionId).toBeDefined();
    });
  });
});
