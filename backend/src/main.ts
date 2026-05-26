import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('POTG Auction API')
    .setDescription('오버워치 클랜 경매 시스템 API 문서')
    .setVersion('1.0')
    .addCookieAuth(
      'access_token',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'access_token',
        description:
          'HttpOnly 쿠키 (브라우저 자동 전송). Swagger UI에서 직접 입력 불가 — 자체 로그인 후 쿠키 인계됨.',
      },
      'access_token',
    )
    .addTag('auth', '인증')
    .addTag('users', '사용자')
    .addTag('clans', '클랜')
    .addTag('auctions', '경매')
    .addTag('votes', '투표')
    .addTag('scrims', '내전')
    .addTag('betting', '베팅')
    .addTag('shop', '상점')
    .addTag('wallet', '지갑')
    .addTag('blind-date', '소개팅')
    .addTag('uploads', '파일 업로드')
    .addTag('admin-matches', '관리자 — 내전 운영')
    .addTag('admin-members', '관리자 — 회원/잔액')
    .addTag('admin-ledger', '관리자 — 포인트 원장')
    .addTag('admin-products', '관리자 — 상점')
    .addTag('admin-attendance', '관리자 — 출석 업로드')
    .addTag('admin-config', '관리자 — 시스템 설정')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  
  app.enableCors({
    origin: [
      'https://potg-psi.vercel.app',
      'https://potg.joonbi.co.kr',
      'http://localhost:3000',
      'http://localhost:3001',
      /\.vercel\.app$/ // Allow all Vercel preview deployments
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
