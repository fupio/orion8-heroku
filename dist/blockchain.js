"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _sha = require("crypto-js/sha256");

var _sha2 = _interopRequireDefault(_sha);

var _jsonfile = require("jsonfile");

var _jsonfile2 = _interopRequireDefault(_jsonfile);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

require('dotenv').config();

var Block = function Block(index, timestamp, previousHash, data) {
  var _this = this;

  _classCallCheck(this, Block);

  this.calculateHash = function () {
    return (0, _sha2.default)(_this.index + _this.timestamp + _this.previousHash + JSON.stringify(_this.data)).toString();
  };

  this.index = index;
  this.timestamp = timestamp;
  this.previousHash = previousHash;
  this.data = data;
  this.hash = this.calculateHash();
};

var Chain = function () {
  function Chain(redisProp) {
    var _this2 = this;

    _classCallCheck(this, Chain);

    this.setupDatabase = function () {
      if (_fs2.default.existsSync(_this2.fileName)) {
        var database = _jsonfile2.default.readFileSync(_this2.fileName);
        _this2.ram.set("chain", JSON.stringify(database));
        return database.chain[database.chain.length - 1];
      } else {
        return _this2.ram.get("chain", function (err, reply) {
          if (err) {
            var schema = { chain: [_this2.createGenesisBlock()] };
            _jsonfile2.default.writeFileSync(_this2.fileName, schema);
            _this2.ram.set("chain", JSON.stringify(schema));
            return schema.chain[0];
          }
          var response = JSON.parse(reply);
          _jsonfile2.default.writeFileSync(_this2.fileName, response);
          return response.chain[0];
        });
      }
    };

    this.createBlock = function (index, timestamp, previousHash, data) {
      return new Block(index, timestamp, previousHash, data);
    };

    this.createGenesisBlock = function () {
      return _this2.createBlock(0, Date.now(), "0", "Genesis Block");
    };

    this.addBlock = function (newBlock) {
      var database = _jsonfile2.default.readFileSync(_this2.fileName);
      if (database && database.hasOwnProperty('chain')) {
        database.chain.push(newBlock);
        _this2.latestBlock = database.chain[database.chain.length - 1];
        _jsonfile2.default.writeFileSync(_this2.fileName, database);
        _this2.ram.set("chain", JSON.stringify(database));
        return true;
      } else {
        console.log("database", database);
        return false;
      }
    };

    this.getLatestBlock = function () {
      return _this2.latestBlock;
    };

    this.getBlockChain = function () {
      var database = _jsonfile2.default.readFileSync(_this2.fileName);
      return database.chain;
    };

    this.generateNextBlock = function (blockData) {
      var index = _this2.latestBlock.index + 1;
      var timestamp = Date.now();
      var previousHash = _this2.latestBlock.hash;
      return new Block(index, timestamp, previousHash, blockData);
    };

    this.fileName = "blockchain.db";
    this.ram = redisProp;
    this.latestBlock = this.setupDatabase();
  }

  _createClass(Chain, [{
    key: "isChainValid",
    value: function isChainValid() {
      var database = _jsonfile2.default.readFileSync(this.fileName);
      if (!database) {
        return false;
      }
      for (var i = 1; i < database.chain.length; i += 1) {
        var currentBlock = this.createBlock(database.chain[i].index, database.chain[i].timestamp, database.chain[i].previousHash, database.chain[i].data);
        var previousBlock = this.createBlock(database.chain[i - 1].index, database.chain[i - 1].timestamp, database.chain[i - 1].previousHash, database.chain[i - 1].data);
        if (previousBlock.index + 1 !== currentBlock.index) {
          return false;
        } else if (currentBlock.hash !== currentBlock.calculateHash()) {
          return false;
        } else if (currentBlock.previousHash !== previousBlock.hash) {
          return false;
        }
      }
      return true;
    }
  }]);

  return Chain;
}();

exports.default = { Block: Block, Chain: Chain };