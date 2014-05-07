var tcpserver = require('./tcpserver');
var webserver = require('./webserver');
var co = require('co');


co(tcpserver.start)();
webserver.start();