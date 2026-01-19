import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { MainRole } from '../../../src/modules/users/entities/user.entity';

/**
 * Integration Test: Vote Flow
 *
 * Scenario:
 * 1. Create clan and users
 * 2. Create vote (scrim participation)
 * 3. Users cast votes
 * 4. Close vote and check results
 */
describe('Vote Flow - Integration Test (e2e)', () => {
  let app: INestApplication;
  let masterToken: string;
  let user1Token: string;
  let user2Token: string;
  let clanId: string;
  let voteId: string;
  let optionIds: string[] = [];

  const users = [
    {
      battleTag: `VoteMaster#${Date.now()}`,
      password: 'Pass123!',
      mainRole: MainRole.TANK,
    },
    {
      battleTag: `Voter1#${Date.now()}`,
      password: 'Pass123!',
      mainRole: MainRole.DPS,
    },
    {
      battleTag: `Voter2#${Date.now()}`,
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

    // Setup: Register users
    for (const user of users) {
      await request(app.getHttpServer()).post('/auth/register').send(user);
    }

    // Login users
    const masterLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ battleTag: users[0].battleTag, password: users[0].password });
    masterToken = masterLogin.body.access_token;

    const user1Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ battleTag: users[1].battleTag, password: users[1].password });
    user1Token = user1Login.body.access_token;

    const user2Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ battleTag: users[2].battleTag, password: users[2].password });
    user2Token = user2Login.body.access_token;

    // Create clan
    const clanResponse = await request(app.getHttpServer())
      .post('/clans')
      .set('Authorization', `Bearer ${masterToken}`)
      .send({
        name: `Vote Test Clan ${Date.now()}`,
        tag: `VTC${Date.now().toString().slice(-3)}`,
        description: 'Clan for vote testing',
      });
    clanId = clanResponse.body.id;

    // Users join clan
    await request(app.getHttpServer())
      .post(`/clans/${clanId}/join`)
      .set('Authorization', `Bearer ${user1Token}`);

    await request(app.getHttpServer())
      .post(`/clans/${clanId}/join`)
      .set('Authorization', `Bearer ${user2Token}`);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Step 1: Create Vote', () => {
    it('should create vote for scrim participation', async () => {
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 24); // 24 hours from now

      const voteData = {
        clanId,
        title: 'Scrim participation this weekend?',
        deadline: deadline.toISOString(),
        scrimType: 'NORMAL',
        options: [
          { label: 'Yes, I can participate' },
          { label: 'No, I cannot participate' },
          { label: 'Maybe, depends on time' },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/votes')
        .set('Authorization', `Bearer ${masterToken}`)
        .send(voteData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(voteData.title);
      expect(response.body.status).toBe('OPEN');
      expect(response.body.options).toHaveLength(3);

      voteId = response.body.id;
      optionIds = response.body.options.map((opt: { id: string }) => opt.id);
    });

    it('should fail to create vote without authentication', async () => {
      await request(app.getHttpServer())
        .post('/votes')
        .send({
          clanId,
          title: 'Test',
          deadline: new Date().toISOString(),
          options: [{ label: 'A' }],
        })
        .expect(401);
    });
  });

  describe('Step 2: Cast Votes', () => {
    it('should allow user1 to cast vote', async () => {
      const response = await request(app.getHttpServer())
        .post(`/votes/${voteId}/cast`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ optionId: optionIds[0] })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should allow user2 to cast vote', async () => {
      const response = await request(app.getHttpServer())
        .post(`/votes/${voteId}/cast`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ optionId: optionIds[0] })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should fail to vote twice', async () => {
      await request(app.getHttpServer())
        .post(`/votes/${voteId}/cast`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ optionId: optionIds[1] })
        .expect(400);
    });

    it('should fail to vote without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/votes/${voteId}/cast`)
        .send({ optionId: optionIds[0] })
        .expect(401);
    });
  });

  describe('Step 3: Check Vote Results', () => {
    it('should get vote details with counts', async () => {
      const response = await request(app.getHttpServer())
        .get(`/votes/${voteId}`)
        .expect(200);

      expect(response.body.id).toBe(voteId);
      expect(response.body.options).toHaveLength(3);

      // First option should have 2 votes
      const firstOption = response.body.options.find(
        (opt: { id: string }) => opt.id === optionIds[0],
      );
      expect(firstOption.count).toBe(2);
    });

    it('should list all votes for clan', async () => {
      const response = await request(app.getHttpServer())
        .get(`/votes?clanId=${clanId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const ourVote = response.body.find(
        (v: { id: string }) => v.id === voteId,
      );
      expect(ourVote).toBeDefined();
    });
  });
});
