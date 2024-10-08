import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from './../src/prisma/prisma.service';

describe('SeatController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [PrismaService],
    }).compile();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    await prismaService.user.create({
      data: {
        id: uuidv4(),
        name: 'Test User',
      },
    });

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should hold, reserve, and release a seat', async () => {
    const userId = uuidv4();
    await prismaService.user.create({
      data: {
        id: userId,
        name: 'Test User',
      },
    });

    // Create an event
    const eventResponse = await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Test Event', seatCount: 1 })
      .expect(201);

    const eventId = eventResponse.body.id;

    // Hold a seat
    const holdResponse = await request(app.getHttpServer())
      .post(`/seat-reservations/${eventId}/hold`)
      .send({ seatNumber: 1, userId })
      .expect(200);

    expect(holdResponse.body.status).toBe('held');

    // Reserve the held seat
    const reserveResponse = await request(app.getHttpServer())
      .post(`/seat-reservations/${eventId}/reserve`)
      .send({ seatNumber: 1, userId })
      .expect(200);

    expect(reserveResponse.body.status).toBe('reserved');

    // Release the reserved seat
    const releaseResponse = await request(app.getHttpServer())
      .post(`/seat-reservations/${eventId}/release`)
      .send({ seatNumber: 1, userId })
      .expect(200);

    expect(releaseResponse.body.status).toBe('available');
  });

  it('should not allow reserving a seat that is not held', async () => {
    const userId = uuidv4();
    await prismaService.user.create({
      data: {
        id: userId,
        name: 'Test User',
      },
    });
    // Create an event
    const eventResponse = await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Test Event', seatCount: 1 })
      .expect(201);

    const eventId = eventResponse.body.id;

    // Try to reserve a seat without holding it first
    await request(app.getHttpServer())
      .post(`/seat-reservations/${eventId}/reserve`)
      .send({ seatNumber: 1, userId })
      .expect(409);
  });

  it('should not allow holding a seat that is already held', async () => {
    const userId = uuidv4();
    await prismaService.user.create({
      data: {
        id: userId,
        name: 'Test User',
      },
    });
    // Create an event
    const eventResponse = await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Test Event', seatCount: 1 })
      .expect(201);

    const eventId = eventResponse.body.id;

    // Hold a seat
    await request(app.getHttpServer())
      .post(`/seat-reservations/${eventId}/hold`)
      .send({ seatNumber: 1, userId })
      .expect(200);

    // Try to hold the same seat again
    await request(app.getHttpServer())
      .post(`/seat-reservations/${eventId}/hold`)
      .send({ seatNumber: 1, userId })
      .expect(409);
  });

  afterAll(async () => {
    await prismaService.seat.deleteMany();
    await prismaService.event.deleteMany();
    await app.close();
  });
});
