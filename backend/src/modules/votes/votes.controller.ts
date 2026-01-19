import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { VotesService } from './votes.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createVoteDto: any, @Request() req) {
    return this.votesService.create(createVoteDto, req.user.userId);
  }

  @Get()
  findAll(@Query('clanId') clanId: string) {
    return this.votesService.findAll(clanId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.votesService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/cast')
  castVote(
    @Param('id') id: string,
    @Body('optionId') optionId: string,
    @Request() req,
  ) {
    return this.votesService.castVote(id, optionId, req.user.userId);
  }
}
