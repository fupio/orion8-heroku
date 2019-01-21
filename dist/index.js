"use strict";

var _express = require("express");

var _express2 = _interopRequireDefault(_express);

var _http = require("http");

var _http2 = _interopRequireDefault(_http);

var _cors = require("cors");

var _cors2 = _interopRequireDefault(_cors);

var _redis = require("redis");

var _redis2 = _interopRequireDefault(_redis);

var _blockchain = require("./blockchain");

var _blockchain2 = _interopRequireDefault(_blockchain);

var _client = require("./client");

var _client2 = _interopRequireDefault(_client);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('dotenv').config();

var ram = _redis2.default.createClient(process.env.REDISCLOUD_URL);

ram.on('connect', function () {
    var orionChain = new _blockchain2.default.Chain(ram);

    var app = (0, _express2.default)();
    var server = _http2.default.createServer(app);
    app.use((0, _cors2.default)());
    app.get('/', function (_req, response) {
        return response.json(orionChain.getLatestBlock());
    });

    var port = process.env.PORT || 5000;
    server.listen(port);

    var clientWebsocketServer = new _client2.default(orionChain);
    clientWebsocketServer.startServer(server);
    console.log("listening client ws server port on: " + port);
});
ram.on('error', function (err) {
    console.log("Error: " + err);
});