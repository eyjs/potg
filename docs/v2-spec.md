# POTG 클랜사이트 v2.0 확장 기능 기획서

## 📋 프로젝트 개요

**프로젝트명**: POTG (Play Of The Game) - 오버워치 클랜 커뮤니티 플랫폼  
**버전**: v2.0  
**작성일**: 2025-01-29  

### 기술 스택

```
Frontend:
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn UI (Radix UI 기반)
- React 19
- Socket.io-client (실시간 게임)

Backend:
- NestJS 11
- TypeScript
- TypeORM + PostgreSQL 16
- Socket.io (WebSocket Gateway)
- JWT 인증 (passport-jwt)

공통:
- 파일명: kebab-case
- 컴포넌트명: PascalCase
- any 사용 금지
- cn() 유틸리티로 Tailwind 클래스 병합
```

### 기존 프로젝트 구조

```
potg/
├── frontend/src/
│   ├── app/              # Next.js 페이지
│   ├── common/
│   │   ├── components/ui/  # Shadcn UI (수정 금지)
│   │   └── layouts/        # Header, BottomNav
│   ├── modules/          # 기능별 모듈
│   ├── lib/api.ts        # axios 설정
│   ├── lib/utils.ts      # cn() 유틸리티
│   └── context/          # Auth Context
├── backend/src/
│   ├── modules/          # NestJS 모듈
│   ├── common/           # 공통 데코레이터, 가드
│   └── app.module.ts
└── docs/                 # ERD, API 스펙
```

### 기존 Entity 참고

```typescript
// 이미 존재하는 Entity (참고용)
- User (id, username, battleTag, email, password, role, mainRole, rating, avatarUrl)
- Clan (id, name, tag, description)
- ClanMember (id, clanId, userId, role, totalPoints, lockedPoints, penaltyCount)
- PointLog (id, userId, clanId, amount, reason)
- Scrim, ScrimParticipant, ScrimMatch
- Auction, AuctionParticipant, AuctionBid
- Vote, VoteOption, VoteRecord
- BettingQuestion, BettingTicket
- ShopProduct, ShopPurchase
- BlindDateListing, BlindDateRequest, BlindDateMatch
```

---

## 🎯 확정 기능 목록

| 순번 | 기능 | 설명 | 우선순위 |
|------|------|------|----------|
| 1 | 프로필 & 피드 시스템 | 싸이월드 미니홈피 + 인스타/트위터 피드 하이브리드 | 🔴 P0 |
| 2 | 꾸미기 상점 | 테마, 프레임, 펫, BGM 구매 | 🔴 P0 |
| 3 | 방명록 | 프로필 방문 시 글 남기기 | 🔴 P0 |
| 4 | 게임 아케이드 | 미니게임 모음 + 통합 리더보드 | 🔴 P0 |
| 5 | 1:1 퀴즈 배틀 | 실시간 오버워치 퀴즈 대결 | 🔴 P0 |
| 6 | 밸런스 게임 | 양자택일 투표 + 토론 | 🟡 P1 |
| 7 | 클립 게시판 | YouTube/치지직 링크 공유 | 🟡 P1 |
| 8 | 오버체인 (끝말잇기) | 오버워치 용어 끝말잇기 | 🟡 P1 |
| 9 | 라이어 게임 | 라이어 찾기 파티게임 | 🟢 P2 |
| 10 | 오버마인드 (캐치마인드) | 그림 맞추기 파티게임 | 🟢 P2 |
| 11 | 스파이겜 (마피아) | 마피아 파티게임 | 🟢 P2 |
| 12 | 블라인드배틀 | 인디언포커 스타일 1:1 | 🟢 P2 |

---

## 📐 ERD (Entity Relationship Diagram)

### 1. 프로필 & 피드 시스템

