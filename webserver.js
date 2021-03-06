'use strict';

var koa = require('koa');
var app = koa();
var router = require('koa-router');
var serve = require('koa-static');
var db = require('rethinkdb');
var nconf = require('nconf');
var Promise = require('es6-promise').Promise;

app.use(router(app));
app.use(serve('./public'));

function handleResult(resolve, reject) {
	return function(err, res) {
		if(err) {
			reject(err);
		} else {
			resolve(res);
		}		
	};
}


function getIndexAvg(conn, from, to, index) {
	return new Promise(function(resolve, reject) {
		var query = db.table('temperature').between(
		from,
		to, 
		{index: index})
		.group({index: index})
		.map(function(temp) {
		  return temp('c');
		}).avg();
		console.log(query);
		query.run(conn, handleResult(resolve, reject));
	});
}

function dayOfYear(date) {
	var january1 = new Date(Date.UTC(date.getFullYear(),0,1));
	return Math.ceil((date.getTime() - january1.getTime()) / 86400000);
}

function hourArray(date) {
	var time = db.epochTime(date.getTime() / 1000);
	return [time.dayOfYear(), time.hours()];
}

function minuteArray(date) {
	var day = dayOfYear(date);
	return [day, date.getUTCHours(), date.getUTCMinutes()];
}

function getHourAvg(conn, from, to) {
	var day = dayOfYear(date);
	return [day, date.getUTCHours()];
}

function getMinuteAvg(conn, from, to) {
	return getIndexAvg(conn, minuteArray(from), minuteArray(to), 'minutes');
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
	var from, to;
	try {
		from = new Date(Date.parse(this.params.from));
		to = new Date(Date.parse(this.params.to));
	} catch(e) {
		this.status = 400;
		return;
	}
	try {
		var result = yield getMinuteAvg(conn, from, to);
		var year = new Date().getFullYear(); //This year
		this.body = result.map(function(obj) {
			var dateOfYear = obj.group[0];
			var hourOfDay = obj.group[1];
			var minutes = obj.group[2];
			var date = dateFromDay(year, dateOfYear);
			date.setUTCHours(hourOfDay || 0);
			date.setUTCMinutes(minutes || 0);
			var avgTemperature = obj.reduction;
			return {
				date: date,
				value: avgTemperature
			};
		});
	} catch(e) {
		return;
	}
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

