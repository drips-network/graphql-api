FROM node:20-alpine3.16

RUN apk add --no-cache git

WORKDIR /app

ADD "https://api.github.com/repos/drips-network/events-processor/commits?per_page=1" latest_commit
RUN git clone https://github.com/drips-network/events-processor.git

WORKDIR /app/events-processor
COPY ./services/events-processor/envfile .env.local

RUN npm ci
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:local"]
