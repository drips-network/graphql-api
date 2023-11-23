FROM node:latest

# Get the latest version of Playwright
FROM mcr.microsoft.com/playwright:focal
 
RUN apt-get update && apt-get -y install make g++ gcc libnss3 libatk-bridge2.0-0 libdrm-dev libxkbcommon-dev libgbm-dev libasound-dev libatspi2.0-0 libxshmfence-dev

ADD "https://api.github.com/repos/drips-network/app/commits?per_page=1" latest_commit
RUN git clone -b main --single-branch https://github.com/drips-network/app.git
COPY ./services/app/envfile /app/.env

WORKDIR /app

RUN npm ci
RUN npx playwright install --with-deps

COPY ./services/app/scripts /

WORKDIR /

CMD ["sh", "build-and-start-tests.sh"]
