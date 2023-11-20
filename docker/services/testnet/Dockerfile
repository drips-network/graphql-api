FROM node:16
WORKDIR /app

RUN npm install -g ganache

COPY ./testnet/state state

CMD ["ganache", "--chain.chainId", "5", "--host", "0.0.0.0", "--database.dbPath", "/app/state", "--chain.allowUnlimitedInitCodeSize", "--wallet.seed", "1234"]
