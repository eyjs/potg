"use client"

import type React from "react"

import { useState } from "react"
import { ImagePlus, Trophy, Minus, Plus, Search, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface MatchMap {
  name: string
  image: string
}

interface Match {
  id: string
  gameNumber: number
  map: MatchMap | null
  result: "teamA" | "teamB" | "draw" | null
  screenshot: string | null
}

interface MapOption {
  name: string
  image: string
  type: string
}

interface MatchListProps {
  matches: Match[]
  isAdmin: boolean
  maps: MapOption[]
  onUpdateMatchCount: (count: number) => void
  onUpdateMatch: (
    matchId: string,
    updates: { map?: MatchMap | null; result?: "teamA" | "teamB" | "draw" | null; screenshot?: string | null },
  ) => void
}

function MapSelectorDialog({
  maps,
  currentMap,
  onSelect,
}: {
  maps: MapOption[]
  currentMap: MatchMap | null
  onSelect: (map: MatchMap | null) => void
}) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)

  const filteredMaps = maps.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))

  const handleSelect = (map: MapOption | null) => {
    if (map) {
      onSelect({ name: map.name, image: map.image })
    } else {
      onSelect(null)
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full h-24 rounded-sm border-2 border-dashed border-border/50 bg-muted/30 hover:border-primary/50 hover:bg-muted/50 transition-all overflow-hidden relative group">
          {currentMap ? (
            <>
              <img
                src={currentMap.image || "/placeholder.svg"}
                alt={currentMap.name}
                className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <span className="absolute bottom-2 left-2 font-bold text-sm text-foreground">{currentMap.name}</span>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
              <HelpCircle className="w-6 h-6" />
              <span className="text-xs font-medium">맵 선택</span>
            </div>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-bold italic uppercase tracking-wide text-foreground">맵 선택</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="맵 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-muted border-border"
            />
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto">
            {/* Random / TBD Option */}
            <button
              onClick={() => handleSelect(null)}
              className={cn(
                "aspect-video rounded-sm border-2 overflow-hidden relative group transition-all",
                !currentMap ? "border-primary" : "border-border/50 hover:border-primary/50",
              )}
            >
              <div className="w-full h-full bg-muted/50 flex flex-col items-center justify-center gap-1">
                <HelpCircle className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Random / TBD</span>
              </div>
            </button>

            {filteredMaps.map((map) => (
              <button
                key={map.name}
                onClick={() => handleSelect(map)}
                className={cn(
                  "aspect-video rounded-sm border-2 overflow-hidden relative group transition-all",
                  currentMap?.name === map.name ? "border-primary" : "border-border/50 hover:border-primary/50",
                )}
              >
                <img src={map.image || "/placeholder.svg"} alt={map.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <div className="absolute bottom-1 left-1 right-1">
                  <p className="text-xs font-bold text-foreground truncate">{map.name}</p>
                  <p className="text-[10px] text-muted-foreground">{map.type}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MatchItem({
  match,
  isAdmin,
  maps,
  onUpdate,
}: {
  match: Match
  isAdmin: boolean
  maps: MapOption[]
  onUpdate: (updates: {
    map?: MatchMap | null
    result?: "teamA" | "teamB" | "draw" | null
    screenshot?: string | null
  }) => void
}) {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      onUpdate({ screenshot: url })
    }
  }

  return (
    <AccordionItem value={match.id} className="border-border/50">
      <AccordionTrigger className="hover:no-underline px-4 py-3 bg-muted/30 hover:bg-muted/50 rounded-sm data-[state=open]:rounded-b-none">
        <div className="flex items-center gap-4 flex-1">
          <span className="font-bold text-primary uppercase tracking-wider">Game {match.gameNumber}</span>

          {/* Map Thumbnail */}
          <div className="flex items-center gap-2">
            {match.map ? (
              <>
                <div className="w-16 h-10 rounded-sm overflow-hidden border border-border/50">
                  <img
                    src={match.map.image || "/placeholder.svg"}
                    alt={match.map.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm text-foreground font-medium">{match.map.name}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground italic">맵 미정</span>
            )}
          </div>

          {/* Result Badge */}
          {match.result && (
            <Badge
              className={cn(
                "ml-auto mr-4 uppercase font-bold",
                match.result === "teamA" && "bg-accent text-accent-foreground",
                match.result === "teamB" && "bg-primary text-primary-foreground",
                match.result === "draw" && "bg-muted text-muted-foreground",
              )}
            >
              {match.result === "teamA" && "Team A Win"}
              {match.result === "teamB" && "Team B Win"}
              {match.result === "draw" && "Draw"}
            </Badge>
          )}
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 py-4 bg-card border-x border-b border-border/50 rounded-b-sm">
        <div className="space-y-4">
          {isAdmin ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Map Selection */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">맵</Label>
                <MapSelectorDialog maps={maps} currentMap={match.map} onSelect={(map) => onUpdate({ map })} />
              </div>

              {/* Result Toggle */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">결과</Label>
                <div className="flex gap-2">
                  <Button
                    variant={match.result === "teamA" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "flex-1",
                      match.result === "teamA"
                        ? "bg-accent text-accent-foreground"
                        : "border-accent/50 text-accent hover:bg-accent/20",
                    )}
                    onClick={() => onUpdate({ result: "teamA" })}
                  >
                    <Trophy className="w-3 h-3 mr-1" /> A
                  </Button>
                  <Button
                    variant={match.result === "draw" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "flex-1",
                      match.result === "draw"
                        ? "bg-muted text-muted-foreground"
                        : "border-border text-muted-foreground hover:bg-muted/50",
                    )}
                    onClick={() => onUpdate({ result: "draw" })}
                  >
                    무승부
                  </Button>
                  <Button
                    variant={match.result === "teamB" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "flex-1",
                      match.result === "teamB"
                        ? "bg-primary text-primary-foreground"
                        : "border-primary/50 text-primary hover:bg-primary/20",
                    )}
                    onClick={() => onUpdate({ result: "teamB" })}
                  >
                    <Trophy className="w-3 h-3 mr-1" /> B
                  </Button>
                </div>
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">스크린샷</Label>
                <label className="block w-full h-24 rounded-sm border-2 border-dashed border-border/50 bg-muted/30 hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer overflow-hidden">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  {match.screenshot ? (
                    <img
                      src={match.screenshot || "/placeholder.svg"}
                      alt="Screenshot"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
                      <ImagePlus className="w-6 h-6" />
                      <span className="text-xs">드래그 & 드롭</span>
                    </div>
                  )}
                </label>
              </div>
            </div>
          ) : /* User View */
          match.screenshot ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">스코어보드</p>
              <img
                src={match.screenshot || "/placeholder.svg"}
                alt="Scoreboard"
                className="w-full max-w-2xl rounded-sm border border-border"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">스코어보드 이미지 없음</p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export function MatchList({ matches, isAdmin, maps, onUpdateMatchCount, onUpdateMatch }: MatchListProps) {
  const matchCount = matches.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg italic uppercase tracking-wide text-foreground border-l-4 border-primary pl-3">
          경기 결과
        </h2>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">경기 수:</Label>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-border bg-transparent"
                onClick={() => onUpdateMatchCount(Math.max(1, matchCount - 1))}
                disabled={matchCount <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-bold text-foreground">{matchCount}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-border bg-transparent"
                onClick={() => onUpdateMatchCount(Math.min(9, matchCount + 1))}
                disabled={matchCount >= 9}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Card className="border-2 border-border bg-card overflow-hidden">
        <Accordion type="multiple" className="w-full">
          {matches.map((match) => (
            <MatchItem
              key={match.id}
              match={match}
              isAdmin={isAdmin}
              maps={maps}
              onUpdate={(updates) => onUpdateMatch(match.id, updates)}
            />
          ))}
        </Accordion>
      </Card>
    </div>
  )
}
