import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function holdSeat(eventId: string, userId: string, seatNumber: number) {
  // Simulate random booking time within 5s
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 10000));

  try {
    const seat = await prisma.seat.findFirst({
      where: {
        eventId: eventId,
        userId: null,
        status: 'available',
      },
      orderBy: [{ id: 'asc' }],
    });

    if (!seat) {
      throw new Error(`Seat ${seatNumber} is not available.`);
    }

    await prisma.seat.update({
      where: {
        id: seat.id,
        version: seat.version,
      },
      data: {
        status: 'held',
        userId: userId,
        version: {
          increment: 1,
        },
      },
    });

    return true;
  } catch (error) {
    console.error(`Failed to hold seat ${seatNumber}: ${error.message}`);
    return false;
  }
}

describe('Seat Reservation Load Test', () => {
  let eventId: string;
  const seatCount = 50;
  const userCount = 100;

  beforeAll(async () => {
    // Create a test event
    eventId = uuidv4();
    await prisma.event.create({
      data: {
        id: eventId,
        name: 'Load Test Event',
        seats: {
          create: Array.from({ length: seatCount }, (_, i) => ({
            number: i + 1,
            status: 'available',
            version: 0,
          })),
        },
      },
    });

    console.log(`Created event ${eventId} with ${seatCount} seats`);
  });

  afterAll(async () => {
    // Cleanup
    await prisma.seat.deleteMany({ where: { eventId: eventId } });
    await prisma.event.delete({ where: { id: eventId } });
    await prisma.$disconnect();
  });

  it('should handle concurrent seat holds correctly', async () => {
    // Simulate userCount users trying to hold seats
    const promises = Array.from({ length: userCount }, async (_, i) => {
      // Create a real user in the database
      const userId = uuidv4();
      await prisma.user.create({
        data: {
          id: userId,
          name: `Test User ${i + 1}`,
        },
      });

      // Randomly select a seat number
      const seatNumber = Math.floor(Math.random() * seatCount) + 1;
      return holdSeat(eventId, userId, seatNumber);
    });

    const results = await Promise.all(promises);
    const successfulHolds = results.filter((result) => result).length;

    console.log(`Load test complete. Results:`);
    console.log(`Total attempts: ${userCount}`);
    console.log(`Successful holds: ${successfulHolds}`);
    console.log(`Failed holds: ${userCount - successfulHolds}`);

    // Check final state
    const heldSeats = await prisma.seat.count({
      where: {
        eventId: eventId,
        status: 'held',
      },
    });

    console.log(`Actual held seats in database: ${heldSeats}`);

    // Assertions
    expect(successfulHolds).toBeLessThanOrEqual(seatCount);
    expect(heldSeats).toBe(successfulHolds);
  }, 30000); // Increase timeout to 30 seconds
});
