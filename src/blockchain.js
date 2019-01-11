import SHA256 from "crypto-js/sha256";
import Datastore from "nedb";

class Block {
  constructor(index, timestamp, previousHash, data) {
    this.index = index;
    this.timestamp = timestamp;
    this.previousHash = previousHash;
    this.data = data;
    this.hash = this.calculateHash();
  }
  calculateHash() {
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
    this.latestBlock = this.createGenesisBlock();
    this.db = this.setupDatabase();
    // this.chain = this.db.get("chain").value();
  }
  // Setup a database by default array with genesis block.
  setupDatabase = () => {
    // const adapter = new FileSync("database.json");
    // const db = low(adapter);
    // db.defaults({ chain: [this.createGenesisBlock()], settings: {} }).write();
    // return db;
    const db = new Datastore({ filename: "blockchain.db", autoload: true });
    db.find({}, (err, docs) => {
      if (!err && docs.length == 0) {
        db.insert([this.latestBlock]);
      }
    });
    return db;
  };
  createGenesisBlock = () =>
    new Block(0, Date.now(), "0", { name: "Genesis Block" });
  // getLatestBlock = () => this.latestBlock;
  getBlockChain = () => {
    this.db.find({}, (err, docs) => {
      if (!err) {
        return err;
      }
      return docs;
    });
  };
  addBlock(newBlock) {
    // console.log(this.latestBlock,   newBlock)
    // return true
    if (newBlock && newBlock.index == this.latestBlock.index + 1) {
      // this.db.get("chain").push(newBlock).write();
      this.db.insert([newBlock]);
      this.latestBlock = newBlock;
      // this.chain.push(newBlock);
      return true;
    }
    return false;
  }
  generateNextBlock = blockData => {
    const previousBlock = this.latestBlock;
    const index = previousBlock.index + 1;
    const timestamp = Date.now();
    const previousHash = previousBlock.hash;
    return new Block(index, timestamp, previousHash, blockData);
  };
  isChainValid = () => {
    for (let i = 1; i < this.chain.length; i += 1) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (previousBlock.index + 1 !== currentBlock.index) {
        return false;
      } else if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      } else if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  };
}

export default { Block, Chain };
