import { forwardRef } from 'react'
import { Crown, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoomStatePlayer, RoomStateTeam } from '../../types'

interface Props {
  title: string
  teams: RoomStateTeam[]
  unsoldPlayers: RoomStatePlayer[]
  startingPoints: number
  /** 영웅 key → 초상화 URL (OverFast). 없으면 아바타/이니셜 폴백. */
  heroPortraits?: Map<string, string>
}

const ROLE_COLORS: Record<string, string> = {
  tank: '#3b82f6',
  dps: '#ef4444',
  support: '#22c55e',
  flex: '#a855f7',
}

/**
 * 경매 결과 포스터 — html-to-image 로 PNG 캡처할 정적 컴포넌트.
 *
 * 캡처 대상이므로 내부 스타일은 인라인 + 컬러 토큰 직접 지정 (CSS 변수 의존 X).
 * Tailwind 일부는 web 폰트 의존 — Exo 2 가 layout 에 로드되어 있어 영향 없음.
 */
export const AuctionResultPoster = forwardRef<HTMLDivElement, Props>(
  function AuctionResultPoster(
    { title, teams, unsoldPlayers, startingPoints, heroPortraits },
    ref,
  ) {
    const totalRecruited = teams.reduce((sum, t) => sum + t.members.length, 0)
    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    return (
      <div
        ref={ref}
        className="w-[1080px] p-10 space-y-6"
        style={{
          // 무대풍 배경 — 어두운 남보라 그라데이션 + 오버워치 오렌지 액센트
          background:
            'radial-gradient(1200px 500px at 50% -10%, #2a1e4d 0%, #17123000 60%), ' +
            'linear-gradient(180deg, #100c1f 0%, #0b0b12 55%, #0b0b0b 100%)',
          color: '#fafafa',
          fontFamily: 'var(--font-exo2), sans-serif',
        }}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between pb-6"
          style={{ borderBottom: '2px solid #f99e1a' }}
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Trophy style={{ color: '#f99e1a', width: 36, height: 36 }} />
              <h1
                className="font-black italic uppercase tracking-tighter text-4xl"
                style={{ letterSpacing: '-0.04em' }}
              >
                {title}
              </h1>
            </div>
            <p
              style={{
                color: '#a3a3a3',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontWeight: 700,
              }}
            >
              POTG AUCTION RESULT · {today}
            </p>
          </div>
          <div className="text-right" style={{ color: '#a3a3a3', fontSize: '12px' }}>
            <p>
              팀{' '}
              <span style={{ color: '#f99e1a', fontWeight: 900, fontSize: '20px' }}>
                {teams.length}
              </span>
            </p>
            <p>
              영입{' '}
              <span style={{ color: '#f99e1a', fontWeight: 900, fontSize: '20px' }}>
                {totalRecruited}
              </span>
              명
            </p>
            <p>
              시작{' '}
              <span style={{ color: '#f99e1a', fontWeight: 900, fontSize: '20px' }}>
                {startingPoints.toLocaleString()}
              </span>
              P
            </p>
          </div>
        </div>

        {/* 팀 그리드 */}
        <div
          className={cn(
            'grid gap-4',
            teams.length === 1 && 'grid-cols-1',
            teams.length === 2 && 'grid-cols-2',
            teams.length === 3 && 'grid-cols-3',
            teams.length >= 4 && 'grid-cols-2',
          )}
        >
          {teams.map((team, idx) => {
            const totalSpent = team.members
              .filter((m) => !m.wasUnsold)
              .reduce((s, m) => s + m.price, 0)
            return (
              <div
                key={team.captainId}
                style={{
                  backgroundColor: 'rgba(20, 18, 32, 0.85)',
                  border: '1px solid #35304f',
                  borderRadius: '6px',
                  padding: '16px',
                  boxShadow: '0 0 24px rgba(249, 158, 26, 0.06)',
                }}
              >
                <div
                  className="flex items-center justify-between pb-3 mb-3"
                  style={{ borderBottom: '1px solid #2a2a2a' }}
                >
                  <div className="flex items-center gap-2">
                    <PosterAvatar
                      name={team.captainName}
                      avatarUrl={team.captainAvatarUrl}
                      size={36}
                      ring="#f99e1a"
                    />
                    <div>
                      <p
                        style={{
                          fontSize: '10px',
                          color: '#a3a3a3',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Crown
                          style={{ color: '#f99e1a', width: 12, height: 12 }}
                        />
                        TEAM {idx + 1}
                      </p>
                      <p style={{ fontWeight: 900, fontSize: '18px' }}>
                        {team.teamName ?? `${team.captainName} 팀`}
                      </p>
                      <p style={{ fontSize: '11px', color: '#d4d4d4' }}>
                        팀장 {team.captainName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p style={{ fontSize: '10px', color: '#a3a3a3' }}>잔여</p>
                    <p
                      style={{
                        fontWeight: 900,
                        fontSize: '16px',
                        color: '#f99e1a',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {team.points.toLocaleString()}P
                    </p>
                  </div>
                </div>

                {team.members.length === 0 ? (
                  <p
                    style={{
                      color: '#737373',
                      fontSize: '12px',
                      textAlign: 'center',
                      padding: '12px 0',
                    }}
                  >
                    영입 선수 없음
                  </p>
                ) : (
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {team.members.map((m) => {
                      const color = ROLE_COLORS[m.role.toLowerCase()] ?? '#a855f7'
                      return (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-2"
                          style={{ fontSize: '13px' }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <PosterAvatar
                              name={m.name}
                              avatarUrl={
                                (m.hero
                                  ? (heroPortraits?.get(m.hero) ?? null)
                                  : null) ?? m.avatarUrl
                              }
                              size={22}
                            />
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '9px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '2px',
                                backgroundColor: `${color}20`,
                                color,
                                border: `1px solid ${color}50`,
                                minWidth: '40px',
                                textAlign: 'center',
                              }}
                            >
                              {m.role.toUpperCase()}
                            </span>
                            <span style={{ fontWeight: 600 }}>{m.name}</span>
                          </div>
                          <span
                            style={{
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 700,
                              color: m.wasUnsold ? '#737373' : '#f99e1a',
                              fontSize: '12px',
                            }}
                          >
                            {m.price.toLocaleString()}P
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <div
                  className="flex items-center justify-between mt-3 pt-2"
                  style={{
                    borderTop: '1px solid #2a2a2a',
                    fontSize: '10px',
                    color: '#a3a3a3',
                  }}
                >
                  <span>영입 {team.members.length}명</span>
                  <span>
                    총 사용{' '}
                    <span style={{ color: '#fafafa', fontWeight: 700 }}>
                      {totalSpent.toLocaleString()}
                    </span>
                    P
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* 미낙찰 */}
        {unsoldPlayers.length > 0 && (
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px dashed #404040',
              borderRadius: '4px',
              padding: '12px 16px',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                color: '#a3a3a3',
                textTransform: 'uppercase',
                fontWeight: 700,
                marginBottom: '6px',
              }}
            >
              미낙찰 ({unsoldPlayers.length})
            </p>
            <p style={{ fontSize: '12px', color: '#d4d4d4' }}>
              {unsoldPlayers.map((p) => p.name).join(' · ')}
            </p>
          </div>
        )}

        {/* 푸터 */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '10px',
            color: '#525252',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}
        >
          Generated by POTG · {today}
        </p>
      </div>
    )
  },
)

/** 캡처용 아바타 — 이미지 없으면 이니셜 원형. 인라인 스타일 (CSS 변수 미사용). */
function PosterAvatar({
  name,
  avatarUrl,
  size,
  ring,
}: {
  name: string
  avatarUrl: string | null
  size: number
  ring?: string
}) {
  const common: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '9999px',
    flexShrink: 0,
    border: ring ? `2px solid ${ring}` : '1px solid #3a3a3a',
  }
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- html-to-image 캡처 대상은 원본 img 필요
      <img
        src={avatarUrl}
        alt=""
        crossOrigin="anonymous"
        style={{ ...common, objectFit: 'cover' }}
      />
    )
  }
  return (
    <span
      style={{
        ...common,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#262233',
        color: '#d4d4d4',
        fontWeight: 700,
        fontSize: Math.max(10, Math.floor(size * 0.45)),
      }}
    >
      {name ? name[0] : '?'}
    </span>
  )
}
