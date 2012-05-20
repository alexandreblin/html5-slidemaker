var spawn = require('child_process').spawn;

var utils = exports;

utils.exec = function (command, args, options, stdin, callback) {
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
		callback(code, stdout, stderr);
	});

	if (stdin) {
		process.stdin.write(stdin);
	}

	process.stdin.end();
}