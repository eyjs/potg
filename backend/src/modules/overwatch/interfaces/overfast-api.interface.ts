/**
 * OverFastAPI 응답 인터페이스
 * API Docs: https://overfast-api.tekrop.fr
 */

export interface OverFastPlayerSummary {
  username: string;
  avatar: string | null;
  namecard: string | null;
  title: string | null;
  endorsement: {
    level: number;
    frame: string | null;
  };
  competitive: {
    pc?: CompetitiveInfo;
    console?: CompetitiveInfo;
  } | null;
  privacy: 'public' | 'private';
}

export interface CompetitiveInfo {
  season: number;
  tank?: RankInfo;
  damage?: RankInfo;
  support?: RankInfo;
  open?: RankInfo;
}

export interface RankInfo {
  division: string;
  tier: number;
  role_icon: string;
  rank_icon: string;
  skill_tier: number;
}

export interface OverFastPlayerStats {
  general: HeroStatsCategory[];
  heroes: Record<string, HeroStatsCategory[]>;
  roles: Record<string, HeroStatsCategory[]>;
}

export interface HeroStatsCategory {
  category: string;
  label: string;
  stats: HeroStat[];
}

export interface HeroStat {
  key: string;
  label: string;
  value: number | string;
}

export interface OverFastHero {
  key: string;
  name: string;
  portrait: string;
  role: string;
}

export interface OverFastHeroDetail {
  key: string;
  name: string;
  description: string;
  portrait: string;
  role: string;
  location: string;
  hitpoints: {
    health: number;
    armor: number;
    shields: number;
    total: number;
  };
  abilities: OverFastAbility[];
  story: {
    summary: string;
    media?: {
      type: string;
      link: string;
    };
  };
}

export interface OverFastAbility {
  name: string;
  description: string;
  icon: string;
  video?: {
    thumbnail: string;
    link: {
      mp4: string;
      webm: string;
    };
  };
}

export interface OverFastMap {
  name: string;
  screenshot: string;
  gamemodes: string[];
  location: string;
  country_code: string | null;
}

export interface OverFastGamemode {
  key: string;
  name: string;
  icon: string;
  description: string;
  screenshot: string;
}

export interface OverFastRole {
  key: string;
  name: string;
  icon: string;
  description: string;
}
