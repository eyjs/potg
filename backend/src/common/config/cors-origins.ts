/**
 * HTTP / WebSocket 공통 CORS allowlist (SSOT).
 * main.ts(enableCors)와 AuctionGateway(@WebSocketGateway cors)가 동일 목록을 사용한다.
 */
export const CORS_ALLOWED_ORIGINS: (string | RegExp)[] = [
  'https://potg-psi.vercel.app',
  'https://potg.joonbi.co.kr',
  'http://localhost:3000',
  'http://localhost:3001',
  /\.vercel\.app$/, // Vercel preview 배포 허용
];
