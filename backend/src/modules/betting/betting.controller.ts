import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BettingService } from './betting.service';
import { AuthGuard } from '@nestjs/passport';
import { BettingAnswer } from './entities/betting-question.entity';
import { CreateQuestionDto, PlaceBetDto } from './dto/betting.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('betting')
export class BettingController {
  constructor(private readonly bettingService: BettingService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('questions')
  createQuestion(
    @Body() createDto: CreateQuestionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.bettingService.createQuestion(createDto, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('questions/:id/bet')
  placeBet(
    @Param('id') id: string,
    @Body() betDto: PlaceBetDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.bettingService.placeBet(id, req.user.userId, betDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('questions/:id/settle')
  settle(@Param('id') id: string, @Body('result') result: BettingAnswer) {
    // Should be Admin/Manager only
    return this.bettingService.settleQuestion(id, result);
  }
}
