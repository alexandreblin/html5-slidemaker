var express = require('express');
var http = require('http');
var util = require('util');
var exec = require('child_process').exec;
var child;

// Création du serveur, page par defait, port  
var app = express.createServer();

app.configure(function(){
  app.use(express.static(__dirname + '/'));
});

app.get('/', function(req, res, next){
  //res.render('index.html'); 

	child = exec("python \"" + __dirname + "/../parser/parser.py\" \"" + __dirname + "/../parser/input.html\"", function (error, stdout, stderr) {
		util.print('stdout: ' + stdout);
		util.print('stderr: ' + stderr);
		if (error !== null) {
			console.log('exec error: ' + error);
		}
		res.writeHead(200, {'Content-Type': 'text/plain'});  
		res.write('stdout: ' + stdout + "\n\n"); 
		res.write('stderr: ' + stderr + "\n\n");
		res.end('exec error: ' + error + "\n");		
	});
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