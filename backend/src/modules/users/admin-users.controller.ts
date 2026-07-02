import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LedgerService } from '../ledger/ledger.service';
import { POINT_TX_REASON } from '../ledger/ledger.constants';
import { MainRole, UserRole } from './entities/user.entity';
import { UsersService } from './users.service';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

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

class CreateMemberDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(4)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  battleTag?: string;
}

class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  username?: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  @MinLength(4)
  password?: string;

  @IsOptional()
  @IsString()
  representativeHero?: string;

  @IsOptional()
  @IsEnum(MainRole)
  mainRole?: MainRole;
}

class UpdateUsernameDto {
  @IsString()
  @IsNotEmpty()
  username: string;
}

class UpdatePasswordDto {
  @IsString()
  @MinLength(4)
  password: string;
}

@ApiTags('admin-members')
@ApiCookieAuth('access_token')
@Controller('admin/members')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(
    private readonly users: UsersService,
    private readonly ledger: LedgerService,
  ) {}

  @Get()
  @ApiOperation({ summary: '회원 페이징 목록' })
  async list(@Query('skip') skipRaw?: string, @Query('take') takeRaw?: string) {
    const skip = Math.max(0, parseInt(skipRaw ?? '0', 10) || 0);
    const take = Math.min(
      100,
      Math.max(1, parseInt(takeRaw ?? '50', 10) || 50),
    );
    const { rows, total } = await this.users.adminList(skip, take);
    // pointsBalance(bigint→string)를 프론트 계약에 맞춰 totalPoints(number)로 노출.
    const mappedRows = rows.map((u) => ({
      ...u,
      totalPoints: Number(u.pointsBalance ?? 0),
    }));
    return { total, skip, take, rows: mappedRows };
  }

  @Get(':id')
  @ApiOperation({ summary: '회원 상세' })
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.adminFindOrFail(id);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: '회원 role 변경' })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.users.adminUpdateRole(id, dto.role);
  }

  @Post(':id/adjust')
  @ApiOperation({
    summary: '잔액 조정 (delta>0=mint, <0=burn, LedgerService 경유)',
  })
  async adjust(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustBalanceDto,
  ) {
    if (!Number.isInteger(dto.delta) || dto.delta === 0) {
      throw new BadRequestException('delta must be non-zero integer');
    }
    const user = await this.users.adminFindOrFail(id);

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

  @Post()
  @ApiOperation({ summary: '회원 신규 생성 (아이디/비밀번호)' })
  async create(@Body() dto: CreateMemberDto) {
    const user = await this.users.adminCreate({
      username: dto.username,
      password: dto.password,
      role: dto.role,
      nickname: dto.nickname,
      battleTag: dto.battleTag,
    });
    return { ...user, totalPoints: 0 };
  }

  @Patch(':id')
  @ApiOperation({
    summary: '회원 정보 통합 수정 (아이디/닉네임/권한/비밀번호)',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    const user = await this.users.adminUpdate(id, dto);
    return { ...user, totalPoints: Number(user.pointsBalance ?? 0) };
  }

  @Patch(':id/username')
  @ApiOperation({ summary: '로그인 아이디(username) 변경' })
  async updateUsername(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUsernameDto,
  ) {
    return this.users.adminUpdateUsername(id, dto.username);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: '비밀번호 재설정' })
  @HttpCode(HttpStatus.OK)
  async updatePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePasswordDto,
  ) {
    await this.users.adminUpdatePassword(id, dto.password);
    return { message: '비밀번호가 변경되었습니다' };
  }

  @Delete(':id')
  @ApiOperation({ summary: '회원 삭제' })
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (req.user.userId === id) {
      throw new BadRequestException('자기 자신은 삭제할 수 없습니다');
    }
    await this.users.adminDelete(id);
    return { message: '삭제되었습니다' };
  }
}
