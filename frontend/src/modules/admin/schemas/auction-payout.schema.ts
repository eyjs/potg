import { z } from 'zod'

export const auctionPayoutSchema = z.object({
  amountPerUser: z
    .number({ message: '숫자를 입력하세요' })
    .int('정수만 입력 가능합니다')
    .min(1, '1P 이상 입력하세요')
    .max(1_000_000, '1,000,000P 이하로 입력하세요'),
})

export type AuctionPayoutFormValues = z.infer<typeof auctionPayoutSchema>
