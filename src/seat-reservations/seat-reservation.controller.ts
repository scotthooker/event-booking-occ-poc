import { Controller, Post, Body, Param, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SeatReservationService } from './seat-reservation.service';
import { HoldSeatDto } from './dto/hold-seat.dto';
import { ReleaseSeatDto } from './dto/release-seat.dto';

@ApiTags('seats')
@Controller('seat-reservations')
export class SeatReservationController {
  constructor(
    private readonly seatReservationService: SeatReservationService,
  ) {}

  @Post(':eventId/hold')
  @HttpCode(200)
  @ApiOperation({ summary: 'Hold a seat for an event' })
  @ApiParam({ name: 'eventId', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'The seat has been successfully held.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({
    status: 409,
    description: 'Seat is not available for holding',
  })
  async holdSeat(
    @Param('eventId') eventId: string,
    @Body() holdSeatDto: HoldSeatDto,
  ) {
    return this.seatReservationService.holdSeat(
      eventId,
      holdSeatDto.seatNumber,
      holdSeatDto.userId,
    );
  }
  @Post(':eventId/reserve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reserve a held seat for an event' })
  @ApiParam({ name: 'eventId', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'The seat has been successfully reserved.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({
    status: 409,
    description: 'Seat is not available for reservation',
  })
  async reserveSeat(
    @Param('eventId') eventId: string,
    @Body() reserveSeatDto: HoldSeatDto,
  ) {
    return this.seatReservationService.reserveSeat(
      eventId,
      reserveSeatDto.seatNumber,
      reserveSeatDto.userId,
    );
  }

  @Post(':eventId/release')
  @HttpCode(200)
  @ApiOperation({ summary: 'Release a held or reserved seat' })
  @ApiParam({ name: 'eventId', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'The seat has been successfully released.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({
    status: 404,
    description: 'Seat not found or not held/reserved by the user',
  })
  async releaseSeat(
    @Param('eventId') eventId: string,
    @Body() releaseSeatDto: ReleaseSeatDto,
  ) {
    return this.seatReservationService.releaseSeat(
      eventId,
      releaseSeatDto.seatNumber,
      releaseSeatDto.userId,
    );
  }
}
