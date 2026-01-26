import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(AuthGuard('jwt'))
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('images')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }
    return this.uploadsService.processUploadedFile(file);
  }

  @Post('images/multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('파일이 없습니다.');
    }
    return this.uploadsService.processUploadedFiles(files);
  }
}
