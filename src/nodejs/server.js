var express = require('express');
var http = require('http');
var sys = require('sys');
var exec = require('child_process').exec;
var child;

// Création du serveur, page par defait, port  
var app = express.createServer();

app.configure(function(){
  app.use(express.static(__dirname + '/'));
});

app.get('/', function(req, res, next){
  res.render('index.html'); 
});

app.listen(8080);

// Création d'un serveur de socket via nowJS
var nowjs = require("now");
var everyone = nowjs.initialize(app);


nowjs.on("connect", function(){    
  console.log("Joined: " + this.user.clientId);    
});
    
nowjs.on("disconnect", function(){
  console.log("Left: " + this.user.clientId);
});

everyone.now.transform = function(str,callback) {
	//child = exec("python \"" + __dirname + "/../parser/parser.py\" \"" + __dirname + "/../parser/input.html\"", function (error, stdout, stderr) {
	child = exec("echo \"" + str + "\" | python \"" + __dirname + "/../parser/parser.py\"", function (error, stdout, stderr) {
		sys.print('stdout: ' + stdout);
		sys.print('stderr: ' + stderr);
		if (error !== null) {
			console.log('exec error: ' + error);
		}
		callback(stdout);
	});
}