import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { IsOptional, IsString } from 'class-validator';
import { Repository } from 'typeorm';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { SystemConfig } from './entities/system-config.entity';
import { SystemConfigService } from './system-config.service';

class UpdateConfigDto {
  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  description?: string;
}

@ApiTags('admin-config')
@ApiCookieAuth('access_token')
@Controller('admin/config')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class SystemConfigController {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly repo: Repository<SystemConfig>,
    private readonly service: SystemConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: '시스템 설정 전체 (KV) 조회' })
  list() {
    return this.repo.find({ order: { key: 'ASC' } });
  }

  @Get(':key')
  @ApiOperation({ summary: '시스템 설정 단건 조회' })
  async get(@Param('key') key: string) {
    const value = await this.service.get(key);
    return { key, value };
  }

  @Patch(':key')
  @ApiOperation({ summary: '시스템 설정 upsert' })
  async update(@Param('key') key: string, @Body() dto: UpdateConfigDto) {
    return this.service.set(key, dto.value, dto.description);
  }
}
