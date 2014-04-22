var network = require('hallutnetwork');
var db = require('rethinkdb');
var co = require('co');
var nconf = require('nconf');
var thunkify = require('thunkify');

nconf.file({ file: 'config.json' });

db.connect = thunkify(db.connect);
var actions = {
	temperature: function *(data, conn) {
		var query = db.table('temperature').insert({
			sensor: data.sensor,
			c: data.celcius,
			date: new Date()
		}).run;
		var result = yield thunkify(query)(conn);
	},
	humidity: function* (data, conn) {
		var query = db.table('humidity').insert({
			sensor: data.sensor,
			rh: data.humidity,
			date: new Date()
		}).run;
		var result = yield thunkify(query)(conn);
	}
};
exports.start = function* (){
	var conn = yield db.connect({
		host: nconf.get('db:host'),
		port: nconf.get('db:port')
	});
	conn.use('hallut');

	var server = network.createServer({
		data: function (type, data) {
			console.log('Client says', type, data);
			// If type is data database
			if('function' === typeof actions[type]) {
				var action = co(actions[type]);
				action.call(this, data, conn);
			}
		},
		connect: function() {

		},
		close: function() {

		}
	});
	server.server.listen(5555);
};



