export enum ActivityType {
  MEMBER_JOIN = 'MEMBER_JOIN',
  POINT_RECEIVED = 'POINT_RECEIVED',
  POINT_SENT = 'POINT_SENT',
  BET_WIN = 'BET_WIN',
  BET_LOSS = 'BET_LOSS',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  CLAN_CREATE = 'CLAN_CREATE',
}

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  userId: string;
  userBattleTag: string;
  userAvatarUrl: string | null;
  message: string;
  amount: number | null;
  createdAt: Date;
}
