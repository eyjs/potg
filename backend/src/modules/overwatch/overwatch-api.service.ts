import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  OverFastPlayerSummary,
  OverFastPlayerStats,
  OverFastHero,
} from './interfaces/overfast-api.interface';

/**
 * OverFastAPI 클라이언트
 * https://overfast-api.tekrop.fr
 */
@Injectable()
export class OverwatchApiService {
  private readonly logger = new Logger(OverwatchApiService.name);
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://overfast-api.tekrop.fr',
      timeout: 15000,
      headers: {
        'User-Agent': 'POTG-Backend/1.0',
      },
    });
  }

  /**
   * BattleTag를 API 경로 형식으로 변환
   * "Player#1234" → "Player-1234"
   */
  private formatBattleTag(battleTag: string): string {
    return battleTag.replace('#', '-');
  }

  /**
   * 플레이어 요약 정보 조회
   */
  async getPlayerSummary(
    battleTag: string,
  ): Promise<OverFastPlayerSummary | null> {
    try {
      const tag = this.formatBattleTag(battleTag);
      const response = await this.client.get<OverFastPlayerSummary>(
        `/players/${tag}/summary`,
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        this.logger.warn(`Player not found: ${battleTag}`);
        return null;
      }
      this.logger.error(
        `Failed to fetch player summary: ${battleTag}`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * 플레이어 상세 통계 조회
   */
  async getPlayerStats(
    battleTag: string,
    gamemode: 'competitive' | 'quickplay' = 'competitive',
    platform: 'pc' | 'console' = 'pc',
  ): Promise<OverFastPlayerStats | null> {
    try {
      const tag = this.formatBattleTag(battleTag);
      const response = await this.client.get<OverFastPlayerStats>(
        `/players/${tag}/stats`,
        {
          params: { gamemode, platform },
        },
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 422) {
        this.logger.warn(`Stats not available for: ${battleTag}`);
        return null;
      }
      this.logger.error(
        `Failed to fetch player stats: ${battleTag}`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * 영웅 목록 조회
   */
  async getHeroes(): Promise<OverFastHero[]> {
    try {
      const response = await this.client.get<OverFastHero[]>('/heroes');
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to fetch heroes list', error.message);
      throw error;
    }
  }
}
