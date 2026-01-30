'use client';

import { useState } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/common/components/ui/button';
import { Textarea } from '@/common/components/ui/textarea';
import { Checkbox } from '@/common/components/ui/checkbox';
import { Lock, Trash2, Send } from 'lucide-react';
import type { Guestbook } from '../types';

interface GuestbookSectionProps {
  guestbooks: Guestbook[];
  isOwner: boolean;
  canWrite: boolean;
  onWrite: (content: string, isSecret: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

export function GuestbookSection({
  guestbooks,
  isOwner,
  canWrite,
  onWrite,
  onDelete,
  onLoadMore,
  hasMore,
  isLoading,
}: GuestbookSectionProps) {
  const [content, setContent] = useState('');
  const [isSecret, setIsSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onWrite(content.trim(), isSecret);
      setContent('');
      setIsSecret(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
      <h3 className="text-lg font-semibold text-white mb-4">📝 방명록</h3>

      {/* 작성 폼 */}
      {canWrite && (
        <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg">
          <Textarea
            placeholder="방명록을 남겨보세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="bg-zinc-900 border-zinc-700 min-h-[80px] mb-3"
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <Checkbox
                checked={isSecret}
                onCheckedChange={(checked) => setIsSecret(!!checked)}
              />
              <Lock className="w-3 h-3" />
              비밀글
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">
                {content.length}/500
              </span>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Send className="w-4 h-4 mr-1" />
                등록
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 방명록 목록 */}
      <div className="space-y-4">
        {guestbooks.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            아직 방명록이 없어요. 첫 번째로 남겨보세요! 💬
          </div>
        ) : (
          guestbooks.map((item) => (
            <GuestbookItem
              key={item.id}
              item={item}
              canDelete={isOwner || item.writerId === item.profileId}
              onDelete={() => onDelete(item.id)}
            />
          ))
        )}
      </div>

      {/* 더 보기 */}
      {hasMore && (
        <div className="text-center mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? '로딩 중...' : '더 보기'}
          </Button>
        </div>
      )}
    </div>
  );
}

interface GuestbookItemProps {
  item: Guestbook;
  canDelete: boolean;
  onDelete: () => void;
}

function GuestbookItem({ item, canDelete, onDelete }: GuestbookItemProps) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className="flex gap-3 p-3 rounded-lg hover:bg-zinc-800/30 transition-colors"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {/* 아바타 */}
      <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
        {item.writer?.user?.avatarUrl ? (
          <Image
            src={item.writer.user.avatarUrl}
            alt={item.writer.user.battleTag}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {item.writer?.user?.battleTag?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-white text-sm">
            {item.writer?.user?.battleTag}
          </span>
          {item.isSecret && (
            <Lock className="w-3 h-3 text-zinc-500" />
          )}
          <span className="text-xs text-zinc-500">
            {formatDistanceToNow(new Date(item.createdAt), {
              addSuffix: true,
              locale: ko,
            })}
          </span>
        </div>
        <p className="text-zinc-300 text-sm whitespace-pre-wrap">
          {item.content}
        </p>
      </div>

      {/* 삭제 버튼 */}
      {canDelete && showDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-500 hover:text-red-500"
          onClick={onDelete}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
