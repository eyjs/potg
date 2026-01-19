import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { BlindDateService } from './blind-date.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('blind-date')
export class BlindDateController {
  constructor(private readonly blindDateService: BlindDateService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('listings')
  createListing(@Body() dto: CreateListingDto, @Request() req: AuthenticatedRequest) {
    return this.blindDateService.createListing(dto, req.user.userId);
  }

  @Get('listings')
  findAll(@Query('clanId') clanId: string) {
    return this.blindDateService.findAll(clanId);
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
  approveRequest(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.blindDateService.approveRequest(id, req.user.userId);
  }
}
