FROM node:20

RUN git clone -b main --single-branch https://github.com/drips-network/app.git
COPY ./services/app/envfile /app/.env
COPY ./services/app/scripts /

WORKDIR /app

RUN npm ci

WORKDIR /

CMD ["sh", "build-and-start-tests.sh"]
