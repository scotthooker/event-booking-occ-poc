import { ApiProperty } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ example: 'Concert', description: 'The name of the event' })
  name: string;

  @ApiProperty({
    example: 100,
    description: 'The number of seats for the event',
  })
  seatCount: number;
}