```typescript
// ===========================================
// MemberProfile Entity
// 파일: backend/src/modules/profiles/entities/member-profile.entity.ts
// ===========================================
@Entity('member_profiles')
export class MemberProfile extends BaseEntity {
  @Column()
  @Index()
  memberId: string; // ClanMember.id (1:1 관계)

  @Column({ length: 50 })
  displayName: string; // 표시 이름

  @Column({ type: 'varchar', length: 140, nullable: true })
  bio: string; // 자기소개

  @Column({ type: 'varchar', length: 100, nullable: true })
  statusMessage: string; // 상태 메시지 "오늘도 용검 들고 갑니다"

  @Column({ type: 'varchar', length: 50, default: 'default' })
  themeId: string; // 적용된 테마 코드

  @Column({ type: 'varchar', nullable: true })
  bgmUrl: string; // 배경음악 URL

  @Column({ type: 'varchar', length: 100, nullable: true })
  bgmTitle: string; // BGM 제목

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string; // 아바타 이미지

  @Column({ type: 'varchar', length: 50, default: 'default' })
  frameId: string; // 프레임 코드

  @Column({ type: 'varchar', length: 50, nullable: true })
  petId: string; // 펫 코드

  @Column({ type: 'jsonb', default: [] })
  pinnedAchievements: string[]; // 고정 업적 ID 배열 (최대 5개)

  @Column({ type: 'int', default: 0 })
  todayVisitors: number;

  @Column({ type: 'int', default: 0 })
  totalVisitors: number;

  @Column({ type: 'int', default: 0 })
  followerCount: number;

  @Column({ type: 'int', default: 0 })
  followingCount: number;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  // Relations
  @OneToOne(() => ClanMember)
  @JoinColumn({ name: 'memberId' })
  member: ClanMember;

  @OneToMany(() => Guestbook, (g) => g.profile)
  guestbooks: Guestbook[];

  @OneToMany(() => ProfileVisit, (v) => v.profile)
  visits: ProfileVisit[];
}

// ===========================================
// Post Entity (피드 게시물)
// 파일: backend/src/modules/posts/entities/post.entity.ts
// ===========================================
export enum PostType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  CLIP = 'CLIP',
  SCRIM_RESULT = 'SCRIM_RESULT',
  ACHIEVEMENT = 'ACHIEVEMENT',
  GAME_RESULT = 'GAME_RESULT',
  BALANCE_GAME = 'BALANCE_GAME',
}

export enum PostVisibility {
  PUBLIC = 'PUBLIC',
  FOLLOWERS = 'FOLLOWERS',
  PRIVATE = 'PRIVATE',
}

@Entity('posts')
export class Post extends BaseEntity {
  @Column()
  @Index()
  authorId: string; // ClanMember.id

  @Column()
  @Index()
  clanId: string;

  @Column({ type: 'enum', enum: PostType, default: PostType.TEXT })
  type: PostType;

  @Column({ type: 'text', nullable: true })
  content: string; // 텍스트 내용

  @Column({ type: 'jsonb', nullable: true })
  media: string[]; // 이미지 URL 배열 (최대 4개)

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
  // type별 메타데이터:
  // CLIP: { videoUrl, platform, thumbnailUrl }
  // SCRIM_RESULT: { scrimId, teamAScore, teamBScore, mvpId }
  // ACHIEVEMENT: { achievementId, achievementName }
  // GAME_RESULT: { gameCode, score, rank }
  // BALANCE_GAME: { balanceGameId }

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  commentCount: number;

  @Column({ type: 'int', default: 0 })
  shareCount: number;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean; // 프로필 상단 고정

  @Column({ type: 'enum', enum: PostVisibility, default: PostVisibility.PUBLIC })
  visibility: PostVisibility;

  // Relations
  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'authorId' })
  author: ClanMember;

  @OneToMany(() => PostLike, (l) => l.post)
  likes: PostLike[];

  @OneToMany(() => PostComment, (c) => c.post)
  comments: PostComment[];
}

// ===========================================
// PostLike Entity
// 파일: backend/src/modules/posts/entities/post-like.entity.ts
// ===========================================
@Entity('post_likes')
@Unique(['postId', 'memberId'])
export class PostLike extends BaseEntity {
  @Column()
  @Index()
  postId: string;

  @Column()
  @Index()
  memberId: string;

  @ManyToOne(() => Post, (p) => p.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'memberId' })
  member: ClanMember;
}

// ===========================================
// PostComment Entity
// 파일: backend/src/modules/posts/entities/post-comment.entity.ts
// ===========================================
@Entity('post_comments')
export class PostComment extends BaseEntity {
  @Column()
  @Index()
  postId: string;

  @Column()
  authorId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'uuid', nullable: true })
  parentId: string; // 대댓글

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @ManyToOne(() => Post, (p) => p.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'authorId' })
  author: ClanMember;

  @ManyToOne(() => PostComment, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: PostComment;
}

// ===========================================
// Follow Entity
// 파일: backend/src/modules/profiles/entities/follow.entity.ts
// ===========================================
@Entity('follows')
@Unique(['followerId', 'followingId'])
export class Follow extends BaseEntity {
  @Column()
  @Index()
  followerId: string; // 팔로우 하는 사람

  @Column()
  @Index()
  followingId: string; // 팔로우 당하는 사람

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'followerId' })
  follower: ClanMember;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'followingId' })
  following: ClanMember;
}

// ===========================================
// Guestbook Entity (방명록)
// 파일: backend/src/modules/profiles/entities/guestbook.entity.ts
// ===========================================
@Entity('guestbooks')
export class Guestbook extends BaseEntity {
  @Column()
  @Index()
  profileId: string; // MemberProfile.id

  @Column()
  writerId: string; // ClanMember.id

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  isSecret: boolean; // 비밀글

  @ManyToOne(() => MemberProfile, (p) => p.guestbooks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileId' })
  profile: MemberProfile;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'writerId' })
  writer: ClanMember;
}

// ===========================================
// ProfileVisit Entity
// 파일: backend/src/modules/profiles/entities/profile-visit.entity.ts
// ===========================================
@Entity('profile_visits')
@Unique(['profileId', 'visitorId', 'visitDate'])
export class ProfileVisit extends BaseEntity {
  @Column()
  @Index()
  profileId: string;

  @Column({ nullable: true })
  visitorId: string; // null이면 비로그인 방문

  @Column({ type: 'date' })
  visitDate: Date;

  @ManyToOne(() => MemberProfile, (p) => p.visits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileId' })
  profile: MemberProfile;
}
```

### 2. 꾸미기 상점

```typescript
// ===========================================
// ProfileItem Entity (상점 아이템)
// 파일: backend/src/modules/shop/entities/profile-item.entity.ts
// ===========================================
export enum ProfileItemCategory {
  THEME = 'THEME',
  FRAME = 'FRAME',
  PET = 'PET',
  BGM = 'BGM',
  EFFECT = 'EFFECT',
}

@Entity('profile_items')
export class ProfileItem extends BaseEntity {
  @Column({ unique: true })
  code: string; // "THEME_NEON", "FRAME_GOLD", "PET_HAMSTER"

  @Column()
  name: string; // "네온 테마"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ProfileItemCategory })
  category: ProfileItemCategory;

  @Column({ type: 'int' })
  price: number; // 포인트 가격

  @Column({ type: 'varchar', nullable: true })
  previewUrl: string; // 미리보기 이미지

  @Column({ type: 'varchar', nullable: true })
  assetUrl: string; // 실제 에셋 (CSS 변수, 이미지 URL 등)

  @Column({ type: 'jsonb', nullable: true })
  assetData: Record<string, any>;
  // THEME: { bgColor, accentColor, textColor, ... }
  // FRAME: { borderStyle, glowColor, ... }
  // PET: { spriteUrl, animationData }
  // BGM: { audioUrl, duration }

  @Column({ type: 'boolean', default: false })
  isLimited: boolean; // 한정판

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}

// ===========================================
// MemberItem Entity (보유 아이템)
// 파일: backend/src/modules/shop/entities/member-item.entity.ts
// ===========================================
@Entity('member_items')
@Unique(['memberId', 'itemId'])
export class MemberItem extends BaseEntity {
  @Column()
  @Index()
  memberId: string;

  @Column()
  itemId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  purchasedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date; // 기간제 아이템

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'memberId' })
  member: ClanMember;

  @ManyToOne(() => ProfileItem)
  @JoinColumn({ name: 'itemId' })
  item: ProfileItem;
}
```

### 3. 게임 아케이드 & 리더보드

```typescript
// ===========================================
// Game Entity
// 파일: backend/src/modules/games/entities/game.entity.ts
// ===========================================
export enum GameCategory {
  SOLO = 'SOLO',       // 솔로 게임
  PVP = 'PVP',         // 1:1 대전
  PARTY = 'PARTY',     // 파티 게임 (2~8인)
}

@Entity('games')
export class Game extends BaseEntity {
  @Column({ unique: true })
  code: string; // "AIM_TRAINER", "QUIZ_BATTLE", "WORD_CHAIN", "LIAR", "CATCH_MIND"

  @Column()
  name: string; // "에임 트레이너"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'enum', enum: GameCategory })
  category: GameCategory;

  @Column({ type: 'int', default: 1 })
  minPlayers: number;

  @Column({ type: 'int', default: 1 })
  maxPlayers: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  totalPlayCount: number;
}

// ===========================================
// GameScore Entity
// 파일: backend/src/modules/games/entities/game-score.entity.ts
// ===========================================
@Entity('game_scores')
export class GameScore extends BaseEntity {
  @Column()
  @Index()
  gameId: string;

  @Column()
  @Index()
  memberId: string;

  @Column()
  @Index()
  clanId: string;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
  // AIM_TRAINER: { accuracy, avgReactionTime, totalHits }
  // QUIZ_BATTLE: { correctCount, avgAnswerTime }
  // WORD_CHAIN: { wordCount, longestWord }

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  playedAt: Date;

  @ManyToOne(() => Game)
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'memberId' })
  member: ClanMember;
}

// ===========================================
// Leaderboard Entity (캐싱용)
// 파일: backend/src/modules/games/entities/leaderboard.entity.ts
// ===========================================
export enum LeaderboardPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  ALL_TIME = 'ALL_TIME',
}

@Entity('leaderboards')
@Unique(['gameId', 'clanId', 'period', 'periodStart'])
export class Leaderboard extends BaseEntity {
  @Column({ nullable: true })
  gameId: string; // null이면 통합 리더보드

  @Column()
  @Index()
  clanId: string;

  @Column({ type: 'enum', enum: LeaderboardPeriod })
  period: LeaderboardPeriod;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column({ type: 'jsonb' })
  rankings: Array<{
    rank: number;
    memberId: string;
    displayName: string;
    score: number;
    playCount: number;
  }>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  calculatedAt: Date;
}
```

