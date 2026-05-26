import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { AttendanceUploadController } from './attendance-upload.controller';
import { User } from '../users/entities/user.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import {
  AttendanceRecord,
  AttendanceStatus,
} from './entities/attendance-record.entity';

/**
 * xlsx 파일을 Buffer로 직렬화하는 헬퍼.
 * rows: 헤더 포함 2차원 배열 또는 객체 배열을 받아 Buffer 반환.
 */
function makeXlsxBuffer(rows: object[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('AttendanceUploadController', () => {
  let controller: AttendanceUploadController;
  let userRepo: jest.Mocked<Pick<Repository<User>, 'findOne'>>;
  let clanMemberRepo: jest.Mocked<Pick<Repository<ClanMember>, 'findOne'>>;
  let attendanceRepo: jest.Mocked<
    Pick<Repository<AttendanceRecord>, 'create' | 'save'>
  >;

  const baseUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-uuid-1',
      discordId: '111222333444555666',
      ...overrides,
    }) as unknown as User;

  const baseClanMember = (): ClanMember =>
    ({
      id: 'cm-uuid-1',
      userId: 'user-uuid-1',
    }) as unknown as ClanMember;

  beforeEach(async () => {
    const mockUserRepo = { findOne: jest.fn() };
    const mockClanMemberRepo = { findOne: jest.fn() };
    const mockAttendanceRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceUploadController],
      providers: [
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        {
          provide: getRepositoryToken(ClanMember),
          useValue: mockClanMemberRepo,
        },
        {
          provide: getRepositoryToken(AttendanceRecord),
          useValue: mockAttendanceRepo,
        },
      ],
    }).compile();

    controller = module.get<AttendanceUploadController>(
      AttendanceUploadController,
    );
    userRepo = module.get(getRepositoryToken(User));
    clanMemberRepo = module.get(getRepositoryToken(ClanMember));
    attendanceRepo = module.get(getRepositoryToken(AttendanceRecord));
  });

  afterEach(() => jest.clearAllMocks());

  // ==================== 파일 없음 ====================

  describe('upload — 파일 누락', () => {
    it('file이 없으면 BadRequestException을 던진다', async () => {
      await expect(controller.upload(undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== 정상 처리 ====================

  describe('upload — 정상 행 처리', () => {
    it('유효한 discord_id 행은 success로 분류하고 AttendanceRecord를 저장한다', async () => {
      const discordId = '111222333444555666';
      const file = {
        buffer: makeXlsxBuffer([{ discord_id: discordId, status: 'PRESENT' }]),
      } as Express.Multer.File;

      const user = baseUser({ discordId });
      const cm = baseClanMember();
      const record = { memberId: cm.id } as AttendanceRecord;

      (userRepo.findOne as jest.Mock).mockResolvedValue(user);
      (clanMemberRepo.findOne as jest.Mock).mockResolvedValue(cm);
      (attendanceRepo.create as jest.Mock).mockReturnValue(record);
      (attendanceRepo.save as jest.Mock).mockResolvedValue(record);

      const result = await controller.upload(file);

      expect(result.total).toBe(1);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results[0]).toMatchObject({
        ok: true,
        discord_id: discordId,
      });
      expect(attendanceRepo.save).toHaveBeenCalledTimes(1);
    });

    it('status가 없으면 PRESENT로 기본 처리한다', async () => {
      const discordId = '111222333444555666';
      const file = {
        buffer: makeXlsxBuffer([{ discord_id: discordId }]),
      } as Express.Multer.File;

      const user = baseUser({ discordId });
      const cm = baseClanMember();
      const record = {} as AttendanceRecord;

      (userRepo.findOne as jest.Mock).mockResolvedValue(user);
      (clanMemberRepo.findOne as jest.Mock).mockResolvedValue(cm);
      (attendanceRepo.create as jest.Mock).mockReturnValue(record);
      (attendanceRepo.save as jest.Mock).mockResolvedValue(record);

      await controller.upload(file);

      expect(attendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: AttendanceStatus.PRESENT }),
      );
    });
  });

  // ==================== 에러 행 처리 ====================

  describe('upload — 에러 행 처리', () => {
    it('discord_id 누락된 행은 fail로 분류한다', async () => {
      const file = {
        buffer: makeXlsxBuffer([{ status: 'PRESENT' }]),
      } as Express.Multer.File;

      const result = await controller.upload(file);

      expect(result.total).toBe(1);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0]).toMatchObject({
        ok: false,
        reason: 'discord_id 누락',
      });
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });

    it('User 미존재 행은 fail로 분류한다', async () => {
      const file = {
        buffer: makeXlsxBuffer([{ discord_id: '999000999000999000' }]),
      } as Express.Multer.File;

      (userRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await controller.upload(file);

      expect(result.total).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[0]).toMatchObject({
        ok: false,
        reason: 'User 미존재',
      });
      expect(attendanceRepo.save).not.toHaveBeenCalled();
    });

    it('ClanMember 미존재 행은 fail로 분류한다', async () => {
      const discordId = '111222333444555666';
      const file = {
        buffer: makeXlsxBuffer([{ discord_id: discordId }]),
      } as Express.Multer.File;

      (userRepo.findOne as jest.Mock).mockResolvedValue(
        baseUser({ discordId }),
      );
      (clanMemberRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await controller.upload(file);

      expect(result.failed).toBe(1);
      expect(result.results[0]).toMatchObject({
        ok: false,
        reason: 'ClanMember 미존재',
      });
    });

    it('성공/실패 행이 혼재할 때 집계가 정확하다', async () => {
      const rows = [
        { discord_id: '111111111111111111' }, // 정상
        { discord_id: '' }, // discord_id 누락
        { discord_id: '999999999999999999' }, // User 미존재
      ];
      const file = {
        buffer: makeXlsxBuffer(rows),
      } as Express.Multer.File;

      const user = baseUser({ discordId: '111111111111111111' });
      const cm = baseClanMember();
      const record = {} as AttendanceRecord;

      (userRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(user) // 첫 번째 행
        .mockResolvedValueOnce(null); // 세 번째 행

      (clanMemberRepo.findOne as jest.Mock).mockResolvedValue(cm);
      (attendanceRepo.create as jest.Mock).mockReturnValue(record);
      (attendanceRepo.save as jest.Mock).mockResolvedValue(record);

      const result = await controller.upload(file);

      expect(result.total).toBe(3);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(2);
    });
  });

  // ==================== 빈 파일 ====================

  describe('upload — 빈 데이터', () => {
    it('데이터 행이 없는 xlsx이면 total=0, success=0을 반환한다', async () => {
      // 헤더만 있고 데이터 없음
      const file = {
        buffer: makeXlsxBuffer([]),
      } as Express.Multer.File;

      const result = await controller.upload(file);

      expect(result.total).toBe(0);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});
