var express = require('express');
var sys = require('util');
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var logger = require('./lib/logger');

var child;

var port = 8080;

function randomString(len) {
    var charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charset.length);
        randomString += charset.substring(randomPoz,randomPoz+1);
    }
    return randomString;
}

function execCommand(command, args, options, stdin, successCallback, errorCallback) {
	var process = spawn(command, args, options);
	var stdout = '';
	var stderr = '';

	process.stdout.on('data', function (data) {
		stdout += data;
	});

	process.stderr.on('data', function (data) {
		stderr += data;
	});

	process.on('exit', function (code) {
		if (stderr != '' && errorCallback) {
			errorCallback(stderr);
		}
		else if (successCallback) {
			successCallback(stdout);
		}
	});

	if (stdin) {
		process.stdin.write(stdin);
	}

	process.stdin.end();
}

function parse(input, callback) {
	execCommand('python', ['parser/parser.py'], null, input,
		// success
		function(stdout) {
			callback(stdout);
		},
		// failure
		function(stderr) {
			logger.error('Error while parsing input\n' + stderr);
			callback(null);
		}
	);
}

// creating web server
var app = express.createServer();

app.configure(function(){
  app.use(express.static(__dirname + '/'));
});

app.get('/', function(req, res, next){
  res.render('index.html'); 
});

app.get('/show/:id/:rev?', function(req, res, next) {
	var repo = 'slideshows/' + req.params.id;

	if (!path.existsSync(repo)) {
		next(new Error('Can\'t find slideshow with id ' + req.params.id));
	}

	var rev = 'HEAD';
	if (req.params.rev) {
		rev = req.params.rev;
	}

	execCommand('git', ['show', rev + ':input.html'], {cwd: repo}, null,
		// success
		function(stdout) {
			parse(stdout, function(html) {
				res.send(html);
			});
		},
		// failure
		function(stderr) {
			logger.error('Error while retrieving file from git\n' + stderr);
			next(new Error(stderr));
		}
	);
});

app.listen(port);

// initialzing NowJS
var nowjs = require('now');
var everyone = nowjs.initialize(app);

logger.info('Application started on port ' + port);
logger.debug(randomString(12));
// called when a client joins
nowjs.on('connect', function(){
	logger.info(this.socket.handshake.address.address + ' connected');
});

// called when a client leaves
nowjs.on('disconnect', function(){
	logger.info(this.socket.handshake.address.address + ' disconnected');
});

everyone.now.transform = function(str, callback) {
	parse(str, callback);
}

function saveSlideshow(repository, data) {
	fs.writeFile(repository + '/input.html', data, function(err) {
	    if(err) {
	        logger.error('Error while saving slideshow\n' + err);
	    } else {
	        execCommand('git', ['add', 'input.html'], {cwd: repository}, null,
				// success
				function(stdout) {
					execCommand('git', ['commit', '-m', 'slideshow'], {cwd: repository}, null,
						// success
						function(stdout) {
							logger.debug('Saved slideshow at ' + repository);
						},
						// failure
						function(stderr) {
							logger.error('Error while retrieving file from git\n' + stderr);
						}
					);
				},
				// failure
				function(stderr) {
					logger.error('Error adding file to git\n' + stderr);
				}
			);
	    }
	});
}

everyone.now.save = function(slideshow, data) {
	var repo = 'slideshows/' + slideshow;

	if (!path.existsSync(repo)) {
		fs.mkdirSync(repo);
		execCommand('git', ['init'], {cwd: repo}, null,
			// success
			function(stdout) {
				// callback success
				logger.debug('Created git repo ' + repo);
				saveSlideshow(repo, data);
			},
			// failure
			function(stderr) {
				logger.error('Error while creating git repository\n' + stderr);
			}
		);
	}
	else {
		saveSlideshow(repo, data);
	} 
}