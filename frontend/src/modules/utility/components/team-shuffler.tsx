"use client"

import { useState } from "react"
import { Shuffle, Users, RotateCcw, Copy, Check, Trash2, Plus, X, Crown } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Badge } from "@/common/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"

interface Player {
  id: string
  name: string
  avatar?: string
}

interface ShuffleResult {
  teamA: Player[]
  teamB: Player[]
  timestamp: Date
}

export default function TeamShuffler() {
  const [players, setPlayers] = useState<Player[]>([
    { id: "1", name: "코코아맛쿠키" },
    { id: "2", name: "달빛사냥꾼" },
    { id: "3", name: "불꽃매화" },
    { id: "4", name: "은하수여행자" },
    { id: "5", name: "폭풍전야" },
    { id: "6", name: "검은늑대" },
    { id: "7", name: "새벽이슬" },
    { id: "8", name: "천둥번개" },
    { id: "9", name: "푸른하늘" },
    { id: "10", name: "붉은석양" },
  ])
  const [newPlayerName, setNewPlayerName] = useState("")
  const [result, setResult] = useState<ShuffleResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [isShuffling, setIsShuffling] = useState(false)

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      setPlayers([...players, { id: Date.now().toString(), name: newPlayerName.trim() }])
      setNewPlayerName("")
    }
  }

  const removePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id))
  }

  const shuffleTeams = () => {
    if (players.length < 2) return

    setIsShuffling(true)

    // Animation delay
    setTimeout(() => {
      const shuffled = [...players].sort(() => Math.random() - 0.5)
      const mid = Math.ceil(shuffled.length / 2)

      setResult({
        teamA: shuffled.slice(0, mid),
        teamB: shuffled.slice(mid),
        timestamp: new Date(),
      })
      setIsShuffling(false)
    }, 800)
  }

  const resetAll = () => {
    setResult(null)
  }

  const copyResult = () => {
    if (!result) return

    const text = `[팀 섞기 결과]\n\n🔵 Team A (${result.teamA.length}명)\n${result.teamA.map((p) => `- ${p.name}`).join("\n")}\n\n🔴 Team B (${result.teamB.length}명)\n${result.teamB.map((p) => `- ${p.name}`).join("\n")}`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-ow-blue skew-btn">
            <Shuffle className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-wide">팀 섞기</h2>
            <p className="text-muted-foreground text-sm">Team Shuffle</p>
          </div>
        </div>
        <Badge variant="outline" className="text-ow-blue border-ow-blue">
          <Users className="w-3 h-3 mr-1" />
          {players.length}명
        </Badge>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Player Input Section */}
        <div className="bg-ow-dark border border-[#333] p-6 space-y-4">
          <h3 className="font-bold uppercase tracking-wide text-sm text-muted-foreground">참가자 명단</h3>

          {/* Add Player */}
          <div className="flex gap-2">
            <Input
              placeholder="참가자 이름 입력..."
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              className="bg-background border-[#333]"
            />
            <Button onClick={addPlayer} className="skew-btn bg-ow-orange hover:bg-ow-orange/80 text-black">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Player List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {players.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-background border border-[#333] px-4 py-2 group hover:border-ow-orange/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm w-6">{index + 1}</span>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={player.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-[#333] text-xs">{player.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{player.name}</span>
                </div>
                <button
                  onClick={() => removePlayer(player.id)}
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            {players.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>참가자를 추가해주세요</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-[#333]">
            <Button
              onClick={shuffleTeams}
              disabled={players.length < 2 || isShuffling}
              className="flex-1 skew-btn bg-ow-blue hover:bg-ow-blue/80 text-black font-bold uppercase"
            >
              <span className="flex items-center gap-2">
                <Shuffle className={`w-4 h-4 ${isShuffling ? "animate-spin" : ""}`} />
                {isShuffling ? "섞는 중..." : "팀 섞기"}
              </span>
            </Button>
            <Button
              onClick={() => setPlayers([])}
              variant="outline"
              className="skew-btn border-destructive text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Result Section */}
        <div className="bg-ow-dark border border-[#333] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold uppercase tracking-wide text-sm text-muted-foreground">결과</h3>
            {result && (
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

          {result ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Team A */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-ow-blue/30">
                  <div className="w-3 h-3 bg-ow-blue rounded-full" />
                  <span className="font-bold uppercase text-ow-blue">Team A</span>
                  <Badge className="bg-ow-blue/20 text-ow-blue ml-auto">{result.teamA.length}명</Badge>
                </div>
                <div className="space-y-2">
                  {result.teamA.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 bg-ow-blue/10 border border-ow-blue/30 px-3 py-2"
                    >
                      {index === 0 && <Crown className="w-4 h-4 text-ow-orange" />}
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="bg-ow-blue/30 text-xs">{player.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{player.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team B */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-ow-red/30">
                  <div className="w-3 h-3 bg-ow-red rounded-full" />
                  <span className="font-bold uppercase text-ow-red">Team B</span>
                  <Badge className="bg-ow-red/20 text-ow-red ml-auto">{result.teamB.length}명</Badge>
                </div>
                <div className="space-y-2">
                  {result.teamB.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 bg-ow-red/10 border border-ow-red/30 px-3 py-2"
                    >
                      {index === 0 && <Crown className="w-4 h-4 text-ow-orange" />}
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="bg-ow-red/30 text-xs">{player.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{player.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Shuffle className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">팀 섞기를 실행하세요</p>
              <p className="text-sm">참가자들이 랜덤하게 배정됩니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
