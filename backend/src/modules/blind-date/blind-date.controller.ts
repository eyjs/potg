import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BlindDateService } from './blind-date.service';
import { CreateListingDto, UpdateListingDto } from './dto/create-listing.dto';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('blind-date')
export class BlindDateController {
  constructor(private readonly blindDateService: BlindDateService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('listings')
  createListing(
    @Body() dto: CreateListingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.blindDateService.createListing(dto, req.user.userId);
  }

  @Get('listings')
  findAll(
    @Query('clanId') clanId: string,
    @Query('status') status?: string,
    @Query('gender') gender?: string,
    @Query('ageMin') ageMin?: string,
    @Query('ageMax') ageMax?: string,
    @Query('location') location?: string,
    @Query('mbti') mbti?: string,
    @Query('smoking') smoking?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.blindDateService.findAll({
      clanId,
      status,
      gender,
      ageMin: ageMin ? Number(ageMin) : undefined,
      ageMax: ageMax ? Number(ageMax) : undefined,
      location,
      mbti,
      smoking,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('listings/:id')
  findOne(@Param('id') id: string) {
    return this.blindDateService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('listings/:id')
  updateListing(
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.blindDateService.updateListing(id, dto, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('listings/:id/close')
  closeListing(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.blindDateService.closeListing(
      id,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('listings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteListing(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.blindDateService.deleteListing(
      id,
      req.user.userId,
      req.user.role,
    );
  }
}
