import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Repository } from 'typeorm';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LedgerService } from '../ledger/ledger.service';
import { POINT_TX_REASON } from '../ledger/ledger.constants';
import { User, UserRole } from './entities/user.entity';

class UpdateRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

class AdjustBalanceDto {
  /** 양수=mint, 음수=burn. 0은 거부. */
  @IsInt()
  delta: number;

  @IsOptional()
  @IsString()
  memo?: string;
}

@Controller('admin/members')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly ledger: LedgerService,
  ) {}

  @Get()
  async list(
    @Query('skip') skipRaw?: string,
    @Query('take') takeRaw?: string,
  ) {
    const skip = Math.max(0, parseInt(skipRaw ?? '0', 10) || 0);
    const take = Math.min(100, Math.max(1, parseInt(takeRaw ?? '50', 10) || 50));
    const [rows, total] = await this.userRepo.findAndCount({
      select: [
        'id',
        'username',
        'nickname',
        'role',
        'discordId',
        'pointsBalance',
        'marketGatePassed',
        'createdAt',
      ],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return { total, skip, take, rows };
  }

  @Get(':id')
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Member not found');
    return user;
  }

  @Patch(':id/role')
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Member not found');
    user.role = dto.role;
    return this.userRepo.save(user);
  }

  @Post(':id/adjust')
  async adjust(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustBalanceDto,
  ) {
    if (!Number.isInteger(dto.delta) || dto.delta === 0) {
      throw new BadRequestException('delta must be non-zero integer');
    }
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Member not found');

    const amount = BigInt(Math.abs(dto.delta));
    if (dto.delta > 0) {
      await this.ledger.mint(user.id, amount, POINT_TX_REASON.ADMIN_ADJUST, {
        refType: 'AdminAdjust',
        refId: user.id,
        memo: dto.memo ?? 'admin grant',
      });
    } else {
      await this.ledger.burn(user.id, amount, POINT_TX_REASON.ADMIN_ADJUST, {
        refType: 'AdminAdjust',
        refId: user.id,
        memo: dto.memo ?? 'admin deduct',
      });
    }
    const balance = await this.ledger.getBalance(user.id);
    return { id: user.id, delta: dto.delta, newBalance: balance.toString() };
  }
}
