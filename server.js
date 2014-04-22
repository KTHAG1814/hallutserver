var network = require('hallutnetwork');

var server = network.createServer({
	data: function (type, data) {
		
	},
	connect: function() {

	},
	close: function() {

	}
});

server.listen(5555);
