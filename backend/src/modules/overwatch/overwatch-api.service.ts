import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  OverFastPlayerSummary,
  OverFastPlayerStats,
  OverFastHero,
  OverFastHeroDetail,
  OverFastMap,
  OverFastGamemode,
  OverFastRole,
} from './interfaces/overfast-api.interface';

/**
 * OverFastAPI 클라이언트
 * https://overfast-api.tekrop.fr
 */
@Injectable()
export class OverwatchApiService {
  private readonly logger = new Logger(OverwatchApiService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.client = axios.create({
      baseURL: this.configService.get<string>(
        'OVERFAST_API_URL',
        'https://overfast-api.tekrop.fr',
      ),
      timeout: this.configService.get<number>('OVERFAST_API_TIMEOUT', 15000),
      headers: {
        'User-Agent': this.configService.get<string>(
          'OVERFAST_USER_AGENT',
          'POTG-Backend/1.0',
        ),
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
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 404) {
          this.logger.warn(`Player not found: ${battleTag}`);
          return null;
        }
        this.logger.error(
          `Failed to fetch player summary: ${battleTag}`,
          error.message,
        );
      }
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
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 404 || error.response?.status === 422) {
          this.logger.warn(`Stats not available for: ${battleTag}`);
          return null;
        }
        this.logger.error(
          `Failed to fetch player stats: ${battleTag}`,
          error.message,
        );
      }
      throw error;
    }
  }

  /**
   * 영웅 목록 조회
   */
  async getHeroes(locale = 'ko-kr'): Promise<OverFastHero[]> {
    try {
      const response = await this.client.get<OverFastHero[]>('/heroes', {
        params: { locale },
      });
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to fetch heroes list', message);
      throw error;
    }
  }

  /**
   * 영웅 상세 정보 조회
   */
  async getHeroDetail(
    heroKey: string,
    locale = 'ko-kr',
  ): Promise<OverFastHeroDetail | null> {
    try {
      const response = await this.client.get<OverFastHeroDetail>(
        `/heroes/${heroKey}`,
        { params: { locale } },
      );
      return response.data;
    } catch (error: unknown) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch hero detail: ${heroKey}`, message);
      throw error;
    }
  }

  /**
   * 맵 목록 조회
   */
  async getMaps(locale = 'ko-kr'): Promise<OverFastMap[]> {
    try {
      const response = await this.client.get<OverFastMap[]>('/maps', {
        params: { locale },
      });
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to fetch maps list', message);
      throw error;
    }
  }

  /**
   * 게임모드 목록 조회
   */
  async getGamemodes(locale = 'ko-kr'): Promise<OverFastGamemode[]> {
    try {
      const response = await this.client.get<OverFastGamemode[]>('/gamemodes', {
        params: { locale },
      });
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to fetch gamemodes list', message);
      throw error;
    }
  }

  /**
   * 역할 목록 조회
   */
  async getRoles(locale = 'ko-kr'): Promise<OverFastRole[]> {
    try {
      const response = await this.client.get<OverFastRole[]>('/roles', {
        params: { locale },
      });
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to fetch roles list', message);
      throw error;
    }
  }
}
