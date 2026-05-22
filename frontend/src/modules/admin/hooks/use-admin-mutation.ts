import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'

interface UseAdminMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>
  onSuccess?: (data: TData) => void
  onError?: (error: AxiosError) => void
  successMessage?: string
  invalidateKeys?: string[][]
}

export function useAdminMutation<TData, TVariables>({
  mutationFn,
  onSuccess,
  onError,
  successMessage,
  invalidateKeys = [],
}: UseAdminMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (successMessage) {
        toast.success(successMessage)
      }
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key })
      })
      onSuccess?.(data)
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError<{ message?: string }>
      const message =
        axiosErr.response?.data?.message ||
        axiosErr.message ||
        '오류가 발생했습니다.'
      toast.error(message)
      onError?.(axiosErr)
    },
  })
}
