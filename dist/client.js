"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _ws = require("ws");

var _ws2 = _interopRequireDefault(_ws);

var _urlParse = require("url-parse");

var _urlParse2 = _interopRequireDefault(_urlParse);

var _jsontokens = require("jsontokens");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ClientServer = function () {
  function ClientServer(blockchainInstance) {
    var _this = this;

    _classCallCheck(this, ClientServer);

    this.initConnection = function (ws, req) {
      var parameters = (0, _urlParse2.default)(req.url, true);
      var decodedToken = (0, _jsontokens.decodeToken)(parameters.query.token);

      if (decodedToken) {
        var publicKey = decodedToken.payload.iss;
        var pieces = publicKey.split(":");
        if (pieces.length > 1) {
          var client = {
            // id: req.headers['sec-websocket-key'],
            id: pieces[pieces.length - 1],
            blockstack: pieces[pieces.length - 1],
            isAuthenticated: true,
            protocolVersion: 1,
            connection: ws
          };
          if (!_this.subscriptions.has(client.id)) {
            _this.subscriptions.set(client.id, new Set());
          }
          _this.subscriptions.get(client.id).add(client.id);
          _this.clients.set(client.id, client);

          _this.initMessageHandler(ws, client);
          _this.initErrorHandler(ws, client);
        } else {
          throw new Error("Code smells. We want public key with the :");
        }
      }
    };

    this.unique = function (x) {
      return [].concat(_toConsumableArray(new Set(x)));
    };

    this.initMessageHandler = function (ws, client) {
      ws.on("message", function (data) {
        try {
          var message = JSON.parse(data);
          // console.log(`Received message: ${JSON.stringify(message)}`);
          switch (message.type) {
            case "get_blockchain":
              {
                ws.send(JSON.stringify(_this.responseChainMsg()));
                break;
              }
            case "init_pub_sub":
              {
                if (!_this.clients.has(client.id)) {
                  _this.clients.set(client.id, client);
                }
                var messageTags = message.data && _this.unique(message.data.tags);
                messageTags && messageTags.map(function (tagRaw) {
                  if (typeof tagRaw === "string") {
                    var tag = tagRaw && tagRaw.toLowerCase().trim();
                    if (!_this.subscriptions.has(tag)) {
                      _this.subscriptions.set(tag, new Set());
                    }
                    _this.subscriptions.get(tag).add(client.id);
                  }
                });
                break;
              }
            case "add_feed":
              {
                // 'created' attribute is huge important. don't remove. never ever.
                // that's how we call file name like `${block.created}.json`
                var feed = {
                  type: "feed",
                  username: message.data.username,
                  identity: client.blockstack,
                  tags: _this.unique(message.data.tags),
                  created: message.data.created,
                  updated: message.data.created
                };
                feed.tags.map(function (tagRaw) {
                  var tag = tagRaw.toLowerCase().trim();
                  // set the tag if not.
                  if (!_this.subscriptions.has(tag)) {
                    _this.subscriptions.set(tag, new Set());
                  }
                  // follow the tags if not.
                  _this.subscriptions.get(tag).add(feed.identity);
                  // push the data to followers of the feed.
                  // collapse id's to avoid of sending multiple.
                  _this.subscriptions.get(tag).forEach(function (clientId) {
                    var subscription = _this.clients.get(clientId);
                    if (subscription) {
                      _this.ship(subscription.connection, {
                        type: "feed_load_promise",
                        data: feed
                      });
                    } else {
                      console.log("code smells");
                    }
                  });
                });

                var feedKey = feed.created + "-" + feed.identity;
                if (!_this.subscriptions.has(feedKey)) {
                  _this.subscriptions.set(feedKey, new Set());
                }
                _this.subscriptions.get(feedKey).add(client.id);

                _this.mineBlock(feed);
                break;
              }
            case "add_comment":
              {
                var comment = {
                  type: "comment",
                  feedId: message.data.feedId,
                  username: message.data.username,
                  identity: client.blockstack,
                  text: message.data.text,
                  created: message.data.created,
                  updated: message.data.created
                };

                var subscribeList = _this.subscriptions.get(comment.feedId);
                if (subscribeList) {
                  subscribeList.forEach(function (clientId) {
                    var subscription = _this.clients.get(clientId);
                    _this.ship(subscription.connection, {
                      type: "comment_load_promise",
                      data: comment
                    });
                  });
                } else {
                  console.log("console.log(subscribeList)");
                  console.log(subscribeList);
                }
                // clients following now the feed id's also
                // we need to push parent feed subscribers,
                _this.mineBlock(comment);
                break;
              }
            case "follow_tag":
              {
                var tag = message.data.name.toLowerCase().trim();
                if (!_this.subscriptions.has(tag)) {
                  _this.subscriptions.set(tag, new Set());
                }
                // o etiketleri takip etmiyorsa subscribe et.
                _this.subscriptions.get(tag).add(client.id);
                break;
              }
            case "load_feeds":
              {
                var sentFeedIDs = [];
                var askedTags = message.data.tags;
                var chain = _this.blockchain.getBlockChain();
                chain && chain.map(function (block) {
                  if (block.data.hasOwnProperty("tags") && block.index !== 0) {
                    block.data.tags.map(function (blockTag) {
                      askedTags.map(function (askedTag) {
                        if (blockTag == askedTag) {
                          var _feed = {
                            username: block.data.username,
                            identity: block.data.identity,
                            tags: _this.unique(block.data.tags),
                            created: block.data.created,
                            updated: block.data.created
                          };
                          _this.ship(_this.clients.get(client.id).connection, {
                            type: "feed_load_promise",
                            data: _feed
                          });
                          var feedID = _feed.created + "-" + _feed.identity;
                          sentFeedIDs.push(feedID);
                        }
                      });
                    });
                  }
                });

                // TODO: gönderilen feedlerin idlerini bir yere topla,
                // chain'i tekrar tarayıp onların datalarını pass et.
                var sentComment = [];
                var subscription = _this.clients.get(client.id);
                chain && chain.map(function (block) {
                  sentFeedIDs.map(function (sentFeedId) {
                    if (block.data.type == "comment" && block.data.feedId == sentFeedId) {
                      var commentID = block.data.feedId + "-" + block.data.created;
                      if (!sentComment.includes(commentID)) {
                        sentComment.push(commentID);
                        _this.ship(subscription.connection, {
                          type: "comment_load_promise",
                          data: block.data
                        });
                      }
                    }
                  });
                });
                break;
              }
            default:
              _this.ship(ws, { type: "pong" });
              break;
          }
        } catch (error) {
          console.log(error);
          console.log("parsing error");
        }
      });
    };

    this.mineBlock = function (block) {
      var blockIsMined = false;
      do {
        var nextBlock = _this.blockchain.generateNextBlock(block);
        // console.log("mineBlock in nextBlock", nextBlock, "\n****");
        blockIsMined = _this.blockchain.addBlock(nextBlock);
        if (blockIsMined) {
          break;
        }
      } while (true);
    };

    this.initErrorHandler = function (ws, client) {
      ws.on("close", function () {
        return _this.closeConnection(ws, client);
      });
      ws.on("error", function () {
        return _this.closeConnection(ws, client);
      });
    };

    this.closeConnection = function (ws, client) {
      _this.clients.delete(client.id);
      // todo: döngüyle tüm subscriptionstan client idyi sil.
    };

    this.responseChainMsg = function () {
      return {
        type: "get_blockchain",
        data: JSON.stringify(_this.blockchain.getBlockChain())
      };
    };

    this.ship = function (ws, message) {
      ws.send(JSON.stringify(message));
    };

    this.blockchain = blockchainInstance;
    // [tag] = ['client id 1', 'client id 2']
    this.subscriptions = new Map();
    // [client id] = {client}
    this.clients = new Map();
  }

  _createClass(ClientServer, [{
    key: "startServer",
    value: function startServer(server) {
      var _this2 = this;

      var wss = new _ws2.default.Server({ 'server': server });
      wss.on("connection", function (ws, req) {
        return _this2.initConnection(ws, req);
      });
    }
  }]);

  return ClientServer;
}();

exports.default = ClientServer;