'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Check, Star } from 'lucide-react';
import type { ProfileItem, ProfileItemCategory } from '../types';

interface ShopItemCardProps {
  item: ProfileItem;
  owned: boolean;
  equipped: boolean;
  onPurchase: () => void;
  onEquip: () => void;
  onPreview: () => void;
}

const CATEGORY_EMOJI: Record<ProfileItemCategory, string> = {
  THEME: '🎨',
  FRAME: '🖼️',
  PET: '🐾',
  BGM: '🎵',
  EFFECT: '✨',
};

const CATEGORY_LABEL: Record<ProfileItemCategory, string> = {
  THEME: '테마',
  FRAME: '프레임',
  PET: '펫',
  BGM: 'BGM',
  EFFECT: '이펙트',
};

export function ShopItemCard({
  item,
  owned,
  equipped,
  onPurchase,
  onEquip,
  onPreview,
}: ShopItemCardProps) {
  return (
    <div
      className={`relative bg-zinc-900/50 rounded-xl border p-4 transition-all hover:scale-[1.02] cursor-pointer ${
        equipped
          ? 'border-orange-500 shadow-lg shadow-orange-500/20'
          : owned
          ? 'border-green-500/50'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
      onClick={onPreview}
    >
      {/* 뱃지 */}
      <div className="absolute top-2 right-2 flex gap-1">
        {item.isLimited && (
          <Badge className="bg-purple-500/20 text-purple-400 text-xs">
            <Star className="w-3 h-3 mr-1" />
            한정
          </Badge>
        )}
        {equipped && (
          <Badge className="bg-orange-500/20 text-orange-400 text-xs">
            <Check className="w-3 h-3 mr-1" />
            적용중
          </Badge>
        )}
        {owned && !equipped && (
          <Badge className="bg-green-500/20 text-green-400 text-xs">
            보유
          </Badge>
        )}
      </div>

      {/* 미리보기 */}
      <div className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800 mb-3">
        {item.previewUrl ? (
          <Image
            src={item.previewUrl}
            alt={item.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {CATEGORY_EMOJI[item.category]}
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{CATEGORY_EMOJI[item.category]}</span>
          <div>
            <div className="font-semibold text-white text-sm">
              {item.name}
            </div>
            <div className="text-xs text-zinc-500">
              {CATEGORY_LABEL[item.category]}
            </div>
          </div>
        </div>

        {item.description && (
          <p className="text-xs text-zinc-400 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* 가격 & 버튼 */}
        <div className="flex items-center justify-between pt-2">
          {!owned ? (
            <>
              <div className="flex items-center gap-1 text-amber-400">
                <Coins className="w-4 h-4" />
                <span className="font-bold">{item.price.toLocaleString()}</span>
              </div>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPurchase();
                }}
                className="bg-orange-500 hover:bg-orange-600"
              >
                구매
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant={equipped ? 'outline' : 'default'}
              onClick={(e) => {
                e.stopPropagation();
                onEquip();
              }}
              className={!equipped ? 'bg-green-600 hover:bg-green-700' : ''}
              disabled={equipped}
            >
              {equipped ? '적용중' : '적용하기'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}