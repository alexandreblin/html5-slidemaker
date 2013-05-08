var path = require('path');
var fs = require('fs');
var utils = require('./utils');

var git = exports;

git.createRepository = function(repositoryPath, callback) {
	fs.mkdirSync(repositoryPath);

	utils.exec('git', ['init'], {cwd: repositoryPath}, null,
		function(code, stdout, stderr) {
			if (code != 0) {
				throw new Error('Error initializing git repository ' + repositoryPath + ':\n' + stderr);
			}

			callback(new git.Repository(repositoryPath));
		}
	);
};

git.Repository = function(repositoryPath) {
	this.repositoryPath = repositoryPath;

	if (!fs.existsSync(path.join(this.repositoryPath, '.git'))) {
		throw new Error('Can\'t find git repository at "' + this.repositoryPath + '"');
	}
};

// returns the nth commit's hash
git.Repository.prototype.nthCommit = function (n, callback) {
	var repo = this;
	
	utils.exec('git', ['rev-list', '--reverse', 'HEAD'], {cwd: repo.repositoryPath}, null,
		function(code, stdout, stderr) {
			if (code != 0) {
				throw new Error('Error getting ' + n + 'th revision for repository ' + repo.repositoryPath + ':\n' + stderr);
			}

			// each line of the output is a revision, the first line being the first revision
			var revisions = stdout.trim().split('\n');
			
			// return the nth revision (array starts at 0, n starts at 1)
			if (revisions[n-1]) {
				callback(revisions[n-1]);
			}
			else {
				// return null if it isn't defined
				callback(null);
			}
		}
	);
};

git.Repository.prototype.commitNumber = function(sha1, callback) {
	var repo = this;
	
	utils.exec('git', ['rev-list', '--reverse', 'HEAD'], {cwd: repo.repositoryPath}, null,
		function(code, stdout, stderr) {
			if (code != 0) {
				throw new Error('Error getting commit number of ' + sha1 + ' for repository ' + repo.repositoryPath + ':\n' + stderr);
			}

			// each line of the output is a revision, the first line being the first revision
			var revisions = stdout.trim().split('\n');
			
			for (var i = 0; i < revisions.length; ++i) {
				if (revisions[i].indexOf(sha1) == 0) {
					callback(i + 1);
					return;
				}
			}

			callback(null);
		}
	);
};

// returns the content of the specified file. 'version' is a number, 1 being the first commited version
git.Repository.prototype.getFile = function (filename, version, callback) {
	var repo = this;

	this.nthCommit(version, function (commit) {
		if (!commit) {
			callback(null);
			return;
		}

		utils.exec('git', ['show', commit + ':' + filename], {cwd: repo.repositoryPath}, null,
			function(code, stdout, stderr) {
				if (code != 0) {
					callback(new Error('Error getting file "' + filename + '" at revision ' + commit + ' for repository ' + repo.repositoryPath + ':\n' + stderr), null);
				}
				else {
					callback(null, stdout);
				}
			}
		);
	});
};

// commits a single file to the repository
git.Repository.prototype.commitFiles = function(files, callback) {
	var repo = this;
	
	for (var filename in files) {
		var content = files[filename];

		fs.writeFileSync(path.join(repo.repositoryPath, filename), content);
	}

	utils.exec('git', ['add', '-A'], {cwd: repo.repositoryPath}, null,
		function(code, stdout, stderr) {
			if (code != 0) {
				throw new Error('Error adding files to repository ' + repo.repositoryPath + ':\n' + stderr);
			}

			utils.exec('git', ['commit', '--allow-empty', '-m', 'slideshow'], {cwd: repo.repositoryPath}, null,
				function(code, stdout, stderr) {
					if (code != 0) {
						throw new Error('Error saving file "' + filename + '" to repository ' + repo.repositoryPath + ':\n' + stderr);
					}

					// getting first line of stdout which contains the short sha1 of the commit
					var firstLine = stdout.split('\n')[0];

					// first line is of the form "[master 124bab4] commit_message]" where 124bab4 is the short hash
					var sha1 = /\[.* ([a-z0-9]+)\]/.exec(firstLine)[1];

					repo.commitNumber(sha1, callback);
				}
			);
		}
	);
};