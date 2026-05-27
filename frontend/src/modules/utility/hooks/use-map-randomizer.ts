'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  allMaps,
  ALL_MAP_TYPES,
  type MapType,
  type OWMap,
} from '../data/ow-maps';

const SPIN_TICK_MS = 100;
const SPIN_TICK_COUNT = 15;
const HISTORY_LIMIT = 10;

/**
 * 맵 추첨 로직 hook.
 *
 * - 8개로 분산되어 있던 useState 를 하나의 hook 으로 응집
 * - 컴포넌트는 순수 UI 만 담당
 * - 추첨 애니메이션은 setInterval ref 로 관리 (언마운트 시 cleanup)
 */
export function useMapRandomizer() {
  const [selectedTypes, setSelectedTypes] =
    useState<MapType[]>(ALL_MAP_TYPES);
  const [excludedMaps, setExcludedMaps] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<OWMap | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [history, setHistory] = useState<OWMap[]>([]);
  const spinTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const availableMaps = useMemo(
    () =>
      allMaps.filter(
        (map) =>
          selectedTypes.includes(map.type) && !excludedMaps.includes(map.id),
      ),
    [selectedTypes, excludedMaps],
  );

  const toggleMapType = useCallback((type: MapType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        // 최소 1개는 유지.
        return prev.length > 1 ? prev.filter((t) => t !== type) : prev;
      }
      return [...prev, type];
    });
  }, []);

  const toggleExcludedMap = useCallback((mapId: string) => {
    setExcludedMaps((prev) =>
      prev.includes(mapId) ? prev.filter((id) => id !== mapId) : [...prev, mapId],
    );
  }, []);

  const stopSpin = useCallback(() => {
    if (spinTimerRef.current !== null) {
      clearInterval(spinTimerRef.current);
      spinTimerRef.current = null;
    }
    setIsSpinning(false);
  }, []);

  const randomize = useCallback(() => {
    if (availableMaps.length === 0) return;
    // 진행 중이면 무시 (중복 호출 방지).
    if (spinTimerRef.current !== null) return;

    setIsSpinning(true);
    let spinCount = 0;

    spinTimerRef.current = setInterval(() => {
      const idx = Math.floor(Math.random() * availableMaps.length);
      setSelectedMap(availableMaps[idx]);
      spinCount += 1;

      if (spinCount > SPIN_TICK_COUNT) {
        if (spinTimerRef.current !== null) {
          clearInterval(spinTimerRef.current);
          spinTimerRef.current = null;
        }
        const finalIdx = Math.floor(Math.random() * availableMaps.length);
        const finalMap = availableMaps[finalIdx];
        setSelectedMap(finalMap);
        setHistory((prev) => [finalMap, ...prev].slice(0, HISTORY_LIMIT));
        setIsSpinning(false);
      }
    }, SPIN_TICK_MS);
  }, [availableMaps]);

  const reset = useCallback(() => {
    setSelectedMap(null);
    setHistory([]);
  }, []);

  return {
    // state
    selectedTypes,
    excludedMaps,
    selectedMap,
    isSpinning,
    history,
    availableMaps,
    // actions
    toggleMapType,
    toggleExcludedMap,
    randomize,
    reset,
    stopSpin,
  };
}
