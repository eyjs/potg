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

export const ledgerApi = {
  list: (params?: LedgerListParams): Promise<PointTx[]> =>
    api.get<PointTx[]>('/admin/ledger', { params }).then((r) => r.data),

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
