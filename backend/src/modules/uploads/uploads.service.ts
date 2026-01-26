import { Injectable, Logger } from '@nestjs/common';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

export interface UploadedFileResult {
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  processUploadedFile(file: Express.Multer.File): UploadedFileResult {
    const url = `/${file.path.replace(/\\/g, '/')}`;
    return {
      url,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  processUploadedFiles(files: Express.Multer.File[]): UploadedFileResult[] {
    return files.map((file) => this.processUploadedFile(file));
  }

  deleteFile(url: string): boolean {
    try {
      const filePath = join(process.cwd(), url.startsWith('/') ? url.slice(1) : url);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.warn(`Failed to delete file: ${url}`, error);
      return false;
    }
  }
}
