import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { VotesService } from './votes.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateVoteDto, CastVoteDto } from './dto/vote.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body() createVoteDto: CreateVoteDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.votesService.create(createVoteDto, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Query('clanId') clanId: string, @Request() req: AuthenticatedRequest) {
    return this.votesService.findAll(clanId, req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.votesService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/cast')
  castVote(
    @Param('id') id: string,
    @Body() castVoteDto: CastVoteDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.votesService.castVote(
      id,
      castVoteDto.optionId,
      req.user.userId,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/close')
  close(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.votesService.close(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.votesService.remove(id, req.user.userId);
  }
}
