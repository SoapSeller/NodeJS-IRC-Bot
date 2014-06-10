/**
 * Google search plugin 
 *
 * @author		Dor Shahaf
 * @website		http://dor.shahaf.com
 * @copyright	Dor Shahaf 2012
 */
var sys = require('util');
https = require('https');

Plugin = exports.Plugin = function(irc) {
	this.name = 'google';
	this.title = 'Google search';
	this.version = '0.1';
	this.author = 'Dor Shahaf';

	this.irc = irc;
  this.cache = {};

	this.irc.addTrigger(this, 'g', this.trigGoogle);
  this.irc.addTrigger(this, 'gm', this.trigGoogleMore);
};

Plugin.prototype.trigGoogle = function(msg) {
	var irc = this.irc, // irc object
        c = msg.arguments[0], // channel
        chan = irc.channels[c], // channel object
		u = irc.user(msg.prefix), // user
		m = msg.arguments[1], // message
        params = m.split(' ');

  var self = this;
	params.shift();

  var strPrint = params.join(" ");
  str = encodeURIComponent(strPrint);
  console.log("Google: " + str);
  var options = { host: "www.googleapis.com",
                  path: "/customsearch/v1?prettyPrint=false&cx=013036536707430787589:_pqjad5hr1a&key=" + irc.config.googleKey + "&q=" + str };
  console.log(options.path);
  https.get(options, function(res) {
    var json = "";
    res.on('data', function(chunk) { json += chunk; });
    res.on('end', function() {
      try {
        var g = JSON.parse(json);

        if (g.items && g.items.length > 0) {
          self.cache[u] = g.items;

          var i = g.items[0];
          irc.channels[c].send("\x02" + i.title + " \x02 ( \x0304" + i.link.replace(')', '%29') +"\x0f )");
          return;
        }

        irc.channels[c].send("\x02Sorry, can't find anything on \"" + strPrint + "\" :(");
      } catch (err) { console.log("parsing error: " + err); }
    });
  }).on('error', function(err) { console.log("https error: " + err); });
};

Plugin.prototype.trigGoogleMore = function(msg) {
	var irc = this.irc, // irc object
        c = msg.arguments[0], // channel
        chan = irc.channels[c], // channel object
		u = irc.user(msg.prefix), // user
		m = msg.arguments[1], // message
        params = m.split(' ');

  var self = this;
	params.shift();
  var us = u;
  if (params.length > 0) {
    us = params[0];
  }

  if (!self.cache[us]) {
    irc.send(u, "Sorry, can't do that");
  } else {
    items = self.cache[us];
    for (ii in items) {
      var i = items[ii];
      irc.send(u, "\x02" + i.title + " \x02 ( \x0304" + i.link.replace(')', '%29') +"\x0f )");
    }
  }
};
