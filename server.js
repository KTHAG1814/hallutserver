var network = require('./network');

var server = network.createServer({
	data: function (data) {
		
	},
	connect: function(client) {

	},
	close: function(client) {

	}
});

server.listen(5555);
