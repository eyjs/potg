'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { Textarea } from '@/common/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/common/components/ui/select'
import { Checkbox } from '@/common/components/ui/checkbox'
import { Badge } from '@/common/components/ui/badge'
import { cn } from '@/lib/utils'
import { useMaps, useHeroes, useGamemodes } from '../hooks/use-game-data'
import type { CreateReplayDto, ReplayResult } from '../types'
import { REPLAY_TAGS } from '../types'

interface CreateReplayModalProps {
  onClose: () => void
  onSubmit: (dto: CreateReplayDto) => Promise<void>
  isSubmitting?: boolean
}

export function CreateReplayModal({ onClose, onSubmit, isSubmitting }: CreateReplayModalProps) {
  const { maps } = useMaps()
  const { heroes } = useHeroes()
  const { gamemodes } = useGamemodes()

  const [code, setCode] = useState('')
  const [mapName, setMapName] = useState('')
  const [gamemode, setGamemode] = useState('')
  const [selectedHeroes, setSelectedHeroes] = useState<string[]>([])
  const [result, setResult] = useState<ReplayResult>('WIN')
  const [videoUrl, setVideoUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const handleHeroToggle = (heroKey: string) => {
    setSelectedHeroes((prev) =>
      prev.includes(heroKey)
        ? prev.filter((h) => h !== heroKey)
        : [...prev, heroKey]
    )
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      code: code.toUpperCase(),
      mapName,
      gamemode: gamemode || undefined,
      heroes: selectedHeroes,
      result,
      videoUrl: videoUrl || undefined,
      notes: notes || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    })
  }

  const isValid = code.length >= 5 && mapName && selectedHeroes.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border/50 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h2 className="text-lg font-black italic uppercase tracking-tight">
            리플레이 <span className="text-primary">등록</span>
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Replay Code */}
          <div className="space-y-2">
            <Label htmlFor="code">리플레이 코드 *</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="A54AWE"
              maxLength={6}
              className="font-mono text-lg uppercase tracking-wider bg-muted/20"
            />
          </div>

          {/* Map & Gamemode */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>맵 *</Label>
              <Select value={mapName} onValueChange={setMapName}>
                <SelectTrigger className="bg-muted/20">
                  <SelectValue placeholder="맵 선택" />
                </SelectTrigger>
                <SelectContent>
                  {maps.map((map) => (
                    <SelectItem key={map.name} value={map.name}>
                      {map.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>게임모드</Label>
              <Select value={gamemode} onValueChange={setGamemode}>
                <SelectTrigger className="bg-muted/20">
                  <SelectValue placeholder="모드 선택" />
                </SelectTrigger>
                <SelectContent>
                  {gamemodes.map((mode) => (
                    <SelectItem key={mode.key} value={mode.name}>
                      {mode.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Heroes */}
          <div className="space-y-2">
            <Label>플레이한 영웅 *</Label>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-muted/10 border border-border/30 max-h-32 overflow-y-auto">
              {heroes.map((hero) => (
                <Badge
                  key={hero.key}
                  variant={selectedHeroes.includes(hero.name) ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selectedHeroes.includes(hero.name)
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => handleHeroToggle(hero.name)}
                >
                  {hero.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Result */}
          <div className="space-y-2">
            <Label>결과 *</Label>
            <div className="flex gap-3">
              {(['WIN', 'LOSS', 'DRAW'] as ReplayResult[]).map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="result"
                    value={r}
                    checked={result === r}
                    onChange={() => setResult(r)}
                    className="accent-primary"
                  />
                  <span
                    className={cn(
                      'text-sm font-medium',
                      r === 'WIN' && 'text-green-400',
                      r === 'LOSS' && 'text-red-400',
                      r === 'DRAW' && 'text-yellow-400'
                    )}
                  >
                    {r === 'WIN' ? '승리' : r === 'LOSS' ? '패배' : '무승부'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label htmlFor="videoUrl">영상 링크 (선택)</Label>
            <Input
              id="videoUrl"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/..."
              className="bg-muted/20"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="역전 경기! 마지막 라운드 포커스 집중..."
              maxLength={500}
              className="bg-muted/20 resize-none"
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>태그</Label>
            <div className="flex flex-wrap gap-2">
              {REPLAY_TAGS.map((tag) => (
                <label
                  key={tag}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={() => handleTagToggle(tag)}
                  />
                  <span className="text-sm">{tag}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="skew-x-[-8deg] bg-primary hover:bg-primary/90"
            >
              <span className="skew-x-[8deg]">
                {isSubmitting ? '등록 중...' : '등록하기'}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