### 4. 파티 게임 시스템

```typescript
// ===========================================
// GameRoom Entity
// 파일: backend/src/modules/games/entities/game-room.entity.ts
// ===========================================
export enum GameRoomStatus {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED',
}

@Entity('game_rooms')
export class GameRoom extends BaseEntity {
  @Column()
  @Index()
  clanId: string;

  @Column()
  hostId: string; // ClanMember.id

  @Column()
  gameCode: string; // "WORD_CHAIN", "LIAR", "CATCH_MIND", "MAFIA"

  @Column({ length: 50 })
  roomName: string;

  @Column({ type: 'varchar', nullable: true })
  password: string; // 비밀방

  @Column({ type: 'enum', enum: GameRoomStatus, default: GameRoomStatus.WAITING })
  status: GameRoomStatus;

  @Column({ type: 'int' })
  maxPlayers: number;

  @Column({ type: 'int', default: 0 })
  currentPlayers: number;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;
  // WORD_CHAIN: { timeLimit, minWordLength }
  // LIAR: { discussionTime, voteTime }
  // CATCH_MIND: { rounds, drawTime }

  @Column({ type: 'int', default: 0 })
  currentRound: number;

  @Column({ type: 'int', default: 0 })
  totalRounds: number;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'hostId' })
  host: ClanMember;

  @OneToMany(() => GameRoomPlayer, (p) => p.room)
  players: GameRoomPlayer[];
}

// ===========================================
// GameRoomPlayer Entity
// 파일: backend/src/modules/games/entities/game-room-player.entity.ts
// ===========================================
@Entity('game_room_players')
@Unique(['roomId', 'memberId'])
export class GameRoomPlayer extends BaseEntity {
  @Column()
  @Index()
  roomId: string;

  @Column()
  memberId: string;

  @Column({ type: 'boolean', default: false })
  isHost: boolean;

  @Column({ type: 'boolean', default: false })
  isReady: boolean;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'jsonb', nullable: true })
  role: Record<string, any>;
  // LIAR: { isLiar: boolean, word: string }
  // MAFIA: { role: 'CITIZEN' | 'MAFIA' | 'DOCTOR' | 'DETECTIVE', isAlive: boolean }

  @Column({ type: 'int', default: 0 })
  orderIndex: number; // 턴 순서

  @ManyToOne(() => GameRoom, (r) => r.players, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: GameRoom;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'memberId' })
  member: ClanMember;
}
```

### 5. 1:1 퀴즈 배틀

```typescript
// ===========================================
// QuizQuestion Entity
// 파일: backend/src/modules/quiz/entities/quiz-question.entity.ts
// ===========================================
export enum QuizCategory {
  HERO = 'HERO',
  SKILL = 'SKILL',
  MAP = 'MAP',
  PATCH = 'PATCH',
  LORE = 'LORE',
  PRO_SCENE = 'PRO_SCENE',
}

export enum QuizDifficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
}

@Entity('quiz_questions')
export class QuizQuestion extends BaseEntity {
  @Column({ nullable: true })
  clanId: string; // null이면 글로벌 문제

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'jsonb' })
  options: string[]; // ['옵션1', '옵션2', '옵션3', '옵션4']

  @Column({ type: 'int' })
  correctIndex: number; // 0~3

  @Column({ type: 'enum', enum: QuizCategory })
  category: QuizCategory;

  @Column({ type: 'enum', enum: QuizDifficulty, default: QuizDifficulty.NORMAL })
  difficulty: QuizDifficulty;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string; // 이미지 문제

  @Column({ type: 'text', nullable: true })
  explanation: string; // 정답 해설

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}

// ===========================================
// QuizMatch Entity
// 파일: backend/src/modules/quiz/entities/quiz-match.entity.ts
// ===========================================
export enum QuizMatchStatus {
  WAITING = 'WAITING',      // 상대 대기
  READY = 'READY',          // 양쪽 준비 완료
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

@Entity('quiz_matches')
export class QuizMatch extends BaseEntity {
  @Column()
  @Index()
  clanId: string;

  @Column()
  player1Id: string;

  @Column({ nullable: true })
  player2Id: string;

  @Column({ type: 'enum', enum: QuizMatchStatus, default: QuizMatchStatus.WAITING })
  status: QuizMatchStatus;

  @Column({ type: 'int', default: 0 })
  player1Score: number;

  @Column({ type: 'int', default: 0 })
  player2Score: number;

  @Column({ type: 'uuid', nullable: true })
  winnerId: string;

  @Column({ type: 'int', default: 5 })
  totalRounds: number;

  @Column({ type: 'int', default: 0 })
  currentRound: number;

  @Column({ type: 'int', default: 0 })
  betAmount: number; // 베팅 포인트 (0이면 무베팅)

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  finishedAt: Date;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'player1Id' })
  player1: ClanMember;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'player2Id' })
  player2: ClanMember;

  @OneToMany(() => QuizRound, (r) => r.match)
  rounds: QuizRound[];
}

// ===========================================
// QuizRound Entity
// 파일: backend/src/modules/quiz/entities/quiz-round.entity.ts
// ===========================================
@Entity('quiz_rounds')
export class QuizRound extends BaseEntity {
  @Column()
  @Index()
  matchId: string;

  @Column()
  questionId: string;

  @Column({ type: 'int' })
  roundNumber: number;

  @Column({ type: 'int', nullable: true })
  player1Answer: number; // 선택한 옵션 인덱스 (null이면 미응답)

  @Column({ type: 'int', nullable: true })
  player2Answer: number;

  @Column({ type: 'int', nullable: true })
  player1Time: number; // ms

  @Column({ type: 'int', nullable: true })
  player2Time: number;

  @Column({ type: 'uuid', nullable: true })
  roundWinnerId: string; // null이면 무승부

  @ManyToOne(() => QuizMatch, (m) => m.rounds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'matchId' })
  match: QuizMatch;

  @ManyToOne(() => QuizQuestion)
  @JoinColumn({ name: 'questionId' })
  question: QuizQuestion;
}
```

### 6. 밸런스 게임

