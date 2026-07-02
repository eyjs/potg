'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { ACCESS_TOKEN_STORAGE_KEY } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  battleTag: string;
  role: 'USER' | 'ADMIN';
  mainRole: 'TANK' | 'DPS' | 'SUPPORT' | 'FLEX';
  rating: number;
  avatarUrl?: string;
  clanId?: string;
  clanRole?: 'MASTER' | 'MANAGER' | 'MEMBER';
  bettingFloatingEnabled: boolean;
  /** User.pointsBalance 기반 잔액. 백엔드 /auth/profile에서 number로 변환 제공. */
  totalPoints: number;
  /** Phase 5-C 이후 항상 0. 베팅 잠금은 BettingStake에서 추적. */
  lockedPoints: number;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 마운트 시 쿠키 세션 확인 — HttpOnly 쿠키는 JS에서 읽을 수 없으므로
  // /auth/profile 호출 성공/실패로 로그인 여부를 판단한다.
  useEffect(() => {
    fetchUser();
  }, []);

  // 슬라이딩 세션 keepalive: 로그인 상태에서 (1) 사용자 활동 시 + (2) 주기적 타이머로
  // 인증 요청을 보내 access_token 쿠키를 갱신한다. 실제 갱신은 백엔드
  // TokenRefreshInterceptor가 쿠키를 재발급하며 수행. 경매처럼 오래 머무는(유휴 포함)
  // 화면에서 60분 JWT 만료로 인한 강제 로그아웃/요청 401을 방지한다.
  useEffect(() => {
    if (!user) return;

    const REFRESH_MS = 4 * 60 * 1000; // 4분 (JWT 60분 만료보다 충분히 짧게)
    let lastPing = Date.now();
    let pinging = false;

    const ping = (force = false) => {
      const now = Date.now();
      if (pinging || (!force && now - lastPing < REFRESH_MS)) return;
      lastPing = now;
      pinging = true;
      // 가벼운 인증 요청 → 인터셉터가 쿠키를 갱신. 실패는 조용히 무시.
      api
        .get('/auth/profile')
        .catch(() => undefined)
        .finally(() => {
          pinging = false;
        });
    };

    // (2) 주기적 갱신 — 유휴 상태에서도 세션 유지 (탭이 열려있는 한)
    const interval = setInterval(() => ping(true), REFRESH_MS);

    // (1) 활동 기반 갱신 (throttle) + 탭 복귀 시 즉시 갱신
    const onActivity = () => ping(false);
    const onVisible = () => {
      if (document.visibilityState === 'visible') ping(true);
    };
    const events: Array<keyof WindowEventMap> = [
      'click',
      'keydown',
      'mousemove',
      'scroll',
    ];
    events.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true }),
    );
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  // 프로필 조회 결과(User | null)를 반환한다. 반환값으로 로그인 성공 여부를
  // 즉시 판단할 수 있어 setState의 비동기성에 의존하지 않는다.
  const fetchUser = async (): Promise<User | null> => {
    setIsLoading(true);
    try {
      const response = await api.get<User>('/auth/profile');
      setUser(response.data);
      return response.data;
    } catch {
      // 401 또는 네트워크 오류 — 미로그인 상태로 처리
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    // POST /auth/login → 백엔드가 HttpOnly 쿠키 set + 응답 바디로 access_token 반환
    const response = await api.post<{ ok: true; access_token?: string }>(
      '/auth/login',
      credentials,
    );
    // 서드파티 쿠키 차단 브라우저 대응: 응답 바디의 토큰을 Bearer 폴백용으로 저장
    if (typeof window !== 'undefined' && response.data.access_token) {
      window.localStorage.setItem(
        ACCESS_TOKEN_STORAGE_KEY,
        response.data.access_token,
      );
    }
    // 쿠키(또는 Bearer 폴백)가 설정된 후 프로필 재조회하여 user 상태 갱신
    const fetchedUser = await fetchUser();
    if (!fetchedUser) {
      // 쿠키와 Bearer 폴백 모두 실패 — 로그인 페이지가 무한 새로고침되지 않도록
      // 실패를 명시적으로 표면화한다.
      throw new Error('로그인 세션 확인에 실패했습니다.');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // 로그아웃 실패해도 클라이언트 상태는 클리어
    }
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    }
    setUser(null);
    setIsLoading(false);
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      router.replace('/login');
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
