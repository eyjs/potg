import { isAxiosError } from "axios"
import { toast } from "sonner"

/**
 * API 에러에서 사용자 친화적 메시지를 추출한다.
 * AxiosError → response.data.message, 네트워크 에러, 타임아웃 등 분기 처리.
 */
export function getApiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    // 서버가 내려준 메시지 우선
    const serverMessage = error.response?.data?.message
    if (serverMessage) {
      return Array.isArray(serverMessage) ? serverMessage[0] : serverMessage
    }

    // 네트워크 에러 (서버 응답 없음)
    if (!error.response) {
      if (error.code === "ECONNABORTED") return "요청 시간이 초과되었습니다."
      return "서버에 연결할 수 없습니다. 네트워크를 확인해주세요."
    }

    // HTTP 상태 코드 기반 기본 메시지
    switch (error.response.status) {
      case 400: return "잘못된 요청입니다."
      case 401: return "로그인이 필요합니다."
      case 403: return "권한이 없습니다."
      case 404: return "요청한 리소스를 찾을 수 없습니다."
      case 409: return "이미 처리된 요청입니다."
      case 429: return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
      default:
        if (error.response.status >= 500) return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
    }
  }

  if (error instanceof Error) return error.message
  return "알 수 없는 오류가 발생했습니다."
}

/**
 * API 에러를 toast로 표시한다.
 * 기본적으로 toast.error를 사용하며, fallback 메시지를 지정할 수 있다.
 */
export function handleApiError(error: unknown, fallbackMessage?: string) {
  const message = fallbackMessage || getApiErrorMessage(error)
  toast.error(message)
}
