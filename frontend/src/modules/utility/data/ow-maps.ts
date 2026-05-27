/**
 * 오버워치 맵 정적 데이터 + 타입 라벨 정의.
 * map-randomizer 컴포넌트에서 분리.
 */

export type MapType = 'control' | 'escort' | 'hybrid' | 'push' | 'flashpoint';

export interface OWMap {
  id: string;
  name: string;
  nameKr: string;
  type: MapType;
  image: string;
}

export const mapTypeLabels: Record<MapType, { label: string; color: string }> =
  {
    control: { label: '쟁탈', color: '#00c3ff' },
    escort: { label: '호위', color: '#f99e1a' },
    hybrid: { label: '혼합', color: '#9d5cff' },
    push: { label: '밀기', color: '#4ade80' },
    flashpoint: { label: '거점점령', color: '#ff4649' },
  };

export const allMaps: OWMap[] = [
  // Control
  { id: 'busan', name: 'Busan', nameKr: '부산', type: 'control', image: '/overwatch-busan-map-futuristic-korean-city.jpg' },
  { id: 'ilios', name: 'Ilios', nameKr: '일리오스', type: 'control', image: '/overwatch-ilios-map-greek-islands.jpg' },
  { id: 'lijiang', name: 'Lijiang Tower', nameKr: '리장 타워', type: 'control', image: '/overwatch-lijiang-tower-map-chinese-architecture-n.jpg' },
  { id: 'nepal', name: 'Nepal', nameKr: '네팔', type: 'control', image: '/overwatch-nepal-map-himalayan-monastery.jpg' },
  { id: 'oasis', name: 'Oasis', nameKr: '오아시스', type: 'control', image: '/overwatch-oasis-map-futuristic-desert-city.jpg' },
  { id: 'antarctic', name: 'Antarctic Peninsula', nameKr: '남극 기지', type: 'control', image: '/overwatch-antarctic-peninsula-map-ice-research-sta.jpg' },
  { id: 'samoa', name: 'Samoa', nameKr: '사모아', type: 'control', image: '/overwatch-samoa-map-tropical-island-village.jpg' },

  // Escort
  { id: 'circuit', name: 'Circuit Royal', nameKr: '서킷 로열', type: 'escort', image: '/overwatch-circuit-royal-map-monaco-casino.jpg' },
  { id: 'dorado', name: 'Dorado', nameKr: '도라도', type: 'escort', image: '/overwatch-dorado-map-mexican-festival-night.jpg' },
  { id: 'havana', name: 'Havana', nameKr: '하바나', type: 'escort', image: '/overwatch-havana-map-cuban-streets-colorful.jpg' },
  { id: 'junkertown', name: 'Junkertown', nameKr: '쓰레기촌', type: 'escort', image: '/overwatch-junkertown-map-australian-outback-junkya.jpg' },
  { id: 'rialto', name: 'Rialto', nameKr: '리알토', type: 'escort', image: '/overwatch-rialto-map-venice-italy-canals.jpg' },
  { id: 'route66', name: 'Route 66', nameKr: '66번 국도', type: 'escort', image: '/overwatch-route-66-map-american-desert-highway.jpg' },
  { id: 'shambali', name: 'Shambali Monastery', nameKr: '샴발리 사원', type: 'escort', image: '/overwatch-shambali-monastery-map-nepal-temple.jpg' },
  { id: 'watchpoint', name: 'Watchpoint: Gibraltar', nameKr: '감시 기지: 지브롤터', type: 'escort', image: '/overwatch-watchpoint-gibraltar-map-rocket-base.jpg' },

  // Hybrid
  { id: 'blizzworld', name: 'Blizzard World', nameKr: '블리자드 월드', type: 'hybrid', image: '/placeholder.svg' },
  { id: 'eichenwalde', name: 'Eichenwalde', nameKr: '아이헨발데', type: 'hybrid', image: '/placeholder.svg' },
  { id: 'hollywood', name: 'Hollywood', nameKr: '할리우드', type: 'hybrid', image: '/placeholder.svg' },
  { id: 'kingsrow', name: "King's Row", nameKr: '왕의 길', type: 'hybrid', image: '/overwatch-kings-row-map.jpg' },
  { id: 'midtown', name: 'Midtown', nameKr: '미드타운', type: 'hybrid', image: '/placeholder.svg' },
  { id: 'numbani', name: 'Numbani', nameKr: '눔바니', type: 'hybrid', image: '/placeholder.svg' },
  { id: 'paraiso', name: 'Paraíso', nameKr: '파라이소', type: 'hybrid', image: '/placeholder.svg' },
  { id: 'hanamura', name: 'Hanamura', nameKr: '하나무라', type: 'hybrid', image: '/overwatch-hanamura.jpg' },

  // Push
  { id: 'colosseo', name: 'Colosseo', nameKr: '콜로세오', type: 'push', image: '/placeholder.svg' },
  { id: 'esperanca', name: 'Esperança', nameKr: '이스페란사', type: 'push', image: '/placeholder.svg' },
  { id: 'newqueen', name: 'New Queen Street', nameKr: '뉴 퀸 스트리트', type: 'push', image: '/placeholder.svg' },
  { id: 'runasapi', name: 'Runasapi', nameKr: '루나사피', type: 'push', image: '/placeholder.svg' },
  { id: 'hanaoka', name: 'Hanaoka', nameKr: '하나오카', type: 'push', image: '/placeholder.svg' },

  // Flashpoint
  { id: 'suravasa', name: 'Suravasa', nameKr: '수라바사', type: 'flashpoint', image: '/placeholder.svg' },
  { id: 'newjunkCity', name: 'New Junk City', nameKr: '뉴 정크 시티', type: 'flashpoint', image: '/placeholder.svg' },
  { id: 'junkCity', name: 'Junk City', nameKr: '폐품 도시', type: 'flashpoint', image: '/placeholder.svg' },
  { id: 'throne', name: 'Throne of Anubis', nameKr: '아누비스의 왕좌', type: 'flashpoint', image: '/placeholder.svg' },
];

export const ALL_MAP_TYPES: MapType[] = [
  'control',
  'escort',
  'hybrid',
  'push',
  'flashpoint',
];
