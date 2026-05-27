import { renderHook, act } from '@testing-library/react';
import { useMapRandomizer } from './use-map-randomizer';
import { ALL_MAP_TYPES, allMaps } from '../data/ow-maps';

describe('useMapRandomizer', () => {
  it('초기 상태: 모든 타입 선택 + 제외 0 + selectedMap null', () => {
    const { result } = renderHook(() => useMapRandomizer());
    expect(result.current.selectedTypes).toEqual(ALL_MAP_TYPES);
    expect(result.current.excludedMaps).toEqual([]);
    expect(result.current.selectedMap).toBeNull();
    expect(result.current.isSpinning).toBe(false);
    expect(result.current.history).toEqual([]);
    expect(result.current.availableMaps).toHaveLength(allMaps.length);
  });

  it('toggleMapType: control 제거 후 availableMaps 에 control 없음', () => {
    const { result } = renderHook(() => useMapRandomizer());
    act(() => result.current.toggleMapType('control'));
    expect(result.current.selectedTypes).not.toContain('control');
    expect(
      result.current.availableMaps.every((m) => m.type !== 'control'),
    ).toBe(true);
  });

  it('toggleMapType: 마지막 타입 1개는 제거 불가', () => {
    const { result } = renderHook(() => useMapRandomizer());
    // 4개 제거.
    act(() => {
      result.current.toggleMapType('control');
    });
    act(() => {
      result.current.toggleMapType('escort');
    });
    act(() => {
      result.current.toggleMapType('hybrid');
    });
    act(() => {
      result.current.toggleMapType('push');
    });
    // 마지막 1개 제거 시도 — 무시되어야 함.
    act(() => {
      result.current.toggleMapType('flashpoint');
    });
    expect(result.current.selectedTypes).toEqual(['flashpoint']);
  });

  it('toggleExcludedMap: busan 추가/제거', () => {
    const { result } = renderHook(() => useMapRandomizer());
    act(() => result.current.toggleExcludedMap('busan'));
    expect(result.current.excludedMaps).toContain('busan');
    expect(result.current.availableMaps.find((m) => m.id === 'busan')).toBeUndefined();

    act(() => result.current.toggleExcludedMap('busan'));
    expect(result.current.excludedMaps).not.toContain('busan');
  });

  it('reset: selectedMap + history 초기화', () => {
    const { result } = renderHook(() => useMapRandomizer());
    // 의도적으로 reset 호출만 검증 (randomize 는 timer 의존).
    act(() => result.current.reset());
    expect(result.current.selectedMap).toBeNull();
    expect(result.current.history).toEqual([]);
  });
});
