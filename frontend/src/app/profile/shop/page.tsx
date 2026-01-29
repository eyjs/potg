'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Sparkles } from 'lucide-react';
import { ShopItemCard } from '@/modules/profiles/components/shop-item-card';
import type { ProfileItem, ProfileItemCategory } from '@/modules/profiles/types';
import { useClan } from '@/contexts/ClanContext';
import { toast } from 'sonner';

// Mock 데이터 (백엔드 API가 준비되면 교체)
const MOCK_ITEMS: ProfileItem[] = [
  {
    id: '1',
    code: 'THEME_NEON',
    name: '네온 테마',
    description: '사이버펑크 느낌의 네온 테마. 프로필이 화려해집니다!',
    category: 'THEME' as ProfileItemCategory,
    price: 500,
    previewUrl: null,
    assetUrl: null,
    assetData: { bgColor: '#0a0a1f', accentColor: '#ff00ff' },
    isLimited: false,
    isActive: true,
  },
  {
    id: '2',
    code: 'FRAME_GOLD',
    name: '골드 프레임',
    description: '황금빛으로 빛나는 프로필 프레임',
    category: 'FRAME' as ProfileItemCategory,
    price: 300,
    previewUrl: null,
    assetUrl: null,
    assetData: null,
    isLimited: false,
    isActive: true,
  },
  {
    id: '3',
    code: 'FRAME_DIAMOND',
    name: '다이아몬드 프레임',
    description: '반짝이는 다이아몬드 프레임. 애니메이션 포함!',
    category: 'FRAME' as ProfileItemCategory,
    price: 800,
    previewUrl: null,
    assetUrl: null,
    assetData: null,
    isLimited: true,
    isActive: true,
  },
  {
    id: '4',
    code: 'PET_HAMSTER',
    name: '햄스터',
    description: '귀여운 햄스터가 프로필에서 뛰어다녀요 🐹',
    category: 'PET' as ProfileItemCategory,
    price: 400,
    previewUrl: null,
    assetUrl: null,
    assetData: { emoji: '🐹' },
    isLimited: false,
    isActive: true,
  },
  {
    id: '5',
    code: 'PET_DRAGON',
    name: '용',
    description: '겐지의 용이 프로필을 지킵니다 🐉',
    category: 'PET' as ProfileItemCategory,
    price: 1000,
    previewUrl: null,
    assetUrl: null,
    assetData: { emoji: '🐉' },
    isLimited: true,
    isActive: true,
  },
  {
    id: '6',
    code: 'BGM_OW_THEME',
    name: '오버워치 메인 테마',
    description: '프로필 방문자에게 오버워치 메인 테마가 재생됩니다',
    category: 'BGM' as ProfileItemCategory,
    price: 200,
    previewUrl: null,
    assetUrl: '/audio/ow-theme.mp3',
    assetData: null,
    isLimited: false,
    isActive: true,
  },
];

const CATEGORIES = [
  { value: 'all', label: '전체', emoji: '🛒' },
  { value: 'THEME', label: '테마', emoji: '🎨' },
  { value: 'FRAME', label: '프레임', emoji: '🖼️' },
  { value: 'PET', label: '펫', emoji: '🐾' },
  { value: 'BGM', label: 'BGM', emoji: '🎵' },
  { value: 'EFFECT', label: '이펙트', emoji: '✨' },
];

export default function ProfileShopPage() {
  const { clanId } = useClan();

  const [items, setItems] = useState<ProfileItem[]>([]);
  const [ownedItems, setOwnedItems] = useState<Set<string>>(new Set());
  const [equippedItems, setEquippedItems] = useState<Record<string, string>>({});
  const [userPoints, setUserPoints] = useState(2450); // TODO: 실제 API로 교체
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadShopData = useCallback(async () => {
    try {
      setLoading(true);
      // TODO: 실제 API 호출 시 clanId 사용
      // const [itemsRes, ownedRes, profileRes] = await Promise.all([
      //   apiClient.get('/shop/profile-items'),
      //   apiClient.get(`/shop/my-items?clanId=${clanId}`),
      //   apiClient.get(`/profiles/me?clanId=${clanId}`),
      // ]);

      // Mock 데이터 사용
      await new Promise((r) => setTimeout(r, 500));
      setItems(MOCK_ITEMS);
      setOwnedItems(new Set(['1', '4'])); // Mock: 일부 아이템 보유
      setEquippedItems({ THEME: '1', PET: '4' }); // Mock: 일부 장착
    } catch (error) {
      console.error('Failed to load shop data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (clanId) {
      loadShopData();
    }
  }, [clanId, loadShopData]);

  const handlePurchase = async (item: ProfileItem) => {
    if (userPoints < item.price) {
      toast.error('포인트가 부족합니다!');
      return;
    }

    try {
      // TODO: 실제 API 호출
      // await apiClient.post('/shop/purchase', { itemId: item.id, clanId });

      setOwnedItems((prev) => new Set(prev).add(item.id));
      setUserPoints((prev) => prev - item.price);
      toast.success(`${item.name}을(를) 구매했습니다!`);
    } catch (error) {
      console.error('Failed to purchase:', error);
      toast.error('구매에 실패했습니다.');
    }
  };

  const handleEquip = async (item: ProfileItem) => {
    try {
      // TODO: 실제 API 호출
      // await apiClient.post('/profiles/me/equip', {
      //   clanId,
      //   [`${item.category.toLowerCase()}Id`]: item.code,
      // });

      setEquippedItems((prev) => ({ ...prev, [item.category]: item.id }));
      toast.success(`${item.name}을(를) 적용했습니다!`);
    } catch (error) {
      console.error('Failed to equip:', error);
      toast.error('적용에 실패했습니다.');
    }
  };

  const filteredItems = items.filter(
    (item) => category === 'all' || item.category === category
  );

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-4 space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 space-y-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-xl border border-orange-500/30 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-orange-400" />
              꾸미기 상점
            </h1>
            <p className="text-zinc-400 mt-1">
              프로필을 꾸미고 개성을 표현하세요!
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-lg border border-zinc-700">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="text-xl font-bold text-white">
              {userPoints.toLocaleString()}
            </span>
            <span className="text-zinc-400">P</span>
          </div>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="w-full bg-zinc-900 border border-zinc-800 flex-wrap h-auto gap-1 p-1">
          {CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat.value}
              value={cat.value}
              className="flex-1 min-w-[80px]"
            >
              <span className="mr-1">{cat.emoji}</span>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={category} className="mt-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800">
              이 카테고리에 아이템이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  owned={ownedItems.has(item.id)}
                  equipped={equippedItems[item.category] === item.id}
                  onPurchase={() => handlePurchase(item)}
                  onEquip={() => handleEquip(item)}
                  onPreview={() => {
                    // TODO: 미리보기 모달
                    toast.info(`${item.name} 미리보기`);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 안내 */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
        <h3 className="font-semibold text-white mb-2">💡 포인트 얻는 방법</h3>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li>• 매일 출석체크: 10P ~ 50P</li>
          <li>• 스크림 참여: 50P</li>
          <li>• 스크림 MVP: +100P</li>
          <li>• 게시글 작성: 5P</li>
          <li>• 밸런스 게임 투표: 3P</li>
        </ul>
      </div>
    </div>
  );
}