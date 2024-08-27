FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build
ENV DATABASE_URL="postgresql://user:password@localhost:5432/event_reservation?schema=public"
ENV REDIS_URL="redis://localhost:6379"
ENV REDIS_PORT=6379
ENV REDIS_HOST=localhost

CMD ["npm", "run", "start:prod"]
