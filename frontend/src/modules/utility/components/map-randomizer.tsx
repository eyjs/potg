"use client"

import { useState } from "react"
import { Map, Dices, RotateCcw, Copy, Check, Filter } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Badge } from "@/common/components/ui/badge"
import { Checkbox } from "@/common/components/ui/checkbox"
import Image from "next/image"

type MapType = "control" | "escort" | "hybrid" | "push" | "flashpoint"

interface OWMap {
  id: string
  name: string
  nameKr: string
  type: MapType
  image: string
}

const mapTypeLabels: Record<MapType, { label: string; color: string }> = {
  control: { label: "쟁탈", color: "#00c3ff" },
  escort: { label: "호위", color: "#f99e1a" },
  hybrid: { label: "혼합", color: "#9d5cff" },
  push: { label: "밀기", color: "#4ade80" },
  flashpoint: { label: "거점점령", color: "#ff4649" },
}

const allMaps: OWMap[] = [
  // Control
  { id: "busan", name: "Busan", nameKr: "부산", type: "control", image: "/overwatch-busan-map-futuristic-korean-city.jpg" },
  { id: "ilios", name: "Ilios", nameKr: "일리오스", type: "control", image: "/overwatch-ilios-map-greek-islands.jpg" },
  { id: "lijiang", name: "Lijiang Tower", nameKr: "리장 타워", type: "control", image: "/overwatch-lijiang-tower-map-chinese-architecture-n.jpg" },
  { id: "nepal", name: "Nepal", nameKr: "네팔", type: "control", image: "/overwatch-nepal-map-himalayan-monastery.jpg" },
  { id: "oasis", name: "Oasis", nameKr: "오아시스", type: "control", image: "/overwatch-oasis-map-futuristic-desert-city.jpg" },
  {
    id: "antarctic",
    name: "Antarctic Peninsula",
    nameKr: "남극 기지",
    type: "control",
    image: "/overwatch-antarctic-peninsula-map-ice-research-sta.jpg",
  },
  { id: "samoa", name: "Samoa", nameKr: "사모아", type: "control", image: "/overwatch-samoa-map-tropical-island-village.jpg" },

  // Escort
  { id: "circuit", name: "Circuit Royal", nameKr: "서킷 로열", type: "escort", image: "/overwatch-circuit-royal-map-monaco-casino.jpg" },
  { id: "dorado", name: "Dorado", nameKr: "도라도", type: "escort", image: "/overwatch-dorado-map-mexican-festival-night.jpg" },
  { id: "havana", name: "Havana", nameKr: "하바나", type: "escort", image: "/overwatch-havana-map-cuban-streets-colorful.jpg" },
  { id: "junkertown", name: "Junkertown", nameKr: "쓰레기촌", type: "escort", image: "/overwatch-junkertown-map-australian-outback-junkya.jpg" },
  { id: "rialto", name: "Rialto", nameKr: "리알토", type: "escort", image: "/overwatch-rialto-map-venice-italy-canals.jpg" },
  { id: "route66", name: "Route 66", nameKr: "66번 국도", type: "escort", image: "/overwatch-route-66-map-american-desert-highway.jpg" },
  {
    id: "shambali",
    name: "Shambali Monastery",
    nameKr: "샴발리 사원",
    type: "escort",
    image: "/overwatch-shambali-monastery-map-nepal-temple.jpg",
  },
  {
    id: "watchpoint",
    name: "Watchpoint: Gibraltar",
    nameKr: "감시 기지: 지브롤터",
    type: "escort",
    image: "/overwatch-watchpoint-gibraltar-map-rocket-base.jpg",
  },

  // Hybrid
  {
    id: "blizzworld",
    name: "Blizzard World",
    nameKr: "블리자드 월드",
    type: "hybrid",
    image: "/placeholder.svg?height=180&width=320",
  },
  {
    id: "eichenwalde",
    name: "Eichenwalde",
    nameKr: "아이헨발데",
    type: "hybrid",
    image: "/placeholder.svg?height=180&width=320",
  },
  {
    id: "hollywood",
    name: "Hollywood",
    nameKr: "할리우드",
    type: "hybrid",
    image: "/placeholder.svg?height=180&width=320",
  },
  {
    id: "kingsrow",
    name: "King's Row",
    nameKr: "왕의 길",
    type: "hybrid",
    image: "/overwatch-kings-row-map.jpg",
  },
  {
    id: "midtown",
    name: "Midtown",
    nameKr: "미드타운",
    type: "hybrid",
    image: "/placeholder.svg?height=180&width=320",
  },
  { id: "numbani", name: "Numbani", nameKr: "눔바니", type: "hybrid", image: "/placeholder.svg?height=180&width=320" },
  {
    id: "paraiso",
    name: "Paraíso",
    nameKr: "파라이소",
    type: "hybrid",
    image: "/placeholder.svg?height=180&width=320",
  },
  {
    id: "hanamura",
    name: "Hanamura",
    nameKr: "하나무라",
    type: "hybrid",
    image: "/overwatch-hanamura.jpg",
  },

  // Push
  {
    id: "colosseo",
    name: "Colosseo",
    nameKr: "콜로세오",
    type: "push",
    image: "/placeholder.svg?height=180&width=320",
  },
  {
    id: "esperanca",
    name: "Esperança",
    nameKr: "이스페란사",
    type: "push",
    image: "/placeholder.svg?height=180&width=320",
  },
  {
    id: "newqueen",
    name: "New Queen Street",
    nameKr: "뉴 퀸 스트리트",
    type: "push",
    image: "/placeholder.svg?height=180&width=320",
  },
  {
    id: "runasapi",
    name: "Runasapi",
    nameKr: "루나사피",
    type: "push",
    image: "/placeholder.svg?height=180&width=320",
  },
  { id: "hanaoka", name: "Hanaoka", nameKr: "하나오카", type: "push", image: "/placeholder.svg?height=180&width=320" },

  // Flashpoint
  {
    id: "suravasa",
    name: "Suravasa",
    nameKr: "수라바사",
    type: "flashpoint",
    image: "/placeholder.svg?height=180&width=320",
  },
  {
    id: "newjunkCity",
    name: "New Junk City",
    nameKr: "뉴 정크 시티",
    type: "flashpoint",
    image: "/placeholder.svg?height=180&width=320",
  },
  {
    id: "junkCity",
    name: "Junk City",
    nameKr: "폐품 도시",
    type: "flashpoint",
    image: "/placeholder.svg?height=180&width=320",
  },
  {
    id: "throne",
    name: "Throne of Anubis",
    nameKr: "아누비스의 왕좌",
    type: "flashpoint",
    image: "/placeholder.svg?height=180&width=320",
  },
]

