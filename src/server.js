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

// gets the current timestamp in pretty format
function currentTimestamp() {
    var today = new Date();

    var month = ("0" + (today.getMonth() + 1)).slice(-2);
    var day = ("0" + today.getDate()).slice(-2);
    var year = today.getFullYear();
    var hours = ("0" + today.getHours()).slice(-2);
    var minutes = ("0" + today.getMinutes()).slice(-2);
    var seconds = ("0" + today.getSeconds()).slice(-2);

    return "[" + year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds + "]";
}

// called when a client joins
nowjs.on('connect', function(){
	console.log(currentTimestamp() + " " + this.socket.handshake.address.address + " connected.");
});

// called when a client leaves
nowjs.on('disconnect', function(){
	console.log(currentTimestamp() + " " + this.socket.handshake.address.address + " disconnected.");
});

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