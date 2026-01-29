export interface MemberProfile {
  id: string;
  memberId: string;
  displayName: string;
  bio: string | null;
  statusMessage: string | null;
  themeId: string;
  bgmUrl: string | null;
  bgmTitle: string | null;
  avatarUrl: string | null;
  frameId: string;
  petId: string | null;
  pinnedAchievements: string[];
  todayVisitors: number;
  totalVisitors: number;
  followerCount: number;
  followingCount: number;
  isPublic: boolean;
  member: {
    id: string;
    clanId: string;
    user: {
      id: string;
      battleTag: string;
      mainRole: string;
      avatarUrl: string | null;
    };
  };
}

export interface Post {
  id: string;
  authorId: string;
  clanId: string;
  type: PostType;
  content: string | null;
  media: string[] | null;
  metadata: Record<string, unknown> | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isPinned: boolean;
  visibility: PostVisibility;
  createdAt: string;
  author: {
    id: string;
    user: {
      id: string;
      battleTag: string;
      avatarUrl: string | null;
    };
  };
}

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

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentId: string | null;
  likeCount: number;
  createdAt: string;
  author: {
    id: string;
    user: {
      id: string;
      battleTag: string;
      avatarUrl: string | null;
    };
  };
}

export interface Guestbook {
  id: string;
  profileId: string;
  writerId: string;
  content: string;
  isSecret: boolean;
  createdAt: string;
  writer: {
    id: string;
    user: {
      id: string;
      battleTag: string;
      avatarUrl: string | null;
    };
  };
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
  follower?: {
    id: string;
    user: {
      id: string;
      battleTag: string;
      avatarUrl: string | null;
    };
  };
  following?: {
    id: string;
    user: {
      id: string;
      battleTag: string;
      avatarUrl: string | null;
    };
  };
}

export interface ProfileItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: ProfileItemCategory;
  price: number;
  previewUrl: string | null;
  assetUrl: string | null;
  assetData: Record<string, unknown> | null;
  isLimited: boolean;
  isActive: boolean;
}

export enum ProfileItemCategory {
  THEME = 'THEME',
  FRAME = 'FRAME',
  PET = 'PET',
  BGM = 'BGM',
  EFFECT = 'EFFECT',
}
