import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10" />

      <h1 className="text-[8rem] md:text-[12rem] font-black italic uppercase leading-none tracking-tighter text-primary/20 select-none">
        404
      </h1>

      <div className="space-y-3 -mt-6">
        <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter text-foreground">
          페이지를 <span className="text-primary">찾을 수 없습니다</span>
        </h2>
        <p className="text-muted-foreground text-sm uppercase tracking-widest">
          Page Not Found
        </p>
      </div>

      <Link
        href="/"
        className="mt-10 inline-flex items-center justify-center h-14 px-10 text-lg font-black italic uppercase tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 transition-colors -skew-x-6"
      >
        홈으로 돌아가기
      </Link>
    </div>
  )
}
