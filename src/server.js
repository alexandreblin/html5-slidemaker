var express = require('express');
var sys = require('util');
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var logger = require('./lib/logger');
var sessionStore = new express.session.MemoryStore();

var child;

var port = 8080;
var cookieMaxAge = 60*60*1000;

var roomInfos = {};
var roomManaged = {};

function addManagedRoomToUser(sessionSID, roomId, slideShowId){
	if(roomManaged[sessionSID] == undefined) roomManaged[sessionSID] = {};
	roomManaged[sessionSID][roomId] = slideShowId;
	roomInfos[roomId] = {sessionSID : sessionSID, slideShowId : slideShowId};
	logger.debug("#addManagedRoomToUser# Management of the room : " + roomId + " added to user : " + roomInfos[roomId].sessionSID + " and slideShowId : " + roomInfos[roomId].slideShowId);
}

function generateUniqueRoomId(newRoomId){
	if(newRoomId == undefined) newRoomId = randomString(8);
	if (nowjs.groups[newRoomId] == undefined){
		return newRoomId;
	}else{
		logger.debug("room : " + newRoomId + " already exists!");
		return generateUniqueRoomId(randomString(8));	
	}
}

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

	app.use(express.cookieParser());
	app.use(express.session({ secret: "secret", store: sessionStore, cookie: {
      maxAge: cookieMaxAge
    } }));
  
});

app.all('/:id', function (req, res, next) {
	// ignore requests for /favicon.ico because they're misinterpreted for a slideshow ID
	if (req.params.id == 'favicon.ico') {
		res.send(404);
	}
	else {
		next();
	}
});

app.get('/:id?', function(req, res, next){
	if (req.params.id) {
		var id = req.params.id;

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
	slideShow(req, res,next, false);
});

app.get('/:id/showRoom/:rev?', function(req, res, next) {
	slideShow(req, res,next, true);
});

function slideShow(req, res, next, isRoomId){
	var slideShowId;

	if(isRoomId){
		if(roomInfos[req.params.id] !== undefined){
			slideShowId = roomInfos[req.params.id].slideShowId;
		}else{
			next(new Error("Incorrect room number !"));
			return;
		}
	}else{
		slideShowId = req.params.id;
	}
	var repo = 'slideshows/' + slideShowId;

	if (!path.existsSync(repo)) {
		next(new Error('Can\'t find slideshow with id ' + slideShowId));
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
				
				//Add the user to the room
				if(isRoomId){
					req.session.roomIdToJoin = req.params.id;
				}

			});
		},
		// failure
		function(stderr) {
			logger.error('Error while retrieving file from git\n' + stderr);
			next(new Error(stderr));
		}
	);
}

app.listen(port);

// initialzing NowJS
var nowjs = require('now');
var everyone = nowjs.initialize(app);

logger.info('Application started on port ' + port);

// called when a client joins
nowjs.on('connect', function(){
	var self = this;
	logger.info('#on.connect# ' + this.socket.handshake.address.address + ' connected');
	var sid = unescape( this.user.cookie['connect.sid'] );
	logger.debug('#on.connect# SID : ' + sid);
	
	if(roomManaged[this.user.cookie['connect.sid']['#timer#']] !== undefined){
		logger.debug('#on.connect# : Timer removed for this SID');
		clearInterval(roomManaged[this.user.cookie['connect.sid']['#timer#']]);
	}else{
		logger.debug('#on.connect# : No timer found for this SID');
	}
	
	sessionStore.get( sid, function( err, session ) {
		if(err) logger.error('#on.connect# err : ' + err);
		if (session) {
		
			if(session.roomIdToJoin){
				self.now.room = session.roomIdToJoin;
				session.roomIdToJoin = undefined;
				nowjs.getGroup(self.now.room).addUser(self.user.clientId);
				logger.debug('#on.connect# sessionSID : ' + self.user.cookie['connect.sid'] + ' added to the room : ' + self.now.room);
			}
		}else{
			logger.debug('#on.connect# No session found');
		}
	});
	

});

// called when a client leaves
nowjs.on('disconnect', function(){
	logger.info('#on.disconnect# ' + this.socket.handshake.address.address + ' disconnected');
	
	var self = this;
	nowjs.getGroups(function(groups) {
		for ( i=0 ; i < groups.length; i++ ) {
			var grp = nowjs.getGroup(groups[i]);
			grp.removeUser(self.user.clientId);
			grp.count(function(count){
				if(count == 0){
					if(grp.groupName != 'everyone'){
						nowjs.removeGroup(grp.groupName);
						logger.debug('#on.disconnect# Room : ' + grp.groupName + " removed");
					}
				}
			});
		}
	});
		
	if(roomManaged[self.user.cookie['connect.sid']] !== undefined){
		logger.debug("#on.disconnect# Interval launched for SID : " + self.user.cookie['connect.sid']);
		roomManaged[self.user.cookie['connect.sid']['#timer#']] = setInterval(function(){ 
			
			for(roomId in roomManaged[self.user.cookie['connect.sid']]){
				logger.debug("#on.disconnect# remove roomId : " + roomId);
				delete roomInfos[roomId];
				logger.debug("#on.disconnect# roomInfos cleened at " + roomId + " position. Object = "  + roomInfos[roomId]);
			}
			
			delete roomManaged[self.user.cookie['connect.sid']];
			logger.debug("#on.disconnect# roomManaged cleened at " + self.user.cookie['connect.sid'] + " position. Object = "  + roomManaged[self.user.cookie['connect.sid']]);
			
			clearInterval(this);
			
		}, cookieMaxAge);
	}else{
		logger.debug("#on.disconnect# No managed room found for this SID");
	}

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

everyone.now.getSlideshowList = function(callback) {
	callback(roomInfos);
};

everyone.now.changeSlide = function(slideNumber, roomId){

	if(roomInfos[roomId] !== undefined){
		if(this.user.cookie['connect.sid'] == roomInfos[roomId].sessionSID){
			nowjs.getGroup(roomId).exclude(this.user.clientId).now.goTo(slideNumber);
		}else{
			logger.debug("#changeSlide# This user : " + this.user.cookie['connect.sid'] + " is not a room manager");
		}
	}
};

everyone.now.createRoom = function(slideshowId, callback){
	//Create room and associate it with the manager
	this.now.room = generateUniqueRoomId(randomString(6));
	addManagedRoomToUser(this.user.cookie['connect.sid'], this.now.room, slideshowId);
	logger.debug('#createRoom# clientSID : ' + this.user.cookie['connect.sid']);
	logger.debug('#createRoom# clientId : ' + this.user.clientId);
	logger.debug('#createRoom# slideshowId : ' + slideshowId);
	nowjs.getGroup(this.now.room).addUser(this.user.clientId);
	callback(this.now.room);
}