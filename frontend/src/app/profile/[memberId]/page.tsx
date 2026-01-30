'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/common/components/ui/tabs';
import { Skeleton } from '@/common/components/ui/skeleton';
import { ProfileHeader } from '@/modules/profiles/components/profile-header';
import { PostCard } from '@/modules/profiles/components/post-card';
import { GuestbookSection } from '@/modules/profiles/components/guestbook-section';
import type { MemberProfile, Post, Guestbook } from '@/modules/profiles/types';
import { useClan } from '@/contexts/ClanContext';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';

export default function ProfilePage() {
  const { memberId } = useParams();
  const { clanId } = useClan();
  const { user } = useAuth();

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [guestbooks, setGuestbooks] = useState<Guestbook[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');

  const isOwner = profile?.member?.user?.id === user?.id;

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, followRes] = await Promise.all([
        api.get(`/profiles/${memberId}?clanId=${clanId}`),
        api.get(`/profiles/${memberId}/follow-status?clanId=${clanId}`),
      ]);
      setProfile(profileRes.data);
      setIsFollowing(followRes.data.isFollowing);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }, [memberId, clanId]);

  const loadPosts = useCallback(async () => {
    try {
      const res = await api.get(`/posts?clanId=${clanId}&authorId=${memberId}`);
      const postsData = res.data.data || [];
      setPosts(postsData);

      // 벌크 API로 좋아요 상태 한 번에 확인
      if (postsData.length > 0) {
        const postIds = postsData.map((p: Post) => p.id).join(',');
        const likeRes = await api.get(
          `/posts/bulk/like-status?clanId=${clanId}&postIds=${postIds}`
        );
        const likeStatus = likeRes.data.likeStatus || {};
        setLikedPosts(new Set(Object.keys(likeStatus).filter((id) => likeStatus[id])));
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  }, [clanId, memberId]);

  const loadGuestbooks = useCallback(async () => {
    try {
      const res = await api.get(`/profiles/${memberId}/guestbook?clanId=${clanId}`);
      setGuestbooks(res.data.data || []);
    } catch (error) {
      console.error('Failed to load guestbooks:', error);
    }
  }, [memberId, clanId]);

  useEffect(() => {
    if (memberId && clanId) {
      loadProfile();
    }
  }, [memberId, clanId, loadProfile]);

  useEffect(() => {
    if (profile && clanId) {
      if (activeTab === 'feed') {
        loadPosts();
      } else if (activeTab === 'guestbook') {
        loadGuestbooks();
      }
    }
  }, [profile, activeTab, clanId, loadPosts, loadGuestbooks]);

  const handleFollow = async () => {
    try {
      await api.post(`/profiles/${memberId}/follow?clanId=${clanId}`);
      setIsFollowing(true);
      if (profile) {
        setProfile({ ...profile, followerCount: profile.followerCount + 1 });
      }
    } catch (error) {
      console.error('Failed to follow:', error);
    }
  };

  const handleUnfollow = async () => {
    try {
      await api.delete(`/profiles/${memberId}/follow?clanId=${clanId}`);
      setIsFollowing(false);
      if (profile) {
        setProfile({ ...profile, followerCount: Math.max(0, profile.followerCount - 1) });
      }
    } catch (error) {
      console.error('Failed to unfollow:', error);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      await api.post(`/posts/${postId}/like?clanId=${clanId}`);
      setLikedPosts((prev) => new Set(prev).add(postId));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likeCount: p.likeCount + 1 } : p
        )
      );
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleUnlikePost = async (postId: string) => {
    try {
      await api.delete(`/posts/${postId}/like?clanId=${clanId}`);
      setLikedPosts((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likeCount: Math.max(0, p.likeCount - 1) } : p
        )
      );
    } catch (error) {
      console.error('Failed to unlike post:', error);
    }
  };

  const handleWriteGuestbook = async (content: string, isSecret: boolean) => {
    try {
      const res = await api.post(
        `/profiles/${memberId}/guestbook?clanId=${clanId}`,
        { content, isSecret }
      );
      setGuestbooks((prev) => [res.data, ...prev]);
    } catch (error) {
      console.error('Failed to write guestbook:', error);
      throw error;
    }
  };

  const handleDeleteGuestbook = async (id: string) => {
    try {
      await api.delete(`/profiles/guestbook/${id}?clanId=${clanId}`);
      setGuestbooks((prev) => prev.filter((g) => g.id !== id));
    } catch (error) {
      console.error('Failed to delete guestbook:', error);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-4 space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <div className="text-center py-12 text-zinc-500">
          프로필을 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-4">
      {/* 프로필 헤더 */}
      <ProfileHeader
        profile={profile}
        isOwner={isOwner}
        isFollowing={isFollowing}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
        onEdit={() => {/* TODO: 프로필 수정 모달 */}}
      />

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="feed" className="flex-1">
            📝 피드
          </TabsTrigger>
          <TabsTrigger value="clips" className="flex-1">
            🎬 클립
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex-1">
            🏆 업적
          </TabsTrigger>
          <TabsTrigger value="guestbook" className="flex-1">
            💬 방명록
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800">
              아직 작성한 글이 없어요.
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isOwner={isOwner}
                isLiked={likedPosts.has(post.id)}
                onLike={() => handleLikePost(post.id)}
                onUnlike={() => handleUnlikePost(post.id)}
                onComment={() => {/* TODO: 댓글 모달 */}}
                onShare={() => {/* TODO: 공유 */}}
                onEdit={() => {/* TODO: 수정 */}}
                onDelete={() => {/* TODO: 삭제 */}}
                onPin={() => {/* TODO: 고정 */}}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="clips">
          <div className="text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800">
            🎬 클립 기능은 준비 중입니다.
          </div>
        </TabsContent>

        <TabsContent value="achievements">
          <div className="text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800">
            🏆 업적 기능은 준비 중입니다.
          </div>
        </TabsContent>

        <TabsContent value="guestbook">
          <GuestbookSection
            guestbooks={guestbooks}
            isOwner={isOwner}
            canWrite={!!user}
            onWrite={handleWriteGuestbook}
            onDelete={handleDeleteGuestbook}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
