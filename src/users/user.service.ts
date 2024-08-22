import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async createUser(name: string) {
    return this.prisma.user.create({
      data: { name },
    });
  }

  async getUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
