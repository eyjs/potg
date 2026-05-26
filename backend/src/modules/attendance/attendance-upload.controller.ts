import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import {
  AttendanceRecord,
  AttendanceStatus,
} from './entities/attendance-record.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';

interface UploadRow {
  discord_id?: string;
  scrim_id?: string;
  status?: string;
}

interface RowResult {
  index: number;
  discord_id?: string;
  ok: boolean;
  reason?: string;
}

/**
 * 매주 일요일 정규 내전 후 관리자가 참석자 명단을 엑셀로 일괄 업로드.
 *
 * 파일 형식 (헤더 필수): `discord_id | scrim_id | status`
 * - discord_id: discord snowflake (UNIQUE 매핑된 User)
 * - scrim_id: 내전 id (없으면 일일 출석)
 * - status: PRESENT | LATE | ABSENT | EXCUSED (없으면 PRESENT)
 */
@ApiTags('admin-attendance')
@ApiCookieAuth('access_token')
@Controller('admin/attendance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AttendanceUploadController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(ClanMember)
    private readonly clanMemberRepo: Repository<ClanMember>,
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepo: Repository<AttendanceRecord>,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '출석 xlsx 일괄 업로드 (헤더: discord_id | scrim_id | status)',
  })
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required');

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('empty workbook');
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<UploadRow>(sheet);

    const results: RowResult[] = [];
    let success = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const discordId = (row.discord_id ?? '').toString().trim();
      if (!discordId) {
        results.push({ index: i, ok: false, reason: 'discord_id 누락' });
        continue;
      }
      try {
        const user = await this.userRepo.findOne({ where: { discordId } });
        if (!user) {
          results.push({
            index: i,
            discord_id: discordId,
            ok: false,
            reason: 'User 미존재',
          });
          continue;
        }
        const cm = await this.clanMemberRepo.findOne({
          where: { userId: user.id },
        });
        if (!cm) {
          results.push({
            index: i,
            discord_id: discordId,
            ok: false,
            reason: 'ClanMember 미존재',
          });
          continue;
        }
        const status = this.parseStatus(row.status);
        const scrimId = (row.scrim_id ?? '').toString().trim() || null;
        const record = this.attendanceRepo.create({
          memberId: cm.id,
          scrimId: scrimId ?? undefined,
          status,
          checkedInAt: new Date(),
        });
        await this.attendanceRepo.save(record);
        success += 1;
        results.push({ index: i, discord_id: discordId, ok: true });
      } catch (err) {
        results.push({
          index: i,
          discord_id: discordId,
          ok: false,
          reason: (err as Error).message,
        });
      }
    }

    return {
      total: rows.length,
      success,
      failed: rows.length - success,
      results,
    };
  }

  private parseStatus(raw?: string): AttendanceStatus {
    const v = (raw ?? '').toString().trim().toUpperCase();
    if (Object.values(AttendanceStatus).includes(v as AttendanceStatus)) {
      return v as AttendanceStatus;
    }
    return AttendanceStatus.PRESENT;
  }
}
