import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { ScrimResult, ScrimRankingEntry, TeamRanking } from "../types"

export function useScrimResult(auctionId: string | undefined) {
  return useQuery<ScrimResult | null>({
    queryKey: ["scrim-result", auctionId],
    queryFn: async () => {
      const res = await api.get(`/scrim-results/auction/${auctionId}`)
      return res.data
    },
    enabled: !!auctionId,
  })
}

export function useScrimRanking(clanId: string | undefined, limit = 50) {
  return useQuery<ScrimRankingEntry[]>({
    queryKey: ["scrim-ranking", clanId, limit],
    queryFn: async () => {
      const res = await api.get("/scrim-results/ranking", {
        params: { clanId, limit },
      })
      return res.data
    },
    enabled: !!clanId,
  })
}

export function useActivityRanking(clanId: string | undefined, limit = 50) {
  return useQuery<ScrimRankingEntry[]>({
    queryKey: ["activity-ranking", clanId, limit],
    queryFn: async () => {
      const res = await api.get("/wallet/ranking/activity", {
        params: { clanId, limit },
      })
      return res.data
    },
    enabled: !!clanId,
  })
}

export function useCreateScrimResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      auctionId: string
      rankings: TeamRanking[]
    }) => {
      const res = await api.post("/scrim-results", data)
      return res.data as ScrimResult
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["scrim-result", data.auctionId],
      })
    },
  })
}

export function useConfirmScrimResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/scrim-results/${id}/confirm`)
      return res.data as ScrimResult
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["scrim-result", data.auctionId],
      })
      queryClient.invalidateQueries({ queryKey: ["scrim-ranking"] })
      queryClient.invalidateQueries({ queryKey: ["activity-ranking"] })
    },
  })
}