export default function MapRandomizer() {
  const [selectedTypes, setSelectedTypes] = useState<MapType[]>(["control", "escort", "hybrid", "push", "flashpoint"])
  const [excludedMaps, setExcludedMaps] = useState<string[]>([])
  const [selectedMap, setSelectedMap] = useState<OWMap | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [history, setHistory] = useState<OWMap[]>([])
  const [copied, setCopied] = useState(false)
  const [showFilter, setShowFilter] = useState(false)

  const availableMaps = allMaps.filter((map) => selectedTypes.includes(map.type) && !excludedMaps.includes(map.id))

  const toggleMapType = (type: MapType) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((t) => t !== type))
      }
    } else {
      setSelectedTypes([...selectedTypes, type])
    }
  }

  const toggleExcludedMap = (mapId: string) => {
    if (excludedMaps.includes(mapId)) {
      setExcludedMaps(excludedMaps.filter((id) => id !== mapId))
    } else {
      setExcludedMaps([...excludedMaps, mapId])
    }
  }

  const randomizeMap = () => {
    if (availableMaps.length === 0) return

    setIsSpinning(true)

    // Spinning animation with multiple random selections
    let spinCount = 0
    const spinInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * availableMaps.length)
      setSelectedMap(availableMaps[randomIndex])
      spinCount++

      if (spinCount > 15) {
        clearInterval(spinInterval)
        const finalIndex = Math.floor(Math.random() * availableMaps.length)
        const finalMap = availableMaps[finalIndex]
        setSelectedMap(finalMap)
        setHistory((prev) => [finalMap, ...prev].slice(0, 10))
        setIsSpinning(false)
      }
    }, 100)
  }

  const copyResult = () => {
    if (!selectedMap) return
    const text = `[맵 추첨 결과]\n${selectedMap.nameKr} (${selectedMap.name})\n타입: ${mapTypeLabels[selectedMap.type].label}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetAll = () => {
    setSelectedMap(null)
    setHistory([])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#f99e1a] skew-btn">
            <Map className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-wide">맵 추첨기</h2>
            <p className="text-muted-foreground text-sm">Map Randomizer</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilter(!showFilter)}
          className={`skew-btn ${showFilter ? "border-[#f99e1a] text-[#f99e1a]" : ""}`}
        >
          <Filter className="w-4 h-4 mr-2" />
          <span>필터</span>
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilter && (
        <div className="bg-[#1a1a1a] border border-[#333] p-6 space-y-4">
          <h3 className="font-bold uppercase tracking-wide text-sm text-muted-foreground mb-4">맵 타입 필터</h3>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(mapTypeLabels) as MapType[]).map((type) => (
              <button
                key={type}
                onClick={() => toggleMapType(type)}
                className={`px-4 py-2 border transition-all ${
                  selectedTypes.includes(type) ? "border-current" : "border-[#333] opacity-50"
                }`}
                style={{
                  color: selectedTypes.includes(type) ? mapTypeLabels[type].color : undefined,
                  backgroundColor: selectedTypes.includes(type) ? `${mapTypeLabels[type].color}20` : undefined,
                }}
              >
                {mapTypeLabels[type].label}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-[#333]">
            <h4 className="font-bold uppercase tracking-wide text-sm text-muted-foreground mb-3">
              제외할 맵 ({excludedMaps.length}개 제외됨)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto">
              {allMaps
                .filter((m) => selectedTypes.includes(m.type))
                .map((map) => (
                  <label
                    key={map.id}
                    className={`flex items-center gap-2 px-3 py-2 border cursor-pointer transition-all ${
                      excludedMaps.includes(map.id)
                        ? "border-destructive bg-destructive/10 line-through opacity-60"
                        : "border-[#333] hover:border-[#555]"
                    }`}
                  >
                    <Checkbox
                      checked={excludedMaps.includes(map.id)}
                      onCheckedChange={() => toggleExcludedMap(map.id)}
                    />
                    <span className="text-sm truncate">{map.nameKr}</span>
                  </label>
                ))}
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            선택 가능한 맵: <span className="text-[#f99e1a] font-bold">{availableMaps.length}</span>개
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Result Display */}
        <div className="lg:col-span-2 bg-[#1a1a1a] border border-[#333] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold uppercase tracking-wide text-sm text-muted-foreground">추첨 결과</h3>
            {selectedMap && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyResult}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetAll}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {selectedMap ? (
            <div className={`space-y-4 ${isSpinning ? "animate-pulse" : ""}`}>
              {/* Map Image */}
              <div className="relative aspect-video overflow-hidden border border-[#333]">
                <Image
                  src={selectedMap.image || "/placeholder.svg"}
                  alt={selectedMap.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {/* Map Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <Badge className="mb-2" style={{ backgroundColor: mapTypeLabels[selectedMap.type].color }}>
                    {mapTypeLabels[selectedMap.type].label}
                  </Badge>
                  <h2 className="text-4xl font-black italic uppercase tracking-wide mb-1">{selectedMap.nameKr}</h2>
                  <p className="text-muted-foreground uppercase tracking-widest">{selectedMap.name}</p>
                </div>

                {/* Spinning overlay */}
                {isSpinning && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Dices className="w-16 h-16 text-[#f99e1a] animate-spin" />
                  </div>
                )}
              </div>

              {/* Randomize Button */}
              <Button
                onClick={randomizeMap}
                disabled={availableMaps.length === 0 || isSpinning}
                className="w-full skew-btn bg-[#f99e1a] hover:bg-[#f99e1a]/80 text-black font-bold uppercase text-lg py-6"
              >
                <span className="flex items-center gap-2">
                  <Dices className={`w-5 h-5 ${isSpinning ? "animate-spin" : ""}`} />
                  {isSpinning ? "추첨 중..." : "다시 추첨"}
                </span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Map className="w-24 h-24 mb-6 opacity-30" />
              <p className="text-xl font-medium mb-2">맵을 추첨하세요</p>
              <p className="text-sm mb-8">랜덤으로 맵이 선택됩니다</p>
              <Button
                onClick={randomizeMap}
                disabled={availableMaps.length === 0}
                className="skew-btn bg-[#f99e1a] hover:bg-[#f99e1a]/80 text-black font-bold uppercase text-lg px-12 py-6"
              >
                <span className="flex items-center gap-2">
                  <Dices className="w-5 h-5" />맵 추첨
                </span>
              </Button>
            </div>
          )}
        </div>

        {/* History */}
        <div className="bg-[#1a1a1a] border border-[#333] p-6">
          <h3 className="font-bold uppercase tracking-wide text-sm text-muted-foreground mb-4">추첨 기록</h3>

          {history.length > 0 ? (
            <div className="space-y-2">
              {history.map((map, index) => (
                <div
                  key={`${map.id}-${index}`}
                  className={`flex items-center gap-3 p-3 border transition-all ${
                    index === 0 ? "border-[#f99e1a] bg-[#f99e1a]/10" : "border-[#333] opacity-70"
                  }`}
                >
                  <div className="w-2 h-8 rounded-full" style={{ backgroundColor: mapTypeLabels[map.type].color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{map.nameKr}</p>
                    <p className="text-xs text-muted-foreground">{mapTypeLabels[map.type].label}</p>
                  </div>
                  {index === 0 && <Badge className="bg-[#f99e1a] text-black text-xs">최근</Badge>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <RotateCcw className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">아직 추첨 기록이 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
