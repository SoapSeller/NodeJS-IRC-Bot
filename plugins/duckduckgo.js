/**
 * DuckDuckGo plugin 
 *
 * @author		Dor Shahaf
 * @website		http://dor.shahaf.com
 * @copyright	Dor Shahaf 2012
 */
var sys = require('util');
http = require('http');

Plugin = exports.Plugin = function(irc) {
	this.name = 'duckduckgo';
	this.title = 'DuckDuckGo api';
	this.version = '0.1';
	this.author = 'Dor Shahaf';

	this.irc = irc;

	this.irc.addTrigger(this, 'd', this.trigDuck);
};

Plugin.prototype.trigDuck = function(msg) {
	var irc = this.irc, // irc object
        c = msg.arguments[0], // channel
        chan = irc.channels[c], // channel object
		u = irc.user(msg.prefix), // user
		m = msg.arguments[1], // message
        params = m.split(' ');

	params.shift();

  var strPrint = params.join(" ");
  str = encodeURIComponent(strPrint);
  url.parse
  console.log("Duck: " + str);
  var options = { host: "api.duckduckgo.com",
                  port: 80,
                  path: "/?format=json&q=" + str };
  http.get(options, function(res) {
    var json = "";
    res.on('data', function(chunk) { json += chunk; });
    res.on('end', function() {
      try {
        var d = JSON.parse(json);
        if (d.AbstractURL != "") {
          var text = "";
          if (d.AbstractText != "") {
            text = d.AbstractText;
          } else if(d.Definition) {
            text = d.Definition;
          } else {
            text = d.Heading;
          }
          if (text != "") {
            irc.channels[c].send("\x02" + text + " \x02 ( \x0304" + d.AbstractURL.replace(')', '%29') +"\x0f )");
            return;
          } 
        } else if(d.Answer) {
            irc.channels[c].send("\x02" + d.Answer);
            return;
        } else if(d.Redirect) {
            irc.channels[c].send("\x02" + strPrint + ": " + d.Redirect);
            return;
        }

        irc.channels[c].send("\x02Sorry, can't find anything on \"" + strPrint + "\" :(");
      } catch (err) { console.log("parsing error: " + err); }
    });
  }).on('error', function(err) { console.log("http error: " + err); });
};

