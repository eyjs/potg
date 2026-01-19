import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { MainRole } from '../../../src/modules/users/entities/user.entity';

/**
 * Integration Test: User Registration and Authentication Flow
 *
 * Scenario:
 * 1. Register new user
 * 2. Login with credentials
 * 3. Access protected profile endpoint
 */
describe('Auth Flow - Integration Test (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  const testUser = {
    battleTag: `TestUser#${Date.now()}`,
    password: 'SecurePassword123!',
    mainRole: MainRole.DPS,
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

  describe('Step 1: User Registration', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.battleTag).toBe(testUser.battleTag);
      expect(response.body).not.toHaveProperty('password'); // Password should not be returned
      expect(response.body.mainRole).toBe(testUser.mainRole);
    });

    it('should fail to register with duplicate battleTag', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(400);
    });

    it('should fail to register without required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ battleTag: 'Incomplete#0000' })
        .expect(400);
    });
  });

  describe('Step 2: User Login', () => {
    it('should login successfully and receive JWT token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          battleTag: testUser.battleTag,
          password: testUser.password,
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      accessToken = response.body.access_token;
    });

    it('should fail to login with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          battleTag: testUser.battleTag,
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('should fail to login with non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          battleTag: 'NonExistent#0000',
          password: 'password',
        })
        .expect(401);
    });
  });

  describe('Step 3: Access Protected Routes', () => {
    it('should access profile with valid JWT token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.username).toBe(testUser.battleTag);
    });

    it('should fail to access profile without token', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should fail to access profile with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
