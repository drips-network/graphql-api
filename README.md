# Drips GraphQL API

:warning: **Warning**: This project is currently under active development.

Drips GraphQL API acts as the query layer for the database created by [Drips Event Processor](https://github.com/drips-network/events-processor).

Drips Event Processor is a custom, read-only backend service for [Drips](https://drips.network). It ingests low-level Drips protocol Ethereum events and related IPFS documents in real-time, and produces a database of higher-level entities for the Drips App (such as "Drip Lists" and "Projects"). This database is then read by this API service in order to provide a single, convenient and fast endpoint for querying decentralized data within the Drips Network without complicated client-side logic.

As "read-only" services, Drips Event Processor and Drips GraphQL API together merely act as a query API layer for on-chain activity, meaning that Ethereum and IPFS remain the source of truth for all activity on Drips. In practice, this means that anyone is able to run an instance of this service and reach the exact same state as Drips' production instance once all past events have been ingested.

<br />

![Overview Diagram of Drips architecture](https://raw.githubusercontent.com/drips-network/events-processor/main/docs/assets/drips-event-processor-diagram.png)

<br />

Drips Event Processor & GraphQL API together are comparable in functionality and scope to the [Drips Subgraph](https://github.com/drips-network/subgraph), but add the flexibility of computing and exposing higher-level abstracted entities (such as `Projects` and `Drip Lists`). The canonical state of these entities is derived from low-level generics within the [Drips Protocol](https://github.com/drips-network/contracts), in combination with metadata stored on IPFS.

## 🚀 Launching The Application

First, populate `.env` according to `.env.template`.

To launch the application, run:

```bash
npm install
```

Now, run

```bash
npm run start:dev
```

to start the server.
