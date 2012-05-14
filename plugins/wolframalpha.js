/**
 * Google search plugin 
 *
 * @author		Dor Shahaf
 * @website		http://dor.shahaf.com
 * @copyright	Dor Shahaf 2012
 */
var sys = require('util'),
    https = require('https'),
    xml2js = require('xml2js'),
    parser = new xml2js.Parser();


Plugin = exports.Plugin = function(irc) {
	this.name = 'wolframalpha';
	this.title = 'Wolfram Alpha';
	this.version = '0.1';
	this.author = 'Dor Shahaf';

	this.irc = irc;
  this.lastResultPods = [];
  this.lastTitlePod = {};

	this.irc.addTrigger(this, 'a', this.trigAlpha);
	this.irc.addTrigger(this, 'an', this.trigAlphaNextPod);
};

var convertUtf = function(str) {
  var regex = /\\:(.{4})/g;
  var m;
  var outStr = "";
  while(m = regex.exec(str)) {
    outStr = outStr + str.slice(0, m.index) + String.fromCharCode(parseInt(m[1], 16));
    str = str.slice(m.index + m[0].length);
  }
  outStr = outStr + str;

  return outStr;
};

Plugin.prototype.trigAlpha = function(msg) {
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
  
  console.log("Alpha: " + str);
  var options = { host: "api.wolframalpha.com",
                  path: "/v2/query?appid=" + irc.config.wolframAppId + "&input=" + str };
  console.log(options.path);
  https.get(options, function(res) {
    var xml = "";
    res.setEncoding('utf8');
    res.on('data', function(chunk) { xml += chunk; });
    res.on('end', function() {
      try {
        parser.parseString(xml, function (err, a) {
          try {
            if (!err && a.pod && a.pod.length > 1) {
              var titlePod = a.pod.shift().subpod;
              var resultPod = a.pod.shift().subpod;
              this.lastResultPods = a.pod;
              this.lastTitlePod = titlePod;
    
              irc.channels[c].send("\x02" + convertUtf(titlePod.plaintext) + ": " + convertUtf(resultPod.plaintext));
              return;
            }

            irc.channels[c].send("\x02Sorry, can't find anything on \"" + strPrint + "\" :(");
          } catch(err) { console.log("Parsed data handling error: " + err); }
        });
      } catch (err) { console.log("parsing error: " + err); }
    });
  }).on('error', function(err) { console.log("https error: " + err); });
};

Plugin.prototype.trigAlphaNextPod = function(msg) {
	var irc = this.irc, // irc object
        c = msg.arguments[0], // channel
        chan = irc.channels[c], // channel object
		u = irc.user(msg.prefix), // user
		m = msg.arguments[1], // message
        params = m.split(' ');

  if (!this.lastTitlePod) {
    console.log("no last title");
    return;
  }

  var pod = this.lastResultPods.shift();

  if (!pod) {
    console.log("no last res pod");
    return;
  }

  var resultPod = pod.subpod;


  irc.channels[c].send("\x02" + this.lastTitlePod.plaintext + ": " + resultPod.plaintext);

};
