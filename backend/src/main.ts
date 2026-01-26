import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'JWT 토큰을 입력하세요',
        in: 'header',
      },
      'access-token',
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
