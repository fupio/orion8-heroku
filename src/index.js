require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoUtil = require('./util/mongo');

import blockchain from "./blockchain";
import ClientServer from "./client";

const orionChain = new blockchain.Chain();

const app = express();
app.use(cors());

mongoUtil.connectToServer(function(err) {
	if (err) return console.log(err);
});

app.get('/', function(req, response) {
	response.json(orionChain.getLatestBlock())
});

const port = process.env.PORT || 5000;
//app.set('port', port);

const server = http.createServer(app);

const clientWebsocketServer = new ClientServer(orionChain);
clientWebsocketServer.startServer(server);
//console.log(`listening client ws server port on: 38746`);


server.listen(port, () => console.log(`Orion running on localhost:${port}`));
