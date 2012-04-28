var express = require('express');
var sys = require('util');
var spawn = require('child_process').spawn;
var child;

// creating web server
var app = express.createServer();

app.configure(function(){
  app.use(express.static(__dirname + '/'));
});

app.get('/', function(req, res, next){
  res.render('index.html'); 
});

app.listen(8080);

// initialzing NowJS
var nowjs = require("now");
var everyone = nowjs.initialize(app);

everyone.now.transform = function(str, callback) {
	var parser = spawn('parser/parser.py');
	var output = '';

	parser.stdout.on('data', function (data) {
		output += data;
	});

	parser.stderr.on('data', function (data) {
		console.log('stderr: ' + data);
	});

	parser.on('exit', function (code) {
		callback(output);
	});

	parser.stdin.write(str);
	parser.stdin.end();
}