'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { handleApiError } from '@/lib/api-error'
import type { Hero, HeroDetail, GameMap, Gamemode, Role } from '../types'

export function useHeroes() {
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHeroes = async () => {
      try {
        const res = await api.get<Hero[]>('/overwatch/heroes')
        setHeroes(res.data)
      } catch (error) {
        handleApiError(error, '영웅 목록 조회 실패')
      } finally {
        setIsLoading(false)
      }
    }
    fetchHeroes()
  }, [])

  return { heroes, isLoading }
}

export function useHeroDetail(heroKey: string | null) {
  const [hero, setHero] = useState<HeroDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!heroKey) {
      setHero(null)
      return
    }

    const fetchHero = async () => {
      try {
        setIsLoading(true)
        const res = await api.get<HeroDetail>(`/overwatch/heroes/${heroKey}`)
        setHero(res.data)
      } catch (error) {
        handleApiError(error, '영웅 상세 조회 실패')
        setHero(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchHero()
  }, [heroKey])

  return { hero, isLoading }
}

export function useMaps() {
  const [maps, setMaps] = useState<GameMap[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const res = await api.get<GameMap[]>('/overwatch/maps')
        setMaps(res.data)
      } catch (error) {
        handleApiError(error, '맵 목록 조회 실패')
      } finally {
        setIsLoading(false)
      }
    }
    fetchMaps()
  }, [])

  return { maps, isLoading }
}

export function useGamemodes() {
  const [gamemodes, setGamemodes] = useState<Gamemode[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchGamemodes = async () => {
      try {
        const res = await api.get<Gamemode[]>('/overwatch/gamemodes')
        setGamemodes(res.data)
      } catch (error) {
        handleApiError(error, '게임모드 조회 실패')
      } finally {
        setIsLoading(false)
      }
    }
    fetchGamemodes()
  }, [])

  return { gamemodes, isLoading }
}

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await api.get<Role[]>('/overwatch/roles')
        setRoles(res.data)
      } catch (error) {
        handleApiError(error, '역할 조회 실패')
      } finally {
        setIsLoading(false)
      }
    }
    fetchRoles()
  }, [])

  return { roles, isLoading }
}
