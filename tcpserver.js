var network = require('hallutnetwork');
var db = require('rethinkdb');
var co = require('co');
var nconf = require('nconf');
var thunkify = require('thunkify');
var Promise = require('es6-promise').Promise;

nconf.file({ file: 'config.json' });

db.connect = thunkify(db.connect);
function deleteUndefineds(object) {
	for(var key of Object.keys(object).values()) {
		if(typeof object[key] === 'undefined') {
			delete object[key];
		}
	}	
}

function handleResult(resolve, reject) {
	return function(err, res) {
		if(err) {
			reject(err);
		} else {
			resolve(res);
		}		
	};
}

function insertTemperature(data, conn) {
	return new Promise(function(resolve, reject) {
		var object = {
			sensor: data.sensor,
			c: data.celcius,
			date: new Date()
		};
		deleteUndefineds(object);
		db.table('temperature').insert(object).run(conn, handleResult(resolve,reject));
	});
}

function insertHumidity(data, conn) {
	return new Promise(function(resolve, reject) {
		var object = {
			sensor: data.sensor,
			rh: data.humidity,
			date: new Date()
		};
		deleteUndefineds(object);
		var query = db.table('humidity').insert().run(conn, handleResult(resolve,reject));
	});	
}

var actions = {
	temperature: function *(data, conn) {
		var result = yield insertTemperature(data,conn);
	},
	humidity: function* (data, conn) {
		var result = yield insertHumidity(data, conn);
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



