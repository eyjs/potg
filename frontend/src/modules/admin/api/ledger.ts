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

export const ledgerApi = {
  list: (params?: LedgerListParams): Promise<PointTx[]> =>
    api.get('/admin/ledger', { params }).then((r) => r.data),

  summary: (): Promise<LedgerSummary> =>
    api.get('/admin/ledger/summary').then((r) => r.data),
}