```typescript
// ===========================================
// BalanceGame Entity
// 파일: backend/src/modules/balance/entities/balance-game.entity.ts
// ===========================================
export enum BalanceGameStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

@Entity('balance_games')
export class BalanceGame extends BaseEntity {
  @Column()
  @Index()
  clanId: string;

  @Column()
  creatorId: string;

  @Column({ length: 100 })
  optionA: string; // "겐지랑 듀오 10판"

  @Column({ length: 100 })
  optionB: string; // "솜브라랑 듀오 10판"

  @Column({ type: 'varchar', nullable: true })
  imageA: string;

  @Column({ type: 'varchar', nullable: true })
  imageB: string;

  @Column({ type: 'int', default: 0 })
  voteCountA: number;

  @Column({ type: 'int', default: 0 })
  voteCountB: number;

  @Column({ type: 'enum', enum: BalanceGameStatus, default: BalanceGameStatus.ACTIVE })
  status: BalanceGameStatus;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'timestamp', nullable: true })
  closesAt: Date; // 자동 마감

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'creatorId' })
  creator: ClanMember;

  @OneToMany(() => BalanceVote, (v) => v.game)
  votes: BalanceVote[];

  @OneToMany(() => BalanceComment, (c) => c.game)
  comments: BalanceComment[];
}

// ===========================================
// BalanceVote Entity
// 파일: backend/src/modules/balance/entities/balance-vote.entity.ts
// ===========================================
export enum BalanceChoice {
  A = 'A',
  B = 'B',
}

@Entity('balance_votes')
@Unique(['gameId', 'memberId'])
export class BalanceVote extends BaseEntity {
  @Column()
  @Index()
  gameId: string;

  @Column()
  memberId: string;

  @Column({ type: 'enum', enum: BalanceChoice })
  choice: BalanceChoice;

  @ManyToOne(() => BalanceGame, (g) => g.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: BalanceGame;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'memberId' })
  member: ClanMember;
}

// ===========================================
// BalanceComment Entity
// 파일: backend/src/modules/balance/entities/balance-comment.entity.ts
// ===========================================
@Entity('balance_comments')
export class BalanceComment extends BaseEntity {
  @Column()
  @Index()
  gameId: string;

  @Column()
  memberId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @ManyToOne(() => BalanceGame, (g) => g.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: BalanceGame;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'memberId' })
  member: ClanMember;
}
```

### 7. 클립 게시판

```typescript
// ===========================================
// Clip Entity
// 파일: backend/src/modules/clips/entities/clip.entity.ts
// ===========================================
export enum ClipPlatform {
  YOUTUBE = 'YOUTUBE',
  CHZZK = 'CHZZK',
  TWITCH = 'TWITCH',
}

export enum ClipStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('clips')
export class Clip extends BaseEntity {
  @Column()
  @Index()
  clanId: string;

  @Column()
  uploaderId: string;

  @Column({ length: 100 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  videoUrl: string; // 원본 URL

  @Column({ type: 'enum', enum: ClipPlatform })
  platform: ClipPlatform;

  @Column({ type: 'varchar', nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'varchar', nullable: true })
  embedUrl: string; // 임베드용 URL

  @Column({ type: 'int', nullable: true })
  duration: number; // 초 단위

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  commentCount: number;

  @Column({ type: 'jsonb', default: [] })
  tags: string[]; // ['겐지', '용검', '6킬']

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean; // 베스트 클립

  @Column({ type: 'enum', enum: ClipStatus, default: ClipStatus.APPROVED })
  status: ClipStatus;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'uploaderId' })
  uploader: ClanMember;

  @OneToMany(() => ClipLike, (l) => l.clip)
  likes: ClipLike[];

  @OneToMany(() => ClipComment, (c) => c.clip)
  comments: ClipComment[];
}

// ===========================================
// ClipLike Entity
// 파일: backend/src/modules/clips/entities/clip-like.entity.ts
// ===========================================
@Entity('clip_likes')
@Unique(['clipId', 'memberId'])
export class ClipLike extends BaseEntity {
  @Column()
  @Index()
  clipId: string;

  @Column()
  memberId: string;

  @ManyToOne(() => Clip, (c) => c.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clipId' })
  clip: Clip;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'memberId' })
  member: ClanMember;
}

// ===========================================
// ClipComment Entity
// 파일: backend/src/modules/clips/entities/clip-comment.entity.ts
// ===========================================
@Entity('clip_comments')
export class ClipComment extends BaseEntity {
  @Column()
  @Index()
  clipId: string;

  @Column()
  authorId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'uuid', nullable: true })
  parentId: string;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @ManyToOne(() => Clip, (c) => c.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clipId' })
  clip: Clip;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'authorId' })
  author: ClanMember;
}
```

### 8. 파티 게임 - 끝말잇기, 라이어, 캐치마인드 데이터

```typescript
// ===========================================
// WordChainDict Entity (끝말잇기 사전)
// 파일: backend/src/modules/games/entities/word-chain-dict.entity.ts
// ===========================================
export enum WordCategory {
  HERO = 'HERO',
  SKILL = 'SKILL',
  MAP = 'MAP',
  ITEM = 'ITEM',
  TERM = 'TERM',
  GENERAL = 'GENERAL',
}

@Entity('word_chain_dict')
export class WordChainDict extends BaseEntity {
  @Column({ unique: true })
  word: string; // "겐지"

  @Column({ length: 1 })
  @Index()
  startChar: string; // "겐"

  @Column({ length: 1 })
  @Index()
  endChar: string; // "지"

  @Column({ type: 'enum', enum: WordCategory })
  category: WordCategory;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}

// ===========================================
// LiarTopic Entity (라이어게임 주제)
// 파일: backend/src/modules/games/entities/liar-topic.entity.ts
// ===========================================
@Entity('liar_topics')
export class LiarTopic extends BaseEntity {
  @Column()
  category: string; // "영웅", "맵", "스킬"

  @Column({ type: 'jsonb' })
  words: string[]; // ['겐지', '한조', '트레이서', ...]

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}

// ===========================================
// CatchMindWord Entity (캐치마인드 단어)
// 파일: backend/src/modules/games/entities/catch-mind-word.entity.ts
// ===========================================
export enum CatchMindDifficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
}

@Entity('catch_mind_words')
export class CatchMindWord extends BaseEntity {
  @Column()
  word: string; // "겐지"

  @Column({ type: 'enum', enum: WordCategory })
  category: WordCategory;

  @Column({ type: 'enum', enum: CatchMindDifficulty, default: CatchMindDifficulty.NORMAL })
  difficulty: CatchMindDifficulty;

  @Column({ type: 'varchar', nullable: true })
  hint: string; // 힌트

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
```

---

## 🔌 API 엔드포인트

### 1. 프로필 API

