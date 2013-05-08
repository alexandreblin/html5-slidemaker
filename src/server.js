var express = require('express');
var path = require('path');
var fs = require('fs');
var zipstream = require('zipstream');
var logger = require('./lib/logger');
var git = require('./lib/gitwrapper');
var util = require('util');
var themeList = require('./lib/theme.js');

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
    var charset = 'abcdefghijkmnopqrstuvwxyz';
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

function parse(input, theme, bDownload, callback) {
	fs.readFile(__dirname + '/template/slideshow.html', function (err, data) {
		if (err) throw err;

		var result = new String(data).replace('<!-- {{TITLE}} -->', 'Presentation')
									 .replace('<!-- {{SLIDES}} -->', input);
		var basePath = "";
		var js = "";
		if(!bDownload) {
			js = 	"<script src='/nowjs/now.js'></script>" +
					"<script src='/js/remoteControl.js'></script>";
			basePath = "/";
		}
		if(theme) {
			js += "<script>curTheme = '" + theme + "'; </script>";
			if(themeList[theme].css) {
				js += "<link rel='stylesheet' href='<!-- {{BASEPATH}} -->"+themeList[theme].css+"' type='text/css' />";
			}
			if(themeList[theme].img) {
				js += "<style>" +
					"body.loaded {"+
						"background: url('<!-- {{BASEPATH}} -->"+themeList[theme].img+"') no-repeat top right;"+
						"-webkit-background-size: cover;"+
						"-moz-background-size: cover;"+
						"-o-background-size: cover;"+
						"background-size: cover;"+
					"}";
			}
		}
		result = result.replace('</head>', js + '</head>');
		result = result.replace(/<!-- {{BASEPATH}} -->/g, basePath);
		callback(result);
	});
}

function getSlideshowSource(id, version, callback) {
	try {
		var repo = new git.Repository(path.join('slideshows', id));

		if (repo) {
			repo.getFile('input.html', version, function(err, source) {
				if (err) throw err;

				repo.getFile('options.json', version, function(err, json) {
					var options;

					if (err) {
						if (err.toString().indexOf("fatal: Path 'options.json' does not exist") != -1) {
							// no options.json, just return an empty option object
							options = {};
						}
						else {
							throw err;
						}
					}
					else {
						options = JSON.parse(json);
					}

					callback(source, options);
				})
			});
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
app.post('/upload/:id', function(req, res, next) {
	if (!req.files.image) { next(); return; }

	var slideshowId = req.params.id;

    // get the temporary location of the file
    var tmp_path = req.files.image.path;

    var target_folder = 'uploads/' + slideshowId + '/';

    if (!path.existsSync(target_folder)) {
    	fs.mkdirSync(target_folder);
    }

    // set where the file should actually exists
    var target_path = target_folder + req.files.image.name;

    // move the file from the temporary location to the intended location
	var is = fs.createReadStream(tmp_path)
	var os = fs.createWriteStream(target_path);

	util.pump(is, os, function(err) {
        if (err) throw err;
		res.send('/' + target_path);

		fs.unlink(tmp_path);
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

	getSlideshowSource(slideshowId, version, function(source, options) {
		if (!source) {
			next();
			return;
		}

		parse(source, options.theme, false, function(html) {
			html = html.replace("%slideShow%",slideshowId).replace("%slideShowVersion%",version);
			res.send(html);
			
			// Add the user to the room
			req.session.roomIdToJoin = req.params.roomId;
		});
	});
});

app.get('/:id/:ver?/slideshow.zip*', function(req, res, next) {
	var slideshowId = req.params.id;
	var version = req.params.ver || 1;

	getSlideshowSource(slideshowId, version, function(source, options) {
		if (!source) {
			next();
			return;
		}
		parse(source, options.theme, true, function(html) {
			html = html.replace("%slideShow%",slideshowId);

			html = html.replace(new RegExp("src=\"/uploads/"+slideshowId, 'g'), 'src="img');

			html = html.replace("%slideShow%",slideshowId).replace("%slideShowVersion%",version);

			var zip = zipstream.createZip({ level: 1 });

			// pipe the zip directly to the client
			zip.pipe(res);

			var files = [
				{name: 'index.html', content: new Buffer(html)},
				{name: '/lib/slides.js', content: 'lib/slides.js'},
				{name: '/lib/theme.js', content: 'lib/theme.js'},
				{name: '/lib/jquery-1.7.2.min.js', content: 'lib/jquery-1.7.2.min.js'}
			];
			if(options.theme) {
				var css = themeList[options.theme].css;
				if (css) {
					files.push({name: "/"+css, content: css});
				}

				var img = themeList[options.theme].img;
				if (img) {
					files.push({name: "/"+img, content: img});
				}
			}
			if(path.existsSync(__dirname + "/uploads/"+slideshowId)) {
				fs.readdir("uploads/"+slideshowId, function (err, myFiles) {
					if (err) throw err;
					for(var iI = 0; iI < myFiles.length; ++iI) {
						files.push({name: "/img/"+myFiles[iI], content: "uploads/"+slideshowId+"/"+myFiles[iI] });
					}
				});
			}

			function addFiles() {
				if (files.length == 0) return zip.finalize();
				
				// get the first file
				var f = files[0];

				// no need to create a ReadStream for Buffers as zipstream handles them itself
				var source = (f.content instanceof Buffer) ? f.content : fs.createReadStream(f.content);

				// remove the first file from the array
				files.shift();

				// add the file and call this function again when done to add the next files
				zip.addFile(source, {name: f.name}, addFiles);
			}

			addFiles();
		});
	});
});


app.get('/:id/:ver?/show', function(req, res, next) {
	var slideshowId = req.params.id;
	var version = req.params.ver || 1;

	getSlideshowSource(slideshowId, version, function(source, options) {
		if (!source) {
			next();
			return;
		}

		parse(source, options.theme, false, function(html) {
			html = html.replace("%slideShow%",slideshowId).replace("%slideShowVersion%",version);
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

		getSlideshowSource(id, version, function(source, options) {
			if (!source) {
				next()
				return;
			}

			res.render('index.html', {
				id: id,
				version: version,
				theme: options.theme,
				input: htmlencode(source)
			});
		});
	}
	else {
		// render the default template if no ID is specified
		res.render('index.html', {
			id: null,
			version: 1,
			theme: null,
			input: htmlencode(fs.readFileSync(__dirname + '/template/defaultinput.html'))
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
	
	if(sid && roomManaged[this.user.cookie['connect.sid']['#timer#']] !== undefined){
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

everyone.now.transform = parse;

everyone.now.save = function(id, data, options, callback) {
	if (!id) {
		do {
			id = randomString(6);
		} while (path.existsSync(__dirname + '/slideshows/' + id))
	}

	var saveFunction = function(repository) {
		repository.commitFiles({'input.html': data, 'options.json': JSON.stringify(options)}, function (version) {
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

var validImageExtensions = ['.jpg', '.jpeg', '.gif', '.png', '.bmp', '.svg']
function isValidImage(imgPath) {
	return (validImageExtensions.indexOf(path.extname(imgPath).toLowerCase()) != -1);
}

everyone.now.availableImages = function(slideshowId, callback) {
	var imagesPath = path.join('uploads', slideshowId);

	if (!path.existsSync(imagesPath)) {
		fs.mkdirSync(imagesPath);
	}

	fs.readdir(imagesPath, function (err, files) {
		if (err) {
			callback(err, null);
			throw err;
		}

		var images = [];

		for (var i in files) {
			if (!isValidImage(files[i])) continue;

			images.push('/' + path.join(imagesPath, files[i]));
		}

		callback(null, images);
	})
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