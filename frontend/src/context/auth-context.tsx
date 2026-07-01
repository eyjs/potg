'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
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

  // 슬라이딩 세션 keepalive: 로그인 상태에서 사용자가 페이지 내에서 활동하면
  // (클릭/키/스크롤/탭 복귀) 최소 주기마다 인증 요청을 보내 세션 쿠키를 갱신한다.
  // 실제 갱신은 백엔드 TokenRefreshInterceptor가 access_token 쿠키를 재발급하며 수행.
  // 경매처럼 오래 머무는 화면에서 60분 JWT 만료로 인한 강제 로그아웃을 방지한다.
  useEffect(() => {
    if (!user) return;

    const REFRESH_THROTTLE_MS = 4 * 60 * 1000; // 4분 (JWT 60분 만료보다 충분히 짧게)
    let lastPing = Date.now();
    let pinging = false;

    const ping = () => {
      const now = Date.now();
      if (pinging || now - lastPing < REFRESH_THROTTLE_MS) return;
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

    const onVisible = () => {
      if (document.visibilityState === 'visible') ping();
    };

    const events: Array<keyof WindowEventMap> = [
      'click',
      'keydown',
      'mousemove',
      'scroll',
    ];
    events.forEach((e) => window.addEventListener(e, ping, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      events.forEach((e) => window.removeEventListener(e, ping));
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<User>('/auth/profile');
      setUser(response.data);
    } catch {
      // 401 또는 네트워크 오류 — 미로그인 상태로 처리
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    // POST /auth/login → 백엔드가 HttpOnly 쿠키 set
    await api.post('/auth/login', credentials);
    // 쿠키가 설정된 후 프로필 재조회하여 user 상태 갱신
    await fetchUser();
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // 로그아웃 실패해도 클라이언트 상태는 클리어
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