```
# 프로필
GET    /profiles/:memberId              # 프로필 조회
PATCH  /profiles/me                     # 내 프로필 수정
GET    /profiles/:memberId/visitors     # 방문자 목록

# 피드
GET    /posts                           # 피드 타임라인 (query: clanId, authorId, type)
GET    /posts/:id                       # 게시물 상세
POST   /posts                           # 게시물 작성
PATCH  /posts/:id                       # 게시물 수정
DELETE /posts/:id                       # 게시물 삭제
POST   /posts/:id/like                  # 좋아요
DELETE /posts/:id/like                  # 좋아요 취소
GET    /posts/:id/comments              # 댓글 목록
POST   /posts/:id/comments              # 댓글 작성
DELETE /posts/comments/:commentId       # 댓글 삭제

# 팔로우
GET    /profiles/:memberId/followers    # 팔로워 목록
GET    /profiles/:memberId/following    # 팔로잉 목록
POST   /profiles/:memberId/follow       # 팔로우
DELETE /profiles/:memberId/follow       # 언팔로우

# 방명록
GET    /profiles/:memberId/guestbook    # 방명록 목록
POST   /profiles/:memberId/guestbook    # 방명록 작성
DELETE /guestbook/:id                   # 방명록 삭제
```

### 2. 꾸미기 상점 API

```
GET    /shop/profile-items              # 아이템 목록 (query: category)
GET    /shop/profile-items/:id          # 아이템 상세
POST   /shop/profile-items/:id/purchase # 아이템 구매
GET    /members/me/items                # 내 보유 아이템
POST   /profiles/me/equip               # 아이템 장착 (body: { themeId, frameId, petId, bgmUrl })
```

### 3. 게임 아케이드 API

```
# 게임 목록
GET    /games                           # 게임 목록
GET    /games/:code                     # 게임 상세

# 점수/리더보드
POST   /games/:code/scores              # 점수 기록
GET    /games/:code/scores/me           # 내 최고 점수
GET    /games/:code/leaderboard         # 게임별 리더보드 (query: period)
GET    /games/leaderboard               # 통합 리더보드 (query: clanId, period)

# 게임방 (파티 게임용)
GET    /games/:code/rooms               # 방 목록
POST   /games/:code/rooms               # 방 생성
GET    /games/rooms/:roomId             # 방 정보
POST   /games/rooms/:roomId/join        # 방 입장
POST   /games/rooms/:roomId/leave       # 방 퇴장
POST   /games/rooms/:roomId/ready       # 준비/준비해제
POST   /games/rooms/:roomId/start       # 게임 시작 (방장만)
```

### 4. 퀴즈 배틀 API

```
GET    /quiz/questions                  # 문제 목록 (관리자용)
POST   /quiz/questions                  # 문제 등록 (관리자용)

GET    /quiz/matches                    # 매치 목록
POST   /quiz/matches                    # 매치 생성 (대기열 등록)
GET    /quiz/matches/:id                # 매치 상세
POST   /quiz/matches/:id/cancel         # 매치 취소

# WebSocket Events (quiz.gateway.ts)
# Client → Server
- 'quiz:join' { matchId }
- 'quiz:ready' { matchId }
- 'quiz:answer' { matchId, roundId, answerIndex }

# Server → Client
- 'quiz:matched' { matchId, opponent }
- 'quiz:round-start' { roundNumber, question, timeLimit }
- 'quiz:answer-result' { roundWinner, scores }
- 'quiz:match-end' { winner, finalScores }
```

### 5. 밸런스 게임 API

```
GET    /balance-games                   # 목록 (query: clanId, status)
POST   /balance-games                   # 생성
GET    /balance-games/:id               # 상세
POST   /balance-games/:id/vote          # 투표 (body: { choice: 'A' | 'B' })
POST   /balance-games/:id/close         # 마감 (생성자만)

GET    /balance-games/:id/comments      # 댓글 목록
POST   /balance-games/:id/comments      # 댓글 작성
DELETE /balance-games/comments/:id      # 댓글 삭제
```

### 6. 클립 API

```
GET    /clips                           # 목록 (query: clanId, tags, featured)
POST   /clips                           # 업로드 (body: { videoUrl, title, description, tags })
GET    /clips/:id                       # 상세
PATCH  /clips/:id                       # 수정
DELETE /clips/:id                       # 삭제
POST   /clips/:id/like                  # 좋아요
DELETE /clips/:id/like                  # 좋아요 취소
POST   /clips/:id/view                  # 조회수 증가

GET    /clips/:id/comments              # 댓글 목록
POST   /clips/:id/comments              # 댓글 작성
DELETE /clips/comments/:id              # 댓글 삭제

# 관리자
POST   /clips/:id/feature               # 베스트 지정
DELETE /clips/:id/feature               # 베스트 해제
```

### 7. 파티 게임 WebSocket Gateway

```typescript
// game.gateway.ts

// Client → Server Events
- 'room:join' { roomId, password? }
- 'room:leave' { roomId }
- 'room:ready' { roomId }
- 'room:start' { roomId }
- 'room:chat' { roomId, message }

// 끝말잇기 전용
- 'wordchain:submit' { roomId, word }

// 라이어게임 전용
- 'liar:chat' { roomId, message }
- 'liar:vote' { roomId, targetMemberId }
- 'liar:guess' { roomId, word }  // 라이어가 정답 맞추기

// 캐치마인드 전용
- 'catchmind:draw' { roomId, drawData }  // 그리기 데이터
- 'catchmind:guess' { roomId, word }     // 정답 입력
- 'catchmind:clear' { roomId }           // 캔버스 지우기

// Server → Client Events
- 'room:updated' { room, players }
- 'room:player-joined' { player }
- 'room:player-left' { memberId }
- 'room:game-started' { gameState }
- 'room:chat' { memberId, message, timestamp }

// 끝말잇기 전용
- 'wordchain:turn' { currentPlayerId, previousWord, timeLimit }
- 'wordchain:valid' { word, nextPlayerId }
- 'wordchain:invalid' { reason }
- 'wordchain:timeout' { eliminatedPlayerId }
- 'wordchain:end' { winner, scores }

// 라이어게임 전용
- 'liar:role-assigned' { isLiar, word? }  // 라이어는 word가 null
- 'liar:discussion-start' { timeLimit }
- 'liar:vote-start' { timeLimit }
- 'liar:vote-result' { votes, eliminatedId, wasLiar }
- 'liar:guess-chance' { timeLimit }       // 라이어 정답 기회
- 'liar:end' { liarId, word, liarWon, scores }

// 캐치마인드 전용
- 'catchmind:round-start' { drawerId, word?, category, timeLimit }
- 'catchmind:draw-update' { drawData }
- 'catchmind:correct' { guesserId, word }
- 'catchmind:round-end' { word, scores }
- 'catchmind:game-end' { winner, finalScores }
```

---

## 📁 파일 구조

### Backend

