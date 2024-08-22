import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class ReleaseSeatDto {
  @ApiProperty({ description: 'The seat number to release' })
  @IsNotEmpty()
  @IsNumber()
  seatNumber: number;

  @ApiProperty({ description: 'The ID of the user releasing the seat' })
  @IsNotEmpty()
  @IsString()
  userId: string;
}
