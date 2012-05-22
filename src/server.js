var express = require('express');
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

function addManagedRoomToUser(sessionSID, roomId, slideshowId, slideshowVersion, maxSlides){
	if(roomManaged[sessionSID] == undefined) roomManaged[sessionSID] = {};
	roomManaged[sessionSID][roomId] = slideshowId;
	roomInfos[roomId] = {sessionSID : sessionSID, slideshowId : slideshowId, slideshowVersion : slideshowVersion, remoteDeviceCo : false, excludedUsers: {}, currentSlide: 0, maxSlides: maxSlides};
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

function htmlencode(str) {
    return new String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parse(input, callback) {
	slidemaker.generateSlideshow(input, 'Slideshow', callback);
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
	app.use('/uploads', express.static(__dirname + '/uploads'));

	app.set('views', __dirname);
	app.set('view engine', 'ejs');
	app.set('view options', {layout: false});
	app.register('.html', require('ejs'));

	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ secret: "secret", store: sessionStore, cookie: {
      maxAge: cookieMaxAge
    } }));
  
});

// thanks to http://www.hacksparrow.com/handle-file-uploads-in-express-node-js.html
app.post('/upload', function(req, res) {
    // get the temporary location of the file
    var tmp_path = req.files.image.path;
    // set where the file should actually exists - in this case it is in the "images" directory
    var target_path = '/uploads/' + req.files.image.name;

    // move the file from the temporary location to the intended location
    fs.rename(tmp_path, '.' + target_path, function(err) {
        if (err) throw err;
        
        // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
        fs.unlink(tmp_path, function() {
            if (err) throw err;

            res.send(target_path);
        });
    });
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
			html = html.replace("%slideShow%",slideshowId);
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
			html = html.replace("%slideShow%",slideshowId);
			res.send(html);
			//req.session.roomIdToJoin = req.params.id;
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
				input: htmlencode(source)
			});
		});
	}
	else {
		// render the default template if no ID is specified
		res.render('index.html', {
			id: null,
			version: 1,
			input: htmlencode(fs.readFileSync('template/defaultinput.html'))
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

everyone.now.transform = function(input, callback) {
	fs.readFile('template/slideshow.html', function (err, data) {
		if (err) throw err;

		var result = new String(data).replace('<!-- {{TITLE}} -->', 'Presentation')
									 .replace('<!-- {{SLIDES}} -->', input);

		callback(result);
	});
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
				roomInfos[roomId].excludedUsers[this.user.clientId] = this.user.clientId;
				nowjs.getGroup(roomId).exclude(jsonObjectToArray(roomInfos[roomId].excludedUsers)).now.goTo(slideNumber);
				delete roomInfos[roomId].excludedUsers[this.user.clientId];
				roomInfos[roomId].currentSlide = slideNumber;
			}
			
		}else{

			if(slideNumber != undefined){
				nowjs.getGroup(roomId).exclude(jsonObjectToArray(roomInfos[roomId].excludedUsers)).now.goTo(slideNumber);
				roomInfos[roomId].currentSlide = slideNumber;
			}else{
				nowjs.getGroup(roomId).exclude(jsonObjectToArray(roomInfos[roomId].excludedUsers)).now.goTo(slideNumber, event);
				if(event == 'swipeleft'){
					if (roomInfos[roomId].currentSlide < roomInfos[roomId].maxSlides.length - 1) roomInfos[roomId].currentSlide++;
				}else if(event == 'swiperight'){
					if (roomInfos[roomId].currentSlide > 0) roomInfos[roomId].currentSlide--;
				}
			}
		}
		
	}else{
		logger.debug("#changeSlide# Room not found in roomInfos");
	}
};

everyone.now.createRoom = function(slideshowId, slideshowVersion, maxSlides, callback){
	//Create room and associate it with the manager
	this.now.room = generateUniqueRoomId(randomString(6));
	addManagedRoomToUser(this.user.cookie['connect.sid'], this.now.room, slideshowId, slideshowVersion, maxSlides);
	logger.debug('#createRoom# clientSID : ' + this.user.cookie['connect.sid']);
	logger.debug('#createRoom# clientId : ' + this.user.clientId);
	logger.debug('#createRoom# slideshowId : ' + slideshowId);
	nowjs.getGroup(this.now.room).addUser(this.user.clientId);
	callback(this.now.room);
}

everyone.now.unsychronize = function(roomId){
	if(roomInfos[roomId] !== undefined){
		roomInfos[roomId].excludedUsers[this.user.clientId] = this.user.clientId;
	}else{
		logger.debug('#unsychronize# Room '+ roomId +'not found in roomInfos');
	}
}

everyone.now.sychronize = function(roomId, callback){
	if(roomInfos[roomId] !== undefined){
		roomInfos[roomId].excludedUsers[this.user.clientId] = undefined;
		delete roomInfos[roomId].excludedUsers[this.user.clientId];
	}else{
		logger.debug('#sychronize# Room '+ roomId +'not found in roomInfos');
	}
	
	callback(roomInfos[roomId].currentSlide);
}

function jsonObjectToArray(data){
	var array = new Array();
	var i = 0;
	for(cle in data){
		if(data[cle] !== undefined){
			array[i] = data[cle];
			i++;
		}
	}
	return array;
}