# Scalable Event Seat Reservation System

## Introduction

This project is a scalable event seat reservation system built with NestJS, TypeScript, and Prisma ORM. It's designed to handle concurrent seat reservations for events efficiently and reliably, using either Optimistic Concurrency Control (OCC) or Redis-based locking strategies.

## Key Features

1. **Event Management**: Create and manage events with customizable seat layouts.

2. **Seat Reservation**: 
   - Hold seats for a limited time
   - Reserve held seats
   - Release held or reserved seats

3. **Concurrency Handling**: 
   - Optimistic Concurrency Control (OCC) for handling concurrent operations
   - Redis-based distributed locking as an alternative strategy

4. **Scalability**: Designed to handle high concurrency and be horizontally scalable.

5. **Performance Optimization**: Efficient querying and caching strategies for improved performance.

6. **Robust Error Handling**: Comprehensive error handling for various scenarios.

7. **API Documentation**: Swagger/OpenAPI documentation for easy API exploration.

8. **Automated Testing**: Extensive unit and integration tests.

## Technologies Used

- Node.js (Latest LTS)
- NestJS (Latest)
- TypeScript (Latest)
- Prisma ORM with ZenStack (Latest)
- PostgreSQL (Latest)
- Redis (for distributed locking strategy)
- Docker (Latest)

## Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/your-repo/scalable-event-seat-reservation.git
   cd scalable-event-seat-reservation
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the variables in `.env` with your database and Redis configurations

4. Run database migrations:
   ```
   npx prisma migrate dev
   ```

5. Start the application:
   ```
   npm run start:dev
   ```

6. Access the Swagger API documentation at `http://localhost:3000/api`

## Seat Reservation Strategies

This system supports two strategies for handling seat reservations:

1. **Optimistic Concurrency Control (OCC)**:
   - Uses a version field to detect conflicts
   - Suitable for scenarios with low contention

2. **Redis-based Locking**:
   - Uses Redis for distributed locking
   - Provides stronger guarantees in high-contention scenarios
   - Requires additional Redis setup

The strategy can be configured in the `SeatReservationConfigService`.

## Running Tests

To run the test suite:

```
npm run test
```

For end-to-end tests:

```
npm run test:e2e
```
