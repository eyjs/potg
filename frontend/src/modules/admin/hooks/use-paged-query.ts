import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

interface UsePagedQueryOptions<T> {
  queryKey: unknown[]
  queryFn: (skip: number, take: number) => Promise<T[]>
  take?: number
  enabled?: boolean
}

export function usePagedQuery<T>({
  queryKey,
  queryFn,
  take = 20,
  enabled = true,
}: UsePagedQueryOptions<T>) {
  const [skip, setSkip] = useState(0)

  const query = useQuery({
    queryKey: [...queryKey, skip, take],
    queryFn: () => queryFn(skip, take),
    enabled,
  })

  const handlePageChange = (newSkip: number) => {
    setSkip(newSkip)
  }

  const resetPage = () => setSkip(0)

  return {
    ...query,
    skip,
    take,
    handlePageChange,
    resetPage,
  }
}
