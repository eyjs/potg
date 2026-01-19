import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { MainRole } from '../../../src/modules/users/entities/user.entity';

/**
 * Integration Test: Clan Creation and Management Flow
 *
 * Scenario:
 * 1. Register user (clan master)
 * 2. Login and get JWT
 * 3. Create new clan
 * 4. Register second user
 * 5. Second user joins clan
 * 6. Verify clan members
 */
describe('Clan Flow - Integration Test (e2e)', () => {
  let app: INestApplication;
  let masterToken: string;
  let memberToken: string;
  let clanId: string;

  const masterUser = {
    battleTag: `Master#${Date.now()}`,
    password: 'MasterPass123!',
    mainRole: MainRole.TANK,
  };

  const memberUser = {
    battleTag: `Member#${Date.now()}`,
    password: 'MemberPass123!',
    mainRole: MainRole.SUPPORT,
  };

  const testClan = {
    name: `Test Clan ${Date.now()}`,
    tag: `TC${Date.now().toString().slice(-4)}`,
    description: 'Integration test clan',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Step 1: Setup Users', () => {
    it('should register clan master', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(masterUser)
        .expect(201);
    });

    it('should login clan master', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          battleTag: masterUser.battleTag,
          password: masterUser.password,
        })
        .expect(201);

      masterToken = response.body.access_token;
    });

    it('should register clan member', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(memberUser)
        .expect(201);
    });

    it('should login clan member', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          battleTag: memberUser.battleTag,
          password: memberUser.password,
        })
        .expect(201);

      memberToken = response.body.access_token;
    });
  });

  describe('Step 2: Create Clan', () => {
    it('should create clan successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/clans')
        .set('Authorization', `Bearer ${masterToken}`)
        .send(testClan)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(testClan.name);
      expect(response.body.tag).toBe(testClan.tag);
      clanId = response.body.id;
    });

    it('should fail to create clan without authentication', async () => {
      await request(app.getHttpServer())
        .post('/clans')
        .send(testClan)
        .expect(401);
    });
  });

  describe('Step 3: List Clans', () => {
    it('should get all clans', async () => {
      const response = await request(app.getHttpServer())
        .get('/clans')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const createdClan = response.body.find(
        (c: { id: string }) => c.id === clanId,
      );
      expect(createdClan).toBeDefined();
    });

    it('should get specific clan by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/clans/${clanId}`)
        .expect(200);

      expect(response.body.id).toBe(clanId);
      expect(response.body.name).toBe(testClan.name);
    });
  });

  describe('Step 4: Join Clan', () => {
    it('should allow member to join clan', async () => {
      const response = await request(app.getHttpServer())
        .post(`/clans/${clanId}/join`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.clanId).toBe(clanId);
      expect(response.body.role).toBe('MEMBER');
    });

    it('should fail to join same clan twice', async () => {
      await request(app.getHttpServer())
        .post(`/clans/${clanId}/join`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);
    });

    it('should fail to join clan without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/clans/${clanId}/join`)
        .expect(401);
    });
  });
});
