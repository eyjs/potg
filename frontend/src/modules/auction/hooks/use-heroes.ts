'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

/** OverFast API 영웅 항목 (공개 API, 무인증). */
export interface OverwatchHero {
  key: string
  name: string
  portrait: string
  role: 'tank' | 'damage' | 'support' | string
}

const OVERFAST_HEROES_URL = 'https://overfast-api.tekrop.fr/heroes?locale=ko-kr'

/**
 * 오버워치 영웅 목록 (한국어 이름 + 초상화 CDN URL).
 * 정적 데이터에 가까우므로 세션 내 재요청하지 않는다.
 */
export function useHeroes() {
  const query = useQuery({
    queryKey: ['overwatch', 'heroes'],
    queryFn: async (): Promise<OverwatchHero[]> => {
      const res = await fetch(OVERFAST_HEROES_URL)
      if (!res.ok) throw new Error(`영웅 목록 로드 실패 (${res.status})`)
      return res.json()
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  })

  /** key → 초상화 URL. 로드 전이거나 실패 시 빈 맵 (아이콘은 아바타/이니셜 폴백). */
  const portraitByKey = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of query.data ?? []) map.set(h.key, h.portrait)
    return map
  }, [query.data])

  return {
    heroes: query.data ?? [],
    portraitByKey,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
