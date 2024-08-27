import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class ReserveSeatDto {
  @ApiProperty({ description: 'The seat number to hold' })
  @IsNotEmpty()
  @IsNumber()
  seatNumber: number;

  @ApiProperty({ description: 'The ID of the user holding the seat' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  // verd
}
