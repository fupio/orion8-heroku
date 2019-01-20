require('dotenv').config();
import SHA256 from "crypto-js/sha256";
import jsonfile from "jsonfile";
import redis from "redis";

const client = redis.createClient(process.env.REDISCLOUD_URL)
// client.set("blockchain", "{}")
// client.set("fupio", "{}")
// client.get('blockchain', (err, reply) => !err && console.log(reply.toString()))

client.on('connect', () => {
    console.log(`connected to redis`);
});
client.on('error', err => {
    console.log(`Error: ${err}`);
});

class Block {
  constructor(index, timestamp, previousHash, data) {
    this.index = index;
    this.timestamp = timestamp;
    this.previousHash = previousHash;
    this.data = data;
    this.hash = this.calculateHash();
  }
  calculateHash = () => {
    return SHA256(
      this.index +
      this.timestamp +
      this.previousHash +
      JSON.stringify(this.data)
    ).toString();
  }
}

class Chain {
  constructor() {
    this.fileName = "blockchain.db";
    this.latestBlock = this.setupDatabase();
  }
  setupDatabase = () => {
    const schema = {
      chain: [this.createGenesisBlock()],
      cache: {}
    };
    try {
      const database = jsonfile.readFileSync(this.fileName);
      return database.chain[database.chain.length - 1];
    } catch (error) {
      if (error.errno == -2) {
        // check the redis first because heroku local file 
        // might be gone if dyno sleeping.
        client.get('fupio', (err, reply) => {
          if (err) {
            console.error("there is no data on redis", err)
            client.set('fupio', JSON.stringify(database.chain))
            jsonfile.writeFileSync(this.fileName, schema)
            return schema.chain[0]
          }
          const replyChain = JSON.parse(reply)
          jsonfile.writeFileSync(this.fileName, {chain: replyChain})
          return replyChain[0]
        })
      }
      
    }
  }
  createBlock = (index, timestamp, previousHash, data) => {
    return new Block(index, timestamp, previousHash, data);
  };
  createGenesisBlock = () => this.createBlock(0, Date.now(), "0", "Genesis Block");
  addBlock = (newBlock) => {
    const database = jsonfile.readFileSync(this.fileName);
    database.chain.push(newBlock);
    jsonfile.writeFileSync(this.fileName, database);
    this.latestBlock = database.chain[database.chain.length -1];
    client.set("fupio", JSON.stringify(database.chain));
    return true;
  };
  getLatestBlock = () => this.latestBlock;
  getBlockChain = () => {
    const database = jsonfile.readFileSync(this.fileName);
    return database.chain;
  }
  generateNextBlock = blockData => {
    const index = this.latestBlock.index + 1;
    const timestamp = Date.now();
    const previousHash = this.latestBlock.hash;
    return new Block(index, timestamp, previousHash, blockData);
  };
  isChainValid() {
    const database = jsonfile.readFileSync(this.fileName);
    for (let i = 1; i < database.chain.length; i += 1) {
      const currentBlock = this.createBlock(
        database.chain[i].index,
        database.chain[i].timestamp,
        database.chain[i].previousHash,
        database.chain[i].data
      );
      const previousBlock = this.createBlock(
        database.chain[i - 1].index,
        database.chain[i - 1].timestamp,
        database.chain[i - 1].previousHash,
        database.chain[i - 1].data
      );
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
}

export default { Block, Chain };
