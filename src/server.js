var express = require('express');
var sys = require('util');
var spawn = require('child_process').spawn;
var logger = require('./lib/logger');

var child;

var port = 8080;

// creating web server
var app = express.createServer();

app.configure(function(){
  app.use(express.static(__dirname + '/'));
});

app.get('/', function(req, res, next){
  res.render('index.html'); 
});

app.listen(port);

// initialzing NowJS
var nowjs = require('now');
var everyone = nowjs.initialize(app);

logger.info('Application started on port ' + port);

// called when a client joins
nowjs.on('connect', function(){
	logger.info(this.socket.handshake.address.address + ' connected');
});

// called when a client leaves
nowjs.on('disconnect', function(){
	logger.info(this.socket.handshake.address.address + ' disconnected');
});

everyone.now.transform = function(str, callback) {
	var parser = spawn('parser/parser.py');
	var stdout = '';
	var stderr = '';

	parser.stdout.on('data', function (data) {
		stdout += data;
	});

	parser.stderr.on('data', function (data) {
		stderr += data;
	});

	parser.on('exit', function (code) {
		if (stderr != '') {
			logger.error('Error while parsing input\n' + stderr);
		}
		else {
			callback(stdout);
		}
	});

	parser.stdin.write(str);
	parser.stdin.end();
}