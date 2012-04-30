var logger = exports;

var levels = ['debug', 'info', 'warn', 'error'];

var colors = {
  'error': 31,
  'warn': 33,
  'info': 32,
  'debug': 34
};

logger.debugLevel = 'debug';

function timestamp() {
    var today = new Date();

    var month = ("0" + (today.getMonth() + 1)).slice(-2);
    var day = ("0" + today.getDate()).slice(-2);
    var year = today.getFullYear();
    var hours = ("0" + today.getHours()).slice(-2);
    var minutes = ("0" + today.getMinutes()).slice(-2);
    var seconds = ("0" + today.getSeconds()).slice(-2);

    return "[" + year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds + "]";
}

function log(level, message) {
  if (levels.indexOf(level) >= levels.indexOf(logger.debugLevel) ) {
    console.log(timestamp() + ' ' + '\033['+colors[level]+'m'+ level +'\033[0m'+' ' + message);
  }
}

logger.error = function(message) { log('error', message); }
logger.warn = function(message) { log('warn', message); }
logger.info = function(message) { log('info', message); }
logger.debug = function(message) { log('debug', message); }