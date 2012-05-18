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

function htmlspecialchars (string, quote_style, charset, double_encode) {
    // http://kevin.vanzonneveld.net
    // +   original by: Mirek Slugen
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: Nathan
    // +   bugfixed by: Arno
    // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +    bugfixed by: Brett Zamir (http://brett-zamir.me)
    // +      input by: Ratheous
    // +      input by: Mailfaker (http://www.weedem.fr/)
    // +      reimplemented by: Brett Zamir (http://brett-zamir.me)
    // +      input by: felix
    // +    bugfixed by: Brett Zamir (http://brett-zamir.me)
    // %        note 1: charset argument not supported
    // *     example 1: htmlspecialchars("<a href='test'>Test</a>", 'ENT_QUOTES');
    // *     returns 1: '&lt;a href=&#039;test&#039;&gt;Test&lt;/a&gt;'
    // *     example 2: htmlspecialchars("ab\"c'd", ['ENT_NOQUOTES', 'ENT_QUOTES']);
    // *     returns 2: 'ab"c&#039;d'
    // *     example 3: htmlspecialchars("my "&entity;" is still here", null, null, false);
    // *     returns 3: 'my &quot;&entity;&quot; is still here'
    var optTemp = 0,
        i = 0,
        noquotes = false;
    if (typeof quote_style === 'undefined' || quote_style === null) {
        quote_style = 2;
    }
    string = string.toString();
    if (double_encode !== false) { // Put this first to avoid double-encoding
        string = string.replace(/&/g, '&amp;');
    }
    string = string.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    var OPTS = {
        'ENT_NOQUOTES': 0,
        'ENT_HTML_QUOTE_SINGLE': 1,
        'ENT_HTML_QUOTE_DOUBLE': 2,
        'ENT_COMPAT': 2,
        'ENT_QUOTES': 3,
        'ENT_IGNORE': 4
    };
    if (quote_style === 0) {
        noquotes = true;
    }
    if (typeof quote_style !== 'number') { // Allow for a single string or an array of string flags
        quote_style = [].concat(quote_style);
        for (i = 0; i < quote_style.length; i++) {
            // Resolve string input to bitwise e.g. 'ENT_IGNORE' becomes 4
            if (OPTS[quote_style[i]] === 0) {
                noquotes = true;
            }
            else if (OPTS[quote_style[i]]) {
                optTemp = optTemp | OPTS[quote_style[i]];
            }
        }
        quote_style = optTemp;
    }
    if (quote_style & OPTS.ENT_HTML_QUOTE_SINGLE) {
        string = string.replace(/'/g, '&#039;');
    }
    if (!noquotes) {
        string = string.replace(/"/g, '&quot;');
    }

    return string;
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
		if (code > 0 && errorCallback) {
			errorCallback(stderr, code);
		}
		else if (successCallback) {
			if (stderr != '') {
				logger.warn(stderr);
			}
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
  app.use('/lib', express.static(__dirname + '/lib'));
  app.use('/js', express.static(__dirname + '/js'));
  app.use('/img', express.static(__dirname + '/img'));
  app.use('/css', express.static(__dirname + '/css'));

  app.set('views', __dirname);
  app.set('view engine', 'ejs');
  app.set('view options', {layout: false});
  app.register('.html', require('ejs'));
});

app.get('/:id?', function(req, res, next){
	if (req.params.id) {
		var id = req.params.id;

		if (id == 'favicon.ico') {
			next();
			return;
		}

		var repo = 'slideshows/' + req.params.id;

		if (!path.existsSync(repo)) {
			var error = 'Can\'t find slideshow with id ' + req.params.id;
			logger.error(error);
			res.send(error);
			return;
		}

		execCommand('git', ['show', 'HEAD:input.html'], {cwd: repo}, null,
			// success
			function(stdout) {
				res.render('index.html', {
					id: id,
					input: htmlspecialchars(stdout)
				});
			},
			// failure
			function(stderr) {
				logger.error('Error while retrieving file from git\n' + stderr);
				next(new Error(stderr));
			}
		);
	}
	else {
		res.render('index.html', {
			id: null,
			input: htmlspecialchars(fs.readFileSync('parser/input.html'))
		});
	}
});

app.get('/:id/show/:rev?', function(req, res, next) {
	var repo = 'slideshows/' + req.params.id;

	if (id == 'favicon.ico') {
		next();
		return;
	}

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

function saveSlideshow(slideshow, data, successCallback) {
	var repo = 'slideshows/' + slideshow;

	fs.writeFile(repo + '/input.html', data, function(err) {
	    if(err) {
	        logger.error('Error while saving slideshow\n' + err);
	    } else {
	        execCommand('git', ['add', 'input.html'], {cwd: repo}, null,
				// success
				function(stdout) {
					execCommand('git', ['commit', '-m', 'slideshow'], {cwd: repo}, null,
						// success
						function(stdout) {
							logger.debug('Saved slideshow at ' + repo);
							successCallback(slideshow);
						},
						// failure
						function(stderr, code) {
							if (code == 1) {
								// exit code 1 = nothing to commit
								logger.debug('Not saving slideshow because there is no changes');
							}
							else {
								logger.error('Error while saving file to git\n' + stderr);
							}
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

everyone.now.save = function(slideshow, data, successCallback) {
	if (!slideshow) {
		do {
			slideshow = randomString(6);
		} while (path.existsSync('slideshows/' + slideshow))
	}

	var repo = 'slideshows/' + slideshow;

	if (!path.existsSync(repo)) {
		fs.mkdirSync(repo);
		execCommand('git', ['init'], {cwd: repo}, null,
			// success
			function(stdout) {
				// callback success
				logger.debug('Created git repo ' + repo);
				saveSlideshow(slideshow, data, successCallback);
			},
			// failure
			function(stderr) {
				logger.error('Error while creating git repository\n' + stderr);
			}
		);
	}
	else {
		saveSlideshow(slideshow, data, successCallback);
	} 
}