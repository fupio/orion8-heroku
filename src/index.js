require('dotenv').config();

import express from "express";
import http from "http";
import cors from "cors";
import redis from "redis";

import blockchain from "./blockchain";
import ClientServer from "./client";

const ram = redis.createClient(process.env.REDISCLOUD_URL)

ram.on('connect', () => {
    const orionChain = new blockchain.Chain(ram);
    
    const app = express();
    const server = http.createServer(app);
    app.use(cors());
    app.get('/', (_req, response) => response.json(orionChain.getLatestBlock()))

    const port = process.env.PORT || 5000;
    server.listen(port)

    const clientWebsocketServer = new ClientServer(orionChain);
    clientWebsocketServer.startServer(server);
    console.log(`listening client ws server port on: ${port}`);
});

ram.on('error', err => {
    console.log(`Error: ${err}`);
});
