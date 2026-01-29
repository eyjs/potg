'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Settings, Music, Users, Eye } from 'lucide-react';
import type { MemberProfile } from '../types';

interface ProfileHeaderProps {
  profile: MemberProfile;
  isOwner: boolean;
  isFollowing?: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onEdit?: () => void;
}

// 펫 이모지 매핑
const PET_EMOJI: Record<string, string> = {
  hamster: '🐹',
  cat: '🐱',
  dog: '🐕',
  owl: '🦉',
  dragon: '🐉',
  robot: '🤖',
  default: '',
};

// 프레임 스타일 매핑
const FRAME_STYLES: Record<string, string> = {
  default: 'ring-2 ring-zinc-700',
  gold: 'ring-4 ring-yellow-500 shadow-lg shadow-yellow-500/30',
  diamond: 'ring-4 ring-cyan-400 shadow-lg shadow-cyan-400/30 animate-pulse',
  fire: 'ring-4 ring-orange-500 shadow-lg shadow-orange-500/40',
  neon: 'ring-4 ring-purple-500 shadow-lg shadow-purple-500/50',
};

export function ProfileHeader({
  profile,
  isOwner,
  isFollowing,
  onFollow,
  onUnfollow,
  onEdit,
}: ProfileHeaderProps) {
  const [bgmPlaying, setBgmPlaying] = useState(false);

  const frameStyle = FRAME_STYLES[profile.frameId] || FRAME_STYLES.default;
  const petEmoji = profile.petId ? PET_EMOJI[profile.petId] || '🐾' : '';

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* 아바타 + 펫 영역 */}
        <div className="relative flex-shrink-0">
          <div className={`relative w-32 h-32 rounded-full overflow-hidden ${frameStyle}`}>
            {profile.avatarUrl || profile.member?.user?.avatarUrl ? (
              <Image
                src={profile.avatarUrl || profile.member?.user?.avatarUrl || ''}
                alt={profile.displayName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* 펫 */}
          {petEmoji && (
            <div className="absolute -bottom-2 -right-2 text-3xl animate-bounce">
              {petEmoji}
            </div>
          )}
        </div>

        {/* 프로필 정보 */}
        <div className="flex-1 min-w-0">
          {/* 이름 & 팔로우 */}
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white truncate">
              {profile.displayName}
            </h1>
            {!profile.isPublic && (
              <Badge variant="secondary" className="text-xs">
                🔒 비공개
              </Badge>
            )}
          </div>

          {/* 상태 메시지 */}
          {profile.statusMessage && (
            <p className="text-orange-400 text-lg mb-2 italic">
              &ldquo;{profile.statusMessage}&rdquo;
            </p>
          )}

          {/* 배틀태그 & 역할 */}
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-3">
            <span>{profile.member?.user?.battleTag}</span>
            <span>•</span>
            <Badge variant="outline" className="text-xs">
              {profile.member?.user?.mainRole || 'FLEX'}
            </Badge>
          </div>

          {/* 통계 */}
          <div className="flex items-center gap-6 text-sm mb-4">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-orange-500" />
              <span className="text-white font-semibold">{profile.followerCount}</span>
              <span className="text-zinc-500">팔로워</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-white font-semibold">{profile.followingCount}</span>
              <span className="text-zinc-500">팔로잉</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4 text-zinc-500" />
              <span className="text-zinc-500">TODAY</span>
              <span className="text-white">{profile.todayVisitors}</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-500">TOTAL</span>
              <span className="text-white">{profile.totalVisitors}</span>
            </div>
          </div>

          {/* 자기소개 */}
          {profile.bio && (
            <p className="text-zinc-300 text-sm mb-4 line-clamp-2">
              {profile.bio}
            </p>
          )}

          {/* 버튼 */}
          <div className="flex items-center gap-2">
            {isOwner ? (
              <>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-1" />
                  프로필 수정
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4 mr-1" />
                  꾸미기
                </Button>
              </>
            ) : (
              <Button
                variant={isFollowing ? 'outline' : 'default'}
                size="sm"
                onClick={isFollowing ? onUnfollow : onFollow}
                className={!isFollowing ? 'bg-orange-500 hover:bg-orange-600' : ''}
              >
                {isFollowing ? '팔로잉' : '팔로우'}
              </Button>
            )}
          </div>
        </div>

        {/* BGM 플레이어 */}
        {profile.bgmUrl && (
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setBgmPlaying(!bgmPlaying)}
            >
              <Music className={`w-4 h-4 ${bgmPlaying ? 'text-orange-500' : ''}`} />
            </Button>
            <div className="text-xs">
              <div className="text-zinc-400">🎵 BGM</div>
              <div className="text-white truncate max-w-[120px]">
                {profile.bgmTitle || 'Unknown'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