```
backend/src/modules/
├── profiles/                          # 프로필 & 피드
│   ├── entities/
│   │   ├── member-profile.entity.ts
│   │   ├── follow.entity.ts
│   │   ├── guestbook.entity.ts
│   │   └── profile-visit.entity.ts
│   ├── dto/
│   │   ├── update-profile.dto.ts
│   │   ├── create-guestbook.dto.ts
│   │   └── equip-items.dto.ts
│   ├── profiles.module.ts
│   ├── profiles.controller.ts
│   └── profiles.service.ts
│
├── posts/                             # 피드 게시물
│   ├── entities/
│   │   ├── post.entity.ts
│   │   ├── post-like.entity.ts
│   │   └── post-comment.entity.ts
│   ├── dto/
│   │   ├── create-post.dto.ts
│   │   └── create-comment.dto.ts
│   ├── posts.module.ts
│   ├── posts.controller.ts
│   └── posts.service.ts
│
├── games/                             # 게임 아케이드
│   ├── entities/
│   │   ├── game.entity.ts
│   │   ├── game-score.entity.ts
│   │   ├── leaderboard.entity.ts
│   │   ├── game-room.entity.ts
│   │   ├── game-room-player.entity.ts
│   │   ├── word-chain-dict.entity.ts
│   │   ├── liar-topic.entity.ts
│   │   └── catch-mind-word.entity.ts
│   ├── dto/
│   │   ├── create-room.dto.ts
│   │   ├── submit-score.dto.ts
│   │   └── join-room.dto.ts
│   ├── games.module.ts
│   ├── games.controller.ts
│   ├── games.service.ts
│   ├── leaderboard.service.ts
│   └── game.gateway.ts                # WebSocket Gateway
│
├── quiz/                              # 퀴즈 배틀
│   ├── entities/
│   │   ├── quiz-question.entity.ts
│   │   ├── quiz-match.entity.ts
│   │   └── quiz-round.entity.ts
│   ├── dto/
│   │   ├── create-question.dto.ts
│   │   └── create-match.dto.ts
│   ├── quiz.module.ts
│   ├── quiz.controller.ts
│   ├── quiz.service.ts
│   └── quiz.gateway.ts                # WebSocket Gateway
│
├── balance/                           # 밸런스 게임
│   ├── entities/
│   │   ├── balance-game.entity.ts
│   │   ├── balance-vote.entity.ts
│   │   └── balance-comment.entity.ts
│   ├── dto/
│   │   ├── create-balance-game.dto.ts
│   │   └── vote.dto.ts
│   ├── balance.module.ts
│   ├── balance.controller.ts
│   └── balance.service.ts
│
├── clips/                             # 클립 게시판
│   ├── entities/
│   │   ├── clip.entity.ts
│   │   ├── clip-like.entity.ts
│   │   └── clip-comment.entity.ts
│   ├── dto/
│   │   ├── create-clip.dto.ts
│   │   └── update-clip.dto.ts
│   ├── clips.module.ts
│   ├── clips.controller.ts
│   └── clips.service.ts
│
└── shop/                              # 기존 + 프로필 아이템 확장
    ├── entities/
    │   ├── shop-product.entity.ts     # 기존
    │   ├── shop-purchase.entity.ts    # 기존
    │   ├── profile-item.entity.ts     # 신규
    │   └── member-item.entity.ts      # 신규
    └── ...
```

### Frontend

```
frontend/src/
├── app/
│   ├── (main)/                        # 메인 레이아웃 그룹
│   │   ├── page.tsx                   # 피드 타임라인 (홈)
│   │   ├── feed/page.tsx              # 피드 (별도 라우트)
│   │   └── layout.tsx
│   │
│   ├── profile/
│   │   ├── [memberId]/
│   │   │   ├── page.tsx               # 프로필 메인 (피드 탭)
│   │   │   ├── clips/page.tsx         # 클립 탭
│   │   │   ├── achievements/page.tsx  # 업적 탭
│   │   │   └── guestbook/page.tsx     # 방명록 탭
│   │   ├── edit/page.tsx              # 프로필 수정
│   │   └── shop/page.tsx              # 꾸미기 상점
│   │
│   ├── games/
│   │   ├── page.tsx                   # 게임 아케이드 메인
│   │   ├── leaderboard/page.tsx       # 통합 리더보드
│   │   ├── aim-trainer/page.tsx       # 에임 트레이너
│   │   ├── reaction/page.tsx          # 반응속도 테스트
│   │   ├── quiz/
│   │   │   ├── page.tsx               # 퀴즈 로비
│   │   │   └── [matchId]/page.tsx     # 퀴즈 진행
│   │   ├── word-chain/
│   │   │   ├── page.tsx               # 끝말잇기 로비
│   │   │   └── [roomId]/page.tsx      # 게임방
│   │   ├── liar/
│   │   │   ├── page.tsx               # 라이어 로비
│   │   │   └── [roomId]/page.tsx      # 게임방
│   │   └── catch-mind/
│   │       ├── page.tsx               # 캐치마인드 로비
│   │       └── [roomId]/page.tsx      # 게임방
│   │
│   ├── balance/
│   │   ├── page.tsx                   # 밸런스 게임 목록
│   │   └── [id]/page.tsx              # 상세 (투표 + 댓글)
│   │
│   └── clips/
│       ├── page.tsx                   # 클립 목록
│       ├── upload/page.tsx            # 클립 업로드
│       └── [id]/page.tsx              # 클립 상세
│
└── modules/
    ├── profile/
    │   ├── components/
    │   │   ├── profile-header.tsx     # 프로필 헤더 (아바타, 스탯)
    │   │   ├── profile-feed.tsx       # 프로필 내 피드
    │   │   ├── follow-button.tsx
    │   │   ├── guestbook-list.tsx
    │   │   ├── guestbook-form.tsx
    │   │   └── profile-theme.tsx      # 테마 적용 wrapper
    │   └── hooks/
    │       ├── use-profile.ts
    │       └── use-follow.ts
    │
    ├── feed/
    │   ├── components/
    │   │   ├── post-card.tsx
    │   │   ├── post-form.tsx
    │   │   ├── post-actions.tsx       # 좋아요, 댓글, 공유
    │   │   ├── comment-list.tsx
    │   │   └── comment-form.tsx
    │   └── hooks/
    │       ├── use-feed.ts
    │       └── use-post.ts
    │
    ├── games/
    │   ├── components/
    │   │   ├── game-card.tsx
    │   │   ├── leaderboard-table.tsx
    │   │   ├── room-list.tsx
    │   │   ├── room-card.tsx
    │   │   ├── room-lobby.tsx         # 대기실 공통
    │   │   ├── player-list.tsx
    │   │   └── score-submit.tsx
    │   ├── aim-trainer/
    │   │   └── aim-game.tsx           # 에임 게임 컴포넌트
    │   ├── quiz/
    │   │   ├── quiz-lobby.tsx
    │   │   ├── quiz-game.tsx
    │   │   └── quiz-result.tsx
    │   ├── word-chain/
    │   │   ├── word-chain-game.tsx
    │   │   └── word-history.tsx
    │   ├── liar/
    │   │   ├── liar-game.tsx
    │   │   ├── liar-discussion.tsx
    │   │   └── liar-vote.tsx
    │   ├── catch-mind/
    │   │   ├── catch-mind-game.tsx
    │   │   ├── drawing-canvas.tsx
    │   │   └── guess-chat.tsx
    │   └── hooks/
    │       ├── use-game-socket.ts
    │       ├── use-room.ts
    │       └── use-leaderboard.ts
    │
    ├── balance/
    │   ├── components/
    │   │   ├── balance-card.tsx
    │   │   ├── balance-vote.tsx
    │   │   ├── balance-result.tsx
    │   │   └── balance-comments.tsx
    │   └── hooks/
    │       └── use-balance.ts
    │
    └── clips/
        ├── components/
        │   ├── clip-card.tsx
        │   ├── clip-player.tsx        # 영상 임베드
        │   ├── clip-upload-form.tsx
        │   └── clip-comments.tsx
        └── hooks/
            └── use-clips.ts
```

