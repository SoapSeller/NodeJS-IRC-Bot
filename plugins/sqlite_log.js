/**
 * SQLite Logging Plugin
 *
 * @author		Dor Shahaf
 * @website		http://dor.shahaf.com
 * @copyright	Dor Shahaf 2012
 *
 */

var sys = require('util'),
    sqlite3 = require('sqlite3').verbose();


var prepareDB = function(that) {
  return function() {
    this.serialize( function() {
      this.run("CREATE TABLE IF NOT EXISTS log (timestamp INT PRIMARY KEY DESC, nick TEXT, channel TEXT, host TEXT, message TEXT, type TEXT, containsLink INT);");
      this.run("CREATE INDEX IF NOT EXISTS containsLinkIdx ON log (containsLink);");

      that.insertStm = this.prepare("INSERT INTO log VALUES (?, ?, ?, ?, ?, ?, ?)");
    });
  };
};

Plugin = exports.Plugin = function(irc) {
	this.name = 'sqlite_log';
	this.title = 'SQLite Logging';
	this.version = '0.1';
	this.author = 'Dor Shaahf';

	this.irc = irc;

  this.insertStm = null;
  this.db = new sqlite3.cached.Database('irc.sqlite3', prepareDB(this));
  // store reference to the databse connection for other sqlite plugins
  irc.sqlite = this.db;
};


// onMessage handler for logging
Plugin.prototype.onMessage = function(msg) {
	this.updateLog(msg);
};

// onJoin handler for logging
Plugin.prototype.onJoin = function(msg) {
	this.updateLog(msg);
};

// onPart handler for logging
Plugin.prototype.onPart = function(msg) {
	this.updateLog(msg);
};

// onQuit handler for logging
//      quits are network specific not channel, so null the channel name
Plugin.prototype.onQuit = function(msg) {
	this.updateLog(msg, '', msg.arguments[0]);
};

// onNick handler for nick changes
//      nick changes are not channel specific so null the channel and use the new nick as the message
Plugin.prototype.onNick = function(msg) {
    var irc = this.irc,
        oldnick = irc.user(msg.prefix),
        user = irc.users[oldnick],
        newnick = msg.arguments[0];

    console.log("onNICK: ", oldnick, newnick, typeof irc.users, typeof irc.users[oldnick], typeof irc.users[newnick]);
    // trigger nick change on the User object -- updates all references to oldnick
    user && user.changeNick(newnick);
	this.updateLog(msg, '', newnick);
};

// getTimestamp - get current timestamp
Plugin.prototype.getTimestamp = function(msg) {
  return new Date().getTime();
};

// getNick - generates nick value for database
Plugin.prototype.getNick = function(msg) {
    return this.irc.user(msg.prefix);
};

// getChannel - generate channel value for database
Plugin.prototype.getChannel = function(msg) {
    var args = msg.arguments;

    return args.length ? args[0] : "";
};

// getHost - generate host value for database
Plugin.prototype.getHost = function(msg) {
    return msg.prefix;
};

// getMessage - generate message value for database
Plugin.prototype.getMessage = function(msg) {
    var args = msg.arguments;

    return args.length == 2 ? args[1] : "";
};

// getType - generate type value for database
Plugin.prototype.getType = function(msg) {
    return msg.command;
};

// updateLog - compiles complete document object to send to the database
//      if a value exists in doc, it is used instead of the default value, this allows for overriding getXXXX() methods
Plugin.prototype.updateLog = function(msg, channel, message) {
	var irc = this.irc,             // irc object
      db = this.db,               // database object
      that = this;

  channel = typeof(channel) != "undefined" ? channel : that.getChannel(msg);
  message = typeof(message) != "undefined" ? message : that.getMessage(msg);
  
  var timestamp = that.getTimestamp(msg);
  var nick = that.getNick(msg);
  var host = that.getHost(msg);
  var type = that.getType(msg);

  var containsLink = message != "" ? (irc.checkForLink ? irc.checkForLink(message) : -1)
                                   : 0;

  db.serialize(function() {
    if (that.insertStm) {
      that.insertStm.run(timestamp, nick, channel, host, message, type, containsLink);
    }
  });

  // this.run("CREATE TABLE IF NOT EXISTS log (timestamp INT PRIMARY KEY DESC, nick TEXT, channel TEXT, host TEXT, message TEXT, type TEXT, containsLink INT);", function(){
};
