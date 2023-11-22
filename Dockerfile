FROM node:20

COPY ./ /app

WORKDIR /app

RUN npm ci

ENV PORT=8080
ENV NETWORK=localtestnet
ENV API_KEYS=afdb8b7e-8fa7-4de9-bd95-b650b839e745
ENV INFURA_API_KEY=ef24377ad66642b8a0dcdaa42ea95e7c
ENV POSTGRES_CONNECTION_STRING=postgresql://user:admin@postgres-event-processor:5432/dripsdb
ENV PRETEND_ALL_REPOS_EXIST=true
ENV REPO_DRIVER_ADDRESS=0xb9C8e18E82687a564Ac4D26E22D28a4C95057CE9
ENV RPC_URL=http://testnet:8545

CMD ["npm", "run", "start:local"]