---

## 🎨 UI 참고 (Stitch 디자인용)

### 1. 프로필 페이지

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏠 겐지장인                                    [팔로우 147] [팔로잉 89] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌────────────────────────────────────────────────┐  │
│  │  [아바타]     │  │  "오늘도 용검 들고 갑니다 🐉"                   │  │
│  │  + 프레임     │  │                                                │  │
│  │  🐹 펫       │  │  Genji#31337 | DPS | 마스터                    │  │
│  │              │  │  🏆 10연승 | 📊 승률 67% | 🎮 게임랭킹 4위     │  │
│  │  💰 2,450P   │  │                                                │  │
│  └──────────────┘  │  [📝 글쓰기] [🎬 클립 올리기] [⚙️ 꾸미기]      │  │
│                    └────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ [피드] [클립] [업적] [방명록]                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  📰 피드 탭 내용...                                                     │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  🎵 BGM: 오버워치 메인 테마 ▶️               👥 TODAY 47 | TOTAL 1,234 │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. 피드 타임라인 (홈)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏠 POTG 피드                                        [글쓰기] [필터 ▼] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [전체] [클립] [전적] [잡담]                                            │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  [아바타] 클랜원A · 방금 전                              •••    │   │
│  │                                                                 │   │
│  │  오늘 내전 5연승 ㄹㅇ 미쳤다                                     │   │
│  │  팀원들 캐리 ㄱㅅㄱㅅ 🔥                                         │   │
│  │                                                                 │   │
│  │  [이미지]                                                       │   │
│  │                                                                 │   │
│  │  ❤️ 23  💬 8  🔗 공유                                           │   │
│  │                                                                 │   │
│  │  └ 클랜원B: ㅋㅋㅋ 고생했어                                     │   │
│  │  └ 댓글 더보기...                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🎬 클립 공유                                                    │   │
│  │  [YouTube 썸네일]                                                │   │
│  │  겐지 6킬 용검                                                   │   │
│  │  ❤️ 89  💬 23                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. 게임 아케이드

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🎮 게임 아케이드                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  🏆 이번 주 통합 랭킹                                                   │
│  1위 클랜원A 15,230P | 2위 클랜원B 12,100P | 3위 클랜원C 11,890P       │
│                                                        [전체보기]       │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  🎯 솔로 게임                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                         │
│  │ 🎯 에임    │ │ ⚡ 반응    │ │ 🧠 암기    │                         │
│  │ 트레이너  │ │ 속도      │ │ 력테스트  │                         │
│  │ 👤 1.2k   │ │ 👤 892    │ │ 👤 567    │                         │
│  └────────────┘ └────────────┘ └────────────┘                         │
│                                                                         │
│  ⚔️ 1:1 대전                                                           │
│  ┌────────────┐ ┌────────────┐                                        │
│  │ 🧠 퀴즈   │ │ 🃏 블라   │                                        │
│  │ 배틀     │ │ 인드배틀  │                                        │
│  │ 🎮 대기 3 │ │ 🎮 대기 1 │                                        │
│  └────────────┘ └────────────┘                                        │
│                                                                         │
│  👥 파티 게임 (2~8인)                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│  │ 🎨 캐치   │ │ 🔤 끝말   │ │ 🎭 라이   │ │ 🕵️ 마피   │          │
│  │ 마인드   │ │ 잇기      │ │ 어게임    │ │ 아        │          │
│  │ 🚪 방 2개 │ │ 🚪 방 1개 │ │ 🚪 방 3개 │ │ 🚪 방 0개 │          │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 구현 순서 (Phase별)

### Phase 1: 프로필 & 피드 시스템 (1주)

```
Day 1-2: Backend Entity & API
- [ ] MemberProfile Entity 생성
- [ ] Post, PostLike, PostComment Entity 생성
- [ ] Follow Entity 생성
- [ ] Guestbook, ProfileVisit Entity 생성
- [ ] profiles.module.ts, profiles.controller.ts, profiles.service.ts
- [ ] posts.module.ts, posts.controller.ts, posts.service.ts

Day 3-4: Frontend 프로필
- [ ] /profile/[memberId]/page.tsx
- [ ] profile-header.tsx, profile-feed.tsx
- [ ] follow-button.tsx
- [ ] guestbook-list.tsx, guestbook-form.tsx

Day 5: Frontend 피드
- [ ] /(main)/page.tsx (피드 타임라인)
- [ ] post-card.tsx, post-form.tsx
- [ ] post-actions.tsx, comment-list.tsx
```

### Phase 2: 꾸미기 상점 (3일)

```
Day 1: Backend
- [ ] ProfileItem, MemberItem Entity 생성
- [ ] 상점 API 추가 (shop.controller.ts)
- [ ] 기본 아이템 Seed 데이터

Day 2-3: Frontend
- [ ] /profile/shop/page.tsx
- [ ] 아이템 목록, 구매, 장착 UI
- [ ] 테마/프레임/펫 적용 로직
```

### Phase 3: 게임 아케이드 기반 (4일)

```
Day 1: Backend
- [ ] Game, GameScore, Leaderboard Entity 생성
- [ ] games.module.ts, games.controller.ts, games.service.ts
- [ ] leaderboard.service.ts (랭킹 계산)

Day 2: Frontend 아케이드 메인
- [ ] /games/page.tsx
- [ ] /games/leaderboard/page.tsx
- [ ] game-card.tsx, leaderboard-table.tsx

Day 3-4: 솔로 게임
- [ ] /games/aim-trainer/page.tsx (에임 트레이너)
- [ ] /games/reaction/page.tsx (반응속도)
- [ ] aim-game.tsx 구현
```

### Phase 4: 퀴즈 배틀 (4일)

```
Day 1: Backend
- [ ] QuizQuestion, QuizMatch, QuizRound Entity 생성
- [ ] quiz.module.ts, quiz.controller.ts, quiz.service.ts
- [ ] quiz.gateway.ts (WebSocket)
- [ ] 퀴즈 문제 Seed (100문제)

Day 2-4: Frontend
- [ ] /games/quiz/page.tsx (로비, 매칭 대기)
- [ ] /games/quiz/[matchId]/page.tsx (게임 진행)
- [ ] quiz-lobby.tsx, quiz-game.tsx, quiz-result.tsx
- [ ] use-quiz-socket.ts
```

