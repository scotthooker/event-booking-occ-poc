import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';

@ApiTags('events')
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({
    status: 201,
    description: 'The event has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createEvent(@Body() createEventDto: CreateEventDto) {
    return this.eventService.createEvent(
      createEventDto.name,
      createEventDto.seatCount,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an event by id' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'The event has been successfully retrieved.',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEvent(@Param('id') id: string) {
    return this.eventService.getEvent(id);
  }

  @Get(':id/available-seats')
  @ApiOperation({ summary: 'Get available seats for an event' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'The available seats have been successfully retrieved.',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getAvailableSeats(@Param('id') id: string) {
    return this.eventService.getAvailableSeats(id);
  }
}
