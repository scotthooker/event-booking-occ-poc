import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

describe('SeatReservationController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = app.get<PrismaService>(PrismaService);
    await prismaService.$connect();
    await app.init();
  });

  beforeEach(async () => {
    await prismaService.$executeRaw`TRUNCATE TABLE "Seat", "Event", "User" RESTART IDENTITY CASCADE`;
  });

  it('should hold a seat for an event', async () => {
    const userId = uuidv4();
    await prismaService.user.create({
      data: {
        id: userId,
        name: 'Test User',
      },
    });

    const eventResponse = await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Test Event', seatCount: 1 })
      .expect(201);

    const eventId = eventResponse.body.id;

    const holdResponse = await request(app.getHttpServer())
      .post(`/seat-reservations/${eventId}/hold`)
      .send({ seatNumber: 1, userId })
      .expect(200);

    expect(holdResponse.body.status).toBe('held');
  });

  it('should reserve a held seat for an event', async () => {
    const userId = uuidv4();
    await prismaService.user.create({
      data: {
        id: userId,
        name: 'Test User',
      },
    });

    const eventResponse = await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Test Event', seatCount: 1 })
      .expect(201);

    const eventId = eventResponse.body.id;

    await request(app.getHttpServer())
      .post(`/seat-reservations/${eventId}/hold`)
      .send({ seatNumber: 1, userId })
      .expect(200);

    const reserveResponse = await request(app.getHttpServer())
      .post(`/seat-reservations/${eventId}/reserve`)
      .send({ seatNumber: 1, userId })
      .expect(200);

    expect(reserveResponse.body.status).toBe('reserved');
  });

  it('should release a held or reserved seat', async () => {
    const userId = uuidv4();
    await prismaService.user.create({
      data: {
        id: userId,
        name: 'Test User',
      },
    });

    const eventResponse = await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Test Event', seatCount: 1 })
      .expect(201);

    const eventId = eventResponse.body.id;

    await request(app.getHttpServer())
      .post(`/seat-reservations/${eventId}/hold`)
      .send({ seatNumber: 1, userId })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/seat-reservations/${eventId}/reserve`)
      .send({ seatNumber: 1, userId })
      .expect(200);

    const releaseResponse = await request(app.getHttpServer())
      .post(`/seat-reservations/${eventId}/release`)
      .send({ seatNumber: 1, userId })
      .expect(200);

    expect(releaseResponse.body.status).toBe('available');
  });

  afterAll(async () => {
    await prismaService.seat.deleteMany();
    await prismaService.event.deleteMany();
    await app.close();
  });
});
