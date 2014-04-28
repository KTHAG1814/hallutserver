var db = require('rethinkdb');
var nconf = require('nconf');
var thunkify = require('thunkify');
var koa = require('koa');
var views = require('koa-views');

nconf.file({ file: 'config.json' });

db.connect = thunkify(db.connect);

exports.start = function* () {
	var app = koa();

	app.use(views({
		cache: true,
		map: {
			html: 'underscore'
		}
	}));

	app.use(function*(next) {
		console.log('Got request.');
		yield next;
		console.log('Finished request.');
	});

	app.use(function*(next) {
		if(this.path === '/' || this.path === '/data.html') {
			this.status = 200;
			yield this.render('index', {
				content: '<h1>Works.</h1>'
			});
		} else {
			this.status = 404;
			yield this.render('404', {
				path: this.path
			});
		}
	});

	app.listen(nconf.get('webserver:port'));
};
