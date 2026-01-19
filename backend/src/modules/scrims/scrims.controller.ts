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

@Controller('scrims')
export class ScrimsController {
  constructor(private readonly scrimsService: ScrimsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createScrimDto: any, @Request() req) {
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
  update(@Param('id') id: string, @Body() updateScrimDto: any) {
    return this.scrimsService.update(id, updateScrimDto);
  }
}
