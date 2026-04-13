export interface CommunityPost {
  id: string;
  title: string | null;
  content: string;
  media: string[] | null;
  type: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  visibility: string;
  isPinned: boolean;
  author: {
    id: string;
    user: {
      nickname: string | null;
      battleTag: string;
      avatarUrl: string | null;
    };
  };
  createdAt: string;
}

export interface PostComment {
  id: string;
  content: string;
  likeCount: number;
  parentId: string | null;
  author: {
    id: string;
    user: {
      nickname: string | null;
      battleTag: string;
      avatarUrl: string | null;
    };
  };
  createdAt: string;
}

export interface CommunityFeedResponse {
  data: CommunityPost[];
  total: number;
}

export interface CommentsResponse {
  data: PostComment[];
  total: number;
}
