import mongoose from 'mongoose';

var db;

var Schema = mongoose.Schema;
var blockchainSchema = new Schema({blockchain: String});
var Blockchain = mongoose.model("Blockchain", blockchainSchema);

module.exports = {
	connectToServer: function(callback) {
		var mongoDB = process.env.MLAB_CONNECTION;
		mongoose.Promise = global.Promise;
		mongoose.connect(mongoDB);
		db = mongoose.connection;
		db.on('error', console.error.bind(console, 'MongoDB connection error:'));
		return callback();
	},
	getDb: function() {
		return db;
	}
};
