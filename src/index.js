require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoUtil = require('./util/mongo');

import blockchain from "./blockchain";
import ClientServer from "./client";

const orionChain = new blockchain.Chain();

const clientWebsocketServer = new ClientServer(orionChain);
clientWebsocketServer.startServer(38746);
console.log(`listening client ws server port on: 38746`);

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'dist')));

mongoUtil.connectToServer(function(err) {
	if (err) return console.log(err);
});

app.get('/', function(req, response) {
	response.json({"latest": orionChain.getLatestBlock()})
});

const port = process.env.PORT || 5000;
app.set('port', port);

const server = http.createServer(app);

server.listen(port, () => console.log(`API running on localhost:${port}`));
