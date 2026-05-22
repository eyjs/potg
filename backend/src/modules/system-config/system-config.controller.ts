import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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
  list() {
    return this.repo.find({ order: { key: 'ASC' } });
  }

  @Get(':key')
  async get(@Param('key') key: string) {
    const value = await this.service.get(key);
    return { key, value };
  }

  @Patch(':key')
  async update(@Param('key') key: string, @Body() dto: UpdateConfigDto) {
    return this.service.set(key, dto.value, dto.description);
  }
}
