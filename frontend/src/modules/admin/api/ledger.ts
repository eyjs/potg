import api from '@/lib/api'

export interface PointTx {
  id: string
  createdAt: string
  fromUserId?: string
  toUserId?: string
  amount: number
  reason: string
  memo?: string
}

export interface LedgerSummary {
  minted: number
  burned: number
  circulating: number
}

export interface LedgerListParams {
  userId?: string
  reason?: string
  from?: string
  to?: string
  skip?: number
  take?: number
}

export interface LedgerTimeseriesPoint {
  date: string
  minted: number
  burned: number
}

interface RawTimeseriesPoint {
  date: string
  minted: string
  burned: string
}

export interface LedgerTimeseriesParams {
  bucket?: 'day'
  days?: number
}

/** `/admin/ledger` 목록 응답 (페이지네이션). */
interface LedgerListResponse {
  total: number
  skip: number
  take: number
  rows: PointTx[]
}

export const ledgerApi = {
  // 백엔드는 { total, skip, take, rows } 형태로 반환하므로 rows 배열을 추출한다.
  list: (params?: LedgerListParams): Promise<PointTx[]> =>
    api
      .get<LedgerListResponse>('/admin/ledger', { params })
      .then((r) => r.data.rows),

  summary: (): Promise<LedgerSummary> =>
    api.get<LedgerSummary>('/admin/ledger/summary').then((r) => r.data),

  timeseries: (
    params?: LedgerTimeseriesParams,
  ): Promise<LedgerTimeseriesPoint[]> =>
    api
      .get<RawTimeseriesPoint[]>('/admin/ledger/timeseries', {
        params: { bucket: params?.bucket ?? 'day', days: params?.days ?? 30 },
      })
      .then((r) =>
        r.data.map((p) => ({
          date: p.date,
          minted: Number(p.minted),
          burned: Number(p.burned),
        })),
      ),
}
