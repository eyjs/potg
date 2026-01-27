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
  findAll(@Query('clanId') clanId: string) {
    return this.blindDateService.findAll(clanId);
  }

  @Get('listings/:id')
  findOne(@Param('id') id: string) {
    return this.blindDateService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('listings/:id/requests')
  getListingRequests(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.blindDateService.getListingRequests(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('listings/:id/request')
  requestDate(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body('message') message?: string,
  ) {
    return this.blindDateService.requestDate(id, req.user.userId, message);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('requests/:id/approve')
  approveRequest(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.blindDateService.approveRequest(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('requests/:id/reject')
  rejectRequest(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.blindDateService.rejectRequest(id, req.user.userId);
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
  @Patch('listings/:id')
  patchListing(
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.blindDateService.updateListing(id, dto, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('listings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteListing(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.blindDateService.deleteListing(id, req.user.userId);
  }
}
