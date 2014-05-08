'use strict';

var koa = require('koa');
var app = koa();
var router = require('koa-router');
var serve = require('koa-static');
var db = require('rethinkdb');
var nconf = require('nconf');

app.use(router(app));
app.use(serve('./public'));

app.get('/', function* () {
	this.body = 'Hello Routed Universe!';
});

function getHourAvg(conn, from, to) {
	return function(done) {
		db.table('temperature').between(
			db.time.apply(null, from), 
			db.time.apply(null, to), 
			{index: 'date'}
		).group(function (temp) {
		  return [temp('date').dayOfYear(),temp('date').hours(), temp('date').minutes()];
		}).map(function(temp) {
		  return temp('c');
		}).avg().run(conn, done);	
	};
}

function convertToNum(str) {
	var num = Number(str);
	if(isNaN(num)) {
		throw new Error('You need to enter numbers!');
	}
	return num;
}

function dateFromDay(year, day){
  var date = new Date(Date.UTC(year, 0)); // initialize a date in `year-01-01`
  return new Date(date.setUTCDate(day)); // add the number of days
}

app.get('/chart/:from/:to', function* () {
	var conn = yield db.connect({
		host: nconf.get('db:host'),
		port: nconf.get('db:port')
	});
	conn.use('hallut');
	try {
		var from = this.params.from.split(','); //convert to array
		from = from.map(convertToNum);
		from.push('Z');
		var to = this.params.to.split(','); //convert to array
		to = to.map(convertToNum);
		to.push('Z');
	} catch(e) {
		this.status = 400;
		return;
	}

	if(from.length !== 4 || to.length !== 4) {
		this.status = 400;
		return;
	}

	var result = yield getHourAvg(conn, from, to);
	var year = new Date().getFullYear(); //This year
	console.log(year);
	this.body = result.map(function(obj) {
		var dateOfYear = obj.group[0];
		var hourOfDay = obj.group[1];
		var minutes = obj.group[2];
		var date = dateFromDay(year, dateOfYear);
		date.setUTCHours(hourOfDay);
		date.setUTCMinutes(minutes);
		var avgTemperature = obj.reduction;
		return {
			date: date,
			value: avgTemperature
		};
	});
});

exports.start = function () {
	var server = require('http').createServer(app.callback());
	server.listen(7000, function() {
		if(process.send) {
			process.send('online');
		}
	});
};

process.on('message', function(message) {
  if (message === 'shutdown') {
    process.exit(0);
  }
});

