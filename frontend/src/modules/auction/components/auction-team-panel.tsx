"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"
import { Button } from "@/common/components/ui/button"
import { Badge } from "@/common/components/ui/badge"
import { Undo2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AuctionRoomState } from "../hooks/use-auction-socket"

const teamColors = ["#F99E1A", "#00C3FF", "#FF4649", "#00FF88", "#FF00FF", "#FFFF00"]

interface AuctionTeamPanelProps {
  teams: AuctionRoomState["teams"]
  unsoldPlayers: AuctionRoomState["unsoldPlayers"]
  isAdmin: boolean
  isAssignmentPhase: boolean
  selectedUnsoldPlayer: string | null
  onUndoPlayer: (playerId: string) => void
  onAssignPlayer: (playerId: string, captainId: string) => void
  onSelectUnsoldPlayer: (playerId: string | null) => void
}

export function AuctionTeamPanel({
  teams,
  unsoldPlayers,
  isAdmin,
  isAssignmentPhase,
  selectedUnsoldPlayer,
  onUndoPlayer,
  onAssignPlayer,
  onSelectUnsoldPlayer,
}: AuctionTeamPanelProps) {
  const [selectedTab, setSelectedTab] = useState<string | "unsold">(teams[0]?.captainId || "unsold")

  const handleTeamClick = (captainId: string) => {
    if (isAssignmentPhase && selectedUnsoldPlayer && isAdmin) {
      onAssignPlayer(selectedUnsoldPlayer, captainId)
      onSelectUnsoldPlayer(null)
    }
  }

  const selectedTeam = teams.find((t) => t.captainId === selectedTab)
  const selectedTeamIndex = selectedTeam ? teams.indexOf(selectedTeam) : -1
  const selectedTeamColor = selectedTeamIndex >= 0 ? teamColors[selectedTeamIndex % teamColors.length] : undefined

  // Keyboard handler for accessible clickable elements
  const handleKeyDown = (callback: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      callback()
    }
  }

  return (
    <div className="space-y-4">
      {/* Mobile Tab View */}
      <div className="md:hidden">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <h3 className="font-bold uppercase tracking-wide">팀 현황</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Tab Buttons */}
            <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
              {teams.map((team, index) => (
                <Button
                  key={team.captainId}
                  size="sm"
                  variant={selectedTab === team.captainId ? "default" : "outline"}
                  className={cn(
                    "flex-shrink-0 font-semibold text-xs",
                    selectedTab === team.captainId && "ring-2"
                  )}
                  style={{
                    borderColor: teamColors[index % teamColors.length],
                    color: selectedTab === team.captainId ? "white" : teamColors[index % teamColors.length],
                    backgroundColor: selectedTab === team.captainId ? teamColors[index % teamColors.length] : "transparent",
                    ["--tw-ring-color" as string]: teamColors[index % teamColors.length],
                  }}
                  onClick={() => setSelectedTab(team.captainId)}
                >
                  {team.captainName?.split("#")[0] || "캡틴"}
                  <Badge variant="secondary" className="ml-1 text-xs px-1">
                    {team.members.length}
                  </Badge>
                </Button>
              ))}
              {unsoldPlayers.length > 0 && (
                <Button
                  size="sm"
                  variant={selectedTab === "unsold" ? "default" : "outline"}
                  className={cn(
                    "flex-shrink-0 font-semibold text-xs",
                    selectedTab === "unsold"
                      ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                      : "border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                  )}
                  onClick={() => setSelectedTab("unsold")}
                >
                  유찰
                  <Badge variant="secondary" className="ml-1 text-xs px-1">
                    {unsoldPlayers.length}
                  </Badge>
                </Button>
              )}
            </div>

            {/* Selected Team Content */}
            {selectedTab !== "unsold" && selectedTeam && selectedTeamColor && (
              <div
                className="p-3 rounded-lg border"
                style={{ borderColor: selectedTeamColor + "50" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedTeamColor }}
                    />
                    <span
                      className="font-bold"
                      style={{ color: selectedTeamColor }}
                    >
                      {selectedTeam.captainName?.split("#")[0] || "캡틴"} 팀
                    </span>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {selectedTeam.points.toLocaleString()}P
                  </span>
                </div>

                {selectedTeam.members.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTeam.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between text-sm group"
                      >
                        <div className="flex items-center gap-2">
                          <span>{member.name}</span>
                          {member.wasUnsold && (
                            <Badge variant="outline" className="text-xs px-1 py-0 text-yellow-500 border-yellow-500">
                              유찰
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {member.price.toLocaleString()}P
                          </span>
                          {isAdmin && !isAssignmentPhase && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                onUndoPlayer(member.id)
                              }}
                            >
                              <Undo2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">아직 팀원 없음</p>
                )}

                {isAssignmentPhase && selectedUnsoldPlayer && isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 border-blue-400 text-blue-400 hover:bg-blue-400/10"
                    onClick={() => handleTeamClick(selectedTeam.captainId)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    선수 배정
                  </Button>
                )}
              </div>
            )}

            {/* Unsold Players Content */}
            {selectedTab === "unsold" && unsoldPlayers.length > 0 && (
              <div className="p-3 rounded-lg border border-yellow-500/50 bg-yellow-500/5">
                {isAdmin && (
                  <p className="text-xs text-muted-foreground mb-3">
                    선수를 선택한 후 팀을 클릭하여 배정하세요
                  </p>
                )}
                <div className="space-y-2" role="listbox" aria-label="유찰 선수 목록">
                  {unsoldPlayers.map((player) => {
                    const handleSelect = () =>
                      isAdmin && onSelectUnsoldPlayer(selectedUnsoldPlayer === player.id ? null : player.id)
                    return (
                      <div
                        key={player.id}
                        role={isAdmin ? "option" : undefined}
                        tabIndex={isAdmin ? 0 : undefined}
                        aria-selected={selectedUnsoldPlayer === player.id}
                        onClick={handleSelect}
                        onKeyDown={isAdmin ? handleKeyDown(handleSelect) : undefined}
                        className={cn(
                          "flex items-center justify-between p-2 rounded border transition-all",
                          isAdmin ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500/50" : "",
                          selectedUnsoldPlayer === player.id
                            ? "bg-yellow-500/20 border-yellow-500"
                            : "border-border/50 hover:bg-muted/50"
                        )}
                      >
                        <div>
                          <p className="font-semibold text-sm">{player.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {player.role}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-yellow-500 border-yellow-500"
                        >
                          0P
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Desktop View - Original Layout */}
      <div className="hidden md:block space-y-4">
        {/* Teams */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <h3 className="font-bold uppercase tracking-wide">팀 현황</h3>
          </CardHeader>
          <CardContent className="space-y-4">
          {teams.map((team, index) => {
            const isClickable = isAssignmentPhase && selectedUnsoldPlayer && isAdmin
            const teamColor = teamColors[index % teamColors.length]
            return (
            <div
              key={team.captainId}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={() => handleTeamClick(team.captainId)}
              onKeyDown={isClickable ? handleKeyDown(() => handleTeamClick(team.captainId)) : undefined}
              className={cn(
                "p-3 rounded-lg border transition-all",
                isClickable
                  ? "cursor-pointer hover:bg-muted/50 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/50"
                  : ""
              )}
              style={{ borderColor: teamColor + "50" }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: teamColor }}
                  />
                  <span
                    className="font-bold"
                    style={{ color: teamColor }}
                  >
                    {team.captainName?.split("#")[0] || "캡틴"} 팀
                  </span>
                </div>
                <span className="text-sm font-bold text-primary">
                  {team.points.toLocaleString()}P
                </span>
              </div>

              {team.members.length > 0 ? (
                <div className="space-y-1">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between text-sm group"
                    >
                      <div className="flex items-center gap-2">
                        <span>{member.name}</span>
                        {member.wasUnsold && (
                          <Badge variant="outline" className="text-xs px-1 py-0 text-yellow-500 border-yellow-500">
                            유찰
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {member.price.toLocaleString()}P
                        </span>
                        {isAdmin && !isAssignmentPhase && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              onUndoPlayer(member.id)
                            }}
                          >
                            <Undo2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">아직 팀원 없음</p>
              )}

              {isAssignmentPhase && selectedUnsoldPlayer && isAdmin && (
                <div className="mt-2 pt-2 border-t border-dashed border-border/50">
                  <p className="text-xs text-blue-400 flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    클릭하여 선수 배정
                  </p>
                </div>
              )}
            </div>
          )})}
          </CardContent>
        </Card>

        {/* Unsold Players (Assignment Phase) - Desktop */}
        {isAssignmentPhase && unsoldPlayers.length > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold uppercase tracking-wide text-yellow-500">
                  유찰 선수
                </h3>
                <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                  {unsoldPlayers.length}명
                </Badge>
              </div>
              {isAdmin && (
                <p className="text-xs text-muted-foreground mt-1">
                  선수를 선택한 후 팀을 클릭하여 배정하세요
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-2" role="listbox" aria-label="유찰 선수 목록">
              {unsoldPlayers.map((player) => {
                const handleSelect = () =>
                  isAdmin && onSelectUnsoldPlayer(selectedUnsoldPlayer === player.id ? null : player.id)
                return (
                  <div
                    key={player.id}
                    role={isAdmin ? "option" : undefined}
                    tabIndex={isAdmin ? 0 : undefined}
                    aria-selected={selectedUnsoldPlayer === player.id}
                    onClick={handleSelect}
                    onKeyDown={isAdmin ? handleKeyDown(handleSelect) : undefined}
                    className={cn(
                      "flex items-center justify-between p-2 rounded border transition-all",
                      isAdmin ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500/50" : "",
                      selectedUnsoldPlayer === player.id
                        ? "bg-yellow-500/20 border-yellow-500"
                        : "border-border/50 hover:bg-muted/50"
                    )}
                  >
                    <div>
                      <p className="font-semibold text-sm">{player.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {player.role}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-yellow-500 border-yellow-500"
                    >
                      0P
                    </Badge>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
