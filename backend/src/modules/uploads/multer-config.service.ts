import { Injectable, BadRequestException } from '@nestjs/common';
import {
  MulterOptionsFactory,
  MulterModuleOptions,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class MulterConfigService implements MulterOptionsFactory {
  createMulterOptions(): MulterModuleOptions {
    return {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const now = new Date();
          const year = now.getFullYear();
          const dayOfYear = Math.ceil(
            (now.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1,
          );
          const dest = `uploads/${year}/${dayOfYear}`;
          mkdirSync(dest, { recursive: true });
          cb(null, dest);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(
            new BadRequestException(
              '허용되지 않는 파일 형식입니다. (jpeg, png, gif, webp만 가능)',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
    };
  }
}
