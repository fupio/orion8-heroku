require('dotenv').config();
import express from "express";
import http from "http";
import cors from "cors";

import blockchain from "./blockchain";
import ClientServer from "./client";

// // Connect to the backup db server
// import mongoUtil from "./util/mongo";
// mongoUtil.connectToServer((err) => err && console.log(err));

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

// const wss = new WebSocketServer({ server })

// wss.on('connection', (ws) => {
// 	console.log('Client connected');
// 	ws.on('close', () => console.log('Client disconnected'));
// });
  
// setInterval(() => {
// 	wss.clients.forEach((client) => {
// 	  client.send(new Date().toTimeString());
// 	});
// }, 1000);