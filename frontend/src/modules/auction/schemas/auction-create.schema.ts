import { z } from 'zod'

/**
 * 새 경매방 생성 폼 스키마.
 *
 * - turnTimeLimit 30~60 (default 30): 마스터가 매물 설명할 시간 확보
 * - teamCount 2~8
 * - startingPoints 1000 이상 권장이나 백엔드는 min(1) 만 강제
 */
export const auctionCreateSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이내'),
  teamCount: z
    .number({ message: '팀 수를 입력해주세요' })
    .int()
    .min(2, '팀은 최소 2개')
    .max(8, '팀은 최대 8개'),
  startingPoints: z
    .number({ message: '시작 포인트를 입력해주세요' })
    .int()
    .min(1, '1 이상 입력해주세요'),
  turnTimeLimit: z
    .number({ message: '턴 시간을 입력해주세요' })
    .int()
    .min(30, '최소 30초')
    .max(60, '최대 60초'),
})

export type AuctionCreateFormValues = z.infer<typeof auctionCreateSchema>

export const AUCTION_CREATE_DEFAULTS: AuctionCreateFormValues = {
  title: '',
  teamCount: 4,
  startingPoints: 10000,
  turnTimeLimit: 30,
}
