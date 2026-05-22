import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig, SystemConfigKey } from './entities/system-config.entity';

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly repo: Repository<SystemConfig>,
  ) {}

  /**
   * KV 조회. 미존재 시 defaultValue 반환 (defaultValue가 undefined면 throw).
   */
  async get(
    key: SystemConfigKey | string,
    defaultValue?: string,
  ): Promise<string> {
    const row = await this.repo.findOne({ where: { key } });
    if (row) return row.value;
    if (defaultValue !== undefined) return defaultValue;
    throw new NotFoundException(`SystemConfig key not found: ${key}`);
  }

  async getNumber(
    key: SystemConfigKey | string,
    defaultValue?: number,
  ): Promise<number> {
    const raw = await this.get(
      key,
      defaultValue !== undefined ? String(defaultValue) : undefined,
    );
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      throw new Error(`SystemConfig value for "${key}" is not numeric: ${raw}`);
    }
    return parsed;
  }

  async set(
    key: SystemConfigKey | string,
    value: string,
    description?: string,
  ): Promise<SystemConfig> {
    const existing = await this.repo.findOne({ where: { key } });
    if (existing) {
      existing.value = value;
      if (description !== undefined) existing.description = description;
      return this.repo.save(existing);
    }
    const created = this.repo.create({
      key,
      value,
      description: description ?? null,
    });
    return this.repo.save(created);
  }
}
