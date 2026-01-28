import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BettingService } from './betting.service';
import { AuthGuard } from '@nestjs/passport';
import { BettingAnswer } from './enums/betting.enum';
import { CreateQuestionDto, PlaceBetDto, UpdateQuestionDto } from './dto/betting.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

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

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('questions/:id')
  updateQuestion(
    @Param('id') id: string,
    @Body() updateDto: UpdateQuestionDto,
  ) {
    return this.bettingService.updateQuestion(id, updateDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('questions/:id/settle')
  settle(@Param('id') id: string, @Body('result') result: BettingAnswer) {
    return this.bettingService.settleQuestion(id, result);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('questions')
  findAll() {
    return this.bettingService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('questions/:id')
  findOne(@Param('id') id: string) {
    return this.bettingService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('tickets/my')
  findMyTickets(@Request() req: AuthenticatedRequest) {
    return this.bettingService.findMyTickets(req.user.userId);
  }
}
