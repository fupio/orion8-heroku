"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _ws = require("ws");

var _ws2 = _interopRequireDefault(_ws);

var _log = require("log");

var _log2 = _interopRequireDefault(_log);

var _blockchain = require("./blockchain");

var _blockchain2 = _interopRequireDefault(_blockchain);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var messageType = {
  QUERY_LATEST: 0,
  QUERY_ALL: 1,
  RESPONSE_BLOCKCHAIN: 2,
  MINE_BLOCK: 3,
  PONG: 4
};

var log = new _log2.default("info");

var PeerToPeerServer = function PeerToPeerServer(blockchainInstance) {
  var _this = this;

  _classCallCheck(this, PeerToPeerServer);

  this.startServer = function (port) {
    var server = new _ws2.default.Server({ port: port });
    server.on("connection", function (ws) {
      return _this.initConnection(ws);
    });
  };

  this.initConnection = function (ws) {
    _this.peers.push(ws);
    _this.initMessageHandler(ws);
    _this.initErrorHandler(ws);
    _this.ship(ws, _this.queryChainLengthMsg());
  };

  this.initMessageHandler = function (ws) {
    ws.on("message", function (data) {
      try {
        var message = JSON.parse(data);
        log.info("Received message: " + JSON.stringify(message));
        switch (message.type) {
          case messageType.QUERY_LATEST:
            log.info(messageType.QUERY_LATEST);
            _this.ship(ws, _this.responseLatestMsg());
            break;
          case messageType.QUERY_ALL:
            log.info(messageType.QUERY_ALL);
            _this.ship(ws, _this.responseChainMsg());
            break;
          case messageType.RESPONSE_BLOCKCHAIN:
            log.info(messageType.RESPONSE_BLOCKCHAIN);
            _this.handleBlockchainResponse(message);
            break;
          case messageType.MINE_BLOCK:
            log.info(messageType.RESPONSE_BLOCKCHAIN);
            _this.mineBlock(message);
            break;
          default:
            log.info("PONG geldi !");
            _this.ship(ws, { type: messageType.PONG });
        }
      } catch (error) {
        log.info(error);
        log.info("parsing error");
      }
    });
  };

  this.initErrorHandler = function (ws) {
    ws.on("close", function () {
      return _this.closeConnection(ws);
    });
    ws.on("error", function () {
      return _this.closeConnection(ws);
    });
  };

  this.closeConnection = function (ws) {
    log.info("connection failed to peer: " + ws.url);
    _this.peers.splice(_this.peers.indexOf(ws), 1);
  };

  this.queryChainLengthMsg = function () {
    var response = { type: messageType.QUERY_LATEST };
    return response;
  };

  this.queryAllMsg = function () {
    var response = { type: messageType.QUERY_ALL };
    return response;
  };

  this.responseChainMsg = function () {
    var response = {
      type: messageType.RESPONSE_BLOCKCHAIN,
      data: JSON.stringify(_this.blockchain)
    };
    return response;
  };

  this.responseLatestMsg = function () {
    var response = {
      type: messageType.RESPONSE_BLOCKCHAIN,
      data: JSON.stringify([_this.blockchain.getLatestBlock()])
    };
    return response;
  };

  this.ship = function (ws, message) {
    ws.send(JSON.stringify(message));
  };

  this.broadcast = function (message) {
    return _this.peers.forEach(function (peer) {
      return _this.ship(peer, message);
    });
  };

  this.handleBlockchainResponse = function (message) {
    var receivedBlocks = JSON.parse(message.data).sort(function (b1, b2) {
      return b1.index - b2.index;
    });
    var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    var latestBlockHeld = _this.blockchain.getLatestBlock();
    if (latestBlockReceived.index > latestBlockHeld.index) {
      log.info("blockchain possibly behind. We got: " + latestBlockHeld.index + " \n         Peer got: " + latestBlockReceived.index);
      if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
        log.info("We can append the received block to our chain");
        _this.blockchain.push(latestBlockReceived);
        _this.broadcast(_this.responseLatestMsg());
      } else if (receivedBlocks.length === 1) {
        log.info("We have to query the chain from our peer");
        _this.broadcast(_this.queryAllMsg());
      } else {
        log.info("Received blockchain is longer than current blockchain");
        _this.replaceChain(receivedBlocks);
      }
    } else {
      log.info("received blockchain is not longer than current blockchain. Do nothing");
    }
  };

  this.mineBlock = function (message) {
    var messageObject = void 0;
    try {
      messageObject = JSON.parse(message);
    } catch (e) {
      return log.info("parsing error");
    }
    if (message !== null && (typeof messageObject === "undefined" ? "undefined" : _typeof(messageObject)) === "object") {
      var newBlock = _this.generateNextBlock(messageObject);
      _this.blockchain.addBlock(newBlock);
      _this.broadcast(_this.responseLatestMsg());
      log.info("block added: ");
      log.info(JSON.stringify(newBlock));
    }
    return messageObject;
  };

  this.generateNextBlock = function (blockData) {
    var previousBlock = _this.blockchain.getLatestBlock();
    var index = previousBlock.index + 1;
    var timestamp = Date.now();
    var previousHash = previousBlock.hash;
    return new _blockchain2.default.Block(index, timestamp, previousHash, blockData);
  };

  this.peers = [];
  this.blockchain = blockchainInstance;
};

exports.default = PeerToPeerServer;