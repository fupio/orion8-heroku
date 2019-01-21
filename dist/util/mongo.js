'use strict';

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var db;

var Schema = _mongoose2.default.Schema;
var blockchainSchema = new Schema({ blockchain: String });
var Blockchain = _mongoose2.default.model("Blockchain", blockchainSchema);

module.exports = {
	connectToServer: function connectToServer(callback) {
		var mongoDB = process.env.MLAB_CONNECTION;
		_mongoose2.default.Promise = global.Promise;
		_mongoose2.default.connect(mongoDB);
		db = _mongoose2.default.connection;
		db.on('error', console.error.bind(console, 'MongoDB connection error:'));
		return callback();
	},
	getDb: function getDb() {
		return db;
	}
};