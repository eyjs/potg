export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col">
      {/* Header skeleton */}
      <div className="h-16 border-b border-border/30 px-4 flex items-center justify-between">
        <div className="h-6 w-32 bg-muted/20 animate-pulse rounded" />
        <div className="flex gap-3">
          <div className="h-8 w-8 bg-muted/20 animate-pulse rounded-full" />
          <div className="h-8 w-8 bg-muted/20 animate-pulse rounded-full" />
        </div>
      </div>

      {/* Content skeleton */}
      <main className="container px-4 py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card skeleton 1 */}
            <div className="border border-border/30 rounded-lg p-6 space-y-4">
              <div className="h-7 w-48 bg-muted/20 animate-pulse rounded" />
              <div className="space-y-3">
                <div className="h-16 bg-muted/10 animate-pulse rounded" />
                <div className="h-16 bg-muted/10 animate-pulse rounded" />
              </div>
            </div>

            {/* Card skeleton 2 */}
            <div className="border border-border/30 rounded-lg p-6 space-y-4">
              <div className="h-7 w-36 bg-muted/20 animate-pulse rounded" />
              <div className="space-y-3">
                <div className="h-20 bg-muted/10 animate-pulse rounded" />
                <div className="h-20 bg-muted/10 animate-pulse rounded" />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="border border-border/30 rounded-lg p-6 space-y-4">
              <div className="h-7 w-28 bg-muted/20 animate-pulse rounded" />
              <div className="space-y-3">
                <div className="h-12 bg-muted/10 animate-pulse rounded" />
                <div className="h-12 bg-muted/10 animate-pulse rounded" />
                <div className="h-12 bg-muted/10 animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
