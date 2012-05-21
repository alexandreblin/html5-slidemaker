var express = require('express');
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var logger = require('./lib/logger');
var git = require('./lib/gitwrapper');

var sessionStore = new express.session.MemoryStore();

var child;

var port = 8080;
var cookieMaxAge = 60*60*1000;

var roomInfos = {};
var roomManaged = {};

function addManagedRoomToUser(sessionSID, roomId, slideshowId, slideshowVersion){
	if(roomManaged[sessionSID] == undefined) roomManaged[sessionSID] = {};
	roomManaged[sessionSID][roomId] = slideshowId;
	roomInfos[roomId] = {sessionSID : sessionSID, slideshowId : slideshowId, slideshowVersion : slideshowVersion, remoteDeviceCo : false};
	logger.debug("#addManagedRoomToUser# Management of the room : " + roomId + " added to user : " + roomInfos[roomId].sessionSID + " and slideshowId : " + roomInfos[roomId].slideshowId);
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

function getSlideshowSource(id, version, callback) {
	try {
		var repo = new git.Repository(path.join('slideshows', id));

		if (repo) {
			repo.getFile('input.html', version, callback);
		}
	}
	catch (e) {
		logger.error(e);
		callback(null);
	}
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

app.get('/:roomId/showRoom', function(req, res, next) {
	var room = roomInfos[req.params.roomId];
	
	if(room === undefined) {
		next(new Error("Incorrect room number !"));
		return;
	}

	var slideshowId = room.slideshowId;
	var version = room.slideshowVersion;

	getSlideshowSource(slideshowId, version, function(source) {
		if (!source) {
			next();
			return;
		}

		parse(source, function(html) {
			res.send(html);
			
			// Add the user to the room
			req.session.roomIdToJoin = req.params.roomId;
		});
	});
});

app.get('/:id/:ver?/show', function(req, res, next) {
	var slideshowId = req.params.id;
	var version = req.params.ver || 1;

	getSlideshowSource(slideshowId, version, function(source) {
		if (!source) {
			next();
			return;
		}

		parse(source, function(html) {
			res.send(html);
			req.session.roomIdToJoin = req.params.id;
		});
	});
});

app.get('/:id/remote', function(req, res, next){
	if(roomInfos[req.params.id] !== undefined){
		if(roomInfos[req.params.id].remoteDeviceCo){
			next(new Error('cannot connect more than one remode device for room ' + req.params.id));
		}else{
			req.session.roomIdToJoin = req.params.id;
			req.session.isRemote = true;
			res.render('remote/remote.html');
		}
	}else{
		next(new Error('cannot find room ' + req.params.id));
	}
});

app.get('/:id?/:ver?', function(req, res, next){
	if (req.params.id) {
		var id = req.params.id;
		var version = req.params.ver || 1;

		getSlideshowSource(id, version, function(source) {
			if (!source) {
				next()
				return;
			}

			res.render('index.html', {
				id: id,
				version: version,
				input: htmlspecialchars(source)
			});
		});
	}
	else {
		// render the default template if no ID is specified
		res.render('index.html', {
			id: null,
			version: 1,
			input: htmlspecialchars(fs.readFileSync('parser/input.html'))
		});
	}
});

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
				
				if(session.isRemote){
					logger.debug('#on.connect# Remote controll join for the room : ' + self.now.room);
					self.now.isRemote = true;
					roomInfos[self.now.room].remoteDeviceCo = true;
				}else{
					session.roomIdToJoin = undefined;
					nowjs.getGroup(self.now.room).addUser(self.user.clientId);
					logger.debug('#on.connect# sessionSID : ' + self.user.cookie['connect.sid'] + ' added to the room : ' + self.now.room);
				}
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
	
	if(this.now.isRemote){
		roomInfos[this.now.room].remoteDeviceCo = false;
	}
		
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

everyone.now.save = function(id, data, callback) {
	if (!id) {
		do {
			id = randomString(6);
		} while (path.existsSync('slideshows/' + id))
	}

	var saveFunction = function(repository) {
		repository.commitFile('input.html', data, function (version) {
			logger.debug('Saved slideshow ' + id + ' at version ' + version);

			callback(id, version);
		});
	}

	var repositoryPath = path.join('slideshows', id);

	var repo;
	try {
		repo = new git.Repository(repositoryPath);
		saveFunction(repo);
	}
	catch (e) {
		repo = git.createRepository(repositoryPath, saveFunction);
	}
}

everyone.now.getSlideshowList = function(callback) {
	callback(roomInfos);
};

everyone.now.changeSlide = function(slideNumber, roomId, event){
	
	if(roomInfos[roomId] !== undefined){
		
		if(!this.now.isRemote){

			if(this.user.cookie['connect.sid'] == roomInfos[roomId].sessionSID){
				nowjs.getGroup(roomId).exclude(this.user.clientId).now.goTo(slideNumber);
			}else{
				logger.debug("#changeSlide# This user : " + this.user.cookie['connect.sid'] + " is not a room manager");
			}
			
		}else{

			if(slideNumber != undefined){
				nowjs.getGroup(roomId).now.goTo(slideNumber);
			}else{
				nowjs.getGroup(roomId).now.goTo(slideNumber, event);
			}
		}
	}else{
		logger.debug("#changeSlide# Room not found in roomInfos");
	}
};

everyone.now.createRoom = function(slideshowId, slideshowVersion, callback){
	//Create room and associate it with the manager
	this.now.room = generateUniqueRoomId(randomString(6));
	addManagedRoomToUser(this.user.cookie['connect.sid'], this.now.room, slideshowId, slideshowVersion);
	logger.debug('#createRoom# clientSID : ' + this.user.cookie['connect.sid']);
	logger.debug('#createRoom# clientId : ' + this.user.clientId);
	logger.debug('#createRoom# slideshowId : ' + slideshowId);
	nowjs.getGroup(this.now.room).addUser(this.user.clientId);
	callback(this.now.room);
}