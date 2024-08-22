import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body('name') name: string) {
    return this.userService.createUser(name);
  }

  @Get(':id')
  async getUser(@Param('id', ParseIntPipe) id: string) {
    return this.userService.getUser(id);
  }
}
