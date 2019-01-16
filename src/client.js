import WebSocket from "ws";
import UrlParser from "url-parse";
import { decodeToken, TokenVerifier } from "jsontokens";

class ClientServer {
  constructor(blockchainInstance) {
    this.blockchain = blockchainInstance;
    // [tag] = ['client id 1', 'client id 2']
    this.subscriptions = new Map();
    // [client id] = {client}
    this.clients = new Map();
  }
  startServer(server) {
    const wss = new WebSocket.Server({ 'server': server });
    wss.on("connection", (ws, req) => this.initConnection(ws, req));
  }
  initConnection = (ws, req) => {
    const parameters = UrlParser(req.url, true);
    const decodedToken = decodeToken(parameters.query.token);
    
    if (decodedToken) {
      const publicKey = decodedToken.payload.iss;
      const pieces = publicKey.split(":");
      if (pieces.length > 1) {
        const client = {
          // id: req.headers['sec-websocket-key'],
          id: pieces[pieces.length - 1],
          blockstack: pieces[pieces.length - 1],
          isAuthenticated: true,
          protocolVersion: 1,
          connection: ws
        };
        if (!this.subscriptions.has(client.id)) {
          this.subscriptions.set(client.id, new Set());
        }
        this.subscriptions.get(client.id).add(client.id);
        this.clients.set(client.id, client);
  
        this.initMessageHandler(ws, client);
        this.initErrorHandler(ws, client);
      }
      else {
        throw new Error("Code smells. We want public key with the :");
      }
    }
  };
  unique = x => [...new Set(x)];
  initMessageHandler = (ws, client) => {
    ws.on("message", data => {
      try {
        const message = JSON.parse(data);
        console.log(`Received message: ${JSON.stringify(message)}`);
        switch (message.type) {
          case "get_blockchain": {
            ws.send(JSON.stringify(this.responseChainMsg()));
            break;
          }
          case "init_pub_sub": {
            const messageTags = this.unique(message.data.tags);
            messageTags.map(tagRaw => {
              const tag = tagRaw.toLowerCase().trim();
              if (!this.subscriptions.has(tag)) {
                this.subscriptions.set(tag, new Set());
              }
              this.subscriptions.get(tag).add(client.id);
            });
            if (!this.clients.has(client.id)) {
              this.clients.set(client.id, client);
            }
            break;
          }
          case "add_feed": {
            // 'created' attribute is huge important. don't remove.
            // that's how we call file name like `${block.created}.json`
            const block = {
              identity: client.blockstack,
              tags: this.unique(message.data.tags),
              created: message.data.created,
              updated: message.data.created
            };
            block.tags.map(tagRaw => {
              const tag = tagRaw.toLowerCase().trim();
              // set the tag if not.
              if (!this.subscriptions.has(tag)) {
                this.subscriptions.set(tag, new Set());
              }
              // follow the tags if not.
              this.subscriptions.get(tag).add(client.id);
              // push the data to followers of the feed.
              // this.ship(client.connection, { type: "feed_load_promise", data: block});

              // collapse id's to avoid of sending multiple.
              const sent = [];
              this.subscriptions.get(tag).forEach(clientId => {
                // if (!sent.includes(clientId)) {
                  sent.push(clientId);
                  this.ship(this.clients.get(clientId).connection, {
                    type: "feed_load_promise",
                    data: block
                  });
                // }
              });
            });
            this.mineBlock(block);
            break;
          }
          case "follow_tag": {
            const tag = message.data.name.toLowerCase().trim();
            if (!this.subscriptions.has(tag)) {
              this.subscriptions.set(tag, new Set());
            }
            // o etiketleri takip etmiyorsa subscribe et.
            this.subscriptions.get(tag).add(client.id);
            break;
          }
          case "load_feeds": {
            console.log("TODO: load_feeds here");
            break;
          }
          default:
            ws.send(JSON.stringify({ type: "pong" }));
            break;
        }
      } catch (error) {
        console.log(error);
        console.log("parsing error");
      }
    });
  };
  mineBlock = block => {
    let blockIsMined = false;
    do {
      const nextBlock = this.blockchain.generateNextBlock(block);
      blockIsMined = this.blockchain.addBlock(nextBlock);
      if (blockIsMined) {
        break;
      }
    } while (true);
  };
  initErrorHandler = (ws, client) => {
    ws.on("close", () => this.closeConnection(ws, client));
    ws.on("error", () => this.closeConnection(ws, client));
  };
  closeConnection = (ws, client) => {
    this.clients.delete(client.id);
    // todo: döngüyle tüm subscriptionstan client idyi sil.
  };
  responseChainMsg = () => ({
    type: "get_blockchain",
    data: JSON.stringify(this.blockchain.getBlockChain())
  });
  ship = (ws, message) => {
    ws.send(JSON.stringify(message));
  };
}
export default ClientServer;
