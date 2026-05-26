import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { AttendanceUploadController } from './attendance-upload.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceStatus } from './entities/attendance-record.entity';

function makeXlsxBuffer(rows: object[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('AttendanceUploadController', () => {
  let controller: AttendanceUploadController;
  let attendance: jest.Mocked<Pick<AttendanceService, 'bulkUploadRecord'>>;

  beforeEach(async () => {
    const mockAttendance = { bulkUploadRecord: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceUploadController],
      providers: [{ provide: AttendanceService, useValue: mockAttendance }],
    }).compile();

    controller = module.get(AttendanceUploadController);
    attendance = module.get(AttendanceService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('upload — 파일 누락', () => {
    it('file이 없으면 BadRequestException을 던진다', async () => {
      await expect(controller.upload(undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('upload — 정상 처리', () => {
    it('유효한 discord_id 행은 service 호출 후 success로 분류', async () => {
      const discordId = '111222333444555666';
      const file = {
        buffer: makeXlsxBuffer([{ discord_id: discordId, status: 'PRESENT' }]),
      } as Express.Multer.File;

      (attendance.bulkUploadRecord as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await controller.upload(file);

      expect(result.total).toBe(1);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(attendance.bulkUploadRecord).toHaveBeenCalledWith({
        discordId,
        scrimId: null,
        status: AttendanceStatus.PRESENT,
      });
    });

    it('status가 없으면 PRESENT로 service에 전달', async () => {
      const discordId = '111222333444555666';
      const file = {
        buffer: makeXlsxBuffer([{ discord_id: discordId }]),
      } as Express.Multer.File;

      (attendance.bulkUploadRecord as jest.Mock).mockResolvedValue({
        ok: true,
      });

      await controller.upload(file);

      expect(attendance.bulkUploadRecord).toHaveBeenCalledWith(
        expect.objectContaining({ status: AttendanceStatus.PRESENT }),
      );
    });
  });

  describe('upload — 에러 행 처리', () => {
    it('discord_id 누락된 행은 service 호출 없이 fail', async () => {
      const file = {
        buffer: makeXlsxBuffer([{ status: 'PRESENT' }]),
      } as Express.Multer.File;

      const result = await controller.upload(file);

      expect(result.failed).toBe(1);
      expect(result.results[0]).toMatchObject({
        ok: false,
        reason: 'discord_id 누락',
      });
      expect(attendance.bulkUploadRecord).not.toHaveBeenCalled();
    });

    it('service가 ok:false 반환 시 reason 그대로 전달', async () => {
      const file = {
        buffer: makeXlsxBuffer([{ discord_id: '999000999000999000' }]),
      } as Express.Multer.File;

      (attendance.bulkUploadRecord as jest.Mock).mockResolvedValue({
        ok: false,
        reason: 'User 미존재',
      });

      const result = await controller.upload(file);

      expect(result.failed).toBe(1);
      expect(result.results[0]).toMatchObject({
        ok: false,
        reason: 'User 미존재',
      });
    });

    it('성공/실패 행 혼재 집계', async () => {
      const rows = [
        { discord_id: '111111111111111111' },
        { discord_id: '' },
        { discord_id: '999999999999999999' },
      ];
      const file = {
        buffer: makeXlsxBuffer(rows),
      } as Express.Multer.File;

      (attendance.bulkUploadRecord as jest.Mock)
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: false, reason: 'User 미존재' });

      const result = await controller.upload(file);

      expect(result.total).toBe(3);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(2);
    });
  });

  describe('upload — 빈 데이터', () => {
    it('데이터 행이 없는 xlsx이면 total=0', async () => {
      const file = {
        buffer: makeXlsxBuffer([]),
      } as Express.Multer.File;

      const result = await controller.upload(file);

      expect(result.total).toBe(0);
      expect(result.success).toBe(0);
    });
  });
});
