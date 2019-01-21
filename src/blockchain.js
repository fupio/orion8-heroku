require('dotenv').config();
import SHA256 from "crypto-js/sha256";
import jsonfile from "jsonfile";
import fs from "fs";

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
  constructor(redisProp) {
    this.fileName = "blockchain.db";
    this.ram = redisProp;
    this.latestBlock = this.setupDatabase();
  }
  setupDatabase = () => {
    if (fs.existsSync(this.fileName)) {
      const database = jsonfile.readFileSync(this.fileName);
      this.ram.set("chain", JSON.stringify(database));
      return database.chain[database.chain.length - 1];
    }
    else {
      return this.ram.get("chain", (err, reply) => {
        if (err || !reply) {
          const schema = {chain: [this.createGenesisBlock()]};
          jsonfile.writeFileSync(this.fileName, schema);
          this.ram.set("chain", JSON.stringify(schema));
          return schema.chain[0];
        }
        const response = JSON.parse(reply);
        console.log("response", response)
        jsonfile.writeFileSync(this.fileName, response);
        return response.chain[0]
      })
    }
  }
  createBlock = (index, timestamp, previousHash, data) => {
    return new Block(index, timestamp, previousHash, data);
  };
  createGenesisBlock = () => this.createBlock(0, Date.now(), "0", "Genesis Block");
  addBlock = (newBlock) => {
    const database = jsonfile.readFileSync(this.fileName);
    if (database && database.hasOwnProperty('chain')) {
      database.chain.push(newBlock);
      this.latestBlock = database.chain[database.chain.length -1];
      jsonfile.writeFileSync(this.fileName, database);
      this.ram.set("chain", JSON.stringify(database));
      return true
    }
    else {
      console.log("database", database)
      return false;
    }
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
    if (!database) {
      return false;
    }
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
