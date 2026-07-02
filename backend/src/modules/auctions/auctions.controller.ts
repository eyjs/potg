import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { AuctionsService } from './auctions.service';
import { AuctionGateway } from './auction.gateway';
import { AuthGuard } from '@nestjs/passport';
import {
  CreateAuctionDto,
  JoinAuctionDto,
  BidDto,
} from './dto/create-auction.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

/**
 * 이미지 프록시 허용 호스트 (SSRF 방지) — **정확 일치**만 허용.
 * 멀티테넌트 CDN 접미사(*.cloudfront.net 등)는 공격자가 배포를 등록해 오픈 프록시로
 * 악용할 수 있어 사용하지 않는다. OverFast 초상화(전용 CloudFront 배포)·Discord 아바타·
 * OverFast API 호스트만 명시한다. OverFast 가 CDN 배포를 교체하면 이 목록을 갱신한다.
 */
const IMAGE_PROXY_ALLOWED_EXACT = new Set<string>([
  'overfast-api.tekrop.fr',
  'd15f34w2p8l1cc.cloudfront.net', // OverFast 영웅 초상화 배포
  'cdn.discordapp.com', // Discord 아바타
  'media.discordapp.net',
]);

function isAllowedImageHost(hostname: string): boolean {
  return IMAGE_PROXY_ALLOWED_EXACT.has(hostname.toLowerCase());
}

@Controller('auctions')
export class AuctionsController {
  constructor(
    private readonly auctionsService: AuctionsService,
    private readonly gateway: AuctionGateway,
  ) {}

  /**
   * REST 변이 후 방 전체에 최신 roomState 를 push.
   * 소켓 경로 변이는 gateway 가 직접 broadcast 하지만, REST 경로(팀장/매물
   * 등록·제거, 설정 변경 등)는 이것이 없으면 클라이언트가 새로고침해야
   * 반영되던 문제가 있었다. 브로드캐스트 실패는 응답을 막지 않는다.
   */
  private async broadcastAfter<T>(id: string, result: T): Promise<T> {
    try {
      await this.gateway.broadcastRoomState(id);
    } catch (error) {
      console.warn(`roomState broadcast 실패 (auction ${id}):`, error);
    }
    return result;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body() createAuctionDto: CreateAuctionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService.create(createAuctionDto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.auctionsService.findAll();
  }

  /**
   * 이미지 프록시 — 결과 포스터/그리드의 원격 이미지(OverFast 초상화·Discord 아바타)를
   * CORS 헤더와 함께 재전송한다. 원본 CDN이 ACAO 를 주지 않아 html-to-image 캡처 시
   * canvas 가 taint 되어 다운로드가 실패하던 문제를 해결한다.
   * SSRF 방지를 위해 https + 화이트리스트 호스트만 허용. (`:id` 라우트보다 먼저 선언)
   */
  @Get('image-proxy')
  async imageProxy(
    @Query('url') url: string,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    if (!url) throw new BadRequestException('url 파라미터가 필요합니다.');
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('잘못된 url 입니다.');
    }
    if (parsed.protocol !== 'https:' || !isAllowedImageHost(parsed.hostname)) {
      throw new BadRequestException('허용되지 않은 이미지 도메인입니다.');
    }

    // redirect 자동 추종 금지 — 화이트리스트 호스트가 내부/메타데이터 주소로
    // 리디렉트되어 SSRF 로 우회되는 것을 차단한다.
    const upstream = await fetch(parsed.toString(), {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      throw new BadRequestException('리디렉션은 허용되지 않습니다.');
    }
    if (!upstream.ok) {
      throw new BadRequestException('이미지를 불러오지 못했습니다.');
    }
    const contentType = upstream.headers.get('content-type') ?? 'image/png';
    if (!contentType.startsWith('image/')) {
      throw new BadRequestException('이미지가 아닙니다.');
    }
    const buf = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(buf);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auctionsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/join')
  join(
    @Param('id') id: string,
    @Body() joinDto: JoinAuctionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService.join(id, req.user.userId, joinDto.role);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/bid')
  bid(
    @Param('id') id: string,
    @Body() bidDto: BidDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // 소켓 경로와 동일한 검증/잠금 모델 사용 (즉시 차감 레거시 제거)
    return this.auctionsService.placeBidWithValidation(
      id,
      req.user.userId,
      bidDto.targetPlayerId,
      bidDto.amount,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/start')
  start(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.auctionsService
      .start(id, req.user.userId)
      .then((r) => this.broadcastAfter(id, r));
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/select-player')
  selectPlayer(
    @Param('id') id: string,
    @Body('playerId') playerId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService.selectPlayer(id, req.user.userId, playerId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/complete')
  complete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.auctionsService
      .complete(id, req.user.userId)
      .then((r) => this.broadcastAfter(id, r));
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/reset')
  reset(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.auctionsService
      .reset(id, req.user.userId)
      .then((r) => this.broadcastAfter(id, r));
  }

  // ========== 경매 마스터 기능 ==========

  // 매물 등록 (클랜원을 경매에 추가)
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/players')
  addPlayer(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService
      .addPlayer(id, req.user.userId, userId)
      .then((r) => this.broadcastAfter(id, r));
  }

  // 매물 일괄 등록
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/players/bulk')
  addPlayers(
    @Param('id') id: string,
    @Body('userIds') userIds: string[],
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService
      .addPlayers(id, req.user.userId, userIds)
      .then((r) => this.broadcastAfter(id, r));
  }

  // 게스트(비회원) 매물 수기 등록 — 이름 명단 업로드
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/players/guest')
  addGuestPlayers(
    @Param('id') id: string,
    @Body('names') names: string[],
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService
      .addGuestPlayers(id, req.user.userId, names)
      .then((r) => this.broadcastAfter(id, r));
  }

  // 참가자 제거
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/participants/:userId/remove')
  removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService
      .removeParticipant(id, req.user.userId, userId)
      .then((r) => this.broadcastAfter(id, r));
  }

  // 팀장 추가
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/captains')
  addCaptain(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService
      .addCaptain(id, req.user.userId, userId)
      .then((r) => this.broadcastAfter(id, r));
  }

  // 팀장 제거
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/captains/:userId/remove')
  removeCaptain(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService
      .removeCaptain(id, req.user.userId, userId)
      .then((r) => this.broadcastAfter(id, r));
  }

  // 매물 대표 영웅 설정 (회원 영속)
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/participants/:userId/hero')
  setParticipantHero(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body('hero') hero: string | null,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService
      .setParticipantHero(id, req.user.userId, userId, hero ?? null)
      .then((r) => this.broadcastAfter(id, r));
  }

  // 팀명 설정 (CAPTAIN 행)
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/captains/:userId/team-name')
  setTeamName(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body('teamName') teamName: string | null,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService
      .setTeamName(id, req.user.userId, userId, teamName ?? null)
      .then((r) => this.broadcastAfter(id, r));
  }

  // 경매 설정 업데이트
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/settings')
  updateSettings(
    @Param('id') id: string,
    @Body()
    settings: {
      teamCount?: number;
      startingPoints?: number;
      turnTimeLimit?: number;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService
      .updateAuctionSettings(id, req.user.userId, settings)
      .then((r) => this.broadcastAfter(id, r));
  }

  // 경매 삭제
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/delete')
  deleteAuction(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.auctionsService.deleteAuction(id, req.user.userId);
  }
}
