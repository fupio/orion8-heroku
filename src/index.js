require('dotenv').config();

import express from "express";
import http from "http";
import cors from "cors";

import blockchain from "./blockchain";
import ClientServer from "./client";

// init blockchain
const orionChain = new blockchain.Chain();

// init express app
const app = express();

// create a server using for ws and rest
const server = http.createServer(app);

app.use(cors());
app.get('/', (_req, response) => response.json(orionChain.getLatestBlock()))

const port = process.env.PORT || 5000;
server.listen(port)

const clientWebsocketServer = new ClientServer(orionChain);
clientWebsocketServer.startServer(server);
console.log(`listening client ws server port on: ${port}`);
