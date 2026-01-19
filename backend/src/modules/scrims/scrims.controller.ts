import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ScrimsService } from './scrims.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateScrimDto, UpdateScrimDto } from './dto/scrim.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('scrims')
export class ScrimsController {
  constructor(private readonly scrimsService: ScrimsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body() createScrimDto: CreateScrimDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.scrimsService.create(createScrimDto, req.user.userId);
  }

  @Get()
  findAll(@Query('clanId') clanId: string) {
    return this.scrimsService.findAll(clanId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scrimsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateScrimDto: UpdateScrimDto) {
    return this.scrimsService.update(id, updateScrimDto);
  }
}
