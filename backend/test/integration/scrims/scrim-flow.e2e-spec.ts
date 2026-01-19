import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { MainRole } from '../../../src/modules/users/entities/user.entity';

/**
 * Integration Test: Scrim Flow
 *
 * Scenario:
 * 1. Create clan and users
 * 2. Create scrim
 * 3. Assign teams (update scrim)
 * 4. Record match results
 * 5. Finish scrim with final scores
 */
describe('Scrim Flow - Integration Test (e2e)', () => {
  let app: INestApplication;
  let hostToken: string;
  let clanId: string;
  let scrimId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Setup: Register host
    const hostUser = {
      battleTag: `ScrimHost#${Date.now()}`,
      password: 'Pass123!',
      mainRole: MainRole.TANK,
    };

    await request(app.getHttpServer()).post('/auth/register').send(hostUser);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ battleTag: hostUser.battleTag, password: hostUser.password });
    hostToken = loginRes.body.access_token;

    // Create clan
    const clanRes = await request(app.getHttpServer())
      .post('/clans')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        name: `Scrim Clan ${Date.now()}`,
        tag: `SC${Date.now().toString().slice(-3)}`,
        description: 'Scrim test clan',
      });
    clanId = clanRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Step 1: Create Scrim', () => {
    it('should create scrim successfully', async () => {
      const scheduledDate = new Date();
      scheduledDate.setHours(scheduledDate.getHours() + 2);

      const scrimData = {
        title: '5v5 Practice Match',
        clanId,
        recruitmentType: 'MANUAL',
        scheduledDate: scheduledDate.toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/scrims')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(scrimData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(scrimData.title);
      expect(response.body.status).toBe('DRAFT');
      scrimId = response.body.id;
    });

    it('should fail to create scrim without authentication', async () => {
      await request(app.getHttpServer())
        .post('/scrims')
        .send({ title: 'Test', clanId })
        .expect(401);
    });
  });

  describe('Step 2: Update Scrim Status', () => {
    it('should update scrim to SCHEDULED', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/scrims/${scrimId}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ status: 'SCHEDULED' })
        .expect(200);

      expect(response.body.status).toBe('SCHEDULED');
    });

    it('should update scrim to IN_PROGRESS', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/scrims/${scrimId}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(response.body.status).toBe('IN_PROGRESS');
    });
  });

  describe('Step 3: Record Match Results', () => {
    it('should update team scores', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/scrims/${scrimId}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          teamAScore: 3,
          teamBScore: 2,
        })
        .expect(200);

      expect(response.body.teamAScore).toBe(3);
      expect(response.body.teamBScore).toBe(2);
    });
  });

  describe('Step 4: Finish Scrim', () => {
    it('should mark scrim as FINISHED', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/scrims/${scrimId}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ status: 'FINISHED' })
        .expect(200);

      expect(response.body.status).toBe('FINISHED');
    });

    it('should retrieve finished scrim details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/scrims/${scrimId}`)
        .expect(200);

      expect(response.body.id).toBe(scrimId);
      expect(response.body.status).toBe('FINISHED');
      expect(response.body.teamAScore).toBe(3);
      expect(response.body.teamBScore).toBe(2);
    });
  });

  describe('Step 5: List Scrims', () => {
    it('should list scrims by clan', async () => {
      const response = await request(app.getHttpServer())
        .get(`/scrims?clanId=${clanId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const ourScrim = response.body.find(
        (s: { id: string }) => s.id === scrimId,
      );
      expect(ourScrim).toBeDefined();
      expect(ourScrim.status).toBe('FINISHED');
    });
  });
});
