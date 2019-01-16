require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');


import blockchain from "./blockchain";
import ClientServer from "./client";

const mongoUtil = require('./util/mongo');

mongoUtil.connectToServer(function(err) {
	if (err) return console.log(err);
});

const orionChain = new blockchain.Chain();

// const app = express();
// const port = process.env.PORT || 5000;
// //app.set('port', port);
// const server = http.createServer(app);

// //app.use(cors());
// // app.get('/', function(req, response) {
// // 	response.json(orionChain.getLatestBlock())
// // });

// server.listen(port, () => console.log(`Orion running on localhost:${port}`));

// const clientWebsocketServer = new ClientServer(orionChain);
// clientWebsocketServer.startServer(server);
// //console.log(`listening client ws server port on: 38746`);

var WebSocketServer = require("ws").Server;
var port = process.env.PORT || 5000;
var app = express();
app.use(express.static(__dirname + "/"));
var server = http.createServer(app);

server.listen(port)
var wss = new WebSocketServer({ server })
console.log("websocket server created")

wss.on('connection', (ws) => {
	console.log('Client connected');
	ws.on('close', () => console.log('Client disconnected'));
});
  
setInterval(() => {
	wss.clients.forEach((client) => {
	  client.send(new Date().toTimeString());
	});
}, 1000);