### Phase 5: 파티 게임 (5일)

```
Day 1: Backend 공통
- [ ] GameRoom, GameRoomPlayer Entity 생성
- [ ] game.gateway.ts (파티 게임 WebSocket)
- [ ] 방 생성/입장/퇴장 로직

Day 2: 끝말잇기
- [ ] WordChainDict Entity + Seed
- [ ] 끝말잇기 게임 로직
- [ ] /games/word-chain/[roomId]/page.tsx

Day 3: 라이어게임
- [ ] LiarTopic Entity + Seed
- [ ] 라이어 게임 로직 (역할 배정, 투표)
- [ ] /games/liar/[roomId]/page.tsx

Day 4-5: 캐치마인드
- [ ] CatchMindWord Entity + Seed
- [ ] Canvas 드로잉 동기화
- [ ] /games/catch-mind/[roomId]/page.tsx
```

### Phase 6: 밸런스 게임 & 클립 (4일)

```
Day 1-2: 밸런스 게임
- [ ] BalanceGame, BalanceVote, BalanceComment Entity
- [ ] balance.module.ts, balance.controller.ts, balance.service.ts
- [ ] /balance/page.tsx, /balance/[id]/page.tsx

Day 3-4: 클립 게시판
- [ ] Clip, ClipLike, ClipComment Entity
- [ ] clips.module.ts, clips.controller.ts, clips.service.ts
- [ ] YouTube/치지직 메타데이터 추출 로직
- [ ] /clips/page.tsx, /clips/[id]/page.tsx
- [ ] clip-player.tsx (임베드)
```

---

## 🔧 Seed 데이터

### 프로필 아이템

```typescript
// backend/src/database/seeds/profile-items.seed.ts

const PROFILE_ITEMS = [
  // 테마
  { code: 'THEME_DEFAULT', name: '기본 테마', category: 'THEME', price: 0, assetData: { bgColor: '#0a0a0f', accentColor: '#f99e1a' } },
  { code: 'THEME_NEON', name: '네온 테마', category: 'THEME', price: 500, assetData: { bgColor: '#0a0a0f', accentColor: '#00ffff', glow: true } },
  { code: 'THEME_RETRO', name: '레트로 테마', category: 'THEME', price: 500, assetData: { bgColor: '#2d1b4e', accentColor: '#ff6b9d' } },
  { code: 'THEME_OVERWATCH', name: '오버워치 테마', category: 'THEME', price: 800, assetData: { bgColor: '#1a1a2e', accentColor: '#f99e1a' } },
  
  // 프레임
  { code: 'FRAME_DEFAULT', name: '기본 프레임', category: 'FRAME', price: 0 },
  { code: 'FRAME_GOLD', name: '골드 프레임', category: 'FRAME', price: 300, assetData: { borderColor: '#ffd700', glow: '#ffd700' } },
  { code: 'FRAME_DIAMOND', name: '다이아 프레임', category: 'FRAME', price: 500, assetData: { borderColor: '#b9f2ff', glow: '#b9f2ff' } },
  { code: 'FRAME_MASTER', name: '마스터 프레임', category: 'FRAME', price: 800, assetData: { borderColor: '#ffaa00', animated: true } },
  
  // 펫
  { code: 'PET_HAMSTER', name: '햄스터', category: 'PET', price: 300, assetData: { emoji: '🐹' } },
  { code: 'PET_ROBOT', name: '미니봇', category: 'PET', price: 400, assetData: { emoji: '🤖' } },
  { code: 'PET_BIRD', name: '가니메데', category: 'PET', price: 500, assetData: { emoji: '🐦' } },
];
```

### 퀴즈 문제

```typescript
// backend/src/database/seeds/quiz-questions.seed.ts

const QUIZ_QUESTIONS = [
  // HERO
  { question: '겐지의 궁극기 이름은?', options: ['용검', '용의 일격', '용의 분노', '용신검'], correctIndex: 0, category: 'HERO', difficulty: 'EASY' },
  { question: '아나의 생체 수류탄 지속시간은?', options: ['3초', '4초', '5초', '6초'], correctIndex: 1, category: 'SKILL', difficulty: 'NORMAL' },
  { question: '트레이서의 점멸 충전 시간은?', options: ['2초', '3초', '4초', '5초'], correctIndex: 1, category: 'SKILL', difficulty: 'NORMAL' },
  { question: '라인하르트 방벽의 최대 체력은?', options: ['1200', '1400', '1600', '1800'], correctIndex: 0, category: 'HERO', difficulty: 'HARD' },
  // ... 100문제
];
```

### 끝말잇기 사전

```typescript
// backend/src/database/seeds/word-chain.seed.ts

const WORD_CHAIN_DICT = [
  // 영웅
  { word: '겐지', category: 'HERO' },
  { word: '트레이서', category: 'HERO' },
  { word: '아나', category: 'HERO' },
  { word: '라인하르트', category: 'HERO' },
  // 스킬
  { word: '용검', category: 'SKILL' },
  { word: '점멸', category: 'SKILL' },
  { word: '돌진', category: 'SKILL' },
  // 맵
  { word: '하나무라', category: 'MAP' },
  { word: '일리오스', category: 'MAP' },
  { word: '부산', category: 'MAP' },
  // 용어
  { word: '탱커', category: 'TERM' },
  { word: '딜러', category: 'TERM' },
  { word: '힐러', category: 'TERM' },
  { word: '궁극기', category: 'TERM' },
  // ... 200단어
];
```

### 라이어게임 주제

```typescript
// backend/src/database/seeds/liar-topics.seed.ts

const LIAR_TOPICS = [
  { category: '영웅', words: ['겐지', '한조', '트레이서', '리퍼', '솜브라', '위도우메이커', '애쉬', '에코'] },
  { category: '맵', words: ['하나무라', '일리오스', '부산', '리장타워', '눈부처', '아이헨발데', '킹스로우', '넘버리'] },
  { category: '스킬', words: ['용검', '점멸', '돌진', '방벽', '수면총', '해킹', '은신', '부활'] },
  { category: '음식', words: ['치킨', '피자', '햄버거', '초밥', '라면', '떡볶이', '김밥', '짜장면'] },
];
```

---

## ⚠️ 주의사항

1. **Entity 변경 시 반드시 ERD 문서 업데이트**
2. **기존 컴포넌트(Shadcn UI) 수정 금지** - `frontend/src/common/components/ui/*`
3. **WebSocket 연결은 Socket.io 사용** - 기존 경매 시스템과 동일
4. **포인트 차감 로직은 기존 `PointLog` 활용**
5. **이미지 업로드는 기존 `uploads` 모듈 활용**
6. **모든 API는 JWT 인증 필수** - `@UseGuards(JwtAuthGuard)`

---

## 📎 참고 링크

- 기존 ERD: `docs/ERD.md`
- 기존 핸드오프: `docs/handoff.md`
- Notion WBS: https://www.notion.so/81de40b620ce47059f0a5cef62c2d4be
